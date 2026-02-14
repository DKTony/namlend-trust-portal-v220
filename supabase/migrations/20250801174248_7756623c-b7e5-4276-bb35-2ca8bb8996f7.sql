-- Assign admin role to the existing user (conditional - only if user exists)
INSERT INTO public.user_roles (user_id, role) 
SELECT '98812e7a-784d-4379-b3aa-e8327d214095'::uuid, 'admin'::public.app_role
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '98812e7a-784d-4379-b3aa-e8327d214095')
ON CONFLICT (user_id, role) DO NOTHING;