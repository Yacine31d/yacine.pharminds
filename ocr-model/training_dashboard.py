"""
training_dashboard.py  — PharMinds TrOCR Training Dashboard

Serves a real-time web dashboard showing training progress, loss curve,
CER curve, and model stats. Works during training AND after it finishes.

Run:
    python ocr-model/training_dashboard.py
Open: http://localhost:8766
"""

import glob
import json
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

ROOT = Path(__file__).parent
LIVE_JSON = ROOT / "training_live.json"
TRAIN_DIR = ROOT.parent / "trocr-algerian-medical"
FINAL_DIR = ROOT.parent / "trocr-algerian-medical-final"

app = FastAPI(title="PharMinds Training Dashboard")


def load_history() -> list[dict]:
    """Load full log history from the latest checkpoint trainer_state.json."""
    states = sorted(TRAIN_DIR.glob("checkpoint-*/trainer_state.json"))
    if not states:
        return []
    try:
        return json.loads(states[-1].read_text(encoding="utf-8"))["log_history"]
    except Exception:
        return []


def load_live() -> dict:
    try:
        return json.loads(LIVE_JSON.read_text(encoding="utf-8"))
    except Exception:
        return {}


def training_status() -> str:
    live = load_live()
    step = live.get("step", 0)
    max_steps = live.get("max_steps", 0)
    if FINAL_DIR.exists():
        return "complete"
    if max_steps > 0 and step >= max_steps:
        return "complete"
    if step > 0:
        return "running"
    return "idle"


@app.get("/api/metrics")
def metrics() -> JSONResponse:
    history = load_history()
    live = load_live()

    train_steps = [e["step"] for e in history if "loss" in e]
    train_loss  = [e["loss"] for e in history if "loss" in e]
    eval_steps  = [e["step"] for e in history if "eval_cer" in e]
    eval_cer    = [e["eval_cer"] for e in history if "eval_cer" in e]
    eval_loss   = [e.get("eval_loss") for e in history if "eval_cer" in e]

    best_cer = min(eval_cer) if eval_cer else None
    best_epoch = None
    if best_cer is not None:
        idx = eval_cer.index(best_cer)
        best_entry = [e for e in history if "eval_cer" in e][idx]
        best_epoch = best_entry.get("epoch")
    final_cer = eval_cer[-1] if eval_cer else None

    checkpoints = sorted(TRAIN_DIR.glob("checkpoint-*"))

    return JSONResponse({
        "status": training_status(),
        "live": live,
        "train_steps": train_steps,
        "train_loss": train_loss,
        "eval_steps": eval_steps,
        "eval_cer": eval_cer,
        "eval_loss": eval_loss,
        "best_cer": best_cer,
        "best_epoch": best_epoch,
        "final_cer": final_cer,
        "final_model_exists": FINAL_DIR.exists(),
        "checkpoints": [c.name for c in checkpoints],
        "total_log_entries": len(history),
    })


HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>PharMinds — Training Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
         min-height: 100vh; padding: 24px; }
  h1 { font-size: 22px; font-weight: 700; color: #f8fafc; }
  .sub { color: #94a3b8; font-size: 13px; margin-top: 4px; }
  header { margin-bottom: 28px; display: flex; align-items: flex-start;
           justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .badge { display: inline-flex; align-items: center; gap: 6px;
           padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .badge.running { background: #1e3a5f; color: #60a5fa; }
  .badge.complete { background: #14532d; color: #4ade80; }
  .badge.idle { background: #1e293b; color: #94a3b8; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor;
         animation: pulse 1.5s infinite; }
  .complete .dot, .idle .dot { animation: none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px; margin-bottom: 28px; }
  .card { background: #1e293b; border-radius: 12px; padding: 20px; }
  .card .label { font-size: 11px; color: #64748b; text-transform: uppercase;
                 letter-spacing: .05em; margin-bottom: 8px; }
  .card .value { font-size: 28px; font-weight: 700; color: #f8fafc; }
  .card .value.green { color: #4ade80; }
  .card .value.blue { color: #60a5fa; }
  .card .value.yellow { color: #fbbf24; }
  .card .hint { font-size: 11px; color: #475569; margin-top: 4px; }

  .progress-wrap { background: #1e293b; border-radius: 12px; padding: 20px;
                   margin-bottom: 28px; }
  .progress-label { display: flex; justify-content: space-between;
                    font-size: 13px; color: #94a3b8; margin-bottom: 10px; }
  .bar-bg { background: #0f172a; border-radius: 6px; height: 10px; overflow: hidden; }
  .bar-fill { background: linear-gradient(90deg, #3b82f6, #8b5cf6);
              height: 100%; border-radius: 6px; transition: width .4s; }

  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
            margin-bottom: 28px; }
  @media (max-width: 700px) { .charts { grid-template-columns: 1fr; } }
  .chart-card { background: #1e293b; border-radius: 12px; padding: 20px; }
  .chart-card h3 { font-size: 14px; font-weight: 600; color: #94a3b8;
                   margin-bottom: 16px; }

  .ckpt-list { background: #1e293b; border-radius: 12px; padding: 20px; }
  .ckpt-list h3 { font-size: 14px; color: #94a3b8; margin-bottom: 12px; }
  .ckpt-item { font-size: 13px; color: #60a5fa; font-family: monospace;
               padding: 4px 0; border-bottom: 1px solid #0f172a; }
  .ckpt-item:last-child { border: none; }

  .refresh-note { text-align: center; color: #334155; font-size: 12px; margin-top: 24px; }
</style>
</head>
<body>
<header>
  <div>
    <h1>PharMinds — TrOCR Training Dashboard</h1>
    <p class="sub">Fine-tuning microsoft/trocr-base-handwritten on Algerian prescriptions</p>
  </div>
  <div id="statusBadge" class="badge idle"><span class="dot"></span> Loading...</div>
</header>

<div class="progress-wrap">
  <div class="progress-label">
    <span id="stepLabel">Step 0 / ?</span>
    <span id="epochLabel">Epoch 0</span>
  </div>
  <div class="bar-bg"><div class="bar-fill" id="progressBar" style="width:0%"></div></div>
</div>

<div class="grid">
  <div class="card">
    <div class="label">Best Eval CER</div>
    <div class="value green" id="bestCer">—</div>
    <div class="hint" id="bestEpoch">—</div>
  </div>
  <div class="card">
    <div class="label">Final Eval CER</div>
    <div class="value blue" id="finalCer">—</div>
    <div class="hint">Last epoch</div>
  </div>
  <div class="card">
    <div class="label">Current Loss</div>
    <div class="value yellow" id="curLoss">—</div>
    <div class="hint">Training loss</div>
  </div>
  <div class="card">
    <div class="label">Final Model</div>
    <div class="value" id="finalModel">—</div>
    <div class="hint">trocr-algerian-medical-final</div>
  </div>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>Training Loss Curve</h3>
    <canvas id="lossChart" height="180"></canvas>
  </div>
  <div class="chart-card">
    <h3>Eval CER per Epoch</h3>
    <canvas id="cerChart" height="180"></canvas>
  </div>
</div>

<div class="ckpt-list">
  <h3>Saved Checkpoints</h3>
  <div id="ckptList"></div>
</div>

<p class="refresh-note">Auto-refreshes every 15 seconds</p>

<script>
let lossChart, cerChart;

function makeChart(id, label, color, yLabel) {
  const ctx = document.getElementById(id).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label, data: [], borderColor: color,
      backgroundColor: color + '22', fill: true, tension: 0.3,
      pointRadius: 0, borderWidth: 2 }] },
    options: {
      animation: false,
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#475569', maxTicksLimit: 8 },
             grid: { color: '#1e293b' } },
        y: { ticks: { color: '#475569' }, grid: { color: '#1e293b' },
             title: { display: true, text: yLabel, color: '#475569', font: { size: 11 } } }
      }
    }
  });
}

function pct(v) { return (v * 100).toFixed(2) + '%'; }

async function refresh() {
  const r = await fetch('/api/metrics');
  const d = await r.json();

  // Status badge
  const badge = document.getElementById('statusBadge');
  badge.className = 'badge ' + d.status;
  badge.innerHTML = `<span class="dot"></span> ${d.status.toUpperCase()}`;

  // Progress
  const live = d.live || {};
  const step = live.step || (d.train_steps.at(-1) ?? 0);
  const maxSteps = live.max_steps || (d.train_steps.at(-1) ?? 1);
  const epoch = live.epoch || 0;
  document.getElementById('stepLabel').textContent = `Step ${step} / ${maxSteps}`;
  document.getElementById('epochLabel').textContent = `Epoch ${typeof epoch === 'number' ? epoch.toFixed(1) : epoch}`;
  const pctDone = maxSteps > 0 ? (step / maxSteps * 100).toFixed(1) : 100;
  document.getElementById('progressBar').style.width = pctDone + '%';

  // Stat cards
  if (d.best_cer != null) {
    document.getElementById('bestCer').textContent = pct(d.best_cer);
    document.getElementById('bestEpoch').textContent = d.best_epoch != null ? `Epoch ${d.best_epoch.toFixed(0)}` : '';
  }
  if (d.final_cer != null)
    document.getElementById('finalCer').textContent = pct(d.final_cer);

  const curLoss = live.loss || d.train_loss?.at(-1);
  if (curLoss != null)
    document.getElementById('curLoss').textContent = curLoss.toFixed(4);

  const fm = document.getElementById('finalModel');
  fm.textContent = d.final_model_exists ? 'Ready' : 'Training...';
  fm.className = 'value ' + (d.final_model_exists ? 'green' : 'yellow');

  // Loss chart — subsample to max 200 points for performance
  if (d.train_steps.length > 0) {
    const step_count = d.train_steps.length;
    const skip = Math.max(1, Math.floor(step_count / 200));
    const steps = d.train_steps.filter((_, i) => i % skip === 0);
    const losses = d.train_loss.filter((_, i) => i % skip === 0);
    lossChart.data.labels = steps;
    lossChart.data.datasets[0].data = losses;
    lossChart.update('none');
  }

  // CER chart
  if (d.eval_steps.length > 0) {
    cerChart.data.labels = d.eval_steps.map((_, i) => 'Epoch ' + (i + 1));
    cerChart.data.datasets[0].data = d.eval_cer.map(v => (v * 100).toFixed(3));
    cerChart.update('none');
  }

  // Checkpoints
  const ckptDiv = document.getElementById('ckptList');
  if (d.checkpoints.length > 0) {
    ckptDiv.innerHTML = d.checkpoints.map(c =>
      `<div class="ckpt-item">${c}</div>`
    ).join('') + (d.final_model_exists ? '<div class="ckpt-item" style="color:#4ade80">trocr-algerian-medical-final  ✓ (final)</div>' : '');
  } else {
    ckptDiv.textContent = 'No checkpoints yet.';
  }
}

// Init charts
lossChart = makeChart('lossChart', 'Train Loss', '#3b82f6', 'Loss');
cerChart   = makeChart('cerChart',  'Eval CER %', '#8b5cf6', 'CER (%)');

refresh();
setInterval(refresh, 15000);
</script>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse(HTML)


if __name__ == "__main__":
    import uvicorn
    print("[dashboard] http://localhost:8766")
    uvicorn.run(app, host="127.0.0.1", port=8766)
