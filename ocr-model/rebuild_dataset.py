"""
rebuild_dataset.py

Merges real labeled line crops with synthetic data, oversamples real
lines 5x, and writes a clean balanced dataset/labels.csv ready for
TrOCR-base training.

Strategy:
  - Real lines (from real_data_lines/real_annotations.csv):
      keep only 'ok' labels (non-blank, len >= 2), oversample 5x
  - Reviewed labels (real_data_lines/real_labels_reviewed.csv):
      takes priority over auto-labels when both exist
  - Synthetic printed (dataset/labels.csv prefix 'printed_'):
      keep up to 3000 best (highest text diversity)
  - Synthetic handwritten (prefix 'handwritten_'):
      keep up to 3000 best

Final split written to: dataset/labels.csv
Real images copied to:  dataset/images/

Run:
    python ocr-model/rebuild_dataset.py
"""

import csv
import random
import shutil
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).parent
LINES_DIR = ROOT / "real_data_lines"
DS_DIR = ROOT / "dataset"
IMAGES_DIR = DS_DIR / "images"
LABELS_CSV = DS_DIR / "labels.csv"

AUTO_CSV = LINES_DIR / "real_annotations.csv"
REVIEWED_CSV = LINES_DIR / "real_labels_reviewed.csv"

OVERSAMPLE_REAL = 5
MAX_PRINTED = 3000
MAX_HANDWRITTEN = 3000

random.seed(42)


def load_csv(path: Path) -> dict[str, dict]:
    rows = {}
    if not path.exists():
        return rows
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows[row["file_name"]] = row
    return rows


def load_synthetic(labels_csv: Path) -> tuple[list[dict], list[dict]]:
    printed, handwritten = [], []
    if not labels_csv.exists():
        return printed, handwritten
    with open(labels_csv, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fn = row["file_name"]
            text = (row.get("text") or "").strip()
            if not text or len(text) < 2:
                continue
            if fn.startswith("printed_"):
                printed.append(row)
            elif fn.startswith("handwritten_"):
                handwritten.append(row)
    return printed, handwritten


def diverse_sample(rows: list[dict], n: int) -> list[dict]:
    """Keep samples that maximize text diversity (unique word coverage)."""
    if len(rows) <= n:
        return rows
    random.shuffle(rows)
    seen_words: Counter = Counter()
    selected = []
    for row in rows:
        words = set((row.get("text") or "").lower().split())
        score = sum(1 for w in words if seen_words[w] < 3)
        if score > 0 or len(selected) < n // 2:
            selected.append(row)
            seen_words.update(words)
        if len(selected) >= n:
            break
    return selected


def main() -> None:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load real labels (reviewed takes priority over auto) ─────────────────
    auto = load_csv(AUTO_CSV)
    reviewed = load_csv(REVIEWED_CSV)

    real_rows: list[dict] = []
    for fn, row in auto.items():
        text = (row.get("text") or "").strip()
        # Override with reviewed label if present and not skipped
        if fn in reviewed:
            rev = reviewed[fn]
            if rev.get("status") == "skip":
                continue
            text = (rev.get("text") or "").strip()
        if not text or len(text) < 2:
            continue
        real_rows.append({"file_name": fn, "text": text, "_src": "real"})

    print(f"[rebuild] {len(real_rows)} real labeled crops")

    # Copy real images to dataset/images
    copied = 0
    for row in real_rows:
        src = LINES_DIR / row["file_name"]
        dst = IMAGES_DIR / row["file_name"]
        if src.exists() and not dst.exists():
            shutil.copy2(src, dst)
            copied += 1
    print(f"[rebuild] copied {copied} new real images to dataset/images/")

    # Oversample real lines
    oversampled_real = real_rows * OVERSAMPLE_REAL
    random.shuffle(oversampled_real)
    print(f"[rebuild] real after {OVERSAMPLE_REAL}x oversample: {len(oversampled_real)}")

    # ── Load + sample synthetic ───────────────────────────────────────────────
    printed_rows, handwritten_rows = load_synthetic(LABELS_CSV)
    print(f"[rebuild] synthetic: {len(printed_rows)} printed, {len(handwritten_rows)} handwritten")

    printed_sample = diverse_sample(printed_rows, MAX_PRINTED)
    handwritten_sample = diverse_sample(handwritten_rows, MAX_HANDWRITTEN)
    print(f"[rebuild] synthetic after sampling: {len(printed_sample)} printed, {len(handwritten_sample)} handwritten")

    # ── Merge all ─────────────────────────────────────────────────────────────
    all_rows = oversampled_real + printed_sample + handwritten_sample
    random.shuffle(all_rows)

    # Write new labels.csv
    with open(LABELS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file_name", "text"])
        w.writeheader()
        for row in all_rows:
            w.writerow({"file_name": row["file_name"], "text": row["text"]})

    total = len(all_rows)
    real_count = len(oversampled_real)
    synth_count = len(printed_sample) + len(handwritten_sample)
    print(f"\n[rebuild] OK dataset/labels.csv written")
    print(f"  Total rows  : {total}")
    print(f"  Real (5x)   : {real_count}  ({100*real_count/total:.1f}%)")
    print(f"  Synthetic   : {synth_count}  ({100*synth_count/total:.1f}%)")
    print(f"  Unique real : {len(real_rows)}")
    print(f"\nNext step: python ocr-model/train_trocr.py --epochs 15")


if __name__ == "__main__":
    main()
