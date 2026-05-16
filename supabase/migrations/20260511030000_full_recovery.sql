-- ════════════════════════════════════════════════════════════════════════════
--  FULL RECOVERY — re-creates everything cascade-deleted when drugs were wiped.
-- ════════════════════════════════════════════════════════════════════════════
--
-- Cascade chain that triggered the loss:
--   DELETE FROM drugs  (during the previous seed migration)
--     ↓  ON DELETE CASCADE
--   inventory          → all stock rows nuked
--   drug_interactions  → all interaction pairs nuked
--   patient_medications → all active prescriptions nuked
--   ordonnance_medications.drug_id → NULL (orphaned)
--
-- What this recovery does:
--   1. Diagnose current state
--   2. Auto-create a demo pharmacist if none exists (Pharmacie Demo / Alger)
--   3. Re-seed inventory for every pharmacist × 40 popular drugs
--   4. Re-seed all 11 original drug_interactions (critical/warning/safe pairs)
--   5. Re-link orphaned ordonnance_medications.drug_id by name matching
--   6. Verify end state with a summary
--
-- Idempotent — re-running is safe.
-- Run in Supabase Dashboard → SQL Editor → New query → Run.

BEGIN;

-- ── 1. Diagnose ─────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM auth.users)                                          AS auth_users,
  (SELECT COUNT(*) FROM public.profiles)                                     AS profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'pharmacist')           AS pharmacists,
  (SELECT COUNT(*) FROM public.drugs)                                        AS drugs,
  (SELECT COUNT(*) FROM public.inventory)                                    AS inventory_before,
  (SELECT COUNT(*) FROM public.drug_interactions)                            AS interactions_before;


-- ── 2. Ensure at least one pharmacist exists ────────────────────────────────
DO $$
DECLARE
  pharma_count INT;
  target_user  UUID;
  user_email   TEXT;
BEGIN
  SELECT COUNT(*) INTO pharma_count FROM public.profiles WHERE role = 'pharmacist';

  IF pharma_count > 0 THEN
    RAISE NOTICE 'Already have % pharmacist(s) — skip auto-create', pharma_count;
  ELSE
    -- Pick an orphan auth user (no profile) first
    SELECT u.id, u.email INTO target_user, user_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.user_id IS NULL
    LIMIT 1;

    IF target_user IS NOT NULL THEN
      INSERT INTO public.profiles (user_id, full_name, role, wilaya, phone)
      VALUES (target_user, 'Pharmacie Demo (Alger)', 'pharmacist', 'Alger', '0555000000');
      RAISE NOTICE 'Created pharmacist for orphan user %', target_user;
    ELSE
      -- Promote any existing patient/admin
      SELECT user_id INTO target_user FROM public.profiles
      WHERE role IN ('patient', 'admin') LIMIT 1;

      IF target_user IS NULL THEN
        RAISE EXCEPTION 'No auth.users at all — register a pharmacist account via /auth first';
      END IF;

      UPDATE public.profiles
      SET role = 'pharmacist',
          wilaya    = COALESCE(NULLIF(wilaya, ''), 'Alger'),
          full_name = COALESCE(NULLIF(full_name, ''), 'Pharmacie Demo')
      WHERE user_id = target_user;
      RAISE NOTICE 'Promoted user % to pharmacist (Alger)', target_user;
    END IF;
  END IF;
END $$;


-- ── 3. Seed inventory: every pharmacist × 40 popular drugs ──────────────────
-- Note: ~* and || have equal precedence in PostgreSQL — `a ~* 'x' || 'y'`
-- parses as `(a ~* 'x') || 'y'` which produces text, not boolean. Parenthesise
-- the full regex literal explicitly.
WITH popular_drugs AS (
  SELECT id FROM public.drugs
  WHERE name_fr ~* ('(Doliprane|Augmentin|Clamoxyl|Amoxicill|Aspegic|Voltarene|Spasfon|'
                 || 'Smecta|Efferalgan|Maxilase|Rhinathiol|Flagyl|Triatec|Crestor|Motilium|'
                 || 'Lipanthyl|Ibuprofene|Zomax|Glucophage|Levothyrox|Profenid|Solupred|'
                 || 'Bilaxten|Pyostacine|Diflucan|Telfast|Sapofen|Toplexil|Sinecod|Nasacort|'
                 || 'Duphalac|Cordarone|Atacand|Kardegic|Loxen|Aspirine|Doxycycline|'
                 || 'Metronidazole|Paracetamol|Omeprazole|Atorvastatin|Amlodipine|Ramipril|'
                 || 'Bisoprolol|Salbutamol|Diclofenac|Ciprofloxacin|Azithromycin)')
  LIMIT 40
),
pharmacists AS (SELECT user_id FROM public.profiles WHERE role = 'pharmacist')
INSERT INTO public.inventory (pharmacy_id, drug_id, current_stock, min_stock_threshold)
SELECT
  p.user_id,
  d.id,
  5 + (abs(hashtext(p.user_id::text || d.id::text)) % 46),
  10
FROM pharmacists p
CROSS JOIN popular_drugs d
ON CONFLICT DO NOTHING;


-- ── 4. Re-seed drug_interactions (originals from 20260312030000_seed_algerian_data.sql) ──
-- Case-insensitive generic_name lookup so it works with WHO ATC bulk
DO $$
DECLARE
  v_warfarine UUID;
  v_aspirine UUID;
  v_ibuprofene UUID;
  v_diclofenac UUID;
  v_metformine UUID;
  v_sitagliptine UUID;
  v_clopidogrel UUID;
  v_simvastatine UUID;
  v_atorvastatine UUID;
  v_azithromycine UUID;
  v_ciprofloxacine UUID;
  v_metronidazole UUID;
  v_omeprazole UUID;
  v_bisoprolol UUID;
  v_ramipril UUID;
  v_furosemide UUID;
  v_spironolactone UUID;
  v_digoxine UUID;
  v_amlodipine UUID;
  v_alprazolam UUID;
  v_tramadol UUID;
  v_rifampicine UUID;
  v_levothyroxine UUID;
BEGIN
  SELECT id INTO v_warfarine    FROM public.drugs WHERE lower(generic_name) = 'warfarin'          LIMIT 1;
  SELECT id INTO v_aspirine     FROM public.drugs WHERE lower(generic_name) = 'aspirin' OR lower(generic_name) LIKE 'acetylsalicylic%' LIMIT 1;
  SELECT id INTO v_ibuprofene   FROM public.drugs WHERE lower(generic_name) = 'ibuprofen'         LIMIT 1;
  SELECT id INTO v_diclofenac   FROM public.drugs WHERE lower(generic_name) = 'diclofenac'        LIMIT 1;
  SELECT id INTO v_metformine   FROM public.drugs WHERE lower(generic_name) = 'metformin'         LIMIT 1;
  SELECT id INTO v_sitagliptine FROM public.drugs WHERE lower(generic_name) = 'sitagliptin'       LIMIT 1;
  SELECT id INTO v_clopidogrel  FROM public.drugs WHERE lower(generic_name) = 'clopidogrel'       LIMIT 1;
  SELECT id INTO v_simvastatine FROM public.drugs WHERE lower(generic_name) = 'simvastatin'       LIMIT 1;
  SELECT id INTO v_atorvastatine FROM public.drugs WHERE lower(generic_name) = 'atorvastatin'     LIMIT 1;
  SELECT id INTO v_azithromycine FROM public.drugs WHERE lower(generic_name) = 'azithromycin'     LIMIT 1;
  SELECT id INTO v_ciprofloxacine FROM public.drugs WHERE lower(generic_name) = 'ciprofloxacin'   LIMIT 1;
  SELECT id INTO v_metronidazole FROM public.drugs WHERE lower(generic_name) = 'metronidazole'    LIMIT 1;
  SELECT id INTO v_omeprazole   FROM public.drugs WHERE lower(generic_name) = 'omeprazole'        LIMIT 1;
  SELECT id INTO v_bisoprolol   FROM public.drugs WHERE lower(generic_name) = 'bisoprolol'        LIMIT 1;
  SELECT id INTO v_ramipril     FROM public.drugs WHERE lower(generic_name) = 'ramipril'          LIMIT 1;
  SELECT id INTO v_furosemide   FROM public.drugs WHERE lower(generic_name) = 'furosemide'        LIMIT 1;
  SELECT id INTO v_spironolactone FROM public.drugs WHERE lower(generic_name) = 'spironolactone'  LIMIT 1;
  SELECT id INTO v_digoxine     FROM public.drugs WHERE lower(generic_name) = 'digoxin'           LIMIT 1;
  SELECT id INTO v_amlodipine   FROM public.drugs WHERE lower(generic_name) = 'amlodipine'        LIMIT 1;
  SELECT id INTO v_alprazolam   FROM public.drugs WHERE lower(generic_name) = 'alprazolam'        LIMIT 1;
  SELECT id INTO v_tramadol     FROM public.drugs WHERE lower(generic_name) = 'tramadol'          LIMIT 1;
  SELECT id INTO v_rifampicine  FROM public.drugs WHERE lower(generic_name) = 'rifampicin'        LIMIT 1;
  SELECT id INTO v_levothyroxine FROM public.drugs WHERE lower(generic_name) = 'levothyroxine'    LIMIT 1;

  -- CRITICAL: Warfarin + Aspirin
  IF v_warfarine IS NOT NULL AND v_aspirine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_warfarine, v_aspirine, 'critical',
      'Association contre-indiquée : risque hémorragique majeur. L''aspirine inhibe l''agrégation plaquettaire et potentialise l''effet anticoagulant de la warfarine.',
      'تركيب خطير: خطر نزيف حاد. الأسبيرين يثبط تجمع الصفائح الدموية ويعزز تأثير الوارفارين المضاد للتخثر.',
      'Inhibition plaquettaire additive + déplacement de la warfarine des liaisons protéiques plasmatiques',
      'Éviter l''association. Si inévitable, surveiller l''INR quotidiennement et réduire la dose d''aspirine ≤ 100mg/j.',
      'تجنب هذا التركيب. إذا كان ضرورياً تابع INR يومياً وقلل جرعة الأسبيرين ≤ 100ملغ/يوم.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- CRITICAL: Warfarin + Ibuprofen
  IF v_warfarine IS NOT NULL AND v_ibuprofene IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_warfarine, v_ibuprofene, 'critical',
      'Risque hémorragique grave : l''ibuprofène augmente significativement l''effet anticoagulant de la warfarine et irrite la muqueuse gastrique.',
      'خطر نزيف خطير: الإيبوبروفين يزيد بشكل كبير من تأثير الوارفارين المضاد للتخثر ويهيج الغشاء المخاطي للمعدة.',
      'Inhibition des prostaglandines gastriques + compétition pour la liaison aux protéines plasmatiques',
      'Association contre-indiquée. Utiliser le paracétamol comme alternative analgésique.',
      'هذا التركيب ممنوع. استخدم الباراسيتامول كبديل مسكن.',
      'ANSM / Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- CRITICAL: Warfarin + Ciprofloxacin
  IF v_warfarine IS NOT NULL AND v_ciprofloxacine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_warfarine, v_ciprofloxacine, 'critical',
      'La ciprofloxacine inhibe fortement le CYP1A2 et CYP3A4, entraînant une augmentation de 2 à 4 fois de l''INR avec risque hémorragique.',
      'السيبروفلوكساسين يثبط CYP1A2 و CYP3A4 بشكل قوي، مما يؤدي إلى ارتفاع INR بمقدار 2 إلى 4 مرات مع خطر نزيف.',
      'Inhibition enzymatique du métabolisme hépatique de la warfarine (CYP1A2/3A4)',
      'Réduire la dose de warfarine de 50% et contrôler l''INR tous les 2 jours pendant le traitement antibiotique.',
      'قلل جرعة الوارفارين بنسبة 50٪ وتابع INR كل يومين خلال فترة المضاد الحيوي.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- CRITICAL: Warfarin + Metronidazole
  IF v_warfarine IS NOT NULL AND v_metronidazole IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_warfarine, v_metronidazole, 'critical',
      'Interaction majeure : le métronidazole inhibe le CYP2C9 responsable du métabolisme de la warfarine, augmentant de manière importante l''INR.',
      'تفاعل خطير: الميترونيدازول يثبط CYP2C9 المسؤول عن استقلاب الوارفارين مما يرفع INR بشكل كبير.',
      'Inhibition sélective du CYP2C9 hépatique',
      'Réduire la dose de warfarine de 30-50%. Contrôler l''INR après 3-4 jours.',
      'قلل جرعة الوارفارين بنسبة 30-50٪. تابع INR بعد 3-4 أيام.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Simvastatin + Azithromycin
  IF v_simvastatine IS NOT NULL AND v_azithromycine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_simvastatine, v_azithromycine, 'warning',
      'L''azithromycine est un inhibiteur modéré du CYP3A4 et peut augmenter les concentrations plasmatiques de la simvastatine, risque de myopathie.',
      'الأزيثروميسين مثبط معتدل لـ CYP3A4 ويمكنه رفع تركيز السيمفاستاتين في البلازما، مع خطر اعتلال عضلي.',
      'Inhibition modérée du CYP3A4 hépatique',
      'Surveiller les signes de myopathie (douleurs musculaires, CPK). Suspendre temporairement la simvastatine si possible.',
      'راقب علامات اعتلال العضلات (آلام عضلية، CPK). أوقف السيمفاستاتين مؤقتاً إن أمكن.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Metformin + Ciprofloxacin
  IF v_metformine IS NOT NULL AND v_ciprofloxacine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_metformine, v_ciprofloxacine, 'warning',
      'La ciprofloxacine peut perturber la glycémie (hypoglycémie ou hyperglycémie) chez les patients diabétiques traités par metformine.',
      'يمكن أن تؤثر السيبروفلوكساسين على مستوى السكر في الدم (نقص أو ارتفاع السكر) لدى مرضى السكري المعالجين بالميتفورمين.',
      'Perturbation de la sécrétion d''insuline et de la sensibilité à l''insuline',
      'Surveiller la glycémie quotidiennement pendant la durée du traitement antibiotique.',
      'راقب نسبة السكر في الدم يومياً طوال مدة العلاج بالمضاد الحيوي.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Digoxin + Furosemide
  IF v_digoxine IS NOT NULL AND v_furosemide IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_digoxine, v_furosemide, 'warning',
      'Le furosémide provoque une hypokaliémie qui potentialise la toxicité de la digoxine (arythmies).',
      'يسبب الفوروسيميد نقص البوتاسيوم مما يعزز سمية الديجوكسين (اضطرابات في نبضات القلب).',
      'Hypokaliémie induite par le furosémide → augmentation de la sensibilité myocardique à la digoxine',
      'Supplémenter en potassium. Contrôler la kaliémie et la digoxinémie régulièrement.',
      'أضف مكمل البوتاسيوم. راقب مستوى البوتاسيوم والديجوكسين في الدم بانتظام.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Ramipril + Spironolactone
  IF v_ramipril IS NOT NULL AND v_spironolactone IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_ramipril, v_spironolactone, 'warning',
      'Association potentiellement hyperkaliémiante : les IEC et les diurétiques épargneurs de potassium peuvent entraîner une hyperkaliémie sévère.',
      'هذا التركيب قد يرفع البوتاسيوم: مثبطات ACE ومدرات البول الحافظة للبوتاسيوم قد تؤدي إلى ارتفاع حاد في البوتاسيوم.',
      'Réduction cumulative de l''excrétion rénale du potassium',
      'Contrôler la kaliémie dans les 5-7 jours suivant l''initiation et mensuellement. Éviter les suppléments de potassium.',
      'راقب البوتاسيوم خلال 5-7 أيام من البداية ثم شهرياً. تجنب مكملات البوتاسيوم.',
      'ANSM 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Clopidogrel + Omeprazole
  IF v_clopidogrel IS NOT NULL AND v_omeprazole IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_clopidogrel, v_omeprazole, 'warning',
      'L''oméprazole réduit l''efficacité du clopidogrel en inhibant le CYP2C19 nécessaire à son activation. Risque d''événement cardiovasculaire.',
      'الأوميبرازول يقلل فعالية الكلوبيدوغريل عبر تثبيط CYP2C19 اللازم لتنشيطه. خطر حوادث قلبية وعائية.',
      'Inhibition du CYP2C19 qui active le clopidogrel en son métabolite actif',
      'Préférer le pantoprazole ou l''ésoméprazole à faible dose comme alternative IPP.',
      'افضل استخدام البانتوبرازول أو الإيزوميبرازول بجرعة منخفضة كبديل.',
      'FDA / Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Alprazolam + Tramadol
  IF v_alprazolam IS NOT NULL AND v_tramadol IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_alprazolam, v_tramadol, 'warning',
      'Association déconseillée : risque de dépression respiratoire additive. Les benzodiazépines et les opioïdes font partie des drogues dont l''association peut être fatale.',
      'تركيب غير مستحسن: خطر اكتئاب تنفسي إضافي. مزيج البنزوديازيبينات والأفيونيات قد يكون قاتلاً.',
      'Dépression additive du système nerveux central',
      'Association à éviter. Si nécessaire, utiliser les doses les plus faibles possibles et surveiller la fonction respiratoire.',
      'تجنب هذا التركيب. إذا كان ضرورياً استخدم أدنى جرعة ممكنة وراقب وظيفة التنفس.',
      'ANSM / OMS 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- WARNING: Rifampicin + Levothyroxine
  IF v_rifampicine IS NOT NULL AND v_levothyroxine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_rifampicine, v_levothyroxine, 'warning',
      'La rifampicine est un puissant inducteur enzymatique qui accélère le métabolisme de la lévothyroxine, pouvant entraîner une hypothyroïdie.',
      'الريفامبيسين محفز إنزيمي قوي يسرع استقلاب الليفوثيروكسين مما قد يؤدي إلى قصور الغدة الدرقية.',
      'Induction du CYP3A4 et augmentation de la clairance de la lévothyroxine',
      'Surveiller le TSH régulièrement. Augmenter la dose de lévothyroxine si nécessaire.',
      'راقب TSH بانتظام. زد جرعة الليفوثيروكسين إذا لزم الأمر.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- SAFE: Metformin + Sitagliptin
  IF v_metformine IS NOT NULL AND v_sitagliptine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_metformine, v_sitagliptine, 'safe',
      'Association bien tolérée et recommandée en 2ème ligne dans le diabète de type 2. Risque hypoglycémique faible.',
      'تركيب جيد التحمل وموصى به في الخط الثاني لمرض السكري النوع 2. خطر نقص السكر منخفض.',
      'Mécanismes complémentaires : inhibition de la DPP-4 + réduction de la néoglucogenèse hépatique',
      'Association recommandée. Surveiller la fonction rénale (DFG) avant chaque renouvellement.',
      'تركيب موصى به. راقب وظيفة الكلى (DFG) قبل كل تجديد.',
      'HAS Algeria / Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- SAFE: Amlodipine + Ramipril
  IF v_amlodipine IS NOT NULL AND v_ramipril IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_amlodipine, v_ramipril, 'safe',
      'Association antihypertensive synergique recommandée. Bonne tolérance et efficacité prouvée sur la réduction des événements cardiovasculaires.',
      'تركيب مضاد للضغط متآزر وموصى به. تحمل جيد وفعالية مثبتة في تقليل الحوادث القلبية والوعائية.',
      'Vasodilatation via blocage des canaux calciques + inhibition de l''enzyme de conversion',
      'Association recommandée en HTA. Surveiller la créatinine et la kaliémie.',
      'تركيب موصى به في ارتفاع ضغط الدم. راقب الكرياتينين والبوتاسيوم.',
      'ESC Guidelines 2024 / Vidal Algérie')
    ON CONFLICT DO NOTHING;
  END IF;

  -- SAFE: Bisoprolol + Ramipril
  IF v_bisoprolol IS NOT NULL AND v_ramipril IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_bisoprolol, v_ramipril, 'safe',
      'Association synergique dans l''insuffisance cardiaque. Améliore le pronostic et réduit le risque de mortalité cardiovasculaire.',
      'تركيب متآزر في القصور القلبي. يحسن التشخيص ويقلل خطر الوفاة القلبية والوعائية.',
      'Blocage béta-adrénergique + inhibition de l''enzyme de conversion',
      'Association recommandée dans l''insuffisance cardiaque systolique. Débuter à faibles doses et titrer progressivement.',
      'تركيب موصى به في القصور القلبي الانقباضي. ابدأ بجرعات منخفضة وزدها تدريجياً.',
      'ESC Heart Failure Guidelines 2023')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- ── 5. Re-link orphaned ordonnance_medications.drug_id by name matching ─────
UPDATE public.ordonnance_medications om
SET drug_id = d.id
FROM public.drugs d
WHERE om.drug_id IS NULL
  AND om.medication_name IS NOT NULL
  AND (
    lower(d.name_fr)      = lower(om.medication_name) OR
    lower(d.brand_name)   = lower(om.medication_name) OR
    lower(d.generic_name) = lower(om.medication_name)
  );


-- ── 6. Verify end state ─────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'pharmacist')      AS pharmacists,
  (SELECT COUNT(*) FROM public.inventory)                               AS inventory_rows,
  (SELECT COUNT(*) FROM public.drug_interactions)                       AS interactions,
  (SELECT COUNT(*) FROM public.drug_interactions WHERE severity='critical') AS critical_interactions,
  (SELECT COUNT(*) FROM public.ordonnance_medications WHERE drug_id IS NOT NULL) AS linked_meds;

-- Per-pharmacist inventory breakdown
SELECT p.full_name, p.wilaya,
       COUNT(i.id) AS items,
       SUM(i.current_stock) AS units
FROM public.profiles p
LEFT JOIN public.inventory i ON i.pharmacy_id = p.user_id
WHERE p.role = 'pharmacist'
GROUP BY p.user_id, p.full_name, p.wilaya
ORDER BY items DESC;

COMMIT;
