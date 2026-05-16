-- ─────────────────────────────────────────────────────────────────────────────
-- Security: prevent self-registration as admin
--
-- The client-side Zod schema already removes 'admin' from the sign-up form,
-- but this trigger is the server-side enforcement that can never be bypassed
-- (e.g. by a crafted API call).
--
-- Admin role can ONLY be granted via: supabase/set_admin.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_safe_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only 'patient' and 'pharmacist' are self-registrable.
  -- Anything else (including 'admin') is silently demoted to 'patient'.
  IF NEW.role NOT IN ('patient', 'pharmacist') THEN
    NEW.role := 'patient';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists so the migration is re-runnable
DROP TRIGGER IF EXISTS trg_enforce_safe_role ON public.profiles;

CREATE TRIGGER trg_enforce_safe_role
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_safe_role_on_insert();
