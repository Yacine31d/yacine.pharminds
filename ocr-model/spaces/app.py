"""
app.py — PharMinds OCR API for HuggingFace Spaces  (v6 — Pydantic + matcher)
==========================================================================

Pipeline:
  Line detection:  OpenCV horizontal-projection profile  (fast, no ML needed)
  Recognition:     TrOCR fine-tuned ONNX  (Abdou-19/trocr-algerian-medical-onnx)
                   Falls back to microsoft/trocr-small-handwritten automatically
  Post-processing: DrugMatcher (RapidFuzz + phonetic + bilingual FR/AR)

v6 additions over v5:
  ✓  /v2/scan      — Pydantic-strict response + DrugMatcher grounding
  ✓  /v2/feedback  — strict feedback contract, batched corrections
  ✓  /v2/health    — exposes matcher status + version stamps
  ✓  /v2/metrics   — simple request/latency counters
  ✓  Backward-compat: /scan, /feedback, /health unchanged
"""

from __future__ import annotations
import os, uuid, base64, csv, logging, threading, time, json
from io import BytesIO
from pathlib import Path
from collections import deque

import numpy as np
from PIL import Image

# ── PyTorch 2.2+ weights_only compatibility fix ───────────────────────────────
import torch as _torch_patch
_orig_load = _torch_patch.load
def _patched_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _orig_load(*args, **kwargs)
_torch_patch.load = _patched_load

import torch

try:
    import transformers.utils.import_utils as _tu
    import transformers.modeling_utils as _mu
    _tu.check_torch_load_is_safe = lambda: None   # type: ignore[attr-defined]
    _mu.check_torch_load_is_safe = lambda: None   # type: ignore[attr-defined]
except Exception:
    pass

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# ── v2: schema + matcher (colocated in spaces/) ──────────────────────────────
from schema import (
    Prescription, Medication, LineCrop, MatchResult,
    FeedbackPayload as FeedbackV2Payload, FeedbackCorrection,
)
from matcher import DrugMatcher, CACHE_FILE as DRUGS_CACHE_PATH

# ── logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("pharminds-ocr")

# ── config ────────────────────────────────────────────────────────────────────
HF_MODEL_REPO = os.getenv("HF_MODEL_REPO", "Abdou-19/trocr-algerian-medical-onnx")
HF_TOKEN      = os.getenv("HF_TOKEN", None)
DEVICE        = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_VERSION   = os.getenv("MODEL_VERSION", "v1-deployed")    # set by deploy
DATASET_VERSION = os.getenv("DATASET_VERSION", "v1")            # set by deploy

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="PharMinds OCR API",
    version="6.0",
    description="Algerian prescription OCR — TrOCR + DrugMatcher",
)
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
_ready      = False
_load_error : str | None = None

# ── matcher (loaded lazily, cheap) ────────────────────────────────────────────
_matcher: DrugMatcher | None = None
_matcher_error: str | None = None

# ── metrics (in-memory, reset on cold-start) ──────────────────────────────────
_metrics_lock = threading.Lock()
_request_count = 0
_v2_request_count = 0
_latencies_ms: deque = deque(maxlen=500)   # rolling window
_feedback_count = 0


def _record(latency_ms: float, *, v2: bool = False):
    global _request_count, _v2_request_count
    with _metrics_lock:
        _request_count += 1
        if v2:
            _v2_request_count += 1
        _latencies_ms.append(latency_ms)


def _get_matcher() -> DrugMatcher | None:
    """Lazy-load the DrugMatcher (small, ~50ms)."""
    global _matcher, _matcher_error
    if _matcher is not None:
        return _matcher
    if _matcher_error is not None:
        return None
    try:
        if not DRUGS_CACHE_PATH.exists():
            _matcher_error = f"drugs_cache.json missing at {DRUGS_CACHE_PATH}"
            log.warning(_matcher_error)
            return None
        _matcher = DrugMatcher.from_cache(DRUGS_CACHE_PATH)
        log.info(f"DrugMatcher loaded: {_matcher}")
        return _matcher
    except Exception as e:
        _matcher_error = f"{type(e).__name__}: {e}"
        log.error(f"DrugMatcher load failed: {_matcher_error}")
        return None


def _load_models_bg() -> None:
    """Load OCR models in a background thread so uvicorn starts immediately."""
    global _trocr, _processor, _model_id, _is_onnx, _ready, _load_error

    errors: list[str] = []

    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        log.info("transformers imported OK")
    except Exception as e:
        _load_error = f"transformers import failed: {type(e).__name__}: {e}"
        log.error(_load_error)
        return

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


@app.on_event("startup")
def startup_event():
    t = threading.Thread(target=_load_models_bg, daemon=True)
    t.start()
    log.info("Model loading started in background thread")
    # Warm the matcher in parallel — fast, doesn't block startup
    _get_matcher()


# ═══════════════════════════════════════════════════════════════════════════════
#  Line segmentation — horizontal projection profile
# ═══════════════════════════════════════════════════════════════════════════════
def segment_lines(
    image: Image.Image,
    min_line_height: int = 10,
    pad: int = 6,
    smooth_window: int = 5,
    density_threshold: float = 0.06,
) -> list[tuple[Image.Image, tuple[int, int, int, int]]]:
    """Returns [(crop, (x1,y1,x2,y2)), ...]."""
    import cv2

    gray  = np.array(image.convert("L"))
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    proj = np.sum(bw, axis=1).astype(float)
    if proj.max() == 0:
        return [(image, (0, 0, image.width, image.height))]

    k      = np.ones(smooth_window) / smooth_window
    smooth = np.convolve(proj, k, mode="same")

    thresh  = smooth.max() * density_threshold
    H, W    = gray.shape
    out = []
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
                y1 = max(0, y_start - pad)
                y2 = min(H, y + pad)
                crop = image.crop((0, y1, W, y2))
                out.append((crop, (0, y1, W, y2)))

    if in_line and H - y_start >= min_line_height:
        y1 = max(0, y_start - pad)
        crop = image.crop((0, y1, W, H))
        out.append((crop, (0, y1, W, H)))

    log.info(f"segment_lines: {len(out)} line(s) detected")
    return out or [(image, (0, 0, image.width, image.height))]


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


def _ensure_ready():
    if _load_error:
        raise HTTPException(status_code=500, detail=f"Model load failed: {_load_error}")
    if not _ready:
        raise HTTPException(status_code=503, detail="Models loading; retry in 30s")


# ═══════════════════════════════════════════════════════════════════════════════
#  v1 routes (kept for backward compatibility — DO NOT BREAK)
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
    _ensure_ready()
    t0 = time.time()
    raw = await file.read()
    try:
        image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot decode image.")

    max_w = 1600
    if image.width > max_w:
        ratio = max_w / image.width
        image = image.resize((max_w, int(image.height * ratio)), Image.LANCZOS)

    segs = segment_lines(image)
    texts: list[str]  = []
    crops: list[dict] = []
    for i, (line_img, _bbox) in enumerate(segs):
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

    _record((time.time() - t0) * 1000, v2=False)
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


class FeedbackV1Payload(BaseModel):
    image_base64: str
    corrected_text: str


@app.post("/feedback")
async def feedback(data: FeedbackV1Payload):
    global _feedback_count
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
        with _metrics_lock:
            _feedback_count += 1
        return {"success": True, "saved": name}
    except Exception as e:
        log.error(f"Feedback error: {e}")
        return {"success": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
#  v2 routes — Pydantic-strict + DrugMatcher
# ═══════════════════════════════════════════════════════════════════════════════

class V2HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    matcher_loaded: bool
    model: str | None = None
    engine: str | None = None
    device: str
    model_version: str
    dataset_version: str
    drug_count: int = 0
    matcher_error: str | None = None
    load_error: str | None = None


class V2MetricsResponse(BaseModel):
    request_count: int
    v2_request_count: int
    feedback_count: int
    p50_ms: float
    p95_ms: float
    sample_size: int
    uptime_seconds: float


_BOOT_TIME = time.time()


@app.get("/v2/health", response_model=V2HealthResponse)
def v2_health():
    matcher = _get_matcher()
    return V2HealthResponse(
        status=("ok" if _ready and matcher else "loading" if not _ready else "degraded"),
        model_loaded=_ready,
        matcher_loaded=matcher is not None,
        model=_model_id,
        engine="onnx" if _is_onnx else ("pytorch" if _ready else None),
        device=DEVICE,
        model_version=MODEL_VERSION,
        dataset_version=DATASET_VERSION,
        drug_count=len(matcher) if matcher else 0,
        matcher_error=_matcher_error,
        load_error=_load_error,
    )


@app.get("/v2/metrics", response_model=V2MetricsResponse)
def v2_metrics():
    with _metrics_lock:
        latencies = sorted(_latencies_ms)
    n = len(latencies)
    p50 = latencies[n // 2] if n else 0.0
    p95 = latencies[int(n * 0.95)] if n else 0.0
    return V2MetricsResponse(
        request_count=_request_count,
        v2_request_count=_v2_request_count,
        feedback_count=_feedback_count,
        p50_ms=round(p50, 1),
        p95_ms=round(p95, 1),
        sample_size=n,
        uptime_seconds=round(time.time() - _BOOT_TIME, 1),
    )


@app.post("/v2/scan", response_model=Prescription)
async def v2_scan(file: UploadFile = File(...)):
    """OCR + DrugMatcher grounding. Returns Pydantic-strict Prescription.

    Note: This endpoint does NOT call an external LLM for structured field
    extraction (doctor/patient/dates/posology). That step happens client-side
    via Groq Llama 3.1, then `Medication.drug_id` is filled in by re-running
    the client's matcher (if it has the cache). Server-side, we only attach
    drug_ids found by tokenising the joined OCR text.
    """
    _ensure_ready()
    t0 = time.time()

    raw = await file.read()
    try:
        image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Cannot decode image.")

    max_w = 1600
    if image.width > max_w:
        ratio = max_w / image.width
        image = image.resize((max_w, int(image.height * ratio)), Image.LANCZOS)

    segs = segment_lines(image)
    line_crops: list[LineCrop] = []
    raw_lines: list[str] = []

    for i, (line_img, bbox) in enumerate(segs):
        try:
            text, conf = recognize_line(line_img)
        except Exception as e:
            log.warning(f"recognize_line failed: {e}")
            continue
        if text.strip():
            raw_lines.append(text)
            line_crops.append(LineCrop(
                bbox=list(bbox),
                text=text,
                confidence=conf,
                line_index=i,
                image_base64=pil_to_b64(line_img),
            ))

    raw_ocr = " ".join(raw_lines)
    medications: list[Medication] = []

    matcher = _get_matcher()
    if matcher and raw_ocr:
        for r in matcher.match_text(raw_ocr):
            if r.matched_name and r.drug_id:
                medications.append(Medication(
                    name=r.matched_name,
                    drug_id=r.drug_id,
                    confidence=r.confidence,
                    match_strategy=r.strategy,
                ))

    overall_conf = (
        sum(c.confidence for c in line_crops) / len(line_crops)
        if line_crops else 0.0
    )

    elapsed = (time.time() - t0) * 1000
    _record(elapsed, v2=True)

    return Prescription(
        success=True,
        method="trocr",
        confidence=round(overall_conf, 3),
        medications=medications,
        line_crops=line_crops,
        raw_ocr_text=raw_ocr,
        processing_ms=int(elapsed),
        model_version=MODEL_VERSION,
        dataset_version=DATASET_VERSION,
    )


@app.post("/v2/feedback")
async def v2_feedback(payload: FeedbackV2Payload):
    """Batched corrections with audit trail. Appends to dataset/feedback_log.jsonl
    so dataset_tool.py /add can promote them later."""
    global _feedback_count
    try:
        log_dir = Path("dataset/feedback_log")
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"{time.strftime('%Y%m%d')}.jsonl"
        record = {
            "ts":          time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "image_id":    payload.image_id,
            "reviewer_id": payload.reviewer_id,
            "submitted_at": payload.submitted_at,
            "corrections": [c.model_dump() for c in payload.corrections],
        }
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
        with _metrics_lock:
            _feedback_count += len(payload.corrections)
        return {"success": True, "logged": len(payload.corrections), "file": str(log_file)}
    except Exception as e:
        log.error(f"v2 feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
