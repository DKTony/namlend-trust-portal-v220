-- ============================================================================
-- IPS/IPP Integration Migration
-- Version: 1.0.0
-- Created: December 12, 2025
-- Description: Complete IPS integration schema for NamLend Trust
-- ============================================================================

-- ============================================================================
-- 1. IPS ERROR CODES LOOKUP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_error_codes (
  code VARCHAR(10) PRIMARY KEY,
  internal_code VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  http_status INTEGER DEFAULT 400,
  is_retryable BOOLEAN DEFAULT FALSE,
  user_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ips_error_codes IS 'Lookup table mapping IPS/UPI error codes to internal codes and user messages';

-- Seed common IPS/UPI error codes
INSERT INTO ips_error_codes (code, internal_code, description, http_status, is_retryable, user_message) VALUES
  ('00', 'SUCCESS', 'Approved / completed successfully', 200, FALSE, 'Payment successful'),
  ('01', 'INVALID_CREDENTIALS', 'Invalid credentials', 401, FALSE, 'Invalid PIN or credentials'),
  ('12', 'INVALID_TXN', 'Invalid transaction', 400, FALSE, 'Invalid transaction'),
  ('13', 'INVALID_AMOUNT', 'Invalid amount', 400, FALSE, 'Invalid payment amount'),
  ('14', 'INVALID_ACCOUNT', 'Invalid account number', 400, FALSE, 'Invalid account number'),
  ('30', 'FORMAT_ERROR', 'Format error', 400, FALSE, 'Transaction format error'),
  ('51', 'INSUFFICIENT_FUNDS', 'Insufficient funds', 400, FALSE, 'Insufficient funds in your account'),
  ('55', 'INCORRECT_PIN', 'Incorrect PIN', 401, FALSE, 'Incorrect PIN entered'),
  ('57', 'TXN_NOT_PERMITTED', 'Transaction not permitted', 403, FALSE, 'This transaction is not permitted'),
  ('59', 'RISK_DECLINED', 'Suspected fraud / declined on risk score', 400, FALSE, 'Payment declined for security reasons'),
  ('61', 'EXCEEDS_LIMIT', 'Exceeds withdrawal amount limit', 400, FALSE, 'Amount exceeds your transaction limit'),
  ('65', 'EXCEEDS_FREQUENCY', 'Exceeds withdrawal frequency limit', 400, FALSE, 'Too many transactions. Please try later.'),
  ('68', 'RESPONSE_TIMEOUT', 'Response received too late', 504, TRUE, 'Transaction timed out. Please check status.'),
  ('75', 'PIN_TRIES_EXCEEDED', 'Allowable number of PIN tries exceeded', 401, FALSE, 'Too many incorrect PIN attempts'),
  ('91', 'ISSUER_UNAVAILABLE', 'Issuer or switch inoperative', 503, TRUE, 'Bank system temporarily unavailable'),
  ('92', 'ROUTING_ERROR', 'Destination not found for routing', 502, TRUE, 'Unable to route transaction'),
  ('94', 'DUPLICATE_TXN', 'Duplicate transmission', 409, FALSE, 'This payment has already been processed'),
  ('96', 'SYSTEM_MALFUNCTION', 'System malfunction', 500, TRUE, 'System error. Please try again.'),
  -- IPS-specific codes
  ('IE', 'FUNDS_BLOCKED', 'Adequate funds not available due to blocked mandate funds', 400, FALSE, 'Funds are blocked for another transaction'),
  ('UP', 'PSP_TIMEOUT', 'PSP timeout', 504, TRUE, 'Payment timed out. Please try again.'),
  ('UB', 'BENEFICIARY_ERROR', 'Internal exception at beneficiary side', 502, TRUE, 'Recipient bank error. Please try again.'),
  ('UR', 'REMITTER_ERROR', 'Internal exception at remitter side', 502, TRUE, 'Your bank reported an error. Please try again.'),
  ('XB', 'INVALID_BUSINESS', 'Invalid business message', 400, FALSE, 'Invalid transaction request'),
  ('XC', 'NO_RESPONSE_CODE', 'No suitable response code', 500, TRUE, 'An error occurred. Please try again.'),
  ('XD', 'DEBIT_FAILED', 'Debit has been failed at remitter bank', 400, FALSE, 'Payment could not be debited from your account'),
  ('XE', 'CREDIT_FAILED', 'Credit has been failed at beneficiary bank', 400, TRUE, 'Payment could not be credited. Will be reversed.'),
  ('XF', 'CREDIT_REVERSAL', 'Credit reversal timeout', 504, TRUE, 'Reversal in progress'),
  ('XH', 'ACCOUNT_BLOCKED', 'Account blocked/frozen', 403, FALSE, 'Your account is blocked'),
  ('XI', 'INACTIVE_ACCOUNT', 'Inactive or dormant account', 403, FALSE, 'Account is inactive'),
  ('XJ', 'INVALID_VPA', 'Invalid VPA / Virtual address', 400, FALSE, 'Invalid payment address'),
  ('XK', 'VPA_NOT_REGISTERED', 'VPA not registered', 404, FALSE, 'Payment address not found'),
  ('XL', 'EXPIRED_VPA', 'VPA expired', 400, FALSE, 'Payment address has expired'),
  ('XM', 'RESTRICTED_VPA', 'Restricted VPA', 403, FALSE, 'This payment address is restricted'),
  ('XN', 'BENEFICIARY_LIMIT', 'Beneficiary bank unable to credit', 400, FALSE, 'Recipient cannot receive this payment'),
  ('XP', 'TXN_PENDING', 'Transaction is pending', 202, FALSE, 'Payment is being processed'),
  ('XR', 'REMITTER_CBS_OFFLINE', 'Remitter CBS offline', 503, TRUE, 'Your bank is temporarily offline'),
  ('XT', 'BENEFICIARY_CBS_OFFLINE', 'Beneficiary CBS offline', 503, TRUE, 'Recipient bank is temporarily offline'),
  ('XY', 'MOBILE_NOT_REGISTERED', 'Mobile number not registered', 400, FALSE, 'Mobile number not registered for payments'),
  ('YA', 'NRE_ACCOUNT', 'NRE account not allowed', 403, FALSE, 'This account type is not supported'),
  ('YB', 'REGISTRATION_REQUIRED', 'Registration required', 400, FALSE, 'Please register for instant payments first'),
  ('YC', 'INVALID_MPIN', 'Invalid MPIN', 401, FALSE, 'Invalid payment PIN'),
  ('YD', 'MPIN_NOT_SET', 'MPIN not set', 400, FALSE, 'Please set your payment PIN first'),
  ('YE', 'OTP_EXPIRED', 'OTP expired', 401, FALSE, 'OTP has expired. Please request a new one.'),
  ('YF', 'OTP_INVALID', 'OTP invalid', 401, FALSE, 'Invalid OTP entered'),
  ('ZA', 'DEEMED_SUCCESS', 'Transaction deemed successful', 200, FALSE, 'Payment processed'),
  ('ZM', 'MANDATE_EXPIRED', 'Mandate expired or not found', 400, FALSE, 'Payment authorization has expired')
ON CONFLICT (code) DO UPDATE SET
  internal_code = EXCLUDED.internal_code,
  description = EXCLUDED.description,
  http_status = EXCLUDED.http_status,
  is_retryable = EXCLUDED.is_retryable,
  user_message = EXCLUDED.user_message;


-- ============================================================================
-- 2. IPS TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to NamLend entities
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  disbursement_id UUID REFERENCES disbursements(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  -- IPS identifiers (our side)
  msg_id VARCHAR(50) NOT NULL,
  txn_id VARCHAR(50) NOT NULL,
  
  -- IPS identifiers (IPS response)
  ips_txn_id VARCHAR(50),
  ips_rrn VARCHAR(30),
  org_txn_id VARCHAR(50),
  org_msg_id VARCHAR(50),
  
  -- Transaction classification
  transaction_type VARCHAR(20) NOT NULL,
  ips_txn_type VARCHAR(20) NOT NULL,
  ips_txn_subtype VARCHAR(20),
  
  -- Amount
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NAD',
  
  -- Payer details
  payer_vpa VARCHAR(100) NOT NULL,
  payer_name VARCHAR(255),
  payer_account_masked VARCHAR(50),
  payer_ifsc VARCHAR(20),
  
  -- Payee details
  payee_vpa VARCHAR(100) NOT NULL,
  payee_name VARCHAR(255),
  payee_account_masked VARCHAR(50),
  payee_ifsc VARCHAR(20),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'initiated',
  ips_result VARCHAR(20),
  ips_error_code VARCHAR(10),
  ips_error_message TEXT,
  internal_error_code VARCHAR(50),
  
  -- Metadata
  purpose_code VARCHAR(10),
  initiation_mode VARCHAR(30),
  channel VARCHAR(30),
  note TEXT,
  customer_ref VARCHAR(100),
  
  -- Device info (for fraud prevention)
  device_fingerprint JSONB,
  ip_address INET,
  
  -- Timing
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  last_status_check_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ips_txn_valid_status CHECK (status IN ('initiated', 'pending', 'sent', 'success', 'failed', 'timeout', 'reversed', 'deemed', 'unknown')),
  CONSTRAINT ips_txn_valid_type CHECK (transaction_type IN ('DISBURSEMENT', 'REPAYMENT', 'REFUND', 'REVERSAL', 'BALANCE_CHECK', 'VPA_VALIDATION')),
  CONSTRAINT ips_txn_valid_ips_type CHECK (ips_txn_type IN ('PAY', 'COLLECT', 'REVERSAL', 'AUTOREVERSAL', 'REFUND', 'BAL', 'CHK', 'VAL')),
  CONSTRAINT ips_txn_positive_amount CHECK (amount > 0)
);

-- Unique constraint on msg_id (our idempotency key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ips_txn_msg_id ON ips_transactions(msg_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ips_txn_loan ON ips_transactions(loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_txn_disbursement ON ips_transactions(disbursement_id) WHERE disbursement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_txn_payment ON ips_transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_txn_status ON ips_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ips_txn_created ON ips_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ips_txn_type_status ON ips_transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_ips_txn_pending ON ips_transactions(status, initiated_at) WHERE status IN ('initiated', 'pending', 'sent');

COMMENT ON TABLE ips_transactions IS 'All IPS/IPP transactions for disbursements and repayments';


-- ============================================================================
-- 3. IPS VPA REGISTRY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_vpa_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- VPA details
  vpa_address VARCHAR(100) NOT NULL,
  vpa_type VARCHAR(20) NOT NULL DEFAULT 'HANDLE',
  provider_code VARCHAR(30),
  provider_name VARCHAR(100),
  
  -- Linked account info (for display, masked)
  account_masked VARCHAR(50),
  account_holder_name VARCHAR(255),
  ifsc_code VARCHAR(20),
  
  -- Validation status
  is_validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  validation_txn_id UUID REFERENCES ips_transactions(id),
  validation_error VARCHAR(100),
  
  -- User preferences
  is_default BOOLEAN DEFAULT FALSE,
  display_name VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason VARCHAR(255),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ips_vpa_valid_type CHECK (vpa_type IN ('HANDLE', 'MOBILE_NUMBER', 'ACCOUNT', 'AADHAAR', 'QR')),
  CONSTRAINT ips_vpa_unique_per_user UNIQUE (user_id, vpa_address)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ips_vpa_user ON ips_vpa_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_ips_vpa_address ON ips_vpa_registry(vpa_address);
CREATE INDEX IF NOT EXISTS idx_ips_vpa_default ON ips_vpa_registry(user_id, is_default) WHERE is_default = TRUE;

COMMENT ON TABLE ips_vpa_registry IS 'Customer VPA (Virtual Payment Address) registrations for IPS payments';


-- ============================================================================
-- 4. IPS API LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Correlation
  correlation_id UUID NOT NULL,
  ips_transaction_id UUID REFERENCES ips_transactions(id) ON DELETE SET NULL,
  
  -- API details
  api_name VARCHAR(50) NOT NULL,
  api_version VARCHAR(10),
  direction VARCHAR(10) NOT NULL,
  endpoint_url TEXT,
  
  -- Request/Response summaries (no PII)
  request_summary JSONB,
  response_summary JSONB,
  
  -- Status
  http_status INTEGER,
  ips_result VARCHAR(20),
  error_code VARCHAR(20),
  error_message TEXT,
  
  -- Timing
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Metadata
  environment VARCHAR(20),
  server_id VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ips_log_valid_direction CHECK (direction IN ('OUTBOUND', 'INBOUND', 'CALLBACK'))
);

-- Indexes for debugging and audit
CREATE INDEX IF NOT EXISTS idx_ips_api_logs_correlation ON ips_api_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_ips_api_logs_txn ON ips_api_logs(ips_transaction_id) WHERE ips_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_api_logs_created ON ips_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ips_api_logs_api ON ips_api_logs(api_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ips_api_logs_errors ON ips_api_logs(error_code) WHERE error_code IS NOT NULL;

-- Auto-cleanup old logs (keep 90 days)
-- This can be handled by a scheduled job

COMMENT ON TABLE ips_api_logs IS 'Detailed API call logs for IPS integration debugging and audit';


-- ============================================================================
-- 5. MODIFY EXISTING TABLES
-- ============================================================================

-- Add IPS fields to disbursements
ALTER TABLE disbursements 
  ADD COLUMN IF NOT EXISTS ips_transaction_id UUID REFERENCES ips_transactions(id),
  ADD COLUMN IF NOT EXISTS payee_vpa VARCHAR(100);

-- Add IPS fields to payments
ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS ips_transaction_id UUID REFERENCES ips_transactions(id),
  ADD COLUMN IF NOT EXISTS payer_vpa VARCHAR(100);

-- Add default VPA to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS default_vpa VARCHAR(100);

-- Update payment_method options (if using enum, otherwise just documentation)
COMMENT ON COLUMN disbursements.method IS 'Payment method: bank_transfer, mobile_money, cash, debit_order, ips';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: bank_transfer, mobile_money, cash, debit_order, ips';


-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE ips_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_vpa_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_error_codes ENABLE ROW LEVEL SECURITY;

-- ips_error_codes: Public read (lookup table)
CREATE POLICY "Anyone can read error codes"
  ON ips_error_codes FOR SELECT
  USING (true);

-- ips_transactions: Users see their own, admins see all
CREATE POLICY "Users can view their own IPS transactions"
  ON ips_transactions FOR SELECT
  USING (
    created_by = auth.uid()
    OR loan_id IN (SELECT id FROM loans WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer', 'collections_agent')
    )
  );

CREATE POLICY "Admins can insert IPS transactions"
  ON ips_transactions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "System can update IPS transactions"
  ON ips_transactions FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer')
    )
  );

-- ips_vpa_registry: Users manage their own VPAs
CREATE POLICY "Users can view their own VPAs"
  ON ips_vpa_registry FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own VPAs"
  ON ips_vpa_registry FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own VPAs"
  ON ips_vpa_registry FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own VPAs"
  ON ips_vpa_registry FOR DELETE
  USING (user_id = auth.uid());

-- Admins can view all VPAs
CREATE POLICY "Admins can view all VPAs"
  ON ips_vpa_registry FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer')
    )
  );

-- ips_api_logs: Admins only
CREATE POLICY "Admins can view API logs"
  ON ips_api_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert API logs"
  ON ips_api_logs FOR INSERT
  WITH CHECK (true);


-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Generate unique IPS message ID
CREATE OR REPLACE FUNCTION generate_ips_msg_id()
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN 'NL' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSMS') || 
         substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Generate unique IPS transaction ID
CREATE OR REPLACE FUNCTION generate_ips_txn_id()
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN 'TXN' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSMS') || 
         substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
END;
$$ LANGUAGE plpgsql;

-- Get user-friendly error message from IPS code
CREATE OR REPLACE FUNCTION get_ips_error_message(p_code VARCHAR(10))
RETURNS TEXT AS $$
DECLARE
  v_message TEXT;
BEGIN
  SELECT user_message INTO v_message
  FROM ips_error_codes
  WHERE code = p_code;
  
  RETURN COALESCE(v_message, 'An error occurred. Please try again.');
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if IPS error is retryable
CREATE OR REPLACE FUNCTION is_ips_error_retryable(p_code VARCHAR(10))
RETURNS BOOLEAN AS $$
DECLARE
  v_retryable BOOLEAN;
BEGIN
  SELECT is_retryable INTO v_retryable
  FROM ips_error_codes
  WHERE code = p_code;
  
  RETURN COALESCE(v_retryable, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- 8. RPC FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Initiate IPS Disbursement
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION initiate_ips_disbursement(
  p_disbursement_id UUID,
  p_payee_vpa VARCHAR(100),
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_disbursement RECORD;
  v_loan RECORD;
  v_profile RECORD;
  v_ips_txn_id UUID;
  v_msg_id VARCHAR(50);
  v_txn_id VARCHAR(50);
  v_user_role TEXT;
BEGIN
  -- Check caller has permission
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin', 'loan_officer');
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You do not have permission to initiate disbursements'
    );
  END IF;

  -- Get disbursement with loan info
  SELECT d.*, l.user_id as loan_user_id, l.amount as loan_amount
  INTO v_disbursement
  FROM disbursements d
  JOIN loans l ON l.id = d.loan_id
  WHERE d.id = p_disbursement_id
  AND d.status = 'approved';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_FOUND',
      'message', 'Disbursement not found or not in approved status'
    );
  END IF;
  
  -- Check if already has an IPS transaction
  IF v_disbursement.ips_transaction_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_INITIATED',
      'message', 'This disbursement already has an IPS transaction'
    );
  END IF;
  
  -- Get customer profile for payee name
  SELECT first_name, last_name INTO v_profile
  FROM profiles
  WHERE user_id = v_disbursement.loan_user_id;
  
  -- Generate IPS identifiers
  v_msg_id := generate_ips_msg_id();
  v_txn_id := generate_ips_txn_id();
  
  -- Create IPS transaction record
  INSERT INTO ips_transactions (
    loan_id,
    disbursement_id,
    msg_id,
    txn_id,
    transaction_type,
    ips_txn_type,
    amount,
    currency,
    payer_vpa,
    payer_name,
    payee_vpa,
    payee_name,
    status,
    purpose_code,
    initiation_mode,
    channel,
    note,
    created_by
  ) VALUES (
    v_disbursement.loan_id,
    p_disbursement_id,
    v_msg_id,
    v_txn_id,
    'DISBURSEMENT',
    'PAY',
    v_disbursement.amount,
    'NAD',
    'disbursements@namlend',  -- NamLend's disbursement VPA
    'NamLend Trust',
    p_payee_vpa,
    COALESCE(v_profile.first_name || ' ' || v_profile.last_name, 'Customer'),
    'initiated',
    'BUSN',
    'BACKOFFICE',
    'WEB',
    COALESCE(p_note, 'Loan disbursement'),
    auth.uid()
  )
  RETURNING id INTO v_ips_txn_id;
  
  -- Update disbursement with VPA and IPS transaction reference
  UPDATE disbursements
  SET 
    payee_vpa = p_payee_vpa,
    ips_transaction_id = v_ips_txn_id,
    method = 'ips',
    status = 'processing',
    updated_at = NOW()
  WHERE id = p_disbursement_id;
  
  -- Log state transition
  INSERT INTO state_transitions (
    entity_type, entity_id, from_state, to_state,
    transition_reason, triggered_by, metadata
  ) VALUES (
    'disbursement', p_disbursement_id, 'approved', 'processing',
    'IPS disbursement initiated',
    auth.uid()::text,
    jsonb_build_object('ips_transaction_id', v_ips_txn_id, 'payee_vpa', p_payee_vpa)
  );
  
  -- Return data for edge function to process
  RETURN jsonb_build_object(
    'success', true,
    'ips_transaction_id', v_ips_txn_id,
    'msg_id', v_msg_id,
    'txn_id', v_txn_id,
    'amount', v_disbursement.amount,
    'currency', 'NAD',
    'payer_vpa', 'disbursements@namlend',
    'payee_vpa', p_payee_vpa,
    'payee_name', COALESCE(v_profile.first_name || ' ' || v_profile.last_name, 'Customer'),
    'loan_id', v_disbursement.loan_id,
    'disbursement_id', p_disbursement_id
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Initiate IPS Repayment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION initiate_ips_repayment(
  p_loan_id UUID,
  p_amount DECIMAL(15,2),
  p_payer_vpa VARCHAR(100),
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
  v_profile RECORD;
  v_ips_txn_id UUID;
  v_payment_id UUID;
  v_msg_id VARCHAR(50);
  v_txn_id VARCHAR(50);
  v_outstanding DECIMAL(15,2);
BEGIN
  -- Get loan with balance info
  SELECT l.*, 
         COALESCE(l.outstanding_balance, l.total_repayment - COALESCE(l.total_paid, 0)) as calc_outstanding
  INTO v_loan
  FROM loans l
  WHERE l.id = p_loan_id
  AND l.status IN ('disbursed', 'active');
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LOAN_NOT_FOUND',
      'message', 'Loan not found or not in active status'
    );
  END IF;
  
  -- Check user owns this loan or is admin
  IF v_loan.user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer', 'collections_agent')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED',
        'message', 'You do not have permission to make payments on this loan'
      );
    END IF;
  END IF;
  
  -- Calculate outstanding balance
  v_outstanding := COALESCE(v_loan.outstanding_balance, v_loan.calc_outstanding);
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_AMOUNT',
      'message', 'Payment amount must be greater than zero'
    );
  END IF;
  
  IF p_amount > v_outstanding THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'AMOUNT_EXCEEDS_BALANCE',
      'message', 'Payment amount exceeds outstanding balance of ' || v_outstanding::text
    );
  END IF;
  
  -- Get payer profile
  SELECT first_name, last_name INTO v_profile
  FROM profiles
  WHERE user_id = v_loan.user_id;
  
  -- Generate IPS identifiers
  v_msg_id := generate_ips_msg_id();
  v_txn_id := generate_ips_txn_id();
  
  -- Create payment record (pending)
  INSERT INTO payments (
    loan_id,
    amount,
    payment_method,
    status,
    reference_number,
    payer_vpa,
    payment_notes
  ) VALUES (
    p_loan_id,
    p_amount,
    'ips',
    'pending',
    v_txn_id,
    p_payer_vpa,
    COALESCE(p_note, 'IPS payment')
  )
  RETURNING id INTO v_payment_id;
  
  -- Create IPS transaction record
  INSERT INTO ips_transactions (
    loan_id,
    payment_id,
    msg_id,
    txn_id,
    transaction_type,
    ips_txn_type,
    amount,
    currency,
    payer_vpa,
    payer_name,
    payee_vpa,
    payee_name,
    status,
    purpose_code,
    initiation_mode,
    channel,
    note,
    created_by
  ) VALUES (
    p_loan_id,
    v_payment_id,
    v_msg_id,
    v_txn_id,
    'REPAYMENT',
    'PAY',
    p_amount,
    'NAD',
    p_payer_vpa,
    COALESCE(v_profile.first_name || ' ' || v_profile.last_name, 'Customer'),
    'collections@namlend',  -- NamLend's collections VPA
    'NamLend Trust',
    'initiated',
    'PERS',
    'MOBILE_APP',
    'MOBILE',
    COALESCE(p_note, 'Loan repayment'),
    auth.uid()
  )
  RETURNING id INTO v_ips_txn_id;
  
  -- Link payment to IPS transaction
  UPDATE payments 
  SET ips_transaction_id = v_ips_txn_id
  WHERE id = v_payment_id;
  
  -- Log audit
  INSERT INTO audit_logs (
    user_id, action, table_name, record_id, new_values
  ) VALUES (
    auth.uid(),
    'IPS_REPAYMENT_INITIATED',
    'payments',
    v_payment_id,
    jsonb_build_object(
      'amount', p_amount,
      'payer_vpa', p_payer_vpa,
      'ips_transaction_id', v_ips_txn_id
    )
  );
  
  -- Return data for edge function
  RETURN jsonb_build_object(
    'success', true,
    'ips_transaction_id', v_ips_txn_id,
    'payment_id', v_payment_id,
    'msg_id', v_msg_id,
    'txn_id', v_txn_id,
    'amount', p_amount,
    'currency', 'NAD',
    'payer_vpa', p_payer_vpa,
    'payer_name', COALESCE(v_profile.first_name || ' ' || v_profile.last_name, 'Customer'),
    'payee_vpa', 'collections@namlend',
    'loan_id', p_loan_id,
    'outstanding_after', v_outstanding - p_amount
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Complete IPS Transaction (called by webhook/adapter)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_ips_transaction(
  p_ips_txn_id UUID,
  p_ips_result VARCHAR(20),
  p_ips_error_code VARCHAR(10) DEFAULT NULL,
  p_ips_txn_id_response VARCHAR(50) DEFAULT NULL,
  p_ips_rrn VARCHAR(30) DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn RECORD;
  v_new_status VARCHAR(20);
  v_internal_error VARCHAR(50);
  v_error_retryable BOOLEAN;
BEGIN
  -- Get transaction
  SELECT * INTO v_txn 
  FROM ips_transactions 
  WHERE id = p_ips_txn_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TXN_NOT_FOUND',
      'message', 'IPS transaction not found'
    );
  END IF;
  
  -- Don't update already completed transactions
  IF v_txn.status IN ('success', 'failed', 'reversed') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_COMPLETED',
      'message', 'Transaction already in final state: ' || v_txn.status,
      'current_status', v_txn.status
    );
  END IF;
  
  -- Map IPS result to internal status
  v_new_status := CASE p_ips_result
    WHEN 'SUCCESS' THEN 'success'
    WHEN 'FAILURE' THEN 'failed'
    WHEN 'DEEMED' THEN 'deemed'
    WHEN 'PENDING' THEN 'pending'
    WHEN 'PARTIAL' THEN 'success'  -- Treat partial as success, handle separately if needed
    ELSE 'unknown'
  END;
  
  -- Get internal error code and retryable flag
  SELECT internal_code, is_retryable 
  INTO v_internal_error, v_error_retryable
  FROM ips_error_codes 
  WHERE code = p_ips_error_code;
  
  -- Update IPS transaction
  UPDATE ips_transactions SET
    status = v_new_status,
    ips_result = p_ips_result,
    ips_error_code = p_ips_error_code,
    ips_error_message = p_error_message,
    ips_txn_id = COALESCE(p_ips_txn_id_response, ips_txn_id),
    ips_rrn = COALESCE(p_ips_rrn, ips_rrn),
    internal_error_code = v_internal_error,
    response_received_at = NOW(),
    completed_at = CASE WHEN v_new_status IN ('success', 'failed', 'deemed') THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_ips_txn_id;
  
  -- Update linked entity based on transaction type
  IF v_txn.transaction_type = 'DISBURSEMENT' AND v_txn.disbursement_id IS NOT NULL THEN
    IF v_new_status = 'success' OR v_new_status = 'deemed' THEN
      -- Mark disbursement completed
      UPDATE disbursements SET 
        status = 'completed',
        processed_at = NOW(),
        payment_reference = COALESCE(p_ips_rrn, p_ips_txn_id_response, v_txn.txn_id),
        updated_at = NOW()
      WHERE id = v_txn.disbursement_id;
      
      -- Update loan status to disbursed
      UPDATE loans SET 
        status = 'disbursed',
        disbursed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_txn.loan_id 
      AND status = 'approved';
      
      -- Log state transition
      INSERT INTO state_transitions (
        entity_type, entity_id, from_state, to_state,
        transition_reason, triggered_by, metadata
      ) VALUES (
        'disbursement', v_txn.disbursement_id, 'processing', 'completed',
        'IPS payment successful',
        'system',
        jsonb_build_object('ips_result', p_ips_result, 'ips_rrn', p_ips_rrn)
      );
      
    ELSIF v_new_status = 'failed' THEN
      UPDATE disbursements SET 
        status = 'failed',
        processing_notes = COALESCE(p_error_message, 'IPS payment failed: ' || COALESCE(p_ips_error_code, 'unknown')),
        updated_at = NOW()
      WHERE id = v_txn.disbursement_id;
      
      INSERT INTO state_transitions (
        entity_type, entity_id, from_state, to_state,
        transition_reason, triggered_by, metadata
      ) VALUES (
        'disbursement', v_txn.disbursement_id, 'processing', 'failed',
        'IPS payment failed: ' || COALESCE(p_ips_error_code, 'unknown'),
        'system',
        jsonb_build_object('ips_result', p_ips_result, 'error_code', p_ips_error_code)
      );
    END IF;
    
  ELSIF v_txn.transaction_type = 'REPAYMENT' AND v_txn.payment_id IS NOT NULL THEN
    IF v_new_status = 'success' OR v_new_status = 'deemed' THEN
      -- Complete payment
      UPDATE payments SET 
        status = 'completed',
        paid_at = NOW(),
        reference_number = COALESCE(p_ips_rrn, p_ips_txn_id_response, reference_number)
      WHERE id = v_txn.payment_id;
      
      -- Apply payment to loan schedule (uses existing function if available)
      BEGIN
        PERFORM apply_payment_to_schedule(v_txn.payment_id);
      EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, update loan balance manually
        UPDATE loans SET
          total_paid = COALESCE(total_paid, 0) + v_txn.amount,
          outstanding_balance = COALESCE(outstanding_balance, total_repayment) - v_txn.amount,
          updated_at = NOW()
        WHERE id = v_txn.loan_id;
        
        -- Check if loan is fully paid
        UPDATE loans SET
          status = 'settled',
          settled_at = NOW()
        WHERE id = v_txn.loan_id
        AND outstanding_balance <= 0;
      END;
      
      -- Log audit
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id, new_values
      ) VALUES (
        v_txn.created_by,
        'IPS_PAYMENT_COMPLETED',
        'payments',
        v_txn.payment_id,
        jsonb_build_object(
          'amount', v_txn.amount,
          'ips_rrn', p_ips_rrn,
          'loan_id', v_txn.loan_id
        )
      );
      
    ELSIF v_new_status = 'failed' THEN
      UPDATE payments SET 
        status = 'failed',
        payment_notes = COALESCE(payment_notes || ' | ', '') || 
                       'IPS failed: ' || COALESCE(p_ips_error_code, 'unknown')
      WHERE id = v_txn.payment_id;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'transaction_type', v_txn.transaction_type,
    'ips_result', p_ips_result,
    'error_code', p_ips_error_code,
    'is_retryable', COALESCE(v_error_retryable, false),
    'linked_entity', CASE 
      WHEN v_txn.disbursement_id IS NOT NULL THEN 'disbursement'
      WHEN v_txn.payment_id IS NOT NULL THEN 'payment'
      ELSE NULL
    END,
    'linked_entity_id', COALESCE(v_txn.disbursement_id, v_txn.payment_id)
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Check IPS Transaction Status (for polling)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_ips_transaction_status(p_ips_txn_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_txn RECORD;
  v_error_message TEXT;
BEGIN
  SELECT t.*, e.user_message, e.is_retryable
  INTO v_txn
  FROM ips_transactions t
  LEFT JOIN ips_error_codes e ON e.code = t.ips_error_code
  WHERE t.id = p_ips_txn_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_FOUND'
    );
  END IF;
  
  -- Check user has access
  IF v_txn.created_by != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer', 'collections_agent')
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM loans WHERE id = v_txn.loan_id AND user_id = auth.uid()
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'UNAUTHORIZED'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'id', v_txn.id,
    'status', v_txn.status,
    'ips_result', v_txn.ips_result,
    'amount', v_txn.amount,
    'currency', v_txn.currency,
    'transaction_type', v_txn.transaction_type,
    'payer_vpa', v_txn.payer_vpa,
    'payee_vpa', v_txn.payee_vpa,
    'ips_rrn', v_txn.ips_rrn,
    'error_code', v_txn.ips_error_code,
    'error_message', v_txn.user_message,
    'is_retryable', COALESCE(v_txn.is_retryable, false),
    'initiated_at', v_txn.initiated_at,
    'completed_at', v_txn.completed_at,
    'loan_id', v_txn.loan_id,
    'disbursement_id', v_txn.disbursement_id,
    'payment_id', v_txn.payment_id
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Get User's VPAs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_vpas(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user UUID;
  v_vpas JSONB;
BEGIN
  -- Determine target user
  v_target_user := COALESCE(p_user_id, auth.uid());
  
  -- Check access if querying another user
  IF v_target_user != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'UNAUTHORIZED'
      );
    END IF;
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'vpa_address', vpa_address,
      'vpa_type', vpa_type,
      'provider_name', provider_name,
      'account_masked', account_masked,
      'account_holder_name', account_holder_name,
      'is_validated', is_validated,
      'is_default', is_default,
      'display_name', display_name,
      'created_at', created_at
    )
    ORDER BY is_default DESC, created_at DESC
  )
  INTO v_vpas
  FROM ips_vpa_registry
  WHERE user_id = v_target_user
  AND is_active = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'vpas', COALESCE(v_vpas, '[]'::jsonb)
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Add/Update User VPA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_user_vpa(
  p_vpa_address VARCHAR(100),
  p_vpa_type VARCHAR(20) DEFAULT 'HANDLE',
  p_display_name VARCHAR(100) DEFAULT NULL,
  p_set_default BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vpa_id UUID;
  v_provider VARCHAR(30);
BEGIN
  -- Extract provider from VPA (part after @)
  v_provider := split_part(p_vpa_address, '@', 2);
  
  IF v_provider = '' OR v_provider IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_VPA_FORMAT',
      'message', 'VPA must be in format: username@provider'
    );
  END IF;
  
  -- Upsert VPA
  INSERT INTO ips_vpa_registry (
    user_id,
    vpa_address,
    vpa_type,
    provider_code,
    display_name,
    is_default
  ) VALUES (
    auth.uid(),
    lower(trim(p_vpa_address)),
    p_vpa_type,
    v_provider,
    p_display_name,
    p_set_default
  )
  ON CONFLICT (user_id, vpa_address) DO UPDATE SET
    vpa_type = EXCLUDED.vpa_type,
    display_name = COALESCE(EXCLUDED.display_name, ips_vpa_registry.display_name),
    is_default = CASE WHEN p_set_default THEN true ELSE ips_vpa_registry.is_default END,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_vpa_id;
  
  -- If setting as default, unset others
  IF p_set_default THEN
    UPDATE ips_vpa_registry
    SET is_default = false, updated_at = NOW()
    WHERE user_id = auth.uid()
    AND id != v_vpa_id
    AND is_default = true;
  END IF;
  
  -- Also update profile default_vpa if setting default
  IF p_set_default THEN
    UPDATE profiles
    SET default_vpa = lower(trim(p_vpa_address)), updated_at = NOW()
    WHERE user_id = auth.uid();
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'vpa_id', v_vpa_id,
    'vpa_address', lower(trim(p_vpa_address)),
    'is_default', p_set_default
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Get IPS Transactions for Loan
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_loan_ips_transactions(p_loan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan RECORD;
  v_transactions JSONB;
BEGIN
  -- Get loan and check access
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOAN_NOT_FOUND');
  END IF;
  
  IF v_loan.user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'loan_officer', 'collections_agent')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;
  END IF;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'transaction_type', t.transaction_type,
      'status', t.status,
      'amount', t.amount,
      'payer_vpa', t.payer_vpa,
      'payee_vpa', t.payee_vpa,
      'ips_result', t.ips_result,
      'ips_rrn', t.ips_rrn,
      'error_message', e.user_message,
      'initiated_at', t.initiated_at,
      'completed_at', t.completed_at
    )
    ORDER BY t.created_at DESC
  )
  INTO v_transactions
  FROM ips_transactions t
  LEFT JOIN ips_error_codes e ON e.code = t.ips_error_code
  WHERE t.loan_id = p_loan_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'loan_id', p_loan_id,
    'transactions', COALESCE(v_transactions, '[]'::jsonb)
  );
END;
$$;


-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ips_transactions_updated
  BEFORE UPDATE ON ips_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_ips_updated_at();

CREATE TRIGGER trg_ips_vpa_registry_updated
  BEFORE UPDATE ON ips_vpa_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_ips_updated_at();


-- ============================================================================
-- 10. GRANTS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION generate_ips_msg_id() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_ips_txn_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ips_error_message(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION is_ips_error_retryable(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION initiate_ips_disbursement(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION initiate_ips_repayment(UUID, DECIMAL, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ips_transaction(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_ips_transaction_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vpas(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_vpa(VARCHAR, VARCHAR, VARCHAR, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_loan_ips_transactions(UUID) TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
