-- Seed Settlement Demo Data
-- Migration: 20251214061000_seed_settlement_demo_data.sql
-- Creates test data for demonstrating IPS disbursements through settlement

-- ============================================================================
-- SEED SETTLEMENT PARTICIPANTS (Namibian Banks)
-- ============================================================================

INSERT INTO settlement_participants (routing_code, swift_bic, name, participant_type, niss_account_ref, is_operator) VALUES
  ('FNB', 'FIABORNANX', 'First National Bank Namibia', 'direct', 'NISS-FNB-001', FALSE),
  ('STAN', 'SBICNANX', 'Standard Bank Namibia', 'direct', 'NISS-STAN-001', FALSE),
  ('NEDBANK', 'NEDSNANX', 'Nedbank Namibia', 'direct', 'NISS-NED-001', FALSE),
  ('BANKWIN', 'BWNANAMX', 'Bank Windhoek', 'direct', 'NISS-BWH-001', FALSE),
  ('NAMLEND', 'NAMLNANX', 'NamLend Trust', 'direct', 'NISS-NAMLEND-001', FALSE)
ON CONFLICT (routing_code) DO UPDATE SET
  swift_bic = EXCLUDED.swift_bic,
  name = EXCLUDED.name;

-- ============================================================================
-- CREATE TEST LOANS AND IPS DISBURSEMENTS
-- ============================================================================

DO $$
DECLARE
  v_admin_id UUID;
  v_client1_id UUID;
  v_client2_id UUID;
  v_loan1_id UUID;
  v_loan2_id UUID;
  v_loan3_id UUID;
  v_disb1_id UUID;
  v_disb2_id UUID;
  v_disb3_id UUID;
  v_ips_txn1_id UUID;
  v_ips_txn2_id UUID;
  v_ips_txn3_id UUID;
  v_fnb_id UUID;
  v_stan_id UUID;
  v_nedbank_id UUID;
  v_namlend_id UUID;
BEGIN
  -- Get admin user
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@test.namlend.com' LIMIT 1;
  
  -- Get or create test clients
  SELECT id INTO v_client1_id FROM auth.users WHERE email = 'client1@test.namlend.com' LIMIT 1;
  SELECT id INTO v_client2_id FROM auth.users WHERE email = 'client2@test.namlend.com' LIMIT 1;
  
  -- If no test users exist, skip data creation
  IF v_client1_id IS NULL THEN
    RAISE NOTICE 'No test clients found, skipping loan creation';
    RETURN;
  END IF;
  
  -- Get participant IDs
  SELECT id INTO v_fnb_id FROM settlement_participants WHERE routing_code = 'FNB';
  SELECT id INTO v_stan_id FROM settlement_participants WHERE routing_code = 'STAN';
  SELECT id INTO v_nedbank_id FROM settlement_participants WHERE routing_code = 'NEDBANK';
  SELECT id INTO v_namlend_id FROM settlement_participants WHERE routing_code = 'NAMLEND';
  
  -- Create test loans (if not exists)
  INSERT INTO loans (id, user_id, amount, term_months, interest_rate, status, purpose, monthly_payment, created_at)
  VALUES 
    (gen_random_uuid(), v_client1_id, 15000.00, 12, 0.32, 'disbursed', 'Business expansion', 1425.00, NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_client1_id, 8500.00, 6, 0.32, 'disbursed', 'Equipment purchase', 1520.00, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_client2_id, 25000.00, 24, 0.32, 'disbursed', 'Working capital', 1310.00, NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_loan1_id;
  
  -- Get loan IDs
  SELECT id INTO v_loan1_id FROM loans WHERE user_id = v_client1_id AND amount = 15000.00 LIMIT 1;
  SELECT id INTO v_loan2_id FROM loans WHERE user_id = v_client1_id AND amount = 8500.00 LIMIT 1;
  SELECT id INTO v_loan3_id FROM loans WHERE user_id = v_client2_id AND amount = 25000.00 LIMIT 1;
  
  IF v_loan1_id IS NULL THEN
    RAISE NOTICE 'Could not create test loans';
    RETURN;
  END IF;
  
  -- Create disbursements for loans
  INSERT INTO disbursements (id, loan_id, amount, status, payment_method, payment_reference, processed_at, created_at)
  VALUES 
    (gen_random_uuid(), v_loan1_id, 15000.00, 'completed', 'ips_transfer', 'IPS-DISB-001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), v_loan2_id, 8500.00, 'completed', 'ips_transfer', 'IPS-DISB-002', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), v_loan3_id, 25000.00, 'completed', 'ips_transfer', 'IPS-DISB-003', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;
  
  -- Get disbursement IDs
  SELECT id INTO v_disb1_id FROM disbursements WHERE loan_id = v_loan1_id LIMIT 1;
  SELECT id INTO v_disb2_id FROM disbursements WHERE loan_id = v_loan2_id LIMIT 1;
  SELECT id INTO v_disb3_id FROM disbursements WHERE loan_id = v_loan3_id LIMIT 1;
  
  -- Check if ips_transactions table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ips_transactions') THEN
    RAISE NOTICE 'ips_transactions table does not exist, skipping IPS data';
    RETURN;
  END IF;
  
  -- Create IPS transactions for disbursements
  INSERT INTO ips_transactions (
    id, loan_id, disbursement_id, msg_id, txn_id, ips_txn_id, ips_rrn,
    transaction_type, ips_txn_type, amount, currency,
    payer_vpa, payer_name, payee_vpa, payee_name, payee_ifsc,
    status, ips_result, purpose_code, initiation_mode, channel,
    note, initiated_at, sent_at, response_received_at, completed_at, created_by
  )
  VALUES 
    (
      gen_random_uuid(), v_loan1_id, v_disb1_id,
      'MSG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
      'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
      'IPS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
      '123456789012',
      'DISBURSEMENT', 'PAY', 15000.00, 'NAD',
      'namlend@ips', 'NamLend Trust',
      'john.doe@fnb', 'John Doe', 'FNB',
      'success', 'SUCCESS', 'BUSN', 'BACKOFFICE', 'WEB',
      'Loan disbursement - Business expansion',
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days' + INTERVAL '5 seconds',
      NOW() - INTERVAL '2 days' + INTERVAL '30 seconds',
      NOW() - INTERVAL '2 days' + INTERVAL '30 seconds',
      v_admin_id
    ),
    (
      gen_random_uuid(), v_loan2_id, v_disb2_id,
      'MSG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
      'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
      'IPS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-002',
      '123456789013',
      'DISBURSEMENT', 'PAY', 8500.00, 'NAD',
      'namlend@ips', 'NamLend Trust',
      'jane.smith@stan', 'Jane Smith', 'STAN',
      'success', 'SUCCESS', 'BUSN', 'BACKOFFICE', 'WEB',
      'Loan disbursement - Equipment purchase',
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day' + INTERVAL '5 seconds',
      NOW() - INTERVAL '1 day' + INTERVAL '25 seconds',
      NOW() - INTERVAL '1 day' + INTERVAL '25 seconds',
      v_admin_id
    ),
    (
      gen_random_uuid(), v_loan3_id, v_disb3_id,
      'MSG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
      'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
      'IPS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-003',
      '123456789014',
      'DISBURSEMENT', 'PAY', 25000.00, 'NAD',
      'namlend@ips', 'NamLend Trust',
      'bob.wilson@nedbank', 'Bob Wilson', 'NEDBANK',
      'success', 'SUCCESS', 'BUSN', 'BACKOFFICE', 'WEB',
      'Loan disbursement - Working capital',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days' + INTERVAL '5 seconds',
      NOW() - INTERVAL '3 days' + INTERVAL '45 seconds',
      NOW() - INTERVAL '3 days' + INTERVAL '45 seconds',
      v_admin_id
    )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Successfully created test IPS disbursements';
  
END $$;

-- ============================================================================
-- CREATE AND PROCESS A COMPLETE SETTLEMENT RUN
-- ============================================================================

DO $$
DECLARE
  v_run_result JSON;
  v_run_id UUID;
  v_process_result JSON;
  v_settle_result JSON;
BEGIN
  -- Check if we have IPS transactions to settle
  IF NOT EXISTS (
    SELECT 1 FROM ips_transactions 
    WHERE status IN ('success', 'deemed') 
      AND transaction_type = 'DISBURSEMENT'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'No IPS transactions found to settle';
    RETURN;
  END IF;
  
  -- Create a settlement run
  v_run_result := create_settlement_run(CURRENT_DATE, 'SW1');
  
  IF NOT (v_run_result->>'success')::BOOLEAN THEN
    RAISE NOTICE 'Failed to create settlement run: %', v_run_result->>'error';
    RETURN;
  END IF;
  
  v_run_id := (v_run_result->>'run_id')::UUID;
  RAISE NOTICE 'Created settlement run: %', v_run_id;
  
  -- Process the settlement run (ingest, netting, generate batches & reports)
  v_process_result := process_settlement_run(v_run_id, NOW() - INTERVAL '7 days', NOW());
  
  IF NOT (v_process_result->>'success')::BOOLEAN THEN
    RAISE NOTICE 'Failed to process settlement run: %', v_process_result;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Processed settlement run: %', v_process_result;
  
  -- Mark as settled (simulate NISS acceptance)
  v_settle_result := mark_settlement_settled(v_run_id);
  
  IF NOT (v_settle_result->>'success')::BOOLEAN THEN
    RAISE NOTICE 'Failed to mark settlement as settled: %', v_settle_result->>'error';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Settlement run completed and settled: %', v_run_id;
  
END $$;

-- ============================================================================
-- SUMMARY OUTPUT
-- ============================================================================

DO $$
DECLARE
  v_participant_count INTEGER;
  v_run_count INTEGER;
  v_obligation_count INTEGER;
  v_instruction_count INTEGER;
  v_batch_count INTEGER;
  v_report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_participant_count FROM settlement_participants;
  SELECT COUNT(*) INTO v_run_count FROM settlement_runs;
  SELECT COUNT(*) INTO v_obligation_count FROM settlement_obligations;
  SELECT COUNT(*) INTO v_instruction_count FROM settlement_net_instructions;
  SELECT COUNT(*) INTO v_batch_count FROM settlement_pacs009_batches;
  SELECT COUNT(*) INTO v_report_count FROM settlement_reports;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Settlement Demo Data Summary:';
  RAISE NOTICE '  Participants: %', v_participant_count;
  RAISE NOTICE '  Settlement Runs: %', v_run_count;
  RAISE NOTICE '  Obligations: %', v_obligation_count;
  RAISE NOTICE '  Net Instructions: %', v_instruction_count;
  RAISE NOTICE '  pacs.009 Batches: %', v_batch_count;
  RAISE NOTICE '  Reports: %', v_report_count;
  RAISE NOTICE '========================================';
END $$;
