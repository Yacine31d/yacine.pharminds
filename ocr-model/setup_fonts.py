import os
import urllib.request
import zipfile
import shutil

FONTS_DIR = "fonts"
os.makedirs(FONTS_DIR, exist_ok=True)

# Some popular handwriting fonts from Google Fonts
FONT_URLS = [
    ("Caveat", "https://fonts.google.com/download?family=Caveat"),
    ("Dancing_Script", "https://fonts.google.com/download?family=Dancing%20Script"),
    ("Indie_Flower", "https://fonts.google.com/download?family=Indie%20Flower"),
    ("Shadows_Into_Light", "https://fonts.google.com/download?family=Shadows%20Into%20Light"),
    ("Pacifico", "https://fonts.google.com/download?family=Pacifico"),
]

for name, url in FONT_URLS:
    print(f"Downloading {name}...")
    zip_path = os.path.join(FONTS_DIR, f"{name}.zip")
    try:
        urllib.request.urlretrieve(url, zip_path)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Extract only .ttf files
            for file_info in zip_ref.infolist():
                if file_info.filename.endswith('.ttf'):
                    zip_ref.extract(file_info, FONTS_DIR)
        os.remove(zip_path)
    except Exception as e:
        print(f"Failed to download {name}: {e}")

print("Fonts downloaded and extracted!")
