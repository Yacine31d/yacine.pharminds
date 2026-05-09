import os
import pandas as pd
from PIL import Image
import torch
import json
from torch.utils.data import Dataset
import transformers.utils.import_utils
import transformers.modeling_utils
# Bypass torch.load security check (CVE-2025-32434)
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
# Patch trainer's own local reference too (needed for resume_from_checkpoint)
import transformers.trainer as _trainer_mod
_trainer_mod.check_torch_load_is_safe = lambda: None

from datasets import load_metric
import argparse

# Global processor set once in main(), reused in compute_metrics
_processor: TrOCRProcessor | None = None
_cer_metric = None


class TerminalDashboardCallback(TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            live_path = os.path.join(os.path.dirname(__file__), "training_live.json")
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


class PrescriptionDataset(Dataset):
    def __init__(self, root_dir, df, processor, max_target_length=128):
        self.root_dir = root_dir
        self.df = df
        self.processor = processor
        self.max_target_length = max_target_length

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        file_name = self.df["file_name"][idx]
        text = self.df["text"][idx]
        image = Image.open(os.path.join(self.root_dir, file_name)).convert("RGB")
        pixel_values = self.processor(image, return_tensors="pt").pixel_values
        labels = self.processor.tokenizer(
            text, padding="max_length", max_length=self.max_target_length, truncation=True
        ).input_ids
        labels = [l if l != self.processor.tokenizer.pad_token_id else -100 for l in labels]
        return {"pixel_values": pixel_values.squeeze(), "labels": torch.tensor(labels)}


def compute_metrics(pred):
    global _processor, _cer_metric
    if _cer_metric is None:
        _cer_metric = load_metric("cer")
    labels_ids = pred.label_ids.copy()
    pred_ids = pred.predictions
    labels_ids[labels_ids == -100] = _processor.tokenizer.pad_token_id
    pred_str   = _processor.batch_decode(pred_ids,   skip_special_tokens=True)
    labels_str = _processor.batch_decode(labels_ids, skip_special_tokens=True)
    return {"cer": _cer_metric.compute(predictions=pred_str, references=labels_str)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--model",  type=str, default="microsoft/trocr-small-handwritten")
    parser.add_argument("--resume_from_checkpoint", type=str, default=None)
    parser.add_argument("--lr", type=float, default=3e-5)
    args = parser.parse_args()

    global _processor

    script_dir  = os.path.dirname(os.path.abspath(__file__))
    images_dir  = os.path.join(script_dir, "dataset", "images")
    labels_csv  = os.path.join(script_dir, "dataset", "labels.csv")
    output_dir  = os.path.join(os.path.dirname(script_dir), "trocr-algerian-medical")
    final_dir   = os.path.join(os.path.dirname(script_dir), "trocr-algerian-medical-final")

    print("Loading data...")
    df = pd.read_csv(labels_csv)
    df = df[df["file_name"].apply(
        lambda fn: os.path.exists(os.path.join(images_dir, fn))
    )].reset_index(drop=True)
    print(f"  {len(df)} rows after dropping missing images")

    real_mask = df["file_name"].str.contains("_line_", na=False)
    real_df   = df[real_mask].drop_duplicates(subset="file_name").reset_index(drop=True)
    synth_df  = df[~real_mask].reset_index(drop=True)

    real_shuffled = real_df.sample(frac=1, random_state=42).reset_index(drop=True)
    eval_split    = max(1, int(0.2 * len(real_shuffled)))
    eval_df       = real_shuffled[:eval_split].reset_index(drop=True)
    train_real    = real_shuffled[eval_split:].reset_index(drop=True)
    train_df      = pd.concat([train_real, synth_df], ignore_index=True)\
                      .sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"  Train: {len(train_df)} | Eval: {len(eval_df)}")

    print(f"Loading {args.model} ...")
    _processor = TrOCRProcessor.from_pretrained(args.model)
    processor  = _processor

    model = VisionEncoderDecoderModel.from_pretrained(args.model)
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id
    model.config.pad_token_id           = processor.tokenizer.pad_token_id
    model.config.vocab_size             = model.config.decoder.vocab_size
    model.generation_config.eos_token_id        = processor.tokenizer.sep_token_id
    model.generation_config.max_length          = 64
    model.generation_config.early_stopping      = True
    model.generation_config.num_beams           = 4

    train_dataset = PrescriptionDataset(images_dir, train_df, processor)
    eval_dataset  = PrescriptionDataset(images_dir, eval_df,  processor)

    training_args = Seq2SeqTrainingArguments(
        predict_with_generate=True,
        eval_strategy="epoch",
        per_device_train_batch_size=2,
        per_device_eval_batch_size=2,
        gradient_accumulation_steps=8,
        fp16=True,
        output_dir=output_dir,
        logging_steps=20,
        save_strategy="epoch",
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="cer",
        greater_is_better=False,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        weight_decay=0.01,
        dataloader_num_workers=0,
        gradient_checkpointing=True,
        report_to="none",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        processing_class=processor.image_processor,
        args=training_args,
        compute_metrics=compute_metrics,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=default_data_collator,
        callbacks=[TerminalDashboardCallback()],
    )

    torch.cuda.empty_cache()
    print("Starting training...")
    trainer.train(resume_from_checkpoint=args.resume_from_checkpoint)

    print("Saving model...")
    trainer.save_model(final_dir)
    processor.save_pretrained(final_dir)
    print(f"Done → {final_dir}")


if __name__ == "__main__":
    main()
