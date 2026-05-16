"""
eval.py — Honest baseline + version comparison for PharMinds OCR

Computes:
- CER (character error rate)            — line-level OCR quality
- WER (word error rate)                 — word-level
- Drug-name accuracy                    — % of lines whose drug token matches a DB entry
- Length-normalized exact match         — % of lines correctly transcribed
- Per-line latency                      — wall-clock per inference

Two modes:
  1. Local: load a TrOCR checkpoint (HF model id or local path) and run on hold-out
  2. Remote: hit the deployed HF Space (`/scan` or `/v2/scan`) and eval responses

Usage:
    # Local — eval the current local checkpoint
    python ocr-model/eval.py --model Abdou-19/trocr-algerian-medical-onnx --version v1
    python ocr-model/eval.py --model microsoft/trocr-small-handwritten --version baseline

    # Remote — eval the deployed HF Space
    python ocr-model/eval.py --remote --version v1-deployed

Outputs:
    eval_results/{version}_{date}.json  — full per-line results + aggregates
    Appends summary row to BASELINES.md
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).parent
DATASET_DIR = ROOT / 'dataset'
RESULTS_DIR = ROOT / 'eval_results'
RESULTS_DIR.mkdir(exist_ok=True)
BASELINES_MD = ROOT.parent / 'BASELINES.md'
HOLDOUT_FILE = DATASET_DIR / 'holdout_set.txt'
LABELS_CSV = DATASET_DIR / 'labels.csv'
IMAGES_DIR = DATASET_DIR / 'images'


# ── Ground truth loading ─────────────────────────────────────────────────────
def load_holdout() -> List[Tuple[str, str]]:
    """Returns [(filename, ground_truth_text), ...] for hold-out files only."""
    holdout = []
    if HOLDOUT_FILE.exists():
        for line in HOLDOUT_FILE.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#'):
                holdout.append(line)
    holdout = set(holdout)

    rows = list(csv.DictReader(open(LABELS_CSV, encoding='utf-8')))
    pairs = [(r['file_name'], r['text']) for r in rows if r['file_name'] in holdout]
    print(f'Loaded {len(pairs)} hold-out samples (out of {len(holdout)} listed)')
    return pairs


# ── Metrics ──────────────────────────────────────────────────────────────────
def cer(pred: str, ref: str) -> float:
    """Character error rate via Levenshtein distance / ref length."""
    if not ref:
        return 1.0 if pred else 0.0
    return _levenshtein(pred, ref) / len(ref)


def wer(pred: str, ref: str) -> float:
    """Word error rate."""
    pred_w = pred.split()
    ref_w  = ref.split()
    if not ref_w:
        return 1.0 if pred_w else 0.0
    return _levenshtein_seq(pred_w, ref_w) / len(ref_w)


def _levenshtein(a: str, b: str) -> int:
    return _levenshtein_seq(list(a), list(b))


def _levenshtein_seq(a: list, b: list) -> int:
    if len(a) < len(b):
        a, b = b, a
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            curr.append(min(prev[j+1] + 1, curr[j] + 1, prev[j] + cost))
        prev = curr
    return prev[-1]


# ── Drug-name accuracy via DrugMatcher (DB-grounded, fuzzy/phonetic) ─────────
sys.path.insert(0, str(ROOT / 'postprocess'))
try:
    from matcher import DrugMatcher  # type: ignore
    _MATCHER: DrugMatcher | None = None
    def get_matcher() -> DrugMatcher:
        global _MATCHER
        if _MATCHER is None:
            _MATCHER = DrugMatcher.from_cache()
        return _MATCHER
except ImportError:
    DrugMatcher = None  # type: ignore
    def get_matcher():
        return None


def drug_match_score(pred: str, ref: str) -> tuple[float, str | None, str | None]:
    """Score one prediction against ground truth via DrugMatcher.

    Returns (score, ref_drug_id, pred_drug_id) where:
      - score = 1.0 if pred and ref both ground to the same drug_id
              = 0.0 if they ground to different drug_ids (or pred unmatched)
              = -1.0 if ref has no drug at all (skip row from drug-acc)
    """
    matcher = get_matcher()
    if matcher is None:
        return -1.0, None, None

    ref_matches = matcher.match_text(ref)
    if not ref_matches:
        return -1.0, None, None  # nothing to score against

    pred_matches = matcher.match_text(pred)
    ref_ids = {r.drug_id for r in ref_matches if r.drug_id}
    pred_ids = {r.drug_id for r in pred_matches if r.drug_id}

    if not pred_ids:
        return 0.0, next(iter(ref_ids)), None
    # Score = intersection / ref_set (recall on drug entities)
    matched = ref_ids & pred_ids
    return (len(matched) / len(ref_ids)), next(iter(ref_ids)), next(iter(pred_ids))


# ── Inference backends ───────────────────────────────────────────────────────
def predict_local(model_id: str, samples: List[Tuple[str, str]]):
    """Run a local TrOCR / HF model on each hold-out image."""
    print(f'Loading model: {model_id}')
    from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    import torch
    from PIL import Image

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f'Device: {device}')

    processor = TrOCRProcessor.from_pretrained(model_id)
    model = VisionEncoderDecoderModel.from_pretrained(model_id).to(device).eval()

    results = []
    for fn, ref in samples:
        img_path = IMAGES_DIR / fn
        if not img_path.exists():
            print(f'  ⚠ missing image: {fn}')
            continue
        img = Image.open(img_path).convert('RGB')
        t0 = time.time()
        with torch.no_grad():
            pixel_values = processor(images=img, return_tensors='pt').pixel_values.to(device)
            ids = model.generate(pixel_values, max_length=128)
            pred = processor.batch_decode(ids, skip_special_tokens=True)[0]
        dt_ms = (time.time() - t0) * 1000
        results.append({'file_name': fn, 'ref': ref, 'pred': pred, 'latency_ms': dt_ms})
    return results


def predict_remote(url: str, samples: List[Tuple[str, str]]):
    """Hit a deployed HF Space endpoint (auto-detects v1 vs v2 by response shape)."""
    import requests

    results = []
    for fn, ref in samples:
        img_path = IMAGES_DIR / fn
        if not img_path.exists():
            continue
        with open(img_path, 'rb') as f:
            t0 = time.time()
            try:
                r = requests.post(url, files={'file': f}, timeout=180)
            except Exception as e:
                print(f'  ⚠ {fn}: {type(e).__name__}: {str(e)[:80]}')
                continue
            dt_ms = (time.time() - t0) * 1000
        if not r.ok:
            print(f'  ⚠ {fn}: HTTP {r.status_code}')
            continue
        try:
            data = r.json()
        except Exception:
            continue
        # v2 returns line_crops with .text directly
        # v1 returns raw_ocr: [str, ...]
        if 'line_crops' in data and data.get('line_crops') and 'text' in data['line_crops'][0]:
            pred = ' '.join(c.get('text', '') for c in data['line_crops'])
        else:
            pred_lines = data.get('raw_ocr') or []
            pred = ' '.join(pred_lines) if isinstance(pred_lines, list) else str(pred_lines)
        results.append({'file_name': fn, 'ref': ref, 'pred': pred, 'latency_ms': dt_ms})
    return results


# ── Aggregation + reporting ──────────────────────────────────────────────────
def aggregate(results: list) -> dict:
    cers = [cer(r['pred'], r['ref']) for r in results]
    wers = [wer(r['pred'], r['ref']) for r in results]
    exacts = [1.0 if r['pred'].strip() == r['ref'].strip() else 0.0 for r in results]

    drug_results = [drug_match_score(r['pred'], r['ref']) for r in results]
    drug_evaluable = [s for s, _, _ in drug_results if s >= 0]
    drug_acc = sum(drug_evaluable) / len(drug_evaluable) if drug_evaluable else 0.0

    # Annotate per-row results so the JSON output shows the matched drugs
    for r, (score, ref_id, pred_id) in zip(results, drug_results):
        r['drug_score'] = score
        r['ref_drug_id'] = ref_id
        r['pred_drug_id'] = pred_id

    latencies = [r['latency_ms'] for r in results]
    p50 = sorted(latencies)[len(latencies)//2] if latencies else 0
    p95 = sorted(latencies)[int(len(latencies)*0.95)] if latencies else 0

    return {
        'n_samples': len(results),
        'cer_mean': sum(cers) / max(1, len(cers)),
        'wer_mean': sum(wers) / max(1, len(wers)),
        'exact_match': sum(exacts) / max(1, len(exacts)),
        'drug_name_acc': drug_acc,
        'drug_evaluable': len(drug_evaluable),
        'latency_p50_ms': p50,
        'latency_p95_ms': p95,
    }


def append_to_baselines(version: str, agg: dict, model_id: str):
    """Append a one-row summary to BASELINES.md (creates file if missing)."""
    if not BASELINES_MD.exists():
        BASELINES_MD.write_text(
            "# OCR Model Baselines\n\n"
            "Tracked metrics on the frozen hold-out set "
            "(`ocr-model/dataset/holdout_set.txt`).\n\n"
            "| Date | Version | Model | N | CER | WER | Drug-acc | Exact | P50 ms | P95 ms |\n"
            "|------|---------|-------|---|-----|-----|----------|-------|--------|--------|\n",
            encoding='utf-8',
        )
    row = (
        f"| {datetime.now().strftime('%Y-%m-%d')} | {version} | `{model_id}` "
        f"| {agg['n_samples']} | {agg['cer_mean']*100:.2f}% | {agg['wer_mean']*100:.2f}% "
        f"| {agg['drug_name_acc']*100:.2f}% (n={agg['drug_evaluable']}) "
        f"| {agg['exact_match']*100:.2f}% "
        f"| {agg['latency_p50_ms']:.0f} | {agg['latency_p95_ms']:.0f} |\n"
    )
    with open(BASELINES_MD, 'a', encoding='utf-8') as f:
        f.write(row)


# ── CLI ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='Abdou-19/trocr-algerian-medical-onnx',
                        help='HF model id or local path (ignored if --remote)')
    parser.add_argument('--remote', action='store_true',
                        help='Use deployed HF Space instead of local model')
    parser.add_argument('--remote-url', default='https://abdou-19-pharminds-ocr-api.hf.space/scan')
    parser.add_argument('--version', required=True, help='Tag for this run, e.g. v1, v2, baseline')
    args = parser.parse_args()

    samples = load_holdout()
    if not samples:
        print('No hold-out samples — aborting')
        sys.exit(1)

    if args.remote:
        results = predict_remote(args.remote_url, samples)
        model_id = args.remote_url
    else:
        results = predict_local(args.model, samples)
        model_id = args.model

    agg = aggregate(results)
    out_file = RESULTS_DIR / f'{args.version}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({'version': args.version, 'model': model_id, 'aggregate': agg, 'rows': results},
                  f, ensure_ascii=False, indent=2)

    print('\n=== EVAL SUMMARY ===')
    print(f'Model        : {model_id}')
    print(f'Version tag  : {args.version}')
    print(f'N samples    : {agg["n_samples"]}')
    print(f'CER          : {agg["cer_mean"]*100:.2f}%')
    print(f'WER          : {agg["wer_mean"]*100:.2f}%')
    print(f'Drug-acc     : {agg["drug_name_acc"]*100:.2f}% (n={agg["drug_evaluable"]} evaluable)')
    print(f'Exact match  : {agg["exact_match"]*100:.2f}%')
    print(f'Latency P50  : {agg["latency_p50_ms"]:.0f} ms')
    print(f'Latency P95  : {agg["latency_p95_ms"]:.0f} ms')
    print(f'\nResults: {out_file}')

    append_to_baselines(args.version, agg, model_id)
    print(f'Updated: {BASELINES_MD}')


if __name__ == '__main__':
    main()
