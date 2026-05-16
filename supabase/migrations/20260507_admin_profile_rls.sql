-- ============================================================
-- Admin RLS policies for profiles table
-- Allows admins to update/delete any user profile
-- ============================================================

-- Allow admins to UPDATE any profile (fixes role assignment to 'admin' etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Allow admins to DELETE any profile (Remove User feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Admins can delete any profile'
  ) THEN
    CREATE POLICY "Admins can delete any profile"
    ON public.profiles FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Allow admins to upsert/update user_roles for any user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_roles'
      AND policyname = 'Admins can manage all user_roles'
  ) THEN
    CREATE POLICY "Admins can manage all user_roles"
    ON public.user_roles FOR ALL
    USING  (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
