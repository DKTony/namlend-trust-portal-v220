-- Settlement System Database Schema
-- Migration: 20251212053000_settlement_system.sql
-- Based on: IPP Settlement (IRCS Back Office) Developer Implementation Guide

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Settlement run states (state machine)
CREATE TYPE settlement_run_state AS ENUM (
  'collecting',           -- Accepting transactions for the window
  'cutoff_reached',       -- Window closed, no more transactions
  'prepare_inputs',       -- Pulling eligible transactions and fee schedules
  'netting',              -- Computing obligations and fees
  'generated',            -- pacs.009 files and reports generated
  'dispatched',           -- Files placed on SFTP outbound
  'sent_to_swift',        -- AXWAY picked up and transmitted
  'swift_validated',      -- SWIFT validation passed
  'sent_to_niss',         -- Delivered to NISS
  'niss_accepted',        -- xsys.002 received (success)
  'failed_validation',    -- xsys.001/xsys.003 received (error)
  'settled',              -- Settlement confirmed, reports distributed
  'closed',               -- Run locked (immutable)
  'adjustment_pending'    -- Disputes require later adjustment runs
);

-- Obligation categories
CREATE TYPE obligation_category AS ENUM (
  'principal',
  'interchange',
  'switching_fee',
  'penalty',
  'adjustment'
);

-- Batch types
CREATE TYPE settlement_batch_type AS ENUM (
  'main',           -- Principal + Interchange net positions
  'switching_fee'   -- Participant → IPS Operator
);

-- Acknowledgement types
CREATE TYPE ack_type AS ENUM (
  'xsys_001',  -- Negative acknowledgement (failed validation)
  'xsys_002',  -- Positive acknowledgement (success)
  'xsys_003'   -- Abort notification
);

-- Report types
CREATE TYPE settlement_report_type AS ENUM (
  'raw_data',
  'ntsl',
  'adjustment',
  'pending_adjustment_response',
  'pending_status',
  'timeout'
);

-- Participant type
CREATE TYPE participant_type AS ENUM (
  'direct',      -- Has own NISS settlement account
  'sponsored'    -- Settles via sponsor
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Participants (banks/PSPs)
CREATE TABLE IF NOT EXISTS settlement_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routing_code VARCHAR(20) NOT NULL UNIQUE,  -- IFSC-like code for online routing
  swift_bic VARCHAR(11) NOT NULL,            -- SWIFT/BIC for settlement
  name VARCHAR(255) NOT NULL,
  participant_type participant_type NOT NULL DEFAULT 'direct',
  sponsor_id UUID REFERENCES settlement_participants(id),  -- For sponsored participants
  niss_account_ref VARCHAR(50),              -- NISS settlement account (direct only)
  is_operator BOOLEAN DEFAULT FALSE,         -- IPS Operator flag
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT sponsored_has_sponsor CHECK (
    (participant_type = 'direct') OR 
    (participant_type = 'sponsored' AND sponsor_id IS NOT NULL)
  ),
  CONSTRAINT direct_has_niss CHECK (
    (participant_type = 'sponsored') OR 
    (participant_type = 'direct' AND niss_account_ref IS NOT NULL)
  )
);

-- Settlement windows configuration
CREATE TABLE IF NOT EXISTS settlement_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id VARCHAR(10) NOT NULL,            -- SW1, SW2, SW3
  day_of_week INTEGER NOT NULL,              -- 0=Sunday, 1=Monday, ..., 6=Saturday
  cutoff_time TIME NOT NULL,                 -- e.g., 08:00, 12:00, 15:00
  enabled BOOLEAN DEFAULT TRUE,
  description VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(window_id, day_of_week)
);

-- Holiday calendar
CREATE TABLE IF NOT EXISTS settlement_holiday_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fee schedules
CREATE TABLE IF NOT EXISTS settlement_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type VARCHAR(50) NOT NULL,             -- 'interchange', 'switching_fee'
  product_type VARCHAR(50),                  -- Optional: P2P, P2M, etc.
  rate_type VARCHAR(20) NOT NULL,            -- 'percentage', 'fixed', 'tiered'
  rate_value DECIMAL(10,6),                  -- For percentage or fixed
  rate_tiers JSONB,                          -- For tiered rates
  direction VARCHAR(20),                     -- 'remitter_pays', 'beneficiary_pays', 'split'
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlement runs
CREATE TABLE IF NOT EXISTS settlement_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR(50) NOT NULL UNIQUE,        -- Human-readable: YYYYMMDD-SW1-001
  window_id VARCHAR(10) NOT NULL,
  settlement_date DATE NOT NULL,
  currency VARCHAR(3) DEFAULT 'NAD',
  scheme_version VARCHAR(20) DEFAULT '1.0',
  state settlement_run_state NOT NULL DEFAULT 'collecting',
  amendment_seq INTEGER DEFAULT 0,           -- Incremented on retry/amendment
  
  -- Statistics
  transaction_count INTEGER DEFAULT 0,
  total_principal DECIMAL(18,2) DEFAULT 0,
  total_interchange DECIMAL(18,2) DEFAULT 0,
  total_switching_fee DECIMAL(18,2) DEFAULT 0,
  net_instruction_count INTEGER DEFAULT 0,
  
  -- Timestamps
  cutoff_at TIMESTAMPTZ,
  netting_completed_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(settlement_date, window_id, amendment_seq)
);

-- Obligations (immutable ledger entries)
CREATE TABLE IF NOT EXISTS settlement_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES settlement_runs(id),
  source_participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  target_participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  source_settlement_id UUID NOT NULL REFERENCES settlement_participants(id),  -- Resolved (sponsor if indirect)
  target_settlement_id UUID NOT NULL REFERENCES settlement_participants(id),  -- Resolved (sponsor if indirect)
  category obligation_category NOT NULL,
  amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
  source_tx_id UUID,                         -- Reference to original transaction
  fee_rule_id UUID REFERENCES settlement_fee_rules(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Net instructions (result of bilateral netting)
CREATE TABLE IF NOT EXISTS settlement_net_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES settlement_runs(id),
  instruction_id VARCHAR(50) NOT NULL,       -- Unique per run
  source_participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  target_participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
  category_group VARCHAR(50) NOT NULL,       -- 'principal_interchange', 'switching_fee'
  batch_type settlement_batch_type NOT NULL,
  
  -- For pacs.009 generation
  end_to_end_id VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(run_id, instruction_id)
);

-- pacs.009 batches
CREATE TABLE IF NOT EXISTS settlement_pacs009_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES settlement_runs(id),
  batch_type settlement_batch_type NOT NULL,
  msg_id VARCHAR(50) NOT NULL UNIQUE,        -- Unique message ID
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_content TEXT,                         -- XML content (for viewing)
  file_checksum VARCHAR(64),
  file_size INTEGER,
  instruction_count INTEGER DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'generated',    -- generated, dispatched, validated, accepted, failed
  dispatched_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(run_id, batch_type)
);

-- Acknowledgements
CREATE TABLE IF NOT EXISTS settlement_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msg_id VARCHAR(50) NOT NULL,               -- Correlates to pacs009 msg_id
  ack_type ack_type NOT NULL,
  batch_id UUID REFERENCES settlement_pacs009_batches(id),
  run_id UUID REFERENCES settlement_runs(id),
  
  -- Payload
  raw_payload TEXT,
  error_code VARCHAR(20),
  error_description TEXT,
  
  -- Metadata
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  correlation_keys JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlement reports
CREATE TABLE IF NOT EXISTS settlement_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES settlement_runs(id),
  participant_id UUID REFERENCES settlement_participants(id),  -- NULL for operator reports
  report_type settlement_report_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_content TEXT,                         -- For viewing
  file_checksum VARCHAR(64),
  file_size INTEGER,
  
  -- Report data (JSON for flexibility)
  report_data JSONB,
  
  -- Distribution
  distributed_at TIMESTAMPTZ,
  distribution_channel VARCHAR(50),          -- 'sftp', 'email', 'portal'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adjustments (disputes, chargebacks, corrections)
CREATE TABLE IF NOT EXISTS settlement_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES settlement_runs(id),  -- Which run this affects
  original_tx_id UUID,                       -- Original transaction
  adjustment_type VARCHAR(50) NOT NULL,      -- 'dispute', 'chargeback', 'correction'
  
  source_participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  target_participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NAD',
  
  reason_code VARCHAR(20),
  reason_description TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',      -- pending, approved, rejected, settled
  response_required_by TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  
  -- Settlement
  settled_in_run_id UUID REFERENCES settlement_runs(id),
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeout transactions (requiring follow-up)
CREATE TABLE IF NOT EXISTS settlement_timeout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES settlement_runs(id),
  original_tx_id UUID NOT NULL,
  
  participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  counterparty_id UUID NOT NULL REFERENCES settlement_participants(id),
  amount DECIMAL(18,2) NOT NULL,
  
  timeout_reason VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',      -- pending, resolved, written_off
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exposure monitoring
CREATE TABLE IF NOT EXISTS settlement_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES settlement_runs(id),
  participant_id UUID NOT NULL REFERENCES settlement_participants(id),
  
  gross_payables DECIMAL(18,2) DEFAULT 0,
  gross_receivables DECIMAL(18,2) DEFAULT 0,
  net_position DECIMAL(18,2) DEFAULT 0,      -- Positive = receivable, Negative = payable
  switching_fee_payable DECIMAL(18,2) DEFAULT 0,
  interchange_net DECIMAL(18,2) DEFAULT 0,
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(run_id, participant_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_settlement_runs_date ON settlement_runs(settlement_date);
CREATE INDEX IF NOT EXISTS idx_settlement_runs_state ON settlement_runs(state);
CREATE INDEX IF NOT EXISTS idx_settlement_runs_window ON settlement_runs(window_id);

CREATE INDEX IF NOT EXISTS idx_obligations_run ON settlement_obligations(run_id);
CREATE INDEX IF NOT EXISTS idx_obligations_source ON settlement_obligations(source_participant_id);
CREATE INDEX IF NOT EXISTS idx_obligations_target ON settlement_obligations(target_participant_id);

CREATE INDEX IF NOT EXISTS idx_net_instructions_run ON settlement_net_instructions(run_id);
CREATE INDEX IF NOT EXISTS idx_pacs009_run ON settlement_pacs009_batches(run_id);
CREATE INDEX IF NOT EXISTS idx_pacs009_msg ON settlement_pacs009_batches(msg_id);

CREATE INDEX IF NOT EXISTS idx_acks_msg ON settlement_acknowledgements(msg_id);
CREATE INDEX IF NOT EXISTS idx_acks_run ON settlement_acknowledgements(run_id);

CREATE INDEX IF NOT EXISTS idx_reports_run ON settlement_reports(run_id);
CREATE INDEX IF NOT EXISTS idx_reports_participant ON settlement_reports(participant_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON settlement_reports(report_type);

CREATE INDEX IF NOT EXISTS idx_adjustments_status ON settlement_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_run ON settlement_adjustments(run_id);

CREATE INDEX IF NOT EXISTS idx_timeouts_status ON settlement_timeout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_exposures_run ON settlement_exposures(run_id);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Get settlement runs with summary
CREATE OR REPLACE FUNCTION get_settlement_runs(
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_state settlement_run_state DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  run_id VARCHAR,
  window_id VARCHAR,
  settlement_date DATE,
  state settlement_run_state,
  transaction_count INTEGER,
  total_principal DECIMAL,
  total_interchange DECIMAL,
  total_switching_fee DECIMAL,
  net_instruction_count INTEGER,
  created_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.run_id,
    sr.window_id,
    sr.settlement_date,
    sr.state,
    sr.transaction_count,
    sr.total_principal,
    sr.total_interchange,
    sr.total_switching_fee,
    sr.net_instruction_count,
    sr.created_at,
    sr.settled_at
  FROM settlement_runs sr
  WHERE (p_date_from IS NULL OR sr.settlement_date >= p_date_from)
    AND (p_date_to IS NULL OR sr.settlement_date <= p_date_to)
    AND (p_state IS NULL OR sr.state = p_state)
  ORDER BY sr.settlement_date DESC, sr.window_id
  LIMIT p_limit;
END;
$$;

-- Get settlement run details
CREATE OR REPLACE FUNCTION get_settlement_run_details(p_run_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'run', (SELECT row_to_json(r) FROM settlement_runs r WHERE r.id = p_run_id),
    'batches', (
      SELECT COALESCE(json_agg(row_to_json(b)), '[]'::json)
      FROM settlement_pacs009_batches b
      WHERE b.run_id = p_run_id
    ),
    'acknowledgements', (
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
      FROM settlement_acknowledgements a
      WHERE a.run_id = p_run_id
    ),
    'net_instructions', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ni.id,
          'instruction_id', ni.instruction_id,
          'source', sp.name,
          'source_bic', sp.swift_bic,
          'target', tp.name,
          'target_bic', tp.swift_bic,
          'amount', ni.amount,
          'category_group', ni.category_group,
          'batch_type', ni.batch_type
        )
      ), '[]'::json)
      FROM settlement_net_instructions ni
      JOIN settlement_participants sp ON ni.source_participant_id = sp.id
      JOIN settlement_participants tp ON ni.target_participant_id = tp.id
      WHERE ni.run_id = p_run_id
    ),
    'exposures', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'participant', p.name,
          'gross_payables', e.gross_payables,
          'gross_receivables', e.gross_receivables,
          'net_position', e.net_position,
          'switching_fee_payable', e.switching_fee_payable,
          'interchange_net', e.interchange_net
        )
      ), '[]'::json)
      FROM settlement_exposures e
      JOIN settlement_participants p ON e.participant_id = p.id
      WHERE e.run_id = p_run_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Get pacs.009 batch content
CREATE OR REPLACE FUNCTION get_pacs009_batch(p_batch_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'batch', row_to_json(b),
    'run', row_to_json(r),
    'instructions', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'instruction_id', ni.instruction_id,
          'end_to_end_id', ni.end_to_end_id,
          'source', sp.name,
          'source_bic', sp.swift_bic,
          'target', tp.name,
          'target_bic', tp.swift_bic,
          'amount', ni.amount,
          'category_group', ni.category_group
        )
      ), '[]'::json)
      FROM settlement_net_instructions ni
      JOIN settlement_participants sp ON ni.source_participant_id = sp.id
      JOIN settlement_participants tp ON ni.target_participant_id = tp.id
      WHERE ni.run_id = b.run_id AND ni.batch_type = b.batch_type
    )
  )
  FROM settlement_pacs009_batches b
  JOIN settlement_runs r ON b.run_id = r.id
  WHERE b.id = p_batch_id
  INTO result;
  
  RETURN result;
END;
$$;

-- Get reports for a run
CREATE OR REPLACE FUNCTION get_settlement_reports(
  p_run_id UUID DEFAULT NULL,
  p_report_type settlement_report_type DEFAULT NULL,
  p_participant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  run_id UUID,
  run_date DATE,
  window_id VARCHAR,
  participant_name VARCHAR,
  report_type settlement_report_type,
  file_name VARCHAR,
  file_size INTEGER,
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.run_id,
    r.settlement_date,
    r.window_id,
    p.name,
    sr.report_type,
    sr.file_name,
    sr.file_size,
    sr.distributed_at,
    sr.created_at
  FROM settlement_reports sr
  JOIN settlement_runs r ON sr.run_id = r.id
  LEFT JOIN settlement_participants p ON sr.participant_id = p.id
  WHERE (p_run_id IS NULL OR sr.run_id = p_run_id)
    AND (p_report_type IS NULL OR sr.report_type = p_report_type)
    AND (p_participant_id IS NULL OR sr.participant_id = p_participant_id)
  ORDER BY sr.created_at DESC;
END;
$$;

-- Get adjustments
CREATE OR REPLACE FUNCTION get_settlement_adjustments(
  p_status VARCHAR DEFAULT NULL,
  p_run_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  run_id UUID,
  run_date DATE,
  adjustment_type VARCHAR,
  source_participant VARCHAR,
  target_participant VARCHAR,
  amount DECIMAL,
  reason_code VARCHAR,
  reason_description TEXT,
  status VARCHAR,
  response_required_by TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.run_id,
    r.settlement_date,
    a.adjustment_type,
    sp.name,
    tp.name,
    a.amount,
    a.reason_code,
    a.reason_description,
    a.status,
    a.response_required_by,
    a.created_at
  FROM settlement_adjustments a
  LEFT JOIN settlement_runs r ON a.run_id = r.id
  JOIN settlement_participants sp ON a.source_participant_id = sp.id
  JOIN settlement_participants tp ON a.target_participant_id = tp.id
  WHERE (p_status IS NULL OR a.status = p_status)
    AND (p_run_id IS NULL OR a.run_id = p_run_id)
  ORDER BY a.created_at DESC;
END;
$$;

-- Get timeout transactions
CREATE OR REPLACE FUNCTION get_timeout_transactions(p_status VARCHAR DEFAULT 'pending')
RETURNS TABLE (
  id UUID,
  run_id UUID,
  run_date DATE,
  participant VARCHAR,
  counterparty VARCHAR,
  amount DECIMAL,
  timeout_reason VARCHAR,
  status VARCHAR,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.run_id,
    r.settlement_date,
    p.name,
    cp.name,
    t.amount,
    t.timeout_reason,
    t.status,
    t.created_at
  FROM settlement_timeout_transactions t
  LEFT JOIN settlement_runs r ON t.run_id = r.id
  JOIN settlement_participants p ON t.participant_id = p.id
  JOIN settlement_participants cp ON t.counterparty_id = cp.id
  WHERE (p_status IS NULL OR t.status = p_status)
  ORDER BY t.created_at DESC;
END;
$$;

-- Get settlement statistics
CREATE OR REPLACE FUNCTION get_settlement_statistics(
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'period', json_build_object('from', p_date_from, 'to', p_date_to),
    'runs', (
      SELECT json_build_object(
        'total', COUNT(*),
        'settled', COUNT(*) FILTER (WHERE state IN ('settled', 'closed')),
        'failed', COUNT(*) FILTER (WHERE state = 'failed_validation'),
        'pending', COUNT(*) FILTER (WHERE state NOT IN ('settled', 'closed', 'failed_validation'))
      )
      FROM settlement_runs
      WHERE settlement_date BETWEEN p_date_from AND p_date_to
    ),
    'totals', (
      SELECT json_build_object(
        'principal', COALESCE(SUM(total_principal), 0),
        'interchange', COALESCE(SUM(total_interchange), 0),
        'switching_fee', COALESCE(SUM(total_switching_fee), 0),
        'transactions', COALESCE(SUM(transaction_count), 0)
      )
      FROM settlement_runs
      WHERE settlement_date BETWEEN p_date_from AND p_date_to
        AND state IN ('settled', 'closed')
    ),
    'adjustments', (
      SELECT json_build_object(
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'approved', COUNT(*) FILTER (WHERE status = 'approved'),
        'total_amount', COALESCE(SUM(amount), 0)
      )
      FROM settlement_adjustments
      WHERE created_at BETWEEN p_date_from AND p_date_to + INTERVAL '1 day'
    ),
    'timeouts', (
      SELECT json_build_object(
        'pending', COUNT(*) FILTER (WHERE status = 'pending'),
        'resolved', COUNT(*) FILTER (WHERE status = 'resolved')
      )
      FROM settlement_timeout_transactions
      WHERE created_at BETWEEN p_date_from AND p_date_to + INTERVAL '1 day'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE settlement_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_holiday_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_net_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_pacs009_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_timeout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_exposures ENABLE ROW LEVEL SECURITY;

-- Admins can view all settlement data
CREATE POLICY "Admins can view settlement participants"
  ON settlement_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage settlement participants"
  ON settlement_participants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view settlement windows"
  ON settlement_windows FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view holiday calendar"
  ON settlement_holiday_calendar FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view fee rules"
  ON settlement_fee_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view settlement runs"
  ON settlement_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view obligations"
  ON settlement_obligations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view net instructions"
  ON settlement_net_instructions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view pacs009 batches"
  ON settlement_pacs009_batches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view acknowledgements"
  ON settlement_acknowledgements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view reports"
  ON settlement_reports FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view adjustments"
  ON settlement_adjustments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage adjustments"
  ON settlement_adjustments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view timeout transactions"
  ON settlement_timeout_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage timeout transactions"
  ON settlement_timeout_transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can view exposures"
  ON settlement_exposures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_settlement_runs TO authenticated;
GRANT EXECUTE ON FUNCTION get_settlement_run_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_pacs009_batch TO authenticated;
GRANT EXECUTE ON FUNCTION get_settlement_reports TO authenticated;
GRANT EXECUTE ON FUNCTION get_settlement_adjustments TO authenticated;
GRANT EXECUTE ON FUNCTION get_timeout_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_settlement_statistics TO authenticated;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default settlement windows (weekdays)
INSERT INTO settlement_windows (window_id, day_of_week, cutoff_time, description) VALUES
  ('SW1', 1, '08:00', 'Monday Morning'),
  ('SW2', 1, '12:00', 'Monday Noon'),
  ('SW3', 1, '15:00', 'Monday Afternoon'),
  ('SW1', 2, '08:00', 'Tuesday Morning'),
  ('SW2', 2, '12:00', 'Tuesday Noon'),
  ('SW3', 2, '15:00', 'Tuesday Afternoon'),
  ('SW1', 3, '08:00', 'Wednesday Morning'),
  ('SW2', 3, '12:00', 'Wednesday Noon'),
  ('SW3', 3, '15:00', 'Wednesday Afternoon'),
  ('SW1', 4, '08:00', 'Thursday Morning'),
  ('SW2', 4, '12:00', 'Thursday Noon'),
  ('SW3', 4, '15:00', 'Thursday Afternoon'),
  ('SW1', 5, '08:00', 'Friday Morning'),
  ('SW2', 5, '12:00', 'Friday Noon'),
  ('SW3', 5, '15:00', 'Friday Afternoon'),
  ('SW1', 6, '11:00', 'Saturday Morning')
ON CONFLICT DO NOTHING;

-- Insert IPS Operator as a participant
INSERT INTO settlement_participants (routing_code, swift_bic, name, participant_type, niss_account_ref, is_operator)
VALUES ('IPSOPERATOR', 'BONXNANX', 'IPS Operator (Bank of Namibia)', 'direct', 'NISS-OPERATOR-001', TRUE)
ON CONFLICT (routing_code) DO NOTHING;

-- Insert sample fee rules
INSERT INTO settlement_fee_rules (fee_type, product_type, rate_type, rate_value, direction, effective_from) VALUES
  ('switching_fee', 'P2P', 'fixed', 0.50, 'remitter_pays', '2024-01-01'),
  ('switching_fee', 'P2M', 'fixed', 0.75, 'remitter_pays', '2024-01-01'),
  ('interchange', 'P2P', 'percentage', 0.001, 'beneficiary_pays', '2024-01-01'),
  ('interchange', 'P2M', 'percentage', 0.0015, 'beneficiary_pays', '2024-01-01')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE settlement_participants IS 'Banks and PSPs participating in IPS settlement';
COMMENT ON TABLE settlement_windows IS 'Configurable settlement windows (cutoff times)';
COMMENT ON TABLE settlement_runs IS 'Settlement run instances with state machine';
COMMENT ON TABLE settlement_obligations IS 'Immutable obligation ledger entries';
COMMENT ON TABLE settlement_net_instructions IS 'Result of bilateral netting';
COMMENT ON TABLE settlement_pacs009_batches IS 'Generated pacs.009 batch files';
COMMENT ON TABLE settlement_acknowledgements IS 'NISS/SWIFT acknowledgements (xsys.001/002/003)';
COMMENT ON TABLE settlement_reports IS 'Generated reports (NTSL, Raw Data, etc.)';
COMMENT ON TABLE settlement_adjustments IS 'Disputes, chargebacks, and corrections';
COMMENT ON TABLE settlement_timeout_transactions IS 'Transactions with timeout/uncertain outcome';
COMMENT ON TABLE settlement_exposures IS 'Participant exposure monitoring per run';
