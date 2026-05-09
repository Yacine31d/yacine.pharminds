import os
import random
import csv
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

# Configuration
NUM_PRINTED = 5000
NUM_HANDWRITTEN = 3000
OUTPUT_DIR = "dataset"
IMAGES_DIR = os.path.join(OUTPUT_DIR, "images")
LABELS_FILE = os.path.join(OUTPUT_DIR, "labels.csv")

os.makedirs(IMAGES_DIR, exist_ok=True)

# Vocabularies (Augmented with Real Algerian Data)
DRUGS = [
    "Doliprane 1000mg", "Doliprane 500mg", "Augmentin 1g", "Clamoxyl 500mg", 
    "Amoxicilline 500mg", "Aspegic 1000mg", "Voltarene 75mg", "Spasfon 80mg",
    "Smecta", "Efferalgan 1000mg", "Paracetamol 500", "Lovenox 4000 UI",
    "Maxilase", "Rhinathiol", "Fervex", "Maalox", "Gaviscon", "Meteospasmyl",
    "Daflon 500", "Levothyrox 100", "Glucophage 850", "Diamicron 60", 
    "Amlodipine 5mg", "Tahor 20", "Plavix 75", "Kardegic 75", "Lasilix 40",
    # Real Annotations added:
    "Flagyl 125", "Bronchocal", "Vit D3 200 000", "FERRUM", "Zyloric 300",
    "Triatec", "Crestor", "Motilium", "Antadir", "Atacand", "Novalgine",
    "Bipreterax", "Lipanthyl", "Birodogyl", "Ibuprofene", "Amoclan BD",
    "Zomax", "Mercilon", "Amoclan BD", "Proctolog gel", "Sulpiride", "Vitamag",
    "Detensiel", "Bebaline"
]

POSOLOGY = [
    "1 comp matin et soir", "1 gélule 3 fois par jour", "Pendant 7 jours", 
    "En cas de douleur", "1 sachet par jour", "2 comprimés si besoin",
    "Le soir au coucher", "1 à 2 comprimés par jour", "3x/jour après repas",
    # Real Annotations added:
    "x 2", "x 3", "1 cp 1/4 h Avant les Repas 2x/j", "1 sachet Après les repas 3/j", 
    "1/j 03 mois", "02 cp 02 f / j", "1 c / 8h 3j", "1 cp x 3 / j", 
    "1 cp 3 x / j", "1 gel le matin"
]

PREFIXES = ["Dr.", "Docteur", "Pr.", "Professeur", "Dr"]
FIRST_NAMES = ["Ahmed", "Mohamed", "Amine", "Karim", "Yassine", "Nadia", "Sarah", "Meriem", "Samira", "Fatima"]
LAST_NAMES = ["Benali", "Bouzid", "Saadi", "Mansouri", "Haddad", "Yahiaoui", "Brahimi", "Toumi", "Boudiaf"]
SPECIALTIES = [
    "Médecin Généraliste", "Cardiologue", "Pédiatre", "Dermatologue", "Chirurgien Dentiste",
    "Pediatrie", "Cardiologie", "Hemodialyse / Maladies des Reins", "Chirurgie Dentaire", 
    "Médecine Générale", "Praticien Principal"
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

def get_fonts(font_dir, sys_fonts=False):
    fonts = []
    if sys_fonts:
        # Standard printed fonts on Windows
        sys_paths = ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/times.ttf", "C:/Windows/Fonts/calibri.ttf"]
        for p in sys_paths:
            if os.path.exists(p): fonts.append(p)
    else:
        # Handwriting fonts downloaded
        if os.path.exists(font_dir):
            for file in os.listdir(font_dir):
                if file.endswith('.ttf'):
                    fonts.append(os.path.join(font_dir, file))
    return fonts

def add_noise(image):
    # Convert to numpy array
    img_arr = np.array(image.convert("L"))
    # Add gaussian noise
    noise = np.random.normal(0, random.uniform(5, 15), img_arr.shape)
    img_arr = img_arr + noise
    img_arr = np.clip(img_arr, 0, 255).astype(np.uint8)
    # Convert back
    noisy_img = Image.fromarray(img_arr).convert("RGB")
    return noisy_img

def generate_line_image(text, font_path, size=32):
    try:
        font = ImageFont.truetype(font_path, size)
    except:
        font = ImageFont.load_default()
    
    # Calculate text bounding box
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Add padding
    pad_x = random.randint(10, 30)
    pad_y = random.randint(10, 20)
    
    width = text_width + pad_x * 2
    height = text_height + pad_y * 2
    
    # Random background color (slight variations of white/grey/blueish paper)
    bg_color = (
        random.randint(240, 255),
        random.randint(240, 255),
        random.randint(240, 255)
    )
    
    image = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(image)
    
    # Text color (black, dark blue, dark grey)
    text_color = (
        random.randint(0, 50),
        random.randint(0, 50),
        random.randint(0, 80)
    )
    
    draw.text((pad_x, pad_y), text, font=font, fill=text_color)
    
    # Augmentations
    if random.random() > 0.5:
        image = add_noise(image)
        
    if random.random() > 0.5:
        image = image.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.2)))
        
    # Rotate slightly
    angle = random.uniform(-2, 2)
    image = image.rotate(angle, expand=True, fillcolor=bg_color)
    
    # Resize to have a standard height of 32 (TrOCR requirement is usually 384x384, but processing squashes it)
    # Actually, TrOCRProcessor resizes everything to 384x384. A standard aspect ratio is preferred.
    # Let's keep original ratio but ensure height is reasonable.
    
    return image

def main():
    print("Loading fonts...")
    handwriting_fonts = get_fonts("fonts", sys_fonts=False)
    printed_fonts = get_fonts("fonts", sys_fonts=True)
    
    if not handwriting_fonts:
        print("Warning: No handwriting fonts found! Run setup_fonts.py first.")
        # Fallback to system fonts for everything
        handwriting_fonts = printed_fonts
        
    if not printed_fonts:
        print("Warning: No system fonts found!")
        return

    data = []
    
    print("Generating printed samples...")
    for i in range(NUM_PRINTED):
        is_doctor = random.random() < 0.2
        text = generate_text(is_doctor)
        font = random.choice(printed_fonts)
        size = random.randint(24, 36)
        
        img = generate_line_image(text, font, size)
        img_name = f"printed_{i}.jpg"
        img.save(os.path.join(IMAGES_DIR, img_name))
        data.append((img_name, text))
        
        if (i+1) % 1000 == 0:
            print(f"Generated {i+1} printed samples")

    print("Generating handwritten samples...")
    for i in range(NUM_HANDWRITTEN):
        is_doctor = random.random() < 0.2
        text = generate_text(is_doctor)
        font = random.choice(handwriting_fonts)
        size = random.randint(28, 48) # Handwriting usually larger
        
        img = generate_line_image(text, font, size)
        img_name = f"handwritten_{i}.jpg"
        img.save(os.path.join(IMAGES_DIR, img_name))
        data.append((img_name, text))
        
        if (i+1) % 1000 == 0:
            print(f"Generated {i+1} handwritten samples")

    # Save labels
    with open(LABELS_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["file_name", "text"])
        writer.writerows(data)
        
    print(f"Dataset generated successfully at {OUTPUT_DIR}!")
    print(f"Total: {len(data)} images.")

if __name__ == "__main__":
    main()
