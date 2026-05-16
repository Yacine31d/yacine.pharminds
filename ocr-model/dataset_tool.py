"""
dataset_tool.py — PharMinds Dataset Management Tool
=====================================================
Single-file Flask web app (port 5555) replacing all 13+ scattered
data-processing scripts.

Pages:
  /        Dashboard    — stats, problem counts, quick-fix
  /clean   Auto-Clean   — deduplicate, strip Arabic, artifacts, multiline
  /review  Review Mode  — keyboard-driven label editor
  /add     Add Presc.   — upload images, segment lines, annotate
  /regen   Regen Synth. — generate new training images (Strategy D)
  /build   Build/Export — assemble final labels.csv, train/val split

Run:
    python ocr-model/dataset_tool.py
    Open: http://localhost:5555
"""
from __future__ import annotations

import base64
import csv
import hashlib
import json
import logging
import os
import queue
import random
import re
import shutil
import threading
import time
import uuid
from collections import Counter
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from flask import Flask, Response, jsonify, request, send_file
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger("dataset-tool")

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent
DATASET_DIR  = ROOT / "dataset"
IMAGES_DIR   = DATASET_DIR / "images"
LABELS_CSV   = DATASET_DIR / "labels.csv"
LINES_DIR    = ROOT / "real_data_lines"
AUTO_CSV     = LINES_DIR / "real_annotations.csv"
REVIEWED_CSV = LINES_DIR / "real_labels_reviewed.csv"
TRASH_DIR    = DATASET_DIR / "trash"
BACKUP_DIR   = DATASET_DIR / "backups"
ARABIC_CSV   = DATASET_DIR / "arabic_labels.csv"
REVIEW_STATE = DATASET_DIR / "review_state.json"
ACTIVITY_LOG = DATASET_DIR / "activity.log"
FONTS_DIR    = ROOT / "fonts"

for _d in [DATASET_DIR, IMAGES_DIR, BACKUP_DIR, TRASH_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ── Problem-detection patterns ────────────────────────────────────────────────
ARABIC_RE = re.compile(
    r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]"
)
LATIN_RE = re.compile(r"[A-Za-zÀ-ÿ]")
MULTILINE_RE = re.compile(r"\n")
ARTIFACT_RE = re.compile(
    r"\*\*|###|---|"
    r"Doctor's Stamp:|Red Stamp:|Institutional Stamp:|"
    r"Printed Institutional Text:|Handwritten Entry:|"
    r"Plaintext it is!|\[Stylized Signature",
    re.IGNORECASE,
)


def is_fully_arabic(text: str) -> bool:
    """True if text has Arabic chars but NO Latin letters."""
    return bool(ARABIC_RE.search(text)) and not bool(LATIN_RE.search(text))


def extract_french(text: str) -> str:
    """From mixed Arabic+French text, keep only non-Arabic portions."""
    # Remove Arabic characters and clean up whitespace
    cleaned = ARABIC_RE.sub(" ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

# ── Drug vocabulary (from generate_dataset.py) ────────────────────────────────
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
    "Zomax", "Mercilon", "Proctolog gel", "Sulpiride", "Vitamag",
    "Detensiel", "Bebaline",
]
POSOLOGY = [
    "1 comp matin et soir", "1 gelule 3 fois par jour", "Pendant 7 jours",
    "En cas de douleur", "1 sachet par jour", "2 comprimes si besoin",
    "Le soir au coucher", "1 a 2 comprimes par jour", "3x/jour apres repas",
    "x 2", "x 3", "1 cp 1/4 h Avant les Repas 2x/j",
    "1 sachet Apres les repas 3/j", "1/j 03 mois", "02 cp 02 f / j",
    "1 c / 8h 3j", "1 cp x 3 / j", "1 cp 3 x / j", "1 gel le matin",
]
PREFIXES    = ["Dr.", "Docteur", "Pr.", "Professeur", "Dr"]
FIRST_NAMES = ["Ahmed", "Mohamed", "Amine", "Karim", "Yassine",
               "Nadia", "Sarah", "Meriem", "Samira", "Fatima"]
LAST_NAMES  = ["Benali", "Bouzid", "Saadi", "Mansouri", "Haddad",
               "Yahiaoui", "Brahimi", "Toumi", "Boudiaf"]
SPECIALTIES = [
    "Medecin Generaliste", "Cardiologue", "Pediatre", "Dermatologue",
    "Chirurgien Dentiste", "Pediatrie", "Cardiologie",
    "Hemodialyse / Maladies des Reins", "Chirurgie Dentaire",
    "Medecine Generale", "Praticien Principal",
]

# ── SSE progress queue (one regen at a time) ──────────────────────────────────
_regen_queue: "queue.Queue[dict]" = queue.Queue()
_regen_running = threading.Event()

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024  # 64 MB


# =============================================================================
#  Utilities
# =============================================================================

def log_activity(msg: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(ACTIVITY_LOG, "a", encoding="utf-8") as fh:
        fh.write(f"[{ts}] {msg}\n")


def backup_labels() -> "Path | None":
    """Legacy single-file backup of labels.csv (kept for backward compat)."""
    if not LABELS_CSV.exists():
        return None
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts  = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = BACKUP_DIR / f"labels_{ts}.csv"
    shutil.copy2(LABELS_CSV, dst)
    log.info("Backed up labels.csv -> %s", dst.name)
    return dst


# ── Auto-snapshot system (added 2026-05-10) ─────────────────────────────────
# Every save to labels.csv / review_state.json / arabic_labels.csv triggers an
# auto-snapshot. Throttled: at most one snapshot per AUTO_SNAP_INTERVAL_SEC.
# Snapshots are organized by day: backups/2026-05-10/HH-MM-SS_<file>.csv
# Never auto-deleted — preserves a full audit trail of Yacine's daily work.

AUTO_SNAP_INTERVAL_SEC = 60          # one snapshot per minute max
_last_snapshot_at: float = 0.0       # monotonic-ish in-process throttle

_SNAP_TARGETS = [
    ("labels.csv",           lambda: LABELS_CSV),
    ("review_state.json",    lambda: REVIEW_STATE),
    ("arabic_labels.csv",    lambda: ARABIC_CSV),
    ("real_labels_reviewed.csv", lambda: REVIEWED_CSV),
]


def auto_snapshot(reason: str = "save", *, force: bool = False) -> "Path | None":
    """Snapshot all dataset state files into backups/<YYYY-MM-DD>/.
    Throttled to one call per AUTO_SNAP_INTERVAL_SEC unless force=True.
    Returns the day-bucket Path on success, None when throttled.
    """
    global _last_snapshot_at
    now = time.time()
    if not force and (now - _last_snapshot_at) < AUTO_SNAP_INTERVAL_SEC:
        return None

    day_bucket = BACKUP_DIR / datetime.now().strftime("%Y-%m-%d")
    day_bucket.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%H-%M-%S")

    snapped = 0
    for label, get_path in _SNAP_TARGETS:
        src = get_path()
        if not src.exists():
            continue
        suffix = src.suffix or ".bin"
        stem   = src.stem
        dst = day_bucket / f"{ts}_{stem}{suffix}"
        try:
            shutil.copy2(src, dst)
            snapped += 1
        except Exception as e:
            log.warning(f"snapshot failed for {src}: {e}")

    if snapped:
        _last_snapshot_at = now
        log.info(f"Auto-snapshot ({reason}): {snapped} file(s) → {day_bucket.name}/{ts}_*")
    return day_bucket if snapped else None


def load_labels() -> "list[dict]":
    if not LABELS_CSV.exists():
        return []
    with open(LABELS_CSV, encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def _atomic_write_text(path: Path, content: str) -> None:
    """Atomic write + fsync. Survives power loss / kill -9 mid-write.

    Steps:
      1. Write to temp file in same dir (so os.rename is atomic)
      2. flush + fsync — forces bytes to physical disk
      3. os.replace — atomic on Windows + POSIX; either old or new wins
      4. fsync the directory entry (POSIX only)
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8", newline="") as fh:
        fh.write(content)
        fh.flush()
        try:
            os.fsync(fh.fileno())
        except OSError:
            pass  # not all filesystems support fsync (e.g. some WSL setups)
    os.replace(tmp, path)


def save_labels(rows: "list[dict]") -> None:
    """Save labels.csv atomically + auto-snapshot (throttled).

    Uses atomic write so even a process kill mid-save can't corrupt the CSV.
    fsync ensures bytes hit disk before returning (survives power loss).
    """
    import io
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=["file_name", "text"], extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    _atomic_write_text(LABELS_CSV, buf.getvalue())
    auto_snapshot("save_labels")


def trash_image(filename: str) -> None:
    TRASH_DIR.mkdir(parents=True, exist_ok=True)
    for src in [IMAGES_DIR / filename, LINES_DIR / filename]:
        if src.exists():
            try:
                shutil.move(str(src), str(TRASH_DIR / filename))
            except Exception:
                pass
            break


def load_review_state() -> dict:
    if REVIEW_STATE.exists():
        try:
            return json.loads(REVIEW_STATE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_review_state(state: dict) -> None:
    """Save review_state.json atomically + auto-snapshot (throttled).
    Atomic write + fsync — Yacine's work is durable across crashes/power loss."""
    _atomic_write_text(
        REVIEW_STATE,
        json.dumps(state, ensure_ascii=False, indent=2),
    )
    auto_snapshot("save_review_state")


def get_stats() -> dict:
    rows  = load_labels()
    total = len(rows)

    fn_counts: Counter = Counter(r.get("file_name", "") for r in rows)

    dup_count      = sum(1 for r in rows if fn_counts[r.get("file_name", "")] > 1)
    multiline_count = sum(1 for r in rows if MULTILINE_RE.search(r.get("text", "")))
    arabic_count    = sum(1 for r in rows if ARABIC_RE.search(r.get("text", "")))
    artifact_count  = sum(1 for r in rows if ARTIFACT_RE.search(r.get("text", "")))
    real_count      = sum(1 for r in rows
                          if not r.get("file_name","").startswith(
                              ("printed_", "handwritten_", "aug_")))
    synth_count     = sum(1 for r in rows
                          if r.get("file_name","").startswith(
                              ("printed_", "handwritten_")))
    aug_count       = sum(1 for r in rows
                          if r.get("file_name","").startswith("aug_"))

    recent: list[str] = []
    if ACTIVITY_LOG.exists():
        lines  = ACTIVITY_LOG.read_text(encoding="utf-8").splitlines()
        recent = lines[-10:]

    return {
        "total":      total,
        "unique_fns": len(fn_counts),
        "duplicates": dup_count,
        "multiline":  multiline_count,
        "arabic":     arabic_count,
        "artifacts":  artifact_count,
        "real":       real_count,
        "synthetic":  synth_count,
        "augmented":  aug_count,
        "recent":     recent,
    }


# =============================================================================
#  Image generation helpers  (verbatim from generate_dataset.py)
# =============================================================================

def add_noise(image: Image.Image) -> Image.Image:
    arr   = np.array(image.convert("L"))
    noise = np.random.normal(0, random.uniform(5, 15), arr.shape)
    arr   = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr).convert("RGB")


def generate_text(is_doctor: bool = False) -> str:
    if is_doctor:
        prefix = random.choice(PREFIXES)
        fname  = random.choice(FIRST_NAMES)
        lname  = random.choice(LAST_NAMES)
        if random.random() > 0.5:
            return f"{prefix} {fname} {lname}"
        return f"{prefix} {fname} {lname} - {random.choice(SPECIALTIES)}"
    if random.random() > 0.3:
        return f"{random.choice(DRUGS)} : {random.choice(POSOLOGY)}"
    return random.choice(DRUGS)


def get_fonts(font_dir: Path, sys_fonts: bool = False) -> "list[str]":
    fonts: list[str] = []
    if sys_fonts:
        for p in [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/times.ttf",
            "C:/Windows/Fonts/calibri.ttf",
        ]:
            if os.path.exists(p):
                fonts.append(p)
    else:
        if font_dir.exists():
            for f in font_dir.iterdir():
                if f.suffix.lower() == ".ttf":
                    fonts.append(str(f))
    return fonts


def generate_line_image(text: str, font_path: str, size: int = 32) -> Image.Image:
    if not text:
        text = "..."
    try:
        font = ImageFont.truetype(font_path, size)
    except Exception:
        font = ImageFont.load_default()
    bbox      = font.getbbox(text)
    text_w    = max(bbox[2] - bbox[0], 1)
    text_h    = max(bbox[3] - bbox[1], 1)
    pad_x     = random.randint(10, 30)
    pad_y     = random.randint(10, 20)
    bg_color  = (
        random.randint(240, 255),
        random.randint(240, 255),
        random.randint(240, 255),
    )
    img  = Image.new("RGB", (text_w + pad_x * 2, text_h + pad_y * 2), bg_color)
    draw = ImageDraw.Draw(img)
    draw.text(
        (pad_x, pad_y), text, font=font,
        fill=(random.randint(0, 50), random.randint(0, 50), random.randint(0, 80)),
    )
    if random.random() > 0.5:
        img = add_noise(img)
    if random.random() > 0.5:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.2)))
    img = img.rotate(random.uniform(-2, 2), expand=True, fillcolor=bg_color)
    return img


# ── Strategy D augmenters ─────────────────────────────────────────────────────

def _aug_rotate(img: Image.Image) -> Image.Image:
    angle = random.uniform(-3, 3)
    bg    = (random.randint(240, 255), random.randint(240, 255), random.randint(240, 255))
    return img.rotate(angle, expand=True, fillcolor=bg)


def _aug_brightness(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.8, 1.2))
    return ImageEnhance.Contrast(img).enhance(random.uniform(0.8, 1.2))


def _aug_noise(img: Image.Image) -> Image.Image:
    arr    = np.array(img.convert("RGB")).astype(float)
    arr   += np.random.normal(0, random.uniform(8, 20), arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def _aug_perspective(img: Image.Image) -> Image.Image:
    w, h  = img.size
    shear = random.uniform(-0.05, 0.05)
    data  = (1, shear, -shear * h / 2, shear * 0.3, 1, -shear * w * 0.1)
    return img.transform(
        (w, h), Image.AFFINE, data, Image.BICUBIC,
        fillcolor=(248, 248, 248),
    )


def _aug_combined(img: Image.Image) -> Image.Image:
    img = _aug_noise(img)
    img = _aug_rotate(img)
    return img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.3, 0.8)))


AUGMENTERS = [_aug_rotate, _aug_brightness, _aug_noise, _aug_perspective, _aug_combined]


# =============================================================================
#  Line segmentation  (verbatim from spaces/app.py)
# =============================================================================

def segment_lines(
    image: Image.Image,
    min_line_height: int = 10,
    pad: int = 6,
    smooth_window: int = 5,
    density_threshold: float = 0.06,
) -> "list[Image.Image]":
    try:
        import cv2
    except ImportError:
        log.warning("cv2 not installed — returning full image as single line")
        return [image]

    gray  = np.array(image.convert("L"))
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    proj  = np.sum(bw, axis=1).astype(float)
    if proj.max() == 0:
        return [image]
    k      = np.ones(smooth_window) / smooth_window
    smooth = np.convolve(proj, k, mode="same")
    thresh = smooth.max() * density_threshold
    H, W   = gray.shape
    lines: list[Image.Image] = []
    in_line = False
    y_start = 0
    for y in range(H):
        if smooth[y] > thresh and not in_line:
            in_line = True
            y_start = y
        elif smooth[y] <= thresh and in_line:
            in_line = False
            h = y - y_start
            if h >= min_line_height:
                lines.append(image.crop((
                    0, max(0, y_start - pad),
                    W, min(H, y + pad),
                )))
    if in_line and H - y_start >= min_line_height:
        lines.append(image.crop((0, max(0, y_start - pad), W, H)))
    return lines or [image]


def pil_to_b64(img: Image.Image) -> str:
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


# =============================================================================
#  Hold-out + writer-stratified split helpers (added 2026-05-09)
# =============================================================================
HOLDOUT_FILE = DATASET_DIR / "holdout_set.txt"


def load_holdout_set() -> set[str]:
    """Filenames frozen as the wild test set — never in train or val."""
    if not HOLDOUT_FILE.exists():
        return set()
    out: set[str] = set()
    for line in HOLDOUT_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            out.add(line)
    return out


def writer_id(file_name: str) -> str:
    """Group filenames by source prescription (writer/doctor) so that a single
    document never has its lines split across train/val.

    Examples:
        'WhatsApp Image 2026-04-06 at 11.36.48 AM (1)_line_10.jpg' -> base before '_line_'
        'real_20260506_094922_980ffbe9_0.jpg' -> base before last '_<idx>'
    """
    m = re.match(r"^(.*?)(?:_line_\d+|_\d+)?\.[A-Za-z]+$", file_name)
    return m.group(1) if m else file_name


def writer_stratified_split(rows: list[dict], train_frac: float, seed: int = 42) -> tuple[list[dict], list[dict]]:
    """Split rows so that all lines from a single writer go to the same partition.
    Prevents leakage of writing style between train and val."""
    from collections import defaultdict
    grouped: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        grouped[writer_id(r["file_name"])].append(r)
    writers = sorted(grouped.keys())
    rng = random.Random(seed)
    rng.shuffle(writers)
    n_train_writers = int(len(writers) * train_frac)
    train_w = set(writers[:n_train_writers])
    train, val = [], []
    for w, items in grouped.items():
        (train if w in train_w else val).extend(items)
    rng.shuffle(train)
    rng.shuffle(val)
    return train, val


# =============================================================================
#  Dataset build helpers  (from rebuild_dataset.py)
# =============================================================================

def diverse_sample(rows: "list[dict]", n: int) -> "list[dict]":
    rows = list(rows)  # don't mutate caller's list
    if len(rows) <= n:
        return rows
    random.shuffle(rows)
    seen_words: Counter = Counter()
    selected: list[dict] = []
    for row in rows:
        words = set((row.get("text") or "").lower().split())
        score = sum(1 for w in words if seen_words[w] < 3)
        if score > 0 or len(selected) < n // 2:
            selected.append(row)
            seen_words.update(words)
        if len(selected) >= n:
            break
    return selected


# =============================================================================
#  HTML helpers
# =============================================================================

_CSS = """
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.layout{display:flex;min-height:100vh}
.sidebar{width:220px;background:#1e293b;padding:20px 0;flex-shrink:0;border-right:1px solid #334155;
  position:fixed;top:0;bottom:0;overflow-y:auto}
.sidebar .logo{padding:0 20px 20px;border-bottom:1px solid #334155;margin-bottom:12px}
.sidebar .logo h2{font-size:16px;color:#38bdf8;font-weight:700}
.sidebar .logo p{font-size:11px;color:#64748b;margin-top:2px}
.nav-link{display:block;padding:10px 20px;color:#94a3b8;text-decoration:none;font-size:13px;
  transition:all .15s;border-left:3px solid transparent}
.nav-link:hover{background:#0f172a;color:#e2e8f0}
.nav-link.active{background:#0f172a;color:#38bdf8;border-left-color:#38bdf8}
.main{margin-left:220px;padding:28px;width:calc(100% - 220px)}
h1{font-size:22px;font-weight:700;color:#f1f5f9;margin-bottom:6px}
.subtitle{color:#64748b;font-size:13px;margin-bottom:24px}
.card{background:#1e293b;border-radius:10px;padding:20px;border:1px solid #334155;margin-bottom:16px}
.card h3{font-size:12px;color:#94a3b8;font-weight:600;margin-bottom:14px;
  text-transform:uppercase;letter-spacing:.06em}
.sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.stat{background:#1e293b;border-radius:8px;padding:16px;border:1px solid #334155}
.stat .lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.stat .val{font-size:28px;font-weight:700;color:#f1f5f9;margin:4px 0}
.stat .sub{font-size:11px;color:#64748b}
.stat.danger .val{color:#f87171}
.stat.warning .val{color:#fbbf24}
.stat.success .val{color:#34d399}
.stat.info .val{color:#38bdf8}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.badge.red{background:#7f1d1d;color:#fca5a5}
.badge.yellow{background:#78350f;color:#fcd34d}
.badge.green{background:#14532d;color:#86efac}
.badge.blue{background:#1e3a5f;color:#7dd3fc}
.badge.gray{background:#374151;color:#9ca3af}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;
  border:0;cursor:pointer;font-size:13px;font-weight:500;text-decoration:none;
  transition:filter .15s;white-space:nowrap}
.btn-primary{background:#2563eb;color:white}
.btn-primary:hover{filter:brightness(1.15)}
.btn-success{background:#16a34a;color:white}
.btn-success:hover{filter:brightness(1.15)}
.btn-danger{background:#dc2626;color:white}
.btn-danger:hover{filter:brightness(1.15)}
.btn-secondary{background:#334155;color:#e2e8f0}
.btn-secondary:hover{filter:brightness(1.2)}
.btn-warning{background:#d97706;color:white}
.btn-warning:hover{filter:brightness(1.15)}
.btn:disabled{opacity:.5;cursor:not-allowed}
input,select,textarea{background:#0f172a;color:#e2e8f0;border:1px solid #334155;
  border-radius:6px;padding:8px 12px;font-size:13px;width:100%}
input:focus,select:focus,textarea:focus{outline:none;border-color:#3b82f6}
label{font-size:12px;color:#94a3b8;display:block;margin-bottom:4px}
.fg{margin-bottom:14px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.pbar{background:#0f172a;height:8px;border-radius:4px;overflow:hidden}
.pbar>div{height:100%;transition:width .3s;border-radius:4px}
.pbar-blue>div{background:#2563eb}
.pbar-green>div{background:#16a34a}
kbd{background:#1e293b;border:1px solid #475569;padding:2px 6px;border-radius:3px;
  font-size:11px;font-family:monospace;color:#cbd5e1}
.alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:12px}
.alert-ok{background:#14532d;border:1px solid #16a34a;color:#86efac}
.alert-err{background:#7f1d1d;border:1px solid #dc2626;color:#fca5a5}
.alert-info{background:#1e3a5f;border:1px solid #2563eb;color:#7dd3fc}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 12px;color:#64748b;border-bottom:1px solid #334155;
  font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td{padding:8px 12px;border-bottom:1px solid #1e293b;color:#cbd5e1}
tr:hover td{background:#1e293b}
.mono{font-family:'Consolas','Monaco',monospace;font-size:12px}
.alog{background:#0f172a;border-radius:6px;padding:12px;font-family:monospace;
  font-size:11px;color:#64748b;max-height:200px;overflow-y:auto}
.alog p{margin-bottom:4px}
.step-row{display:flex;align-items:center;gap:12px;padding:12px;
  background:#0f172a;border-radius:6px;margin-bottom:8px}
.step-row input[type=checkbox]{width:16px;height:16px;accent-color:#2563eb;flex-shrink:0}
.step-info{flex:1}
.step-info strong{font-size:13px;color:#e2e8f0}
.step-info p{font-size:11px;color:#64748b;margin-top:2px}
.step-cnt{font-size:20px;font-weight:700;color:#f87171;min-width:50px;text-align:right}
.crop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.crop-item{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px}
.crop-item img{width:100%;border-radius:4px;margin-bottom:8px;background:white}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
</style>
"""


def _nav(active: str) -> str:
    pages = [
        ("📊", "Dashboard",        "/",         "dashboard"),
        ("🧹", "Auto-Clean",       "/clean",    "clean"),
        ("✏️",  "Review Mode",      "/review",   "review"),
        ("➕", "Add Prescriptions","/add",      "add"),
        ("🔁", "Regen Synthetic",  "/regen",    "regen"),
        ("📦", "Build & Export",   "/build",    "build"),
        ("🗂️",  "Backups",         "/backups",  "backups"),
    ]
    items = ""
    for icon, label, href, key in pages:
        cls = "nav-link active" if key == active else "nav-link"
        items += f'<a href="{href}" class="{cls}">{icon} {label}</a>\n'
    return (
        '<div class="sidebar">'
        '<div class="logo"><h2>🏥 PharMinds</h2><p>Dataset Tool v1.0</p></div>'
        + items
        + "</div>"
    )


def _page(title: str, active: str, body: str, scripts: str = "") -> str:
    nav_html = _nav(active)
    return (
        "<!doctype html><html lang='fr'>"
        "<head><meta charset='utf-8'>"
        f"<title>{title} — Dataset Tool</title>"
        + _CSS
        + "</head><body>"
        '<div class="layout">'
        + nav_html
        + '<div class="main">'
        + body
        + "</div></div>"
        + scripts
        + "</body></html>"
    )


# =============================================================================
#  Page 1 — Dashboard
# =============================================================================

@app.route("/")
def page_dashboard():
    body = """
<div class="row" style="align-items:center;margin-bottom:6px">
  <h1 style="margin:0">📊 Dashboard</h1>
  <span id="purityBadge" style="margin-left:10px"></span>
</div>
<p class="subtitle">Vue d'ensemble du dataset TrOCR — actualisé toutes les 30 s</p>

<div class="sgrid" id="sg">
  <div class="stat"><div class="lbl">Total lignes</div><div class="val" id="sTotal">…</div></div>
  <div class="stat danger"><div class="lbl">Doublons</div><div class="val" id="sDup">…</div></div>
  <div class="stat warning"><div class="lbl">Multi-lignes</div><div class="val" id="sMul">…</div></div>
  <div class="stat warning"><div class="lbl">Artefacts IA</div><div class="val" id="sArt">…</div></div>
  <div class="stat danger"><div class="lbl">Arabe</div><div class="val" id="sArab">…</div></div>
  <div class="stat success"><div class="lbl">Reel</div><div class="val" id="sReal">…</div></div>
  <div class="stat info"><div class="lbl">Synthetique</div><div class="val" id="sSynth">…</div></div>
  <div class="stat info"><div class="lbl">Augmente</div><div class="val" id="sAug">…</div></div>
</div>

<div class="card">
  <h3>Problemes detectes</h3>
  <div id="probTable">Chargement…</div>
  <div class="row" style="margin-top:16px">
    <button class="btn btn-warning" id="qfBtn" onclick="quickFix()">🔧 Quick Fix All</button>
    <a href="/clean" class="btn btn-secondary">Configurer nettoyage →</a>
  </div>
  <div id="qfResult" style="margin-top:12px"></div>
</div>

<div class="card">
  <h3>Activite recente</h3>
  <div class="alog" id="alog"><p>Chargement…</p></div>
</div>

<script>
async function loadStats() {
  const s = await fetch('/api/stats').then(r=>r.json());
  document.getElementById('sTotal').textContent  = s.total.toLocaleString();
  document.getElementById('sDup').textContent    = s.duplicates.toLocaleString();
  document.getElementById('sMul').textContent    = s.multiline.toLocaleString();
  document.getElementById('sArt').textContent    = s.artifacts.toLocaleString();
  document.getElementById('sArab').textContent   = s.arabic.toLocaleString();
  document.getElementById('sReal').textContent   = s.real.toLocaleString();
  document.getElementById('sSynth').textContent  = s.synthetic.toLocaleString();
  document.getElementById('sAug').textContent    = s.augmented.toLocaleString();

  // Purity badge
  const pure = s.synthetic === 0 && s.augmented === 0;
  document.getElementById('purityBadge').innerHTML = pure
    ? '<span class="badge green">🟢 Dataset pur — 100% labels manuels</span>'
    : `<span class="badge yellow">🟡 Dataset mixte — ${s.synthetic.toLocaleString()} synthetique</span>`;

  const probs = [
    {l:'Doublons',     c:s.duplicates, k:'red',    d:'Meme fichier several fois'},
    {l:'Multi-lignes', c:s.multiline,  k:'yellow', d:'Labels avec \\\\n (TrOCR lit 1 ligne)'},
    {l:'Artefacts',    c:s.artifacts,  k:'yellow', d:'Marqueurs Gemini: **, ###, Doctor Stamp...'},
    {l:'Arabe',        c:s.arabic,     k:'red',    d:'Tokenizer Latin — texte arabe = garbage'},
  ];
  let h = '<table><tr><th>Probleme</th><th>Count</th><th>Description</th></tr>';
  for (const p of probs) {
    h += `<tr><td><span class="badge ${p.k}">${p.l}</span></td>
               <td><strong>${p.c.toLocaleString()}</strong></td>
               <td style="color:#64748b">${p.d}</td></tr>`;
  }
  document.getElementById('probTable').innerHTML = h + '</table>';

  const al = document.getElementById('alog');
  al.innerHTML = s.recent.length
    ? s.recent.map(l=>`<p>${l}</p>`).join('')
    : '<p style="color:#334155">Aucune activite</p>';
}

async function quickFix() {
  const btn = document.getElementById('qfBtn');
  btn.disabled = true; btn.textContent = '⏳ En cours…';
  try {
    const d = await fetch('/clean/run', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({steps:['duplicates','arabic','artifacts','multiline','missing']})
    }).then(r=>r.json());
    const info = Object.entries(d.changes||{}).map(([k,v])=>`${k}: ${v}`).join(' | ');
    document.getElementById('qfResult').innerHTML =
      d.ok ? `<div class="alert alert-ok">✅ ${d.message}<br><small>${info}</small></div>`
           : `<div class="alert alert-err">Erreur: ${d.error}</div>`;
    loadStats();
  } finally {
    btn.disabled = false; btn.textContent = '🔧 Quick Fix All';
  }
}

loadStats();
setInterval(loadStats, 30000);
</script>
"""
    return _page("Dashboard", "dashboard", body)


@app.route("/api/stats")
def api_stats():
    return jsonify(get_stats())


@app.route("/api/backup")
def api_backup():
    dst = backup_labels()
    if dst:
        log_activity(f"Manual backup -> {dst.name}")
        return jsonify({"ok": True, "file": dst.name})
    return jsonify({"ok": False, "error": "labels.csv introuvable"})


# =============================================================================
#  Page 2 — Auto-Clean
# =============================================================================

@app.route("/clean")
def page_clean():
    body = """
<h1>🧹 Auto-Clean</h1>
<p class="subtitle">Detecte et corrige les problemes dans labels.csv</p>

<div class="card">
  <h3>Etapes de nettoyage</h3>

  <div class="step-row">
    <input type="checkbox" id="chkDup" checked>
    <div class="step-info">
      <strong>Supprimer les doublons</strong>
      <p>Garde la derniere occurrence de chaque file_name</p>
    </div>
    <div class="step-cnt" id="cDup">…</div>
  </div>

  <div class="step-row">
    <input type="checkbox" id="chkArab" checked>
    <div class="step-info">
      <strong>Extraire les labels arabes</strong>
      <p>Deplace vers dataset/arabic_labels.csv (pour EasyOCR)</p>
    </div>
    <div class="step-cnt" id="cArab">…</div>
  </div>

  <div class="step-row">
    <input type="checkbox" id="chkArt" checked>
    <div class="step-info">
      <strong>Nettoyer les artefacts Gemini</strong>
      <p>Supprime **, ###, Doctor's Stamp: etc. des labels</p>
    </div>
    <div class="step-cnt" id="cArt">…</div>
  </div>

  <div class="step-row">
    <input type="checkbox" id="chkMul" checked>
    <div class="step-info">
      <strong>Corriger les labels multi-lignes</strong>
      <p>Garde UNIQUEMENT la premiere ligne non-vide — labels vides → trash</p>
    </div>
    <div class="step-cnt" id="cMul">…</div>
  </div>

  <div class="step-row">
    <input type="checkbox" id="chkMis" checked>
    <div class="step-info">
      <strong>Supprimer images manquantes</strong>
      <p>Retire les lignes dont l'image n'existe plus sur disque</p>
    </div>
    <div class="step-cnt" id="cMis">—</div>
  </div>
</div>

<div class="row" style="margin-bottom:16px">
  <button class="btn btn-primary" id="runBtn" onclick="runClean()">▶ Lancer le nettoyage</button>
  <button class="btn btn-secondary" onclick="preview()">🔍 Apercu des counts</button>
  <button class="btn btn-secondary" onclick="manualBackup()">💾 Backup manuel</button>
</div>
<div id="cleanResult"></div>

<script>
async function preview() {
  const s = await fetch('/api/stats').then(r=>r.json());
  document.getElementById('cDup').textContent  = s.duplicates;
  document.getElementById('cArab').textContent = s.arabic;
  document.getElementById('cArt').textContent  = s.artifacts;
  document.getElementById('cMul').textContent  = s.multiline;
}

async function manualBackup() {
  const d = await fetch('/api/backup').then(r=>r.json());
  alert(d.ok ? 'Backup: ' + d.file : 'Erreur: ' + d.error);
}

async function runClean() {
  const steps = [];
  if (document.getElementById('chkDup').checked)  steps.push('duplicates');
  if (document.getElementById('chkArab').checked) steps.push('arabic');
  if (document.getElementById('chkArt').checked)  steps.push('artifacts');
  if (document.getElementById('chkMul').checked)  steps.push('multiline');
  if (document.getElementById('chkMis').checked)  steps.push('missing');
  if (!steps.length) { alert('Selectionnez au moins une etape'); return; }

  const btn = document.getElementById('runBtn');
  btn.disabled = true; btn.textContent = '⏳ En cours…';
  document.getElementById('cleanResult').innerHTML =
    '<div class="alert alert-info">Nettoyage en cours…</div>';

  const d = await fetch('/clean/run', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({steps})
  }).then(r=>r.json());

  if (d.ok) {
    const lines = Object.entries(d.changes||{}).map(([k,v])=>`• ${k}: ${v}`).join('<br>');
    document.getElementById('cleanResult').innerHTML =
      `<div class="alert alert-ok"><strong>✅ ${d.message}</strong><br>${lines}</div>`;
  } else {
    document.getElementById('cleanResult').innerHTML =
      `<div class="alert alert-err">Erreur: ${d.error}</div>`;
  }
  btn.disabled = false; btn.textContent = '▶ Lancer le nettoyage';
  preview();
}

preview();

async function runPurge() {
  const btn = document.getElementById('purgeBtn');
  btn.disabled = true; btn.textContent = '⏳ Purge en cours…';
  document.getElementById('purgeResult').innerHTML =
    '<div class="alert alert-info">Suppression du synthetique en cours…</div>';
  const d = await fetch('/clean/purge-to-reviewed', {method:'POST'}).then(r=>r.json());
  if (d.ok) {
    document.getElementById('purgeResult').innerHTML =
      `<div class="alert alert-ok">
        ✅ <strong>${d.kept} labels manuels conserves</strong><br>
        🗑 ${d.deleted_images} images synthetiques supprimees du disque<br>
        📋 labels.csv reecrit avec uniquement vos labels reviewes
        ${d.missing > 0 ? '<br>⚠️ '+d.missing+' images source introuvables' : ''}
      </div>`;
  } else {
    document.getElementById('purgeResult').innerHTML =
      `<div class="alert alert-err">Erreur: ${d.error}</div>`;
  }
  btn.disabled = false; btn.textContent = '🚨 Purge: Garder seulement mes labels';
  document.getElementById('confirmPurge').checked = false;
  document.getElementById('purgeBtn').disabled = true;
  preview();
}
</script>

<div class="card" style="border-color:#7f1d1d;margin-top:8px">
  <h3 style="color:#f87171">🚨 Danger Zone — Keep Only Reviewed Labels</h3>
  <p style="font-size:13px;color:#94a3b8;margin-bottom:14px;line-height:1.7">
    Supprime <strong>TOUT</strong> le synthetique
    (<code style="color:#fca5a5">printed_*</code> /
     <code style="color:#fca5a5">handwritten_*</code> /
     <code style="color:#fca5a5">aug_*</code>) du disque
    et reecrit <code style="color:#fca5a5">labels.csv</code> uniquement avec vos labels
    manuels (<code style="color:#fca5a5">real_labels_reviewed.csv</code> status=ok).<br>
    Un backup est cree automatiquement avant la purge.
  </p>
  <div style="background:#0f172a;border-radius:6px;padding:12px;margin-bottom:14px">
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;color:#fca5a5;font-size:13px">
      <input type="checkbox" id="confirmPurge" style="width:16px;height:16px;accent-color:#dc2626"
        onchange="document.getElementById('purgeBtn').disabled=!this.checked">
      Je confirme — supprimer tout le synthetique et garder uniquement mes labels reviewes
    </label>
  </div>
  <button class="btn btn-danger" id="purgeBtn" disabled onclick="runPurge()">
    🚨 Purge: Garder seulement mes labels
  </button>
  <div id="purgeResult" style="margin-top:12px"></div>
</div>
"""
    return _page("Auto-Clean", "clean", body)


@app.route("/clean/run", methods=["POST"])
def clean_run():
    data  = request.get_json(force=True)
    steps = data.get("steps", [])

    rows = load_labels()
    if not rows:
        return jsonify({"ok": False, "error": "labels.csv vide ou introuvable"})

    backup_labels()
    changes: dict[str, Any] = {}
    orig = len(rows)

    # 1 — Deduplicate (keep last)
    if "duplicates" in steps:
        seen: dict[str, dict] = {}
        for r in rows:
            seen[r.get("file_name", "")] = r
        removed = len(rows) - len(seen)
        rows = list(seen.values())
        changes["doublons_supprimes"] = removed

    # 2 — Handle Arabic labels
    if "arabic" in steps:
        clean_rows: list[dict] = []
        arabic_rows: list[dict] = []
        mixed_fixed = 0
        for r in rows:
            text = r.get("text", "")
            if not ARABIC_RE.search(text):
                # No Arabic at all — keep as-is
                clean_rows.append(r)
            elif is_fully_arabic(text):
                # Fully Arabic (no Latin) — extract to arabic_labels.csv
                arabic_rows.append(r)
            else:
                # Mixed French+Arabic — keep French part for TrOCR
                french_part = extract_french(text)
                if french_part and len(french_part) >= 2:
                    clean_rows.append({**r, "text": french_part})
                    mixed_fixed += 1
                else:
                    arabic_rows.append(r)
        if arabic_rows:
            write_hdr = not ARABIC_CSV.exists()
            with open(ARABIC_CSV, "a", newline="", encoding="utf-8") as fh:
                w = csv.DictWriter(fh, fieldnames=["file_name", "text"],
                                   extrasaction="ignore")
                if write_hdr:
                    w.writeheader()
                w.writerows(arabic_rows)
        changes["labels_arabes_extraits"] = len(arabic_rows)
        changes["labels_mixtes_corriges"] = mixed_fixed
        rows = clean_rows

    # 3 — Strip artifacts
    if "artifacts" in steps:
        _STRIP = re.compile(
            r"\*\*|###|---|"
            r"Doctor's Stamp:|Red Stamp:|Institutional Stamp:|"
            r"Printed Institutional Text:|Handwritten Entry:|"
            r"Plaintext it is!|\[Stylized Signature[^]]*\]",
            re.IGNORECASE,
        )
        modified = 0
        new_rows: list[dict] = []
        for r in rows:
            text = r.get("text", "")
            if ARTIFACT_RE.search(text):
                cleaned = re.sub(r"\s+", " ", _STRIP.sub("", text)).strip()
                if cleaned:
                    r = {**r, "text": cleaned}
                    modified += 1
                else:
                    trash_image(r.get("file_name", ""))
                    continue
            new_rows.append(r)
        changes["artefacts_nettoyes"] = modified
        rows = new_rows

    # 4 — Fix multiline: keep ONLY the first non-empty line
    if "multiline" in steps:
        modified = trashed = 0
        new_rows = []
        for r in rows:
            text = r.get("text", "")
            if "\n" in text:
                # Keep only the first non-empty line
                first_line = ""
                for line in text.split("\n"):
                    stripped = line.strip()
                    if stripped:
                        first_line = stripped
                        break
                if first_line and len(first_line) >= 2:
                    r = {**r, "text": first_line}
                    modified += 1
                else:
                    trash_image(r.get("file_name", ""))
                    trashed += 1
                    continue
            new_rows.append(r)
        changes["multilignes_corriges"] = modified
        changes["lignes_vides_supprimees"] = trashed
        rows = new_rows

    # 5 — Remove entries with missing images
    if "missing" in steps:
        missing_count = 0
        new_rows = []
        for r in rows:
            fn = r.get("file_name", "")
            if (IMAGES_DIR / fn).exists() or (LINES_DIR / fn).exists():
                new_rows.append(r)
            else:
                missing_count += 1
        changes["images_manquantes"] = missing_count
        rows = new_rows

    save_labels(rows)
    msg = (
        f"Nettoyage termine. {orig} → {len(rows)} lignes "
        f"({orig - len(rows)} supprimees)"
    )
    log_activity(f"clean/run steps={steps}: {msg}")
    return jsonify({"ok": True, "message": msg, "changes": changes})


@app.route("/clean/purge-to-reviewed", methods=["POST"])
def clean_purge_to_reviewed():
    """Keep ONLY manually-reviewed ok rows; delete all synthetic images from disk."""
    try:
        # 1. Backup first
        bak = backup_labels()

        # 2. Load manually-reviewed ok rows
        if not REVIEWED_CSV.exists():
            return jsonify({"ok": False, "error": "real_labels_reviewed.csv introuvable"})

        ok_rows: list[dict] = []
        with open(REVIEWED_CSV, encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                if row.get("status") == "ok" and (row.get("text") or "").strip():
                    ok_rows.append({
                        "file_name": row["file_name"],
                        "text": row["text"].strip(),
                    })

        if not ok_rows:
            return jsonify({"ok": False, "error": "Aucun label status=ok trouve dans real_labels_reviewed.csv"})

        # 3. Ensure images are in dataset/images/
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        copied = missing = 0
        for r in ok_rows:
            fn  = r["file_name"]
            dst = IMAGES_DIR / fn
            src = LINES_DIR / fn
            if not dst.exists():
                if src.exists():
                    shutil.copy2(src, dst)
                    copied += 1
                else:
                    missing += 1

        # 4. Delete all synthetic images from disk
        deleted = 0
        for pattern in ["printed_*.jpg", "handwritten_*.jpg", "aug_*.jpg",
                         "printed_*.jpeg", "handwritten_*.jpeg", "aug_*.jpeg"]:
            for f in IMAGES_DIR.glob(pattern):
                try:
                    f.unlink()
                    deleted += 1
                except Exception:
                    pass

        # 5. Rewrite labels.csv with only ok rows
        save_labels(ok_rows)

        msg = (f"Purge terminee: {len(ok_rows)} labels manuels conserves, "
               f"{deleted} images synthetiques supprimees")
        log_activity(msg)
        return jsonify({
            "ok":             True,
            "kept":           len(ok_rows),
            "copied_images":  copied,
            "deleted_images": deleted,
            "missing":        missing,
            "backup":         bak.name if bak else None,
        })

    except Exception as e:
        log.exception("purge-to-reviewed error")
        return jsonify({"ok": False, "error": str(e)})


# =============================================================================
#  Page 3 — Review Mode
# =============================================================================

@app.route("/review")
def page_review():
    body = """
<h1>✏️ Review Mode</h1>
<p class="subtitle">Correction manuelle des labels — navigation clavier</p>

<div class="row" style="margin-bottom:14px">
  <label style="display:inline;margin:0;color:#94a3b8;white-space:nowrap">Filtre:</label>
  <select id="filterSel" style="width:auto" onchange="loadState()">
    <option value="all">Toutes les lignes</option>
    <option value="unreviewed">Non-reviewees</option>
    <option value="multiline">Multi-lignes</option>
    <option value="arabic">Arabes</option>
    <option value="artifact">Artefacts</option>
  </select>
  <span id="counter" style="color:#64748b;font-size:13px"></span>
  <div style="flex:1"></div>
  <button class="btn btn-secondary" onclick="go(-1)">← Prec</button>
  <input id="jumpInput" type="number" placeholder="#" style="width:70px">
  <button class="btn btn-secondary" onclick="jump()">Aller</button>
  <button class="btn btn-secondary" onclick="go(1)">Suiv →</button>
</div>

<div class="pbar pbar-blue" style="margin-bottom:14px">
  <div id="pbar" style="width:0%"></div>
</div>

<div class="card" style="padding:12px;text-align:center;background:#fff;margin-bottom:12px">
  <img id="rImg" src="" style="max-width:100%;max-height:200px;image-rendering:pixelated" />
  <p id="rFn" style="color:#999;font-size:11px;margin-top:6px"></p>
</div>

<div class="card">
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <span id="rBadge"></span>
    <span style="color:#64748b;font-size:11px">idx: <span id="rIdx">0</span></span>
  </div>
  <div id="rHints" style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px"></div>
  <textarea id="rText" rows="2" style="font-size:18px;font-family:monospace"
    placeholder="Saisir le texte exact visible…" spellcheck="false"></textarea>
  <div class="row" style="margin-top:10px">
    <button class="btn btn-success"   onclick="saveNext('ok')">✓ Sauver &amp; Suiv <kbd>Enter</kbd></button>
    <button class="btn btn-secondary" onclick="saveNext('skip')">⏭ Skip <kbd>Shift+Enter</kbd></button>
    <button class="btn btn-danger"    onclick="saveNext('trash')">🗑 Trash <kbd>Ctrl+Enter</kbd></button>
    <button class="btn btn-secondary" onclick="nextUnrev()">⇥ Prochain non-reviewe <kbd>Tab</kbd></button>
  </div>
</div>

<div class="card">
  <h3>Raccourcis</h3>
  <p style="font-size:12px;color:#64748b;line-height:2">
    <kbd>Enter</kbd> Sauver &amp; suivant &nbsp;
    <kbd>Shift+Enter</kbd> Skip (garder label) &nbsp;
    <kbd>Ctrl+Enter</kbd> Trash (supprimer) &nbsp;
    <kbd>Tab</kbd> Prochain non-reviewe &nbsp;
    <kbd>←</kbd>/<kbd>→</kbd> Naviguer (hors textarea)
  </p>
</div>

<script>
let files=[], labels={}, reviewed={}, drugHints={}, idx=0;

async function loadState() {
  const f = document.getElementById('filterSel').value;
  const d = await fetch('/api/review/state?filter='+f).then(r=>r.json());
  files=d.files; labels=d.labels; reviewed=d.reviewed;
  drugHints = d.drug_hints || {};
  idx = files.findIndex(f=>!reviewed[f]);
  if (idx===-1) idx=0;
  render();
}

function renderHints(fn) {
  const el = document.getElementById('rHints');
  const hints = drugHints[fn] || [];
  if (!hints.length) { el.innerHTML = '<span style="color:#64748b;font-size:11px">💊 Aucun médicament détecté par le matcher</span>'; return; }
  el.innerHTML = hints.map(h => {
    const conf = Math.round(h.confidence * 100);
    const bg = h.strategy === 'exact' ? '#22c55e'
             : h.strategy === 'fuzzy' ? '#3b82f6'
             : h.strategy === 'phonetic' ? '#a855f7'
             : '#64748b';
    return `<span style="background:${bg};color:white;padding:3px 10px;border-radius:14px;font-size:12px;font-weight:600"
              title="${h.strategy}, conf=${h.confidence.toFixed(2)}">💊 ${h.name} <span style="opacity:.7">${conf}%</span></span>`;
  }).join('');
}

function render() {
  if (!files.length) {
    document.getElementById('rImg').src='';
    document.getElementById('counter').textContent='(0/0)';
    document.getElementById('rHints').innerHTML='';
    return;
  }
  const fn=files[idx];
  document.getElementById('rImg').src='/img/'+encodeURIComponent(fn);
  document.getElementById('rFn').textContent=fn;
  document.getElementById('counter').textContent=`(${idx+1}/${files.length})`;
  document.getElementById('rIdx').textContent=idx;
  const done=Object.keys(reviewed).length;
  document.getElementById('pbar').style.width=(100*done/files.length)+'%';
  const txt=document.getElementById('rText');
  const rev=reviewed[fn];
  txt.value=rev ? rev.text : (labels[fn]||'');
  txt.focus(); txt.select();
  const colors={ok:'green',skip:'gray',trash:'red'};
  document.getElementById('rBadge').innerHTML=rev
    ? `<span class="badge ${colors[rev.status]||'gray'}">${rev.status}</span>`
    : '<span class="badge gray">non-reviewe</span>';
  renderHints(fn);
}

async function saveNext(status) {
  const fn=files[idx], text=document.getElementById('rText').value.trim();
  const r = await fetch('/api/review/save',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({file_name:fn,text,status})
  });
  if (r.ok) {
    reviewed[fn]={file_name:fn,text,status};
    flashSaved(status);
  } else {
    alert('❌ Save FAILED — check console');
  }
  go(1);
}

function flashSaved(status) {
  let toast = document.getElementById('saveToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'saveToast';
    toast.style.cssText = 'position:fixed;top:18px;right:18px;padding:10px 18px;'
      + 'border-radius:8px;font-weight:600;font-size:13px;z-index:9999;'
      + 'box-shadow:0 4px 18px rgba(0,0,0,.4);transition:opacity .25s;color:white';
    document.body.appendChild(toast);
  }
  const colors = {ok:'#22c55e', skip:'#64748b', trash:'#ef4444'};
  toast.style.background = colors[status] || '#3b82f6';
  toast.textContent = status === 'ok' ? '✓ Saved & snapshot fait'
                    : status === 'skip' ? '⏭ Skipped'
                    : '🗑 Trashed';
  toast.style.opacity = '1';
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => { toast.style.opacity = '0'; }, 1200);
}

function go(d) { idx=Math.max(0,Math.min(files.length-1,idx+d)); render(); }
function jump() {
  const v=parseInt(document.getElementById('jumpInput').value,10);
  if (!isNaN(v)) { idx=Math.max(0,Math.min(files.length-1,v-1)); render(); }
}
function nextUnrev() {
  for (let i=idx+1;i<files.length;i++) {
    if (!reviewed[files[i]]) { idx=i; render(); return; }
  }
}

document.addEventListener('keydown',e=>{
  const t=document.getElementById('rText');
  if (e.key==='Enter'&&!e.shiftKey&&!e.ctrlKey) { e.preventDefault(); saveNext('ok'); }
  else if (e.key==='Enter'&&e.shiftKey)          { e.preventDefault(); saveNext('skip'); }
  else if (e.key==='Enter'&&e.ctrlKey)           { e.preventDefault(); saveNext('trash'); }
  else if (e.key==='Tab'&&document.activeElement===t) { e.preventDefault(); nextUnrev(); }
  else if (e.key==='ArrowLeft' &&document.activeElement!==t) go(-1);
  else if (e.key==='ArrowRight'&&document.activeElement!==t) go(1);
});

loadState();
</script>
"""
    return _page("Review Mode", "review", body)


# ── DrugMatcher integration (lazy-loaded, optional) ─────────────────────────
_drug_matcher = None
def _get_drug_matcher():
    """Lazy-load the DrugMatcher. Returns None if not available."""
    global _drug_matcher
    if _drug_matcher is False:   # tried & failed marker
        return None
    if _drug_matcher is not None:
        return _drug_matcher
    try:
        import sys
        pp = ROOT / "postprocess"
        if str(pp) not in sys.path:
            sys.path.insert(0, str(pp))
        from matcher import DrugMatcher  # type: ignore
        _drug_matcher = DrugMatcher.from_cache()
        log.info(f"DrugMatcher loaded for review hints: {_drug_matcher}")
    except Exception as e:
        log.warning(f"DrugMatcher unavailable in dataset_tool: {e}")
        _drug_matcher = False  # type: ignore
        return None
    return _drug_matcher


def _drug_hints_for(text: str) -> list[dict]:
    """Return a compact list of drug matches for the given label text.
       Used as 'Yacine, this line probably contains drug X' suggestions."""
    m = _get_drug_matcher()
    if not m or not text:
        return []
    out = []
    for r in m.match_text(text):
        if r.matched_name:
            out.append({
                "name": r.matched_name,
                "confidence": r.confidence,
                "strategy": r.strategy,
            })
    return out


@app.route("/api/review/state")
def api_review_state():
    filter_mode = request.args.get("filter", "all")
    rows  = load_labels()
    state = load_review_state()

    labels: dict[str, str] = {}
    for r in rows:
        fn = r.get("file_name", "")
        if fn:
            labels[fn] = r.get("text", "")

    def keeps(fn: str, text: str) -> bool:
        if filter_mode == "all":        return True
        if filter_mode == "unreviewed": return fn not in state
        if filter_mode == "multiline":  return bool(MULTILINE_RE.search(text))
        if filter_mode == "arabic":     return bool(ARABIC_RE.search(text))
        if filter_mode == "artifact":   return bool(ARTIFACT_RE.search(text))
        return True

    files = [fn for fn, text in labels.items() if keeps(fn, text)]

    # Pre-compute drug hints for every visible line (fast — ~1ms/line × 700 ≈ 0.7s)
    hints: dict[str, list] = {}
    for fn in files:
        h = _drug_hints_for(labels.get(fn, ""))
        if h:
            hints[fn] = h

    return jsonify({
        "files": files,
        "labels": labels,
        "reviewed": state,
        "drug_hints": hints,
        "matcher_loaded": _get_drug_matcher() is not None,
    })


@app.route("/api/review/save", methods=["POST"])
def api_review_save():
    data   = request.get_json(force=True)
    fn     = data.get("file_name", "")
    text   = (data.get("text") or "").strip()
    status = data.get("status", "ok")

    state = load_review_state()

    if status == "trash":
        trash_image(fn)
        state[fn] = {"file_name": fn, "text": text, "status": "trash"}
        save_review_state(state)
        save_labels([r for r in load_labels() if r.get("file_name") != fn])
        log_activity(f"review: trashed {fn}")
    elif status == "skip":
        # Skip = exclude from training (remove from labels.csv)
        state[fn] = {"file_name": fn, "text": text, "status": "skip"}
        save_review_state(state)
        save_labels([r for r in load_labels() if r.get("file_name") != fn])
        log_activity(f"review: skipped {fn} (removed from training)")
    else:
        state[fn] = {"file_name": fn, "text": text, "status": status}
        save_review_state(state)
        if status == "ok" and text:
            rows = load_labels()
            for r in rows:
                if r.get("file_name") == fn:
                    r["text"] = text
                    break
            save_labels(rows)
            log_activity(f"review: updated {fn}")

    return jsonify({"ok": True, "count": len(state)})


@app.route("/img/<path:filename>")
def serve_img(filename: str):
    for directory in [IMAGES_DIR, LINES_DIR]:
        p = directory / filename
        if p.exists():
            return send_file(str(p))
    return "Not found", 404


# =============================================================================
#  Page 4 — Add Prescriptions
# =============================================================================

@app.route("/add")
def page_add():
    body = """
<h1>➕ Add Prescriptions</h1>
<p class="subtitle">Upload d'ordonnances → segmentation automatique des lignes</p>

<div class="card">
  <h3>Upload d'images</h3>
  <div id="dz" style="border:2px dashed #334155;border-radius:8px;padding:40px;
       text-align:center;cursor:pointer;transition:.15s"
    ondrop="handleDrop(event)" ondragover="event.preventDefault()"
    ondragenter="this.style.borderColor='#2563eb'"
    ondragleave="this.style.borderColor='#334155'"
    onclick="document.getElementById('fi').click()">
    <p style="color:#64748b;margin-bottom:8px">📎 Glisser des images ici</p>
    <p style="color:#475569;font-size:12px">ou cliquer pour selectionner</p>
    <p style="color:#334155;font-size:11px;margin-top:6px">JPG / PNG / WEBP — multi-fichiers OK</p>
  </div>
  <input id="fi" type="file" accept="image/*" multiple style="display:none"
    onchange="uploadFiles(this.files)">
</div>

<div id="upProg" style="display:none" class="card">
  <div class="row" style="margin-bottom:8px">
    <span id="upStatus" style="color:#94a3b8;font-size:13px">Segmentation…</span>
    <span id="upCount"  style="color:#64748b;font-size:12px"></span>
  </div>
  <div class="pbar pbar-blue"><div id="upBar" style="width:0%"></div></div>
</div>

<div id="cropGrid" class="crop-grid" style="margin-bottom:14px"></div>

<div id="saveSection" style="display:none" class="row">
  <button class="btn btn-success" onclick="saveAll()">
    💾 Sauvegarder (<span id="saveCount">0</span> crops)
  </button>
  <button class="btn btn-secondary" onclick="clearAll()">✕ Annuler</button>
</div>
<div id="saveResult" style="margin-top:12px"></div>

<script>
let crops = [];

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dz').style.borderColor='#334155';
  uploadFiles(e.dataTransfer.files);
}

async function uploadFiles(files) {
  if (!files.length) return;
  crops=[];
  document.getElementById('cropGrid').innerHTML='';
  document.getElementById('saveSection').style.display='none';
  document.getElementById('upProg').style.display='';

  for (let i=0;i<files.length;i++) {
    document.getElementById('upStatus').textContent=`Traitement: ${files[i].name}`;
    document.getElementById('upCount').textContent=`${i+1}/${files.length}`;
    document.getElementById('upBar').style.width=`${100*(i+1)/files.length}%`;
    const fd=new FormData(); fd.append('image',files[i]);
    try {
      const d=await fetch('/api/add/upload',{method:'POST',body:fd}).then(r=>r.json());
      if (d.crops) d.crops.forEach(c=>{ crops.push(c); renderCrop(c,crops.length-1); });
    } catch(e) { console.error(e); }
  }
  document.getElementById('upProg').style.display='none';
  document.getElementById('saveSection').style.display='';
  document.getElementById('saveCount').textContent=crops.filter(c=>c).length;
}

function renderCrop(crop, i) {
  const div=document.createElement('div');
  div.className='crop-item'; div.id='ci'+i;
  div.innerHTML=`
    <img src="data:image/jpeg;base64,${crop.image_b64}" />
    <input type="text" value="" placeholder="Saisir le texte visible…"
      style="font-size:14px;font-family:monospace"
      oninput="crops[${i}].label=this.value">
    <div style="margin-top:6px">
      <button class="btn btn-secondary" style="font-size:11px;padding:4px 8px"
        onclick="removeCrop(${i})">✕ Retirer</button>
    </div>`;
  document.getElementById('cropGrid').appendChild(div);
}

function removeCrop(i) {
  crops[i]=null;
  const el=document.getElementById('ci'+i);
  if (el) el.style.opacity='0.3';
  document.getElementById('saveCount').textContent=crops.filter(c=>c).length;
}

async function saveAll() {
  const active=crops.filter(c=>c&&c.label&&c.label.trim());
  if (!active.length) { alert('Saisissez au moins un label'); return; }
  const d=await fetch('/api/add/save',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({crops:active})
  }).then(r=>r.json());
  document.getElementById('saveResult').innerHTML=d.ok
    ? `<div class="alert alert-ok">✅ ${d.saved} images sauvegardees dans dataset/images/</div>`
    : `<div class="alert alert-err">Erreur: ${d.error}</div>`;
  if (d.ok) clearAll();
}

function clearAll() {
  crops=[];
  document.getElementById('cropGrid').innerHTML='';
  document.getElementById('saveSection').style.display='none';
}
</script>
"""
    return _page("Add Prescriptions", "add", body)


@app.route("/api/add/upload", methods=["POST"])
def api_add_upload():
    f = request.files.get("image")
    if not f:
        return jsonify({"ok": False, "error": "No file"})
    try:
        img = Image.open(f.stream).convert("RGB")
        if img.width > 1600:
            ratio = 1600 / img.width
            img   = img.resize((1600, int(img.height * ratio)), Image.LANCZOS)
        lines = segment_lines(img)
        return jsonify({"ok": True, "crops": [
            {"image_b64": pil_to_b64(line), "label": ""} for line in lines
        ]})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


@app.route("/api/add/save", methods=["POST"])
def api_add_save():
    data = request.get_json(force=True)
    crops = data.get("crops", [])
    if not crops:
        return jsonify({"ok": False, "error": "No crops"})
    try:
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        new_rows: list[dict] = []
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        for i, crop in enumerate(crops):
            label = (crop.get("label") or "").strip()
            if not label:
                continue
            raw  = base64.b64decode(crop.get("image_b64", ""))
            name = f"real_{ts}_{hashlib.md5(raw).hexdigest()[:8]}_{i}.jpg"
            (IMAGES_DIR / name).write_bytes(raw)
            new_rows.append({"file_name": name, "text": label})
        backup_labels()
        save_labels(load_labels() + new_rows)
        log_activity(f"add/save: {len(new_rows)} real crops ajoutees")
        return jsonify({"ok": True, "saved": len(new_rows)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


# =============================================================================
#  Page 5 — Regenerate Synthetic
# =============================================================================

@app.route("/regen")
def page_regen():
    body = """
<h1>🔁 Regenerer Synthetique</h1>
<p class="subtitle">Nouvelles images d'entrainement + Strategy D (5 variantes augmentees par crop reel)</p>

<div class="card">
  <h3>Configuration</h3>
  <div class="g2">
    <div class="fg">
      <label>Images printed a generer <span style="color:#fbbf24;font-size:11px">(0 recommande — TrOCR lit deja le texte imprime)</span></label>
      <input type="number" id="nPrinted" value="0" min="0" max="10000">
    </div>
    <div class="fg">
      <label>Images handwritten a generer <span style="color:#34d399;font-size:11px">(focus ici — c'est ce que le modele doit apprendre)</span></label>
      <input type="number" id="nHandwritten" value="2000" min="0" max="10000">
    </div>
  </div>
  <div class="fg">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#e2e8f0">
      <input type="checkbox" id="chkDel" style="width:auto;accent-color:#2563eb">
      Supprimer l'ancien synthetique avant de regenerer
    </label>
  </div>
  <div class="fg">
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#e2e8f0">
      <input type="checkbox" id="chkSD" checked style="width:auto;accent-color:#2563eb">
      Appliquer Strategy D (×5 augmentations par crop reel)
    </label>
  </div>
</div>

<div class="row" style="margin-bottom:16px">
  <button class="btn btn-primary" id="regenBtn" onclick="startRegen()">▶ Generer</button>
  <span id="regenStatus" style="color:#64748b;font-size:13px"></span>
</div>

<div id="regenProg" style="display:none" class="card">
  <div class="row" style="margin-bottom:8px;justify-content:space-between">
    <span id="rStep" style="color:#94a3b8;font-size:13px">En cours…</span>
    <span id="rCount" style="color:#64748b;font-size:12px">0/0</span>
  </div>
  <div class="pbar pbar-green"><div id="rBar" style="width:0%"></div></div>
</div>
<div id="regenResult"></div>

<div class="card" style="margin-top:8px">
  <h3>A propos de Strategy D</h3>
  <p style="font-size:13px;color:#94a3b8;line-height:1.8">
    Pour chaque image reelle dans le dataset, 5 variantes augmentees sont creees :<br>
    <strong>1</strong> Rotation ±3° &nbsp;
    <strong>2</strong> Luminosite/contraste (×0.8–1.2) &nbsp;
    <strong>3</strong> Bruit gaussien (σ 8–20) &nbsp;
    <strong>4</strong> Perspective legere &nbsp;
    <strong>5</strong> Combine (bruit + rotation + flou)
  </p>
</div>

<script>
let sse=null;
async function startRegen() {
  if (sse) { sse.close(); sse=null; }
  const btn=document.getElementById('regenBtn');
  btn.disabled=true;
  document.getElementById('regenProg').style.display='';
  document.getElementById('regenResult').innerHTML='';

  await fetch('/api/regen/start',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      num_printed:   parseInt(document.getElementById('nPrinted').value)||0,
      num_handwritten:parseInt(document.getElementById('nHandwritten').value)||0,
      delete_old:    document.getElementById('chkDel').checked,
      strategy_d:    document.getElementById('chkSD').checked,
    })
  });

  sse=new EventSource('/api/regen/progress');
  sse.onmessage=e=>{
    const d=JSON.parse(e.data);
    document.getElementById('rStep').textContent=d.step||'…';
    document.getElementById('rCount').textContent=`${d.done||0}/${d.total||0}`;
    const pct=d.total>0 ? 100*d.done/d.total : 0;
    document.getElementById('rBar').style.width=pct+'%';
    if (d.finished) {
      sse.close(); sse=null;
      btn.disabled=false;
      document.getElementById('regenResult').innerHTML=
        `<div class="alert alert-ok">✅ Generation terminee — ${d.total} nouvelles images</div>`;
    }
  };
  sse.onerror=()=>{
    btn.disabled=false;
    document.getElementById('rStep').textContent='Termine ou erreur';
    if (sse) { sse.close(); sse=null; }
  };
}
</script>
"""
    return _page("Regen Synthetic", "regen", body)


@app.route("/api/regen/start", methods=["POST"])
def api_regen_start():
    if _regen_running.is_set():
        return jsonify({"ok": False, "error": "Deja en cours"})
    data = request.get_json(force=True)
    params = {
        "num_printed":     int(data.get("num_printed", 2000)),
        "num_handwritten": int(data.get("num_handwritten", 2000)),
        "delete_old":      bool(data.get("delete_old", False)),
        "strategy_d":      bool(data.get("strategy_d", True)),
    }

    def _run():
        _regen_running.set()
        try:
            _do_regen(**params)
        except Exception as exc:
            log.exception("regen error")
            _regen_queue.put({"step": f"Erreur: {exc}", "done": 1, "total": 1, "finished": True})
        finally:
            _regen_running.clear()

    threading.Thread(target=_run, daemon=True).start()
    return jsonify({"ok": True})


def _do_regen(
    num_printed: int,
    num_handwritten: int,
    delete_old: bool,
    strategy_d: bool,
) -> None:
    random.seed()
    hw_fonts = get_fonts(FONTS_DIR, sys_fonts=False)
    pr_fonts = get_fonts(FONTS_DIR, sys_fonts=True)
    if not hw_fonts:
        hw_fonts = pr_fonts
    if not pr_fonts:
        _regen_queue.put({"step": "Erreur: aucune police systeme trouvee",
                          "done": 1, "total": 1, "finished": True})
        return

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    if delete_old:
        _regen_queue.put({"step": "Suppression ancien synthetique…",
                          "done": 0, "total": max(num_printed + num_handwritten, 1)})
        rows = [r for r in load_labels()
                if not r.get("file_name","").startswith(("printed_","handwritten_"))]
        for f in list(IMAGES_DIR.glob("printed_*.jpg")) + list(IMAGES_DIR.glob("handwritten_*.jpg")):
            try:
                f.unlink()
            except Exception:
                pass
        save_labels(rows)

    new_rows: list[dict] = []
    total_synth = max(num_printed + num_handwritten, 1)

    # Strategy D — augment real crops
    if strategy_d:
        real_rows = [r for r in load_labels()
                     if not r.get("file_name","").startswith(("printed_","handwritten_","aug_"))]
        aug_done = 0
        for row in real_rows:
            fn = row.get("file_name","")
            src_path = IMAGES_DIR / fn
            if not src_path.exists():
                src_path = LINES_DIR / fn
            if not src_path.exists():
                continue
            try:
                src_img = Image.open(src_path).convert("RGB")
            except Exception:
                continue
            for aug_fn in AUGMENTERS:
                try:
                    aug_img = aug_fn(src_img)
                    name    = f"aug_{int(time.time()*1e6)}_{uuid.uuid4().hex[:6]}.jpg"
                    aug_img.save(IMAGES_DIR / name, quality=90)
                    new_rows.append({"file_name": name, "text": row["text"]})
                    aug_done += 1
                    if aug_done % 50 == 0:
                        _regen_queue.put({
                            "step": f"Strategy D: {aug_done} augmentations…",
                            "done": 0, "total": total_synth,
                        })
                except Exception:
                    pass
        log_activity(f"regen: Strategy D => {aug_done} crops augmentes")

    # Generate printed
    ts = int(time.time() * 1000)
    for i in range(num_printed):
        text = generate_text(random.random() < 0.2)
        try:
            img  = generate_line_image(text, random.choice(pr_fonts), random.randint(24, 36))
            name = f"printed_{ts}_{i}.jpg"
            img.save(IMAGES_DIR / name, quality=90)
            new_rows.append({"file_name": name, "text": text})
        except Exception:
            pass
        if (i + 1) % 200 == 0 or i == num_printed - 1:
            _regen_queue.put({
                "step": f"Printed {i+1}/{num_printed}",
                "done": i + 1,
                "total": total_synth,
            })

    # Generate handwritten
    ts2 = int(time.time() * 1000) + 1
    for i in range(num_handwritten):
        text = generate_text(random.random() < 0.2)
        try:
            img  = generate_line_image(text, random.choice(hw_fonts), random.randint(28, 48))
            name = f"handwritten_{ts2}_{i}.jpg"
            img.save(IMAGES_DIR / name, quality=90)
            new_rows.append({"file_name": name, "text": text})
        except Exception:
            pass
        if (i + 1) % 200 == 0 or i == num_handwritten - 1:
            _regen_queue.put({
                "step": f"Handwritten {i+1}/{num_handwritten}",
                "done": num_printed + i + 1,
                "total": total_synth,
            })

    backup_labels()
    save_labels(load_labels() + new_rows)
    log_activity(f"regen: {len(new_rows)} nouvelles images generees")

    _regen_queue.put({
        "step": "Termine ✅",
        "done": total_synth,
        "total": total_synth,
        "finished": True,
    })


@app.route("/api/regen/progress")
def api_regen_progress():
    def stream():
        while True:
            try:
                msg = _regen_queue.get(timeout=60)
                yield f"data: {json.dumps(msg)}\n\n"
                if msg.get("finished"):
                    break
            except queue.Empty:
                # Keep-alive ping
                yield "data: " + json.dumps({
                    "step": "En attente…", "done": 0, "total": 0
                }) + "\n\n"
                if not _regen_running.is_set():
                    break

    return Response(
        stream(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# =============================================================================
#  Page 6 — Build & Export
# =============================================================================

@app.route("/build")
def page_build():
    body = """
<h1>📦 Build & Export</h1>
<p class="subtitle">Assemble le dataset final et exporte pour l'entrainement TrOCR</p>

<div class="card">
  <h3>Composition actuelle</h3>
  <div id="compStats" style="color:#64748b;font-size:13px">Chargement…</div>
</div>

<div class="card">
  <h3>Configuration du build</h3>
  <div class="g2">
    <div class="fg">
      <label>Oversample reel (×)</label>
      <input type="number" id="bOvs" value="10" min="1" max="50">
    </div>
    <div class="fg">
      <label>Max printed synthetique <span style="color:#fbbf24;font-size:10px">(0 = le modele de base sait deja)</span></label>
      <input type="number" id="bPr" value="0" min="0">
    </div>
    <div class="fg">
      <label>Max handwritten synthetique</label>
      <input type="number" id="bHw" value="2000" min="0">
    </div>
    <div class="fg">
      <label>Split train/val (%)</label>
      <input type="number" id="bSplit" value="90" min="50" max="99">
    </div>
  </div>
  <div class="fg">
    <label>Format d'export</label>
    <div class="row" style="gap:20px;margin-top:6px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#e2e8f0">
        <input type="checkbox" id="fCSV" checked style="width:auto;accent-color:#2563eb">
        CSV (labels.csv + train/val)
      </label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#e2e8f0">
        <input type="checkbox" id="fHF" checked style="width:auto;accent-color:#2563eb">
        HuggingFace (metadata.jsonl)
      </label>
    </div>
  </div>
</div>

<div class="row" style="margin-bottom:16px">
  <button class="btn btn-success" id="buildBtn" onclick="runBuild()">🏗 Lancer le build</button>
  <button class="btn btn-secondary" onclick="manualBackup()">💾 Backup d'abord</button>
</div>
<div id="buildResult"></div>

<script>
async function loadComp() {
  const s=await fetch('/api/stats').then(r=>r.json());
  const t=s.total||1;
  document.getElementById('compStats').innerHTML=`
    <div class="sgrid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin:0">
      <div class="stat"><div class="lbl">Total</div><div class="val" style="font-size:20px">${s.total.toLocaleString()}</div></div>
      <div class="stat success"><div class="lbl">Reel</div>
        <div class="val" style="font-size:20px">${s.real.toLocaleString()}</div>
        <div class="sub">${(100*s.real/t).toFixed(1)}%</div></div>
      <div class="stat info"><div class="lbl">Synthetique</div>
        <div class="val" style="font-size:20px">${s.synthetic.toLocaleString()}</div>
        <div class="sub">${(100*s.synthetic/t).toFixed(1)}%</div></div>
      <div class="stat info"><div class="lbl">Augmente</div>
        <div class="val" style="font-size:20px">${s.augmented.toLocaleString()}</div>
        <div class="sub">${(100*s.augmented/t).toFixed(1)}%</div></div>
    </div>`;
}

async function manualBackup() {
  const d=await fetch('/api/backup').then(r=>r.json());
  alert(d.ok?'Backup: '+d.file:'Erreur: '+d.error);
}

async function runBuild() {
  const btn=document.getElementById('buildBtn');
  btn.disabled=true; btn.textContent='⏳ Build en cours…';
  document.getElementById('buildResult').innerHTML=
    '<div class="alert alert-info">Construction du dataset…</div>';

  const d=await fetch('/api/build/run',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      oversample_real: parseInt(document.getElementById('bOvs').value)||10,
      max_printed:     parseInt(document.getElementById('bPr').value)||2000,
      max_handwritten: parseInt(document.getElementById('bHw').value)||2000,
      train_split:     parseInt(document.getElementById('bSplit').value)/100,
      fmt_csv:         document.getElementById('fCSV').checked,
      fmt_hf:          document.getElementById('fHF').checked,
    })
  }).then(r=>r.json());

  if (d.ok) {
    document.getElementById('buildResult').innerHTML=`
      <div class="alert alert-ok" style="margin-bottom:12px">✅ Build termine</div>
      <div class="card"><h3>Resultat</h3>
      <table>
        <tr><th>Metrique</th><th>Valeur</th></tr>
        <tr><td>Total lignes</td><td><strong>${d.total.toLocaleString()}</strong></td></tr>
        <tr><td>Reel (×${d.oversample_real})</td><td>${d.real_count.toLocaleString()} (${d.real_pct}%)</td></tr>
        <tr><td>Synthetique</td><td>${d.synth_count.toLocaleString()} (${d.synth_pct}%)</td></tr>
        <tr><td>Train</td><td>${d.train_count.toLocaleString()}</td></tr>
        <tr><td>Val</td><td>${d.val_count.toLocaleString()}</td></tr>
        <tr><td>Labels uniques</td><td>${d.unique_labels.toLocaleString()}</td></tr>
        <tr><td>Fichiers ecrits</td><td>${d.files_written.join(', ')}</td></tr>
      </table></div>`;
  } else {
    document.getElementById('buildResult').innerHTML=
      `<div class="alert alert-err">Erreur: ${d.error}</div>`;
  }
  btn.disabled=false; btn.textContent='🏗 Lancer le build';
  loadComp();
}

loadComp();
</script>
"""
    return _page("Build & Export", "build", body)


# =============================================================================
#  Page 7 — Backups (auto-snapshot history, with manual snapshot + restore)
# =============================================================================
@app.route("/backups")
def page_backups():
    body = """
<h1>🗂️ Backups</h1>
<p class="subtitle">Auto-snapshots de votre travail — labels.csv, review_state.json, real_labels_reviewed.csv, arabic_labels.csv</p>

<div class="row" style="margin-bottom:14px">
  <button class="btn btn-success" onclick="snap()">📸 Snapshot maintenant</button>
  <span id="snapMsg" style="color:#94a3b8;font-size:13px;margin-left:8px"></span>
  <div style="flex:1"></div>
  <span id="counter" style="color:#64748b;font-size:13px"></span>
</div>

<div class="card" style="background:#0f172a;border:1px solid #1e293b">
  <p style="font-size:12px;color:#94a3b8;line-height:1.6">
    <b>Auto-snapshot</b> — chaque fois que vous sauvez une ligne en /review ou /clean,
    une copie horodatée est ajoutée dans <code>backups/AAAA-MM-JJ/</code>
    (max 1 par minute pour éviter le spam). Les fichiers sauvés:
    <code>labels.csv</code>, <code>review_state.json</code>,
    <code>real_labels_reviewed.csv</code>, <code>arabic_labels.csv</code>.
    Les snapshots ne sont jamais supprimés automatiquement.
  </p>
</div>

<div id="dayList" style="margin-top:18px"></div>

<script>
async function load() {
  const d = await fetch('/api/backups/list').then(r=>r.json());
  document.getElementById('counter').textContent =
    `${d.total_files} fichiers · ${d.total_size_kb} KB · ${d.days.length} jour(s)`;
  const out = d.days.map(day => {
    const rows = day.snapshots.map(s => `
      <tr>
        <td style="padding:6px 10px;color:#cbd5e1;font-family:monospace">${s.time}</td>
        <td style="padding:6px 10px;color:#94a3b8">${s.file}</td>
        <td style="padding:6px 10px;color:#64748b;text-align:right">${s.size_kb} KB</td>
        <td style="padding:6px 10px;text-align:right">
          <button class="btn btn-secondary" style="padding:3px 10px;font-size:11px"
            onclick="restore('${day.day}','${s.file}')">↩ Restaurer</button>
        </td>
      </tr>`).join('');
    return `
      <div class="card" style="margin-bottom:12px">
        <h3 style="margin:0 0 8px 0">${day.day} <span style="color:#64748b;font-size:12px">(${day.snapshots.length} snapshots, ${day.size_kb} KB)</span></h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:1px solid #334155;color:#64748b;text-align:left;font-size:11px;text-transform:uppercase">
            <th style="padding:6px 10px">Heure</th><th style="padding:6px 10px">Fichier</th>
            <th style="padding:6px 10px;text-align:right">Taille</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
  document.getElementById('dayList').innerHTML = out || '<p style="color:#64748b">Aucun snapshot pour le moment. Reviewez quelques lignes pour en générer.</p>';
}

async function snap() {
  const d = await fetch('/api/backups/snap', {method:'POST'}).then(r=>r.json());
  document.getElementById('snapMsg').textContent = d.ok
    ? `✓ Snapshot créé: ${d.path}`
    : `✗ ${d.error || 'erreur'}`;
  setTimeout(()=>{document.getElementById('snapMsg').textContent='';}, 4000);
  load();
}

async function restore(day, file) {
  if (!confirm(`Restaurer ${day}/${file} ?\\n\\nLe fichier actuel sera remplacé. Un snapshot du fichier actuel sera fait avant.`)) return;
  const d = await fetch('/api/backups/restore', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({day, file})
  }).then(r=>r.json());
  alert(d.ok ? `✓ Restauré ${file}` : `✗ ${d.error || 'erreur'}`);
  load();
}

load();
</script>
"""
    return _page("Backups", "backups", body)


@app.route("/api/backups/list")
def api_backups_list():
    """List all snapshots grouped by day."""
    if not BACKUP_DIR.exists():
        return jsonify({"days": [], "total_files": 0, "total_size_kb": 0})
    days = []
    total_files = 0
    total_size = 0
    # Day buckets: backups/YYYY-MM-DD/
    for day_dir in sorted(BACKUP_DIR.iterdir(), reverse=True):
        if not day_dir.is_dir():
            continue
        # Filter only date-like dirs
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", day_dir.name):
            continue
        snaps = []
        day_size = 0
        for f in sorted(day_dir.iterdir(), reverse=True):
            if not f.is_file():
                continue
            sz = f.stat().st_size
            day_size += sz
            total_size += sz
            total_files += 1
            # Extract HH-MM-SS from filename prefix
            m = re.match(r"^(\d{2}-\d{2}-\d{2})_(.+)", f.name)
            time_str = m.group(1).replace("-", ":") if m else "?"
            short_name = m.group(2) if m else f.name
            snaps.append({
                "time": time_str,
                "file": f.name,
                "short_name": short_name,
                "size_kb": round(sz / 1024, 1),
            })
        if snaps:
            days.append({
                "day": day_dir.name,
                "snapshots": snaps,
                "size_kb": round(day_size / 1024, 1),
            })
    # Also count legacy single-file backups in the root of BACKUP_DIR
    legacy = [f for f in BACKUP_DIR.iterdir() if f.is_file()]
    if legacy:
        legacy_snaps = [{
            "time": "—",
            "file": f.name,
            "short_name": f.name,
            "size_kb": round(f.stat().st_size / 1024, 1),
        } for f in sorted(legacy, reverse=True)]
        days.append({
            "day": "(legacy single-file backups)",
            "snapshots": legacy_snaps,
            "size_kb": round(sum(f.stat().st_size for f in legacy) / 1024, 1),
        })
        total_files += len(legacy)
        total_size += sum(f.stat().st_size for f in legacy)
    return jsonify({
        "days": days,
        "total_files": total_files,
        "total_size_kb": round(total_size / 1024, 1),
    })


@app.route("/api/backups/snap", methods=["POST"])
def api_backups_snap():
    """Manually trigger an immediate snapshot."""
    bucket = auto_snapshot("manual", force=True)
    if bucket:
        return jsonify({"ok": True, "path": bucket.name})
    return jsonify({"ok": False, "error": "No files to snapshot"})


@app.route("/api/backups/restore", methods=["POST"])
def api_backups_restore():
    """Restore a specific snapshot file back to its source location.
    Snapshots a fresh copy first (so the user can undo the restore)."""
    data = request.get_json(force=True)
    day  = (data.get("day") or "").strip()
    fn   = (data.get("file") or "").strip()
    if not (day and fn):
        return jsonify({"ok": False, "error": "missing day or file"})
    src = BACKUP_DIR / day / fn
    if not src.exists():
        # Maybe legacy single-file
        src = BACKUP_DIR / fn
    if not src.exists():
        return jsonify({"ok": False, "error": f"snapshot not found: {day}/{fn}"})

    # Identify the destination by matching the snapshot filename suffix
    short = re.sub(r"^\d{2}-\d{2}-\d{2}_", "", fn)
    target = None
    for label, get_path in _SNAP_TARGETS:
        p = get_path()
        if p.name == short:
            target = p
            break
    # Also handle legacy `labels_<ts>.csv` → labels.csv
    if target is None and fn.startswith("labels_") and fn.endswith(".csv"):
        target = LABELS_CSV
    if target is None:
        return jsonify({"ok": False, "error": f"don't know where to restore '{short}'"})

    # Snapshot current state before overwrite
    auto_snapshot(f"pre-restore", force=True)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)
        log_activity(f"backups: restored {fn} → {target.name}")
        return jsonify({"ok": True, "restored_to": str(target.relative_to(ROOT))})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)})


@app.route("/api/build/run", methods=["POST"])
def api_build_run():
    data            = request.get_json(force=True)
    oversample      = int(data.get("oversample_real", 10))
    max_printed     = int(data.get("max_printed", 2000))
    max_handwritten = int(data.get("max_handwritten", 2000))
    train_split     = float(data.get("train_split", 0.9))
    fmt_csv         = bool(data.get("fmt_csv", True))
    fmt_hf          = bool(data.get("fmt_hf", True))

    try:
        backup_labels()

        # Real labels — reviewed takes priority over auto
        auto_labels: dict[str, str] = {}
        if AUTO_CSV.exists():
            with open(AUTO_CSV, encoding="utf-8") as fh:
                for row in csv.DictReader(fh):
                    auto_labels[row["file_name"]] = (row.get("text") or "").strip()

        rev_map: dict[str, dict] = {}
        if REVIEWED_CSV.exists():
            with open(REVIEWED_CSV, encoding="utf-8") as fh:
                for row in csv.DictReader(fh):
                    rev_map[row["file_name"]] = row

        real_rows: list[dict] = []
        for fn, text in auto_labels.items():
            if fn in rev_map:
                if rev_map[fn].get("status") == "skip":
                    continue
                text = (rev_map[fn].get("text") or "").strip()
            if text and len(text) >= 2:
                real_rows.append({"file_name": fn, "text": text})

        # Also include non-synthetic rows already in labels.csv not in auto
        existing = load_labels()
        auto_fns = set(auto_labels.keys())
        for r in existing:
            fn = r.get("file_name", "")
            if fn and not fn.startswith(("printed_","handwritten_","aug_")) and fn not in auto_fns:
                real_rows.append(r)

        # Deduplicate real by file_name
        seen_r: dict[str, dict] = {}
        for r in real_rows:
            seen_r[r["file_name"]] = r
        real_rows = list(seen_r.values())

        random.seed(42)
        oversampled = real_rows * oversample
        random.shuffle(oversampled)

        printed_rows     = [r for r in existing if r.get("file_name","").startswith("printed_")]
        handwritten_rows = [r for r in existing if r.get("file_name","").startswith("handwritten_")]
        aug_rows         = [r for r in existing if r.get("file_name","").startswith("aug_")]

        printed_sel     = diverse_sample(printed_rows, max_printed)
        handwritten_sel = diverse_sample(handwritten_rows, max_handwritten)

        all_rows = oversampled + printed_sel + handwritten_sel + aug_rows
        random.shuffle(all_rows)

        # ── Frozen hold-out exclusion (added 2026-05-09) ─────────────────────
        # Lines listed in dataset/holdout_set.txt MUST never appear in train or val.
        # They are touched only by ocr-model/eval.py for thesis-defense evaluation.
        holdout = load_holdout_set()
        holdout_excluded = [r for r in all_rows if r["file_name"] in holdout]
        all_rows = [r for r in all_rows if r["file_name"] not in holdout]

        total        = len(all_rows)
        real_count   = len([r for r in oversampled if r["file_name"] not in holdout])
        synth_count  = len(printed_sel) + len(handwritten_sel)

        # ── Writer-stratified split (added 2026-05-09) ───────────────────────
        # Group lines by source prescription (writer/doctor) so a single document
        # never has its lines split across train/val. Prevents writing-style leakage.
        train_rows, val_rows = writer_stratified_split(all_rows, train_split, seed=42)

        files_written: list[str] = []

        if fmt_csv:
            save_labels(all_rows)
            files_written.append("labels.csv")
            if train_rows:
                with open(DATASET_DIR/"train_labels.csv","w",newline="",encoding="utf-8") as fh:
                    w = csv.DictWriter(fh, fieldnames=["file_name","text"], extrasaction="ignore")
                    w.writeheader(); w.writerows(train_rows)
                files_written.append("train_labels.csv")
            if val_rows:
                with open(DATASET_DIR/"val_labels.csv","w",newline="",encoding="utf-8") as fh:
                    w = csv.DictWriter(fh, fieldnames=["file_name","text"], extrasaction="ignore")
                    w.writeheader(); w.writerows(val_rows)
                files_written.append("val_labels.csv")

        if fmt_hf:
            with open(DATASET_DIR/"metadata.jsonl","w",encoding="utf-8") as fh:
                for r in all_rows:
                    fh.write(json.dumps(
                        {"file_name": r["file_name"], "text": r["text"]},
                        ensure_ascii=False,
                    ) + "\n")
            files_written.append("metadata.jsonl")

        unique_labels = len({r.get("text","") for r in all_rows})
        log_activity(
            f"build/run: total={total} real={real_count}"
            f"({100*real_count//max(total,1)}%) synth={synth_count} aug={len(aug_rows)}"
        )

        return jsonify({
            "ok":            True,
            "total":         total,
            "real_count":    real_count,
            "real_pct":      round(100 * real_count / max(total, 1), 1),
            "synth_count":   synth_count,
            "synth_pct":     round(100 * synth_count / max(total, 1), 1),
            "train_count":   len(train_rows),
            "val_count":     len(val_rows),
            "unique_labels": unique_labels,
            "oversample_real": oversample,
            "files_written": files_written,
            "holdout_excluded": len(holdout_excluded),
            "split_strategy":  "writer_stratified",
        })

    except Exception as e:
        log.exception("build/run error")
        return jsonify({"ok": False, "error": str(e)})


# =============================================================================
#  Entry point
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  PharMinds Dataset Tool")
    print(f"  Dataset : {LABELS_CSV}")
    print(f"  Images  : {IMAGES_DIR}")
    print("  Open    : http://localhost:5555")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5555, debug=False, threaded=True)
