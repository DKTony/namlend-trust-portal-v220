-- Migration: Create Workflow Engine Schema
-- Version: v2.4.0
-- Date: 2025-10-09
-- Description: Configurable multi-level approval workflow engine with 2-stage default

-- ============================================================================
-- WORKFLOW DEFINITIONS TABLE
-- Stores configurable approval chain templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('loan_application', 'disbursement', 'payment', 'user_role_change')),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  stages JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_active_workflow UNIQUE (entity_type, is_active) WHERE is_active = true
);

-- Index for fast lookups
CREATE INDEX idx_workflow_definitions_entity_type ON workflow_definitions(entity_type) WHERE is_active = true;
CREATE INDEX idx_workflow_definitions_created_by ON workflow_definitions(created_by);

-- RLS Policies
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage workflow definitions"
  ON workflow_definitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- All authenticated users can view active workflows
CREATE POLICY "Users can view active workflows"
  ON workflow_definitions
  FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- WORKFLOW INSTANCES TABLE
-- Tracks active approval processes
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID REFERENCES workflow_definitions(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_stage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'rejected', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT unique_active_workflow_instance UNIQUE (entity_type, entity_id) WHERE status = 'in_progress'
);

-- Indexes for performance
CREATE INDEX idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status) WHERE status = 'in_progress';
CREATE INDEX idx_workflow_instances_definition ON workflow_instances(workflow_definition_id);

-- RLS Policies
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;

-- Admins can see all instances
CREATE POLICY "Admins can view all workflow instances"
  ON workflow_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can see instances they're involved in
CREATE POLICY "Users can view their workflow instances"
  ON workflow_instances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workflow_stage_executions wse
      WHERE wse.workflow_instance_id = workflow_instances.id
      AND (wse.assigned_to = auth.uid() OR wse.decided_by = auth.uid())
    )
  );

-- ============================================================================
-- WORKFLOW STAGE EXECUTIONS TABLE
-- Tracks approval history for each stage
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_stage_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  assigned_role TEXT CHECK (assigned_role IN ('loan_officer', 'senior_officer', 'manager', 'admin')),
  assigned_to UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  decision TEXT,
  decision_notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_decision CHECK (
    (status = 'pending' AND decided_by IS NULL AND decided_at IS NULL) OR
    (status IN ('approved', 'rejected', 'skipped') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_workflow_stage_executions_instance ON workflow_stage_executions(workflow_instance_id);
CREATE INDEX idx_workflow_stage_executions_assigned ON workflow_stage_executions(assigned_to) WHERE status = 'pending';
CREATE INDEX idx_workflow_stage_executions_status ON workflow_stage_executions(status);

-- RLS Policies
ALTER TABLE workflow_stage_executions ENABLE ROW LEVEL SECURITY;

-- Admins can see all executions
CREATE POLICY "Admins can view all stage executions"
  ON workflow_stage_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can see stages assigned to them or decided by them
CREATE POLICY "Users can view their stage executions"
  ON workflow_stage_executions
  FOR SELECT
  USING (assigned_to = auth.uid() OR decided_by = auth.uid());

-- Users can update stages assigned to them
CREATE POLICY "Users can update assigned stages"
  ON workflow_stage_executions
  FOR UPDATE
  USING (assigned_to = auth.uid() AND status = 'pending')
  WITH CHECK (assigned_to = auth.uid());

-- ============================================================================
-- WORKFLOW DEFINITION HISTORY TABLE
-- Audit trail for workflow configuration changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  stages JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT
);

-- Index
CREATE INDEX idx_workflow_history_definition ON workflow_definition_history(workflow_definition_id);

-- RLS Policies
ALTER TABLE workflow_definition_history ENABLE ROW LEVEL SECURITY;

-- Admins can view history
CREATE POLICY "Admins can view workflow history"
  ON workflow_definition_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- DEFAULT 2-STAGE LOAN APPROVAL WORKFLOW
-- Insert standard workflow for loan applications
-- ============================================================================

INSERT INTO workflow_definitions (name, description, entity_type, stages, is_active)
VALUES (
  'Standard 2-Stage Loan Approval',
  'Default workflow: Initial Review by Loan Officer → Senior/Manager Approval',
  'loan_application',
  '[
    {
      "stage": 1,
      "name": "Initial Review",
      "description": "Loan officer reviews application and supporting documents",
      "required_role": "loan_officer",
      "required_approvals": 1,
      "auto_assign": true,
      "timeout_hours": 24,
      "conditions": {
        "amount_max": null
      }
    },
    {
      "stage": 2,
      "name": "Final Approval",
      "description": "Senior officer or manager provides final approval",
      "required_role": "senior_officer",
      "required_approvals": 1,
      "auto_assign": false,
      "timeout_hours": 48,
      "conditions": {
        "amount_min": 0
      }
    }
  ]'::jsonb,
  true
)
ON CONFLICT (entity_type, is_active) WHERE is_active = true
DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active workflow for entity type
CREATE OR REPLACE FUNCTION get_active_workflow(p_entity_type TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  stages JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT wd.id, wd.name, wd.stages
  FROM workflow_definitions wd
  WHERE wd.entity_type = p_entity_type
    AND wd.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start workflow instance
CREATE OR REPLACE FUNCTION start_workflow_instance(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_workflow_id UUID;
  v_instance_id UUID;
  v_stages JSONB;
  v_stage JSONB;
BEGIN
  -- Get active workflow
  SELECT id, stages INTO v_workflow_id, v_stages
  FROM workflow_definitions
  WHERE entity_type = p_entity_type AND is_active = true
  LIMIT 1;
  
  IF v_workflow_id IS NULL THEN
    RAISE EXCEPTION 'No active workflow found for entity type: %', p_entity_type;
  END IF;
  
  -- Create workflow instance
  INSERT INTO workflow_instances (workflow_definition_id, entity_type, entity_id, metadata)
  VALUES (v_workflow_id, p_entity_type, p_entity_id, p_metadata)
  RETURNING id INTO v_instance_id;
  
  -- Create first stage execution
  v_stage := v_stages->0;
  
  INSERT INTO workflow_stage_executions (
    workflow_instance_id,
    stage_number,
    stage_name,
    assigned_role,
    status
  ) VALUES (
    v_instance_id,
    1,
    v_stage->>'name',
    v_stage->>'required_role',
    'pending'
  );
  
  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve/reject stage
CREATE OR REPLACE FUNCTION decide_workflow_stage(
  p_stage_execution_id UUID,
  p_decision TEXT, -- 'approved' or 'rejected'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_instance_id UUID;
  v_current_stage INTEGER;
  v_workflow_def_id UUID;
  v_stages JSONB;
  v_next_stage JSONB;
  v_result JSONB;
BEGIN
  -- Update current stage
  UPDATE workflow_stage_executions
  SET status = p_decision,
      decision = p_decision,
      decision_notes = p_notes,
      decided_by = auth.uid(),
      decided_at = NOW()
  WHERE id = p_stage_execution_id
    AND status = 'pending'
    AND assigned_to = auth.uid()
  RETURNING workflow_instance_id INTO v_instance_id;
  
  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'Stage execution not found or not authorized';
  END IF;
  
  -- Get workflow instance details
  SELECT wi.current_stage, wi.workflow_definition_id, wd.stages
  INTO v_current_stage, v_workflow_def_id, v_stages
  FROM workflow_instances wi
  JOIN workflow_definitions wd ON wd.id = wi.workflow_definition_id
  WHERE wi.id = v_instance_id;
  
  -- If rejected, mark workflow as rejected
  IF p_decision = 'rejected' THEN
    UPDATE workflow_instances
    SET status = 'rejected', completed_at = NOW()
    WHERE id = v_instance_id;
    
    v_result := jsonb_build_object(
      'workflow_status', 'rejected',
      'message', 'Workflow rejected at stage ' || v_current_stage
    );
    RETURN v_result;
  END IF;
  
  -- If approved, check if there's a next stage
  v_next_stage := v_stages->v_current_stage;
  
  IF v_next_stage IS NULL THEN
    -- No more stages, workflow complete
    UPDATE workflow_instances
    SET status = 'completed', completed_at = NOW()
    WHERE id = v_instance_id;
    
    v_result := jsonb_build_object(
      'workflow_status', 'completed',
      'message', 'Workflow completed successfully'
    );
    RETURN v_result;
  ELSE
    -- Create next stage execution
    INSERT INTO workflow_stage_executions (
      workflow_instance_id,
      stage_number,
      stage_name,
      assigned_role,
      status
    ) VALUES (
      v_instance_id,
      v_current_stage + 1,
      v_next_stage->>'name',
      v_next_stage->>'required_role',
      'pending'
    );
    
    -- Update instance current stage
    UPDATE workflow_instances
    SET current_stage = v_current_stage + 1
    WHERE id = v_instance_id;
    
    v_result := jsonb_build_object(
      'workflow_status', 'in_progress',
      'current_stage', v_current_stage + 1,
      'message', 'Advanced to stage ' || (v_current_stage + 1)
    );
    RETURN v_result;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_workflow(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION start_workflow_instance(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION decide_workflow_stage(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workflow_definitions IS 'Configurable approval workflow templates';
COMMENT ON TABLE workflow_instances IS 'Active workflow processes for entities';
COMMENT ON TABLE workflow_stage_executions IS 'Individual stage approval history';
COMMENT ON TABLE workflow_definition_history IS 'Audit trail for workflow configuration changes';

COMMENT ON FUNCTION get_active_workflow(TEXT) IS 'Get active workflow definition for entity type';
COMMENT ON FUNCTION start_workflow_instance(TEXT, UUID, JSONB) IS 'Initialize new workflow instance for an entity';
COMMENT ON FUNCTION decide_workflow_stage(UUID, TEXT, TEXT) IS 'Approve or reject a workflow stage';
