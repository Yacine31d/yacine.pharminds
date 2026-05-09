---
title: PharMinds Algeria OCR API
emoji: 💊
colorFrom: blue
colorTo: purple
sdk: docker
pinned: true
app_port: 7860
---

# PharMinds Algeria — OCR API

FastAPI server for handwritten Algerian medical prescription OCR.

**Pipeline:** OpenCV line detection → Fine-tuned TrOCR (ONNX, 0.46% CER)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/scan` | Upload prescription image → structured JSON |
| GET | `/health` | Model status + engine type |
| POST | `/feedback` | Submit corrected line crop (active learning) |

## Environment Variables

Set in your Space settings → Secrets:
- `HF_MODEL_REPO` — HuggingFace repo of fine-tuned TrOCR ONNX (default: `Abdou-19/trocr-algerian-medical-onnx`)
- `HF_TOKEN` *(optional)* — only needed if model repo is private
