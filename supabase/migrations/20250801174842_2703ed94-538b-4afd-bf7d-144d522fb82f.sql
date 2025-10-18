-- Assign admin role to all existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Create a function to automatically assign admin role to new users
CREATE OR REPLACE FUNCTION public.assign_admin_role_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::app_role);
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign admin role to new users
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role_to_new_user();