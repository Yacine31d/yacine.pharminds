"""
Dataset Analyzer - Finds corrupt, mislabeled, and problematic data.
"""
import os
import csv
import json
from PIL import Image
from collections import Counter

DATASET_DIR = "dataset"
IMAGES_DIR = os.path.join(DATASET_DIR, "images")
LABELS_FILE = os.path.join(DATASET_DIR, "labels.csv")
FONTS_DIR = "fonts"

def analyze():
    print("=" * 60)
    print("DATASET ANALYSIS REPORT")
    print("=" * 60)

    # 1. Load labels
    rows = []
    with open(LABELS_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    total = len(rows)
    print(f"\nTotal rows in labels.csv: {total}")

    # 2. Count by prefix
    prefix_counts = Counter()
    for row in rows:
        prefix = row["file_name"].split("_")[0]
        prefix_counts[prefix] += 1
    print(f"\nData split by prefix:")
    for prefix, count in prefix_counts.most_common():
        print(f"  {prefix}: {count}")

    # 3. Check for missing images
    missing_images = []
    for row in rows:
        img_path = os.path.join(IMAGES_DIR, row["file_name"])
        if not os.path.exists(img_path):
            missing_images.append(row["file_name"])
    print(f"\nMissing image files: {len(missing_images)}")
    if missing_images[:5]:
        for m in missing_images[:5]:
            print(f"  - {m}")

    # 4. Check for empty/blank labels
    empty_labels = [r for r in rows if not r["text"] or r["text"].strip() == ""]
    print(f"\nEmpty/blank labels: {len(empty_labels)}")
    if empty_labels[:5]:
        for e in empty_labels[:5]:
            print(f"  - {e['file_name']}")

    # 5. Check for corrupt images (can't be opened, zero-size, too small)
    corrupt_images = []
    tiny_images = []
    for row in rows:
        img_path = os.path.join(IMAGES_DIR, row["file_name"])
        if not os.path.exists(img_path):
            continue
        try:
            fsize = os.path.getsize(img_path)
            if fsize == 0:
                corrupt_images.append((row["file_name"], "zero bytes"))
                continue
            img = Image.open(img_path)
            img.verify()  # Verify it's a valid image
            # Re-open to get size (verify() closes it)
            img = Image.open(img_path)
            w, h = img.size
            if w < 5 or h < 5:
                tiny_images.append((row["file_name"], f"{w}x{h}"))
        except Exception as e:
            corrupt_images.append((row["file_name"], str(e)))

    print(f"\nCorrupt/unreadable images: {len(corrupt_images)}")
    for name, reason in corrupt_images[:10]:
        print(f"  - {name}: {reason}")

    print(f"\nTiny images (< 5px): {len(tiny_images)}")
    for name, size in tiny_images[:10]:
        print(f"  - {name}: {size}")

    # 6. Check "handwritten" fonts - are they actually handwriting or system fonts?
    print(f"\n{'=' * 60}")
    print("FONT ANALYSIS")
    print(f"{'=' * 60}")
    
    hw_fonts = []
    sys_fonts_paths = ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/times.ttf", "C:/Windows/Fonts/calibri.ttf"]
    
    if os.path.exists(FONTS_DIR):
        hw_fonts = [f for f in os.listdir(FONTS_DIR) if f.endswith('.ttf')]
        print(f"\nHandwriting fonts found in fonts/: {len(hw_fonts)}")
        for f in hw_fonts:
            print(f"  - {f}")
    else:
        print("\nWARNING: fonts/ directory not found!")
    
    if not hw_fonts:
        print("\n*** CRITICAL ISSUE: No handwriting fonts exist! ***")
        print("The generate_dataset.py script would have fallen back to system fonts")
        print("(Arial, Times, Calibri) for ALL 'handwritten_' images.")
        print("This means 'handwritten_' images are actually PRINTED with system fonts!")
        print("They are MISLABELED and will confuse the model.")

    # 7. Check for duplicate labels
    text_counts = Counter(r["text"] for r in rows if r["text"])
    duplicates = {text: count for text, count in text_counts.items() if count > 5}
    print(f"\nHighly duplicated texts (>5 occurrences): {len(duplicates)}")
    for text, count in sorted(duplicates.items(), key=lambda x: -x[1])[:15]:
        print(f"  [{count}x] {text}")

    # 8. Check for very short/suspicious labels
    suspicious = [r for r in rows if r["text"] and len(r["text"]) < 3]
    print(f"\nSuspiciously short labels (<3 chars): {len(suspicious)}")
    for s in suspicious[:10]:
        print(f"  - {s['file_name']}: '{s['text']}'")

    # 9. Summary of issues
    issues = {
        "missing_images": missing_images,
        "empty_labels": [e["file_name"] for e in empty_labels],
        "corrupt_images": [c[0] for c in corrupt_images],
        "tiny_images": [t[0] for t in tiny_images],
        "no_handwriting_fonts": len(hw_fonts) == 0,
    }
    
    # Save report
    with open("dataset_analysis.json", "w", encoding="utf-8") as f:
        json.dump(issues, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'=' * 60}")
    print("RECOMMENDATIONS")
    print(f"{'=' * 60}")
    
    total_bad = len(missing_images) + len(empty_labels) + len(corrupt_images) + len(tiny_images)
    print(f"\nTotal problematic rows to remove: {total_bad}")
    
    if not hw_fonts:
        hw_count = prefix_counts.get("handwritten", 0)
        print(f"\n*** RENAME {hw_count} 'handwritten_' files to 'printed_' ***")
        print("These were generated with system fonts, not handwriting fonts.")
    
    print(f"\nFull report saved to dataset_analysis.json")

if __name__ == "__main__":
    analyze()
