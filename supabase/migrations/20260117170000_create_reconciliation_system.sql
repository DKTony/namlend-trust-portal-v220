-- Bank Reconciliation System Migration
-- Creates tables for bank transaction reconciliation with payments
-- Required by api-reconciliation edge function

-- ============================================================================
-- Reconciliation Runs Table
-- Tracks reconciliation sessions/batches
-- ============================================================================
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  bank_account VARCHAR(50),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  notes TEXT,
  
  -- Statistics (updated during reconciliation)
  total_transactions INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  matched_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- Bank Transactions Table
-- Imported bank statement transactions for matching with payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- External identifiers
  external_id VARCHAR(100) NOT NULL,
  
  -- Transaction details
  amount DECIMAL(12,2) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(10) NOT NULL DEFAULT 'credit'
    CHECK (transaction_type IN ('credit', 'debit')),
  reference VARCHAR(100),
  description TEXT,
  
  -- Source bank
  source VARCHAR(50) NOT NULL 
    CHECK (source IN ('fnb', 'standard_bank', 'nedbank', 'bank_windhoek', 'csv', 'api', 'manual')),
  
  -- Matching status
  status VARCHAR(20) NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('unmatched', 'matched', 'disputed', 'excluded', 'duplicate')),
  
  -- Relationship to reconciliation run
  reconciliation_run_id UUID REFERENCES reconciliation_runs(id) ON DELETE SET NULL,
  
  -- Match information
  matched_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  match_notes TEXT,
  match_confidence DECIMAL(5,2), -- 0-100 for auto-match confidence score
  
  -- Import tracking
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate imports
  UNIQUE(external_id, source)
);

-- ============================================================================
-- Add bank_transaction_id to payments table if not exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'bank_transaction_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN bank_transaction_id UUID REFERENCES bank_transactions(id);
  END IF;
END $$;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recon_runs_status ON reconciliation_runs(status);
CREATE INDEX IF NOT EXISTS idx_recon_runs_period ON reconciliation_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_recon_runs_created ON reconciliation_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_txn_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_txn_run ON bank_transactions(reconciliation_run_id);
CREATE INDEX IF NOT EXISTS idx_bank_txn_date ON bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_reference ON bank_transactions(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_txn_amount ON bank_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_bank_txn_unmatched ON bank_transactions(status, amount) WHERE status = 'unmatched';
CREATE INDEX IF NOT EXISTS idx_bank_txn_external ON bank_transactions(external_id, source);

-- ============================================================================
-- Enable Row-Level Security
-- ============================================================================
ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - Reconciliation Runs
-- ============================================================================

-- Admin and loan officers can view all runs
CREATE POLICY "Staff can view reconciliation runs"
  ON reconciliation_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

-- Only admins can create runs
CREATE POLICY "Admins can create reconciliation runs"
  ON reconciliation_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update runs
CREATE POLICY "Admins can update reconciliation runs"
  ON reconciliation_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to reconciliation runs"
  ON reconciliation_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies - Bank Transactions
-- ============================================================================

-- Admin and loan officers can view all transactions
CREATE POLICY "Staff can view bank transactions"
  ON bank_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

-- Staff can insert transactions (import)
CREATE POLICY "Staff can import bank transactions"
  ON bank_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

-- Staff can update transactions (matching)
CREATE POLICY "Staff can update bank transactions"
  ON bank_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to bank transactions"
  ON bank_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Updated At Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_reconciliation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reconciliation_runs_updated_at ON reconciliation_runs;
CREATE TRIGGER update_reconciliation_runs_updated_at
  BEFORE UPDATE ON reconciliation_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_updated_at();

DROP TRIGGER IF EXISTS update_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_reconciliation_updated_at();

-- ============================================================================
-- Helper Function: Update Run Statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION update_reconciliation_run_stats(p_run_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats RECORD;
BEGIN
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'matched') as matched,
    COUNT(*) FILTER (WHERE status = 'unmatched') as unmatched,
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'matched'), 0) as matched_amount
  INTO v_stats
  FROM bank_transactions
  WHERE reconciliation_run_id = p_run_id;
  
  UPDATE reconciliation_runs
  SET 
    total_transactions = v_stats.total,
    matched_count = v_stats.matched,
    unmatched_count = v_stats.unmatched,
    total_amount = v_stats.total_amount,
    matched_amount = v_stats.matched_amount,
    updated_at = NOW()
  WHERE id = p_run_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION update_reconciliation_run_stats TO authenticated;

-- ============================================================================
-- Audit Trigger for Bank Transactions (Financial Data)
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_bank_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      ip_address
    ) VALUES (
      auth.uid(),
      'BANK_TRANSACTION_STATUS_CHANGE',
      'bank_transactions',
      NEW.id,
      jsonb_build_object('status', OLD.status, 'matched_payment_id', OLD.matched_payment_id),
      jsonb_build_object('status', NEW.status, 'matched_payment_id', NEW.matched_payment_id),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_bank_transactions ON bank_transactions;
CREATE TRIGGER audit_bank_transactions
  AFTER UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION audit_bank_transaction_changes();

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON reconciliation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bank_transactions TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE reconciliation_runs IS 'Bank reconciliation session/batch tracking';
COMMENT ON TABLE bank_transactions IS 'Imported bank statement transactions for reconciliation with payments';
COMMENT ON COLUMN bank_transactions.match_confidence IS 'Auto-match confidence score (0-100)';
COMMENT ON COLUMN bank_transactions.external_id IS 'Bank-provided transaction identifier';
