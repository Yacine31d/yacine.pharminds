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

-- Insert realistic sample data (will be associated with logged-in pharmacist via code)
-- These are sample Algerian patients with realistic information