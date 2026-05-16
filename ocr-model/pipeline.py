import os
os.environ["TORCH_FORCE_WEIGHTS_ONLY_LOAD"] = "0"

# ── torch 2.7+cu118 compatibility fix ────────────────────────────────────────
import torch
_orig_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _orig_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

import transformers.utils.import_utils as _tu
import transformers.modeling_utils as _mu
_tu.check_torch_load_is_safe = lambda: None
_mu.check_torch_load_is_safe = lambda: None

import easyocr
import cv2
import numpy as np
from PIL import Image
from transformers import (
    TrOCRProcessor,
    VisionEncoderDecoderModel,
    AutoModelForCausalLM,
    AutoTokenizer,
)
import json
import re
import uuid
import base64
from io import BytesIO
import csv

# ── Model paths ───────────────────────────────────────────────────────────────
FINETUNED_PATH  = "./trocr-algerian-medical-final"
FALLBACK_TROCR  = "microsoft/trocr-small-handwritten"
VLM_MODEL_ID    = "vikhyatk/moondream2"
VLM_REVISION    = "2025-01-09"          # pinned stable release


# ═══════════════════════════════════════════════════════════════════════════════
#  Priority 1 — VLM: Moondream2 full-image prescription understanding
# ═══════════════════════════════════════════════════════════════════════════════
class VLMPipeline:
    """
    Uses Moondream2 (≈1.9 GB fp16) to read the whole prescription image at once.
    Returns the same dict schema as PrescriptionOCR so the hybrid layer is seamless.
    """

    _PROMPT = (
        "This is an Algerian medical prescription written in French. "
        "Extract every medication with its dosage, frequency and duration. "
        "Also extract the doctor name, patient name, and prescription date. "
        "Respond ONLY with valid JSON using this exact structure:\n"
        '{"doctor_name": null, "patient_name": null, "prescription_date": null, '
        '"medications": [{"name": "", "dosage": "", "frequency": "", '
        '"duration": "", "quantity": null, "instructions": null}]}'
    )

    def __init__(self):
        print(f"[VLM] Loading {VLM_MODEL_ID} rev={VLM_REVISION} ...")
        dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        self.tokenizer = AutoTokenizer.from_pretrained(
            VLM_MODEL_ID, revision=VLM_REVISION, trust_remote_code=True
        )
        self.model = AutoModelForCausalLM.from_pretrained(
            VLM_MODEL_ID, revision=VLM_REVISION,
            trust_remote_code=True, torch_dtype=dtype
        )
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = self.model.to(self.device).eval()
        print(f"[VLM] Ready on {self.device}")

    # ── internal query helper (handles old and new Moondream API) ──────────────
    def _query(self, image: Image.Image, question: str) -> str:
        with torch.no_grad():
            # Moondream ≥ 2025 API
            if hasattr(self.model, "query"):
                return self.model.query(image, question)["answer"]
            # Legacy API
            enc = self.model.encode_image(image)
            return self.model.answer_question(enc, question, self.tokenizer)

    def _parse_answer(self, raw: str) -> dict | None:
        """Extract the first JSON object from the model answer."""
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None

    def process_document(self, image_path: str) -> dict:
        image = Image.open(image_path).convert("RGB")
        raw_answer = self._query(image, self._PROMPT)

        parsed = self._parse_answer(raw_answer)
        meds = (parsed or {}).get("medications", [])

        return {
            "success": True,
            "method": "vlm",
            "raw_ocr": [raw_answer],
            "confidence_score": 0.85 if (parsed and meds) else 0.50,
            "extracted_data": {
                "doctor_name":       (parsed or {}).get("doctor_name"),
                "patient_name":      (parsed or {}).get("patient_name"),
                "prescription_date": (parsed or {}).get("prescription_date"),
                "medications":       meds,
            },
            "line_crops": [],
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Priority 2 — TrOCR: CRAFT line detection + fine-tuned TrOCR recognition
# ═══════════════════════════════════════════════════════════════════════════════
class PrescriptionOCR:
    def __init__(self, trocr_model_path: str | None = None):
        if trocr_model_path is None:
            if os.path.isdir(FINETUNED_PATH):
                trocr_model_path = FINETUNED_PATH
                print(f"[TrOCR] Using fine-tuned model: {FINETUNED_PATH}")
            else:
                trocr_model_path = FALLBACK_TROCR
                print(f"[TrOCR] Fine-tuned model not found, using: {FALLBACK_TROCR}")

        print("[TrOCR] Loading EasyOCR CRAFT detector...")
        self.detector = easyocr.Reader(["fr"], gpu=torch.cuda.is_available())

        print(f"[TrOCR] Loading model from {trocr_model_path}...")
        self.processor = TrOCRProcessor.from_pretrained(trocr_model_path)
        self.model = VisionEncoderDecoderModel.from_pretrained(trocr_model_path)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device).eval()
        print(f"[TrOCR] Ready on {self.device}")

    # ── detection ──────────────────────────────────────────────────────────────
    def detect_text_lines(self, image_path: str):
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")
        horizontal_list, _ = self.detector.detect(img)
        boxes = []
        if horizontal_list:
            for line_boxes in horizontal_list:
                for box in line_boxes:
                    boxes.append({
                        "x_min": int(box[0]), "x_max": int(box[1]),
                        "y_min": int(box[2]), "y_max": int(box[3]),
                    })
        boxes.sort(key=lambda b: b["y_min"])
        return img, boxes

    def pad_and_crop(self, img, box, pad: int = 10) -> Image.Image:
        h, w = img.shape[:2]
        x1 = max(0, box["x_min"] - pad);  y1 = max(0, box["y_min"] - pad)
        x2 = min(w, box["x_max"] + pad);  y2 = min(h, box["y_max"] + pad)
        return Image.fromarray(cv2.cvtColor(img[y1:y2, x1:x2], cv2.COLOR_BGR2RGB))

    @staticmethod
    def pil_to_base64(pil_image: Image.Image) -> str:
        buf = BytesIO()
        pil_image.save(buf, format="JPEG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    # ── recognition ────────────────────────────────────────────────────────────
    def recognize_text(self, pil_image: Image.Image) -> tuple[str, float]:
        px = self.processor(images=pil_image, return_tensors="pt").pixel_values.to(self.device)
        with torch.no_grad():
            out = self.model.generate(
                px, max_length=64, num_beams=4,
                return_dict_in_generate=True, output_scores=True,
            )
        text = self.processor.batch_decode(out.sequences, skip_special_tokens=True)[0]
        seq_len = max(1, (out.sequences[0] != self.processor.tokenizer.pad_token_id).sum().item())
        raw_score = out.sequences_scores[0].item() if hasattr(out, "sequences_scores") else 0.0
        conf = float(min(1.0, max(0.0, 1.0 - abs(raw_score) / (seq_len * 2))))
        return text, conf

    # ── heuristic structuring ──────────────────────────────────────────────────
    def extract_structured_data(self, texts: list[str]) -> dict:
        data = {"doctor_name": None, "patient_name": None,
                "prescription_date": None, "medications": []}
        for line in texts:
            ll = line.lower()
            if "dr." in ll or "docteur" in ll or "pr." in ll:
                data["doctor_name"] = line.strip()
            elif re.search(r"\d+(mg|g|ml|ui)", ll):
                parts = re.split(r"(:|-|\b1\s|une|un|prendre)", line, 1)
                data["medications"].append({
                    "name": parts[0].strip(),
                    "instructions": "".join(parts[1:]).strip() if len(parts) > 1 else "",
                })
        return data

    # ── full pipeline ──────────────────────────────────────────────────────────
    def process_document(self, image_path: str,
                         save_crops_for_feedback: bool = False,
                         feedback_dir: str = "dataset/feedback") -> dict:
        print(f"[TrOCR] Processing {image_path}...")
        img, boxes = self.detect_text_lines(image_path)

        raw_texts, crop_details, confidences = [], [], []
        doc_uuid = str(uuid.uuid4())[:8]

        if save_crops_for_feedback:
            os.makedirs(feedback_dir, exist_ok=True)
            csv_path = os.path.join(feedback_dir, "predictions.csv")
            is_new = not os.path.exists(csv_path)
            with open(csv_path, "a", encoding="utf-8", newline="") as f:
                if is_new:
                    csv.writer(f).writerow(["file_name", "predicted_text"])

        for i, box in enumerate(boxes):
            crop = self.pad_and_crop(img, box)
            text, conf = self.recognize_text(crop)
            raw_texts.append(text)
            confidences.append(conf)
            crop_details.append({
                "line_index": i, "predicted_text": text,
                "confidence": round(conf, 3),
                "image_base64": self.pil_to_base64(crop),
            })
            if save_crops_for_feedback:
                name = f"auto_{doc_uuid}_line_{i}.jpg"
                crop.save(os.path.join(feedback_dir, name))
                with open(os.path.join(feedback_dir, "predictions.csv"),
                          "a", encoding="utf-8", newline="") as f:
                    csv.writer(f).writerow([name, text])
            print(f"[TrOCR] Line {i}: {text}")

        return {
            "success": True,
            "method": "trocr",
            "raw_ocr": raw_texts,
            "confidence_score": round(sum(confidences) / len(confidences), 3) if confidences else 0.0,
            "extracted_data": self.extract_structured_data(raw_texts),
            "line_crops": crop_details,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Hybrid Pipeline  —  VLM (priority 1) → TrOCR (priority 2)
# ═══════════════════════════════════════════════════════════════════════════════
class HybridPrescriptionOCR:
    """
    Tries Moondream2 (VLM) first for full-image understanding.
    Falls back to EasyOCR + fine-tuned TrOCR when VLM is unavailable or returns
    empty medication list.

    Response always includes a ``method`` field: ``"vlm"`` | ``"trocr"``.
    """

    def __init__(self, trocr_model_path: str | None = None):
        # ── Priority 1: VLM ───────────────────────────────────────────────────
        self.vlm: VLMPipeline | None = None
        try:
            self.vlm = VLMPipeline()
        except Exception as exc:
            print(f"[Hybrid] VLM failed to load ({exc}), will use TrOCR only.")

        # ── Priority 2: TrOCR (always loaded) ────────────────────────────────
        self.ocr = PrescriptionOCR(trocr_model_path)

    @property
    def active_method(self) -> str:
        return "vlm+trocr" if self.vlm else "trocr"

    def process_document(self, image_path: str, **kwargs) -> dict:
        # ── Try VLM ───────────────────────────────────────────────────────────
        if self.vlm is not None:
            try:
                result = self.vlm.process_document(image_path)
                meds = result.get("extracted_data", {}).get("medications", [])
                if meds:
                    print(f"[Hybrid] VLM succeeded ({len(meds)} medication(s))")
                    return result
                print("[Hybrid] VLM returned empty medications — falling back to TrOCR")
            except Exception as exc:
                print(f"[Hybrid] VLM error: {exc} — falling back to TrOCR")

        # ── Fallback: TrOCR ───────────────────────────────────────────────────
        result = self.ocr.process_document(image_path, **kwargs)
        result["method"] = "trocr"
        return result


# ─── CLI test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python pipeline.py <image_path> [--trocr-only]")
        sys.exit(1)

    img_path = sys.argv[1]
    trocr_only = "--trocr-only" in sys.argv

    engine = PrescriptionOCR() if trocr_only else HybridPrescriptionOCR()
    result = engine.process_document(img_path)
    print("\n=== OUTPUT ===")
    print(json.dumps(result, indent=2, ensure_ascii=False))
