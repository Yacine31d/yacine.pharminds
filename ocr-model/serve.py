import os
os.environ["PYTHONUTF8"] = "1"
os.environ["TORCH_FORCE_WEIGHTS_ONLY_LOAD"] = "0"  # Allow EasyOCR's legacy torch.load (trusted local models)
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import uuid
import base64
import csv
from pydantic import BaseModel
from pipeline import HybridPrescriptionOCR

# All paths relative to THIS file's directory (ocr-model/)
_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_HERE)
DATASET_DIR = os.path.join(_HERE, "dataset", "images")
LABELS_CSV  = os.path.join(_HERE, "dataset", "labels.csv")
TEMP_DIR    = os.path.join(_HERE, "temp")
TROCR_PATH  = os.path.join(_PROJECT_ROOT, "trocr-algerian-medical-final")

app = FastAPI(title="PharMinds Local OCR API")

# Allow requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to right origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import sys

print("Initializing OCR Pipeline (Silencing progress bar to avoid encoding errors)...")
# Initialize once at startup (loads models into VRAM)
try:
    # Temporarily redirect stdout to suppress EasyOCR's progress bar which causes encoding errors on Windows
    original_stdout = sys.stdout
    sys.stdout = open(os.devnull, 'w', encoding='utf-8')
    
    # HybridPrescriptionOCR: VLM (Moondream2) priority 1 → TrOCR priority 2
    trocr_path = TROCR_PATH if os.path.exists(TROCR_PATH) else None
    ocr_engine = HybridPrescriptionOCR(trocr_model_path=trocr_path)
        
    sys.stdout.close()
    sys.stdout = original_stdout
    print("OCR Engine Loaded successfully.")
except Exception as e:
    sys.stdout = original_stdout
    print(f"Failed to load OCR engine: {e}")
    ocr_engine = None

@app.post("/scan")
async def scan_prescription(
    file: UploadFile = File(...),
    method: str | None = None,   # optional: "vlm" | "trocr" to force a specific engine
):
    if not ocr_engine:
        return {"success": False, "error": "OCR Engine not initialized."}

    os.makedirs(TEMP_DIR, exist_ok=True)
    temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.jpg")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        if method == "trocr":
            # Force TrOCR-only (skip VLM)
            result = ocr_engine.ocr.process_document(temp_path)
            result["method"] = "trocr"
        elif method == "vlm" and ocr_engine.vlm:
            # Force VLM-only
            result = ocr_engine.vlm.process_document(temp_path)
        else:
            # Default: VLM → TrOCR (hybrid priority)
            result = ocr_engine.process_document(temp_path)
    except Exception as e:
        result = {"success": False, "error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return result

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": ocr_engine is not None,
        "active_method": ocr_engine.active_method if ocr_engine else "none",
        "vlm_loaded": ocr_engine.vlm is not None if ocr_engine else False,
        "trocr_loaded": ocr_engine.ocr is not None if ocr_engine else False,
    }

class FeedbackData(BaseModel):
    image_base64: str
    corrected_text: str

@app.post("/feedback")
async def receive_feedback(feedback: FeedbackData):
    """Saves human-verified cropped lines directly into the training dataset."""
    os.makedirs(DATASET_DIR, exist_ok=True)
    img_name = f"feedback_{uuid.uuid4().hex[:8]}.jpg"
    img_path = os.path.join(DATASET_DIR, img_name)
    
    try:
        # Decode base64 and save as image
        # Sometimes base64 strings have data:image/jpeg;base64, prefix
        b64_str = feedback.image_base64
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
            
        image_data = base64.b64decode(b64_str)
        with open(img_path, "wb") as f:
            f.write(image_data)
            
        # Append to labels.csv
        is_new = not os.path.exists(LABELS_CSV)
        with open(LABELS_CSV, "a", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            if is_new:
                writer.writerow(["file_name", "text"])
            writer.writerow([img_name, feedback.corrected_text])
            
        return {"success": True, "message": "Feedback saved to dataset successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
