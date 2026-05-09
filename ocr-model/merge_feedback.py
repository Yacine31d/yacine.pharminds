import os
import csv
import shutil

def merge_datasets(main_dir="dataset", feedback_dir="dataset/feedback"):
    """
    Merges manually corrected feedback data into the main dataset.
    This assumes `dataset/feedback/predictions.csv` has been reviewed by the user.
    """
    print("Starting dataset merge...")
    main_labels = os.path.join(main_dir, "labels.csv")
    feedback_labels = os.path.join(feedback_dir, "predictions.csv")
    main_images = os.path.join(main_dir, "images")
    
    if not os.path.exists(feedback_labels):
        print(f"No feedback labels found at {feedback_labels}. Ensure you have reviewed and saved it.")
        return
        
    os.makedirs(main_images, exist_ok=True)
    
    # Read the feedback data
    merged_count = 0
    with open(feedback_labels, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        
        # Open main labels file for appending
        with open(main_labels, "a", encoding="utf-8", newline="") as mf:
            writer = csv.writer(mf)
            
            # If main labels doesn't exist or is empty, write header
            if os.path.getsize(main_labels) == 0:
                writer.writerow(["file_name", "text"])
                
            for row in reader:
                if len(row) < 2:
                    continue
                file_name, text = row[0], row[1]
                
                src_image = os.path.join(feedback_dir, file_name)
                dst_image = os.path.join(main_images, file_name)
                
                if os.path.exists(src_image):
                    shutil.copy2(src_image, dst_image)
                    writer.writerow([file_name, text])
                    merged_count += 1
                else:
                    print(f"Warning: Image {file_name} not found in feedback directory.")
                    
    print(f"Successfully merged {merged_count} reviewed items into the main dataset.")
    print("You can now safely delete the feedback folder or keep it as backup.")

if __name__ == "__main__":
    merge_datasets()
