-- Assign admin role to the existing user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('98812e7a-784d-4379-b3aa-e8327d214095', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;