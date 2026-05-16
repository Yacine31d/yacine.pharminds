# 📄 Handover Notes — PharMinds Algeria Hybrid AI Pipeline

**Project State as of April 9, 2026**

This document serves as a "trace" for the next AI session to continue the work on the **Hybrid OCR + Arcee AI** pipeline.

## 🚀 Current Architecture
We have implemented a **Resilient Hybrid Pipeline** for prescription scanning:
1.  **Stage 1: Local OCR (TrOCR)**: Handled by a FastAPI server (`ocr-model/serve.py`) running on `localhost:8001`. It uses a fine-tuned TrOCR model to extract raw text and image crops from prescriptions.
2.  **Stage 2: AI Brain (Arcee AI)**: The raw text is passed to Arcee AI for intelligent structuring (Medications, Doctor Name, Date).
3.  **Failover**: If Arcee fails, it falls back to Gemini (via Supabase Edge Functions).

## 🛠️ Recent Fixes & Configuration
- **CORS Proxy**: Direct browser calls to Arcee were blocked. We added a proxy in `vite.config.ts` (`/arcee-api` -> `https://api.arcee.ai`).
- **Service Logic**: `src/lib/ai-service.ts` contains the `scanPrescriptionLocal` function which coordinates the OCR + AI structuring.
- **Frontend**: `PrescriptionScanner.tsx` is fully "reconnected" to this hybrid logic.
- **OCR Server**: Fixed a `UnicodeEncodeError` in `serve.py` that caused crashes on Windows terminal when printing emojis.
- **Testing Image**: A test image is located at `C:\Users\abdou\.gemini\antigravity\brain\e0074b23-b1f1-47b6-87f9-fdd49f0a69ae\browser\test-image.jpeg`.

## 🔑 Environment Variables (.env)
- `VITE_ARCEE_API_KEY`: Set and working.
- `VITE_ARCEE_MODEL`: `trinity-mini`.
- `VITE_CUSTOM_AI_URL`: (Optional) Intended for Colab Private Brain, currently bypassed for Arcee.
- `VITE_OPENROUTER_API_KEY`: Currently empty (Gemini fallback uses Supabase Edge Functions).

## 🧪 Credentials for Testing
- **User**: `abdorenouni@gmail.com`
- **Password**: `Arenou19`
- **Role**: Patient (User uses this for testing the full scanner flow).

## 🚧 Next Steps
1.  **Verify UI Extraction**: The last test scan showed that "Dr. A" was extracted by the local regex, but Arcee's refined extraction needs final visual confirmation of "Medications" list population.
2.  **Colab Integration**: Reconnect the "Private Brain" (Colab) as Tier 1 once the endpoint is ready.
3.  **Active Learning**: Verify the "Dataset Feedback" section (bottom of results). Submitting corrections saves them to `ocr-model/dataset/labels.csv`.

## 📈 Improving Accuracy
The model is currently in its early stages. To improve results:
1.  **Collect Data**: Use the "Dataset Feedback" section in the scanner to correct mistakes.
2.  **Merge Feedback**: Run `python ocr-model/merge_feedback.py` to incorporate new labels into the main training set.
3.  **Fine-Tune**: Run `python ocr-model/train_trocr.py --epochs 10` to retrain with the new data.
4.  **Prompt Engineering**: The Arcee prompt in `src/lib/ai-service.ts` can be further refined to handle specific pharmaceutical jargon.

---
*Created by Antigravity (Session e0074b23)*
