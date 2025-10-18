/**
 * React Hooks for Workflow Engine
 * Version: v2.4.0
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import WorkflowEngineService, {
  WorkflowInstance,
  WorkflowStageExecution,
  WorkflowDefinition
} from '@/services/workflowEngine';

// ============================================================================
// useWorkflowInstance - Get workflow instance for an entity
// ============================================================================

export const useWorkflowInstance = (entityType: string, entityId: string) => {
  const [instance, setInstance] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WorkflowEngineService.getWorkflowInstance(entityType, entityId);
      setInstance(data);
    } catch (err) {
      console.error('Error fetching workflow instance:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      fetchInstance();
    }
  }, [entityType, entityId]);

  return { instance, loading, error, refetch: fetchInstance };
};

// ============================================================================
// useWorkflowProgress - Get workflow progress with stages
// ============================================================================

export const useWorkflowProgress = (workflowInstanceId: string | null) => {
  const [progress, setProgress] = useState<{
    total_stages: number;
    completed_stages: number;
    current_stage: number;
    status: string;
    stages: WorkflowStageExecution[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    if (!workflowInstanceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await WorkflowEngineService.getWorkflowProgress(workflowInstanceId);
      setProgress(data);
    } catch (err) {
      console.error('Error fetching workflow progress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [workflowInstanceId]);

  return { progress, loading, error, refetch: fetchProgress };
};

// ============================================================================
// useMyPendingStages - Get stages pending user's action
// ============================================================================

export const useMyPendingStages = () => {
  const [stages, setStages] = useState<WorkflowStageExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WorkflowEngineService.getMyPendingStages();
      setStages(data);
    } catch (err) {
      console.error('Error fetching pending stages:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  return { stages, loading, error, refetch: fetchStages };
};

// ============================================================================
// useWorkflowActions - Actions for approving/rejecting stages
// ============================================================================

export const useWorkflowActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const approveStage = async (stageExecutionId: string, notes?: string) => {
    try {
      setLoading(true);
      const result = await WorkflowEngineService.approveStage(stageExecutionId, notes);
      
      toast({
        title: 'Stage Approved',
        description: result.message,
        duration: 5000,
      });

      return result;
    } catch (err) {
      console.error('Error approving stage:', err);
      toast({
        title: 'Approval Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectStage = async (stageExecutionId: string, notes?: string) => {
    try {
      setLoading(true);
      const result = await WorkflowEngineService.rejectStage(stageExecutionId, notes);
      
      toast({
        title: 'Stage Rejected',
        description: result.message,
        variant: 'destructive',
        duration: 5000,
      });

      return result;
    } catch (err) {
      console.error('Error rejecting stage:', err);
      toast({
        title: 'Rejection Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const assignStage = async (stageExecutionId: string, userId: string) => {
    try {
      setLoading(true);
      await WorkflowEngineService.assignStageToUser(stageExecutionId, userId);
      
      toast({
        title: 'Stage Assigned',
        description: 'Stage has been assigned successfully',
        duration: 3000,
      });
    } catch (err) {
      console.error('Error assigning stage:', err);
      toast({
        title: 'Assignment Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelWorkflow = async (workflowInstanceId: string) => {
    try {
      setLoading(true);
      await WorkflowEngineService.cancelWorkflow(workflowInstanceId);
      
      toast({
        title: 'Workflow Cancelled',
        description: 'The workflow has been cancelled',
        duration: 3000,
      });
    } catch (err) {
      console.error('Error cancelling workflow:', err);
      toast({
        title: 'Cancellation Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    approveStage,
    rejectStage,
    assignStage,
    cancelWorkflow,
    loading
  };
};

// ============================================================================
// useWorkflowStats - Dashboard statistics
// ============================================================================

export const useWorkflowStats = () => {
  const [stats, setStats] = useState<{
    total_active: number;
    pending_my_action: number;
    completed_today: number;
    rejected_today: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WorkflowEngineService.getWorkflowStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching workflow stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};

// ============================================================================
// useActiveWorkflow - Get active workflow definition
// ============================================================================

export const useActiveWorkflow = (entityType: string) => {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await WorkflowEngineService.getActiveWorkflow(entityType);
      setWorkflow(data);
    } catch (err) {
      console.error('Error fetching active workflow:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType) {
      fetchWorkflow();
    }
  }, [entityType]);

  return { workflow, loading, error, refetch: fetchWorkflow };
};
