# Dataset Cleanup Log

## 2026-05-09 — Pre-sprint corrupt-data purge

**Trigger**: Deployed model `Abdou-19/trocr-algerian-medical-onnx` was producing
catastrophic outputs in production. Root cause: trained on `labels.csv.backup`
(8000-row synthetic + handwritten corpus auto-labeled by Gemini) which contained
unreviewed artifacts (`**`, `Doctor's Stamp:`, Arabic bleed-through, multi-line
text crammed into single-line labels).

### Actions

1. **Backup**: `dataset/` → `dataset.PRE_CLEANUP_BACKUP/` (byte-perfect, 237 images, 4.91 MB)
2. **Deleted**: `dataset/labels.csv.backup`
   - 8000 rows total: 5000 `printed_*` synthetic + 3000 `handwritten_*` corrupt-handwritten
   - This was the poisoned training corpus
3. **Cleaned**: `dataset/review_state.json` — removed 161 stale entries
   - 28 `handwritten_*` (file no longer exists)
   - 19 `printed_*` (file no longer exists)
   - 113 `aug_*` (deprecated augmentation outputs)
   - 1 other
   - Stale entries archived to `dataset/review_state.STALE_REMOVED.json` for audit trail
4. **Verified clean**:
   - `dataset/labels.csv` (197 rows) — all WhatsApp* / real_* (real partner-reviewed prescriptions)
   - `dataset/images/` (237 files) — zero synthetic, all real
   - `review_state.json` (199 entries after cleaning)

### What's NOT cleaned (intentionally)

- `dataset/trash/` — partner's already-trashed lines, kept for reference
- `dataset/backups/` — historical CSV snapshots, kept for safety
- `real_data_lines/` — partner's working area for raw line crops awaiting review
- `dataset/arabic_labels.csv` — Arabic-bleed cases filtered out by `/clean`, kept as evidence

### Recovery strategy

The deployed HF model checkpoint cannot be cleaned in-place — it's been trained
on the corrupt corpus. Day 4 of sprint plan: train v2 from
`microsoft/trocr-small-handwritten` base (clean Microsoft pretrained weights),
NOT from the poisoned checkpoint.

See plan: `C:\Users\abdou\.claude\plans\woolly-pondering-snowglobe.md`
