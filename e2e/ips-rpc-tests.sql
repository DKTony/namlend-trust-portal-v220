-- IPS RPC Functions SQL Tests
-- Run these tests directly against the database to verify RPC functionality
-- Usage: psql -f e2e/ips-rpc-tests.sql

-- ============================================================================
-- TEST SETUP
-- ============================================================================

BEGIN;

-- Create test schema for isolation
CREATE SCHEMA IF NOT EXISTS ips_test;

-- Test helper function
CREATE OR REPLACE FUNCTION ips_test.assert_equals(actual TEXT, expected TEXT, test_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'TEST FAILED: % - Expected: %, Got: %', test_name, expected, actual;
  ELSE
    RAISE NOTICE 'TEST PASSED: %', test_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ips_test.assert_true(condition BOOLEAN, test_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION 'TEST FAILED: % - Expected TRUE', test_name;
  ELSE
    RAISE NOTICE 'TEST PASSED: %', test_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ips_test.assert_false(condition BOOLEAN, test_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF condition THEN
    RAISE EXCEPTION 'TEST FAILED: % - Expected FALSE', test_name;
  ELSE
    RAISE NOTICE 'TEST PASSED: %', test_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TEST: generate_ips_msg_id
-- ============================================================================

DO $$
DECLARE
  id1 VARCHAR;
  id2 VARCHAR;
BEGIN
  RAISE NOTICE '--- Testing generate_ips_msg_id ---';
  
  -- Test 1: Should generate non-null ID
  SELECT generate_ips_msg_id() INTO id1;
  PERFORM ips_test.assert_true(id1 IS NOT NULL, 'generate_ips_msg_id returns non-null');
  
  -- Test 2: Should start with NL prefix
  PERFORM ips_test.assert_true(id1 LIKE 'NL%', 'generate_ips_msg_id starts with NL');
  
  -- Test 3: Should generate unique IDs
  SELECT generate_ips_msg_id() INTO id2;
  PERFORM ips_test.assert_true(id1 <> id2, 'generate_ips_msg_id generates unique IDs');
  
  RAISE NOTICE 'Generated IDs: %, %', id1, id2;
END $$;

-- ============================================================================
-- TEST: generate_ips_txn_id
-- ============================================================================

DO $$
DECLARE
  id1 VARCHAR;
  id2 VARCHAR;
BEGIN
  RAISE NOTICE '--- Testing generate_ips_txn_id ---';
  
  -- Test 1: Should generate non-null ID
  SELECT generate_ips_txn_id() INTO id1;
  PERFORM ips_test.assert_true(id1 IS NOT NULL, 'generate_ips_txn_id returns non-null');
  
  -- Test 2: Should start with TXN prefix
  PERFORM ips_test.assert_true(id1 LIKE 'TXN%', 'generate_ips_txn_id starts with TXN');
  
  -- Test 3: Should generate unique IDs
  SELECT generate_ips_txn_id() INTO id2;
  PERFORM ips_test.assert_true(id1 <> id2, 'generate_ips_txn_id generates unique IDs');
  
  RAISE NOTICE 'Generated IDs: %, %', id1, id2;
END $$;

-- ============================================================================
-- TEST: get_ips_error_message
-- ============================================================================

DO $$
DECLARE
  msg TEXT;
BEGIN
  RAISE NOTICE '--- Testing get_ips_error_message ---';
  
  -- Test 1: Known success code
  SELECT get_ips_error_message('00') INTO msg;
  PERFORM ips_test.assert_equals(msg, 'Payment successful', 'get_ips_error_message for 00');
  
  -- Test 2: Known error code (insufficient funds)
  SELECT get_ips_error_message('51') INTO msg;
  PERFORM ips_test.assert_true(msg LIKE '%insufficient%' OR msg LIKE '%Insufficient%', 'get_ips_error_message for 51');
  
  -- Test 3: Unknown code returns default
  SELECT get_ips_error_message('UNKNOWN_CODE') INTO msg;
  PERFORM ips_test.assert_true(msg IS NOT NULL, 'get_ips_error_message returns default for unknown');
  
  RAISE NOTICE 'Error messages retrieved successfully';
END $$;

-- ============================================================================
-- TEST: is_ips_error_retryable
-- ============================================================================

DO $$
DECLARE
  result BOOLEAN;
BEGIN
  RAISE NOTICE '--- Testing is_ips_error_retryable ---';
  
  -- Test 1: Success code is not retryable
  SELECT is_ips_error_retryable('00') INTO result;
  PERFORM ips_test.assert_false(result, 'is_ips_error_retryable for 00 (success)');
  
  -- Test 2: Insufficient funds is not retryable
  SELECT is_ips_error_retryable('51') INTO result;
  PERFORM ips_test.assert_false(result, 'is_ips_error_retryable for 51 (insufficient funds)');
  
  -- Test 3: System error is retryable
  SELECT is_ips_error_retryable('96') INTO result;
  PERFORM ips_test.assert_true(result, 'is_ips_error_retryable for 96 (system error)');
  
  -- Test 4: PSP timeout is retryable
  SELECT is_ips_error_retryable('UP') INTO result;
  PERFORM ips_test.assert_true(result, 'is_ips_error_retryable for UP (PSP timeout)');
  
  RAISE NOTICE 'Retryable checks passed';
END $$;

-- ============================================================================
-- TEST: ips_error_codes table data
-- ============================================================================

DO $$
DECLARE
  code_count INTEGER;
BEGIN
  RAISE NOTICE '--- Testing ips_error_codes table ---';
  
  -- Test 1: Should have error codes seeded
  SELECT COUNT(*) INTO code_count FROM ips_error_codes;
  PERFORM ips_test.assert_true(code_count > 0, 'ips_error_codes has seeded data');
  RAISE NOTICE 'Found % error codes', code_count;
  
  -- Test 2: Should have success code
  SELECT COUNT(*) INTO code_count FROM ips_error_codes WHERE code = '00';
  PERFORM ips_test.assert_true(code_count = 1, 'ips_error_codes has success code 00');
  
  -- Test 3: All codes should have internal_code
  SELECT COUNT(*) INTO code_count FROM ips_error_codes WHERE internal_code IS NULL;
  PERFORM ips_test.assert_true(code_count = 0, 'All error codes have internal_code');
  
  RAISE NOTICE 'Error codes table validated';
END $$;

-- ============================================================================
-- TEST: ips_transactions table structure
-- ============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '--- Testing ips_transactions table structure ---';
  
  -- Test required columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_transactions' AND column_name = 'msg_id'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_transactions has msg_id column');
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_transactions' AND column_name = 'txn_id'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_transactions has txn_id column');
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_transactions' AND column_name = 'status'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_transactions has status column');
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_transactions' AND column_name = 'payer_vpa'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_transactions has payer_vpa column');
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_transactions' AND column_name = 'payee_vpa'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_transactions has payee_vpa column');
  
  RAISE NOTICE 'Table structure validated';
END $$;

-- ============================================================================
-- TEST: ips_vpa_registry table structure
-- ============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '--- Testing ips_vpa_registry table structure ---';
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_vpa_registry' AND column_name = 'vpa_address'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_vpa_registry has vpa_address column');
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_vpa_registry' AND column_name = 'user_id'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_vpa_registry has user_id column');
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ips_vpa_registry' AND column_name = 'is_default'
  ) INTO col_exists;
  PERFORM ips_test.assert_true(col_exists, 'ips_vpa_registry has is_default column');
  
  RAISE NOTICE 'VPA registry structure validated';
END $$;

-- ============================================================================
-- TEST: RLS Policies exist
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '--- Testing RLS Policies ---';
  
  -- Check ips_transactions policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'ips_transactions';
  PERFORM ips_test.assert_true(policy_count > 0, 'ips_transactions has RLS policies');
  RAISE NOTICE 'ips_transactions has % policies', policy_count;
  
  -- Check ips_vpa_registry policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'ips_vpa_registry';
  PERFORM ips_test.assert_true(policy_count > 0, 'ips_vpa_registry has RLS policies');
  RAISE NOTICE 'ips_vpa_registry has % policies', policy_count;
  
  -- Check ips_error_codes policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'ips_error_codes';
  PERFORM ips_test.assert_true(policy_count > 0, 'ips_error_codes has RLS policies');
  RAISE NOTICE 'ips_error_codes has % policies', policy_count;
  
  RAISE NOTICE 'RLS policies validated';
END $$;

-- ============================================================================
-- TEST: Indexes exist
-- ============================================================================

DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  RAISE NOTICE '--- Testing Indexes ---';
  
  -- Check ips_transactions indexes
  SELECT COUNT(*) INTO idx_count 
  FROM pg_indexes 
  WHERE tablename = 'ips_transactions';
  PERFORM ips_test.assert_true(idx_count > 0, 'ips_transactions has indexes');
  RAISE NOTICE 'ips_transactions has % indexes', idx_count;
  
  -- Check ips_vpa_registry indexes
  SELECT COUNT(*) INTO idx_count 
  FROM pg_indexes 
  WHERE tablename = 'ips_vpa_registry';
  PERFORM ips_test.assert_true(idx_count > 0, 'ips_vpa_registry has indexes');
  RAISE NOTICE 'ips_vpa_registry has % indexes', idx_count;
  
  RAISE NOTICE 'Indexes validated';
END $$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

DROP SCHEMA ips_test CASCADE;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'ALL IPS RPC TESTS PASSED!';
RAISE NOTICE '============================================';
