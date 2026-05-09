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