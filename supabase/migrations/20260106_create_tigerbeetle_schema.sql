-- P0-002: TigerBeetle Schema Migration
-- Creates tables and RPC for TigerBeetle ledger integration

-- tigerbeetle_accounts - Maps Supabase entities to TB accounts
CREATE TABLE IF NOT EXISTS tigerbeetle_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  tb_account_id_high BIGINT NOT NULL,
  tb_account_id_low BIGINT NOT NULL,
  tb_ledger INTEGER NOT NULL DEFAULT 1,
  tb_code INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'failed')),
  created_in_tb_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tb_accounts_entity ON tigerbeetle_accounts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tb_accounts_status ON tigerbeetle_accounts(status) WHERE status != 'created';

-- tigerbeetle_outbox - Outbox pattern for reliable event delivery
CREATE TABLE IF NOT EXISTS tigerbeetle_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  tb_transfer_ids TEXT[],
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tb_outbox_pending ON tigerbeetle_outbox(status, created_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_tb_outbox_source ON tigerbeetle_outbox(source_table, source_id);

-- tigerbeetle_transfers - Shadow ledger for reconciliation
CREATE TABLE IF NOT EXISTS tigerbeetle_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tb_transfer_id_high BIGINT NOT NULL,
  tb_transfer_id_low BIGINT NOT NULL,
  debit_account_id UUID REFERENCES tigerbeetle_accounts(id),
  credit_account_id UUID REFERENCES tigerbeetle_accounts(id),
  amount DECIMAL(19,4) NOT NULL,
  tb_ledger INTEGER NOT NULL DEFAULT 1,
  tb_code INTEGER NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  outbox_id UUID REFERENCES tigerbeetle_outbox(id),
  is_pending BOOLEAN NOT NULL DEFAULT false,
  is_posted BOOLEAN NOT NULL DEFAULT false,
  is_voided BOOLEAN NOT NULL DEFAULT false,
  user_data_128 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tb_transfers_source ON tigerbeetle_transfers(source_table, source_id);

-- tigerbeetle_reconciliation - Reconciliation run history
CREATE TABLE IF NOT EXISTS tigerbeetle_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL CHECK (run_type IN ('FULL', 'INCREMENTAL', 'LOAN_SPECIFIC')),
  loan_id UUID,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'discrepancy_found', 'failed')),
  records_checked INTEGER NOT NULL DEFAULT 0,
  discrepancies_found INTEGER NOT NULL DEFAULT 0,
  discrepancy_details JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  initiated_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE tigerbeetle_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tigerbeetle_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE tigerbeetle_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tigerbeetle_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_tb_accounts" ON tigerbeetle_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tb_outbox" ON tigerbeetle_outbox FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tb_transfers" ON tigerbeetle_transfers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tb_reconciliation" ON tigerbeetle_reconciliation FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_read_tb_accounts" ON tigerbeetle_accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_read_tb_outbox" ON tigerbeetle_outbox FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_read_tb_transfers" ON tigerbeetle_transfers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_all_tb_reconciliation" ON tigerbeetle_reconciliation FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RPC: queue_tigerbeetle_event
CREATE OR REPLACE FUNCTION queue_tigerbeetle_event(
  p_event_type TEXT,
  p_source_table TEXT,
  p_source_id UUID,
  p_payload JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_outbox_id UUID;
BEGIN
  INSERT INTO tigerbeetle_outbox (event_type, source_table, source_id, payload, status)
  VALUES (p_event_type, p_source_table, p_source_id, p_payload, 'pending')
  RETURNING id INTO v_outbox_id;
  RETURN v_outbox_id;
END;
$$;

GRANT EXECUTE ON FUNCTION queue_tigerbeetle_event TO authenticated;
GRANT EXECUTE ON FUNCTION queue_tigerbeetle_event TO service_role;
