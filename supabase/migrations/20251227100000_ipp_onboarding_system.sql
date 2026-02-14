-- ============================================================================
-- IPP/IPN Customer & Merchant Onboarding System
-- Version: 1.0.0
-- Created: December 27, 2025
-- Description: Complete IPP onboarding infrastructure for NamLend Trust
-- Reference: IPP_ONBOARDING_NAMLEND_COMPLETE_HANDOVER.md
-- ============================================================================

-- ============================================================================
-- 1. IPP ONBOARDING STATE MACHINE
-- ============================================================================

-- Customer onboarding states (as per FSD user registration flow)
CREATE TYPE ipp_onboarding_state AS ENUM (
  'NOT_STARTED',
  'DEVICE_BINDING_REQUIRED',
  'DEVICE_BOUND',
  'SOV_SELECTION_PENDING',
  'SOV_SELECTED',
  'ACCOUNTS_LISTED',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'IPS_PIN_SETTING',
  'IPS_PIN_SET',
  'ALIAS_REGISTRATION_PENDING',
  'ALIAS_REGISTERED',
  'READY_FOR_IPP_PAYMENTS',
  'SUSPENDED',
  'DEREGISTERED'
);

-- Merchant onboarding states
CREATE TYPE ipp_merchant_state AS ENUM (
  'MERCHANT_KYC_PENDING',
  'MERCHANT_KYC_APPROVED',
  'MERCHANT_ALIAS_PENDING',
  'MERCHANT_ALIAS_CREATED',
  'MERCHANT_ID_PENDING',
  'MERCHANT_ID_ASSIGNED',
  'MERCHANT_DIRECTORY_PENDING',
  'MERCHANT_DIRECTORY_REGISTERED',
  'QR_GENERATION_PENDING',
  'QR_READY',
  'MERCHANT_LIVE',
  'MERCHANT_SUSPENDED',
  'MERCHANT_DEREGISTERED'
);

-- Alias ID type (per XSD regIdDetailsTagNameType)
CREATE TYPE ipp_alias_id_type AS ENUM (
  'MOBILE',
  'NUMERICID'
);

-- Alias status (per XSD regIdStatusType)
CREATE TYPE ipp_alias_status AS ENUM (
  'NEW',
  'ACTIVE',
  'INACTIVE',
  'BLOCKED',
  'DEREGISTER',
  'PORTED'
);


-- ============================================================================
-- 2. IPS DEVICE BINDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_device_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Device identification
  device_fingerprint TEXT NOT NULL,
  device_model VARCHAR(100),
  device_os VARCHAR(50),
  device_os_version VARCHAR(20),
  app_version VARCHAR(20),
  
  -- Binding details
  binding_token TEXT,
  mobile_number VARCHAR(20) NOT NULL,
  sim_serial VARCHAR(50),
  imei VARCHAR(50),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  bound_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Binding history
  previous_binding_id UUID REFERENCES ips_device_bindings(id),
  unbind_reason TEXT,
  unbound_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ips_device_binding_status CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'replaced'))
);

-- Partial unique index (one active device per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ips_device_one_active_per_user 
  ON ips_device_bindings(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ips_device_bindings_user ON ips_device_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_ips_device_bindings_mobile ON ips_device_bindings(mobile_number);
CREATE INDEX IF NOT EXISTS idx_ips_device_bindings_active ON ips_device_bindings(user_id) WHERE status = 'active';

COMMENT ON TABLE ips_device_bindings IS 'Device binding records for IPP/IPS mobile registration per FSD requirements';


-- ============================================================================
-- 3. IPS ONBOARDING TABLE (Customer State Machine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Current state
  state ipp_onboarding_state NOT NULL DEFAULT 'NOT_STARTED',
  
  -- Device binding reference
  device_binding_id UUID REFERENCES ips_device_bindings(id),
  
  -- SoV (Store of Value) provider selection
  sov_provider_code VARCHAR(30),
  sov_provider_name VARCHAR(100),
  sov_provider_handle VARCHAR(50),
  
  -- Selected account from SoV
  selected_account_ref VARCHAR(100),
  selected_account_masked VARCHAR(50),
  selected_account_type VARCHAR(20),
  selected_account_ifsc VARCHAR(20),
  
  -- User's full-form alias (e.g., jane123@fnb)
  long_alias VARCHAR(100),
  short_alias_mobile VARCHAR(20),
  numeric_id VARCHAR(20),
  
  -- Registration status
  mobile_id_status ipp_alias_status,
  numeric_id_status ipp_alias_status,
  alias_expiry_ts TIMESTAMPTZ,
  
  -- IPS PIN status (never store actual PIN)
  ips_pin_set BOOLEAN DEFAULT FALSE,
  ips_pin_set_at TIMESTAMPTZ,
  ips_pin_attempts INTEGER DEFAULT 0,
  ips_pin_locked_until TIMESTAMPTZ,
  
  -- Verification details
  verification_method VARCHAR(30),
  verified_at TIMESTAMPTZ,
  verification_reference VARCHAR(100),
  
  -- CM ID from alias directory (after RegMapper)
  cm_id VARCHAR(50),
  
  -- Metadata
  last_step_completed VARCHAR(50),
  last_error_code VARCHAR(20),
  last_error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ips_onboarding_state ON ips_onboarding(state);
CREATE INDEX IF NOT EXISTS idx_ips_onboarding_alias ON ips_onboarding(long_alias) WHERE long_alias IS NOT NULL;

COMMENT ON TABLE ips_onboarding IS 'Customer IPP onboarding state machine tracking per FSD user registration flow';


-- ============================================================================
-- 4. IPS ALIAS DIRECTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_alias_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner (user or merchant)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  merchant_id UUID, -- Will reference ips_merchants after that table is created
  
  -- Alias details (per XSD regIdDetailsType)
  addr VARCHAR(100) NOT NULL, -- Full-form alias (e.g., jane123@fnb)
  entity_type VARCHAR(10) NOT NULL DEFAULT 'PERSON', -- PERSON or ENTITY
  
  -- ID entries (can have multiple per alias: MOBILE + NUMERICID)
  id_type ipp_alias_id_type NOT NULL,
  id_value VARCHAR(50) NOT NULL,
  
  -- Status
  status ipp_alias_status NOT NULL DEFAULT 'NEW',
  set_status VARCHAR(20), -- For modification operations: ACTIVE, INACTIVE, BLOCK, etc.
  
  -- Timestamps from directory
  expiry_ts TIMESTAMPTZ NOT NULL,
  last_updated_ts TIMESTAMPTZ,
  
  -- CM ID from IPS (central mapping ID)
  cm_id VARCHAR(50),
  
  -- Channel used for registration
  channel VARCHAR(20) DEFAULT 'Mobile',
  
  -- Sync status with IPS
  synced_with_ips BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ips_alias_valid_entity CHECK (entity_type IN ('PERSON', 'ENTITY')),
  CONSTRAINT ips_alias_unique_id UNIQUE (id_type, id_value)
);

CREATE INDEX IF NOT EXISTS idx_ips_alias_user ON ips_alias_directory(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_alias_merchant ON ips_alias_directory(merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_alias_addr ON ips_alias_directory(addr);
CREATE INDEX IF NOT EXISTS idx_ips_alias_status ON ips_alias_directory(status);

COMMENT ON TABLE ips_alias_directory IS 'Local cache of IPS Alias Directory entries for users and merchants';


-- ============================================================================
-- 5. IPS MERCHANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to NamLend entities (could be a business borrower or BNPL merchant)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name VARCHAR(255) NOT NULL,
  
  -- Merchant identification
  merchant_code VARCHAR(20), -- Participant-assigned code
  merchant_numeric_id VARCHAR(8), -- ≤8 digit unique ID (per FSD rules)
  merchant_alias VARCHAR(100), -- Full-form alias (e.g., merchant123@namlend)
  
  -- Settlement account
  settlement_account_ref VARCHAR(100),
  settlement_account_masked VARCHAR(50),
  settlement_ifsc VARCHAR(20),
  settlement_vpa VARCHAR(100),
  
  -- Onboarding state
  state ipp_merchant_state NOT NULL DEFAULT 'MERCHANT_KYC_PENDING',
  
  -- KYC details
  kyc_status VARCHAR(20) DEFAULT 'pending',
  kyc_approved_at TIMESTAMPTZ,
  kyc_approved_by UUID REFERENCES auth.users(id),
  kyc_rejection_reason TEXT,
  
  -- Category
  merchant_category_code VARCHAR(10), -- MCC
  merchant_type VARCHAR(30), -- SME, MSME, LARGE, SOLE_TRADER
  
  -- QR details
  static_qr_payload TEXT,
  dynamic_qr_enabled BOOLEAN DEFAULT FALSE,
  qr_generated_at TIMESTAMPTZ,
  
  -- VAE (Verified Address Entry) for anti-spoofing
  vae_registered BOOLEAN DEFAULT FALSE,
  vae_entry_id UUID,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  
  -- Metadata
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  physical_address TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT ips_merchant_valid_numeric_id CHECK (
    merchant_numeric_id IS NULL OR (
      length(merchant_numeric_id) <= 8 AND
      merchant_numeric_id ~ '^[0-9]+$' AND
      merchant_numeric_id !~ '^(.)\1+$' -- Not all same digit
    )
  ),
  CONSTRAINT ips_merchant_unique_numeric_id UNIQUE (merchant_numeric_id),
  CONSTRAINT ips_merchant_unique_alias UNIQUE (merchant_alias)
);

CREATE INDEX IF NOT EXISTS idx_ips_merchants_user ON ips_merchants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ips_merchants_state ON ips_merchants(state);
CREATE INDEX IF NOT EXISTS idx_ips_merchants_active ON ips_merchants(is_active) WHERE is_active = TRUE;

-- Add FK from alias_directory to merchants
ALTER TABLE ips_alias_directory 
  ADD CONSTRAINT fk_alias_merchant 
  FOREIGN KEY (merchant_id) REFERENCES ips_merchants(id) ON DELETE SET NULL;

COMMENT ON TABLE ips_merchants IS 'Merchant registration and onboarding for IPP/IPS P2M payments';


-- ============================================================================
-- 6. IPS VAE ENTRIES TABLE (Verified Address Entries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_vae_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to merchant
  merchant_id UUID REFERENCES ips_merchants(id) ON DELETE CASCADE,
  
  -- VAE details (per XSD VaeType)
  addr VARCHAR(100) NOT NULL, -- Merchant alias
  name VARCHAR(255) NOT NULL, -- Display name
  logo_url TEXT,
  website_url TEXT,
  
  -- Key for verification (public key reference)
  key_ref TEXT,
  
  -- Operation tracking
  seq_num INTEGER NOT NULL DEFAULT 1,
  operation VARCHAR(20) NOT NULL DEFAULT 'CREATE', -- CREATE, UPDATE, DELETE
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Sync with IPS
  synced_with_ips BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ips_vae_valid_operation CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
  CONSTRAINT ips_vae_valid_status CHECK (status IN ('pending', 'active', 'rejected', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_ips_vae_merchant ON ips_vae_entries(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ips_vae_addr ON ips_vae_entries(addr);

COMMENT ON TABLE ips_vae_entries IS 'Verified Address Entries for merchant anti-spoofing per IPS scheme';


-- ============================================================================
-- 7. IPS KEYS CACHE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_keys_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key identification
  org_id VARCHAR(50) NOT NULL, -- Organization ID (PSP/bank)
  key_id VARCHAR(50) NOT NULL, -- ki attribute from XSD
  key_type VARCHAR(20) NOT NULL DEFAULT 'encryption', -- encryption, signing
  
  -- Key data
  public_key TEXT NOT NULL,
  key_algorithm VARCHAR(20) DEFAULT 'RSA',
  key_size INTEGER DEFAULT 2048,
  
  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Fetch tracking
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'ReqListKeys',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ips_keys_valid_type CHECK (key_type IN ('encryption', 'signing', 'both')),
  CONSTRAINT ips_keys_unique_per_org UNIQUE (org_id, key_id)
);

CREATE INDEX IF NOT EXISTS idx_ips_keys_org ON ips_keys_cache(org_id);
CREATE INDEX IF NOT EXISTS idx_ips_keys_active ON ips_keys_cache(org_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE ips_keys_cache IS 'Cached public keys from IPS participants for credential encryption';


-- ============================================================================
-- 8. IPS SOV PROVIDERS CACHE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_sov_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identification
  provider_code VARCHAR(30) NOT NULL UNIQUE,
  provider_name VARCHAR(100) NOT NULL,
  provider_handle VARCHAR(50), -- Handle suffix for VPAs (e.g., @fnb)
  
  -- Capabilities
  supports_debit_card BOOLEAN DEFAULT TRUE,
  supports_wallet_pin BOOLEAN DEFAULT TRUE,
  supports_aadhaar BOOLEAN DEFAULT FALSE,
  supports_collect BOOLEAN DEFAULT TRUE,
  
  -- Version info (from RespListAccPvd)
  api_version VARCHAR(10),
  min_app_version VARCHAR(20),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT,
  
  -- Fetch tracking
  last_fetched_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ips_sov_active ON ips_sov_providers(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE ips_sov_providers IS 'Cached list of SoV (Store of Value) providers from IPS';

-- Seed common Namibian providers (placeholders - update with actual codes)
INSERT INTO ips_sov_providers (provider_code, provider_name, provider_handle) VALUES
  ('FNB', 'First National Bank Namibia', 'fnb'),
  ('SBN', 'Standard Bank Namibia', 'sbn'),
  ('NED', 'Nedbank Namibia', 'nedbank'),
  ('BOW', 'Bank Windhoek', 'bankwindhoek'),
  ('NAMPOST', 'NamPost Savings Bank', 'nampost'),
  ('MTC', 'MTC Mobile Money', 'mtc'),
  ('TN', 'TN Mobile Money', 'tn')
ON CONFLICT (provider_code) DO NOTHING;


-- ============================================================================
-- 9. ONBOARDING HISTORY TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_onboarding_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  onboarding_id UUID NOT NULL REFERENCES ips_onboarding(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- State change
  from_state ipp_onboarding_state,
  to_state ipp_onboarding_state NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  
  -- Details
  success BOOLEAN NOT NULL,
  error_code VARCHAR(20),
  error_message TEXT,
  
  -- IPS interaction details
  msg_id VARCHAR(50),
  txn_id VARCHAR(50),
  ips_response_code VARCHAR(10),
  
  -- Metadata
  metadata JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Triggered by
  triggered_by UUID REFERENCES auth.users(id), -- NULL = system/auto
  trigger_source VARCHAR(30) DEFAULT 'user', -- user, admin, system, webhook
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ips_onboarding_history_onboarding ON ips_onboarding_history(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_ips_onboarding_history_user ON ips_onboarding_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ips_onboarding_history_step ON ips_onboarding_history(step_name);

COMMENT ON TABLE ips_onboarding_history IS 'Audit trail for all IPP onboarding state transitions and IPS interactions';


-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE ips_device_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_alias_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_vae_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_keys_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_sov_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ips_onboarding_history ENABLE ROW LEVEL SECURITY;

-- ips_device_bindings: Users see their own, admins see all
CREATE POLICY "Users can view their own device bindings"
  ON ips_device_bindings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own device bindings"
  ON ips_device_bindings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own device bindings"
  ON ips_device_bindings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all device bindings"
  ON ips_device_bindings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
  );

-- ips_onboarding: Users see their own, admins see all
CREATE POLICY "Users can view their own onboarding"
  ON ips_onboarding FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own onboarding"
  ON ips_onboarding FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding"
  ON ips_onboarding FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all onboarding records"
  ON ips_onboarding FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
  );

CREATE POLICY "Admins can update any onboarding"
  ON ips_onboarding FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ips_alias_directory: Users see their own, admins see all
CREATE POLICY "Users can view their own aliases"
  ON ips_alias_directory FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all aliases"
  ON ips_alias_directory FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
  );

CREATE POLICY "System can manage aliases"
  ON ips_alias_directory FOR ALL
  USING (true)
  WITH CHECK (true);

-- ips_merchants: Admins only for management
CREATE POLICY "Admins can view merchants"
  ON ips_merchants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
  );

CREATE POLICY "Admins can manage merchants"
  ON ips_merchants FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ips_vae_entries: Admins only
CREATE POLICY "Admins can manage VAE entries"
  ON ips_vae_entries FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ips_keys_cache: Read by authenticated, write by system
CREATE POLICY "Authenticated can read keys"
  ON ips_keys_cache FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage keys"
  ON ips_keys_cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- ips_sov_providers: Public read
CREATE POLICY "Anyone can read SoV providers"
  ON ips_sov_providers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SoV providers"
  ON ips_sov_providers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ips_onboarding_history: Users see their own, admins see all
CREATE POLICY "Users can view their own onboarding history"
  ON ips_onboarding_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all onboarding history"
  ON ips_onboarding_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
  );


-- ============================================================================
-- 11. RPC FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Get or Create Onboarding Record
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_or_create_ips_onboarding(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user UUID;
  v_onboarding RECORD;
  v_profile RECORD;
BEGIN
  v_target_user := COALESCE(p_user_id, auth.uid());
  
  -- Check authorization for viewing other users
  IF v_target_user != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;
  END IF;
  
  -- Get or create onboarding record
  INSERT INTO ips_onboarding (user_id, state, started_at)
  VALUES (v_target_user, 'NOT_STARTED', NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Fetch the record
  SELECT o.*, p.phone, p.first_name, p.last_name, p.default_vpa
  INTO v_onboarding
  FROM ips_onboarding o
  LEFT JOIN profiles p ON p.user_id = o.user_id
  WHERE o.user_id = v_target_user;
  
  RETURN jsonb_build_object(
    'success', true,
    'onboarding', jsonb_build_object(
      'id', v_onboarding.id,
      'user_id', v_onboarding.user_id,
      'state', v_onboarding.state,
      'sov_provider_code', v_onboarding.sov_provider_code,
      'sov_provider_name', v_onboarding.sov_provider_name,
      'selected_account_masked', v_onboarding.selected_account_masked,
      'long_alias', v_onboarding.long_alias,
      'short_alias_mobile', v_onboarding.short_alias_mobile,
      'mobile_id_status', v_onboarding.mobile_id_status,
      'ips_pin_set', v_onboarding.ips_pin_set,
      'last_step_completed', v_onboarding.last_step_completed,
      'last_error_code', v_onboarding.last_error_code,
      'last_error_message', v_onboarding.last_error_message,
      'started_at', v_onboarding.started_at,
      'completed_at', v_onboarding.completed_at
    ),
    'profile', jsonb_build_object(
      'phone', v_onboarding.phone,
      'first_name', v_onboarding.first_name,
      'last_name', v_onboarding.last_name,
      'default_vpa', v_onboarding.default_vpa
    )
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Advance Onboarding Step
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_ips_onboarding_step(
  p_user_id UUID,
  p_step_name VARCHAR(50),
  p_step_data JSONB DEFAULT '{}'::jsonb,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_code VARCHAR(20) DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding RECORD;
  v_new_state ipp_onboarding_state;
  v_history_id UUID;
  v_started_at TIMESTAMPTZ := NOW();
BEGIN
  -- Get current onboarding state
  SELECT * INTO v_onboarding
  FROM ips_onboarding
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ONBOARDING_NOT_FOUND');
  END IF;
  
  -- Check authorization (admin or self)
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;
  END IF;
  
  -- Determine new state based on step
  IF p_success THEN
    v_new_state := CASE p_step_name
      WHEN 'device_binding' THEN 'DEVICE_BOUND'::ipp_onboarding_state
      WHEN 'sov_selection' THEN 'SOV_SELECTED'::ipp_onboarding_state
      WHEN 'list_accounts' THEN 'ACCOUNTS_LISTED'::ipp_onboarding_state
      WHEN 'verification' THEN 'VERIFIED'::ipp_onboarding_state
      WHEN 'set_ips_pin' THEN 'IPS_PIN_SET'::ipp_onboarding_state
      WHEN 'register_alias' THEN 'ALIAS_REGISTERED'::ipp_onboarding_state
      WHEN 'complete' THEN 'READY_FOR_IPP_PAYMENTS'::ipp_onboarding_state
      ELSE v_onboarding.state
    END;
  ELSE
    -- On failure, don't change state but record the error
    v_new_state := v_onboarding.state;
  END IF;
  
  -- Update onboarding record
  UPDATE ips_onboarding SET
    state = v_new_state,
    -- Update specific fields based on step
    sov_provider_code = COALESCE((p_step_data->>'sov_provider_code')::varchar, sov_provider_code),
    sov_provider_name = COALESCE((p_step_data->>'sov_provider_name')::varchar, sov_provider_name),
    selected_account_ref = COALESCE((p_step_data->>'selected_account_ref')::varchar, selected_account_ref),
    selected_account_masked = COALESCE((p_step_data->>'selected_account_masked')::varchar, selected_account_masked),
    long_alias = COALESCE((p_step_data->>'long_alias')::varchar, long_alias),
    short_alias_mobile = COALESCE((p_step_data->>'short_alias_mobile')::varchar, short_alias_mobile),
    numeric_id = COALESCE((p_step_data->>'numeric_id')::varchar, numeric_id),
    mobile_id_status = COALESCE((p_step_data->>'mobile_id_status')::ipp_alias_status, mobile_id_status),
    ips_pin_set = CASE WHEN p_step_name = 'set_ips_pin' AND p_success THEN TRUE ELSE ips_pin_set END,
    ips_pin_set_at = CASE WHEN p_step_name = 'set_ips_pin' AND p_success THEN NOW() ELSE ips_pin_set_at END,
    cm_id = COALESCE((p_step_data->>'cm_id')::varchar, cm_id),
    last_step_completed = CASE WHEN p_success THEN p_step_name ELSE last_step_completed END,
    last_error_code = CASE WHEN NOT p_success THEN p_error_code ELSE NULL END,
    last_error_message = CASE WHEN NOT p_success THEN p_error_message ELSE NULL END,
    retry_count = CASE WHEN NOT p_success THEN retry_count + 1 ELSE 0 END,
    completed_at = CASE WHEN v_new_state = 'READY_FOR_IPP_PAYMENTS' THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Record history
  INSERT INTO ips_onboarding_history (
    onboarding_id, user_id, from_state, to_state, step_name,
    success, error_code, error_message,
    msg_id, txn_id, ips_response_code,
    metadata, started_at, completed_at, duration_ms,
    triggered_by, trigger_source
  ) VALUES (
    v_onboarding.id, p_user_id, v_onboarding.state, v_new_state, p_step_name,
    p_success, p_error_code, p_error_message,
    (p_step_data->>'msg_id')::varchar, (p_step_data->>'txn_id')::varchar, (p_step_data->>'ips_response_code')::varchar,
    p_step_data, v_started_at, NOW(), EXTRACT(EPOCH FROM (NOW() - v_started_at))::integer * 1000,
    auth.uid(), CASE WHEN p_user_id = auth.uid() THEN 'user' ELSE 'admin' END
  )
  RETURNING id INTO v_history_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_state', v_onboarding.state,
    'new_state', v_new_state,
    'step_name', p_step_name,
    'history_id', v_history_id
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Check if User is Ready for IPP Payments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_user_ipp_ready(p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user UUID;
  v_state ipp_onboarding_state;
BEGIN
  v_target_user := COALESCE(p_user_id, auth.uid());
  
  SELECT state INTO v_state
  FROM ips_onboarding
  WHERE user_id = v_target_user;
  
  RETURN v_state = 'READY_FOR_IPP_PAYMENTS';
END;
$$;


-- ----------------------------------------------------------------------------
-- Get IPP Onboarding Summary for Admin Dashboard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_ipp_onboarding_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Check admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  SELECT jsonb_build_object(
    'total_users', COUNT(*),
    'by_state', jsonb_object_agg(state, cnt),
    'ipp_ready', COUNT(*) FILTER (WHERE state = 'READY_FOR_IPP_PAYMENTS'),
    'in_progress', COUNT(*) FILTER (WHERE state NOT IN ('NOT_STARTED', 'READY_FOR_IPP_PAYMENTS', 'SUSPENDED', 'DEREGISTERED')),
    'not_started', COUNT(*) FILTER (WHERE state = 'NOT_STARTED'),
    'suspended', COUNT(*) FILTER (WHERE state = 'SUSPENDED'),
    'with_errors', COUNT(*) FILTER (WHERE last_error_code IS NOT NULL)
  )
  INTO v_stats
  FROM (
    SELECT state, COUNT(*) as cnt
    FROM ips_onboarding
    GROUP BY state
  ) sub;
  
  RETURN jsonb_build_object('success', true, 'stats', v_stats);
END;
$$;


-- ----------------------------------------------------------------------------
-- Get Users Pending IPP Onboarding (for Admin Dashboard)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_users_pending_ipp_onboarding(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_state_filter ipp_onboarding_state DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users JSONB;
  v_total INTEGER;
BEGIN
  -- Check admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM ips_onboarding o
  WHERE (p_state_filter IS NULL OR o.state = p_state_filter);
  
  -- Get users
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', o.user_id,
      'state', o.state,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'phone', p.phone,
      'email', u.email,
      'long_alias', o.long_alias,
      'ips_pin_set', o.ips_pin_set,
      'last_step_completed', o.last_step_completed,
      'last_error_code', o.last_error_code,
      'started_at', o.started_at,
      'updated_at', o.updated_at
    )
    ORDER BY o.updated_at DESC
  )
  INTO v_users
  FROM ips_onboarding o
  LEFT JOIN profiles p ON p.user_id = o.user_id
  LEFT JOIN auth.users u ON u.id = o.user_id
  WHERE (p_state_filter IS NULL OR o.state = p_state_filter)
  LIMIT p_limit
  OFFSET p_offset;
  
  RETURN jsonb_build_object(
    'success', true,
    'users', COALESCE(v_users, '[]'::jsonb),
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;


-- ----------------------------------------------------------------------------
-- Admin: Initiate IPP Onboarding for User
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_initiate_ipp_onboarding(
  p_user_id UUID,
  p_mobile_number VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_onboarding_id UUID;
BEGIN
  -- Check admin access
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  -- Verify user exists and get profile
  SELECT u.id, u.email, p.phone, p.first_name, p.last_name, p.kyc_status
  INTO v_user
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE u.id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;
  
  -- Check KYC status
  IF v_user.kyc_status IS NULL OR v_user.kyc_status NOT IN ('approved', 'verified') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'KYC_NOT_APPROVED',
      'message', 'User must complete KYC before IPP onboarding'
    );
  END IF;
  
  -- Check phone number
  IF COALESCE(p_mobile_number, v_user.phone) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PHONE_REQUIRED',
      'message', 'Mobile number is required for IPP onboarding'
    );
  END IF;
  
  -- Create or update onboarding record
  INSERT INTO ips_onboarding (user_id, state, started_at, short_alias_mobile)
  VALUES (p_user_id, 'DEVICE_BINDING_REQUIRED', NOW(), COALESCE(p_mobile_number, v_user.phone))
  ON CONFLICT (user_id) DO UPDATE SET
    state = 'DEVICE_BINDING_REQUIRED',
    started_at = COALESCE(ips_onboarding.started_at, NOW()),
    short_alias_mobile = COALESCE(EXCLUDED.short_alias_mobile, ips_onboarding.short_alias_mobile),
    last_error_code = NULL,
    last_error_message = NULL,
    updated_at = NOW()
  RETURNING id INTO v_onboarding_id;
  
  -- Log the admin action
  INSERT INTO ips_onboarding_history (
    onboarding_id, user_id, from_state, to_state, step_name,
    success, triggered_by, trigger_source, metadata
  ) VALUES (
    v_onboarding_id, p_user_id, 'NOT_STARTED', 'DEVICE_BINDING_REQUIRED', 'admin_initiate',
    true, auth.uid(), 'admin',
    jsonb_build_object('mobile_number', COALESCE(p_mobile_number, v_user.phone))
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'onboarding_id', v_onboarding_id,
    'user_id', p_user_id,
    'state', 'DEVICE_BINDING_REQUIRED',
    'message', 'IPP onboarding initiated for user'
  );
END;
$$;


-- ============================================================================
-- 12. TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_ipp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ips_device_bindings_updated
  BEFORE UPDATE ON ips_device_bindings
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();

CREATE TRIGGER trg_ips_onboarding_updated
  BEFORE UPDATE ON ips_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();

CREATE TRIGGER trg_ips_alias_directory_updated
  BEFORE UPDATE ON ips_alias_directory
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();

CREATE TRIGGER trg_ips_merchants_updated
  BEFORE UPDATE ON ips_merchants
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();

CREATE TRIGGER trg_ips_vae_entries_updated
  BEFORE UPDATE ON ips_vae_entries
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();

CREATE TRIGGER trg_ips_keys_cache_updated
  BEFORE UPDATE ON ips_keys_cache
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();

CREATE TRIGGER trg_ips_sov_providers_updated
  BEFORE UPDATE ON ips_sov_providers
  FOR EACH ROW EXECUTE FUNCTION update_ipp_updated_at();


-- ============================================================================
-- 13. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_or_create_ips_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION advance_ips_onboarding_step(UUID, VARCHAR, JSONB, BOOLEAN, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_ipp_ready(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ipp_onboarding_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_pending_ipp_onboarding(INTEGER, INTEGER, ipp_onboarding_state) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_initiate_ipp_onboarding(UUID, VARCHAR) TO authenticated;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
