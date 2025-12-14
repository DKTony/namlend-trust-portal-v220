-- Settlement Processing Functions
-- Migration: 20251214060000_settlement_processing.sql
-- Provides RPCs to process IPS transactions into settlement runs

-- ============================================================================
-- HELPER: Generate unique IDs
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_settlement_run_id(
  p_settlement_date DATE,
  p_window_id VARCHAR
)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INTEGER;
  v_run_id VARCHAR;
BEGIN
  -- Get next sequence number for this date/window
  SELECT COALESCE(MAX(amendment_seq), -1) + 1 INTO v_seq
  FROM settlement_runs
  WHERE settlement_date = p_settlement_date AND window_id = p_window_id;
  
  -- Format: YYYYMMDD-SWx-NNN
  v_run_id := TO_CHAR(p_settlement_date, 'YYYYMMDD') || '-' || p_window_id || '-' || LPAD(v_seq::TEXT, 3, '0');
  
  RETURN v_run_id;
END;
$$;

-- ============================================================================
-- CREATE SETTLEMENT RUN
-- ============================================================================

CREATE OR REPLACE FUNCTION create_settlement_run(
  p_settlement_date DATE DEFAULT CURRENT_DATE,
  p_window_id VARCHAR DEFAULT 'SW1'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run_id VARCHAR;
  v_run_uuid UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check admin role
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Admin access required');
  END IF;
  
  -- Generate run ID
  v_run_id := generate_settlement_run_id(p_settlement_date, p_window_id);
  
  -- Create the settlement run
  INSERT INTO settlement_runs (
    run_id,
    window_id,
    settlement_date,
    state,
    created_by
  ) VALUES (
    v_run_id,
    p_window_id,
    p_settlement_date,
    'collecting',
    v_user_id
  )
  RETURNING id INTO v_run_uuid;
  
  RETURN json_build_object(
    'success', true,
    'run_id', v_run_uuid,
    'run_code', v_run_id,
    'settlement_date', p_settlement_date,
    'window_id', p_window_id,
    'state', 'collecting'
  );
END;
$$;

-- ============================================================================
-- INGEST IPS TRANSACTIONS INTO SETTLEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION ingest_ips_transactions_for_settlement(
  p_run_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
  v_txn RECORD;
  v_participant_map JSONB;
  v_source_participant_id UUID;
  v_target_participant_id UUID;
  v_namlend_participant_id UUID;
  v_txn_count INTEGER := 0;
  v_total_principal DECIMAL := 0;
  v_total_interchange DECIMAL := 0;
  v_total_switching_fee DECIMAL := 0;
BEGIN
  -- Get run details
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;
  
  IF v_run IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RUN_NOT_FOUND');
  END IF;
  
  IF v_run.state != 'collecting' THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_STATE', 'message', 'Run must be in collecting state');
  END IF;
  
  -- Get or create NamLend as a participant
  SELECT id INTO v_namlend_participant_id 
  FROM settlement_participants 
  WHERE routing_code = 'NAMLEND';
  
  IF v_namlend_participant_id IS NULL THEN
    INSERT INTO settlement_participants (routing_code, swift_bic, name, participant_type, niss_account_ref)
    VALUES ('NAMLEND', 'NAMLNANX', 'NamLend Trust', 'direct', 'NISS-NAMLEND-001')
    RETURNING id INTO v_namlend_participant_id;
  END IF;
  
  -- Process successful IPS transactions
  FOR v_txn IN 
    SELECT 
      t.*,
      d.id as disbursement_id,
      l.id as loan_id,
      l.user_id as borrower_id
    FROM ips_transactions t
    LEFT JOIN disbursements d ON t.disbursement_id = d.id
    LEFT JOIN loans l ON d.loan_id = l.id
    WHERE t.status IN ('success', 'deemed')
      AND t.transaction_type = 'DISBURSEMENT'
      AND (p_date_from IS NULL OR t.completed_at >= p_date_from)
      AND (p_date_to IS NULL OR t.completed_at <= p_date_to)
      AND NOT EXISTS (
        SELECT 1 FROM settlement_obligations o 
        WHERE o.source_tx_id = t.id
      )
  LOOP
    -- Get or create beneficiary participant (simplified - map payee to generic participant)
    SELECT id INTO v_target_participant_id 
    FROM settlement_participants 
    WHERE routing_code = COALESCE(v_txn.payee_ifsc, 'GENERIC');
    
    IF v_target_participant_id IS NULL THEN
      INSERT INTO settlement_participants (
        routing_code, swift_bic, name, participant_type, niss_account_ref
      ) VALUES (
        COALESCE(v_txn.payee_ifsc, 'GENERIC'),
        COALESCE(v_txn.payee_ifsc, 'GENRNANX'),
        'Generic Beneficiary Bank',
        'direct',
        'NISS-GEN-001'
      )
      RETURNING id INTO v_target_participant_id;
    END IF;
    
    -- Create principal obligation (NamLend pays beneficiary)
    INSERT INTO settlement_obligations (
      run_id,
      source_participant_id,
      target_participant_id,
      source_settlement_id,
      target_settlement_id,
      category,
      amount,
      source_tx_id,
      metadata
    ) VALUES (
      p_run_id,
      v_namlend_participant_id,
      v_target_participant_id,
      v_namlend_participant_id,
      v_target_participant_id,
      'principal',
      v_txn.amount,
      v_txn.id,
      jsonb_build_object(
        'loan_id', v_txn.loan_id,
        'disbursement_id', v_txn.disbursement_id,
        'payee_vpa', v_txn.payee_vpa,
        'payee_name', v_txn.payee_name,
        'ips_rrn', v_txn.ips_rrn,
        'completed_at', v_txn.completed_at
      )
    );
    
    -- Create interchange obligation (0.1% of principal)
    INSERT INTO settlement_obligations (
      run_id,
      source_participant_id,
      target_participant_id,
      source_settlement_id,
      target_settlement_id,
      category,
      amount,
      source_tx_id
    ) VALUES (
      p_run_id,
      v_target_participant_id,
      v_namlend_participant_id,
      v_target_participant_id,
      v_namlend_participant_id,
      'interchange',
      ROUND(v_txn.amount * 0.001, 2),
      v_txn.id
    );
    
    -- Create switching fee obligation (fixed N$0.50 per transaction)
    INSERT INTO settlement_obligations (
      run_id,
      source_participant_id,
      target_participant_id,
      source_settlement_id,
      target_settlement_id,
      category,
      amount,
      source_tx_id
    ) VALUES (
      p_run_id,
      v_namlend_participant_id,
      (SELECT id FROM settlement_participants WHERE is_operator = TRUE LIMIT 1),
      v_namlend_participant_id,
      (SELECT id FROM settlement_participants WHERE is_operator = TRUE LIMIT 1),
      'switching_fee',
      0.50,
      v_txn.id
    );
    
    v_txn_count := v_txn_count + 1;
    v_total_principal := v_total_principal + v_txn.amount;
    v_total_interchange := v_total_interchange + ROUND(v_txn.amount * 0.001, 2);
    v_total_switching_fee := v_total_switching_fee + 0.50;
  END LOOP;
  
  -- Update run statistics
  UPDATE settlement_runs SET
    transaction_count = v_txn_count,
    total_principal = v_total_principal,
    total_interchange = v_total_interchange,
    total_switching_fee = v_total_switching_fee,
    state = 'cutoff_reached',
    cutoff_at = NOW(),
    updated_at = NOW()
  WHERE id = p_run_id;
  
  RETURN json_build_object(
    'success', true,
    'transactions_processed', v_txn_count,
    'total_principal', v_total_principal,
    'total_interchange', v_total_interchange,
    'total_switching_fee', v_total_switching_fee
  );
END;
$$;

-- ============================================================================
-- COMPUTE BILATERAL NETTING
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_settlement_netting(p_run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
  v_net RECORD;
  v_instr_seq INTEGER := 0;
  v_net_count INTEGER := 0;
  v_instr_id VARCHAR;
BEGIN
  -- Get run details
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;
  
  IF v_run IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RUN_NOT_FOUND');
  END IF;
  
  IF v_run.state NOT IN ('cutoff_reached', 'prepare_inputs') THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_STATE');
  END IF;
  
  -- Update state to netting
  UPDATE settlement_runs SET state = 'netting', updated_at = NOW() WHERE id = p_run_id;
  
  -- Clear any existing net instructions for this run
  DELETE FROM settlement_net_instructions WHERE run_id = p_run_id;
  
  -- Compute bilateral netting for principal + interchange
  FOR v_net IN
    WITH bilateral AS (
      SELECT 
        source_settlement_id,
        target_settlement_id,
        SUM(CASE WHEN category IN ('principal', 'interchange') THEN amount ELSE 0 END) as total_amount
      FROM settlement_obligations
      WHERE run_id = p_run_id AND category IN ('principal', 'interchange')
      GROUP BY source_settlement_id, target_settlement_id
    ),
    netted AS (
      SELECT 
        LEAST(a.source_settlement_id, a.target_settlement_id) as party_a,
        GREATEST(a.source_settlement_id, a.target_settlement_id) as party_b,
        SUM(CASE WHEN a.source_settlement_id < a.target_settlement_id THEN a.total_amount ELSE -a.total_amount END) as net_position
      FROM bilateral a
      GROUP BY 
        LEAST(a.source_settlement_id, a.target_settlement_id),
        GREATEST(a.source_settlement_id, a.target_settlement_id)
      HAVING SUM(CASE WHEN a.source_settlement_id < a.target_settlement_id THEN a.total_amount ELSE -a.total_amount END) != 0
    )
    SELECT 
      CASE WHEN n.net_position > 0 THEN n.party_a ELSE n.party_b END as debtor_id,
      CASE WHEN n.net_position > 0 THEN n.party_b ELSE n.party_a END as creditor_id,
      ABS(n.net_position) as amount
    FROM netted n
  LOOP
    v_instr_seq := v_instr_seq + 1;
    v_instr_id := v_run.run_id || '-MAIN-' || LPAD(v_instr_seq::TEXT, 4, '0');
    
    INSERT INTO settlement_net_instructions (
      run_id,
      instruction_id,
      source_participant_id,
      target_participant_id,
      amount,
      category_group,
      batch_type,
      end_to_end_id
    ) VALUES (
      p_run_id,
      v_instr_id,
      v_net.debtor_id,
      v_net.creditor_id,
      v_net.amount,
      'principal_interchange',
      'main',
      'E2E-' || v_instr_id
    );
    
    v_net_count := v_net_count + 1;
  END LOOP;
  
  -- Compute switching fee netting (all participants to operator)
  FOR v_net IN
    SELECT 
      source_settlement_id,
      SUM(amount) as total_fee
    FROM settlement_obligations
    WHERE run_id = p_run_id AND category = 'switching_fee'
    GROUP BY source_settlement_id
    HAVING SUM(amount) > 0
  LOOP
    v_instr_seq := v_instr_seq + 1;
    v_instr_id := v_run.run_id || '-SWFEE-' || LPAD(v_instr_seq::TEXT, 4, '0');
    
    INSERT INTO settlement_net_instructions (
      run_id,
      instruction_id,
      source_participant_id,
      target_participant_id,
      amount,
      category_group,
      batch_type,
      end_to_end_id
    ) VALUES (
      p_run_id,
      v_instr_id,
      v_net.source_settlement_id,
      (SELECT id FROM settlement_participants WHERE is_operator = TRUE LIMIT 1),
      v_net.total_fee,
      'switching_fee',
      'switching_fee',
      'E2E-' || v_instr_id
    );
    
    v_net_count := v_net_count + 1;
  END LOOP;
  
  -- Update run
  UPDATE settlement_runs SET
    net_instruction_count = v_net_count,
    netting_completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_run_id;
  
  RETURN json_build_object(
    'success', true,
    'net_instructions_created', v_net_count
  );
END;
$$;

-- ============================================================================
-- GENERATE PACS.009 BATCHES
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_pacs009_batches(p_run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
  v_batch_type settlement_batch_type;
  v_batch_id UUID;
  v_msg_id VARCHAR;
  v_file_name VARCHAR;
  v_xml_content TEXT;
  v_instr_count INTEGER;
  v_total_amount DECIMAL;
  v_batches_created INTEGER := 0;
BEGIN
  -- Get run details
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;
  
  IF v_run IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RUN_NOT_FOUND');
  END IF;
  
  -- Clear existing batches
  DELETE FROM settlement_pacs009_batches WHERE run_id = p_run_id;
  
  -- Generate batch for each type
  FOREACH v_batch_type IN ARRAY ARRAY['main', 'switching_fee']::settlement_batch_type[]
  LOOP
    -- Check if we have instructions for this batch type
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_instr_count, v_total_amount
    FROM settlement_net_instructions
    WHERE run_id = p_run_id AND batch_type = v_batch_type;
    
    IF v_instr_count > 0 THEN
      v_msg_id := 'PACS009-' || v_run.run_id || '-' || UPPER(v_batch_type::TEXT);
      v_file_name := v_msg_id || '.xml';
      
      -- Generate XML content
      v_xml_content := generate_pacs009_xml(p_run_id, v_batch_type, v_msg_id);
      
      INSERT INTO settlement_pacs009_batches (
        run_id,
        batch_type,
        msg_id,
        file_name,
        file_content,
        file_checksum,
        file_size,
        instruction_count,
        total_amount,
        status
      ) VALUES (
        p_run_id,
        v_batch_type,
        v_msg_id,
        v_file_name,
        v_xml_content,
        md5(v_xml_content),
        LENGTH(v_xml_content),
        v_instr_count,
        v_total_amount,
        'generated'
      )
      RETURNING id INTO v_batch_id;
      
      v_batches_created := v_batches_created + 1;
    END IF;
  END LOOP;
  
  -- Update run state
  UPDATE settlement_runs SET
    state = 'generated',
    generated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_run_id;
  
  RETURN json_build_object(
    'success', true,
    'batches_created', v_batches_created
  );
END;
$$;

-- ============================================================================
-- GENERATE PACS.009 XML CONTENT
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_pacs009_xml(
  p_run_id UUID,
  p_batch_type settlement_batch_type,
  p_msg_id VARCHAR
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_run RECORD;
  v_xml TEXT;
  v_txn_xml TEXT := '';
  v_instr RECORD;
  v_instr_count INTEGER := 0;
  v_total_amount DECIMAL := 0;
BEGIN
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;
  
  -- Build transaction entries
  FOR v_instr IN
    SELECT 
      ni.*,
      sp.swift_bic as source_bic,
      sp.name as source_name,
      tp.swift_bic as target_bic,
      tp.name as target_name
    FROM settlement_net_instructions ni
    JOIN settlement_participants sp ON ni.source_participant_id = sp.id
    JOIN settlement_participants tp ON ni.target_participant_id = tp.id
    WHERE ni.run_id = p_run_id AND ni.batch_type = p_batch_type
    ORDER BY ni.instruction_id
  LOOP
    v_instr_count := v_instr_count + 1;
    v_total_amount := v_total_amount + v_instr.amount;
    
    v_txn_xml := v_txn_xml || '
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>' || v_instr.instruction_id || '</InstrId>
        <EndToEndId>' || COALESCE(v_instr.end_to_end_id, v_instr.instruction_id) || '</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="' || v_run.currency || '">' || TO_CHAR(v_instr.amount, 'FM999999999990.00') || '</IntrBkSttlmAmt>
      <ChrgBr>SHAR</ChrgBr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>' || v_instr.source_bic || '</BICFI>
          <Nm>' || v_instr.source_name || '</Nm>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>' || v_instr.target_bic || '</BICFI>
          <Nm>' || v_instr.target_name || '</Nm>
        </FinInstnId>
      </CdtrAgt>
    </CdtTrfTxInf>';
  END LOOP;
  
  -- Build complete XML
  v_xml := '<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.08">
  <FICdtTrf>
    <GrpHdr>
      <MsgId>' || p_msg_id || '</MsgId>
      <CreDtTm>' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || '</CreDtTm>
      <NbOfTxs>' || v_instr_count || '</NbOfTxs>
      <CtrlSum>' || TO_CHAR(v_total_amount, 'FM999999999990.00') || '</CtrlSum>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <SttlmDt>' || TO_CHAR(v_run.settlement_date, 'YYYY-MM-DD') || '</SttlmDt>
      </SttlmInf>
    </GrpHdr>' || v_txn_xml || '
  </FICdtTrf>
</Document>';
  
  RETURN v_xml;
END;
$$;

-- ============================================================================
-- GENERATE SETTLEMENT REPORTS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_settlement_reports(p_run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
  v_participant RECORD;
  v_report_count INTEGER := 0;
BEGIN
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;
  
  IF v_run IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RUN_NOT_FOUND');
  END IF;
  
  -- Generate Raw Data Report (operator level)
  INSERT INTO settlement_reports (
    run_id,
    participant_id,
    report_type,
    file_name,
    report_data
  ) VALUES (
    p_run_id,
    NULL,
    'raw_data',
    'RAWDATA-' || v_run.run_id || '.json',
    (SELECT jsonb_build_object(
      'run_id', v_run.run_id,
      'settlement_date', v_run.settlement_date,
      'transactions', COALESCE(
        jsonb_agg(jsonb_build_object(
          'txId', o.id,
          'timestamp', o.created_at,
          'remitterParticipant', sp.name,
          'beneficiaryParticipant', tp.name,
          'amount', o.amount,
          'currency', 'NAD',
          'category', o.category,
          'productType', 'P2P'
        )), '[]'::jsonb)
    ) FROM settlement_obligations o
    JOIN settlement_participants sp ON o.source_participant_id = sp.id
    JOIN settlement_participants tp ON o.target_participant_id = tp.id
    WHERE o.run_id = p_run_id)
  );
  v_report_count := v_report_count + 1;
  
  -- Generate NTSL Report per participant
  FOR v_participant IN
    SELECT DISTINCT p.*
    FROM settlement_participants p
    WHERE EXISTS (
      SELECT 1 FROM settlement_obligations o 
      WHERE o.run_id = p_run_id 
        AND (o.source_settlement_id = p.id OR o.target_settlement_id = p.id)
    )
  LOOP
    INSERT INTO settlement_reports (
      run_id,
      participant_id,
      report_type,
      file_name,
      report_data
    ) VALUES (
      p_run_id,
      v_participant.id,
      'ntsl',
      'NTSL-' || v_run.run_id || '-' || v_participant.routing_code || '.json',
      jsonb_build_object(
        'participant', v_participant.name,
        'participantBic', v_participant.swift_bic,
        'settlementDate', v_run.settlement_date,
        'windowId', v_run.window_id,
        'credits', (
          SELECT COALESCE(SUM(amount), 0) FROM settlement_obligations
          WHERE run_id = p_run_id AND target_settlement_id = v_participant.id
        ),
        'debits', (
          SELECT COALESCE(SUM(amount), 0) FROM settlement_obligations
          WHERE run_id = p_run_id AND source_settlement_id = v_participant.id
        ),
        'netPosition', (
          SELECT COALESCE(SUM(CASE WHEN target_settlement_id = v_participant.id THEN amount ELSE -amount END), 0)
          FROM settlement_obligations
          WHERE run_id = p_run_id AND (source_settlement_id = v_participant.id OR target_settlement_id = v_participant.id)
        ),
        'switchingFee', (
          SELECT COALESCE(SUM(amount), 0) FROM settlement_obligations
          WHERE run_id = p_run_id AND source_settlement_id = v_participant.id AND category = 'switching_fee'
        )
      )
    );
    v_report_count := v_report_count + 1;
  END LOOP;
  
  -- Calculate exposures
  DELETE FROM settlement_exposures WHERE run_id = p_run_id;
  
  INSERT INTO settlement_exposures (run_id, participant_id, gross_payables, gross_receivables, net_position, switching_fee_payable, interchange_net)
  SELECT 
    p_run_id,
    p.id,
    COALESCE((SELECT SUM(amount) FROM settlement_obligations WHERE run_id = p_run_id AND source_settlement_id = p.id), 0),
    COALESCE((SELECT SUM(amount) FROM settlement_obligations WHERE run_id = p_run_id AND target_settlement_id = p.id), 0),
    COALESCE((SELECT SUM(CASE WHEN target_settlement_id = p.id THEN amount ELSE -amount END) FROM settlement_obligations WHERE run_id = p_run_id AND (source_settlement_id = p.id OR target_settlement_id = p.id)), 0),
    COALESCE((SELECT SUM(amount) FROM settlement_obligations WHERE run_id = p_run_id AND source_settlement_id = p.id AND category = 'switching_fee'), 0),
    COALESCE((SELECT SUM(CASE WHEN target_settlement_id = p.id THEN amount ELSE -amount END) FROM settlement_obligations WHERE run_id = p_run_id AND (source_settlement_id = p.id OR target_settlement_id = p.id) AND category = 'interchange'), 0)
  FROM settlement_participants p
  WHERE EXISTS (
    SELECT 1 FROM settlement_obligations o 
    WHERE o.run_id = p_run_id 
      AND (o.source_settlement_id = p.id OR o.target_settlement_id = p.id)
  );
  
  RETURN json_build_object(
    'success', true,
    'reports_generated', v_report_count
  );
END;
$$;

-- ============================================================================
-- PROCESS COMPLETE SETTLEMENT RUN (convenience function)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_settlement_run(
  p_run_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_ingest_result JSON;
  v_netting_result JSON;
  v_batch_result JSON;
  v_report_result JSON;
BEGIN
  -- Step 1: Ingest transactions
  v_ingest_result := ingest_ips_transactions_for_settlement(p_run_id, p_date_from, p_date_to);
  IF NOT (v_ingest_result->>'success')::BOOLEAN THEN
    RETURN v_ingest_result;
  END IF;
  
  -- Step 2: Compute netting
  v_netting_result := compute_settlement_netting(p_run_id);
  IF NOT (v_netting_result->>'success')::BOOLEAN THEN
    RETURN v_netting_result;
  END IF;
  
  -- Step 3: Generate pacs.009 batches
  v_batch_result := generate_pacs009_batches(p_run_id);
  IF NOT (v_batch_result->>'success')::BOOLEAN THEN
    RETURN v_batch_result;
  END IF;
  
  -- Step 4: Generate reports
  v_report_result := generate_settlement_reports(p_run_id);
  IF NOT (v_report_result->>'success')::BOOLEAN THEN
    RETURN v_report_result;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'run_id', p_run_id,
    'ingest', v_ingest_result,
    'netting', v_netting_result,
    'batches', v_batch_result,
    'reports', v_report_result
  );
END;
$$;

-- ============================================================================
-- MARK SETTLEMENT AS SETTLED (simulate NISS acceptance)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_settlement_settled(p_run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_run RECORD;
BEGIN
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;
  
  IF v_run IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'RUN_NOT_FOUND');
  END IF;
  
  -- Update pacs.009 batches to accepted
  UPDATE settlement_pacs009_batches SET
    status = 'accepted',
    dispatched_at = NOW() - INTERVAL '5 minutes',
    validated_at = NOW() - INTERVAL '3 minutes',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE run_id = p_run_id;
  
  -- Create positive acknowledgements
  INSERT INTO settlement_acknowledgements (msg_id, ack_type, batch_id, run_id, received_at, processed_at)
  SELECT 
    msg_id || '-ACK',
    'xsys_002',
    id,
    run_id,
    NOW(),
    NOW()
  FROM settlement_pacs009_batches
  WHERE run_id = p_run_id;
  
  -- Update run state
  UPDATE settlement_runs SET
    state = 'settled',
    dispatched_at = NOW() - INTERVAL '5 minutes',
    settled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_run_id;
  
  -- Mark reports as distributed
  UPDATE settlement_reports SET
    distributed_at = NOW(),
    distribution_channel = 'portal'
  WHERE run_id = p_run_id;
  
  RETURN json_build_object(
    'success', true,
    'run_id', p_run_id,
    'state', 'settled',
    'settled_at', NOW()
  );
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION generate_settlement_run_id TO authenticated;
GRANT EXECUTE ON FUNCTION create_settlement_run TO authenticated;
GRANT EXECUTE ON FUNCTION ingest_ips_transactions_for_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION compute_settlement_netting TO authenticated;
GRANT EXECUTE ON FUNCTION generate_pacs009_batches TO authenticated;
GRANT EXECUTE ON FUNCTION generate_pacs009_xml TO authenticated;
GRANT EXECUTE ON FUNCTION generate_settlement_reports TO authenticated;
GRANT EXECUTE ON FUNCTION process_settlement_run TO authenticated;
GRANT EXECUTE ON FUNCTION mark_settlement_settled TO authenticated;
