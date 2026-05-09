"""
Dataset Cleanup Script
- Renames 3000 mislabeled 'handwritten_' files to 'printed_' in both the filesystem and labels.csv
- Removes excessive duplicates (keeps max 8 copies of any identical text)
- Extracts the zip fonts so future regeneration works properly
"""
import os
import csv
import zipfile
import shutil
from collections import Counter

DATASET_DIR = "dataset"
IMAGES_DIR = os.path.join(DATASET_DIR, "images")
LABELS_FILE = os.path.join(DATASET_DIR, "labels.csv")
FONTS_DIR = "fonts"

def extract_fonts():
    """Extract all zipped fonts that were never extracted."""
    print("=" * 60)
    print("STEP 1: Extracting handwriting fonts from ZIP files")
    print("=" * 60)
    
    extracted = 0
    for f in os.listdir(FONTS_DIR):
        if f.endswith('.zip'):
            zip_path = os.path.join(FONTS_DIR, f)
            print(f"  Extracting {f}...")
            try:
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    for member in zf.namelist():
                        if member.endswith('.ttf'):
                            # Extract TTF to fonts dir directly
                            source = zf.open(member)
                            target_name = os.path.basename(member)
                            target_path = os.path.join(FONTS_DIR, target_name)
                            with open(target_path, 'wb') as target:
                                shutil.copyfileobj(source, target)
                            print(f"    -> {target_name}")
                            extracted += 1
            except Exception as e:
                print(f"    Error: {e}")
    
    print(f"  Extracted {extracted} TTF font files.\n")
    return extracted

def rename_handwritten_to_printed():
    """Rename all handwritten_ images to printed_ since they used system fonts."""
    print("=" * 60)
    print("STEP 2: Renaming mislabeled 'handwritten_' to 'printed_'")
    print("=" * 60)
    
    # Read current labels
    rows = []
    with open(LABELS_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    
    # Find the highest printed_ index
    max_printed_idx = -1
    for row in rows:
        if row["file_name"].startswith("printed_"):
            idx = int(row["file_name"].replace("printed_", "").replace(".jpg", ""))
            max_printed_idx = max(max_printed_idx, idx)
    
    next_idx = max_printed_idx + 1
    renamed_count = 0
    
    updated_rows = []
    for row in rows:
        if row["file_name"].startswith("handwritten_"):
            old_name = row["file_name"]
            new_name = f"printed_{next_idx}.jpg"
            
            old_path = os.path.join(IMAGES_DIR, old_name)
            new_path = os.path.join(IMAGES_DIR, new_name)
            
            if os.path.exists(old_path):
                os.rename(old_path, new_path)
                row["file_name"] = new_name
                renamed_count += 1
                next_idx += 1
            
        updated_rows.append(row)
    
    print(f"  Renamed {renamed_count} files.\n")
    return updated_rows

def remove_excessive_duplicates(rows, max_copies=8):
    """Keep at most max_copies of any identical text to reduce bias."""
    print("=" * 60)
    print(f"STEP 3: Removing excessive duplicates (keeping max {max_copies})")
    print("=" * 60)
    
    text_counts = Counter()
    cleaned_rows = []
    removed = 0
    
    for row in rows:
        text = row["text"]
        text_counts[text] += 1
        
        if text_counts[text] <= max_copies:
            cleaned_rows.append(row)
        else:
            # Remove the image file too
            img_path = os.path.join(IMAGES_DIR, row["file_name"])
            if os.path.exists(img_path):
                os.remove(img_path)
            removed += 1
    
    print(f"  Removed {removed} duplicate rows.")
    print(f"  Remaining rows: {len(cleaned_rows)}\n")
    return cleaned_rows

def save_labels(rows):
    """Save cleaned labels back to CSV."""
    print("=" * 60)
    print("STEP 4: Saving cleaned labels.csv")
    print("=" * 60)
    
    # Backup original
    backup_path = LABELS_FILE + ".backup"
    if not os.path.exists(backup_path):
        shutil.copy2(LABELS_FILE, backup_path)
        print(f"  Original backed up to {backup_path}")
    
    with open(LABELS_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["file_name", "text"])
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"  Saved {len(rows)} rows to {LABELS_FILE}\n")

def print_summary(rows):
    print("=" * 60)
    print("FINAL DATASET SUMMARY")
    print("=" * 60)
    
    prefix_counts = Counter()
    for row in rows:
        prefix = row["file_name"].split("_")[0]
        prefix_counts[prefix] += 1
    
    for prefix, count in prefix_counts.most_common():
        print(f"  {prefix}: {count}")
    
    print(f"  Total: {len(rows)}")
    
    # Check unique texts
    unique_texts = len(set(r["text"] for r in rows))
    print(f"  Unique texts: {unique_texts}")
    
    # Check max duplication
    text_counts = Counter(r["text"] for r in rows)
    max_dup = max(text_counts.values())
    print(f"  Max copies of any text: {max_dup}")

def main():
    # Step 1: Extract fonts for future use
    extract_fonts()
    
    # Step 2: Rename mislabeled handwritten_ to printed_
    rows = rename_handwritten_to_printed()
    
    # Step 3: Remove excessive duplicates
    rows = remove_excessive_duplicates(rows, max_copies=8)
    
    # Step 4: Save
    save_labels(rows)
    
    # Summary
    print_summary(rows)
    
    print("\n✅ Dataset cleanup complete!")
    print("Next: Re-run generate_dataset.py to create REAL handwritten samples using the extracted fonts.")

if __name__ == "__main__":
    main()
