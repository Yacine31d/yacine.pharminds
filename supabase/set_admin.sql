-- Script to promote an email to admin role
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the UUID associated with the user's email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'abdorenouni@gmail.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Update the profiles table
    UPDATE public.profiles SET role = 'admin' WHERE user_id = v_user_id;
    
    -- Ensure the user_roles table is also updated/inserted correctly
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- If they had a previous different role, we should probably clean it up (or just use the newest)
    -- But since user_roles has a unique constraint on (user_id, role), we'll just add the admin one.
    
    RAISE NOTICE 'Success: Updated user % to admin.', 'abdorenouni@gmail.com';
  ELSE
    RAISE NOTICE 'Error: User with email % not found. They must sign up first.', 'abdorenouni@gmail.com';
  END IF;
END $$;
