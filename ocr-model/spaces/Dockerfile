FROM python:3.11-slim

# System libs for OpenCV headless + torch
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# v6 — copy app + colocated v2 modules + drug cache
COPY app.py schema.py matcher.py drugs_cache.json ./

# Use /tmp for model cache — always writable by any user including non-root
ENV HF_HOME=/tmp/huggingface
ENV TRANSFORMERS_CACHE=/tmp/huggingface
ENV HF_HUB_CACHE=/tmp/huggingface/hub

# Default model — fine-tuned ONNX
ENV HF_MODEL_REPO=Abdou-19/trocr-algerian-medical-onnx

# HF Spaces requires non-root user
RUN useradd -m -u 1000 user && mkdir -p /tmp/huggingface && chmod 777 /tmp/huggingface
USER user

# HF Spaces Docker MUST listen on 7860
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
