-- ============================================================
-- PharMinds Algeria - Seed Data (Real Algerian Pharmacopeia)
-- ============================================================

-- -------------------------------------------------------
-- 1. DRUGS – Extended Algerian pharmacopeia (PRICE IN DZD)
-- Includes: brand names, CNAS reimbursable status, ATC codes
-- -------------------------------------------------------

INSERT INTO public.drugs (name_fr, name_ar, generic_name, brand_name, dosage, form, manufacturer, atc_code, is_generic, cnas_reimbursable, price_dz) VALUES

-- Antibiotiques
('Augmentin 1g', 'أوغمنتين 1غ', 'Amoxicillin/Clavulanic acid', 'Augmentin', '1g/125mg', 'Comprimé', 'GSK', 'J01CR02', false, true, 850.00),
('Clamoxyl 500mg', 'كلاموكسيل 500 ملغ', 'Amoxicillin', 'Clamoxyl', '500mg', 'Gélule', 'Sanofi', 'J01CA04', false, true, 420.00),
('Flagyl 500mg', 'فلاجيل 500 ملغ', 'Metronidazole', 'Flagyl', '500mg', 'Comprimé', 'Sanofi', 'J01XD01', false, true, 280.00),
('Métronidazole 500mg', 'ميترونيدازول 500 ملغ', 'Metronidazole', NULL, '500mg', 'Comprimé', 'Saidal', 'J01XD01', true, true, 180.00),
('Doxycycline 100mg', 'دوكسيسيكلين 100 ملغ', 'Doxycycline', NULL, '100mg', 'Comprimé', 'Saidal', 'J01AA02', true, true, 320.00),
('Rifampicine 300mg', 'ريفامبيسين 300 ملغ', 'Rifampicin', 'Rifadine', '300mg', 'Gélule', 'Sanofi', 'J04AB02', false, true, 650.00),
('Isoniazide 300mg', 'إيزونيازيد 300 ملغ', 'Isoniazid', NULL, '300mg', 'Comprimé', 'Saidal', 'J04AC01', true, true, 220.00),

-- Analgésiques / Anti-inflammatoires
('Doliprane 1000mg', 'دوليبران 1000 ملغ', 'Paracetamol', 'Doliprane', '1000mg', 'Comprimé', 'Sanofi', 'N02BE01', false, true, 250.00),
('Dafalgan 500mg', 'دافالغان 500 ملغ', 'Paracetamol', 'Dafalgan', '500mg', 'Comprimé', 'UPSA', 'N02BE01', false, true, 230.00),
('Voltarène 100mg LP', 'فولتارين 100 ملغ', 'Diclofenac', 'Voltarène', '100mg', 'Comprimé LP', 'Novartis', 'M01AB05', false, true, 480.00),
('Kétoprofène 100mg', 'كيتوبروفين 100 ملغ', 'Ketoprofen', NULL, '100mg', 'Suppositoire', 'Saidal', 'M01AE03', true, false, 350.00),
('Laroxyl 25mg', 'لاروكسيل 25 ملغ', 'Amitriptyline', 'Laroxyl', '25mg', 'Comprimé', 'Roche', 'N06AA09', false, true, 380.00),
('Tramadol 100mg', 'ترامادول 100 ملغ', 'Tramadol', NULL, '100mg', 'Comprimé', 'Saidal', 'N02AX02', true, true, 420.00),

-- Cardiovasculaire
('Bisoprolol 5mg', 'بيسوبرولول 5 ملغ', 'Bisoprolol', NULL, '5mg', 'Comprimé', 'Saidal', 'C07AB07', true, true, 380.00),
('Bisoprolol 10mg', 'بيسوبرولول 10 ملغ', 'Bisoprolol', NULL, '10mg', 'Comprimé', 'Saidal', 'C07AB07', true, true, 480.00),
('Ramipril 5mg', 'راميبريل 5 ملغ', 'Ramipril', 'Triatec', '5mg', 'Comprimé', 'Sanofi', 'C09AA05', false, true, 520.00),
('Perindopril 5mg', 'بيريندوبريل 5 ملغ', 'Perindopril', 'Coversyl', '5mg', 'Comprimé', 'Servier', 'C09AA04', false, true, 580.00),
('Valsartan 80mg', 'فالسارتان 80 ملغ', 'Valsartan', 'Nisis', '80mg', 'Comprimé', 'Novartis', 'C09CA03', false, true, 620.00),
('Furosémide 40mg', 'فوروسيميد 40 ملغ', 'Furosemide', NULL, '40mg', 'Comprimé', 'Saidal', 'C03CA01', true, true, 180.00),
('Spironolactone 25mg', 'سبيرونولاكتون 25 ملغ', 'Spironolactone', NULL, '25mg', 'Comprimé', 'Saidal', 'C03DA01', true, true, 280.00),
('Digoxine 0,25mg', 'ديجوكسين 0.25 ملغ', 'Digoxin', NULL, '0,25mg', 'Comprimé', 'Saidal', 'C01AA05', true, true, 150.00),
('Nitroglycérine 0,5mg', 'نيتروغليسيرين 0.5 ملغ', 'Glyceryl trinitrate', 'Trinitrine', '0,5mg', 'Comprimé sublingual', 'Sanofi', 'C01DA02', false, true, 320.00),
('Simvastatine 20mg', 'سيمفاستاتين 20 ملغ', 'Simvastatin', NULL, '20mg', 'Comprimé', 'Saidal', 'C10AA01', true, true, 420.00),
('Rosuvastatine 10mg', 'روسوفاستاتين 10 ملغ', 'Rosuvastatin', 'Crestor', '10mg', 'Comprimé', 'AstraZeneca', 'C10AA07', false, true, 780.00),
('Clopidogrel 75mg', 'كلوبيدوغريل 75 ملغ', 'Clopidogrel', 'Plavix', '75mg', 'Comprimé', 'Sanofi', 'B01AC04', false, true, 890.00),

-- Diabète et endocrinologie
('Metformine 500mg', 'ميتفورمين 500 ملغ', 'Metformin', NULL, '500mg', 'Comprimé', 'Saidal', 'A10BA02', true, true, 180.00),
('Glibenclamide 5mg', 'غليبنكلاميد 5 ملغ', 'Glibenclamide', NULL, '5mg', 'Comprimé', 'Saidal', 'A10BB01', true, true, 120.00),
('Gliclazide 80mg', 'غليكلازيد 80 ملغ', 'Gliclazide', 'Diamicron', '80mg', 'Comprimé', 'Servier', 'A10BB09', false, true, 450.00),
('Sitagliptine 100mg', 'سيتاغليبتين 100 ملغ', 'Sitagliptin', 'Januvia', '100mg', 'Comprimé', 'MSD', 'A10BH01', false, true, 1850.00),
('Insuline Humaine NPH', 'أنسولين بشري NPH', 'Human Insulin', 'Insulatard', '100 UI/mL', 'Solution injectable', 'Novo Nordisk', 'A10AC01', false, true, 1200.00),
('Lévothyroxine 50µg', 'ليفوثيروكسين 50 ميكروغرام', 'Levothyroxine', 'Euthyrox', '50µg', 'Comprimé', 'Merck', 'H03AA01', false, true, 320.00),
('Lévothyroxine 100µg', 'ليفوثيروكسين 100 ميكروغرام', 'Levothyroxine', 'Euthyrox', '100µg', 'Comprimé', 'Merck', 'H03AA01', false, true, 420.00),

-- Gastro-entérologie
('Inexium 20mg', 'إينكسيوم 20 ملغ', 'Esomeprazole', 'Inexium', '20mg', 'Comprimé', 'AstraZeneca', 'A02BC05', false, true, 680.00),
('Lansoprazole 30mg', 'لانسوبرازول 30 ملغ', 'Lansoprazole', NULL, '30mg', 'Gélule', 'Saidal', 'A02BC03', true, true, 480.00),
('Smecta 3g', 'سمكتا 3غ', 'Diosmectite', 'Smecta', '3g', 'Poudre orale', 'Ipsen', 'A07BC05', false, false, 320.00),
('Spasfon 80mg', 'سباسفون 80 ملغ', 'Phloroglucinol', 'Spasfon', '80mg', 'Comprimé', 'Cephalon', 'A03AX13', false, false, 280.00),
('Duphalac Sirop', 'دوفالاك شراب', 'Lactulose', 'Duphalac', '3.33g/5mL', 'Sirop', 'Abbott', 'A06AD11', false, false, 580.00),
('Forlax 10g', 'فورلاكس 10غ', 'Macrogol', 'Forlax', '10g', 'Poudre orale', 'Ipsen', 'A06AD15', false, false, 650.00),

-- Système respiratoire
('Ventoline 100µg', 'فنتولين 100 ميكروغرام', 'Salbutamol', 'Ventoline', '100µg/dose', 'Inhalateur', 'GSK', 'R03AC02', false, true, 850.00),
('Serevent 25µg', 'سيريفنت 25 ميكروغرام', 'Salmeterol', 'Serevent', '25µg/dose', 'Inhalateur', 'GSK', 'R03AC12', false, true, 1800.00),
('Flixotide 250µg', 'فليكسوتيد 250 ميكروغرام', 'Fluticasone', 'Flixotide', '250µg/dose', 'Inhalateur', 'GSK', 'R03BA05', false, true, 2200.00),
('Seretide 25/250', 'سيريتيد 25/250', 'Salmeterol/Fluticasone', 'Seretide', '25/250µg', 'Inhalateur', 'GSK', 'R03AK06', false, true, 3200.00),
('Atrovent 20µg', 'أتروفنت 20 ميكروغرام', 'Ipratropium', 'Atrovent', '20µg/dose', 'Inhalateur', 'Boehringer', 'R03BB01', false, true, 1100.00),
('Rhinathiol 5%', 'رينا تيول 5%', 'Carbocysteine', 'Rhinathiol', '5%', 'Sirop', 'Sanofi', 'R05CB03', false, false, 420.00),
('Toplexil', 'توبليكسيل', 'Oxomemazine', 'Toplexil', '0,33mg/mL', 'Sirop', 'Sanofi', 'R06AD08', false, false, 380.00),

-- Dermatologie
('Fucidine 2%', 'فوسيدين 2%', 'Fusidic acid', 'Fucidine', '2%', 'Crème', 'LEO Pharma', 'D06AX01', false, false, 680.00),
('Bactroban 2%', 'باكتروبان 2%', 'Mupirocin', 'Bactroban', '2%', 'Pommade', 'GSK', 'D06AX09', false, false, 780.00),
('Betadine 10%', 'بيتادين 10%', 'Povidone-iodine', 'Betadine', '10%', 'Solution', 'Viatris', 'D08AG02', false, false, 380.00),
('Hydrocortisone 1%', 'هيدروكورتيزون 1%', 'Hydrocortisone', NULL, '1%', 'Crème', 'Saidal', 'D07AA02', true, true, 280.00),

-- Système nerveux
('Xanax 0,25mg', 'زاناكس 0.25 ملغ', 'Alprazolam', 'Xanax', '0,25mg', 'Comprimé', 'Pfizer', 'N05BA12', false, true, 380.00),
('Lexomil 6mg', 'ليكسوميل 6 ملغ', 'Bromazepam', 'Lexomil', '6mg', 'Comprimé', 'Roche', 'N05BA08', false, true, 420.00),
('Rispéridone 2mg', 'ريسبيريدون 2 ملغ', 'Risperidone', 'Risperdal', '2mg', 'Comprimé', 'Janssen', 'N05AX08', false, true, 950.00),
('Prégabaline 75mg', 'بريغابالين 75 ملغ', 'Pregabalin', 'Lyrica', '75mg', 'Gélule', 'Pfizer', 'N03AX16', false, true, 1200.00),
('Donépézil 10mg', 'دونيبيزيل 10 ملغ', 'Donepezil', 'Aricept', '10mg', 'Comprimé', 'Eisai', 'N06DA02', false, true, 2800.00),

-- Vitamines et suppléments
('Vitamine D3 100000 UI', 'فيتامين د3 100000 وحدة', 'Cholecalciferol', 'Uvedose', '100000 UI', 'Solution buvable', 'Chibret', 'A11CC05', false, false, 380.00),
('Vitamine C 1g', 'فيتامين ج 1غ', 'Ascorbic acid', NULL, '1g', 'Comprimé effervescent', 'Saidal', 'A11GA01', true, false, 180.00),
('Fer Folate', 'حديد وحمض الفوليك', 'Ferrous sulfate/Folic acid', 'Tardyferon B9', '80mg/0,35mg', 'Comprimé', 'Pierre Fabre', 'B03AE01', false, true, 480.00),
('Calcium Vitamine D3', 'كالسيوم فيتامين د3', 'Calcium carbonate/D3', 'Cacit D3', '500mg/400UI', 'Comprimé', 'Warner Chilcott', 'A12AX', false, false, 650.00),
('Zinc 15mg', 'زنك 15 ملغ', 'Zinc gluconate', NULL, '15mg', 'Comprimé', 'Saidal', 'A12CB01', true, false, 220.00),

-- Ophtalmologie
('Chibro-Timoptol 0,5%', 'شيبرو تيموبتول 0.5%', 'Timolol', 'Timoptol', '0,5%', 'Collyre', 'MSD', 'S01ED01', false, true, 580.00),
('Tobrex 0,3%', 'توبركس 0.3%', 'Tobramycin', 'Tobrex', '0,3%', 'Collyre', 'Alcon', 'S01AA12', false, false, 620.00),
('Voltarène Opht 0,1%', 'فولتارين عيني 0.1%', 'Diclofenac', 'Voltarène Ophta', '0,1%', 'Collyre', 'Novartis', 'S01BC03', false, false, 480.00)

ON CONFLICT DO NOTHING;


-- -------------------------------------------------------
-- 2. DRUG INTERACTIONS – Clinically significant pairs
-- Based on Vidal Algérie / ANSM standards
-- -------------------------------------------------------

-- We need drug IDs — resolved by name
DO $$
DECLARE
  v_warfarine UUID;
  v_aspirine UUID;
  v_ibuprofene UUID;
  v_diclofenac UUID;
  v_metformine_850 UUID;
  v_metformine_1000 UUID;
  v_sitagliptine UUID;
  v_clopidogrel UUID;
  v_simvastatine UUID;
  v_atorvastatine UUID;
  v_azithromycine UUID;
  v_ciprofloxacine UUID;
  v_levofloxacine UUID;
  v_doxycycline UUID;
  v_metronidazole UUID;
  v_omeprazole UUID;
  v_pantoprazole UUID;
  v_bisoprolol5 UUID;
  v_ramipril UUID;
  v_furosemide UUID;
  v_spironolactone UUID;
  v_digoxine UUID;
  v_losartan UUID;
  v_amlodipine5 UUID;
  v_pregabaline UUID;
  v_alprazolam UUID;
  v_tramadol UUID;
  v_amox500 UUID;
  v_rifampicine UUID;
  v_levothyroxine50 UUID;
  v_ceftriaxone UUID;

BEGIN
  SELECT id INTO v_warfarine FROM public.drugs WHERE generic_name = 'Warfarin' LIMIT 1;
  SELECT id INTO v_aspirine FROM public.drugs WHERE generic_name = 'Aspirin' LIMIT 1;
  SELECT id INTO v_ibuprofene FROM public.drugs WHERE generic_name = 'Ibuprofen' LIMIT 1;
  SELECT id INTO v_diclofenac FROM public.drugs WHERE generic_name = 'Diclofenac' LIMIT 1;
  SELECT id INTO v_metformine_850 FROM public.drugs WHERE generic_name = 'Metformin' AND dosage = '850mg' LIMIT 1;
  SELECT id INTO v_sitagliptine FROM public.drugs WHERE generic_name = 'Sitagliptin' LIMIT 1;
  SELECT id INTO v_clopidogrel FROM public.drugs WHERE generic_name = 'Clopidogrel' LIMIT 1;
  SELECT id INTO v_simvastatine FROM public.drugs WHERE generic_name = 'Simvastatin' LIMIT 1;
  SELECT id INTO v_atorvastatine FROM public.drugs WHERE generic_name = 'Atorvastatin' LIMIT 1;
  SELECT id INTO v_azithromycine FROM public.drugs WHERE generic_name = 'Azithromycin' LIMIT 1;
  SELECT id INTO v_ciprofloxacine FROM public.drugs WHERE generic_name = 'Ciprofloxacin' LIMIT 1;
  SELECT id INTO v_levofloxacine FROM public.drugs WHERE generic_name = 'Levofloxacin' LIMIT 1;
  SELECT id INTO v_doxycycline FROM public.drugs WHERE generic_name = 'Doxycycline' LIMIT 1;
  SELECT id INTO v_metronidazole FROM public.drugs WHERE generic_name = 'Metronidazole' LIMIT 1;
  SELECT id INTO v_omeprazole FROM public.drugs WHERE generic_name = 'Omeprazole' LIMIT 1;
  SELECT id INTO v_pantoprazole FROM public.drugs WHERE generic_name = 'Pantoprazole' LIMIT 1;
  SELECT id INTO v_bisoprolol5 FROM public.drugs WHERE generic_name = 'Bisoprolol' AND dosage = '5mg' LIMIT 1;
  SELECT id INTO v_ramipril FROM public.drugs WHERE generic_name = 'Ramipril' LIMIT 1;
  SELECT id INTO v_furosemide FROM public.drugs WHERE generic_name = 'Furosemide' LIMIT 1;
  SELECT id INTO v_spironolactone FROM public.drugs WHERE generic_name = 'Spironolactone' LIMIT 1;
  SELECT id INTO v_digoxine FROM public.drugs WHERE generic_name = 'Digoxin' LIMIT 1;
  SELECT id INTO v_losartan FROM public.drugs WHERE generic_name = 'Losartan' LIMIT 1;
  SELECT id INTO v_amlodipine5 FROM public.drugs WHERE generic_name = 'Amlodipine' AND dosage = '5mg' LIMIT 1;
  SELECT id INTO v_pregabaline FROM public.drugs WHERE generic_name = 'Pregabalin' LIMIT 1;
  SELECT id INTO v_alprazolam FROM public.drugs WHERE generic_name = 'Alprazolam' LIMIT 1;
  SELECT id INTO v_tramadol FROM public.drugs WHERE generic_name = 'Tramadol' LIMIT 1;
  SELECT id INTO v_amox500 FROM public.drugs WHERE generic_name = 'Amoxicillin' AND dosage = '500mg' LIMIT 1;
  SELECT id INTO v_rifampicine FROM public.drugs WHERE generic_name = 'Rifampicin' LIMIT 1;
  SELECT id INTO v_levothyroxine50 FROM public.drugs WHERE generic_name = 'Levothyroxine' AND dosage = '50µg' LIMIT 1;

  -- CRITICAL INTERACTIONS
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

  -- WARNING INTERACTIONS
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

  IF v_metformine_850 IS NOT NULL AND v_ciprofloxacine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_metformine_850, v_ciprofloxacine, 'warning',
      'La ciprofloxacine peut perturber la glycémie (hypoglycémie ou hyperglycémie) chez les patients diabétiques traités par metformine.',
      'يمكن أن تؤثر السيبروفلوكساسين على مستوى السكر في الدم (نقص أو ارتفاع السكر) لدى مرضى السكري المعالجين بالميتفورمين.',
      'Perturbation de la sécrétion d''insuline et de la sensibilité à l''insuline',
      'Surveiller la glycémie quotidiennement pendant la durée du traitement antibiotique.',
      'راقب نسبة السكر في الدم يومياً طوال مدة العلاج بالمضاد الحيوي.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

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

  IF v_rifampicine IS NOT NULL AND v_levothyroxine50 IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_rifampicine, v_levothyroxine50, 'warning',
      'La rifampicine est un puissant inducteur enzymatique qui accélère le métabolisme de la lévothyroxine, pouvant entraîner une hypothyroïdie.',
      'الريفامبيسين محفز إنزيمي قوي يسرع استقلاب الليفوثيروكسين مما قد يؤدي إلى قصور الغدة الدرقية.',
      'Induction du CYP3A4 et augmentation de la clairance de la lévothyroxine',
      'Surveiller le TSH régulièrement. Augmenter la dose de lévothyroxine si nécessaire.',
      'راقب TSH بانتظام. زد جرعة الليفوثيروكسين إذا لزم الأمر.',
      'Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  -- SAFE (documented safe combinations requiring monitoring)
  IF v_metformine_850 IS NOT NULL AND v_sitagliptine IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_metformine_850, v_sitagliptine, 'safe',
      'Association bien tolérée et recommandée en 2ème ligne dans le diabète de type 2. Risque hypoglycémique faible.',
      'تركيب جيد التحمل وموصى به في الخط الثاني لمرض السكري النوع 2. خطر نقص السكر منخفض.',
      'Mécanismes complémentaires : inhibition de la DPP-4 + réduction de la néoglucogenèse hépatique',
      'Association recommandée. Surveiller la fonction rénale (DFG) avant chaque renouvellement.',
      'تركيب موصى به. راقب وظيفة الكلى (DFG) قبل كل تجديد.',
      'HAS Algeria / Vidal Algérie 2024')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_amlodipine5 IS NOT NULL AND v_ramipril IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_amlodipine5, v_ramipril, 'safe',
      'Association antihypertensive synergique recommandée. Bonne tolérance et efficacité prouvée sur la réduction des événements cardiovasculaires.',
      'تركيب مضاد للضغط متآزر وموصى به. تحمل جيد وفعالية مثبتة في تقليل الحوادث القلبية والوعائية.',
      'Vasodilatation via blocage des canaux calciques + inhibition de l''enzyme de conversion',
      'Association recommandée en HTA. Surveiller la créatinine et la kaliémie.',
      'تركيب موصى به في ارتفاع ضغط الدم. راقب الكرياتينين والبوتاسيوم.',
      'ESC Guidelines 2024 / Vidal Algérie')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_bisoprolol5 IS NOT NULL AND v_ramipril IS NOT NULL THEN
    INSERT INTO public.drug_interactions (drug_a_id, drug_b_id, severity, description_fr, description_ar, mechanism, recommendation_fr, recommendation_ar, source)
    VALUES (v_bisoprolol5, v_ramipril, 'safe',
      'Association synergique dans l''insuffisance cardiaque. Améliore le pronostic et réduit le risque de mortalité cardiovasculaire.',
      'تركيب متآزر في القصور القلبي. يحسن التشخيص ويقلل خطر الوفاة القلبية والوعائية.',
      'Blocage béta-adrénergique + inhibition de l''enzyme de conversion',
      'Association recommandée dans l''insuffisance cardiaque systolique. Débuter à faibles doses et titrer progressivement.',
      'تركيب موصى به في القصور القلبي الانقباضي. ابدأ بجرعات منخفضة وزدها تدريجياً.',
      'ESC Heart Failure Guidelines 2023')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;


-- -------------------------------------------------------
-- 3. INVENTORY – Update stock to reflect Algerian pharmacy reality
-- -------------------------------------------------------
INSERT INTO public.inventory (drug_id, current_stock, min_stock_threshold, max_stock, batch_number, expiry_date, last_restocked_at)
SELECT
  d.id,
  CASE
    WHEN d.generic_name IN ('Paracetamol', 'Metformin', 'Amoxicillin') THEN (random() * 180 + 80)::integer
    WHEN d.cnas_reimbursable = true THEN (random() * 120 + 30)::integer
    ELSE (random() * 80 + 10)::integer
  END as current_stock,
  CASE
    WHEN d.generic_name IN ('Insulin', 'Warfarin', 'Digoxin') THEN 15
    WHEN d.is_generic = true THEN 25
    ELSE 20
  END as min_stock_threshold,
  CASE
    WHEN d.form = 'Inhalateur' THEN 50
    WHEN d.price_dz > 1000 THEN 80
    ELSE 200
  END as max_stock,
  'SAIDAL-' || upper(substring(md5(d.name_fr), 1, 8)) as batch_number,
  (CURRENT_DATE + (random() * 500 + 90)::integer) as expiry_date,
  (now() - (random() * 30)::integer * INTERVAL '1 day') as last_restocked_at
FROM public.drugs d
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory i WHERE i.drug_id = d.id
)
ON CONFLICT DO NOTHING;
