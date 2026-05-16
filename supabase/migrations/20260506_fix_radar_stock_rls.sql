-- ============================================================
-- Fix Radar Stock: pharmacy_id FK + auto-fill trigger + RLS
-- ============================================================

-- 1. Add FK: inventory.pharmacy_id → profiles(user_id)
--    (profiles.user_id is UNIQUE so it can be a FK target)
--    Nullable so existing NULL rows are untouched.
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_pharmacy_id_fkey
  FOREIGN KEY (pharmacy_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- 2. Trigger: auto-fill pharmacy_id = auth.uid() on every INSERT
--    so pharmacists don't need to pass it manually.
CREATE OR REPLACE FUNCTION public.set_inventory_pharmacy_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.pharmacy_id IS NULL THEN
    NEW.pharmacy_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_auto_pharmacy_id
  BEFORE INSERT ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_inventory_pharmacy_id();

-- 3. RLS: allow authenticated users to read pharmacist profiles
--    (needed for Radar Stock patient-side join: inventory → profiles)
--    Only exposes pharmacist rows; patient/admin rows stay private.
CREATE POLICY "Authenticated users can view pharmacist profiles"
ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND role = 'pharmacist'
);

-- 4. Backfill: for existing NULL pharmacy_id rows we cannot reliably
--    assign them because we don't know who inserted them.
--    Mark them with a comment for manual review.
--    Once pharmacists re-add stock the trigger will populate correctly.
-- (No-op SQL — just a documentation comment)
-- UPDATE public.inventory SET pharmacy_id = '<known_user_id>'
-- WHERE pharmacy_id IS NULL AND drug_id IN (...);
