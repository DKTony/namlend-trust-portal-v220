-- ============================================================================
-- SYSTEM CONFIGURATION TABLES
-- Stores configuration for TigerBeetle, Settlement, and Reconciliation
-- ============================================================================

-- Create system_configuration table for key-value configuration storage
CREATE TABLE IF NOT EXISTS system_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'tigerbeetle', 'settlement', 'reconciliation', 'ips'
    is_sensitive BOOLEAN DEFAULT FALSE,
    last_modified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_configuration(category);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_configuration(config_key);

-- Enable RLS
ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify system configuration
CREATE POLICY "Admins can view system configuration"
    ON system_configuration FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert system configuration"
    ON system_configuration FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update system configuration"
    ON system_configuration FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_modified_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_system_config_updated
    BEFORE UPDATE ON system_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_system_config_timestamp();

-- ============================================================================
-- SEED DEFAULT CONFIGURATION
-- ============================================================================

-- TigerBeetle Configuration
INSERT INTO system_configuration (config_key, config_value, description, category) VALUES
(
    'tigerbeetle.connection',
    '{
        "enabled": true,
        "cluster_id": 0,
        "replica_addresses": ["127.0.0.1:3001"],
        "connection_timeout_ms": 5000,
        "request_timeout_ms": 10000
    }'::jsonb,
    'TigerBeetle cluster connection settings',
    'tigerbeetle'
),
(
    'tigerbeetle.outbox',
    '{
        "processing_enabled": true,
        "batch_size": 100,
        "max_retries": 5,
        "retry_delay_ms": 1000,
        "processing_interval_ms": 5000,
        "dead_letter_after_retries": 10
    }'::jsonb,
    'Outbox processing configuration',
    'tigerbeetle'
),
(
    'tigerbeetle.reconciliation',
    '{
        "enabled": true,
        "schedule_cron": "0 3 * * *",
        "variance_threshold_percent": 0.01,
        "alert_on_variance": true,
        "auto_resolve_minor_discrepancies": false
    }'::jsonb,
    'Reconciliation job configuration',
    'tigerbeetle'
),
(
    'tigerbeetle.accounts',
    '{
        "ledger_id": 1,
        "asset_scale": 2,
        "auto_create_loan_accounts": true,
        "account_code_ranges": {
            "borrower": {"start": 1000, "end": 1999},
            "operational": {"start": 2000, "end": 2999},
            "ips": {"start": 3000, "end": 3999},
            "income": {"start": 5000, "end": 5999},
            "expense": {"start": 6000, "end": 6999}
        }
    }'::jsonb,
    'Account structure configuration',
    'tigerbeetle'
)
ON CONFLICT (config_key) DO NOTHING;

-- Settlement Configuration
INSERT INTO system_configuration (config_key, config_value, description, category) VALUES
(
    'settlement.general',
    '{
        "enabled": true,
        "currency": "NAD",
        "scheme_version": "1.0",
        "auto_process_on_cutoff": false,
        "require_manual_dispatch": true
    }'::jsonb,
    'General settlement settings',
    'settlement'
),
(
    'settlement.netting',
    '{
        "bilateral_netting_enabled": true,
        "include_interchange": true,
        "separate_switching_fee_batch": true,
        "minimum_net_amount": 0.01,
        "rounding_mode": "HALF_UP",
        "rounding_precision": 2
    }'::jsonb,
    'Netting calculation settings',
    'settlement'
),
(
    'settlement.pacs009',
    '{
        "schema_version": "pacs.009.001.08",
        "message_id_prefix": "NAMLEND",
        "end_to_end_id_prefix": "NET",
        "local_instrument_code": "IPS",
        "settlement_method": "INGA",
        "validate_before_dispatch": true
    }'::jsonb,
    'pacs.009 file generation settings',
    'settlement'
),
(
    'settlement.transport',
    '{
        "sftp_enabled": false,
        "sftp_host": "",
        "sftp_port": 22,
        "sftp_username": "",
        "sftp_outbound_path": "/outbound",
        "sftp_inbound_path": "/inbound",
        "file_naming_pattern": "{run_id}_{batch_type}_{timestamp}.xml",
        "retry_dispatch_on_failure": true,
        "max_dispatch_retries": 3
    }'::jsonb,
    'File transport configuration (SFTP/AXWAY)',
    'settlement'
),
(
    'settlement.acknowledgements',
    '{
        "poll_interval_ms": 30000,
        "timeout_minutes": 60,
        "auto_quarantine_on_xsys001": true,
        "notify_on_failure": true,
        "notification_emails": []
    }'::jsonb,
    'Acknowledgement handling settings',
    'settlement'
),
(
    'settlement.reports',
    '{
        "auto_generate_ntsl": true,
        "auto_generate_raw_data": true,
        "distribution_enabled": false,
        "distribution_method": "sftp",
        "archive_reports": true,
        "archive_retention_days": 2555
    }'::jsonb,
    'Report generation and distribution settings',
    'settlement'
),
(
    'settlement.exposure',
    '{
        "monitoring_enabled": true,
        "calculate_real_time": false,
        "alert_threshold_percent": 80,
        "max_exposure_per_participant": null,
        "notify_on_threshold_breach": true
    }'::jsonb,
    'Exposure monitoring settings',
    'settlement'
)
ON CONFLICT (config_key) DO NOTHING;

-- Reconciliation Configuration
INSERT INTO system_configuration (config_key, config_value, description, category) VALUES
(
    'reconciliation.general',
    '{
        "enabled": true,
        "auto_match_enabled": true,
        "match_tolerance_amount": 0.01,
        "match_tolerance_days": 3,
        "require_approval_for_manual_match": true
    }'::jsonb,
    'General reconciliation settings',
    'reconciliation'
),
(
    'reconciliation.bank_import',
    '{
        "enabled": true,
        "supported_formats": ["csv", "mt940", "camt053"],
        "auto_import_enabled": false,
        "import_schedule_cron": "0 6 * * *",
        "archive_imported_files": true
    }'::jsonb,
    'Bank statement import settings',
    'reconciliation'
),
(
    'reconciliation.variance',
    '{
        "auto_investigate_threshold": 100,
        "escalate_after_days": 7,
        "write_off_threshold": 0.50,
        "require_approval_for_writeoff": true
    }'::jsonb,
    'Variance handling settings',
    'reconciliation'
)
ON CONFLICT (config_key) DO NOTHING;

-- IPS Configuration
INSERT INTO system_configuration (config_key, config_value, description, category) VALUES
(
    'ips.connection',
    '{
        "enabled": true,
        "mock_mode": true,
        "api_base_url": "",
        "org_id": "",
        "merchant_vpa": "",
        "connection_timeout_ms": 30000,
        "request_timeout_ms": 60000
    }'::jsonb,
    'IPS API connection settings',
    'ips'
),
(
    'ips.transactions',
    '{
        "auto_post_to_ledger": true,
        "pending_timeout_seconds": 300,
        "auto_void_on_timeout": true,
        "require_otp_above_amount": 10000,
        "daily_limit_per_user": 100000,
        "monthly_limit_per_user": 500000
    }'::jsonb,
    'IPS transaction settings',
    'ips'
),
(
    'ips.vpa',
    '{
        "auto_create_for_clients": true,
        "vpa_suffix": "@namlend",
        "allow_multiple_vpa": false,
        "vpa_validation_regex": "^[a-zA-Z0-9._-]+$"
    }'::jsonb,
    'VPA management settings',
    'ips'
)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- RPC FUNCTIONS FOR CONFIGURATION MANAGEMENT
-- ============================================================================

-- Get configuration by category
CREATE OR REPLACE FUNCTION get_config_by_category(p_category TEXT)
RETURNS TABLE (
    config_key TEXT,
    config_value JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    RETURN QUERY
    SELECT 
        sc.config_key,
        CASE WHEN sc.is_sensitive THEN '{"redacted": true}'::jsonb ELSE sc.config_value END,
        sc.description,
        sc.updated_at
    FROM system_configuration sc
    WHERE sc.category = p_category
    ORDER BY sc.config_key;
END;
$$;

-- Update configuration
CREATE OR REPLACE FUNCTION update_config(
    p_config_key TEXT,
    p_config_value JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Check admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admin role required');
    END IF;

    -- Update the configuration
    UPDATE system_configuration
    SET 
        config_value = p_config_value,
        updated_at = NOW(),
        last_modified_by = auth.uid()
    WHERE config_key = p_config_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Configuration key not found');
    END IF;

    -- Log the change
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        new_state
    ) VALUES (
        auth.uid(),
        'update',
        'system_configuration',
        (SELECT id FROM system_configuration WHERE config_key = p_config_key),
        jsonb_build_object('config_key', p_config_key, 'new_value', p_config_value)
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Get all configuration for a list of categories
CREATE OR REPLACE FUNCTION get_all_config(p_categories TEXT[] DEFAULT NULL)
RETURNS TABLE (
    category TEXT,
    config_key TEXT,
    config_value JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    RETURN QUERY
    SELECT 
        sc.category,
        sc.config_key,
        CASE WHEN sc.is_sensitive THEN '{"redacted": true}'::jsonb ELSE sc.config_value END,
        sc.description,
        sc.updated_at
    FROM system_configuration sc
    WHERE p_categories IS NULL OR sc.category = ANY(p_categories)
    ORDER BY sc.category, sc.config_key;
END;
$$;

-- Reset configuration to defaults (requires confirmation)
CREATE OR REPLACE FUNCTION reset_config_to_defaults(
    p_category TEXT,
    p_confirmation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin access
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Admin role required');
    END IF;

    -- Require explicit confirmation
    IF p_confirmation != 'CONFIRM_RESET' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Confirmation required: pass CONFIRM_RESET');
    END IF;

    -- For now, just log the attempt - actual reset would need default values stored
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        new_state
    ) VALUES (
        auth.uid(),
        'reset_config',
        'system_configuration',
        jsonb_build_object('category', p_category, 'action', 'reset_to_defaults')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Configuration reset requested for category: ' || p_category);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_config_by_category(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_config(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_config(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_config_to_defaults(TEXT, TEXT) TO authenticated;
