"""
augment.py — Train-time augmentation for handwritten line crops.

Tuned aggressively because the real-data corpus is small (~230 lines clean).
Each epoch sees freshly-distorted versions of every line, multiplying
effective dataset size.

What we add over generic image augmentation:
  - InkBleed   — morphological dilation, simulates wet-pen scans
  - PaperTone  — slight off-white background variations
  - JpegSquish — heavy compression mimicking WhatsApp-shared scans

USE: train_trocr.py imports `build_train_aug()` and applies it inside the
DataLoader's `__getitem__`. Validation/test sets get the no-op `build_eval_aug()`.
"""
from __future__ import annotations

import random
from typing import Any

import albumentations as A
import cv2
import numpy as np
from PIL import Image


# ── Custom transforms (numpy arrays in/out) ───────────────────────────────────
class InkBleed(A.ImageOnlyTransform):
    """Morphological dilation — simulates ink that bled into the paper.

    Slightly thickens ink strokes; only triggers `p` of the time.
    Args:
        kernel_size: size of the dilation kernel (3 = subtle, 5 = heavy)
    """

    def __init__(self, kernel_size: int = 3, p: float = 0.2):
        super().__init__(p=p)
        self.kernel_size = kernel_size

    def apply(self, img: np.ndarray, **kwargs) -> np.ndarray:
        # Convert to grayscale for the dilation, then back to RGB
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY) if img.ndim == 3 else img
        # Invert so ink is bright (background dark)
        inv = cv2.bitwise_not(gray)
        kernel = np.ones((self.kernel_size, self.kernel_size), np.uint8)
        dilated = cv2.dilate(inv, kernel, iterations=1)
        re_inv = cv2.bitwise_not(dilated)
        if img.ndim == 3:
            return cv2.cvtColor(re_inv, cv2.COLOR_GRAY2RGB)
        return re_inv

    def get_transform_init_args_names(self):
        return ("kernel_size",)


class PaperTone(A.ImageOnlyTransform):
    """Tint the background slightly off-white (yellowish/greyish paper).

    Triggers `p` of the time. Effect is subtle — the model should be robust
    to varying paper tones, not learn specific tones.
    """

    def __init__(self, p: float = 0.3):
        super().__init__(p=p)

    def apply(self, img: np.ndarray, **kwargs) -> np.ndarray:
        # Detect background pixels (mostly bright) and shift tone slightly
        if img.ndim != 3:
            return img
        out = img.astype(np.float32)
        # Random tint offsets per channel
        offset = np.array([
            random.randint(-12, 5),    # R
            random.randint(-10, 5),    # G
            random.randint(-15, 0),    # B (yellow-ish bias)
        ], dtype=np.float32)
        # Apply offset only to bright pixels (paper, not ink)
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        bg_mask = (gray > 200).astype(np.float32)[..., None]
        out = out + offset * bg_mask
        return np.clip(out, 0, 255).astype(np.uint8)

    def get_transform_init_args_names(self):
        return ()


# ── Public API ───────────────────────────────────────────────────────────────
def build_train_aug(image_size: tuple[int, int] | None = None) -> A.Compose:
    """Train-time augmentation pipeline. Aggressive — multiplies effective N.

    Args:
        image_size: optional (H, W) for final resize. Most TrOCR processors
            handle resizing themselves, so leave None unless you need a
            specific size.
    """
    transforms = [
        # Geometric (subtle — handwriting shouldn't tilt too much)
        A.Rotate(limit=4, p=0.5, border_mode=cv2.BORDER_CONSTANT),
        A.Perspective(scale=(0.02, 0.05), p=0.4, fit_output=True),

        # Photometric (simulate lighting variations + camera quality)
        A.RandomBrightnessContrast(
            brightness_limit=0.2, contrast_limit=0.2, p=0.4
        ),
        A.GaussianBlur(blur_limit=(3, 5), p=0.3),
        A.ImageCompression(
            quality_range=(60, 95), p=0.3,    # WhatsApp-shared scans
        ),

        # Custom — mimic handwriting wobble + ink bleed + paper tone
        A.ElasticTransform(alpha=50, sigma=6, p=0.2,
                           border_mode=cv2.BORDER_CONSTANT),
        InkBleed(kernel_size=3, p=0.2),
        PaperTone(p=0.3),
    ]

    if image_size is not None:
        transforms.append(A.Resize(height=image_size[0], width=image_size[1]))

    return A.Compose(transforms)


def build_eval_aug(image_size: tuple[int, int] | None = None) -> A.Compose:
    """Eval/test pipeline — only resize if requested, no augmentation."""
    if image_size is None:
        return A.Compose([])
    return A.Compose([A.Resize(height=image_size[0], width=image_size[1])])


# ── Convenience: PIL → np → augmented np → PIL ──────────────────────────────
def augment_pil(pil_img: Image.Image, transform: A.Compose) -> Image.Image:
    """Apply Albumentations transform to a PIL image."""
    arr = np.array(pil_img.convert("RGB"))
    out = transform(image=arr)["image"]
    return Image.fromarray(out)


# ── Smoke test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    from pathlib import Path

    if len(sys.argv) < 2:
        print("Usage: python augment.py <input.jpg> [N]")
        sys.exit(1)

    src = Path(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 4

    img = Image.open(src).convert("RGB")
    out_dir = src.parent / "_aug_smoke"
    out_dir.mkdir(exist_ok=True)

    transform = build_train_aug()
    print(f"Generating {n} augmented variants of {src.name}…")
    for i in range(n):
        aug = augment_pil(img, transform)
        out_path = out_dir / f"{src.stem}_aug_{i}.jpg"
        aug.save(out_path, "JPEG", quality=85)
        print(f"  wrote {out_path}")
