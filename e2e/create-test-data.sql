-- ============================================================================
-- E2E Test Data Creation Script
-- ============================================================================
-- Run this AFTER creating test users (create-test-users.sql)
-- This creates loans and applications for E2E testing
-- 
-- Test data created:
-- 1. Loan applications for client1 and client2
-- 2. Approved loans ready for disbursement
-- 3. Some disbursed loans for testing
-- 4. Repayment schedules
-- ============================================================================

-- Note: Run this in Supabase SQL Editor after test users exist
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste this script → Run

DO $$
DECLARE
  v_client1_id UUID := '11111111-0000-0000-0000-000000000001'::uuid;
  v_client2_id UUID := '22222222-0000-0000-0000-000000000002'::uuid;
  v_admin_id UUID;
  v_loan_officer_id UUID := '44444444-0000-0000-0000-000000000004'::uuid;
  
  -- Loan IDs
  v_loan1_id UUID := 'e2e10001-0000-0000-0000-000000000001'::uuid;
  v_loan2_id UUID := 'e2e10002-0000-0000-0000-000000000002'::uuid;
  v_loan3_id UUID := 'e2e10003-0000-0000-0000-000000000003'::uuid;
  v_loan4_id UUID := 'e2e10004-0000-0000-0000-000000000004'::uuid;
  v_loan5_id UUID := 'e2e10005-0000-0000-0000-000000000005'::uuid;
  
  -- Application IDs
  v_app1_id UUID := 'e2eapp01-0000-0000-0000-000000000001'::uuid;
  v_app2_id UUID := 'e2eapp02-0000-0000-0000-000000000002'::uuid;
  v_app3_id UUID := 'e2eapp03-0000-0000-0000-000000000003'::uuid;
  
BEGIN
  -- Get admin user ID (it was created with random UUID)
  SELECT id INTO v_admin_id 
  FROM auth.users 
  WHERE email = 'admin@test.namlend.com';
  
  RAISE NOTICE 'Creating test data for E2E tests...';
  
  -- ============================================================================
  -- 1. CREATE LOAN APPLICATIONS
  -- ============================================================================
  
  -- Application 1: Client1 - Pending
  INSERT INTO loan_applications (
    id, client_id, amount_requested, purpose, employment_status,
    monthly_income, status, created_at, updated_at
  ) VALUES (
    v_app1_id,
    v_client1_id,
    50000.00,
    'Business expansion',
    'employed',
    15000.00,
    'pending',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  );
  
  -- Application 2: Client1 - Approved (will become loan)
  INSERT INTO loan_applications (
    id, client_id, amount_requested, purpose, employment_status,
    monthly_income, status, created_at, updated_at
  ) VALUES (
    v_app2_id,
    v_client1_id,
    75000.00,
    'Home improvement',
    'employed',
    15000.00,
    'approved',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '3 days'
  );
  
  -- Application 3: Client2 - Under review
  INSERT INTO loan_applications (
    id, client_id, amount_requested, purpose, employment_status,
    monthly_income, status, created_at, updated_at
  ) VALUES (
    v_app3_id,
    v_client2_id,
    30000.00,
    'Education',
    'self_employed',
    12000.00,
    'under_review',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  );
  
  RAISE NOTICE '✓ Created 3 loan applications';
  
  -- ============================================================================
  -- 2. CREATE LOANS
  -- ============================================================================
  
  -- Loan 1: Client1 - APPROVED (ready for disbursement)
  INSERT INTO loans (
    id, client_id, amount, interest_rate, term_months, status,
    approved_by, approved_at, created_at, updated_at
  ) VALUES (
    v_loan1_id,
    v_client1_id,
    100000.00,  -- NAD 100,000
    0.32,       -- 32% APR (Namibian limit)
    12,         -- 12 months
    'approved',
    v_admin_id,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '2 days'
  );
  
  -- Loan 2: Client1 - APPROVED (another one for testing)
  INSERT INTO loans (
    id, client_id, amount, interest_rate, term_months, status,
    approved_by, approved_at, created_at, updated_at
  ) VALUES (
    v_loan2_id,
    v_client1_id,
    50000.00,   -- NAD 50,000
    0.28,       -- 28% APR
    6,          -- 6 months
    'approved',
    v_loan_officer_id,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '1 day'
  );
  
  -- Loan 3: Client2 - APPROVED (ready for disbursement)
  INSERT INTO loans (
    id, client_id, amount, interest_rate, term_months, status,
    approved_by, approved_at, created_at, updated_at
  ) VALUES (
    v_loan3_id,
    v_client2_id,
    75000.00,   -- NAD 75,000
    0.30,       -- 30% APR
    12,         -- 12 months
    'approved',
    v_admin_id,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '3 days'
  );
  
  -- Loan 4: Client1 - DISBURSED (for testing already disbursed loans)
  INSERT INTO loans (
    id, client_id, amount, interest_rate, term_months, status,
    approved_by, approved_at, disbursed_at, created_at, updated_at
  ) VALUES (
    v_loan4_id,
    v_client1_id,
    25000.00,   -- NAD 25,000
    0.25,       -- 25% APR
    6,          -- 6 months
    'disbursed',
    v_admin_id,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '10 days'
  );
  
  -- Loan 5: Client2 - PENDING (not yet approved)
  INSERT INTO loans (
    id, client_id, amount, interest_rate, term_months, status,
    created_at, updated_at
  ) VALUES (
    v_loan5_id,
    v_client2_id,
    40000.00,   -- NAD 40,000
    0.30,       -- 30% APR
    12,         -- 12 months
    'pending',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  );
  
  RAISE NOTICE '✓ Created 5 loans (3 approved, 1 disbursed, 1 pending)';
  
  -- ============================================================================
  -- 3. CREATE DISBURSEMENT FOR LOAN 4 (already disbursed)
  -- ============================================================================
  
  INSERT INTO disbursements (
    id, loan_id, amount, payment_method, payment_reference,
    disbursed_by, disbursed_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_loan4_id,
    25000.00,
    'bank_transfer',
    'E2E-TEST-REF-001',
    v_admin_id,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  );
  
  RAISE NOTICE '✓ Created 1 disbursement record';
  
  -- ============================================================================
  -- 4. CREATE REPAYMENT SCHEDULES
  -- ============================================================================
  
  -- Repayment schedule for Loan 1 (12 months)
  INSERT INTO repayments (loan_id, amount, due_date, status, created_at, updated_at)
  SELECT 
    v_loan1_id,
    9166.67,  -- Monthly payment (principal + interest)
    NOW() + (n || ' months')::interval,
    'pending',
    NOW(),
    NOW()
  FROM generate_series(1, 12) AS n;
  
  -- Repayment schedule for Loan 2 (6 months)
  INSERT INTO repayments (loan_id, amount, due_date, status, created_at, updated_at)
  SELECT 
    v_loan2_id,
    9000.00,  -- Monthly payment
    NOW() + (n || ' months')::interval,
    'pending',
    NOW(),
    NOW()
  FROM generate_series(1, 6) AS n;
  
  -- Repayment schedule for Loan 3 (12 months)
  INSERT INTO repayments (loan_id, amount, due_date, status, created_at, updated_at)
  SELECT 
    v_loan3_id,
    6875.00,  -- Monthly payment
    NOW() + (n || ' months')::interval,
    'pending',
    NOW(),
    NOW()
  FROM generate_series(1, 12) AS n;
  
  -- Repayment schedule for Loan 4 (6 months, already disbursed)
  -- First payment is overdue, second is due soon
  INSERT INTO repayments (loan_id, amount, due_date, status, created_at, updated_at)
  VALUES
    (v_loan4_id, 4500.00, NOW() - INTERVAL '5 days', 'overdue', NOW() - INTERVAL '10 days', NOW()),
    (v_loan4_id, 4500.00, NOW() + INTERVAL '25 days', 'pending', NOW() - INTERVAL '10 days', NOW()),
    (v_loan4_id, 4500.00, NOW() + INTERVAL '55 days', 'pending', NOW() - INTERVAL '10 days', NOW()),
    (v_loan4_id, 4500.00, NOW() + INTERVAL '85 days', 'pending', NOW() - INTERVAL '10 days', NOW()),
    (v_loan4_id, 4500.00, NOW() + INTERVAL '115 days', 'pending', NOW() - INTERVAL '10 days', NOW()),
    (v_loan4_id, 4500.00, NOW() + INTERVAL '145 days', 'pending', NOW() - INTERVAL '10 days', NOW());
  
  RAISE NOTICE '✓ Created repayment schedules (36 total repayments)';
  
  -- ============================================================================
  -- 5. CREATE AUDIT TRAIL ENTRIES
  -- ============================================================================
  
  -- Audit for loan approvals
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
  VALUES
    (v_admin_id, 'loan_approved', 'loan', v_loan1_id, '{"amount": 100000, "term": 12}', NOW() - INTERVAL '2 days'),
    (v_loan_officer_id, 'loan_approved', 'loan', v_loan2_id, '{"amount": 50000, "term": 6}', NOW() - INTERVAL '1 day'),
    (v_admin_id, 'loan_approved', 'loan', v_loan3_id, '{"amount": 75000, "term": 12}', NOW() - INTERVAL '3 days'),
    (v_admin_id, 'loan_approved', 'loan', v_loan4_id, '{"amount": 25000, "term": 6}', NOW() - INTERVAL '15 days');
  
  -- Audit for disbursement
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
  VALUES
    (v_admin_id, 'loan_disbursed', 'loan', v_loan4_id, '{"amount": 25000, "method": "bank_transfer", "reference": "E2E-TEST-REF-001"}', NOW() - INTERVAL '10 days');
  
  RAISE NOTICE '✓ Created 5 audit log entries';
  
  -- ============================================================================
  -- SUMMARY
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'E2E Test Data Created Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loan Applications: 3';
  RAISE NOTICE '  - Pending: 1 (client1)';
  RAISE NOTICE '  - Approved: 1 (client1)';
  RAISE NOTICE '  - Under Review: 1 (client2)';
  RAISE NOTICE '';
  RAISE NOTICE 'Loans: 5';
  RAISE NOTICE '  - Approved (ready to disburse): 3';
  RAISE NOTICE '    * Loan 1: NAD 100,000 (client1)';
  RAISE NOTICE '    * Loan 2: NAD 50,000 (client1)';
  RAISE NOTICE '    * Loan 3: NAD 75,000 (client2)';
  RAISE NOTICE '  - Disbursed: 1 (client1)';
  RAISE NOTICE '  - Pending: 1 (client2)';
  RAISE NOTICE '';
  RAISE NOTICE 'Disbursements: 1';
  RAISE NOTICE 'Repayments: 36 scheduled payments';
  RAISE NOTICE 'Audit Logs: 5 entries';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify loans
SELECT 
  l.id,
  u.email as client_email,
  l.amount,
  l.status,
  l.term_months,
  CASE WHEN d.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_disbursement
FROM loans l
JOIN auth.users u ON l.client_id = u.id
LEFT JOIN disbursements d ON l.id = d.loan_id
WHERE u.email LIKE '%test.namlend.com'
ORDER BY l.created_at DESC;

-- Verify applications
SELECT 
  la.id,
  u.email as client_email,
  la.amount_requested,
  la.status,
  la.purpose
FROM loan_applications la
JOIN auth.users u ON la.client_id = u.id
WHERE u.email LIKE '%test.namlend.com'
ORDER BY la.created_at DESC;

-- Verify repayments
SELECT 
  l.id as loan_id,
  u.email as client_email,
  COUNT(r.id) as repayment_count,
  SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN r.status = 'overdue' THEN 1 ELSE 0 END) as overdue
FROM loans l
JOIN auth.users u ON l.client_id = u.id
LEFT JOIN repayments r ON l.id = r.loan_id
WHERE u.email LIKE '%test.namlend.com'
GROUP BY l.id, u.email
ORDER BY l.created_at DESC;
