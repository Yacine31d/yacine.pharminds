-- ========================================================================
-- PharMinds Algeria - Secure Role Assignment Fix
-- Prevents users from signing up as 'admin' unless they are whitelisted.
-- ========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_role text;
  v_assigned_role app_role;
BEGIN
  -- Get the role requested from the client during signup
  v_requested_role := NEW.raw_user_meta_data->>'role';
  
  -- Determine the safe assigned role
  IF NEW.email = 'abdorenouni@gmail.com' THEN
    -- Only this specific email is allowed to be an admin
    v_assigned_role := 'admin'::app_role;
  ELSIF v_requested_role = 'pharmacist' THEN
    v_assigned_role := 'pharmacist'::app_role;
  ELSE
    -- Default everyone else to patient (blocks unauthorized 'admin' requests)
    v_assigned_role := 'patient'::app_role;
  END IF;

  -- Create the profile record
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_assigned_role
  );
  
  -- Create the secure role record
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    v_assigned_role
  );
  
  RETURN NEW;
END;
$$;
