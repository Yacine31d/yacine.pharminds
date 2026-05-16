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