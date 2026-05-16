"""
extract_real_lines.py  (v2 — adaptive kernel)

Extracts text line crops from real prescription photos.
Uses resolution-adaptive morphological parameters so it works equally
on both low-res (1200px) and high-res (3000px+) phone photos.

Output: real_data_lines/<stem>_line_N.jpg  for each detected line
        real_data_lines/real_annotations.csv  (empty text column, seed)

Run:
    python ocr-model/extract_real_lines.py
"""

import csv
import os
from pathlib import Path

import cv2
import numpy as np

RAW_DIR = Path(__file__).parent / "real_data_raw"
OUT_DIR = Path(__file__).parent / "real_data_lines"


def preprocess(img: np.ndarray) -> np.ndarray:
    """Normalize contrast via CLAHE, keep color image for saving."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def detect_lines(gray: np.ndarray, img_w: int, img_h: int) -> list[dict]:
    """
    Morphological line detection with kernel sizes relative to image width.
    This is the key fix: large images need larger kernels.
    """
    # Binary (text = white)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=max(11, img_w // 100 | 1),  # odd, scales with resolution
        C=10,
    )

    # Horizontal dilation: width = ~5% of image width, height = 3-5 pixels
    kw = max(20, img_w // 20)   # ~5% of width
    kh = max(3, img_h // 300)   # very thin vertically
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kh))
    dilated = cv2.dilate(thresh, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_w = img_w * 0.10   # line must be at least 10% of image width
    min_h = img_h * 0.008  # at least 0.8% of image height
    max_h = img_h * 0.15   # at most 15% (catches multi-line blobs)

    boxes = []
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw >= min_w and min_h <= ch <= max_h:
            boxes.append({"x": x, "y": y, "w": cw, "h": ch})

    # Sort top-to-bottom, merge overlapping/adjacent lines
    boxes.sort(key=lambda b: b["y"])
    merged = merge_close_boxes(boxes, gap=max(8, img_h // 150))
    return merged


def merge_close_boxes(boxes: list[dict], gap: int) -> list[dict]:
    """Merge boxes whose y-ranges overlap or are within `gap` pixels."""
    if not boxes:
        return []
    merged = [boxes[0].copy()]
    for b in boxes[1:]:
        prev = merged[-1]
        prev_bottom = prev["y"] + prev["h"]
        b_top = b["y"]
        if b_top <= prev_bottom + gap:
            # Extend previous box
            new_bottom = max(prev_bottom, b["y"] + b["h"])
            prev["x"] = min(prev["x"], b["x"])
            prev["w"] = max(prev["x"] + prev["w"], b["x"] + b["w"]) - prev["x"]
            prev["h"] = new_bottom - prev["y"]
        else:
            merged.append(b.copy())
    return merged


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)

    images = sorted(
        f for f in RAW_DIR.iterdir()
        if f.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    print(f"[extract] {len(images)} prescription images in {RAW_DIR}")

    annotation_rows: list[tuple[str, str]] = []
    total_lines = 0

    for img_path in images:
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"  SKIP (unreadable): {img_path.name}")
            continue

        h, w = img.shape[:2]
        gray = preprocess(img)
        boxes = detect_lines(gray, w, h)

        if len(boxes) < 2:
            # Fallback: split image into equal horizontal bands
            n_bands = 10
            band_h = h // n_bands
            boxes = [{"x": 0, "y": i * band_h, "w": w, "h": band_h}
                     for i in range(n_bands)]
            print(f"  FALLBACK bands ({n_bands}) for: {img_path.name}")

        stem = img_path.stem
        pad = max(6, h // 200)
        saved = 0
        for i, box in enumerate(boxes):
            x1 = max(0, box["x"] - pad)
            y1 = max(0, box["y"] - pad)
            x2 = min(w, box["x"] + box["w"] + pad)
            y2 = min(h, box["y"] + box["h"] + pad)
            crop = img[y1:y2, x1:x2]
            if crop.size == 0 or (y2 - y1) < 10:
                continue
            out_name = f"{stem}_line_{i}.jpg"
            cv2.imwrite(str(OUT_DIR / out_name), crop)
            annotation_rows.append((out_name, ""))
            saved += 1

        total_lines += saved
        print(f"  {saved:3d} lines  |  {img_path.name}")

    # Merge into existing CSV instead of overwriting, to preserve any cached
    # Gemini annotations from a previous auto_annotate run.
    csv_path = OUT_DIR / "real_annotations.csv"
    existing_labels: dict[str, str] = {}
    if csv_path.exists():
        with open(csv_path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing_labels[row["file_name"]] = row.get("text", "")

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w_csv = csv.writer(f)
        w_csv.writerow(["file_name", "text"])
        for name, _ in annotation_rows:
            w_csv.writerow([name, existing_labels.get(name, "")])

    print(f"\n[extract] done. {total_lines} line crops -> {OUT_DIR}")
    print(f"Next: python ocr-model/auto_annotate_v2.py")


if __name__ == "__main__":
    main()
