"""Post-processing layer for PharMinds OCR.

Drug-DB grounding: maps raw OCR/LLM tokens to canonical drug entries via
exact / fuzzy / phonetic / ATC-class matching. Produces the single biggest
accuracy lift in the pipeline.
"""
