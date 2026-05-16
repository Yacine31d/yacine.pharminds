"""
presplit_labels.py

For the 29 prescriptions with known ground truth, intelligently splits
the full_raw_text into per-line segments and pre-populates
real_data_lines/real_annotations.csv.

The label_review_server.py reads this as seed — user just presses Enter
to confirm correct labels instead of typing from scratch.

For crops from unknown prescriptions, leaves the text empty
(those go to Gemini overnight or manual review).

Run:
    python ocr-model/presplit_labels.py
"""

import csv
import re
from pathlib import Path

ROOT = Path(__file__).parent
LINES_DIR = ROOT / "real_data_lines"
OUT_CSV = LINES_DIR / "real_annotations.csv"

# ── Ground truth ──────────────────────────────────────────────────────────────
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


def split_prescription_text(full_text: str) -> list[str]:
    """
    Split a prescription's full text into meaningful line-level segments.
    Splits on numbered medication markers like '1/', '2/', '1-', '2-' etc.
    Preamble (date, patient name) becomes the first segment(s).
    """
    # Split on medication markers: '1/', '2/', '1-', '2-' at word boundaries
    parts = re.split(r'(?<!\w)(\d+[/\-])(?=\s)', full_text)

    segments: list[str] = []
    i = 0

    # Collect preamble (everything before first medication number)
    preamble = parts[0].strip()
    if preamble:
        # Split preamble into max 2 line segments (date line, name line)
        words = preamble.split()
        if len(words) <= 4:
            segments.append(preamble)
        else:
            # First natural break: after date-like pattern or first 3 words
            date_match = re.search(r'\d{2}[/.\s]\d{2}[/.\s]\d{4}|\d{1,2}\s+(?:AVR|MARS|JANV|FEV|MAI|JUIN|JUIL|AOUT|SEPT|OCT|NOV|DEC)\s+\d{4}', preamble)
            if date_match:
                date_end = date_match.end()
                segments.append(preamble[:date_end].strip())
                rest = preamble[date_end:].strip()
                if rest:
                    segments.append(rest)
            else:
                mid = len(words) // 2
                segments.append(" ".join(words[:mid]))
                segments.append(" ".join(words[mid:]))

    # Process medication pairs (number_marker + content)
    i = 1
    while i < len(parts) - 1:
        marker = parts[i]       # e.g. "1/"
        content = parts[i + 1].strip() if i + 1 < len(parts) else ""
        segments.append(f"{marker} {content}".strip())
        i += 2

    return [s for s in segments if s.strip()]


def main() -> None:
    # Load all crop filenames sorted
    all_crops = sorted(
        f.name for f in LINES_DIR.iterdir()
        if f.suffix.lower() in {".jpg", ".jpeg", ".png"} and "_line_" in f.name
    )
    print(f"[presplit] {len(all_crops)} crops")

    seed: dict[str, str] = {}

    for pfile, full_text in GROUND_TRUTH.items():
        stem = Path(pfile).stem
        crops = sorted(c for c in all_crops if c.startswith(stem + "_line_"))
        if not crops:
            print(f"  WARNING: no crops found for {pfile}")
            continue

        segments = split_prescription_text(full_text)
        print(f"  {pfile[:50]} -> {len(crops)} crops, {len(segments)} text segments")

        # Distribute segments across crops
        # Strategy: first min(n_segs, n_crops) crops get one segment each,
        # remaining crops get empty (likely blank/header/stamp crops)
        for i, crop in enumerate(crops):
            if i < len(segments):
                seed[crop] = segments[i]
            else:
                seed[crop] = ""  # blank crop (stamp, signature, footer)

    # Write seed CSV
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file_name", "text"])
        for fn in all_crops:
            w.writerow([fn, seed.get(fn, "")])

    labeled = sum(1 for v in seed.values() if v.strip())
    print(f"\n[presplit] wrote {OUT_CSV}")
    print(f"  {labeled} / {len(all_crops)} crops pre-labeled from ground truth")
    print(f"  {len(all_crops) - labeled} crops need manual review (unknown prescriptions)")
    print(f"\nNext: python ocr-model/label_review_server.py -> http://localhost:8765")


if __name__ == "__main__":
    main()
