---
title: PharMinds Algeria OCR API
emoji: 💊
colorFrom: blue
colorTo: purple
sdk: docker
pinned: true
app_port: 7860
---

# PharMinds Algeria — OCR API (v6)

FastAPI server for handwritten Algerian medical prescription OCR.

**Pipeline:** OpenCV line detection → fine-tuned TrOCR (ONNX) → DrugMatcher
(RapidFuzz + phonetic + bilingual FR/AR drug-DB grounding)

## Endpoints

### v1 (legacy, still supported)
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/scan`     | Upload prescription image → flat JSON |
| GET    | `/health`   | Simple status |
| POST   | `/feedback` | Submit a single corrected line crop |

### v2 (Pydantic-strict + DrugMatcher)
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/v2/scan`     | Upload prescription image → strict `Prescription` schema with `drug_id` already grounded |
| GET    | `/v2/health`   | Rich health: model_loaded, matcher_loaded, drug_count, model_version, dataset_version |
| GET    | `/v2/metrics`  | Rolling p50/p95 latency, request count, uptime |
| POST   | `/v2/feedback` | Batched corrections with audit trail |

## Environment Variables

Set in Space Settings → Secrets:
- `HF_MODEL_REPO` — HuggingFace repo of fine-tuned TrOCR ONNX
  (default: `Abdou-19/trocr-algerian-medical-onnx`)
- `HF_TOKEN` *(optional)* — only needed if model repo is private
- `MODEL_VERSION` *(optional)* — surfaced in `/v2/scan` response (default: `v1-deployed`)
- `DATASET_VERSION` *(optional)* — surfaced in `/v2/scan` response (default: `v1`)

## Drug DB cache

`drugs_cache.json` is a 62-row snapshot of the Supabase `drugs` table, packaged
into the Space build artefact. Re-generate locally with:
```
python ocr-model/postprocess/pull_drugs_cache.py
```
then redeploy the Space.
