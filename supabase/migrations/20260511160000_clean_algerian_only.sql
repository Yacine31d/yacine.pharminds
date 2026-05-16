BEGIN;
-- ════════════════════════════════════════════════════════════════════════════
--  CLEAN ALGERIAN-ONLY RECOVERY
--  Wipes the polluted WHO ATC bulk (3648 entries with chemistry compounds)
--  and restores the canonical 144-drug curated Algerian database.
--
--  Then re-seeds inventory + drug_interactions that were cascade-deleted.
--  Atomic — wrapped in a single transaction.
--
--  Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════════════════════


-- Relax NOT NULL on all optional columns. Real pharma data is patchy:
--   - WHO ATC bulk has no Arabic names, brand_name, dosage, manufacturer, atc-only
--   - Brand-vocab entries have no generic_name or atc_code
--   - Only name_fr is universally guaranteed.
ALTER TABLE public.drugs ALTER COLUMN name_ar      DROP NOT NULL;
ALTER TABLE public.drugs ALTER COLUMN generic_name DROP NOT NULL;
ALTER TABLE public.drugs ALTER COLUMN brand_name   DROP NOT NULL;
ALTER TABLE public.drugs ALTER COLUMN dosage       DROP NOT NULL;
ALTER TABLE public.drugs ALTER COLUMN form         DROP NOT NULL;
ALTER TABLE public.drugs ALTER COLUMN manufacturer DROP NOT NULL;
ALTER TABLE public.drugs ALTER COLUMN atc_code     DROP NOT NULL;

-- ordonnance_medications.drug_id has no ON DELETE CASCADE (uses RESTRICT).
-- Null out the references first so the DELETE below can proceed. We re-link
-- them by medication_name → drugs.name_fr/brand_name/generic_name at the end
-- of this script (Step 5 in the recovery block).
UPDATE public.ordonnance_medications SET drug_id = NULL WHERE drug_id IS NOT NULL;

-- Wipe existing rows. With ordonnance_medications.drug_id nulled above and
-- inventory + drug_interactions + patient_medications set to ON DELETE CASCADE,
-- this is now safe.
DELETE FROM public.drugs;

INSERT INTO public.drugs (name_fr, name_ar, generic_name, brand_name, dosage, form, manufacturer, atc_code, is_generic, cnas_reimbursable, price_dz) VALUES
  ('Augmentin 1g', 'أوغمنتين 1غ', 'Amoxicillin/Clavulanic acid', 'Augmentin', '1g/125mg', 'Comprimé', 'GSK', 'J01CR02', false, true, 850.0),
  ('Clamoxyl 500mg', 'كلاموكسيل 500 ملغ', 'Amoxicillin', 'Clamoxyl', '500mg', 'Gélule', 'Sanofi', 'J01CA04', false, true, 420.0),
  ('Flagyl 500mg', 'فلاجيل 500 ملغ', 'Metronidazole', 'Flagyl', '500mg', 'Comprimé', 'Sanofi', 'J01XD01', false, true, 280.0),
  ('Métronidazole 500mg', 'ميترونيدازول 500 ملغ', 'Metronidazole', NULL, '500mg', 'Comprimé', 'Saidal', 'J01XD01', true, true, 180.0),
  ('Doxycycline 100mg', 'دوكسيسيكلين 100 ملغ', 'Doxycycline', NULL, '100mg', 'Comprimé', 'Saidal', 'J01AA02', true, true, 320.0),
  ('Rifampicine 300mg', 'ريفامبيسين 300 ملغ', 'Rifampicin', 'Rifadine', '300mg', 'Gélule', 'Sanofi', 'J04AB02', false, true, 650.0),
  ('Isoniazide 300mg', 'إيزونيازيد 300 ملغ', 'Isoniazid', NULL, '300mg', 'Comprimé', 'Saidal', 'J04AC01', true, true, 220.0),
  ('Doliprane 1000mg', 'دوليبران 1000 ملغ', 'Paracetamol', 'Doliprane', '1000mg', 'Comprimé', 'Sanofi', 'N02BE01', false, true, 250.0),
  ('Dafalgan 500mg', 'دافالغان 500 ملغ', 'Paracetamol', 'Dafalgan', '500mg', 'Comprimé', 'UPSA', 'N02BE01', false, true, 230.0),
  ('Voltarène 100mg LP', 'فولتارين 100 ملغ', 'Diclofenac', 'Voltarène', '100mg', 'Comprimé LP', 'Novartis', 'M01AB05', false, true, 480.0),
  ('Kétoprofène 100mg', 'كيتوبروفين 100 ملغ', 'Ketoprofen', NULL, '100mg', 'Suppositoire', 'Saidal', 'M01AE03', true, false, 350.0),
  ('Laroxyl 25mg', 'لاروكسيل 25 ملغ', 'Amitriptyline', 'Laroxyl', '25mg', 'Comprimé', 'Roche', 'N06AA09', false, true, 380.0),
  ('Tramadol 100mg', 'ترامادول 100 ملغ', 'Tramadol', NULL, '100mg', 'Comprimé', 'Saidal', 'N02AX02', true, true, 420.0),
  ('Bisoprolol 5mg', 'بيسوبرولول 5 ملغ', 'Bisoprolol', NULL, '5mg', 'Comprimé', 'Saidal', 'C07AB07', true, true, 380.0),
  ('Bisoprolol 10mg', 'بيسوبرولول 10 ملغ', 'Bisoprolol', NULL, '10mg', 'Comprimé', 'Saidal', 'C07AB07', true, true, 480.0),
  ('Ramipril 5mg', 'راميبريل 5 ملغ', 'Ramipril', 'Triatec', '5mg', 'Comprimé', 'Sanofi', 'C09AA05', false, true, 520.0),
  ('Perindopril 5mg', 'بيريندوبريل 5 ملغ', 'Perindopril', 'Coversyl', '5mg', 'Comprimé', 'Servier', 'C09AA04', false, true, 580.0),
  ('Valsartan 80mg', 'فالسارتان 80 ملغ', 'Valsartan', 'Nisis', '80mg', 'Comprimé', 'Novartis', 'C09CA03', false, true, 620.0),
  ('Furosémide 40mg', 'فوروسيميد 40 ملغ', 'Furosemide', NULL, '40mg', 'Comprimé', 'Saidal', 'C03CA01', true, true, 180.0),
  ('Spironolactone 25mg', 'سبيرونولاكتون 25 ملغ', 'Spironolactone', NULL, '25mg', 'Comprimé', 'Saidal', 'C03DA01', true, true, 280.0),
  ('Digoxine 0,25mg', 'ديجوكسين 0.25 ملغ', 'Digoxin', NULL, '0,25mg', 'Comprimé', 'Saidal', 'C01AA05', true, true, 150.0),
  ('Nitroglycérine 0,5mg', 'نيتروغليسيرين 0.5 ملغ', 'Glyceryl trinitrate', 'Trinitrine', '0,5mg', 'Comprimé sublingual', 'Sanofi', 'C01DA02', false, true, 320.0),
  ('Simvastatine 20mg', 'سيمفاستاتين 20 ملغ', 'Simvastatin', NULL, '20mg', 'Comprimé', 'Saidal', 'C10AA01', true, true, 420.0),
  ('Rosuvastatine 10mg', 'روسوفاستاتين 10 ملغ', 'Rosuvastatin', 'Crestor', '10mg', 'Comprimé', 'AstraZeneca', 'C10AA07', false, true, 780.0),
  ('Clopidogrel 75mg', 'كلوبيدوغريل 75 ملغ', 'Clopidogrel', 'Plavix', '75mg', 'Comprimé', 'Sanofi', 'B01AC04', false, true, 890.0),
  ('Metformine 500mg', 'ميتفورمين 500 ملغ', 'Metformin', NULL, '500mg', 'Comprimé', 'Saidal', 'A10BA02', true, true, 180.0),
  ('Glibenclamide 5mg', 'غليبنكلاميد 5 ملغ', 'Glibenclamide', NULL, '5mg', 'Comprimé', 'Saidal', 'A10BB01', true, true, 120.0),
  ('Gliclazide 80mg', 'غليكلازيد 80 ملغ', 'Gliclazide', 'Diamicron', '80mg', 'Comprimé', 'Servier', 'A10BB09', false, true, 450.0),
  ('Sitagliptine 100mg', 'سيتاغليبتين 100 ملغ', 'Sitagliptin', 'Januvia', '100mg', 'Comprimé', 'MSD', 'A10BH01', false, true, 1850.0),
  ('Insuline Humaine NPH', 'أنسولين بشري NPH', 'Human Insulin', 'Insulatard', '100 UI/mL', 'Solution injectable', 'Novo Nordisk', 'A10AC01', false, true, 1200.0),
  ('Lévothyroxine 50µg', 'ليفوثيروكسين 50 ميكروغرام', 'Levothyroxine', 'Euthyrox', '50µg', 'Comprimé', 'Merck', 'H03AA01', false, true, 320.0),
  ('Lévothyroxine 100µg', 'ليفوثيروكسين 100 ميكروغرام', 'Levothyroxine', 'Euthyrox', '100µg', 'Comprimé', 'Merck', 'H03AA01', false, true, 420.0),
  ('Inexium 20mg', 'إينكسيوم 20 ملغ', 'Esomeprazole', 'Inexium', '20mg', 'Comprimé', 'AstraZeneca', 'A02BC05', false, true, 680.0),
  ('Lansoprazole 30mg', 'لانسوبرازول 30 ملغ', 'Lansoprazole', NULL, '30mg', 'Gélule', 'Saidal', 'A02BC03', true, true, 480.0),
  ('Smecta 3g', 'سمكتا 3غ', 'Diosmectite', 'Smecta', '3g', 'Poudre orale', 'Ipsen', 'A07BC05', false, false, 320.0),
  ('Spasfon 80mg', 'سباسفون 80 ملغ', 'Phloroglucinol', 'Spasfon', '80mg', 'Comprimé', 'Cephalon', 'A03AX13', false, false, 280.0),
  ('Duphalac Sirop', 'دوفالاك شراب', 'Lactulose', 'Duphalac', '3.33g/5mL', 'Sirop', 'Abbott', 'A06AD11', false, false, 580.0),
  ('Forlax 10g', 'فورلاكس 10غ', 'Macrogol', 'Forlax', '10g', 'Poudre orale', 'Ipsen', 'A06AD15', false, false, 650.0),
  ('Ventoline 100µg', 'فنتولين 100 ميكروغرام', 'Salbutamol', 'Ventoline', '100µg/dose', 'Inhalateur', 'GSK', 'R03AC02', false, true, 850.0),
  ('Serevent 25µg', 'سيريفنت 25 ميكروغرام', 'Salmeterol', 'Serevent', '25µg/dose', 'Inhalateur', 'GSK', 'R03AC12', false, true, 1800.0),
  ('Flixotide 250µg', 'فليكسوتيد 250 ميكروغرام', 'Fluticasone', 'Flixotide', '250µg/dose', 'Inhalateur', 'GSK', 'R03BA05', false, true, 2200.0),
  ('Seretide 25/250', 'سيريتيد 25/250', 'Salmeterol/Fluticasone', 'Seretide', '25/250µg', 'Inhalateur', 'GSK', 'R03AK06', false, true, 3200.0),
  ('Atrovent 20µg', 'أتروفنت 20 ميكروغرام', 'Ipratropium', 'Atrovent', '20µg/dose', 'Inhalateur', 'Boehringer', 'R03BB01', false, true, 1100.0),
  ('Rhinathiol 5%', 'رينا تيول 5%', 'Carbocysteine', 'Rhinathiol', '5%', 'Sirop', 'Sanofi', 'R05CB03', false, false, 420.0),
  ('Toplexil', 'توبليكسيل', 'Oxomemazine', 'Toplexil', '0,33mg/mL', 'Sirop', 'Sanofi', 'R06AD08', false, false, 380.0),
  ('Fucidine 2%', 'فوسيدين 2%', 'Fusidic acid', 'Fucidine', '2%', 'Crème', 'LEO Pharma', 'D06AX01', false, false, 680.0),
  ('Bactroban 2%', 'باكتروبان 2%', 'Mupirocin', 'Bactroban', '2%', 'Pommade', 'GSK', 'D06AX09', false, false, 780.0),
  ('Betadine 10%', 'بيتادين 10%', 'Povidone-iodine', 'Betadine', '10%', 'Solution', 'Viatris', 'D08AG02', false, false, 380.0),
  ('Hydrocortisone 1%', 'هيدروكورتيزون 1%', 'Hydrocortisone', NULL, '1%', 'Crème', 'Saidal', 'D07AA02', true, true, 280.0),
  ('Xanax 0,25mg', 'زاناكس 0.25 ملغ', 'Alprazolam', 'Xanax', '0,25mg', 'Comprimé', 'Pfizer', 'N05BA12', false, true, 380.0),
  ('Lexomil 6mg', 'ليكسوميل 6 ملغ', 'Bromazepam', 'Lexomil', '6mg', 'Comprimé', 'Roche', 'N05BA08', false, true, 420.0),
  ('Rispéridone 2mg', 'ريسبيريدون 2 ملغ', 'Risperidone', 'Risperdal', '2mg', 'Comprimé', 'Janssen', 'N05AX08', false, true, 950.0),
  ('Prégabaline 75mg', 'بريغابالين 75 ملغ', 'Pregabalin', 'Lyrica', '75mg', 'Gélule', 'Pfizer', 'N03AX16', false, true, 1200.0),
  ('Donépézil 10mg', 'دونيبيزيل 10 ملغ', 'Donepezil', 'Aricept', '10mg', 'Comprimé', 'Eisai', 'N06DA02', false, true, 2800.0),
  ('Vitamine D3 100000 UI', 'فيتامين د3 100000 وحدة', 'Cholecalciferol', 'Uvedose', '100000 UI', 'Solution buvable', 'Chibret', 'A11CC05', false, false, 380.0),
  ('Vitamine C 1g', 'فيتامين ج 1غ', 'Ascorbic acid', NULL, '1g', 'Comprimé effervescent', 'Saidal', 'A11GA01', true, false, 180.0),
  ('Fer Folate', 'حديد وحمض الفوليك', 'Ferrous sulfate/Folic acid', 'Tardyferon B9', '80mg/0,35mg', 'Comprimé', 'Pierre Fabre', 'B03AE01', false, true, 480.0),
  ('Calcium Vitamine D3', 'كالسيوم فيتامين د3', 'Calcium carbonate/D3', 'Cacit D3', '500mg/400UI', 'Comprimé', 'Warner Chilcott', 'A12AX', false, false, 650.0),
  ('Zinc 15mg', 'زنك 15 ملغ', 'Zinc gluconate', NULL, '15mg', 'Comprimé', 'Saidal', 'A12CB01', true, false, 220.0),
  ('Chibro-Timoptol 0,5%', 'شيبرو تيموبتول 0.5%', 'Timolol', 'Timoptol', '0,5%', 'Collyre', 'MSD', 'S01ED01', false, true, 580.0),
  ('Tobrex 0,3%', 'توبركس 0.3%', 'Tobramycin', 'Tobrex', '0,3%', 'Collyre', 'Alcon', 'S01AA12', false, false, 620.0),
  ('Voltarène Opht 0,1%', 'فولتارين عيني 0.1%', 'Diclofenac', 'Voltarène Ophta', '0,1%', 'Collyre', 'Novartis', 'S01BC03', false, false, 480.0),
  ('Doliprane', NULL, NULL, 'Doliprane', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Augmentin', NULL, NULL, 'Augmentin', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Clamoxyl', NULL, NULL, 'Clamoxyl', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Amoxicilline', NULL, NULL, 'Amoxicilline', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Aspegic', NULL, NULL, 'Aspegic', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Voltarene', NULL, NULL, 'Voltarene', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Spasfon', NULL, NULL, 'Spasfon', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Smecta', NULL, NULL, 'Smecta', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Efferalgan', NULL, NULL, 'Efferalgan', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Maxilase', NULL, NULL, 'Maxilase', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Rhinathiol', NULL, NULL, 'Rhinathiol', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Flagyl', NULL, NULL, 'Flagyl', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Triatec', NULL, NULL, 'Triatec', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Crestor', NULL, NULL, 'Crestor', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Motilium', NULL, NULL, 'Motilium', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Bipreterax', NULL, NULL, 'Bipreterax', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Lipanthyl', NULL, NULL, 'Lipanthyl', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Ibuprofene', NULL, NULL, 'Ibuprofene', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Zomax', NULL, NULL, 'Zomax', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Sulpiride', NULL, NULL, 'Sulpiride', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Vitamag', NULL, NULL, 'Vitamag', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Detensiel', NULL, NULL, 'Detensiel', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Hytacand', NULL, NULL, 'Hytacand', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Lomac', NULL, NULL, 'Lomac', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Paracetamol', NULL, NULL, 'Paracetamol', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Ciprolon', NULL, NULL, 'Ciprolon', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Fucidine', NULL, NULL, 'Fucidine', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Antag', NULL, NULL, 'Antag', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Tamsir', NULL, NULL, 'Tamsir', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Prostamed', NULL, NULL, 'Prostamed', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Novorapid', NULL, NULL, 'Novorapid', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Tresiba', NULL, NULL, 'Tresiba', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Glucophage', NULL, NULL, 'Glucophage', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Levothyrox', NULL, NULL, 'Levothyrox', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Profenid', NULL, NULL, 'Profenid', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Myorelax', NULL, NULL, 'Myorelax', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Lisinox', NULL, NULL, 'Lisinox', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Ostonel', NULL, NULL, 'Ostonel', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Xydol', NULL, NULL, 'Xydol', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Baclon', NULL, NULL, 'Baclon', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Divido', NULL, NULL, 'Divido', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Solupred', NULL, NULL, 'Solupred', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Amoclan', NULL, NULL, 'Amoclan', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Bilaxten', NULL, NULL, 'Bilaxten', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Pyostacine', NULL, NULL, 'Pyostacine', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Diflucan', NULL, NULL, 'Diflucan', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Telfast', NULL, NULL, 'Telfast', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Sapofen', NULL, NULL, 'Sapofen', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Sinecod', NULL, NULL, 'Sinecod', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Nasacort', NULL, NULL, 'Nasacort', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Duphalac', NULL, NULL, 'Duphalac', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Meteoxane', NULL, NULL, 'Meteoxane', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Riabal', NULL, NULL, 'Riabal', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Naxolin', NULL, NULL, 'Naxolin', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Debridat', NULL, NULL, 'Debridat', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Supradyn', NULL, NULL, 'Supradyn', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Calcibronat', NULL, NULL, 'Calcibronat', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Tahor', NULL, NULL, 'Tahor', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Atenor', NULL, NULL, 'Atenor', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Loxen', NULL, NULL, 'Loxen', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Aspirine', NULL, NULL, 'Aspirine', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Fraxal', NULL, NULL, 'Fraxal', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Prostamixon', NULL, NULL, 'Prostamixon', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Diaphag', NULL, NULL, 'Diaphag', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Novoformine', NULL, NULL, 'Novoformine', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Diaglinid', NULL, NULL, 'Diaglinid', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Exval', NULL, NULL, 'Exval', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Cordarone', NULL, NULL, 'Cordarone', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Sarcand', NULL, NULL, 'Sarcand', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Atacand', NULL, NULL, 'Atacand', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Kardegic', NULL, NULL, 'Kardegic', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Metformin', NULL, NULL, 'Metformin', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Levothyroxine', NULL, NULL, 'Levothyroxine', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Bisoprolol', NULL, NULL, 'Bisoprolol', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Atorvastatin', NULL, NULL, 'Atorvastatin', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Amlodipine', NULL, NULL, 'Amlodipine', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Ramipril', NULL, NULL, 'Ramipril', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Salbutamol', NULL, NULL, 'Salbutamol', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Diclofenac', NULL, NULL, 'Diclofenac', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Omeprazole', NULL, NULL, 'Omeprazole', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Azithromycin', NULL, NULL, 'Azithromycin', NULL, NULL, NULL, NULL, false, false, 0.0),
  ('Ciprofloxacin', NULL, NULL, 'Ciprofloxacin', NULL, NULL, NULL, NULL, false, false, 0.0);

-- Verify
SELECT COUNT(*) AS drug_count FROM public.drugs;


-- ── Re-seed inventory + drug_interactions ───────────────────────────────────

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
