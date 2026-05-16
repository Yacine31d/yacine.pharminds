import os
from PIL import Image, ImageDraw, ImageFont

# Set up paths
image_folder = "real_data_lines"
output_pdf = "dataset_crops.pdf"

print("Finding images...")
# Get all line crop images and sort them
images = [f for f in os.listdir(image_folder) if f.lower().endswith(".jpg") and "_line_" in f]
images.sort()

pdf_pages = []
# Load default font
try:
    font = ImageFont.load_default()
except Exception:
    font = None

print(f"Found {len(images)} images to pack into PDF...")

for img_name in images:
    img_path = os.path.join(image_folder, img_name)
    try:
        original_img = Image.open(img_path).convert("RGB")
        
        # Calculate new canvas dimensions to fit text and image
        # Adding 40 pixels padding at the top for the filename
        text_height = 40
        canvas_w = max(original_img.width + 20, 600)  # Min width 600 so text isn't cut off
        canvas_h = original_img.height + text_height + 20
        
        # Create a white canvas
        canvas = Image.new('RGB', (canvas_w, canvas_h), color=(255, 255, 255))
        draw = ImageDraw.Draw(canvas)
        
        # Write filename at the top
        text = f"Filename: {img_name}"
        if font:
            draw.text((10, 15), text, fill=(0, 0, 0), font=font)
        else:
            draw.text((10, 15), text, fill=(0, 0, 0))
            
        # Paste the crop below the text
        canvas.paste(original_img, (10, text_height))
        
        pdf_pages.append(canvas)
    except Exception as e:
        print(f"Could not process {img_name}: {e}")

if pdf_pages:
    print("Generating PDF document...")
    # The first image saves the entire list as a multi-page PDF
    pdf_pages[0].save(
        output_pdf, 
        "PDF", 
        resolution=100.0, 
        save_all=True, 
        append_images=pdf_pages[1:]
    )
    print(f"SUCCESS: Generated {output_pdf} successfully!")
else:
    print("No images were found to put into the PDF.")
