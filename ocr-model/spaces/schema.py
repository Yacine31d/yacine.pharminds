"""
Pydantic schemas for the PharMinds OCR pipeline.

Used by:
- ocr-model/spaces/app.py     (API request/response contracts)
- ocr-model/postprocess/matcher.py  (drug-DB match results)
- ocr-model/eval.py            (eval-input validation)
- ocr-model/data/promote.py   (annotation ingest validation)

Strict-mode: extra fields are rejected; type coercion is minimal.
"""
from __future__ import annotations

import re
from typing import Optional, List, Literal

from pydantic import BaseModel, Field, ConfigDict, field_validator


# ── Validation regexes ────────────────────────────────────────────────────────
# Algerian prescriptions are written in French (majority) AND Arabic (patient
# names, occasionally body text). Both languages are valid. What we still
# reject:
#   - LLM/Gemini commentary artifacts (`**`, `###`, "Doctor's Stamp:", etc.)
#   - Multi-line text crammed into a single-line crop
#   - Mostly-non-printable noise rows
#   - Other-script bleed (CJK / Cyrillic / Hebrew / Devanagari / etc.)
LATIN_RE  = re.compile(r"[A-Za-zÀ-ÿ]")
ARABIC_RE = re.compile(r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]")
# Scripts that are NOT expected in an Algerian prescription (catches OCR noise)
OTHER_SCRIPT_RE = re.compile(
    r"["
    r"Ѐ-ӿ"   # Cyrillic
    r"一-鿿"   # CJK Unified Ideographs
    r"぀-ゟ"   # Hiragana
    r"゠-ヿ"   # Katakana
    r"֐-׿"   # Hebrew
    r"ऀ-ॿ"   # Devanagari
    r"฀-๿"   # Thai
    r"]"
)
ARTIFACT_RE = re.compile(
    r"\*\*|###|---|"
    r"Doctor's Stamp:|Red Stamp:|Institutional Stamp:|"
    r"Printed Institutional Text:|Handwritten Entry:|"
    r"Plaintext it is!|\[Stylized Signature",
    re.IGNORECASE,
)
DOSAGE_RE = re.compile(r"\d+(\.\d+)?\s*(mg|g|ml|mL|UI|μg|mcg|%)", re.IGNORECASE)


def detect_language(text: str) -> str:
    """Coarse language detection for Algerian-prescription content.
       Returns 'fr', 'ar', 'mixed', or 'unknown'."""
    has_latin = bool(LATIN_RE.search(text))
    has_arabic = bool(ARABIC_RE.search(text))
    if has_latin and has_arabic:
        return 'mixed'
    if has_arabic:
        return 'ar'
    if has_latin:
        return 'fr'
    return 'unknown'


# ── Data layer (annotations / training) ──────────────────────────────────────
class LineAnnotation(BaseModel):
    """A single annotated line crop, output of `dataset_tool.py /review`."""
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

    file_name: str = Field(..., min_length=1)
    text: str = Field(..., min_length=0)  # blank allowed if status='blank'
    status: Literal['ok', 'blank', 'skip', 'trash'] = 'ok'

    @field_validator('text')
    @classmethod
    def text_must_be_clean(cls, v: str, info) -> str:
        # Algerian prescriptions are valid in French OR Arabic (or both, e.g. an
        # Arabic patient name on the same line as French dosage). What we
        # reject is unambiguous corruption: foreign scripts, LLM artifacts,
        # multi-line content, or near-pure noise.
        if not v:
            return v
        if OTHER_SCRIPT_RE.search(v):
            raise ValueError(f'Foreign script detected (only fr/ar expected): {v[:50]!r}')
        if ARTIFACT_RE.search(v):
            raise ValueError(f'OCR artifact pattern detected: {v[:50]!r}')
        if '\n' in v:
            raise ValueError(f'Multi-line label not allowed (single line crop only): {v[:50]!r}')
        # Reject if >80% non-printable (catches OCR-noise rows)
        printable_ratio = sum(1 for c in v if c.isprintable()) / max(1, len(v))
        if printable_ratio < 0.8:
            raise ValueError(f'Too many non-printable chars ({(1-printable_ratio)*100:.0f}%): {v[:50]!r}')
        return v


# ── Inference layer (TrOCR + LLM + drug-DB match output) ─────────────────────
MatchStrategy = Literal['exact', 'fuzzy', 'phonetic', 'atc', 'unmatched']


class MatchResult(BaseModel):
    """Output of `postprocess/matcher.py::DrugMatcher.match()`."""
    model_config = ConfigDict(extra='forbid')

    raw_token: str
    matched_name: Optional[str] = None
    drug_id: Optional[str] = None      # UUID from drugs table
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    strategy: MatchStrategy = 'unmatched'


class Medication(BaseModel):
    """One medication row in a structured prescription response."""
    model_config = ConfigDict(extra='forbid')

    name: str = Field(..., min_length=1)
    drug_id: Optional[str] = None       # populated by DrugMatcher
    dosage: Optional[str] = None         # e.g. "500mg", "1g"
    frequency: Optional[str] = None      # e.g. "1 cp x 3/j"
    duration: Optional[str] = None       # e.g. "7 jours", "03 mois"
    quantity: Optional[str] = None       # e.g. "01 bte"
    instructions: Optional[str] = None   # any extra notes
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    match_strategy: MatchStrategy = 'unmatched'


class LineCrop(BaseModel):
    """A single line of a scanned prescription (for trace/feedback)."""
    model_config = ConfigDict(extra='forbid')

    bbox: Optional[List[int]] = None    # [x1, y1, x2, y2] or None
    text: str = ''
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    # Legacy compat with /scan endpoint — needed by active-learning feedback UI
    line_index: Optional[int] = None
    image_base64: Optional[str] = None  # JPEG-encoded line crop


class Prescription(BaseModel):
    """End-to-end OCR + LLM-structuring + DB-matching response."""
    model_config = ConfigDict(extra='forbid')

    success: bool = True
    method: Literal['trocr', 'vlm_fallback', 'hybrid'] = 'trocr'
    confidence: float = Field(0.0, ge=0.0, le=1.0)

    # Structured fields
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    prescription_date: Optional[str] = None  # DD/MM/YYYY string
    medications: List[Medication] = Field(default_factory=list)
    notes: Optional[str] = None

    # Trace
    line_crops: List[LineCrop] = Field(default_factory=list)
    raw_ocr_text: Optional[str] = None    # joined raw lines, debug only

    # Telemetry
    processing_ms: int = 0
    model_version: str = 'v1'
    dataset_version: str = 'v1'
    error: Optional[str] = None


# ── Feedback loop (active learning) ──────────────────────────────────────────
class FeedbackCorrection(BaseModel):
    """One line correction submitted via /v2/feedback."""
    model_config = ConfigDict(extra='forbid')

    file_name: str
    text: str   # human-corrected ground truth
    status: Literal['ok', 'blank', 'skip']


class FeedbackPayload(BaseModel):
    """POST /v2/feedback request body."""
    model_config = ConfigDict(extra='forbid')

    image_id: str
    corrections: List[FeedbackCorrection]
    reviewer_id: Optional[str] = None
    submitted_at: Optional[str] = None  # ISO timestamp


# ── Eval input (one row of hold-out ground truth) ────────────────────────────
class EvalSample(BaseModel):
    """One labeled hold-out line for `eval.py`."""
    model_config = ConfigDict(extra='forbid')

    file_name: str
    text: str   # ground truth
    expected_drug: Optional[str] = None  # if known, for Drug-name accuracy metric
