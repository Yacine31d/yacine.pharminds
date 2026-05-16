#!/usr/bin/env bash
# Two-stage TrOCR training launcher.
# Logs everything to logs/two_stage_<timestamp>.log so you can tail later.

set -e
cd "$(dirname "$0")"

mkdir -p logs checkpoints
TS=$(date +%Y%m%d_%H%M%S)
LOG="logs/two_stage_${TS}.log"

echo "=== Two-stage TrOCR training ===" | tee "$LOG"
echo "Started: $(date)"                 | tee -a "$LOG"
echo "Log file: $LOG"                   | tee -a "$LOG"
echo                                    | tee -a "$LOG"

# Force UTF-8 stdout (Windows console safety)
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# ── Stage 1 — synth_v2 warmup ─────────────────────────────────────────────────
echo "[$(date +%H:%M:%S)] Stage 1: warmup (2 epochs on synth_v2)" | tee -a "$LOG"
python train_trocr.py \
    --stage warmup \
    --epochs 2 \
    --lr 5e-5 \
    --output checkpoints/v2_warmup \
    2>&1 | tee -a "$LOG"

if [ ! -d "checkpoints/v2_warmup/final" ]; then
    echo "[ERROR] Stage 1 didn't produce checkpoints/v2_warmup/final — aborting" | tee -a "$LOG"
    exit 1
fi
echo "[$(date +%H:%M:%S)] Stage 1 done"  | tee -a "$LOG"

# ── Stage 2 — real-data fine-tune ─────────────────────────────────────────────
echo "[$(date +%H:%M:%S)] Stage 2: real-data fine-tune (8 epochs)" | tee -a "$LOG"
python train_trocr.py \
    --stage real \
    --epochs 8 \
    --lr 1e-5 \
    --resume-from checkpoints/v2_warmup/final \
    --output checkpoints/v2 \
    2>&1 | tee -a "$LOG"

echo "[$(date +%H:%M:%S)] Stage 2 done — final model at checkpoints/v2/final" | tee -a "$LOG"
echo "Finished: $(date)" | tee -a "$LOG"
