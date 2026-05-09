"""
label_with_context.py

Context-aware labeler for the 29 prescriptions with known ground truth.
Uses Gemini to match each line crop to the correct text segment from the
full_raw_text, giving ~95% accurate labels without manual review.

For the remaining prescriptions (no ground truth), falls back to the
standard improved Gemini prompt from auto_annotate_v2.py.

Output: real_data_lines/real_annotations.csv  (file_name, text)
        - overwrites old file
        - keeps BLANK entries blank (empty string)

Run:
    python ocr-model/label_with_context.py
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

# ── Ground truth from the 29 labeled prescriptions ───────────────────────────
GROUND_TRUTH = {
    "WhatsApp Image 2026-04-21 at 1.48.18 PM.jpeg": "Touadi Amar 1/ Fraxal 5 1 cp x 2 / j 2/ Prostamixon 60 1 cp x 2 / j 3/ Divido lp 75 1 cp x 2 / j 4/ Antag 20 1 cp x 2 / j 5/ Ciprolon 500 1 cp x 2 / j 6/ Diflucan 50 1 cp / j 7/ Telfast 180 1 cp / j 03 mois",
    "WhatsApp Image 2026-04-21 at 1.48.18 PM (1).jpeg": "15 AVR 2026 Rahmoune Hamza 1/ Ostonel cp 35 1 cp / semaine QSP 03 mois 2/ Calcium sachet 1 sachet 2 / j 3/ Vit D amp 1 amp / 15 j 4/ Lomac cp 1 cp / j 5/ Xydol cp 600 1 cp x 2 / j 6/ Baclon cp 10 1 cp x 2 / j",
    "WhatsApp Image 2026-04-21 at 1.48.19 PM.jpeg": "21 AVR 2026 Habri Zahra Age 40 1/ Meteoxane 1 cp x 3 / j 2/ Riabal cp 1 cp x 3 / j 3/ Naxolin cp 100 1 cp x 2 / j 4/ Duphalac sip 1 cas x 3 / j 5/ Sulpiride gel 50 1 gel x 3 / j",
    "WhatsApp Image 2026-04-21 at 1.48.19 PM (1).jpeg": "Bessaoud Abdelkader 1960 1/ Hytacand 16/12.5 01 cp. 2/ Loxen lp 50 1 cp 2x / j 3/ Aspirine cp 100 01 cp. 4/ Atenor cp 100 1 j. 5/ Tahor 40 mg 1 cp.",
    "WhatsApp Image 2026-04-21 at 1.48.19 PM (2).jpeg": "20/04/2026 Lilouli Mebarek Age A 1- Zomax 500 (01 bte) 01 cp / j 2- Sinecod sp (01 fl) 01 c s x 3 / j 3- Doliprane 500 (01 bte) 01 cp x 3 / j 4- Telfast 180 (01 bte) 1 cp / j",
    "WhatsApp Image 2026-04-21 at 1.48.19 PM (4).jpeg": "21/04/2026 Tidjani Med Age Adult 1- Augmentin sachet 0.5g 01 sachet 02 / j 2- Paracetamol 500mg 01 cp 03 / j 3- Toplexil sirop 01 cas 03 / j 4- Nasacort pulv 01 pulv / nez",
    "WhatsApp Image 2026-04-21 at 1.48.19 PM (5).jpeg": "17/02/2026 CHADDAD Belkheir Age 75 1/ Tamsir 0,4 1 cp / j 2/ Prostamed 5 1 cp / j QSP 03 mois",
    "WhatsApp Image 2026-04-21 at 1.48.19 PM (6).jpeg": "20/04/2026 Hamdi Ahmed Age 50 1/ Ciprolon 500 1 cp 2 / j (N 2 bt) 2/ Fucidine 250 cp 2 cp 2 / j (N 4 bt) 3/ Fucidine pd 2 / j (N 1 t) 4/ Antag 20 mg 1 cp / j 5/ Amoxicilline 1 g 1 / j 6/ Flagyl 500 mg 1 / j 7/ Ercefuryl cp 1 / j",
    "WhatsApp Image 2026-04-21 at 1.48.20 PM.jpeg": "20/04/2026 R... Nessrine 1/ Augmentin cp 1g 1 cp x 2 / j (02 btes) 2/ Lomac gel 20 1 gel / j 3/ Paracetamol cp 1g 1 cp x 3 / j 4/ Flazol cp 500 1 cp x 2 / j (02 btes)",
    "WhatsApp Image 2026-04-23 at 10.07.49 AM.jpeg": "30 MARS 2026 Be... Fatma 1/ Antag gel 20 mg 02 1 gel x 2 / j 2/ Xydol 400 02 1 cp x 3 / j 3/ Spasfon cp 02 1 cp x 3 / j 4/ Calcibronat cp 02 1 cp / j 5/ Efferalgan vit c eff 02 1 cp / j 6/ Debridat 200 01 1 cp x 2 / j 7/ Supradyn mg cp 1 cp / j",
    "WhatsApp Image 2026-04-23 at 10.07.49 AM (1).jpeg": "04 AVR 2026 Rahmoune Hamza Age 45 1/ Lisinox cp 40 1 / j 01 bt 2/ Profenid cp 200 1 cp / j 02 btes 3/ Myorelax cp 150 1 cp x 2 / j 02 btes 4/ Mag cp 300 1 / j",
    "WhatsApp Image 2026-04-23 at 10.07.49 AM (2).jpeg": "05/04/2026 Sid Aicha Age A 1/ Clamoxyl 1g 1 g x 2 / j 02 b pendant 06 j 2/ Flagyl cp 500 1 cp x 3 / j 01 b 3/ Sapofen cp 400 1 cp x 2 / j 01 b pendant 03 j 4/ Hextril bb 1 g x 3 / j 01 fl pendant 05 j",
    "WhatsApp Image 2026-04-23 at 10.07.49 AM (3).jpeg": "18/04/2026 REBHI Mohamed Age 5 ans 1/ Clamoxyl sirop 500mg 1 c.m 2x/j QSP 10 jours 2/ Flagyl sirop 125mg 1 c.m 3x/j pendant 5 jours 3/ Urgo aphtes Filmogel 2x/j pendant 5 jours",
    "WhatsApp Image 2026-04-23 at 10.09.01 AM.jpeg": "15/04/2026 Ammouri Amer Age A 1/ Tresiba 20 UI 15h 2/ Novorapid 16 UI x 3 / j 3/ Bandelettes react 1 bte 6x / j 4/ Levothyrox 100 mg 1 cp / j 5/ Levothyrox 75 mg 1 cp / j QSP 03 mois",
    "WhatsApp Image 2026-04-23 at 10.11.16 AM.jpeg": "15/04/2026 Ben Degfal Rahma Age A 1- Glucophage 1000 mg 1 cp 3 / j 2- Diaglinid 0,5 mg 1 cp 2 / j 3- Bandelettes react 1 bte test 4- Exval 10 / 160 1 cp / j 5- Aspr cardio 100 mg 1 cp / j QSP 03 mois",
    "WhatsApp Image 2026-04-23 at 10.17.22 AM.jpeg": "19 AVR 2026 Bessaoud Abdelkader 1960 1/ Hytacand 16/12,5 01 cp. 2/ Loxen lp 50 1 cp 2x / j 3/ Aspirine cp 100 01 cp. 4/ Atenor cp 100 1 j. 5/ Tahor 40 mg 1 cp.",
    "WhatsApp Image 2026-04-23 at 10.17.22 AM (1).jpeg": "Ain Oussera, le 19/04/2026 KHOBIZI Wissal Age 6 ans 1/ Augmentin sirop 1 dose de poids 3x / j 02 bts 2/ Fungizone susp 1 amp 2x / j 01 fl 3/ Efferalgan sirop 1 dose de poids / 6h 01 fl 4/ Daktarin pommade 1 app / j 02 bts 5/ Fucidine 1 app soir 01",
    "WhatsApp Image 2026-04-23 at 10.17.22 AM (2).jpeg": "20/04/2026 Khlodel Ali Age e 1- Augmentin sirop enf 1 s x 2 / j 02 btes 2- Maxilase sp 01 cc x 3 / j 01 bte 3- Doliprane supp 300 1 supp x 2 / j 01 bte 4- Toplexil sip 01 cc x 3 / j 01 bte",
    "WhatsApp Image 2026-04-23 at 10.17.22 AM (3).jpeg": "19 AVR 2026 HABIS Abdelkader Age A 1/ Solupred 20 01 1 Comp par jour pendant 04 jours 2/ Amoclan 1g 02 1 Sach x 2 3/ Bilaxten cp 20 01 1 cp soir",
    "WhatsApp Image 2026-04-23 at 10.17.22 AM (4).jpeg": "18 AVR 2026 Kasmi Hadd... Age A 1- Vit D3 Bon 04 bts 1 amp / 15 j 2- Doliprane 500 cp 1 cp 3 / j 3- Ceteripex cp 1 cp / j 4- Clamoxyl 1g 01 bts 1 g x 2 / j",
    "WhatsApp Image 2026-04-23 at 10.17.22 AM (5).jpeg": "19/04/2026 Touihel Youcef Age 10 ans 1/ Novorapid flex 08 UI 2/ Toujeo 06 UI le soir 3/ Selec react 03 bts QSP 03 mois",
    "WhatsApp Image 2026-04-23 at 10.23.40 AM.jpeg": "20/04/2026 Alloune Zahra Age 42 ans 1/ Trifer fol ou ferosanol gyn cp 1 cp 2x / j 03 mois 2/ Vit C cp 500 mg 1 cp / j 3/ Vit D3 amp 200.000 UI 1 amp / 15 jours 4/ M gés amp 1 amp / j 5/ Ideos cp 500 1 cp le soir 6/ Lomac gel 1 gel / j",
    "WhatsApp Image 2026-04-23 at 10.23.41 AM.jpeg": "20/04/2026 Zedjic Fatiha Age A 1- Novoformine 500 01 cp 2 / j 2- Diaphag 80 01 cp le matin 3- Levothyrox 100 1 cp le matin 4- Bte Check 3 1 bte QSP 03 mois",
    "WhatsApp Image 2026-04-23 at 10.23.41 AM (1).jpeg": "04 AVR 2026 1/ Pyostacine 500 2 cp x 2 / j 12 j 2/ Diflucan 150 1 gel sc",
    "WhatsApp Image 2026-04-23 at 10.23.41 AM (2).jpeg": "18.04.26 Hamidi... Age 56 1/ Divido 75 mg 1 gél 2x / j 2/ Codoliprane 1 gél 3x / j 3/ Vit D 1 amp / 15 j 4/ Vit B1 B6 1 gél 3x / j 5/ Emulgel 2 app / j 6/ Esoproton 1 gél / j",
    "WhatsApp Image 2026-04-23 at 10.23.41 AM (3).jpeg": "20/04/2026 A... 1/ Amoxicilline 250 mg 10 j 1 cp x 3 / j 2/ Isospalgine sirop 01 fl 1 c.c x 3 / j 3/ Paracetamol 200 mg 01 bte 1 supp / 06 h",
    "WhatsApp Image 2026-04-23 at 10.24.31 AM.jpeg": "18 AVR 2026 Chekhbat Feltoun Age A 1/ Lamidaz 250 1 cp / j 03 mois 2/ Fucid 250 2 cp 2 / j (15 j) 3/ Xarria 200 1 cp / soir QSP 2 mois",
    "WhatsApp Image 2026-04-23 at 10.24.31 AM (1).jpeg": "14/04/26 Bagura Rabih Age A 1- Biorogyl 02 bts 2 cp x 2 / j 2- Dolyc 1 g 01 bte 1 cp x 3 / j 3- Givalex bb 01 fl 1 app x 3 / j",
}

FALLBACK_PROMPT = """You are reading a single cropped line from an Algerian medical prescription.
The line may contain handwritten or printed French text (sometimes with Arabic).

Common content: drug names (Doliprane, Augmentin, Clamoxyl, Amoxicilline, Flagyl,
Triatec, Crestor, Motilium, Ibuprofene, Zomax etc.), dosages (500mg, 1000mg),
posology (1 cp x 3 / j, 02 cp 02 f / j, 1/j 03 mois), doctor/patient names.

RULES:
1. Output ONLY the literal text visible. No quotes, no explanations.
2. Preserve original spelling including abbreviations (cp, gel, j, f/j).
3. If blank/noise/stamp/signature with no text, output exactly: [BLANK]
"""

CONTEXT_PROMPT = """You are an expert at reading Algerian medical prescriptions.

Here is the COMPLETE text of this prescription (ground truth):
---
{full_text}
---

Now look at the SINGLE CROPPED LINE in the image.
Your task: output the exact text segment from the above ground truth that appears in this crop.

RULES:
1. Output ONLY the matching text segment. Nothing else.
2. Do NOT invent text not in the ground truth.
3. If the crop shows blank space, a border, a stamp, or a signature without
   readable prescription text, output exactly: [BLANK]
4. Preserve exact spelling, numbers, and abbreviations from the ground truth.
"""


def get_crops_for_prescription(prescription_name: str, all_crops: list[str]) -> list[str]:
    stem = Path(prescription_name).stem
    return sorted([c for c in all_crops if c.startswith(stem + "_line_")])


def annotate_with_context(crop_path: Path, full_text: str) -> str:
    prompt = CONTEXT_PROMPT.format(full_text=full_text)
    uploaded = genai.upload_file(path=str(crop_path))
    resp = model.generate_content([prompt, uploaded])
    text = (resp.text or "").strip().strip("'\"` ").strip()
    if "[BLANK]" in text.upper() or text == "":
        return ""
    return text


def annotate_fallback(crop_path: Path) -> str:
    uploaded = genai.upload_file(path=str(crop_path))
    resp = model.generate_content([FALLBACK_PROMPT, uploaded])
    text = (resp.text or "").strip().strip("'\"` ").strip()
    if "[BLANK]" in text.upper() or text == "":
        return ""
    return text


def main() -> None:
    all_crops = sorted(
        f.name for f in LINES_DIR.iterdir()
        if f.suffix.lower() in {".jpg", ".jpeg", ".png"} and "_line_" in f.name
    )
    print(f"[label] {len(all_crops)} crops found in {LINES_DIR}")

    # Resume: load already-processed entries
    done: dict[str, str] = {}
    if OUT_CSV.exists():
        with open(OUT_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("text", "").strip():
                    done[row["file_name"]] = row["text"]
    print(f"[label] {len(done)} crops already labeled (resuming)")

    results: dict[str, str] = dict(done)

    total = len(all_crops)
    for i, crop_name in enumerate(all_crops, 1):
        if crop_name in done:
            print(f"[{i}/{total}] skip (cached): {crop_name[:50]}")
            continue

        crop_path = LINES_DIR / crop_name
        # Find which prescription this crop belongs to
        prescription_file = None
        for pname in GROUND_TRUTH:
            stem = Path(pname).stem
            if crop_name.startswith(stem + "_line_"):
                prescription_file = pname
                break

        attempts = 0
        while True:
            attempts += 1
            try:
                if prescription_file:
                    text = annotate_with_context(crop_path, GROUND_TRUTH[prescription_file])
                    mode = "ctx"
                else:
                    text = annotate_fallback(crop_path)
                    mode = "std"

                results[crop_name] = text
                print(f"[{i}/{total}] [{mode}] {crop_name[:50]} -> {text[:50]}")
                time.sleep(4.5)
                break
            except Exception as e:
                if attempts > 3:
                    print(f"[{i}/{total}] GIVE UP {crop_name}: {e}")
                    results[crop_name] = ""
                    break
                print(f"  retry {attempts}: {e}")
                time.sleep(30)

        # Flush every 10 to avoid losing progress
        if i % 10 == 0:
            _write_csv(results, all_crops)

    _write_csv(results, all_crops)
    labeled = sum(1 for v in results.values() if v.strip())
    print(f"\n[label] done. {labeled}/{total} crops have text -> {OUT_CSV}")


def _write_csv(results: dict[str, str], all_crops: list[str]) -> None:
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file_name", "text"])
        for fn in all_crops:
            w.writerow([fn, results.get(fn, "")])


if __name__ == "__main__":
    main()
