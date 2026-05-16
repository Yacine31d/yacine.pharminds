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