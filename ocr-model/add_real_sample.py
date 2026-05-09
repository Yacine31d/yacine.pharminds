import os
import argparse
import csv
import shutil
import uuid

def add_sample(image_path, text, dataset_dir="ocr-model/dataset"):
    """
    Carefully adds a real-world sample to the dataset.
    """
    images_dir = os.path.join(dataset_dir, "images")
    labels_csv = os.path.join(dataset_dir, "labels.csv")
    
    if not os.path.exists(image_path):
        print(f"Error: Image '{image_path}' not found.")
        return
        
    # Generate a unique name to avoid collisions
    ext = os.path.splitext(image_path)[1]
    new_filename = f"real_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(images_dir, new_filename)
    
    # Copy image
    print(f"Adding image: {new_filename}")
    shutil.copy2(image_path, dest_path)
    
    # Update CSV
    print(f"Updating labels with: {text}")
    with open(labels_csv, "a", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([new_filename, text])
        
    print(f"Successfully added '{new_filename}' to the dataset.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add a real-world sample to the OCR dataset.")
    parser.add_argument("--image", required=True, help="Path to the prescription image scan")
    parser.add_argument("--text", required=True, help="Corrected transcription of the prescription")
    
    args = parser.parse_args()
    add_sample(args.image, args.text)
