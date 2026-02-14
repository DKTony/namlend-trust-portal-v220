-- IPS Monitoring Views and Scheduled Jobs
-- Migration: 20251212050000_ips_monitoring.sql

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

-- IPS Transaction Summary View (for dashboards)
CREATE OR REPLACE VIEW ips_transaction_summary AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  transaction_type,
  status,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))) AS avg_duration_seconds
FROM ips_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), transaction_type, status
ORDER BY hour DESC, transaction_type, status;

-- IPS Success Rate View
CREATE OR REPLACE VIEW ips_success_rate AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  transaction_type,
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE status IN ('success', 'deemed')) AS successful,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status IN ('pending', 'sent', 'initiated')) AS pending,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('success', 'deemed')) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) AS success_rate_percent
FROM ips_transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), transaction_type
ORDER BY day DESC, transaction_type;

-- IPS Error Analysis View
CREATE OR REPLACE VIEW ips_error_analysis AS
SELECT
  DATE_TRUNC('day', t.created_at) AS day,
  t.ips_error_code,
  e.description AS error_description,
  e.is_retryable,
  COUNT(*) AS error_count,
  SUM(t.amount) AS total_amount_affected
FROM ips_transactions t
LEFT JOIN ips_error_codes e ON t.ips_error_code = e.code
WHERE t.status = 'failed'
  AND t.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', t.created_at), t.ips_error_code, e.description, e.is_retryable
ORDER BY day DESC, error_count DESC;

-- Pending Transactions View (for alerts)
CREATE OR REPLACE VIEW ips_pending_transactions AS
SELECT
  id,
  msg_id,
  txn_id,
  transaction_type,
  amount,
  currency,
  payer_vpa,
  payee_vpa,
  status,
  initiated_at,
  EXTRACT(EPOCH FROM (NOW() - initiated_at)) / 60 AS minutes_pending,
  retry_count,
  last_status_check_at,
  loan_id,
  disbursement_id,
  payment_id
FROM ips_transactions
WHERE status IN ('initiated', 'pending', 'sent')
ORDER BY initiated_at ASC;

-- IPS Daily Reconciliation View
CREATE OR REPLACE VIEW ips_daily_reconciliation AS
SELECT
  DATE_TRUNC('day', t.created_at) AS day,
  t.transaction_type,
  COUNT(*) AS total_transactions,
  SUM(t.amount) AS total_amount,
  COUNT(*) FILTER (WHERE t.status = 'success' AND d.status = 'completed') AS matched_disbursements,
  COUNT(*) FILTER (WHERE t.status = 'success' AND p.status = 'completed') AS matched_payments,
  COUNT(*) FILTER (WHERE t.status = 'success' AND d.status IS NULL AND p.status IS NULL) AS unmatched_success
FROM ips_transactions t
LEFT JOIN disbursements d ON t.disbursement_id = d.id
LEFT JOIN payments p ON t.payment_id = p.id
WHERE t.created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', t.created_at), t.transaction_type
ORDER BY day DESC;

-- Grant access to views
GRANT SELECT ON ips_transaction_summary TO authenticated;
GRANT SELECT ON ips_success_rate TO authenticated;
GRANT SELECT ON ips_error_analysis TO authenticated;
GRANT SELECT ON ips_pending_transactions TO authenticated;
GRANT SELECT ON ips_daily_reconciliation TO authenticated;

-- ============================================================================
-- MONITORING FUNCTIONS
-- ============================================================================

-- Function to get IPS health metrics
CREATE OR REPLACE FUNCTION get_ips_health_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'timestamp', NOW(),
    'last_hour', (
      SELECT json_build_object(
        'total_transactions', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status IN ('success', 'deemed')),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'pending', COUNT(*) FILTER (WHERE status IN ('pending', 'sent', 'initiated')),
        'success_rate', ROUND(
          COUNT(*) FILTER (WHERE status IN ('success', 'deemed')) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ),
        'total_amount', COALESCE(SUM(amount), 0)
      )
      FROM ips_transactions
      WHERE created_at > NOW() - INTERVAL '1 hour'
    ),
    'last_24_hours', (
      SELECT json_build_object(
        'total_transactions', COUNT(*),
        'successful', COUNT(*) FILTER (WHERE status IN ('success', 'deemed')),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'success_rate', ROUND(
          COUNT(*) FILTER (WHERE status IN ('success', 'deemed')) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ),
        'total_amount', COALESCE(SUM(amount), 0),
        'avg_duration_seconds', ROUND(
          AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at)))::NUMERIC,
          2
        )
      )
      FROM ips_transactions
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ),
    'pending_alerts', (
      SELECT json_build_object(
        'count', COUNT(*),
        'oldest_minutes', ROUND(
          MAX(EXTRACT(EPOCH FROM (NOW() - initiated_at)) / 60)::NUMERIC,
          1
        ),
        'total_amount', COALESCE(SUM(amount), 0)
      )
      FROM ips_transactions
      WHERE status IN ('initiated', 'pending', 'sent')
        AND initiated_at < NOW() - INTERVAL '5 minutes'
    ),
    'top_errors', (
      SELECT COALESCE(json_agg(errors), '[]'::json)
      FROM (
        SELECT 
          ips_error_code,
          COUNT(*) as count
        FROM ips_transactions
        WHERE status = 'failed'
          AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY ips_error_code
        ORDER BY count DESC
        LIMIT 5
      ) errors
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to check for stale transactions and alert
CREATE OR REPLACE FUNCTION check_ips_stale_transactions()
RETURNS TABLE(
  id UUID,
  msg_id VARCHAR,
  transaction_type VARCHAR,
  amount DECIMAL,
  status VARCHAR,
  minutes_pending NUMERIC,
  alert_level VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.msg_id,
    t.transaction_type::VARCHAR,
    t.amount,
    t.status::VARCHAR,
    ROUND(EXTRACT(EPOCH FROM (NOW() - t.initiated_at)) / 60, 1) AS minutes_pending,
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - t.initiated_at)) > 1800 THEN 'CRITICAL' -- > 30 min
      WHEN EXTRACT(EPOCH FROM (NOW() - t.initiated_at)) > 600 THEN 'WARNING'  -- > 10 min
      ELSE 'INFO'
    END AS alert_level
  FROM ips_transactions t
  WHERE t.status IN ('initiated', 'pending', 'sent')
    AND t.initiated_at < NOW() - INTERVAL '5 minutes'
  ORDER BY t.initiated_at ASC;
END;
$$;

-- Function to reconcile IPS transactions
CREATE OR REPLACE FUNCTION reconcile_ips_transactions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  reconciled_count INTEGER := 0;
  mismatch_count INTEGER := 0;
  v_temp_count INTEGER := 0;
BEGIN
  -- Mark successful disbursements as reconciled
  UPDATE ips_transactions t
  SET 
    updated_at = NOW()
  FROM disbursements d
  WHERE t.disbursement_id = d.id
    AND t.status = 'success'
    AND d.status = 'completed'
    AND t.transaction_type = 'DISBURSEMENT';
  
  GET DIAGNOSTICS reconciled_count = ROW_COUNT;
  
  -- Mark successful payments as reconciled
  UPDATE ips_transactions t
  SET 
    updated_at = NOW()
  FROM payments p
  WHERE t.payment_id = p.id
    AND t.status = 'success'
    AND p.status = 'completed'
    AND t.transaction_type = 'REPAYMENT';
  
  GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  reconciled_count := reconciled_count + v_temp_count;
  
  -- Count mismatches
  SELECT COUNT(*) INTO mismatch_count
  FROM ips_transactions t
  LEFT JOIN disbursements d ON t.disbursement_id = d.id
  LEFT JOIN payments p ON t.payment_id = p.id
  WHERE t.status = 'success'
    AND t.created_at > NOW() - INTERVAL '24 hours'
    AND (
      (t.transaction_type = 'DISBURSEMENT' AND (d.status IS NULL OR d.status != 'completed'))
      OR
      (t.transaction_type = 'REPAYMENT' AND (p.status IS NULL OR p.status != 'completed'))
    );
  
  SELECT json_build_object(
    'timestamp', NOW(),
    'reconciled_count', reconciled_count,
    'mismatch_count', mismatch_count,
    'status', CASE WHEN mismatch_count = 0 THEN 'OK' ELSE 'ATTENTION_REQUIRED' END
  ) INTO result;
  
  -- Log reconciliation
  INSERT INTO audit_logs (user_id, action, table_name, new_values)
  VALUES (
    NULL,
    'IPS_RECONCILIATION',
    'ips_transactions',
    result
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_ips_health_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION check_ips_stale_transactions() TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_ips_transactions() TO service_role;

-- ============================================================================
-- SCHEDULED JOBS (pg_cron)
-- ============================================================================

-- Note: These require pg_cron extension to be enabled
-- Run these manually if pg_cron is not available

-- Check for stale transactions every 5 minutes
-- SELECT cron.schedule(
--   'ips-check-stale-transactions',
--   '*/5 * * * *',
--   $$SELECT check_ips_stale_transactions();$$
-- );

-- Daily reconciliation at 6 AM
-- SELECT cron.schedule(
--   'ips-daily-reconciliation',
--   '0 6 * * *',
--   $$SELECT reconcile_ips_transactions();$$
-- );

-- ============================================================================
-- ALERT THRESHOLDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ips_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL UNIQUE,
  warning_threshold DECIMAL,
  critical_threshold DECIMAL,
  enabled BOOLEAN DEFAULT TRUE,
  notification_channels JSONB DEFAULT '["email"]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default thresholds
INSERT INTO ips_alert_thresholds (metric_name, warning_threshold, critical_threshold, notification_channels)
VALUES
  ('success_rate_percent', 95, 90, '["email", "slack"]'),
  ('pending_transaction_minutes', 10, 30, '["email", "slack", "pagerduty"]'),
  ('failed_transactions_per_hour', 5, 10, '["email", "slack"]'),
  ('avg_response_time_seconds', 5, 10, '["email"]'),
  ('daily_transaction_volume', NULL, NULL, '["email"]')
ON CONFLICT (metric_name) DO NOTHING;

-- Enable RLS
ALTER TABLE ips_alert_thresholds ENABLE ROW LEVEL SECURITY;

-- Only admins can manage thresholds
CREATE POLICY "Admins can manage alert thresholds"
  ON ips_alert_thresholds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- SYSTEM SETTINGS FOR IPS
-- ============================================================================

-- Add IPS settings to system_settings if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    INSERT INTO system_settings (key, value, description)
    VALUES
      ('ips_enabled', 'true', 'Enable/disable IPS payments'),
      ('ips_max_transaction_amount', '100000', 'Maximum single transaction amount'),
      ('ips_daily_limit_per_user', '500000', 'Daily transaction limit per user'),
      ('ips_maintenance_mode', 'false', 'IPS maintenance mode flag')
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW ips_transaction_summary IS 'Hourly summary of IPS transactions for dashboard';
COMMENT ON VIEW ips_success_rate IS 'Daily success rate metrics for IPS transactions';
COMMENT ON VIEW ips_error_analysis IS 'Analysis of IPS transaction errors by day';
COMMENT ON VIEW ips_pending_transactions IS 'List of pending IPS transactions for monitoring';
COMMENT ON VIEW ips_daily_reconciliation IS 'Daily reconciliation status of IPS transactions';
COMMENT ON FUNCTION get_ips_health_metrics() IS 'Returns current IPS health metrics as JSON';
COMMENT ON FUNCTION check_ips_stale_transactions() IS 'Returns list of stale transactions with alert levels';
COMMENT ON FUNCTION reconcile_ips_transactions() IS 'Reconciles IPS transactions with disbursements and payments';
COMMENT ON TABLE ips_alert_thresholds IS 'Configurable alert thresholds for IPS monitoring';
