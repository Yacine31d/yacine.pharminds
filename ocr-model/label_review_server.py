"""
Label Review Server - PharMinds Day 1 tool

A tiny FastAPI app that lets you fly through line-crop images and fix
their labels. Keyboard-driven, autosaves, designed for ~167+ images
in one sitting.

Run:
    python ocr-model/label_review_server.py

Open: http://localhost:8765

Inputs:
    real_data_lines/*.jpg                  -> the line crops
    real_data_lines/real_annotations.csv   -> Gemini's auto-labels (seed)

Output:
    real_data_lines/real_labels_reviewed.csv  (file_name, text, status)
        status in {ok, blank, skip}
"""

import csv
import os
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).parent
LINES_DIR = ROOT / "real_data_lines"
SEED_CSV = LINES_DIR / "real_annotations.csv"
OUT_CSV = LINES_DIR / "real_labels_reviewed.csv"


def load_seed() -> Dict[str, str]:
    seed: Dict[str, str] = {}
    if SEED_CSV.exists():
        with open(SEED_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                seed[row["file_name"]] = (row.get("text") or "").strip()
    return seed


def load_reviewed() -> Dict[str, Dict[str, str]]:
    rows: Dict[str, Dict[str, str]] = {}
    if OUT_CSV.exists():
        with open(OUT_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rows[row["file_name"]] = row
    return rows


def save_reviewed(rows: Dict[str, Dict[str, str]]) -> None:
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file_name", "text", "status"])
        w.writeheader()
        for fn in sorted(rows.keys()):
            w.writerow(rows[fn])


def list_images() -> list[str]:
    files = [f.name for f in LINES_DIR.iterdir()
             if f.suffix.lower() in {".jpg", ".jpeg", ".png"} and "_line_" in f.name]
    files.sort()
    return files


app = FastAPI(title="PharMinds Label Review")
app.mount("/img", StaticFiles(directory=str(LINES_DIR)), name="img")


INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PharMinds - Label Review</title>
<style>
  body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0;
         margin:0; padding:24px; }
  .wrap { max-width:1100px; margin:0 auto; }
  h1 { font-size:18px; margin:0 0 12px; color:#94a3b8; font-weight:500; }
  .progress { background:#1e293b; height:6px; border-radius:3px; overflow:hidden; margin-bottom:16px; }
  .progress > div { background:#22c55e; height:100%; transition:width .15s; }
  .imgbox { background:#fff; border-radius:8px; padding:16px; text-align:center; margin-bottom:16px; }
  .imgbox img { max-width:100%; max-height:260px; image-rendering: pixelated; }
  .meta { color:#64748b; font-size:12px; margin-bottom:8px; }
  textarea { width:100%; box-sizing:border-box; font-size:20px; padding:14px;
             background:#1e293b; color:#f1f5f9; border:2px solid #334155;
             border-radius:8px; font-family: 'Consolas', monospace; }
  textarea:focus { outline:none; border-color:#3b82f6; }
  .row { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
  button { background:#3b82f6; color:white; border:0; padding:10px 16px;
           border-radius:6px; cursor:pointer; font-size:14px; }
  button.alt { background:#475569; }
  button.warn { background:#dc2626; }
  button:hover { filter:brightness(1.1); }
  .help { color:#64748b; font-size:12px; margin-top:16px; line-height:1.7; }
  kbd { background:#1e293b; padding:2px 6px; border-radius:3px; font-family:monospace; color:#f1f5f9; }
  .status { display:inline-block; padding:2px 8px; border-radius:3px; font-size:11px; margin-left:8px; }
  .status.ok { background:#16a34a; }
  .status.blank { background:#64748b; }
  .status.skip { background:#eab308; color:#000; }
  .status.todo { background:#475569; }
  .nav { display:flex; gap:8px; align-items:center; margin-bottom:16px; }
  .nav input { width:80px; padding:6px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>PharMinds — Label Review <span id="counter"></span></h1>
  <div class="progress"><div id="bar" style="width:0%"></div></div>

  <div class="nav">
    <button class="alt" onclick="go(-1)">&larr; Prev</button>
    <button class="alt" onclick="go(1)">Next &rarr;</button>
    <input id="jumpInput" type="number" placeholder="#" />
    <button class="alt" onclick="jump()">Jump</button>
    <span class="meta" id="filename"></span>
    <span id="statusBadge"></span>
  </div>

  <div class="imgbox"><img id="img" src="" /></div>

  <textarea id="text" rows="2" placeholder="Type the exact text you see..." spellcheck="false"></textarea>

  <div class="row">
    <button onclick="saveAndNext('ok')">Save &amp; Next  <kbd>Enter</kbd></button>
    <button class="alt" onclick="saveAndNext('blank')">Mark Blank  <kbd>Shift+Enter</kbd></button>
    <button class="warn" onclick="saveAndNext('skip')">Skip (bad crop)  <kbd>Ctrl+Enter</kbd></button>
  </div>

  <div class="help">
    Shortcuts: <kbd>Enter</kbd> save &amp; next &middot;
    <kbd>Shift+Enter</kbd> mark blank &middot;
    <kbd>Ctrl+Enter</kbd> skip bad crop &middot;
    <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> navigate &middot;
    <kbd>Tab</kbd> jump to next unreviewed.
    <br/>Tip: type exactly what you see, including spelling errors and abbreviations
    (e.g. "1 cp x 3/j", "Doliprane 1000mg"). This is the gold-truth for fine-tuning.
  </div>
</div>

<script>
let files = [];
let reviewed = {};
let seed = {};
let idx = 0;

async function load() {
  const r = await fetch('/api/state');
  const data = await r.json();
  files = data.files;
  reviewed = data.reviewed;
  seed = data.seed || {};
  // jump to first unreviewed
  idx = files.findIndex(f => !reviewed[f]);
  if (idx === -1) idx = 0;
  render();
}

function render() {
  const fn = files[idx];
  document.getElementById('img').src = '/img/' + encodeURIComponent(fn);
  document.getElementById('filename').textContent = fn;
  document.getElementById('counter').textContent = `(${idx+1}/${files.length})`;
  const done = Object.keys(reviewed).length;
  document.getElementById('bar').style.width = (100*done/files.length) + '%';

  const r = reviewed[fn];
  const txt = document.getElementById('text');
  txt.value = r ? r.text : (seed[fn] || '');
  txt.focus();
  txt.select();

  const badge = document.getElementById('statusBadge');
  if (r) {
    badge.innerHTML = `<span class="status ${r.status}">${r.status}</span>`;
  } else {
    badge.innerHTML = `<span class="status todo">unreviewed</span>`;
  }
}

async function saveAndNext(status) {
  const fn = files[idx];
  const text = document.getElementById('text').value.trim();
  await fetch('/api/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({file_name: fn, text: status === 'blank' ? '' : text, status})
  });
  reviewed[fn] = {file_name: fn, text: status === 'blank' ? '' : text, status};
  go(1);
}

function go(delta) {
  idx = Math.max(0, Math.min(files.length - 1, idx + delta));
  render();
}

function jump() {
  const v = parseInt(document.getElementById('jumpInput').value, 10);
  if (!isNaN(v)) { idx = Math.max(0, Math.min(files.length - 1, v - 1)); render(); }
}

function nextUnreviewed() {
  for (let i = idx + 1; i < files.length; i++) {
    if (!reviewed[files[i]]) { idx = i; render(); return; }
  }
}

document.addEventListener('keydown', (e) => {
  const t = document.getElementById('text');
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) { e.preventDefault(); saveAndNext('ok'); }
  else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); saveAndNext('blank'); }
  else if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveAndNext('skip'); }
  else if (e.key === 'Tab' && document.activeElement === t) { e.preventDefault(); nextUnreviewed(); }
  else if (e.key === 'ArrowLeft' && document.activeElement !== t) { go(-1); }
  else if (e.key === 'ArrowRight' && document.activeElement !== t) { go(1); }
});

load();
</script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse(INDEX_HTML)


@app.get("/api/state")
def state() -> JSONResponse:
    files = list_images()
    seed = load_seed()
    reviewed = load_reviewed()

    # Seed any unreviewed files with Gemini's guess so the textarea isn't empty.
    seeded = {}
    for fn in files:
        if fn in reviewed:
            seeded[fn] = reviewed[fn]
    return JSONResponse({
        "files": files,
        "reviewed": seeded,
        "seed": {fn: seed.get(fn, "") for fn in files},
    })


@app.post("/api/save")
async def save(req: Request) -> JSONResponse:
    body = await req.json()
    fn = body["file_name"]
    text = (body.get("text") or "").strip()
    status = body.get("status", "ok")
    if status not in {"ok", "blank", "skip"}:
        status = "ok"
    rows = load_reviewed()
    rows[fn] = {"file_name": fn, "text": text, "status": status}
    save_reviewed(rows)
    return JSONResponse({"ok": True, "count": len(rows)})


# Serve seeded text from Gemini in the same response, so the JS can pre-fill
# unreviewed rows. We attach it via /api/state above.

if __name__ == "__main__":
    import uvicorn
    print(f"[label-review] images dir: {LINES_DIR}")
    print(f"[label-review] output: {OUT_CSV}")
    print(f"[label-review] open http://localhost:8765")
    uvicorn.run(app, host="127.0.0.1", port=8765)
