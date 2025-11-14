-- ============================================================================
-- E2E UI Test Data Cleanup Script
-- ============================================================================
-- This script removes all UI test data created by seed-ui-test-data.sql
-- Run this after UI tests complete to clean up the database
-- ============================================================================

-- Delete disbursements first (foreign key constraint)
DELETE FROM disbursements 
WHERE reference LIKE 'UI-TEST-%';

-- Delete loans
DELETE FROM loans 
WHERE purpose LIKE 'UI Test%';

-- Verify cleanup
SELECT 
  'Remaining UI Test Loans' as category,
  COUNT(*) as count
FROM loans
WHERE purpose LIKE 'UI Test%'
UNION ALL
SELECT 
  'Remaining UI Test Disbursements' as category,
  COUNT(*) as count
FROM disbursements
WHERE reference LIKE 'UI-TEST-%';

-- Should return 0 for both categories
