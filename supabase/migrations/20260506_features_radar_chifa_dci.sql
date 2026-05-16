-- ============================================================
-- PharMinds Algeria — Strategic Features Migration
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Drug descriptions for Ordonnance Claire
ALTER TABLE drugs
  ADD COLUMN IF NOT EXISTS description_fr TEXT,
  ADD COLUMN IF NOT EXISTS description_ar TEXT,
  ADD COLUMN IF NOT EXISTS usage_tip_fr   TEXT;

UPDATE drugs SET
  description_fr = CASE generic_name
    WHEN 'Paracetamol'   THEN 'Antidouleur et antipyrétique pour la fièvre et les douleurs légères à modérées'
    WHEN 'Amoxicillin'   THEN 'Antibiotique de la famille des pénicillines contre les infections bactériennes'
    WHEN 'Metformin'     THEN 'Médicament antidiabétique oral pour le diabète de type 2'
    WHEN 'Ibuprofen'     THEN 'Anti-inflammatoire non stéroïdien contre la douleur et l''inflammation'
    WHEN 'Omeprazole'    THEN 'Protecteur gastrique qui réduit l''acidité de l''estomac'
    WHEN 'Atorvastatin'  THEN 'Médicament hypolipémiant pour réduire le cholestérol'
    WHEN 'Amlodipine'    THEN 'Antihypertenseur pour traiter la tension artérielle élevée'
    WHEN 'Ramipril'      THEN 'Médicament pour l''hypertension et l''insuffisance cardiaque'
    WHEN 'Bisoprolol'    THEN 'Bêtabloquant pour l''hypertension et les problèmes cardiaques'
    WHEN 'Azithromycin'  THEN 'Antibiotique macrolide contre les infections respiratoires et ORL'
    WHEN 'Ciprofloxacin' THEN 'Antibiotique quinolone à large spectre'
    WHEN 'Salbutamol'    THEN 'Bronchodilatateur pour soulager les crises d''asthme'
    WHEN 'Levothyroxine' THEN 'Hormone thyroïdienne pour traiter l''hypothyroïdie'
    WHEN 'Diclofenac'    THEN 'Anti-inflammatoire pour les douleurs articulaires et musculaires'
    ELSE 'Médicament prescrit par votre médecin'
  END,
  usage_tip_fr = CASE generic_name
    WHEN 'Paracetamol'   THEN 'Ne pas dépasser 4g par jour. À prendre avec un verre d''eau.'
    WHEN 'Amoxicillin'   THEN 'Terminer le traitement complet même si vous vous sentez mieux.'
    WHEN 'Metformin'     THEN 'Prendre pendant ou après les repas pour réduire les effets digestifs.'
    WHEN 'Ibuprofen'     THEN 'Prendre avec de la nourriture. Éviter si problèmes gastriques.'
    WHEN 'Omeprazole'    THEN 'Prendre 30 minutes avant le repas pour une efficacité optimale.'
    WHEN 'Atorvastatin'  THEN 'Peut être pris à n''importe quel moment de la journée.'
    WHEN 'Amlodipine'    THEN 'Ne pas arrêter sans l''avis de votre médecin.'
    WHEN 'Salbutamol'    THEN 'Agiter l''inhalateur avant chaque utilisation.'
    ELSE 'Suivre les instructions de votre médecin ou pharmacien.'
  END
WHERE description_fr IS NULL;

-- 2. Chifa claims tracking table
CREATE TABLE IF NOT EXISTS chifa_claims (
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

ALTER TABLE chifa_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pharmacist_own_claims" ON chifa_claims;
CREATE POLICY "pharmacist_own_claims" ON chifa_claims
  FOR ALL USING (auth.uid() = pharmacist_id);

-- 3. Shortage alerts table
CREATE TABLE IF NOT EXISTS shortage_alerts (
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

ALTER TABLE shortage_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shortage_alerts_read" ON shortage_alerts;
CREATE POLICY "shortage_alerts_read" ON shortage_alerts
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "shortage_alerts_admin_write" ON shortage_alerts;
CREATE POLICY "shortage_alerts_admin_write" ON shortage_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 4. Seed initial shortage alerts for demo
INSERT INTO shortage_alerts (drug_id, wilaya, alert_type, severity, affected_pharmacies_count, message_fr, is_active)
SELECT id, 'Alger', 'seasonal_risk', 'warning', 7,
  'Augmentation des prescriptions détectée — pensez à réapprovisionner avant rupture', true
FROM drugs WHERE generic_name = 'Amoxicillin' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO shortage_alerts (drug_id, wilaya, alert_type, severity, affected_pharmacies_count, message_fr, is_active)
SELECT id, 'Oran', 'low_stock_network', 'critical', 12,
  'Rupture signalée dans 12 pharmacies de la wilaya — stock critique', true
FROM drugs WHERE generic_name = 'Metformin' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO shortage_alerts (drug_id, wilaya, alert_type, severity, affected_pharmacies_count, message_fr, is_active)
SELECT id, NULL, 'demand_spike', 'warning', 23,
  'Forte demande nationale — vérifier vos niveaux de stock', true
FROM drugs WHERE generic_name = 'Paracetamol' LIMIT 1
ON CONFLICT DO NOTHING;
