-- ============================================================================
-- IPS Stuck Transaction Monitoring Job
-- Version: 1.0.0
-- Created: December 27, 2025
-- Description: Monitors and alerts on IPS transactions stuck in non-final states
-- Schedule: Every 15 minutes via pg_cron
-- ============================================================================

-- Step 1: Create a table to track stuck transaction alerts
CREATE TABLE IF NOT EXISTS ips_transaction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ips_transaction_id UUID NOT NULL REFERENCES ips_transactions(id),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  hours_stuck DECIMAL(10,2),
  amount DECIMAL(15,2),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ips_alert_valid_severity CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT ips_alert_valid_type CHECK (alert_type IN ('STUCK_INITIATED', 'STUCK_PENDING', 'STUCK_SENT', 'TIMEOUT_UNRESOLVED', 'HIGH_VALUE_STUCK'))
);

CREATE INDEX IF NOT EXISTS idx_ips_alerts_unresolved ON ips_transaction_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ips_alerts_severity ON ips_transaction_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ips_alerts_txn ON ips_transaction_alerts(ips_transaction_id);

COMMENT ON TABLE ips_transaction_alerts IS 'Alerts for IPS transactions requiring attention';

-- Enable RLS
ALTER TABLE ips_transaction_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view IPS alerts"
  ON ips_transaction_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can manage IPS alerts"
  ON ips_transaction_alerts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));


-- Step 2: Create the monitoring function
CREATE OR REPLACE FUNCTION check_stuck_ips_transactions()
RETURNS TABLE (
  alerts_created INTEGER,
  critical_count INTEGER,
  warning_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created INTEGER := 0;
  v_critical_count INTEGER := 0;
  v_warning_count INTEGER := 0;
  v_txn RECORD;
  v_hours_stuck DECIMAL(10,2);
  v_alert_type VARCHAR(50);
  v_severity VARCHAR(20);
  v_message TEXT;
BEGIN
  -- Find stuck transactions (non-final state for > 1 hour)
  FOR v_txn IN
    SELECT 
      id,
      msg_id,
      transaction_type,
      status,
      amount,
      loan_id,
      disbursement_id,
      payment_id,
      created_at,
      EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_pending
    FROM ips_transactions
    WHERE status IN ('initiated', 'pending', 'sent', 'timeout', 'unknown')
      AND created_at < NOW() - INTERVAL '1 hour'
      -- Exclude already alerted (unresolved)
      AND NOT EXISTS (
        SELECT 1 FROM ips_transaction_alerts a
        WHERE a.ips_transaction_id = ips_transactions.id
          AND a.resolved_at IS NULL
      )
      -- Exclude test transactions
      AND msg_id NOT LIKE 'IPS-ADAPTER-TEST-%'
    ORDER BY created_at ASC
  LOOP
    v_hours_stuck := v_txn.hours_pending;
    
    -- Determine alert type based on status
    v_alert_type := 'STUCK_' || UPPER(v_txn.status);
    
    -- Determine severity based on duration and amount
    IF v_hours_stuck > 24 OR v_txn.amount > 50000 THEN
      v_severity := 'critical';
      v_critical_count := v_critical_count + 1;
    ELSIF v_hours_stuck > 4 OR v_txn.amount > 10000 THEN
      v_severity := 'warning';
      v_warning_count := v_warning_count + 1;
    ELSE
      v_severity := 'info';
    END IF;
    
    -- Build message
    v_message := format(
      'IPS Transaction %s (%s) stuck in %s state for %.1f hours. Amount: NAD %.2f. MsgID: %s',
      v_txn.id,
      v_txn.transaction_type,
      v_txn.status,
      v_hours_stuck,
      v_txn.amount,
      v_txn.msg_id
    );
    
    -- Create alert
    INSERT INTO ips_transaction_alerts (
      ips_transaction_id,
      alert_type,
      severity,
      message,
      hours_stuck,
      amount
    ) VALUES (
      v_txn.id,
      v_alert_type,
      v_severity,
      v_message,
      v_hours_stuck,
      v_txn.amount
    );
    
    v_alerts_created := v_alerts_created + 1;
    
    -- Log critical alerts to audit_logs
    IF v_severity = 'critical' THEN
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id, new_values
      ) VALUES (
        NULL,
        'IPS_STUCK_TRANSACTION_ALERT',
        'ips_transactions',
        v_txn.id,
        jsonb_build_object(
          'alert_type', v_alert_type,
          'severity', v_severity,
          'hours_stuck', v_hours_stuck,
          'amount', v_txn.amount,
          'transaction_type', v_txn.transaction_type,
          'status', v_txn.status
        )
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_alerts_created, v_critical_count, v_warning_count;
END;
$$;

COMMENT ON FUNCTION check_stuck_ips_transactions IS 'Monitors IPS transactions stuck in non-final states and creates alerts';


-- Step 3: Create helper function to get stuck transaction summary
CREATE OR REPLACE FUNCTION get_ips_transaction_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'summary', (
      SELECT json_build_object(
        'total_transactions', COUNT(*),
        'final_state', COUNT(*) FILTER (WHERE status IN ('success', 'failed', 'reversed', 'deemed')),
        'pending_state', COUNT(*) FILTER (WHERE status IN ('initiated', 'pending', 'sent')),
        'timeout_state', COUNT(*) FILTER (WHERE status IN ('timeout', 'unknown'))
      )
      FROM ips_transactions
      WHERE msg_id NOT LIKE 'IPS-ADAPTER-TEST-%'
    ),
    'stuck_transactions', (
      SELECT json_build_object(
        'count', COUNT(*),
        'total_amount', COALESCE(SUM(amount), 0),
        'oldest_hours', COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - created_at))/3600), 0)
      )
      FROM ips_transactions
      WHERE status IN ('initiated', 'pending', 'sent', 'timeout', 'unknown')
        AND created_at < NOW() - INTERVAL '1 hour'
        AND msg_id NOT LIKE 'IPS-ADAPTER-TEST-%'
    ),
    'unresolved_alerts', (
      SELECT json_build_object(
        'total', COUNT(*),
        'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
        'warning', COUNT(*) FILTER (WHERE severity = 'warning')
      )
      FROM ips_transaction_alerts
      WHERE resolved_at IS NULL
    ),
    'last_check', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_ips_transaction_health IS 'Returns IPS transaction health summary for dashboard';


-- Step 4: Create function to acknowledge alerts
CREATE OR REPLACE FUNCTION acknowledge_ips_alert(
  p_alert_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can acknowledge alerts';
  END IF;
  
  UPDATE ips_transaction_alerts
  SET 
    acknowledged_at = NOW(),
    acknowledged_by = auth.uid(),
    resolution_notes = COALESCE(p_notes, resolution_notes)
  WHERE id = p_alert_id
    AND acknowledged_at IS NULL;
  
  RETURN FOUND;
END;
$$;


-- Step 5: Create function to resolve alerts
CREATE OR REPLACE FUNCTION resolve_ips_alert(
  p_alert_id UUID,
  p_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can resolve alerts';
  END IF;
  
  UPDATE ips_transaction_alerts
  SET 
    resolved_at = NOW(),
    resolution_notes = p_notes,
    acknowledged_at = COALESCE(acknowledged_at, NOW()),
    acknowledged_by = COALESCE(acknowledged_by, auth.uid())
  WHERE id = p_alert_id
    AND resolved_at IS NULL;
  
  RETURN FOUND;
END;
$$;


-- Step 6: Schedule the monitoring job (pg_cron)
-- Note: pg_cron must be enabled in Supabase Dashboard > Database > Extensions

-- Check if pg_cron extension is available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Remove existing job if present
    PERFORM cron.unschedule('check-stuck-ips-transactions');
    
    -- Schedule job to run every 15 minutes
    PERFORM cron.schedule(
      'check-stuck-ips-transactions',
      '*/15 * * * *',  -- Every 15 minutes
      $$SELECT check_stuck_ips_transactions()$$
    );
    
    RAISE NOTICE 'pg_cron job scheduled: check-stuck-ips-transactions (every 15 minutes)';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Enable it in Supabase Dashboard > Database > Extensions';
    RAISE NOTICE 'Job can be run manually: SELECT check_stuck_ips_transactions();';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %. Run manually: SELECT check_stuck_ips_transactions();', SQLERRM;
END $$;


-- Step 7: Grant execute permissions
GRANT EXECUTE ON FUNCTION check_stuck_ips_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_ips_transaction_health TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_ips_alert TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ips_alert TO authenticated;


-- Step 8: Run initial check
SELECT * FROM check_stuck_ips_transactions();
