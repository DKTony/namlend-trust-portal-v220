-- Fix user_roles RLS policies to avoid circular dependency
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Create new policies that avoid circular dependency
-- Allow users to read their own roles (this is the base permission)
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to read all roles (for admin checks)
-- This is necessary to break the circular dependency
CREATE POLICY "Authenticated users can view all roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only allow inserts/updates through functions or by service role
CREATE POLICY "Service role can insert roles" ON public.user_roles
  FOR INSERT USING (auth.role() = 'service_role');

CREATE POLICY "Service role can update roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create a function to safely assign roles (called by triggers)
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, target_role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, target_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
