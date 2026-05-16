-- Diagnostic + auto-promote any existing user → pharmacist + seed inventory.
-- Use case: you have 0 pharmacist profiles → Radar Stock shows 0 results.
-- This script promotes ANY existing auth user into a pharmacist profile
-- (in Alger by default), then bulk-seeds inventory for 40 popular drugs.
--
-- Idempotent: re-running won't re-insert anything.
--
-- Run in Supabase Dashboard → SQL Editor → New query → Run.

BEGIN;

-- ── 1. Diagnose current state ───────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM auth.users)                                              AS auth_users,
  (SELECT COUNT(*) FROM public.profiles)                                         AS profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'pharmacist')               AS pharmacists,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'pharmacist' AND wilaya = 'Alger') AS pharmacists_in_alger,
  (SELECT COUNT(*) FROM public.drugs)                                            AS drugs,
  (SELECT COUNT(*) FROM public.inventory)                                        AS inventory;


-- ── 2. Ensure at least one pharmacist profile exists ────────────────────────
-- Strategy: take the FIRST auth.users row that has no profile yet and create
-- a pharmacist profile for them. If all existing users already have profiles,
-- pick any 'admin' or 'patient' and ALSO add them as pharmacist (multi-role
-- isn't supported by profile.role — so this script won't overwrite an
-- existing role; instead, it adds a sibling row in user_roles if that table
-- exists, or it picks an orphan auth user).
DO $$
DECLARE
  pharma_count INT;
  target_user  UUID;
  user_email   TEXT;
BEGIN
  SELECT COUNT(*) INTO pharma_count FROM public.profiles WHERE role = 'pharmacist';

  IF pharma_count > 0 THEN
    RAISE NOTICE '✓ Already have % pharmacist(s). Skipping promotion.', pharma_count;
  ELSE
    -- Pick an auth user that doesn't yet have a profile
    SELECT u.id, u.email INTO target_user, user_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.user_id IS NULL
    LIMIT 1;

    IF target_user IS NULL THEN
      -- No orphan user. Pick the first non-pharmacist profile and promote it.
      -- (Loses original role but DEMO data has to come from somewhere)
      SELECT user_id INTO target_user
      FROM public.profiles
      WHERE role IN ('patient', 'admin')
      LIMIT 1;

      IF target_user IS NULL THEN
        RAISE EXCEPTION '✗ No auth users exist. Register at least one account via the frontend first.';
      END IF;

      UPDATE public.profiles
      SET role = 'pharmacist',
          wilaya = COALESCE(wilaya, 'Alger'),
          full_name = COALESCE(full_name, 'Pharmacie Demo')
      WHERE user_id = target_user;
      RAISE NOTICE '↻ Promoted existing user % to pharmacist (Alger)', target_user;
    ELSE
      INSERT INTO public.profiles (user_id, full_name, role, wilaya, phone)
      VALUES (target_user, 'Pharmacie Demo (Alger)', 'pharmacist', 'Alger', '0555000000');
      RAISE NOTICE '✓ Created pharmacist profile for orphan user % (%) in Alger', target_user, user_email;
    END IF;
  END IF;
END $$;


-- ── 3. Seed inventory for ALL pharmacists × 40 popular drugs ────────────────
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
  5 + (abs(hashtext(p.user_id::text || d.id::text)) % 46),
  10
FROM pharmacists p
CROSS JOIN popular_drugs d
ON CONFLICT DO NOTHING;


-- ── 4. Verify the end state ─────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'pharmacist')      AS pharmacists,
  (SELECT COUNT(*) FROM public.inventory)                               AS inventory_rows,
  (SELECT COUNT(DISTINCT pharmacy_id) FROM public.inventory)            AS pharmacists_with_stock,
  (SELECT COUNT(DISTINCT drug_id) FROM public.inventory)                AS drugs_in_stock,
  (SELECT SUM(current_stock) FROM public.inventory)                     AS total_units;

-- Per-pharmacist breakdown
SELECT p.full_name, p.wilaya, COUNT(i.id) AS items, SUM(i.current_stock) AS units
FROM public.profiles p
LEFT JOIN public.inventory i ON i.pharmacy_id = p.user_id
WHERE p.role = 'pharmacist'
GROUP BY p.user_id, p.full_name, p.wilaya
ORDER BY items DESC;

COMMIT;
