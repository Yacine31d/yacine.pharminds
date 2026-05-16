-- Seed demo inventory rows for any existing pharmacist profiles.
-- Idempotent — re-running won't duplicate rows (uses ON CONFLICT DO NOTHING).
--
-- For each pharmacist profile in the system, this script attaches stock for
-- the 40 most-prescribed Algerian drugs with random stock levels 5-50 units.
-- Radar Stock + DCI Switch will start finding pharmacies after this runs.
--
-- Prerequisite: at least one user must have profiles.role = 'pharmacist'.
-- If the result says "0 inventory rows added", register a pharmacist account
-- first (frontend signup flow), then re-run this.
--
-- Run in Supabase Dashboard → SQL Editor → New query → Run.

BEGIN;

-- Make sure inventory schema is sane (idempotent column adds)
ALTER TABLE public.inventory
  ALTER COLUMN current_stock SET DEFAULT 0,
  ALTER COLUMN min_stock_threshold SET DEFAULT 5;

-- Insert demo inventory: every pharmacist × 40 popular drugs with random stock
WITH popular_drugs AS (
  SELECT id FROM public.drugs
  WHERE name_fr ~* '(Doliprane|Augmentin|Clamoxyl|Amoxicill|Aspegic|Voltarene|Spasfon|'
              || 'Smecta|Efferalgan|Maxilase|Rhinathiol|Flagyl|Triatec|Crestor|Motilium|'
              || 'Lipanthyl|Ibuprofene|Zomax|Glucophage|Levothyrox|Profenid|Solupred|'
              || 'Bilaxten|Pyostacine|Diflucan|Telfast|Sapofen|Toplexil|Sinecod|Nasacort|'
              || 'Duphalac|Cordarone|Atacand|Kardegic|Loxen|Aspirine|Doxycycline|'
              || 'Metronidazole|Paracetamol|Omeprazole|Atorvastatin|Amlodipine|Ramipril|'
              || 'Bisoprolol|Salbutamol|Diclofenac|Ciprofloxacin|Azithromycin)'
  LIMIT 40
),
pharmacists AS (
  SELECT user_id FROM public.profiles WHERE role = 'pharmacist'
)
INSERT INTO public.inventory (pharmacy_id, drug_id, current_stock, min_stock_threshold)
SELECT
  p.user_id,
  d.id,
  -- Pseudo-random stock 5-50 units, deterministic per (pharmacist, drug)
  5 + (abs(hashtext(p.user_id::text || d.id::text)) % 46),
  10
FROM pharmacists p
CROSS JOIN popular_drugs d
ON CONFLICT DO NOTHING;

-- Verify
SELECT
  COUNT(*) AS inventory_rows,
  COUNT(DISTINCT pharmacy_id) AS pharmacists_with_stock,
  COUNT(DISTINCT drug_id) AS drugs_in_stock
FROM public.inventory;

-- Per-pharmacist summary
SELECT
  p.full_name, p.wilaya,
  COUNT(i.id) AS inventory_count,
  SUM(i.current_stock) AS total_stock
FROM public.profiles p
LEFT JOIN public.inventory i ON i.pharmacy_id = p.user_id
WHERE p.role = 'pharmacist'
GROUP BY p.user_id, p.full_name, p.wilaya
ORDER BY inventory_count DESC;

COMMIT;
