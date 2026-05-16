"""
promote_feedback.py — Active-learning loop closure.

The HF Space `/v2/feedback` endpoint accepts user corrections (when a
pharmacist fixes a misread line in the scanner UI) and writes them to
`dataset/feedback_log/<date>.jsonl`. This script promotes those corrections
back into the canonical dataset so the next training round consumes them.

Idempotent — safe to re-run. Tracks promoted entries via a simple processed-
list to avoid duplicates.

Workflow:
  1. Read all .jsonl files in dataset/feedback_log/
  2. Validate each correction via Pydantic (LineAnnotation)
  3. Check if file_name already exists in real_data_lines/ + reviewed CSV
  4. If new: copy image to real_data_lines/, append to real_labels_reviewed.csv
  5. If existing with different text: log conflict, skip
  6. Mark feedback file as processed in dataset/feedback_log/.processed.json

Run:
    python ocr-model/promote_feedback.py [--dry-run]
"""
from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
from schema import LineAnnotation, FeedbackPayload  # noqa: E402

DATASET     = ROOT / "dataset"
FEEDBACK    = DATASET / "feedback_log"
PROCESSED   = FEEDBACK / ".processed.json"
LINES_DIR   = ROOT / "real_data_lines"
REVIEWED    = LINES_DIR / "real_labels_reviewed.csv"


def load_processed() -> set[str]:
    if not PROCESSED.exists():
        return set()
    return set(json.loads(PROCESSED.read_text(encoding="utf-8")))


def save_processed(s: set[str]) -> None:
    PROCESSED.parent.mkdir(parents=True, exist_ok=True)
    PROCESSED.write_text(json.dumps(sorted(s), indent=2), encoding="utf-8")


def load_reviewed() -> dict[str, dict]:
    if not REVIEWED.exists():
        return {}
    out = {}
    for r in csv.DictReader(open(REVIEWED, encoding="utf-8")):
        out[r["file_name"]] = r
    return out


def save_reviewed(rows: dict[str, dict]) -> None:
    LINES_DIR.mkdir(parents=True, exist_ok=True)
    with open(REVIEWED, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file_name", "text", "status"])
        w.writeheader()
        for r in sorted(rows.values(), key=lambda x: x["file_name"]):
            w.writerow(r)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Don't write anything")
    args = parser.parse_args()

    if not FEEDBACK.exists():
        print(f"No feedback yet at {FEEDBACK} (this is normal — runs without effect)")
        return

    processed = load_processed()
    reviewed = load_reviewed()

    feedback_files = sorted(FEEDBACK.glob("*.jsonl"))
    print(f"Feedback files: {len(feedback_files)}, processed: {len(processed)}")

    new_corrections = 0
    new_files = 0
    conflicts = 0
    schema_rejects = 0
    duplicates = 0

    for fp in feedback_files:
        if fp.name in processed:
            continue
        for ln_no, ln in enumerate(fp.read_text(encoding="utf-8").splitlines(), 1):
            if not ln.strip():
                continue
            try:
                record = json.loads(ln)
                payload = FeedbackPayload.model_validate(record)
            except Exception as e:
                print(f"  ✗ {fp.name}:L{ln_no} schema reject: {e}")
                schema_rejects += 1
                continue

            for corr in payload.corrections:
                # Validate the line annotation itself
                try:
                    la = LineAnnotation(file_name=corr.file_name,
                                        text=corr.text, status=corr.status)
                except Exception as e:
                    print(f"  ✗ skip {corr.file_name}: {e}")
                    schema_rejects += 1
                    continue

                existing = reviewed.get(la.file_name)
                if existing:
                    if existing.get("text", "").strip() == la.text.strip():
                        duplicates += 1
                        continue
                    # Conflict — keep the original (older review wins) but log
                    print(f"  ⚠ conflict {la.file_name}: existing={existing['text'][:30]!r}, fb={la.text[:30]!r}")
                    conflicts += 1
                    continue

                if not args.dry_run:
                    reviewed[la.file_name] = {
                        "file_name": la.file_name,
                        "text": la.text,
                        "status": la.status,
                    }
                new_corrections += 1
                new_files += 1

        if not args.dry_run:
            processed.add(fp.name)

    if not args.dry_run and new_corrections:
        save_reviewed(reviewed)
        save_processed(processed)
        print(f"\n✓ Saved {len(reviewed)} reviewed entries")

    print(f"\nSummary:")
    print(f"  New corrections promoted: {new_corrections}")
    print(f"  New files added:          {new_files}")
    print(f"  Conflicts (skipped):      {conflicts}")
    print(f"  Schema rejects:           {schema_rejects}")
    print(f"  Duplicates (idempotent):  {duplicates}")
    if args.dry_run:
        print("\n  [dry-run] no files written")
    print(f"\n  Next: run `dataset_tool.py /clean` then `/build` to push into labels.csv")


if __name__ == "__main__":
    main()
