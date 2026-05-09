"""
Regenerate REAL handwritten samples using actual handwriting fonts.
Adds them to the existing cleaned dataset.
"""
import os
import random
import csv
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

DATASET_DIR = "dataset"
IMAGES_DIR = os.path.join(DATASET_DIR, "images")
LABELS_FILE = os.path.join(DATASET_DIR, "labels.csv")
FONTS_DIR = "fonts"

NUM_HANDWRITTEN = 3000

# Same vocabularies as generate_dataset.py
DRUGS = [
    "Doliprane 1000mg", "Doliprane 500mg", "Augmentin 1g", "Clamoxyl 500mg", 
    "Amoxicilline 500mg", "Aspegic 1000mg", "Voltarene 75mg", "Spasfon 80mg",
    "Smecta", "Efferalgan 1000mg", "Paracetamol 500", "Lovenox 4000 UI",
    "Maxilase", "Rhinathiol", "Fervex", "Maalox", "Gaviscon", "Meteospasmyl",
    "Daflon 500", "Levothyrox 100", "Glucophage 850", "Diamicron 60", 
    "Amlodipine 5mg", "Tahor 20", "Plavix 75", "Kardegic 75", "Lasilix 40",
    "Flagyl 125", "Bronchocal", "Vit D3 200 000", "FERRUM", "Zyloric 300",
    "Triatec", "Crestor", "Motilium", "Antadir", "Atacand", "Novalgine",
    "Bipreterax", "Lipanthyl", "Birodogyl", "Ibuprofene", "Amoclan BD",
    "Zomax", "Mercilon", "Amoclan BD", "Proctolog gel", "Sulpiride", "Vitamag",
    "Detensiel", "Bebaline", "Sapsakof 300", "Hytacand", "Novofamine",
    "MARi Lon", "Am o clan", "Pomoc gel", "Antar"
]

POSOLOGY = [
    "1 comp matin et soir", "1 gelule 3 fois par jour", "Pendant 7 jours", 
    "En cas de douleur", "1 sachet par jour", "2 comprimes si besoin",
    "Le soir au coucher", "1 a 2 comprimes par jour", "3x/jour apres repas",
    "x 2", "x 3", "1 cp 1/4 h Avant les Repas 2x/j", "1 sachet Apres les repas 3/j", 
    "1/j 03 mois", "02 cp 02 f / j", "1 c / 8h 3j", "1 cp x 3 / j", 
    "1 cp 3 x / j", "1 gel le matin", "1/j", "01 cp 02 f / j",
    "7,5 ml x 2", "7,5 ml x 3", "20 gouttes x 2", "1 ampoule",
    "1 c a c x 4", "1 c a m", "1 c a s"
]

PREFIXES = ["Dr.", "Docteur", "Pr.", "Professeur", "Dr"]
FIRST_NAMES = ["Ahmed", "Mohamed", "Amine", "Karim", "Yassine", "Nadia", "Sarah", "Meriem", "Samira", "Fatima"]
LAST_NAMES = ["Benali", "Bouzid", "Saadi", "Mansouri", "Haddad", "Yahiaoui", "Brahimi", "Toumi", "Boudiaf"]
SPECIALTIES = [
    "Medecin Generaliste", "Cardiologue", "Pediatre", "Dermatologue", "Chirurgien Dentiste",
    "Pediatrie", "Cardiologie", "Hemodialyse / Maladies des Reins", "Chirurgie Dentaire", 
    "Medecine Generale", "Praticien Principal"
]

def generate_text(is_doctor=False):
    if is_doctor:
        prefix = random.choice(PREFIXES)
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        if random.random() > 0.5:
            return f"{prefix} {fname} {lname}"
        else:
            return f"{prefix} {fname} {lname} - {random.choice(SPECIALTIES)}"
    else:
        if random.random() > 0.3:
            return f"{random.choice(DRUGS)} : {random.choice(POSOLOGY)}"
        else:
            return random.choice(DRUGS)

def add_noise(image):
    img_arr = np.array(image.convert("L"))
    noise = np.random.normal(0, random.uniform(8, 20), img_arr.shape)
    img_arr = img_arr + noise
    img_arr = np.clip(img_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(img_arr).convert("RGB")

def generate_line_image(text, font_path, size=32):
    try:
        font = ImageFont.truetype(font_path, size)
    except:
        font = ImageFont.load_default()
    
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    pad_x = random.randint(10, 30)
    pad_y = random.randint(10, 20)
    
    width = text_width + pad_x * 2
    height = text_height + pad_y * 2
    
    # Prescription paper-like backgrounds
    bg_color = (
        random.randint(230, 255),
        random.randint(230, 255),
        random.randint(230, 255)
    )
    
    image = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    
    # Handwritten text in pen colors: black, dark blue, dark grey
    pen_colors = [
        (random.randint(0, 30), random.randint(0, 30), random.randint(50, 120)),   # blue pen
        (random.randint(0, 40), random.randint(0, 40), random.randint(0, 40)),      # black pen
        (random.randint(20, 60), random.randint(20, 60), random.randint(20, 60)),   # grey pencil
    ]
    text_color = random.choice(pen_colors)
    
    draw.text((pad_x, pad_y), text, font=font, fill=text_color)
    
    # More aggressive augmentations for handwritten
    if random.random() > 0.3:
        image = add_noise(image)
        
    if random.random() > 0.4:
        image = image.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.5)))
        
    # More rotation for handwriting (people write at angles)
    angle = random.uniform(-4, 4)
    image = image.rotate(angle, expand=True, fillcolor=bg_color)
    
    return image

def main():
    print("Loading handwriting fonts...")
    hw_fonts = [os.path.join(FONTS_DIR, f) for f in os.listdir(FONTS_DIR) if f.endswith('.ttf')]
    
    if not hw_fonts:
        print("ERROR: No .ttf fonts found in fonts/ directory!")
        return
    
    print(f"Found {len(hw_fonts)} handwriting fonts:")
    for f in hw_fonts:
        print(f"  - {os.path.basename(f)}")
    
    # Read existing labels to find the next index
    existing_rows = []
    with open(LABELS_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing_rows.append(row)
    
    print(f"\nExisting dataset: {len(existing_rows)} rows")
    
    # Generate handwritten samples
    new_rows = []
    print(f"\nGenerating {NUM_HANDWRITTEN} handwritten samples...")
    
    for i in range(NUM_HANDWRITTEN):
        is_doctor = random.random() < 0.2
        text = generate_text(is_doctor)
        font = random.choice(hw_fonts)
        size = random.randint(28, 48)
        
        img = generate_line_image(text, font, size)
        img_name = f"handwritten_{i}.jpg"
        img.save(os.path.join(IMAGES_DIR, img_name))
        new_rows.append({"file_name": img_name, "text": text})
        
        if (i+1) % 500 == 0:
            print(f"  Generated {i+1}/{NUM_HANDWRITTEN}")
    
    # Combine and save
    all_rows = existing_rows + new_rows
    
    with open(LABELS_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["file_name", "text"])
        writer.writeheader()
        writer.writerows(all_rows)
    
    print(f"\nDone! Dataset now has {len(all_rows)} total rows:")
    
    from collections import Counter
    prefix_counts = Counter()
    for row in all_rows:
        prefix = row["file_name"].split("_")[0]
        prefix_counts[prefix] += 1
    for prefix, count in prefix_counts.most_common():
        print(f"  {prefix}: {count}")

if __name__ == "__main__":
    main()
