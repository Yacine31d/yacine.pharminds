"""
auto_annotate_v2.py

Re-runs Gemini auto-annotation on every line crop in real_data_lines/
with a stronger, domain-aware prompt. Output is saved to
real_data_lines/real_annotations.csv (overwrites the old one).

The Label Review UI (label_review_server.py) reads this file as
the seed for human review.

Run:
    python ocr-model/auto_annotate_v2.py
"""

import csv
import os
import time
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise SystemExit("GEMINI_API_KEY missing in ocr-model/.env")

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

ROOT = Path(__file__).parent
LINES_DIR = ROOT / "real_data_lines"
OUT_CSV = LINES_DIR / "real_annotations.csv"

PROMPT = """You are reading a single cropped line from an Algerian medical prescription.
The line may contain handwritten or printed text in French (sometimes mixed with Arabic).

Common content:
- Drug names: Doliprane, Augmentin, Clamoxyl, Amoxicilline, Aspegic, Voltarene,
  Spasfon, Smecta, Efferalgan, Maxilase, Rhinathiol, Maalox, Gaviscon, Flagyl,
  Triatec, Crestor, Motilium, Ibuprofene, Zomax, etc.
- Dosages: 500mg, 1000mg, 100mg/5ml.
- Posology (frequency): "1 cp x 3 / j", "02 cp 02 f / j", "1 c / 8h 3j",
  "1/j 03 mois", "1 gel le matin", "x 2", "x 3", "20 gouttes x 2",
  "1 sachet apres les repas 3/j".
- Doctor headers: "Dr.", "Docteur", "Pr.", specialty (Cardiologie, Pediatrie...).
- Dates, addresses, patient names.

RULES:
1. Output ONLY the literal text visible in the image. No explanations, no quotes.
2. Preserve original spelling, even if it looks misspelled.
3. Preserve abbreviations exactly as written ("cp", "gel", "j", "f/j").
4. If multiple words on the line, keep them on a single line separated by spaces.
5. If the crop is empty, just borders, a stamp, a signature with no readable
   text, or pure noise, output exactly: [BLANK]
6. If the crop is partially cut off and unreadable, output: [BLANK]
"""


def main() -> None:
    images = sorted(
        f.name for f in LINES_DIR.iterdir()
        if f.suffix.lower() in {".jpg", ".jpeg", ".png"} and "_line_" in f.name
    )
    print(f"[auto-annotate] {len(images)} line crops in {LINES_DIR}")

    # Resume support: skip files already labeled with non-empty text
    existing: dict[str, str] = {}
    if OUT_CSV.exists():
        with open(OUT_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing[row["file_name"]] = row.get("text", "")

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["file_name", "text"])

        for i, fn in enumerate(images, 1):
            path = LINES_DIR / fn

            # Skip if previously labeled with substantive text (resume support)
            prev = existing.get(fn, "").strip()
            if prev and prev != "[BLANK]" and len(prev) > 1:
                writer.writerow([fn, prev])
                f.flush()
                print(f"[{i}/{len(images)}] skip (cached): {fn} -> {prev[:40]}")
                continue

            attempts = 0
            while True:
                attempts += 1
                try:
                    uploaded = genai.upload_file(path=str(path))
                    resp = model.generate_content([PROMPT, uploaded])
                    text = (resp.text or "").strip()
                    if "[BLANK]" in text.upper():
                        text = ""
                    # Strip leading/trailing quotes Gemini sometimes adds
                    text = text.strip("'\"`").strip()
                    writer.writerow([fn, text])
                    f.flush()
                    print(f"[{i}/{len(images)}] {fn} -> {text[:60]}")
                    time.sleep(4.5)  # ~13 RPM, safe under free-tier 15 RPM
                    break
                except Exception as e:
                    if attempts > 3:
                        print(f"[{i}/{len(images)}] giving up on {fn}: {e}")
                        writer.writerow([fn, ""])
                        f.flush()
                        break
                    print(f"  retry {attempts} after error: {e}")
                    time.sleep(30)

    print(f"\n[auto-annotate] done -> {OUT_CSV}")


if __name__ == "__main__":
    main()
