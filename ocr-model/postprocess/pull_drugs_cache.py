"""
pull_drugs_cache.py — Build local drugs cache from Supabase OR seed SQL.

Used by `matcher.py` at API startup so we don't hit Supabase on every request.

Strategy (in order):
    1. Query Supabase REST `/rest/v1/drugs` (works once migration is applied)
    2. Fallback: parse seed SQL `supabase/migrations/*_seed_algerian_data.sql`

Usage:
    python ocr-model/postprocess/pull_drugs_cache.py

Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env (project root).
Writes ocr-model/postprocess/drugs_cache.json.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".env"
SEED_SQL = ROOT / "supabase" / "migrations" / "20260312030000_seed_algerian_data.sql"
OUT_FILE = Path(__file__).parent / "drugs_cache.json"


def load_env() -> dict:
    """Tiny .env parser — avoids python-dotenv dep."""
    if not ENV_FILE.exists():
        print(f"⚠ no .env at {ENV_FILE}", file=sys.stderr)
        return {}
    out = {}
    for ln in ENV_FILE.read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#") or "=" not in ln:
            continue
        k, _, v = ln.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def from_supabase() -> tuple[list[dict], str]:
    """Try to fetch drugs from the live Supabase REST API. Returns ([], '') on failure."""
    env = load_env()
    url = env.get("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = env.get("VITE_SUPABASE_ANON_KEY") or env.get("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not (url and key):
        return [], ""

    cols = "id,name_fr,name_ar,generic_name,brand_name,manufacturer,dosage,form,atc_code,is_generic,cnas_reimbursable,price_dz"
    endpoint = f"{url.rstrip('/')}/rest/v1/drugs?select={cols}"
    try:
        r = requests.get(
            endpoint,
            headers={"apikey": key, "Authorization": f"Bearer {key}", "Range": "0-9999"},
            timeout=20,
        )
        if not r.ok:
            return [], endpoint
        rows = r.json()
        return rows if isinstance(rows, list) else [], endpoint
    except Exception:
        return [], endpoint


# ── SQL-seed fallback parser ─────────────────────────────────────────────────
# Matches one VALUES tuple of the drugs INSERT, e.g.:
#   ('Augmentin 1g', 'أوغمنتين 1غ', 'Amoxicillin/Clavulanic acid', 'Augmentin',
#    '1g/125mg', 'Comprimé', 'GSK', 'J01CR02', false, true, 850.00),
ROW_RE = re.compile(
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


def _unescape(s: str | None) -> str | None:
    if s is None:
        return None
    return s.replace("''", "'")


def from_seed_sql() -> tuple[list[dict], str]:
    """Parse the seed migration SQL into row dicts."""
    if not SEED_SQL.exists():
        return [], ""
    sql = SEED_SQL.read_text(encoding="utf-8")

    # Limit to the drugs INSERT block (avoid matching profiles/inventory etc.)
    start = sql.find("INSERT INTO public.drugs")
    if start < 0:
        return [], str(SEED_SQL)
    end = sql.find(";", start)
    block = sql[start:end] if end > start else sql[start:]

    rows = []
    for m in ROW_RE.finditer(block):
        (name_fr, name_ar, generic, brand_token, brand, dosage, form, manufacturer,
         atc, is_generic, cnas_reim, price) = m.groups()
        rows.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"drug:{name_fr}")),
            "name_fr": _unescape(name_fr),
            "name_ar": _unescape(name_ar),
            "generic_name": _unescape(generic),
            "brand_name": None if brand_token == "NULL" else _unescape(brand),
            "dosage": _unescape(dosage),
            "form": _unescape(form),
            "manufacturer": _unescape(manufacturer),
            "atc_code": _unescape(atc),
            "is_generic": is_generic == "true",
            "cnas_reimbursable": cnas_reim == "true",
            "price_dz": float(price),
        })
    return rows, str(SEED_SQL)


def main():
    print("Pulling drugs cache…")
    t0 = time.time()

    # 1. Try Supabase
    rows, source = from_supabase()
    if rows:
        print(f"✓ source: Supabase REST ({len(rows)} rows)")
    else:
        # 2. Fallback: seed SQL
        rows, source = from_seed_sql()
        if rows:
            print(f"✓ source: seed SQL fallback ({len(rows)} rows)")
            print(f"  ⚠ Apply migration {SEED_SQL.name} to Supabase to enable live updates")
        else:
            print("✗ no drugs available from Supabase or seed SQL", file=sys.stderr)
            sys.exit(1)

    payload = {
        "version": time.strftime("%Y-%m-%d"),
        "count": len(rows),
        "source": source,
        "drugs": rows,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ wrote {OUT_FILE.relative_to(ROOT)} — {len(rows)} drugs in {(time.time()-t0):.1f}s")

    if rows:
        sample = rows[0]
        print(f"  sample: {sample['name_fr']} ({sample['name_ar']}) atc={sample['atc_code']}")


if __name__ == "__main__":
    main()
