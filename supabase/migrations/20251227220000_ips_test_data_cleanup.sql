-- ============================================================================
-- IPS Test Data Cleanup Migration
-- Version: 1.0.0
-- Created: December 27, 2025
-- Description: Archives and removes IPS adapter test transactions
-- Run during: Maintenance window (low traffic period)
-- ============================================================================

-- Step 1: Create archive table for test data (if not exists)
CREATE TABLE IF NOT EXISTS ips_transactions_archive (
  LIKE ips_transactions INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT
);

COMMENT ON TABLE ips_transactions_archive IS 'Archive of deleted IPS test transactions for audit purposes';

-- Step 2: Archive test transactions before deletion
INSERT INTO ips_transactions_archive (
  id, loan_id, disbursement_id, payment_id,
  msg_id, txn_id, ips_txn_id, ips_rrn, org_txn_id, org_msg_id,
  transaction_type, ips_txn_type, ips_txn_subtype,
  amount, currency,
  payer_vpa, payer_name, payer_account_masked, payer_ifsc,
  payee_vpa, payee_name, payee_account_masked, payee_ifsc,
  status, ips_result, ips_error_code, ips_error_message, internal_error_code,
  purpose_code, initiation_mode, channel, note, customer_ref,
  device_fingerprint, ip_address,
  initiated_at, sent_at, response_received_at, completed_at, expires_at,
  retry_count, last_status_check_at,
  created_by, created_at, updated_at,
  archived_at, archive_reason
)
SELECT 
  id, loan_id, disbursement_id, payment_id,
  msg_id, txn_id, ips_txn_id, ips_rrn, org_txn_id, org_msg_id,
  transaction_type, ips_txn_type, ips_txn_subtype,
  amount, currency,
  payer_vpa, payer_name, payer_account_masked, payer_ifsc,
  payee_vpa, payee_name, payee_account_masked, payee_ifsc,
  status, ips_result, ips_error_code, ips_error_message, internal_error_code,
  purpose_code, initiation_mode, channel, note, customer_ref,
  device_fingerprint, ip_address,
  initiated_at, sent_at, response_received_at, completed_at, expires_at,
  retry_count, last_status_check_at,
  created_by, created_at, updated_at,
  NOW(), 'IPS Adapter Test Data - Settlement Audit Cleanup 2025-12-27'
FROM ips_transactions
WHERE msg_id LIKE 'IPS-ADAPTER-TEST-%';

-- Step 3: Delete archived test transactions from main table
DELETE FROM ips_transactions
WHERE msg_id LIKE 'IPS-ADAPTER-TEST-%';

-- Step 4: Log the cleanup in audit_logs
INSERT INTO audit_logs (
  user_id,
  action,
  table_name,
  record_id,
  new_values
) VALUES (
  NULL,
  'IPS_TEST_DATA_CLEANUP',
  'ips_transactions',
  NULL,
  jsonb_build_object(
    'cleanup_date', NOW(),
    'pattern', 'IPS-ADAPTER-TEST-%',
    'reason', 'Settlement Audit - Test data cleanup per SETTLEMENT_INTEGRITY_REPORT.md',
    'archived_to', 'ips_transactions_archive'
  )
);

-- Step 5: Verify cleanup
DO $$
DECLARE
  remaining_count INTEGER;
  archived_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count 
  FROM ips_transactions 
  WHERE msg_id LIKE 'IPS-ADAPTER-TEST-%';
  
  SELECT COUNT(*) INTO archived_count 
  FROM ips_transactions_archive 
  WHERE archive_reason LIKE '%Settlement Audit%';
  
  RAISE NOTICE 'IPS Test Data Cleanup Complete:';
  RAISE NOTICE '  - Archived transactions: %', archived_count;
  RAISE NOTICE '  - Remaining test transactions: %', remaining_count;
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'Some test transactions may not have been cleaned up!';
  END IF;
END $$;
