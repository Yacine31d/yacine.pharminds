"""
expand_drugs_cache.py — Build drugs_cache.json from curated Algerian sources.

Sources (in priority order):
  1. Curated seed SQL (62 manually-translated Algerian drugs with FR+AR+brand+ATC)
  2. ALGERIAN_DRUG_VOCAB from src/lib/ai-service.ts (~82 brand names)
  3. WHO ATC/DDD index — OFF BY DEFAULT (--with-who-atc to enable)
     The WHO bulk contained 5000+ chemistry compounds (e.g. "(2-Benzhydryloxyethyl)
     Diethyl-Methylammonium Iodide") that polluted real Algerian inventory views.

Each entry validated through Pydantic schema before save.

Output: drugs_cache.json with ~140 high-quality Algerian-pharma entries.

Run:
    python ocr-model/postprocess/expand_drugs_cache.py            # curated only
    python ocr-model/postprocess/expand_drugs_cache.py --with-who-atc  # +bulk
"""
from __future__ import annotations

import csv
import io
import json
import re
import sys
import time
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
SEED_SQL = ROOT / "supabase" / "migrations" / "20260312030000_seed_algerian_data.sql"
OUT_FILE = Path(__file__).parent / "drugs_cache.json"

# WHO ATC/DDD index (community-mirrored CSV — license: open public health data)
WHO_ATC_URL = "https://raw.githubusercontent.com/fabkury/atcd/master/WHO%20ATC-DDD%202021-12-03.csv"

# ── Algerian brand names (mirrors src/lib/ai-service.ts::ALGERIAN_DRUG_VOCAB) ──
ALGERIAN_BRANDS = """
Doliprane Augmentin Clamoxyl Amoxicilline Aspegic Voltarene Spasfon Smecta
Efferalgan Maxilase Rhinathiol Flagyl Triatec Crestor Motilium Bipreterax
Lipanthyl Ibuprofene Zomax Sulpiride Vitamag Detensiel Hytacand Lomac
Paracetamol Ciprolon Fucidine Antag Tamsir Prostamed Novorapid Tresiba
Glucophage Levothyrox Profenid Myorelax Lisinox Ostonel Xydol Baclon
Divido Solupred Amoclan Bilaxten Pyostacine Diflucan Telfast Sapofen
Toplexil Sinecod Nasacort Duphalac Meteoxane Riabal Naxolin Debridat
Supradyn Calcibronat Tahor Atenor Loxen Aspirine Fraxal Prostamixon
Diaphag Novoformine Diaglinid Exval Cordarone Sarcand Atacand Kardegic
Metformin Levothyroxine Bisoprolol Atorvastatin Amlodipine Ramipril
Salbutamol Diclofenac Omeprazole Azithromycin Ciprofloxacin
""".split()

# ── Latin → Arabic transliteration for the bulk of WHO ATC entries ───────────
# Phoneme-based mapping (rough but functional for OCR matching purposes)
# This gives the matcher Arabic-side recall. For canonical drug names we use
# the existing curated seed.
ARABIC_PHONEMES = {
    # Vowels
    'a': 'ا', 'e': 'ي', 'i': 'ي', 'o': 'و', 'u': 'و',
    # Consonants
    'b': 'ب', 'c': 'ك', 'd': 'د', 'f': 'ف', 'g': 'ج',
    'h': 'ه', 'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م',
    'n': 'ن', 'p': 'ب', 'q': 'ق', 'r': 'ر', 's': 'س',
    't': 'ت', 'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي',
    'z': 'ز',
    # Common digraphs
    'ch': 'ش', 'sh': 'ش', 'th': 'ث', 'ph': 'ف',
}


def transliterate_to_arabic(name: str) -> str:
    """Very rough Latin → Arabic transliteration.

    Used only for the WHO ATC bulk; canonical Algerian drugs get proper
    Arabic from the seed migration.
    """
    s = name.lower()
    # Apply digraphs first
    for di, ar in [('ch', 'ش'), ('sh', 'ش'), ('th', 'ث'), ('ph', 'ف')]:
        s = s.replace(di, ar)
    out = []
    for ch in s:
        if ch in ARABIC_PHONEMES:
            out.append(ARABIC_PHONEMES[ch])
        elif ch in ' -':
            out.append(' ')
        elif ch.isalpha():
            # Unknown latin char — skip
            continue
        # digits and other — skip (Arabic transliteration of brand names is
        # primarily for the alphabetic prefix)
    result = ''.join(out)
    return result.strip() or None  # type: ignore


# ── Source loaders ───────────────────────────────────────────────────────────
def load_seed_sql() -> list[dict]:
    """Parse the curated seed migration (gold standard, ~62 entries)."""
    if not SEED_SQL.exists():
        return []
    sql = SEED_SQL.read_text(encoding="utf-8")
    start = sql.find("INSERT INTO public.drugs")
    if start < 0:
        return []
    end = sql.find(";", start)
    block = sql[start:end] if end > start else sql[start:]

    row_re = re.compile(
        r"\(\s*"
        r"'((?:[^']|'')*)',\s*"   # name_fr
        r"'((?:[^']|'')*)',\s*"   # name_ar
        r"'((?:[^']|'')*)',\s*"   # generic_name
        r"(NULL|'((?:[^']|'')*)'),\s*"  # brand_name (nullable)
        r"'((?:[^']|'')*)',\s*"   # dosage
        r"'((?:[^']|'')*)',\s*"   # form
        r"'((?:[^']|'')*)',\s*"   # manufacturer
        r"'((?:[^']|'')*)',\s*"   # atc_code
        r"(true|false),\s*"        # is_generic
        r"(true|false),\s*"        # cnas_reimbursable
        r"([\d.]+)\s*"             # price_dz
        r"\)",
        re.MULTILINE,
    )
    out = []
    for m in row_re.finditer(block):
        (name_fr, name_ar, generic, brand_token, brand, dosage, form, manuf,
         atc, is_g, cnas, price) = m.groups()
        out.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"drug:{name_fr}")),
            "name_fr": name_fr.replace("''", "'"),
            "name_ar": name_ar.replace("''", "'") if name_ar else None,
            "generic_name": generic.replace("''", "'") if generic else None,
            "brand_name": None if brand_token == "NULL" else brand.replace("''", "'"),
            "dosage": dosage,
            "form": form,
            "manufacturer": manuf,
            "atc_code": atc,
            "is_generic": is_g == "true",
            "cnas_reimbursable": cnas == "true",
            "price_dz": float(price),
            "_source": "seed",
        })
    return out


def load_who_atc() -> list[dict]:
    """Pull the WHO ATC/DDD index from a public GitHub mirror."""
    print(f"Fetching WHO ATC index…")
    try:
        r = requests.get(WHO_ATC_URL, timeout=30)
        if not r.ok:
            print(f"  ✗ HTTP {r.status_code}")
            return []
    except Exception as e:
        print(f"  ✗ {type(e).__name__}: {e}")
        return []

    # CSV columns: atc_code,atc_name,ddd,uom,adm_r,note
    rows = []
    reader = csv.DictReader(io.StringIO(r.text))
    for row in reader:
        atc = (row.get("atc_code") or "").strip()
        name = (row.get("atc_name") or "").strip()
        # Only level-5 ATC codes (specific substances), e.g. A01AA01
        if len(atc) < 7 or not name:
            continue
        # Drop combinations / aggregates — these names don't appear in real
        # prescriptions and produce false-positive fuzzy/phonetic matches
        # (e.g. "Quinine, Combinations With Psycholeptics" matching place names)
        nl = name.lower()
        if nl in ("combinations", "other"):
            continue
        if "combinations" in nl or "combination" in nl:
            continue
        if "," in name:    # combo aggregates always have commas
            continue
        if " and " in nl or " with " in nl:
            continue
        # Drop very short or non-alphabetic names (data noise)
        if len(name) < 3 or not any(c.isalpha() for c in name):
            continue
        rows.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"drug:atc:{atc}")),
            "name_fr": name.title(),  # WHO is mostly English; Title-case for display
            # Arabic name left NULL for WHO bulk — rough transliteration produced
            # nonsense glyphs that displayed as garbage in Supabase. The curated
            # 62-entry seed retains its proper hand-translated Arabic.
            "name_ar": None,
            "generic_name": name.lower(),
            "brand_name": None,
            "dosage": None,
            "form": row.get("uom") or None,
            "manufacturer": None,
            "atc_code": atc,
            "is_generic": True,
            "cnas_reimbursable": False,
            "price_dz": 0.0,
            "_source": "who_atc",
        })
    print(f"  ✓ {len(rows)} entries from WHO ATC")
    return rows


def load_brands() -> list[dict]:
    """Add Algerian brand names that may not be in the seed.
       name_ar = NULL — rough transliteration produces garbage; only the
       hand-curated 62-entry seed has real Arabic names."""
    out = []
    for name in ALGERIAN_BRANDS:
        out.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"drug:brand:{name}")),
            "name_fr": name,
            "name_ar": None,
            "generic_name": None,
            "brand_name": name,
            "dosage": None,
            "form": None,
            "manufacturer": None,
            "atc_code": None,
            "is_generic": False,
            "cnas_reimbursable": False,
            "price_dz": 0.0,
            "_source": "vocab",
        })
    return out


# ── Pydantic validation ──────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from schema import OTHER_SCRIPT_RE, ARTIFACT_RE  # noqa: E402


def validate_entry(d: dict) -> tuple[bool, str]:
    """Returns (is_valid, reason_if_not)."""
    name_fr = (d.get("name_fr") or "").strip()
    if not name_fr or len(name_fr) < 2:
        return False, "empty name_fr"
    if OTHER_SCRIPT_RE.search(name_fr):
        return False, "foreign script in name_fr"
    if ARTIFACT_RE.search(name_fr):
        return False, "artifact in name_fr"
    name_ar = d.get("name_ar")
    if name_ar and ARTIFACT_RE.search(name_ar):
        return False, "artifact in name_ar"
    return True, ""


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--with-who-atc", action="store_true",
                        help="Include WHO ATC bulk (~5000 generic chemistry names). "
                             "OFF by default since WHO entries pollute Algerian inventory views.")
    args = parser.parse_args()

    print("=== Drug cache build ===\n")

    seed = load_seed_sql()
    print(f"Curated Algerian seed: {len(seed):>4} entries")

    brands = load_brands()
    print(f"Vocab brands:          {len(brands):>4} entries")

    who: list[dict] = []
    if args.with_who_atc:
        who = load_who_atc()
        print(f"WHO ATC (--with-who-atc): {len(who):>4} entries")
    else:
        print(f"WHO ATC:               SKIPPED (use --with-who-atc to enable)")
    print()

    # Merge with priority: seed > brands > who_atc (later sources can't overwrite)
    by_key: dict[str, dict] = {}
    sources_count = {"seed": 0, "vocab": 0, "who_atc": 0, "duplicate": 0}

    for source_list in [seed, brands, who]:
        for entry in source_list:
            key = entry["name_fr"].lower().strip()
            existing = by_key.get(key)
            if existing is None:
                by_key[key] = entry
                sources_count[entry["_source"]] += 1
            else:
                sources_count["duplicate"] += 1

    # Validate everything
    valid_entries, rejected = [], []
    for entry in by_key.values():
        is_valid, reason = validate_entry(entry)
        if is_valid:
            entry.pop("_source", None)
            valid_entries.append(entry)
        else:
            rejected.append((entry["name_fr"], reason))

    print(f"After dedupe:  {len(by_key):>5} unique entries")
    print(f"Sources merged: seed={sources_count['seed']} brands={sources_count['vocab']} who={sources_count['who_atc']} (dups={sources_count['duplicate']})")
    print(f"Validated:    {len(valid_entries):>5}")
    print(f"Rejected:     {len(rejected):>5}")
    if rejected:
        for name, reason in rejected[:5]:
            print(f"  - {name!r}: {reason}")

    # Sort: seed (canonical Algerian) first, then alphabetical
    payload = {
        "version": time.strftime("%Y-%m-%d"),
        "count": len(valid_entries),
        "sources": {
            "seed (curated Algerian)": sources_count["seed"],
            "vocab (frontend brands)": sources_count["vocab"],
            "who_atc (international)": sources_count["who_atc"],
        },
        "drugs": valid_entries,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    size_kb = OUT_FILE.stat().st_size // 1024
    print(f"\n✓ Wrote {OUT_FILE.relative_to(ROOT)}")
    print(f"  {len(valid_entries)} drugs, {size_kb} KB")


if __name__ == "__main__":
    main()
