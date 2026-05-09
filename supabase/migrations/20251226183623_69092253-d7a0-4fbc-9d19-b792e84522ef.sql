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