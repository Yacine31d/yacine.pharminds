-- ============================================================
-- PharMinds Algeria - Database Improvements Migration
-- Run AFTER init.sql in your Supabase SQL Editor
-- ============================================================

-- ===========================================
-- 1. Add missing FK constraints
-- ===========================================

-- carte_chifa.user_id was missing FK to auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'carte_chifa_user_id_fkey'
  ) THEN
    ALTER TABLE public.carte_chifa 
      ADD CONSTRAINT carte_chifa_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ordonnances.user_id was missing FK to auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ordonnances_user_id_fkey'
  ) THEN
    ALTER TABLE public.ordonnances 
      ADD CONSTRAINT ordonnances_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- notifications.user_id was missing FK to auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_user_id_fkey'
  ) THEN
    ALTER TABLE public.notifications 
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- scanned_prescriptions.user_id was missing FK to auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'scanned_prescriptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.scanned_prescriptions 
      ADD CONSTRAINT scanned_prescriptions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ===========================================
-- 2. Audit log for admin actions
-- ===========================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit entries"
ON public.audit_log FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

-- ===========================================
-- 3. Drug interaction check log (for analytics)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.interaction_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  drug_a_id UUID REFERENCES public.drugs(id),
  drug_b_id UUID REFERENCES public.drugs(id),
  result TEXT CHECK (result IN ('safe', 'warning', 'critical', 'unknown')),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interaction_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert checks"
ON public.interaction_checks FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Admins and pharmacists can view checks"
ON public.interaction_checks FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'pharmacist') OR
  auth.uid() = user_id
);

CREATE INDEX idx_interaction_checks_created ON public.interaction_checks(created_at DESC);

-- ===========================================
-- 4. Performance indexes
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_wilaya ON public.profiles(wilaya);
CREATE INDEX IF NOT EXISTS idx_pharmacy_patients_pharmacist ON public.pharmacy_patients(pharmacist_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_user ON public.patient_medications(user_id);
CREATE INDEX IF NOT EXISTS idx_ordonnances_user ON public.ordonnances(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- ===========================================
-- 5. Seed drug interaction data
-- ===========================================

-- Only insert if no interactions exist yet
INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar)
SELECT 
  a.id, b.id, 'critical',
  'Association dangereuse: risque hémorragique majeur', 
  'تداخل خطير: خطر نزيف كبير',
  'La Warfarine et l''Aspirine agissent sur des voies différentes de la coagulation',
  'Éviter cette association sauf avis médical spécialisé avec suivi INR renforcé',
  'تجنب هذا الجمع إلا بنصيحة طبية مع مراقبة INR'
FROM public.drugs a, public.drugs b
WHERE a.generic_name = 'Warfarin' AND a.dosage = '5mg'
  AND b.generic_name = 'Aspirin' AND b.dosage = '100mg'
  AND NOT EXISTS (SELECT 1 FROM public.drug_interactions WHERE drug_a_id = a.id AND drug_b_id = b.id);

INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar)
SELECT 
  a.id, b.id, 'warning',
  'Risque accru d''effets indésirables gastro-intestinaux',
  'خطر متزايد لآثار جانبية معوية',
  'Les deux AINS augmentent le risque d''ulcère et de saignement gastrique',
  'Ne pas associer deux AINS. Utiliser le Paracétamol comme alternative',
  'لا تجمع بين مضادين للالتهاب. استخدم الباراسيتامول كبديل'
FROM public.drugs a, public.drugs b
WHERE a.generic_name = 'Ibuprofen' AND a.dosage = '400mg'
  AND b.generic_name = 'Diclofenac' AND b.dosage = '50mg'
  AND NOT EXISTS (SELECT 1 FROM public.drug_interactions WHERE drug_a_id = a.id AND drug_b_id = b.id);

INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar)
SELECT 
  a.id, b.id, 'warning',
  'La Ciprofloxacine peut augmenter l''effet anticoagulant de la Warfarine',
  'السيبروفلوكساسين قد يزيد من تأثير الوارفارين المضاد للتخثر',
  'Inhibition du métabolisme de la Warfarine par la Ciprofloxacine (CYP1A2)',
  'Surveillance INR renforcée pendant le traitement antibiotique',
  'مراقبة INR معززة أثناء العلاج بالمضاد الحيوي'
FROM public.drugs a, public.drugs b
WHERE a.generic_name = 'Ciprofloxacin' AND a.dosage = '500mg'
  AND b.generic_name = 'Warfarin' AND b.dosage = '5mg'
  AND NOT EXISTS (SELECT 1 FROM public.drug_interactions WHERE drug_a_id = a.id AND drug_b_id = b.id);

INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar)
SELECT 
  a.id, b.id, 'safe',
  'Association sûre et couramment utilisée',
  'تداخل آمن وشائع الاستخدام',
  'Mécanismes d''action complémentaires sans interférence significative',
  'Association possible sans précaution particulière',
  'يمكن الجمع بينهما دون احتياطات خاصة'
FROM public.drugs a, public.drugs b
WHERE a.generic_name = 'Paracetamol' AND a.dosage = '1g'
  AND b.generic_name = 'Amoxicillin' AND b.dosage = '1g'
  AND NOT EXISTS (SELECT 1 FROM public.drug_interactions WHERE drug_a_id = a.id AND drug_b_id = b.id);
