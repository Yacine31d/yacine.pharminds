import os
import csv
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY not found in environment variables.")
    exit(1)

genai.configure(api_key=API_KEY)
# Using gemini-2.5-flash as the api_core for 1.5 might be restricted by your api key version
model = genai.GenerativeModel('gemini-2.0-flash')

image_folder = "real_data_lines"
csv_filename = os.path.join(image_folder, "real_annotations.csv")

prompt = """
Read the handwritten or printed text in this medical prescription crop. 
Output ONLY the text you see.
If the image is just noise, borders, or completely empty, output exactly [BLANK].
"""

print(f"Starting automatic annotation into {csv_filename}...")

with open(csv_filename, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["file_name", "text"])
    
    if not os.path.exists(image_folder):
        exit(1)
        
    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(".jpg") and "_line_" in f]
    image_files.sort()

    for idx, filename in enumerate(image_files, 1):
        image_path = os.path.join(image_folder, filename)
        
        while True:
            try:
                print(f"[{idx}/{len(image_files)}] Processing {filename}...")
                sample_file = genai.upload_file(path=image_path)
                
                response = model.generate_content([prompt, sample_file])
                text = response.text.strip()
                
                if "[BLANK]" in text or text == "":
                    text = ""
                    
                writer.writerow([filename, text])
                file.flush() 
                
                # 4-second delay keeps us at 15 RPM to avoid Free Tier ban
                time.sleep(4.5)
                break # Success, move to next file
                
            except Exception as e:
                print(f"Rate limited or error: {e}. Retrying in 30 seconds...")
                time.sleep(30) # Wait out the rate limit block
            
print("\nDone! All images processed and saved to real_annotations.csv")
