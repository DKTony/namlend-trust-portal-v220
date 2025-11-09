-- ============================================================================
-- E2E Test Users Creation Script
-- ============================================================================
-- Run this in Supabase SQL Editor to create test users for E2E testing
-- 
-- Users created:
-- 1. client1@test.namlend.com (client role)
-- 2. client2@test.namlend.com (client role)  
-- 3. admin@test.namlend.com (admin role)
-- 4. loan_officer@test.namlend.com (loan_officer role)
--
-- All passwords: test123
-- ============================================================================

-- Note: You must run this as a Supabase admin/service role
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this script → Run

-- Create test users one by one
DO $$
DECLARE
  v_client1_id UUID := 'c1000000-0000-0000-0000-000000000001'::uuid;
  v_client2_id UUID := 'c2000000-0000-0000-0000-000000000002'::uuid;
  v_admin_id UUID := 'ad000000-0000-0000-0000-000000000003'::uuid;
  v_loan_officer_id UUID := 'lo000000-0000-0000-0000-000000000004'::uuid;
BEGIN
  -- Client 1
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_client1_id,
      'authenticated',
      'authenticated',
      'client1@test.namlend.com',
      crypt('test123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '', '', '', ''
    );
    
    INSERT INTO user_roles (user_id, role) VALUES (v_client1_id, 'client');
    
    INSERT INTO profiles (user_id, first_name, last_name, phone_number)
    VALUES (v_client1_id, 'Test', 'Client1', '+264811234567')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✓ Created client1@test.namlend.com';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ client1@test.namlend.com: %', SQLERRM;
  END;

  -- Client 2
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_client2_id,
      'authenticated',
      'authenticated',
      'client2@test.namlend.com',
      crypt('test123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '', '', '', ''
    );
    
    INSERT INTO user_roles (user_id, role) VALUES (v_client2_id, 'client');
    
    INSERT INTO profiles (user_id, first_name, last_name, phone_number)
    VALUES (v_client2_id, 'Test', 'Client2', '+264811234568')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✓ Created client2@test.namlend.com';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ client2@test.namlend.com: %', SQLERRM;
  END;

  -- Admin
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@test.namlend.com',
      crypt('test123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '', '', '', ''
    );
    
    INSERT INTO user_roles (user_id, role) VALUES (v_admin_id, 'admin');
    
    INSERT INTO profiles (user_id, first_name, last_name, phone_number)
    VALUES (v_admin_id, 'Test', 'Admin', '+264811234569')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✓ Created admin@test.namlend.com';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ admin@test.namlend.com: %', SQLERRM;
  END;

  -- Loan Officer
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_loan_officer_id,
      'authenticated',
      'authenticated',
      'loan_officer@test.namlend.com',
      crypt('test123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      NOW(),
      NOW(),
      '', '', '', ''
    );
    
    INSERT INTO user_roles (user_id, role) VALUES (v_loan_officer_id, 'loan_officer');
    
    INSERT INTO profiles (user_id, first_name, last_name, phone_number)
    VALUES (v_loan_officer_id, 'Test', 'Officer', '+264811234570')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✓ Created loan_officer@test.namlend.com';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ loan_officer@test.namlend.com: %', SQLERRM;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test users creation complete!';
  RAISE NOTICE '========================================';
END $$;

-- Verify users were created
SELECT 
  u.email,
  ur.role,
  CASE WHEN p.user_id IS NOT NULL THEN '✓' ELSE '✗' END as has_profile
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email IN (
  'client1@test.namlend.com',
  'client2@test.namlend.com',
  'admin@test.namlend.com',
  'loan_officer@test.namlend.com'
)
ORDER BY u.email;
