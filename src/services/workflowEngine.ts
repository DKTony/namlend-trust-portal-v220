/**
 * Workflow Engine Service
 * Manages configurable multi-stage approval workflows
 * Version: v2.4.0
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkflowStage {
  stage: number;
  name: string;
  description: string;
  required_role: 'loan_officer' | 'senior_officer' | 'manager' | 'admin';
  required_approvals: number;
  auto_assign: boolean;
  timeout_hours: number;
  conditions: {
    amount_min?: number | null;
    amount_max?: number | null;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  entity_type: 'loan_application' | 'disbursement' | 'payment' | 'user_role_change';
  version: number;
  is_active: boolean;
  stages: WorkflowStage[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface WorkflowInstance {
  id: string;
  workflow_definition_id: string;
  entity_type: string;
  entity_id: string;
  current_stage: number;
  status: 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  started_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
}

export interface WorkflowStageExecution {
  id: string;
  workflow_instance_id: string;
  stage_number: number;
  stage_name: string;
  assigned_role: string;
  assigned_to?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decision?: string;
  decision_notes?: string;
  decided_by?: string;
  decided_at?: string;
  created_at: string;
}

export interface WorkflowDecisionResult {
  workflow_status: 'in_progress' | 'completed' | 'rejected';
  current_stage?: number;
  message: string;
}

// ============================================================================
// WORKFLOW ENGINE SERVICE
// ============================================================================

export class WorkflowEngineService {
  /**
   * Get active workflow definition for entity type
   */
  static async getActiveWorkflow(entityType: string): Promise<WorkflowDefinition | null> {
    const { data, error } = await supabase.rpc('get_active_workflow', {
      p_entity_type: entityType
    });

    if (error) {
      console.error('Error fetching active workflow:', error);
      throw new Error(`Failed to fetch active workflow: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return {
      id: data[0].id,
      name: data[0].name,
      description: '',
      entity_type: entityType as any,
      version: 1,
      is_active: true,
      stages: data[0].stages,
      created_at: '',
      updated_at: '',
      created_by: ''
    };
  }

  /**
   * Start a new workflow instance for an entity
   */
  static async startWorkflow(
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const { data, error } = await supabase.rpc('start_workflow_instance', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_metadata: metadata
    });

    if (error) {
      console.error('Error starting workflow:', error);
      throw new Error(`Failed to start workflow: ${error.message}`);
    }

    return data as string;
  }

  /**
   * Get workflow instance for an entity
   */
  static async getWorkflowInstance(entityType: string, entityId: string): Promise<WorkflowInstance | null> {
    const { data, error } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'in_progress')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active workflow found
        return null;
      }
      console.error('Error fetching workflow instance:', error);
      throw new Error(`Failed to fetch workflow instance: ${error.message}`);
    }

    return data;
  }

  /**
   * Get current stage execution for a workflow instance
   */
  static async getCurrentStageExecution(workflowInstanceId: string): Promise<WorkflowStageExecution | null> {
    const { data, error } = await supabase
      .from('workflow_stage_executions')
      .select('*')
      .eq('workflow_instance_id', workflowInstanceId)
      .eq('status', 'pending')
      .order('stage_number', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching current stage:', error);
      throw new Error(`Failed to fetch current stage: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all stage executions for a workflow instance
   */
  static async getStageExecutions(workflowInstanceId: string): Promise<WorkflowStageExecution[]> {
    const { data, error } = await supabase
      .from('workflow_stage_executions')
      .select('*')
      .eq('workflow_instance_id', workflowInstanceId)
      .order('stage_number', { ascending: true });

    if (error) {
      console.error('Error fetching stage executions:', error);
      throw new Error(`Failed to fetch stage executions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get pending stage executions assigned to current user
   */
  static async getMyPendingStages(): Promise<WorkflowStageExecution[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('workflow_stage_executions')
      .select('*, workflow_instances(*)')
      .eq('assigned_to', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending stages:', error);
      throw new Error(`Failed to fetch pending stages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Approve a workflow stage
   */
  static async approveStage(
    stageExecutionId: string,
    notes?: string
  ): Promise<WorkflowDecisionResult> {
    const { data, error } = await supabase.rpc('decide_workflow_stage', {
      p_stage_execution_id: stageExecutionId,
      p_decision: 'approved',
      p_notes: notes || null
    });

    if (error) {
      console.error('Error approving stage:', error);
      throw new Error(`Failed to approve stage: ${error.message}`);
    }

    return data as WorkflowDecisionResult;
  }

  /**
   * Reject a workflow stage
   */
  static async rejectStage(
    stageExecutionId: string,
    notes?: string
  ): Promise<WorkflowDecisionResult> {
    const { data, error } = await supabase.rpc('decide_workflow_stage', {
      p_stage_execution_id: stageExecutionId,
      p_decision: 'rejected',
      p_notes: notes || null
    });

    if (error) {
      console.error('Error rejecting stage:', error);
      throw new Error(`Failed to reject stage: ${error.message}`);
    }

    return data as WorkflowDecisionResult;
  }

  /**
   * Assign a stage to a specific user
   */
  static async assignStageToUser(
    stageExecutionId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('workflow_stage_executions')
      .update({ assigned_to: userId })
      .eq('id', stageExecutionId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error assigning stage:', error);
      throw new Error(`Failed to assign stage: ${error.message}`);
    }
  }

  /**
   * Get workflow progress summary
   */
  static async getWorkflowProgress(workflowInstanceId: string): Promise<{
    total_stages: number;
    completed_stages: number;
    current_stage: number;
    status: string;
    stages: WorkflowStageExecution[];
  }> {
    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('*, workflow_definitions(*)')
      .eq('id', workflowInstanceId)
      .single();

    if (instanceError) {
      console.error('Error fetching workflow instance:', instanceError);
      throw new Error(`Failed to fetch workflow instance: ${instanceError.message}`);
    }

    const stages = await this.getStageExecutions(workflowInstanceId);
    const completedStages = stages.filter(s => s.status === 'approved').length;
    const totalStages = (instance.workflow_definitions as any).stages.length;

    return {
      total_stages: totalStages,
      completed_stages: completedStages,
      current_stage: instance.current_stage,
      status: instance.status,
      stages
    };
  }

  /**
   * Cancel a workflow instance
   */
  static async cancelWorkflow(workflowInstanceId: string): Promise<void> {
    const { error } = await supabase
      .from('workflow_instances')
      .update({ 
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', workflowInstanceId)
      .eq('status', 'in_progress');

    if (error) {
      console.error('Error cancelling workflow:', error);
      throw new Error(`Failed to cancel workflow: ${error.message}`);
    }
  }

  /**
   * Get workflow statistics for dashboard
   */
  static async getWorkflowStats(): Promise<{
    total_active: number;
    pending_my_action: number;
    completed_today: number;
    rejected_today: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total active workflows
    const { count: activeCount } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress');

    // Pending my action
    const { count: pendingCount } = await supabase
      .from('workflow_stage_executions')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user.id)
      .eq('status', 'pending');

    // Completed today
    const { count: completedCount } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString());

    // Rejected today
    const { count: rejectedCount } = await supabase
      .from('workflow_instances')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('completed_at', today.toISOString());

    return {
      total_active: activeCount || 0,
      pending_my_action: pendingCount || 0,
      completed_today: completedCount || 0,
      rejected_today: rejectedCount || 0
    };
  }
}

export default WorkflowEngineService;
