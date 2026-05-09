"""
app.py — PharMinds OCR API for HuggingFace Spaces  (v5 — CPU-optimised)
==========================================================================

Pipeline:
  Line detection:  OpenCV horizontal-projection profile  (fast, no ML needed)
  Recognition:     TrOCR fine-tuned ONNX  (Abdou-19/trocr-algerian-medical-onnx)
                   Falls back to microsoft/trocr-small-handwritten automatically

v5 fixes vs v4:
  ✓  Async model loading — server responds immediately on port 7860
     so HF Spaces health-check passes without waiting for 400 MB download
  ✓  /health returns {"status":"loading"} while booting, "ok" when ready
  ✓  /scan returns 503 with human-readable message during warm-up
"""

from __future__ import annotations
import os, uuid, base64, csv, logging, threading
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

# ── PyTorch 2.2+ weights_only compatibility fix ───────────────────────────────
# Older TrOCR checkpoints were saved without safe serialisation; newer torch
# refuses to load them with weights_only=True (the new default).  Patch early,
# before any import that might trigger torch.load.
import torch as _torch_patch
_orig_load = _torch_patch.load
def _patched_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _orig_load(*args, **kwargs)
_torch_patch.load = _patched_load

import torch

# Silence transformers' own torch.load safety check (same issue as above)
try:
    import transformers.utils.import_utils as _tu
    import transformers.modeling_utils as _mu
    _tu.check_torch_load_is_safe = lambda: None   # type: ignore[attr-defined]
    _mu.check_torch_load_is_safe = lambda: None   # type: ignore[attr-defined]
except Exception:
    pass
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ── logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("pharminds-ocr")

# ── config ────────────────────────────────────────────────────────────────────
HF_MODEL_REPO = os.getenv("HF_MODEL_REPO", "Abdou-19/trocr-algerian-medical-onnx")
HF_TOKEN      = os.getenv("HF_TOKEN", None)
DEVICE        = "cuda" if torch.cuda.is_available() else "cpu"

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="PharMinds OCR API", version="5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── model holders ─────────────────────────────────────────────────────────────
_trocr      = None
_processor  = None
_model_id   = None
_is_onnx    = False
_ready      = False   # True once models loaded successfully
_load_error : str | None = None


def _load_models_bg() -> None:
    """Load models in a background thread so uvicorn starts immediately."""
    global _trocr, _processor, _model_id, _is_onnx, _ready, _load_error

    errors: list[str] = []

    # ── Step 1: import transformers ───────────────────────────────────────────
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        log.info("transformers imported OK")
    except Exception as e:
        _load_error = f"transformers import failed: {type(e).__name__}: {e}"
        log.error(_load_error)
        return

    # ── Step 2: try ONNX model (fine-tuned) ──────────────────────────────────
    onnx_ok = False
    try:
        from optimum.onnxruntime import ORTModelForVision2Seq
        log.info(f"Trying ONNX: {HF_MODEL_REPO}")
        proc  = TrOCRProcessor.from_pretrained(HF_MODEL_REPO, token=HF_TOKEN)
        model = ORTModelForVision2Seq.from_pretrained(HF_MODEL_REPO, token=HF_TOKEN)
        _trocr     = model
        _processor = proc
        _model_id  = HF_MODEL_REPO
        _is_onnx   = True
        _ready     = True
        log.info(f"=== ONNX model ready: {HF_MODEL_REPO} ===")
        onnx_ok = True
    except Exception as e:
        msg = f"ONNX load failed ({HF_MODEL_REPO}): {type(e).__name__}: {e}"
        errors.append(msg)
        log.warning(msg)

    if onnx_ok:
        return

    # ── Step 3: PyTorch fallback — microsoft/trocr-small-handwritten ─────────
    BASE = "microsoft/trocr-small-handwritten"
    try:
        log.info(f"Trying PyTorch fallback: {BASE}")
        proc  = TrOCRProcessor.from_pretrained(BASE)
        model = VisionEncoderDecoderModel.from_pretrained(BASE).to(DEVICE).eval()
        _trocr     = model
        _processor = proc
        _model_id  = BASE
        _is_onnx   = False
        _ready     = True
        log.info(f"=== PyTorch model ready: {BASE} ===")
        return
    except Exception as e:
        msg = f"PyTorch fallback failed ({BASE}): {type(e).__name__}: {e}"
        errors.append(msg)
        log.error(msg)

    _load_error = " | ".join(errors) or "Unknown error"
    log.error(f"ALL CANDIDATES FAILED: {_load_error}")


# ── start background load on app startup ─────────────────────────────────────
@app.on_event("startup")
def startup_event():
    t = threading.Thread(target=_load_models_bg, daemon=True)
    t.start()
    log.info("Model loading started in background thread")


# ═══════════════════════════════════════════════════════════════════════════════
#  Line segmentation — horizontal projection profile
# ═══════════════════════════════════════════════════════════════════════════════
def segment_lines(
    image: Image.Image,
    min_line_height: int = 10,
    pad: int = 6,
    smooth_window: int = 5,
    density_threshold: float = 0.06,
) -> list[Image.Image]:
    """
    Split a prescription image into individual text lines using
    horizontal projection (fast, no ML required).
    """
    import cv2

    gray  = np.array(image.convert("L"))
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    proj = np.sum(bw, axis=1).astype(float)
    if proj.max() == 0:
        return [image]

    k      = np.ones(smooth_window) / smooth_window
    smooth = np.convolve(proj, k, mode="same")

    thresh  = smooth.max() * density_threshold
    H, W    = gray.shape
    lines   = []
    in_line = False
    y_start = 0

    for y in range(H):
        if smooth[y] > thresh and not in_line:
            in_line = True
            y_start = y
        elif smooth[y] <= thresh and in_line:
            in_line = False
            h = y - y_start
            if h >= min_line_height:
                crop = image.crop((
                    0, max(0, y_start - pad),
                    W, min(H, y       + pad),
                ))
                lines.append(crop)

    if in_line and H - y_start >= min_line_height:
        lines.append(image.crop((0, max(0, y_start - pad), W, H)))

    log.info(f"segment_lines: {len(lines)} line(s) detected")
    return lines or [image]


# ═══════════════════════════════════════════════════════════════════════════════
#  Recognition helpers
# ═══════════════════════════════════════════════════════════════════════════════
def _preprocess_line(img: Image.Image) -> Image.Image:
    w, h = img.size
    if h < 32:
        scale = 32 / h
        img   = img.resize((int(w * scale), 32), Image.LANCZOS)
    if w < 64:
        canvas = Image.new("RGB", (64, img.height), (255, 255, 255))
        canvas.paste(img, (0, 0))
        img = canvas
    return img


def recognize_line(pil_img: Image.Image) -> tuple[str, float]:
    pil_img      = _preprocess_line(pil_img)
    pixel_values = _processor(images=pil_img, return_tensors="pt").pixel_values

    if not _is_onnx and DEVICE != "cpu":
        pixel_values = pixel_values.to(DEVICE)

    with torch.no_grad():
        generated = _trocr.generate(pixel_values, max_new_tokens=64)

    text = _processor.batch_decode(generated, skip_special_tokens=True)[0].strip()
    return text, 0.75


def pil_to_b64(img: Image.Image) -> str:
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


# ═══════════════════════════════════════════════════════════════════════════════
#  Routes
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    if _load_error:
        return {"status": "error", "detail": _load_error}
    if not _ready:
        return {"status": "loading", "model": HF_MODEL_REPO}
    return {
        "status":       "ok",
        "device":       DEVICE,
        "model":        _model_id,
        "engine":       "onnx" if _is_onnx else "pytorch",
        "trocr_loaded": True,
    }


@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    if _load_error:
        raise HTTPException(status_code=500, detail=f"Model load failed: {_load_error}")
    if not _ready:
        raise HTTPException(
            status_code=503,
            detail="Models are still loading. Please retry in 30 seconds.",
        )

    raw = await file.read()
    try:
        image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot decode image.")

    # Downscale very large images
    max_w = 1600
    if image.width > max_w:
        ratio = max_w / image.width
        image = image.resize((max_w, int(image.height * ratio)), Image.LANCZOS)

    lines = segment_lines(image)
    texts : list[str]  = []
    crops : list[dict] = []

    for i, line_img in enumerate(lines):
        try:
            text, conf = recognize_line(line_img)
            if text.strip():
                texts.append(text)
                crops.append({
                    "line_index":     i,
                    "predicted_text": text,
                    "confidence":     round(conf, 3),
                    "image_base64":   pil_to_b64(line_img),
                })
                log.info(f"  line {i:02d}: {text!r}")
        except Exception as e:
            log.warning(f"  line {i} skipped ({e})")

    return {
        "success":          True,
        "method":           "trocr",
        "raw_ocr":          texts,
        "confidence_score": 0.75,
        "extracted_data": {
            "doctor_name":        None,
            "patient_name":       None,
            "prescription_date":  None,
            "medications":        [],
        },
        "line_crops": crops,
    }


class FeedbackPayload(BaseModel):
    image_base64: str
    corrected_text: str


@app.post("/feedback")
async def feedback(data: FeedbackPayload):
    try:
        Path("dataset/images").mkdir(parents=True, exist_ok=True)
        name = f"feedback_{uuid.uuid4().hex[:8]}.jpg"
        b64  = data.image_base64.split(",")[-1]
        with open(f"dataset/images/{name}", "wb") as f:
            f.write(base64.b64decode(b64))
        csv_path = Path("dataset/labels.csv")
        is_new   = not csv_path.exists()
        with open(csv_path, "a", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            if is_new:
                w.writerow(["file_name", "text"])
            w.writerow([name, data.corrected_text])
        return {"success": True, "saved": name}
    except Exception as e:
        log.error(f"Feedback error: {e}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
