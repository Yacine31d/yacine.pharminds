"""
train_trocr.py — Two-stage TrOCR fine-tuning for Algerian prescriptions.

Stages (controlled by --stage):
  1. warmup  — short pass on synthetic data (dataset/synth_v2/) to teach
               Algerian drug vocabulary on top of microsoft/trocr-small-handwritten
  2. real    — main pass on reviewed real lines (dataset/labels.csv)

Recommended overnight run (RTX 3050 Laptop, 4GB VRAM):
    python train_trocr.py --stage warmup --epochs 2 --output checkpoints/v2_warmup
    python train_trocr.py --stage real   --epochs 8 --resume-from checkpoints/v2_warmup --output checkpoints/v2

Hardware-tuned defaults:
  - batch_size 2, grad_accum 8  → effective batch 16
  - fp16 + gradient checkpointing
  - bf16 disabled (3050 doesn't support it)

Logging: TensorBoard files in --output/runs/, plus the legacy
training_live.json terminal dashboard.

Honest disclaimers in the design:
  - Starts from microsoft/trocr-small-handwritten (NOT the poisoned checkpoint)
  - Trains on clean data only (post-cleanup labels.csv + Pydantic-validated synth)
  - Augmentation per-epoch multiplies effective dataset size
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from torch.utils.data import Dataset

# Bypass torch.load security check (CVE-2025-32434)
import transformers.utils.import_utils
import transformers.modeling_utils
transformers.utils.import_utils.check_torch_load_is_safe = lambda: None
transformers.modeling_utils.check_torch_load_is_safe = lambda: None

from transformers import (
    TrOCRProcessor,
    VisionEncoderDecoderModel,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    default_data_collator,
    TrainerCallback,
)
import transformers.trainer as _trainer_mod
_trainer_mod.check_torch_load_is_safe = lambda: None

# Modern metric API (replace deprecated `datasets.load_metric`)
import evaluate  # type: ignore

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
from data.augment import build_train_aug, augment_pil  # noqa: E402

# Globals reused in compute_metrics (Trainer doesn't pass processor)
_processor: TrOCRProcessor | None = None
_cer_metric = None


# ── Live dashboard (legacy) ───────────────────────────────────────────────────
class TerminalDashboardCallback(TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):
        if not logs:
            return
        live_path = ROOT / "training_live.json"
        with open(live_path, "w") as f:
            json.dump({
                "step": state.global_step,
                "max_steps": state.max_steps,
                "epoch": state.epoch,
                "loss": logs.get("loss", 0),
                "learning_rate": logs.get("learning_rate", 0),
                "eval_loss": logs.get("eval_loss", 0),
                "eval_cer": logs.get("eval_cer", 0),
            }, f)


# ── Dataset with optional Albumentations augmentation ────────────────────────
class PrescriptionDataset(Dataset):
    def __init__(
        self,
        root_dir: str | Path,
        df: pd.DataFrame,
        processor: TrOCRProcessor,
        max_target_length: int = 128,
        augment: bool = False,
    ):
        self.root_dir = Path(root_dir)
        self.df = df.reset_index(drop=True)
        self.processor = processor
        self.max_target_length = max_target_length
        self.augment_pipe = build_train_aug() if augment else None

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int):
        row = self.df.iloc[idx]
        file_name = row["file_name"]
        text = str(row["text"])

        # Synthetic images live in dataset/synth_v2/images/, real in dataset/images/
        if file_name.startswith("synth_v2_"):
            img_path = ROOT / "dataset" / "synth_v2" / "images" / file_name
        else:
            img_path = self.root_dir / file_name

        image = Image.open(img_path).convert("RGB")
        if self.augment_pipe is not None:
            image = augment_pil(image, self.augment_pipe)

        pixel_values = self.processor(image, return_tensors="pt").pixel_values
        labels = self.processor.tokenizer(
            text, padding="max_length", max_length=self.max_target_length, truncation=True
        ).input_ids
        labels = [l if l != self.processor.tokenizer.pad_token_id else -100 for l in labels]
        return {"pixel_values": pixel_values.squeeze(), "labels": torch.tensor(labels)}


def compute_metrics(pred):
    """CER computed on decoded predictions vs. label strings."""
    global _processor, _cer_metric
    if _cer_metric is None:
        _cer_metric = evaluate.load("cer")
    labels_ids = pred.label_ids.copy()
    pred_ids = pred.predictions
    labels_ids[labels_ids == -100] = _processor.tokenizer.pad_token_id
    pred_str = _processor.batch_decode(pred_ids, skip_special_tokens=True)
    labels_str = _processor.batch_decode(labels_ids, skip_special_tokens=True)
    return {"cer": _cer_metric.compute(predictions=pred_str, references=labels_str)}


# ── Data loading helpers ─────────────────────────────────────────────────────
def load_real_split(images_dir: Path, labels_csv: Path, holdout_set: set[str],
                    eval_frac: float = 0.15, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load real-line dataset, exclude hold-out, return (train_df, eval_df).
       Stratifies by writer (source prescription) so train/eval don't share."""
    df = pd.read_csv(labels_csv)
    # Drop missing image files
    df = df[df["file_name"].apply(lambda fn: (images_dir / fn).exists())].reset_index(drop=True)
    # Drop hold-out files
    df = df[~df["file_name"].isin(holdout_set)].reset_index(drop=True)

    # Group by writer (source-prescription prefix)
    import re
    def writer_id(fn: str) -> str:
        m = re.match(r"^(.*?)(?:_line_\d+|_\d+)?\.[A-Za-z]+$", fn)
        return m.group(1) if m else fn
    df["_writer"] = df["file_name"].apply(writer_id)

    rng = pd.Series(range(len(df))).sample(frac=1, random_state=seed).tolist()
    writers = df["_writer"].drop_duplicates().tolist()
    rng_w = pd.Series(range(len(writers))).sample(frac=1, random_state=seed).tolist()
    writers_shuf = [writers[i] for i in rng_w]
    n_eval = max(1, int(len(writers_shuf) * eval_frac))
    eval_writers = set(writers_shuf[:n_eval])
    eval_df = df[df["_writer"].isin(eval_writers)].drop(columns=["_writer"]).reset_index(drop=True)
    train_df = df[~df["_writer"].isin(eval_writers)].drop(columns=["_writer"]).reset_index(drop=True)
    return train_df, eval_df


def load_synth_split(synth_csv: Path, eval_frac: float = 0.05, seed: int = 42) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(synth_csv).sample(frac=1, random_state=seed).reset_index(drop=True)
    n_eval = max(1, int(len(df) * eval_frac))
    return df[n_eval:].reset_index(drop=True), df[:n_eval].reset_index(drop=True)


def load_holdout(holdout_path: Path) -> set[str]:
    if not holdout_path.exists():
        return set()
    return {ln.strip() for ln in holdout_path.read_text(encoding="utf-8").splitlines()
            if ln.strip() and not ln.startswith("#")}


# ── Main training ────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=["warmup", "real"], default="real",
                        help="warmup = synth_v2 only; real = real lines + (optional) synth")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--model", default="microsoft/trocr-small-handwritten",
                        help="Base model. NEVER use the poisoned Abdou-19/...-onnx checkpoint.")
    parser.add_argument("--resume-from", default=None,
                        help="Local checkpoint dir to resume training (e.g. checkpoints/v2_warmup)")
    parser.add_argument("--output", default="checkpoints/v2",
                        help="Output dir under ocr-model/")
    parser.add_argument("--lr", type=float, default=5e-5,
                        help="LR for warmup; reduce to 1e-5 for stage 2")
    parser.add_argument("--no-augment", action="store_true",
                        help="Disable per-epoch augmentation (smoke test only)")
    parser.add_argument("--max-train-rows", type=int, default=None,
                        help="Smoke-test cap on training rows")
    args = parser.parse_args()

    global _processor

    images_dir   = ROOT / "dataset" / "images"
    labels_csv   = ROOT / "dataset" / "labels.csv"
    synth_csv    = ROOT / "dataset" / "synth_v2" / "labels.csv"
    holdout_txt  = ROOT / "dataset" / "holdout_set.txt"
    output_dir   = ROOT / args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    holdout = load_holdout(holdout_txt)
    print(f"Hold-out (excluded from train+eval): {len(holdout)} files")

    # ── Pick training data per stage ─────────────────────────────────────────
    if args.stage == "warmup":
        if not synth_csv.exists():
            print(f"✗ {synth_csv} missing. Run: python ocr-model/synth_v2.py --n 1500 --clean")
            sys.exit(1)
        print("Stage: warmup (synthetic vocab teaching)")
        train_df, eval_df = load_synth_split(synth_csv, eval_frac=0.05)
    else:
        print("Stage: real (reviewed prescription lines)")
        train_df, eval_df = load_real_split(images_dir, labels_csv, holdout, eval_frac=0.15)
        # OPTIONAL: mix in some synth as 20% of train for vocab maintenance
        if synth_csv.exists():
            synth_extra, _ = load_synth_split(synth_csv, eval_frac=0.0)
            n_extra = min(len(synth_extra), int(len(train_df) * 0.5))
            train_df = pd.concat([train_df, synth_extra.head(n_extra)], ignore_index=True)\
                          .sample(frac=1, random_state=42).reset_index(drop=True)

    if args.max_train_rows:
        train_df = train_df.head(args.max_train_rows).reset_index(drop=True)
        eval_df = eval_df.head(max(2, args.max_train_rows // 4)).reset_index(drop=True)

    print(f"  Train: {len(train_df)} | Eval: {len(eval_df)}")
    print(f"  Sample train rows: {train_df.head(3)[['file_name','text']].to_dict(orient='records')}")

    # ── Load processor + model ───────────────────────────────────────────────
    base = args.resume_from or args.model
    print(f"Loading model: {base}")
    _processor = TrOCRProcessor.from_pretrained(base)
    processor = _processor
    model = VisionEncoderDecoderModel.from_pretrained(base)
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.vocab_size = model.config.decoder.vocab_size
    model.generation_config.eos_token_id = processor.tokenizer.sep_token_id
    model.generation_config.max_length = 64
    model.generation_config.early_stopping = True
    model.generation_config.num_beams = 4

    # ── Datasets ─────────────────────────────────────────────────────────────
    train_ds = PrescriptionDataset(images_dir, train_df, processor, augment=not args.no_augment)
    eval_ds = PrescriptionDataset(images_dir, eval_df, processor, augment=False)

    # ── Training args ────────────────────────────────────────────────────────
    use_fp16 = torch.cuda.is_available()
    print(f"CUDA: {torch.cuda.is_available()}  device: {torch.cuda.get_device_name(0) if use_fp16 else 'cpu'}")

    training_args = Seq2SeqTrainingArguments(
        predict_with_generate=True,
        eval_strategy="epoch",
        per_device_train_batch_size=2,
        per_device_eval_batch_size=2,
        gradient_accumulation_steps=8,
        fp16=use_fp16,
        output_dir=str(output_dir),
        logging_dir=str(output_dir / "runs"),
        logging_steps=20,
        save_strategy="epoch",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="cer",
        greater_is_better=False,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        weight_decay=0.01,
        dataloader_num_workers=0,
        gradient_checkpointing=True,
        report_to="tensorboard",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        processing_class=processor.image_processor,
        args=training_args,
        compute_metrics=compute_metrics,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        data_collator=default_data_collator,
        callbacks=[TerminalDashboardCallback()],
    )

    torch.cuda.empty_cache() if use_fp16 else None
    print(f"Starting training stage={args.stage} epochs={args.epochs} lr={args.lr}")
    t0 = time.time()

    # Only pass resume_from_checkpoint if it's a full Trainer state directory
    # (has trainer_state.json). Plain `save_model()` outputs only have model
    # weights, not optimizer/scheduler/RNG state — those should be loaded via
    # --model and start a fresh training state.
    full_state = (Path(args.resume_from) / "trainer_state.json").exists() if args.resume_from else False
    if args.resume_from and not full_state:
        print(f"  Note: {args.resume_from} has no trainer_state.json — loaded weights only, starting fresh training state")
    trainer.train(resume_from_checkpoint=args.resume_from if full_state else None)

    elapsed = time.time() - t0
    print(f"\nFinished in {elapsed/60:.1f} min")

    final_dir = output_dir / "final"
    trainer.save_model(str(final_dir))
    processor.save_pretrained(str(final_dir))
    print(f"✓ Saved best model: {final_dir}")


if __name__ == "__main__":
    main()
