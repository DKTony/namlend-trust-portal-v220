-- ============================================================================
-- E2E UI Test Data Seeding Script
-- ============================================================================
-- This script creates test data specifically for Backoffice UI tests
-- Run this before executing UI tests to ensure proper test data exists
-- ============================================================================

-- Clean up any existing UI test data first
DELETE FROM disbursements WHERE reference LIKE 'UI-TEST-%';
DELETE FROM loans WHERE purpose LIKE 'UI Test%';

-- ============================================================================
-- Create Approved Loans for Disbursement Testing
-- ============================================================================

-- Approved Loan 1 (Ready for disbursement)
INSERT INTO loans (
  id,
  user_id,
  amount,
  term_months,
  interest_rate,
  monthly_payment,
  total_repayment,
  purpose,
  status,
  approved_at,
  approved_by,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-ui01-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001', -- client1
  50000,
  12,
  32,
  5500,
  66000,
  'UI Test - Approved Loan 1',
  'approved',
  NOW() - INTERVAL '1 day',
  '33333333-0000-0000-0000-000000000003', -- admin
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at,
  updated_at = NOW();

-- Approved Loan 2 (Ready for disbursement)
INSERT INTO loans (
  id,
  user_id,
  amount,
  term_months,
  interest_rate,
  monthly_payment,
  total_repayment,
  purpose,
  status,
  approved_at,
  approved_by,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-ui02-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000002', -- client2
  75000,
  18,
  32,
  6000,
  108000,
  'UI Test - Approved Loan 2',
  'approved',
  NOW() - INTERVAL '2 hours',
  '44444444-0000-0000-0000-000000000004', -- loan_officer
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at,
  updated_at = NOW();

-- Approved Loan 3 (Ready for disbursement)
INSERT INTO loans (
  id,
  user_id,
  amount,
  term_months,
  interest_rate,
  monthly_payment,
  total_repayment,
  purpose,
  status,
  approved_at,
  approved_by,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-ui03-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001', -- client1
  100000,
  24,
  32,
  6500,
  156000,
  'UI Test - Approved Loan 3',
  'approved',
  NOW() - INTERVAL '3 hours',
  '33333333-0000-0000-0000-000000000003', -- admin
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  approved_at = EXCLUDED.approved_at,
  updated_at = NOW();

-- ============================================================================
-- Create Disbursements for Testing
-- ============================================================================

-- Disbursement 1 (Pending - ready to be completed)
INSERT INTO disbursements (
  id,
  loan_id,
  amount,
  status,
  method,
  reference,
  scheduled_at,
  created_by,
  created_at,
  updated_at
) VALUES (
  'dddddddd-ui01-0000-0000-000000000001',
  'aaaaaaaa-ui01-0000-0000-000000000001',
  50000,
  'pending',
  NULL,
  'UI-TEST-DISB-001',
  NOW(),
  '33333333-0000-0000-0000-000000000003', -- admin
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Disbursement 2 (Pending - ready to be completed)
INSERT INTO disbursements (
  id,
  loan_id,
  amount,
  status,
  method,
  reference,
  scheduled_at,
  created_by,
  created_at,
  updated_at
) VALUES (
  'dddddddd-ui02-0000-0000-000000000002',
  'aaaaaaaa-ui02-0000-0000-000000000002',
  75000,
  'pending',
  NULL,
  'UI-TEST-DISB-002',
  NOW(),
  '44444444-0000-0000-0000-000000000004', -- loan_officer
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- Disbursement 3 (Pending - ready to be completed)
INSERT INTO disbursements (
  id,
  loan_id,
  amount,
  status,
  method,
  reference,
  scheduled_at,
  created_by,
  created_at,
  updated_at
) VALUES (
  'dddddddd-ui03-0000-0000-000000000003',
  'aaaaaaaa-ui03-0000-0000-000000000003',
  100000,
  'pending',
  NULL,
  'UI-TEST-DISB-003',
  NOW(),
  '33333333-0000-0000-0000-000000000003', -- admin
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- Create a Disbursed Loan for "Cannot Disburse Twice" Test
-- ============================================================================

-- Disbursed Loan (Already completed)
INSERT INTO loans (
  id,
  user_id,
  amount,
  term_months,
  interest_rate,
  monthly_payment,
  total_repayment,
  purpose,
  status,
  approved_at,
  approved_by,
  disbursed_at,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-ui04-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000002', -- client2
  60000,
  15,
  32,
  5800,
  87000,
  'UI Test - Already Disbursed Loan',
  'disbursed',
  NOW() - INTERVAL '2 days',
  '33333333-0000-0000-0000-000000000003', -- admin
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  disbursed_at = EXCLUDED.disbursed_at,
  updated_at = NOW();

-- Completed Disbursement
INSERT INTO disbursements (
  id,
  loan_id,
  amount,
  status,
  method,
  reference,
  payment_reference,
  scheduled_at,
  processed_at,
  created_by,
  created_at,
  updated_at
) VALUES (
  'dddddddd-ui04-0000-0000-000000000004',
  'aaaaaaaa-ui04-0000-0000-000000000004',
  60000,
  'completed',
  'bank_transfer',
  'UI-TEST-DISB-004',
  'BANK-REF-UI-TEST-001',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day',
  '33333333-0000-0000-0000-000000000003', -- admin
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  processed_at = EXCLUDED.processed_at,
  updated_at = NOW();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify approved loans
SELECT 
  id,
  user_id,
  amount,
  status,
  purpose,
  approved_at
FROM loans
WHERE purpose LIKE 'UI Test%'
  AND status = 'approved'
ORDER BY created_at DESC;

-- Verify pending disbursements
SELECT 
  d.id,
  d.loan_id,
  d.amount,
  d.status,
  d.reference,
  l.purpose
FROM disbursements d
JOIN loans l ON l.id = d.loan_id
WHERE d.reference LIKE 'UI-TEST-%'
  AND d.status = 'pending'
ORDER BY d.created_at DESC;

-- Verify disbursed loan
SELECT 
  id,
  user_id,
  amount,
  status,
  purpose,
  disbursed_at
FROM loans
WHERE purpose LIKE 'UI Test%'
  AND status = 'disbursed'
ORDER BY created_at DESC;

-- Summary
SELECT 
  'Approved Loans' as category,
  COUNT(*) as count
FROM loans
WHERE purpose LIKE 'UI Test%' AND status = 'approved'
UNION ALL
SELECT 
  'Pending Disbursements' as category,
  COUNT(*) as count
FROM disbursements
WHERE reference LIKE 'UI-TEST-%' AND status = 'pending'
UNION ALL
SELECT 
  'Completed Disbursements' as category,
  COUNT(*) as count
FROM disbursements
WHERE reference LIKE 'UI-TEST-%' AND status = 'completed';
