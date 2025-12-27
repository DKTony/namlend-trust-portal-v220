-- ============================================================================
-- IPS Alert Notification System
-- Version: 1.0.0
-- Created: December 27, 2025
-- Description: Triggers notifications to admins for critical IPS alerts
-- ============================================================================

-- Step 1: Create trigger function to queue notifications for critical alerts
CREATE OR REPLACE FUNCTION notify_admin_on_critical_ips_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_notification_id UUID;
BEGIN
  -- Only trigger for critical severity
  IF NEW.severity != 'critical' THEN
    RETURN NEW;
  END IF;
  
  -- Queue notifications for all admin users
  FOR v_admin IN
    SELECT ur.user_id, p.first_name, p.email
    FROM user_roles ur
    LEFT JOIN profiles p ON ur.user_id = p.user_id
    WHERE ur.role = 'admin'
  LOOP
    -- Insert into notifications table
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      v_admin.user_id,
      '🚨 Critical IPS Alert',
      NEW.message,
      'system',
      'high',
      '/admin?tab=reconciliation',
      jsonb_build_object(
        'alert_id', NEW.id,
        'ips_transaction_id', NEW.ips_transaction_id,
        'alert_type', NEW.alert_type,
        'severity', NEW.severity,
        'amount', NEW.amount,
        'hours_stuck', NEW.hours_stuck
      )
    )
    RETURNING id INTO v_notification_id;
    
    -- Log the notification
    INSERT INTO audit_logs (
      user_id, action, table_name, record_id, new_values
    ) VALUES (
      v_admin.user_id,
      'IPS_CRITICAL_ALERT_NOTIFICATION',
      'ips_transaction_alerts',
      NEW.id,
      jsonb_build_object(
        'notification_id', v_notification_id,
        'admin_user_id', v_admin.user_id,
        'alert_severity', NEW.severity
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Step 2: Create the trigger on ips_transaction_alerts
DROP TRIGGER IF EXISTS trigger_notify_critical_ips_alert ON ips_transaction_alerts;

CREATE TRIGGER trigger_notify_critical_ips_alert
  AFTER INSERT ON ips_transaction_alerts
  FOR EACH ROW
  WHEN (NEW.severity = 'critical')
  EXECUTE FUNCTION notify_admin_on_critical_ips_alert();

-- Step 3: Create function to manually notify admins (for testing)
CREATE OR REPLACE FUNCTION send_ips_alert_notification(
  p_alert_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert ips_transaction_alerts%ROWTYPE;
  v_admin RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Get alert
  SELECT * INTO v_alert FROM ips_transaction_alerts WHERE id = p_alert_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;
  
  -- Queue notifications for all admin users
  FOR v_admin IN
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      action_url,
      metadata
    ) VALUES (
      v_admin.user_id,
      CASE v_alert.severity 
        WHEN 'critical' THEN '🚨 Critical IPS Alert'
        WHEN 'warning' THEN '⚠️ IPS Alert'
        ELSE 'ℹ️ IPS Notice'
      END,
      v_alert.message,
      'system',
      CASE v_alert.severity WHEN 'critical' THEN 'high' ELSE 'normal' END,
      '/admin?tab=reconciliation',
      jsonb_build_object(
        'alert_id', v_alert.id,
        'ips_transaction_id', v_alert.ips_transaction_id,
        'alert_type', v_alert.alert_type,
        'severity', v_alert.severity
      )
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION send_ips_alert_notification TO authenticated;

-- Step 4: Create view for admin to see IPS alert history
CREATE OR REPLACE VIEW ips_alerts_summary AS
SELECT 
  DATE(created_at) as alert_date,
  severity,
  COUNT(*) as alert_count,
  SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved_count,
  SUM(CASE WHEN acknowledged_at IS NOT NULL THEN 1 ELSE 0 END) as acknowledged_count,
  SUM(amount) as total_amount,
  AVG(hours_stuck) as avg_hours_stuck
FROM ips_transaction_alerts
GROUP BY DATE(created_at), severity
ORDER BY alert_date DESC, severity;

COMMENT ON VIEW ips_alerts_summary IS 'Summary view of IPS alerts by date and severity';
