-- ============================================================
-- Fix 1: Radar Stock — ensure FK + trigger + RLS exist
-- ============================================================

-- Add FK (safe — won't fail if already exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_pharmacy_id_fkey'
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT inventory_pharmacy_id_fkey
      FOREIGN KEY (pharmacy_id) REFERENCES public.profiles(user_id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Trigger: auto-fill pharmacy_id on INSERT
CREATE OR REPLACE FUNCTION public.set_inventory_pharmacy_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.pharmacy_id IS NULL THEN
    NEW.pharmacy_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_auto_pharmacy_id ON public.inventory;
CREATE TRIGGER inventory_auto_pharmacy_id
  BEFORE INSERT ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_inventory_pharmacy_id();

-- Backfill: for inventory rows with NULL pharmacy_id,
-- assign them to the only pharmacist (works if single pharmacist account)
UPDATE public.inventory
SET pharmacy_id = p.user_id
FROM public.profiles p
WHERE inventory.pharmacy_id IS NULL
  AND p.role = 'pharmacist'
  AND p.user_id = (
    SELECT user_id FROM public.profiles WHERE role = 'pharmacist' LIMIT 1
  );

-- RLS: let patients (authenticated) see pharmacist profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Authenticated users can view pharmacist profiles'
  ) THEN
    CREATE POLICY "Authenticated users can view pharmacist profiles"
    ON public.profiles FOR SELECT
    USING (auth.role() = 'authenticated' AND role = 'pharmacist');
  END IF;
END $$;

-- RLS: let authenticated users read inventory (for radar stock)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inventory'
      AND policyname = 'Authenticated users can read inventory for radar'
  ) THEN
    CREATE POLICY "Authenticated users can read inventory for radar"
    ON public.inventory FOR SELECT
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- Fix 2: DCI Switch — ensure drugs table has generic_name data
-- ============================================================

-- Check how many drugs have generic_name filled
-- (run SELECT COUNT(*) FROM drugs WHERE generic_name IS NOT NULL; to verify)

-- Ensure is_generic and price_dz columns exist (needed for DCI ranking)
ALTER TABLE public.drugs
  ADD COLUMN IF NOT EXISTS is_generic       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_dz         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS cnas_reimbursable BOOLEAN DEFAULT false;

-- ============================================================
-- Fix 3: Chifa claims table (needed for /pharmacist/chifa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chifa_claims (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacist_id        UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  patient_chifa_number TEXT NOT NULL,
  patient_name         TEXT,
  ordonnance_id        UUID REFERENCES ordonnances(id) ON DELETE SET NULL,
  total_amount         DECIMAL(10,2) DEFAULT 0,
  reimbursable_amount  DECIMAL(10,2) DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','submitted','approved','paid','rejected')),
  submitted_at         TIMESTAMPTZ,
  approved_at          TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  reference_number     TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chifa_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chifa_claims' AND policyname = 'pharmacist_own_claims'
  ) THEN
    CREATE POLICY "pharmacist_own_claims" ON public.chifa_claims
      FOR ALL USING (auth.uid() = pharmacist_id);
  END IF;
END $$;

-- ============================================================
-- Fix 4: Shortage alerts table (needed for RuptureRadar)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shortage_alerts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id                   UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
  wilaya                    TEXT,
  alert_type                TEXT NOT NULL DEFAULT 'low_stock_network'
                              CHECK (alert_type IN ('low_stock_network','demand_spike','seasonal_risk','manual')),
  severity                  TEXT NOT NULL DEFAULT 'warning'
                              CHECK (severity IN ('critical','warning','info')),
  affected_pharmacies_count INT DEFAULT 1,
  message_fr                TEXT NOT NULL,
  message_ar                TEXT,
  is_active                 BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT now(),
  expires_at                TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.shortage_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'shortage_alerts' AND policyname = 'shortage_alerts_read'
  ) THEN
    CREATE POLICY "shortage_alerts_read" ON public.shortage_alerts
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;
