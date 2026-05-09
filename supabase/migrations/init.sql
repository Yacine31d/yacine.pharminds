-- ============================================================
-- PharMinds Algeria - Consolidated Database Schema
-- Run this in your new Supabase project's SQL Editor
-- ============================================================

-- ===========================================
-- MIGRATION 1: Core Tables & Auth
-- ===========================================

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'pharmacist', 'patient');

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'patient',
  preferred_language TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_language IN ('fr', 'ar')),
  phone TEXT,
  wilaya TEXT,
  pharmacy_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for secure role checking
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create drugs table (Algerian pharmacopeia)
CREATE TABLE public.drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  generic_name TEXT NOT NULL,
  brand_name TEXT,
  dosage TEXT,
  form TEXT,
  manufacturer TEXT,
  atc_code TEXT,
  is_generic BOOLEAN DEFAULT false,
  cnas_reimbursable BOOLEAN DEFAULT false,
  price_dz DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drug interactions table
CREATE TABLE public.drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  drug_b_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'safe')),
  description_fr TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  mechanism TEXT,
  recommendation_fr TEXT,
  recommendation_ar TEXT,
  source TEXT DEFAULT 'Vidal Algérie',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drug_a_id, drug_b_id)
);

-- Create patient medications table
CREATE TABLE public.patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  dosage TEXT,
  frequency TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table for AI assistant
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'ar')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles: Users can read their own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: Only admins can manage
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Drugs: Readable by all authenticated users
CREATE POLICY "Authenticated users can view drugs" ON public.drugs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage drugs" ON public.drugs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Drug interactions: Readable by all authenticated
CREATE POLICY "Authenticated users can view interactions" ON public.drug_interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage interactions" ON public.drug_interactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Patient medications: Users can manage own
CREATE POLICY "Users can view own medications" ON public.patient_medications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications" ON public.patient_medications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications" ON public.patient_medications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications" ON public.patient_medications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Pharmacists can view all medications" ON public.patient_medications
  FOR SELECT USING (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'));

-- Chat messages: Users manage own
CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for search
CREATE INDEX idx_drugs_name_fr ON public.drugs USING gin(to_tsvector('french', name_fr));
CREATE INDEX idx_drugs_name_ar ON public.drugs(name_ar);
CREATE INDEX idx_drugs_generic ON public.drugs(generic_name);

-- Seed initial drug data (Algerian pharmacopeia)
INSERT INTO public.drugs (name_fr, name_ar, generic_name, dosage, form, is_generic, cnas_reimbursable, price_dz) VALUES
('Paracétamol 500mg', 'باراسيتامول 500 ملغ', 'Paracetamol', '500mg', 'Comprimé', true, true, 120.00),
('Paracétamol 1g', 'باراسيتامول 1غ', 'Paracetamol', '1g', 'Comprimé', true, true, 180.00),
('Amoxicilline 500mg', 'أموكسيسيلين 500 ملغ', 'Amoxicillin', '500mg', 'Gélule', true, true, 350.00),
('Amoxicilline 1g', 'أموكسيسيلين 1غ', 'Amoxicillin', '1g', 'Comprimé', true, true, 520.00),
('Oméprazole 20mg', 'أوميبرازول 20 ملغ', 'Omeprazole', '20mg', 'Gélule', true, true, 450.00),
('Metformine 850mg', 'ميتفورمين 850 ملغ', 'Metformin', '850mg', 'Comprimé', true, true, 280.00),
('Metformine 1000mg', 'ميتفورمين 1000 ملغ', 'Metformin', '1000mg', 'Comprimé', true, true, 320.00),
('Aspirine 100mg', 'أسبيرين 100 ملغ', 'Aspirin', '100mg', 'Comprimé', true, true, 150.00),
('Warfarine 5mg', 'وارفارين 5 ملغ', 'Warfarin', '5mg', 'Comprimé', true, true, 380.00),
('Ibuprofène 400mg', 'إيبوبروفين 400 ملغ', 'Ibuprofen', '400mg', 'Comprimé', true, true, 220.00),
('Diclofénac 50mg', 'ديكلوفيناك 50 ملغ', 'Diclofenac', '50mg', 'Comprimé', true, true, 180.00),
('Amlodipine 5mg', 'أملوديبين 5 ملغ', 'Amlodipine', '5mg', 'Comprimé', true, true, 340.00),
('Amlodipine 10mg', 'أملوديبين 10 ملغ', 'Amlodipine', '10mg', 'Comprimé', true, true, 420.00),
('Atorvastatine 20mg', 'أتورفاستاتين 20 ملغ', 'Atorvastatin', '20mg', 'Comprimé', true, true, 580.00),
('Losartan 50mg', 'لوسارتان 50 ملغ', 'Losartan', '50mg', 'Comprimé', true, true, 450.00),
('Ciprofloxacine 500mg', 'سيبروفلوكساسين 500 ملغ', 'Ciprofloxacin', '500mg', 'Comprimé', true, true, 420.00),
('Azithromycine 500mg', 'أزيثروميسين 500 ملغ', 'Azithromycin', '500mg', 'Comprimé', true, true, 650.00),
('Céfixime 200mg', 'سيفيكسيم 200 ملغ', 'Cefixime', '200mg', 'Comprimé', true, true, 580.00),
('Lévofloxacine 500mg', 'ليفوفلوكساسين 500 ملغ', 'Levofloxacin', '500mg', 'Comprimé', true, true, 720.00),
('Pantoprazole 40mg', 'بانتوبرازول 40 ملغ', 'Pantoprazole', '40mg', 'Comprimé', true, true, 480.00);

-- ===========================================
-- MIGRATION 2: Carte Chifa & Ordonnances
-- ===========================================

-- Create carte_chifa table for health insurance card tracking
CREATE TABLE public.carte_chifa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_number TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  birth_date DATE,
  expiry_date DATE,
  coverage_type TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ordonnances table for prescriptions
CREATE TABLE public.ordonnances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doctor_name TEXT NOT NULL,
  doctor_specialty TEXT,
  hospital_name TEXT,
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ordonnance_medications for medications in prescriptions
CREATE TABLE public.ordonnance_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordonnance_id UUID NOT NULL REFERENCES public.ordonnances(id) ON DELETE CASCADE,
  drug_id UUID REFERENCES public.drugs(id),
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  quantity INTEGER,
  instructions TEXT,
  is_dispensed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carte_chifa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordonnances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordonnance_medications ENABLE ROW LEVEL SECURITY;

-- Carte Chifa policies
CREATE POLICY "Users can view own carte chifa" ON public.carte_chifa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own carte chifa" ON public.carte_chifa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own carte chifa" ON public.carte_chifa FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Pharmacists can view all carte chifa" ON public.carte_chifa FOR SELECT USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

-- Ordonnances policies
CREATE POLICY "Users can view own ordonnances" ON public.ordonnances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ordonnances" ON public.ordonnances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ordonnances" ON public.ordonnances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Pharmacists can view all ordonnances" ON public.ordonnances FOR SELECT USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

-- Ordonnance medications policies
CREATE POLICY "Users can view own ordonnance medications" ON public.ordonnance_medications FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.ordonnances WHERE id = ordonnance_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own ordonnance medications" ON public.ordonnance_medications FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.ordonnances WHERE id = ordonnance_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own ordonnance medications" ON public.ordonnance_medications FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.ordonnances WHERE id = ordonnance_id AND user_id = auth.uid()));
CREATE POLICY "Pharmacists can view all ordonnance medications" ON public.ordonnance_medications FOR SELECT 
USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Pharmacists can update ordonnance medications" ON public.ordonnance_medications FOR UPDATE 
USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_carte_chifa_updated_at BEFORE UPDATE ON public.carte_chifa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_ordonnances_updated_at BEFORE UPDATE ON public.ordonnances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===========================================
-- MIGRATION 3: Storage, Notifications & Scanned Prescriptions
-- ===========================================

-- Create storage bucket for prescription images
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for prescriptions bucket
CREATE POLICY "Users can upload own prescriptions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own prescriptions"
ON storage.objects FOR SELECT
USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Pharmacists can view all prescriptions"
ON storage.objects FOR SELECT
USING (bucket_id = 'prescriptions' AND (
  public.has_role(auth.uid(), 'pharmacist') OR 
  public.has_role(auth.uid(), 'admin')
));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('drug_interaction', 'low_stock', 'prescription_ready', 'system', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create scanned_prescriptions table to store scan results
CREATE TABLE public.scanned_prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  doctor_name TEXT,
  patient_name TEXT,
  prescription_date DATE,
  extracted_medications JSONB DEFAULT '[]',
  confidence_score NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scanned_prescriptions ENABLE ROW LEVEL SECURITY;

-- Scanned prescriptions policies
CREATE POLICY "Users can view own scanned prescriptions"
ON public.scanned_prescriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scanned prescriptions"
ON public.scanned_prescriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scanned prescriptions"
ON public.scanned_prescriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Pharmacists can view all scanned prescriptions"
ON public.scanned_prescriptions FOR SELECT
USING (public.has_role(auth.uid(), 'pharmacist') OR public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_scanned_prescriptions_updated_at
BEFORE UPDATE ON public.scanned_prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ===========================================
-- MIGRATION 4: Inventory & Low Stock Alerts
-- ===========================================

-- Create inventory table to track stock levels
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  pharmacy_id UUID, -- For multi-pharmacy support in future
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER NOT NULL DEFAULT 20,
  max_stock INTEGER DEFAULT 200,
  unit TEXT DEFAULT 'unités',
  batch_number TEXT,
  expiry_date DATE,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  last_stock_check_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drug_id, batch_number)
);

-- Create index for faster lookups
CREATE INDEX idx_inventory_drug_id ON public.inventory(drug_id);
CREATE INDEX idx_inventory_low_stock ON public.inventory(current_stock) WHERE current_stock < 20;

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Pharmacists can view all inventory"
ON public.inventory
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Pharmacists can insert inventory"
ON public.inventory
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Pharmacists can update inventory"
ON public.inventory
FOR UPDATE
USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inventory"
ON public.inventory
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create low stock alerts table to track notifications sent
CREATE TABLE public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  drug_id UUID NOT NULL REFERENCES public.drugs(id) ON DELETE CASCADE,
  stock_level INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent_to TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for alerts
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view all low stock alerts"
ON public.low_stock_alerts
FOR SELECT
USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
ON public.low_stock_alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Pharmacists can update alerts"
ON public.low_stock_alerts
FOR UPDATE
USING (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'admin'));

-- Initialize inventory with sample data for existing drugs
INSERT INTO public.inventory (drug_id, current_stock, min_stock_threshold, batch_number, expiry_date)
SELECT 
  id,
  (random() * 150 + 10)::integer as current_stock,
  20 as min_stock_threshold,
  'LOT-' || substring(id::text, 1, 8) as batch_number,
  (CURRENT_DATE + (random() * 365 + 30)::integer) as expiry_date
FROM public.drugs
ON CONFLICT DO NOTHING;

-- ===========================================
-- MIGRATION 5: Pharmacy Patients
-- ===========================================

-- Create pharmacy_patients table to store pharmacist-patient relationships
CREATE TABLE public.pharmacy_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacist_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  wilaya TEXT,
  carte_chifa_number TEXT,
  blood_type TEXT,
  allergies TEXT[],
  chronic_conditions TEXT[],
  notes TEXT,
  has_alerts BOOLEAN DEFAULT false,
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pharmacy_patients ENABLE ROW LEVEL SECURITY;

-- Pharmacists can view their own patients
CREATE POLICY "Pharmacists can view own patients"
ON public.pharmacy_patients
FOR SELECT
USING (
  pharmacist_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Pharmacists can insert their own patients
CREATE POLICY "Pharmacists can insert own patients"
ON public.pharmacy_patients
FOR INSERT
WITH CHECK (
  pharmacist_id = auth.uid() AND
  (has_role(auth.uid(), 'pharmacist'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Pharmacists can update their own patients
CREATE POLICY "Pharmacists can update own patients"
ON public.pharmacy_patients
FOR UPDATE
USING (
  pharmacist_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Pharmacists can delete their own patients
CREATE POLICY "Pharmacists can delete own patients"
ON public.pharmacy_patients
FOR DELETE
USING (
  pharmacist_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_pharmacy_patients_updated_at
BEFORE UPDATE ON public.pharmacy_patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
