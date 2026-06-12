-- ============================================================================
-- E2E UI Test Data Cleanup Script  (LEGACY Supabase schema — Convex is the
-- active backend; this script is retained only for disposable test databases)
-- ============================================================================
-- This script removes UI test data created by seed-ui-test-data.sql.
--
-- ⚠️ RETENTION SAFETY: hard-deleting financial records is FORBIDDEN against any
-- shared/staging/production database (7-year retention rule). This script is
-- gated below and refuses to run unless the session is explicitly marked as an
-- ephemeral, isolated test database. To run against a disposable DB:
--     SET app.ephemeral_test = 'true';
-- ============================================================================

-- GUARD: abort unless explicitly opted into an ephemeral test database.
DO $$
BEGIN
  IF current_setting('app.ephemeral_test', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Refusing to hard-delete financial records: this is not an ephemeral test DB. Set "SET app.ephemeral_test = ''true'';" only against a disposable database.';
  END IF;
END $$;

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
