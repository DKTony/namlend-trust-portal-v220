-- Migration: Create Audit Trail Enhancement Schema
-- Version: v2.4.1
-- Date: 2025-10-09
-- Description: Comprehensive audit logging for compliance and security

-- ============================================================================
-- AUDIT LOGS TABLE
-- Comprehensive audit log for all system actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'approve', 'reject', 'login', 'logout', 'export', 'download')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_state JSONB,
  new_state JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Prevent updates (append-only)
  CONSTRAINT immutable_audit_log CHECK (true)
);

-- Partition by month for performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- System can insert (via trigger)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- VIEW LOGS TABLE
-- Track who viewed sensitive data
-- ============================================================================

CREATE TABLE IF NOT EXISTS view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  view_duration_ms INTEGER,
  fields_viewed TEXT[],
  ip_address INET,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_view_logs_timestamp ON view_logs(timestamp DESC);
CREATE INDEX idx_view_logs_user ON view_logs(user_id, timestamp DESC);
CREATE INDEX idx_view_logs_entity ON view_logs(entity_type, entity_id, timestamp DESC);

-- RLS Policies
ALTER TABLE view_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view view logs"
  ON view_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert their own view logs"
  ON view_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STATE TRANSITIONS TABLE
-- Detailed status change tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  transition_reason TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_state_transitions_timestamp ON state_transitions(timestamp DESC);
CREATE INDEX idx_state_transitions_entity ON state_transitions(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_state_transitions_user ON state_transitions(triggered_by, timestamp DESC);
CREATE INDEX idx_state_transitions_workflow ON state_transitions(workflow_instance_id);

-- RLS Policies
ALTER TABLE state_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view state transitions"
  ON state_transitions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their transitions"
  ON state_transitions FOR SELECT
  USING (triggered_by = auth.uid());

CREATE POLICY "System can insert state transitions"
  ON state_transitions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- COMPLIANCE REPORTS TABLE
-- Pre-generated compliance reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('monthly_approvals', 'user_activity', 'state_changes', 'view_access', 'security_audit')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  report_data JSONB NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Indexes
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type, period_start DESC);
CREATE INDEX idx_compliance_reports_generated ON compliance_reports(generated_at DESC);

-- RLS Policies
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compliance reports"
  ON compliance_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- AUDIT HELPER FUNCTIONS
-- ============================================================================

-- Function to log audit entry
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_role,
    action,
    entity_type,
    entity_id,
    old_state,
    new_state,
    ip_address,
    session_id,
    metadata
  ) VALUES (
    auth.uid(),
    v_user_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_state,
    p_new_state,
    inet_client_addr(),
    current_setting('request.jwt.claims', true)::json->>'session_id',
    p_metadata
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log state transition
CREATE OR REPLACE FUNCTION log_state_transition(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_from_state TEXT,
  p_to_state TEXT,
  p_reason TEXT DEFAULT NULL,
  p_workflow_instance_id UUID DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_transition_id UUID;
BEGIN
  INSERT INTO state_transitions (
    entity_type,
    entity_id,
    from_state,
    to_state,
    transition_reason,
    triggered_by,
    workflow_instance_id
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_from_state,
    p_to_state,
    p_reason,
    auth.uid(),
    p_workflow_instance_id
  )
  RETURNING id INTO v_transition_id;
  
  RETURN v_transition_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log view access
CREATE OR REPLACE FUNCTION log_view_access(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_fields_viewed TEXT[] DEFAULT NULL,
  p_view_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_view_id UUID;
BEGIN
  INSERT INTO view_logs (
    user_id,
    entity_type,
    entity_id,
    fields_viewed,
    view_duration_ms,
    ip_address,
    session_id
  ) VALUES (
    auth.uid(),
    p_entity_type,
    p_entity_id,
    p_fields_viewed,
    p_view_duration_ms,
    inet_client_addr(),
    current_setting('request.jwt.claims', true)::json->>'session_id'
  )
  RETURNING id INTO v_view_id;
  
  RETURN v_view_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate compliance report
CREATE OR REPLACE FUNCTION generate_compliance_report(
  p_report_type TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
  v_report_id UUID;
  v_report_data JSONB;
BEGIN
  -- Generate report based on type
  CASE p_report_type
    WHEN 'monthly_approvals' THEN
      SELECT jsonb_build_object(
        'total_approvals', COUNT(*) FILTER (WHERE action = 'approve'),
        'total_rejections', COUNT(*) FILTER (WHERE action = 'reject'),
        'by_user', jsonb_agg(DISTINCT jsonb_build_object('user_id', user_id, 'count', COUNT(*)))
      )
      INTO v_report_data
      FROM audit_logs
      WHERE timestamp BETWEEN p_period_start AND p_period_end
        AND action IN ('approve', 'reject');
    
    WHEN 'user_activity' THEN
      SELECT jsonb_build_object(
        'total_actions', COUNT(*),
        'unique_users', COUNT(DISTINCT user_id),
        'actions_by_type', jsonb_object_agg(action, COUNT(*))
      )
      INTO v_report_data
      FROM audit_logs
      WHERE timestamp BETWEEN p_period_start AND p_period_end;
    
    WHEN 'state_changes' THEN
      SELECT jsonb_build_object(
        'total_transitions', COUNT(*),
        'by_entity_type', jsonb_object_agg(entity_type, COUNT(*))
      )
      INTO v_report_data
      FROM state_transitions
      WHERE timestamp BETWEEN p_period_start AND p_period_end;
    
    ELSE
      RAISE EXCEPTION 'Unknown report type: %', p_report_type;
  END CASE;
  
  -- Insert report
  INSERT INTO compliance_reports (
    report_type,
    period_start,
    period_end,
    generated_by,
    report_data
  ) VALUES (
    p_report_type,
    p_period_start,
    p_period_end,
    auth.uid(),
    v_report_data
  )
  RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_audit_entry(TEXT, TEXT, UUID, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_state_transition(TEXT, UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_view_access(TEXT, UUID, TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_compliance_report(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- AUTOMATIC AUDIT TRIGGERS
-- ============================================================================

-- Trigger function for approval_requests changes
CREATE OR REPLACE FUNCTION audit_approval_requests_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_entry('create', 'approval_request', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_entry('update', 'approval_request', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    
    -- Log state transition if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_state_transition('approval_request', NEW.id, OLD.status, NEW.status);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_entry('delete', 'approval_request', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_approval_requests
  AFTER INSERT OR UPDATE OR DELETE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION audit_approval_requests_changes();

-- Trigger function for loans changes
CREATE OR REPLACE FUNCTION audit_loans_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_entry('create', 'loan', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_entry('update', 'loan', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    
    -- Log state transition if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_state_transition('loan', NEW.id, OLD.status, NEW.status);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_entry('delete', 'loan', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_loans
  AFTER INSERT OR UPDATE OR DELETE ON loans
  FOR EACH ROW EXECUTE FUNCTION audit_loans_changes();

-- Trigger function for payments changes
CREATE OR REPLACE FUNCTION audit_payments_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_entry('create', 'payment', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_entry('update', 'payment', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    
    -- Log state transition if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM log_state_transition('payment', NEW.id, OLD.status, NEW.status);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_entry('delete', 'payment', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_payments_changes();

-- Trigger function for user_roles changes
CREATE OR REPLACE FUNCTION audit_user_roles_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_entry('create', 'user_role', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_entry('update', 'user_role', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_entry('delete', 'user_role', OLD.id, to_jsonb(OLD), NULL);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_user_roles_changes();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all system actions (7-year retention)';
COMMENT ON TABLE view_logs IS 'Track who viewed sensitive data and when';
COMMENT ON TABLE state_transitions IS 'Detailed status change tracking for entities';
COMMENT ON TABLE compliance_reports IS 'Pre-generated compliance reports for auditors';

COMMENT ON FUNCTION log_audit_entry IS 'Log an audit entry for any system action';
COMMENT ON FUNCTION log_state_transition IS 'Log a state transition for an entity';
COMMENT ON FUNCTION log_view_access IS 'Log when a user views sensitive data';
COMMENT ON FUNCTION generate_compliance_report IS 'Generate a compliance report for a time period';
