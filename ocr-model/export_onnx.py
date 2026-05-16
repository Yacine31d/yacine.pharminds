"""
export_onnx.py - Export fine-tuned TrOCR to ONNX for CPU inference on HuggingFace Spaces.

Uses HuggingFace `optimum` which handles the encoder+decoder+kv-cache split automatically.

Install:
    pip install optimum[onnxruntime]

Run:
    python ocr-model/export_onnx.py
    # or specify a different model:
    python ocr-model/export_onnx.py --model ./trocr-algerian-medical-final --out ./trocr-algerian-medical-onnx
"""

import argparse
import os
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="./trocr-algerian-medical-final",
                        help="Path to fine-tuned TrOCR model (or HF model ID)")
    parser.add_argument("--out",   default="./trocr-algerian-medical-onnx",
                        help="Output directory for ONNX model")
    parser.add_argument("--quantize", action="store_true",
                        help="Apply dynamic INT8 quantization (smaller, faster on CPU)")
    args = parser.parse_args()

    model_path = args.model
    out_path   = args.out

    # ── 1. Export to ONNX with optimum ───────────────────────────────────────
    print(f"Exporting {model_path} -> {out_path} ...")
    try:
        from optimum.onnxruntime import ORTModelForVision2Seq
        from transformers import TrOCRProcessor
    except ImportError:
        print("ERROR: Install optimum first:  pip install optimum[onnxruntime]")
        raise

    processor = TrOCRProcessor.from_pretrained(model_path)
    model = ORTModelForVision2Seq.from_pretrained(model_path, export=True)

    os.makedirs(out_path, exist_ok=True)
    model.save_pretrained(out_path)
    processor.save_pretrained(out_path)
    print(f"ONNX model saved to {out_path}")  # noqa: using ASCII arrow above

    # ── 2. Optional INT8 quantization ────────────────────────────────────────
    if args.quantize:
        print("Applying INT8 dynamic quantization ...")
        from optimum.onnxruntime import ORTQuantizer
        from optimum.onnxruntime.configuration import AutoQuantizationConfig

        quantizer = ORTQuantizer.from_pretrained(out_path)
        qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
        quantizer.quantize(save_dir=out_path + "-int8", quantization_config=qconfig)
        print(f"Quantized model saved to {out_path}-int8")

    # ── 3. Quick smoke test ───────────────────────────────────────────────────
    print("Running smoke test ...")
    from PIL import Image
    import numpy as np

    # Create a blank white test image (384×48 — typical line crop size)
    test_img = Image.fromarray(np.ones((48, 384, 3), dtype=np.uint8) * 255)
    px = processor(images=test_img, return_tensors="pt").pixel_values

    out = model.generate(px, max_length=32)
    text = processor.batch_decode(out, skip_special_tokens=True)[0]
    print(f"Smoke test passed. Sample output: '{text}'")
    print("\nDone. Upload the ONNX folder to HuggingFace Hub:")
    print(f"  huggingface-cli upload <your-username>/trocr-algerian-medical-onnx {out_path}")  # noqa


if __name__ == "__main__":
    main()
