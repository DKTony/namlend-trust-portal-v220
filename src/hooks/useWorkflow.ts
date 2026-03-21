/**
 * React Hooks for Workflow Engine — Convex-native.
 * Replaces legacy Supabase RPC/table calls with Convex queries/mutations.
 */

import { useQuery as useConvexQuery, useMutation } from 'convex/react';
import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { Id } from '../../../convex/_generated/dataModel';

// ============================================================================
// useWorkflowInstance - Get workflow instance for an entity
// ============================================================================

export const useWorkflowInstance = (entityType: string, entityId: string) => {
  const instances = useConvexQuery(
    api.approvalWorkflow.getApprovalsByEntity,
    entityId ? { entityId } : 'skip'
  );
  const instance = instances?.[0] ?? null;
  return {
    instance: instance
      ? {
          id: String(instance._id),
          workflow_definition_id: '',
          entity_type: instance.entityType,
          entity_id: instance.entityId,
          status:
            instance.status === 'approved'
              ? ('completed' as const)
              : instance.status === 'rejected'
                ? ('rejected' as const)
                : ('in_progress' as const),
          current_stage: 1,
          started_by: String(instance.requestedBy),
          metadata: {},
          created_at: new Date(instance.createdAt).toISOString(),
        }
      : null,
    loading: instances === undefined,
    error: null,
    refetch: () => {},
  };
};

// ============================================================================
// useWorkflowProgress - Get workflow progress with stages
// ============================================================================

export const useWorkflowProgress = (workflowInstanceId: string | null) => {
  const history = useConvexQuery(
    api.approvalWorkflow.getApprovalHistory,
    workflowInstanceId ? { requestId: workflowInstanceId as Id<'approvalRequests'> } : 'skip'
  );

  const progress = useMemo(() => {
    if (!history) return null;
    const completedStages = history.filter((h) => h.toStatus === 'approved').length;
    return {
      total_stages: Math.max(history.length, 1),
      completed_stages: completedStages,
      current_stage: history.length,
      status: completedStages > 0 ? 'completed' : 'in_progress',
      stages: history.map((h, i) => ({
        id: String(h._id),
        workflow_instance_id: workflowInstanceId || '',
        stage_number: i + 1,
        stage_name: h.action,
        assigned_role: 'staff',
        status:
          h.toStatus === 'approved'
            ? ('approved' as const)
            : h.toStatus === 'rejected'
              ? ('rejected' as const)
              : ('pending' as const),
        decision: h.action,
        decision_notes: h.notes,
        decided_by: String(h.actorId),
        decided_at: new Date(h.createdAt).toISOString(),
        created_at: new Date(h.createdAt).toISOString(),
      })),
    };
  }, [history, workflowInstanceId]);

  return { progress, loading: history === undefined, error: null, refetch: () => {} };
};

// ============================================================================
// useMyPendingStages - Get stages pending user's action
// ============================================================================

export const useMyPendingStages = () => {
  const pendingRequests = useConvexQuery(api.approvalWorkflow.adminListApprovals, {
    status: 'pending',
  });
  const stages = useMemo(() => {
    if (!pendingRequests) return [];
    return pendingRequests.map((r) => ({
      id: String(r._id),
      workflow_instance_id: String(r._id),
      stage_number: 1,
      stage_name: r.requestType,
      assigned_role: 'staff',
      status: 'pending' as const,
      created_at: new Date(r.createdAt).toISOString(),
    }));
  }, [pendingRequests]);

  return { stages, loading: pendingRequests === undefined, error: null, refetch: () => {} };
};

// ============================================================================
// useWorkflowActions - Actions for approving/rejecting stages
// ============================================================================

export const useWorkflowActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const processRequest = useMutation(api.approvalWorkflow.processApprovalRequest);

  const approveStage = useCallback(
    async (stageExecutionId: string, notes?: string) => {
      try {
        setLoading(true);
        await processRequest({
          requestId: stageExecutionId as Id<'approvalRequests'>,
          action: 'approve',
          notes,
        });
        toast({
          title: 'Stage Approved',
          description: 'The approval has been processed.',
          duration: 5000,
        });
        return { workflow_status: 'completed' as const, message: 'Approved' };
      } catch (err) {
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
    },
    [processRequest, toast]
  );

  const rejectStage = useCallback(
    async (stageExecutionId: string, notes?: string) => {
      try {
        setLoading(true);
        await processRequest({
          requestId: stageExecutionId as Id<'approvalRequests'>,
          action: 'reject',
          notes,
        });
        toast({
          title: 'Stage Rejected',
          description: 'The rejection has been processed.',
          variant: 'destructive',
          duration: 5000,
        });
        return { workflow_status: 'rejected' as const, message: 'Rejected' };
      } catch (err) {
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
    },
    [processRequest, toast]
  );

  const assignStage = useCallback(
    async (_stageExecutionId: string, _userId: string) => {
      toast({
        title: 'Assignment',
        description: 'Stage assignment is handled by the approval workflow.',
        duration: 3000,
      });
    },
    [toast]
  );

  const cancelWorkflow = useCallback(
    async (workflowInstanceId: string) => {
      try {
        setLoading(true);
        await processRequest({
          requestId: workflowInstanceId as Id<'approvalRequests'>,
          action: 'withdraw',
        });
        toast({
          title: 'Workflow Cancelled',
          description: 'The workflow has been cancelled',
          duration: 3000,
        });
      } catch (err) {
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
    },
    [processRequest, toast]
  );

  return { approveStage, rejectStage, assignStage, cancelWorkflow, loading };
};

// ============================================================================
// useWorkflowStats - Dashboard statistics
// ============================================================================

export const useWorkflowStats = () => {
  const pendingApprovals = useConvexQuery(api.approvalWorkflow.adminListApprovals, {
    status: 'pending',
  });
  const allApprovals = useConvexQuery(api.approvalWorkflow.adminListApprovals, {});

  const stats = useMemo(() => {
    if (pendingApprovals === undefined || allApprovals === undefined) return null;
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    return {
      total_active: pendingApprovals.length,
      pending_my_action: pendingApprovals.length,
      completed_today: (allApprovals ?? []).filter(
        (a) => a.status === 'approved' && a.updatedAt >= todayMs
      ).length,
      rejected_today: (allApprovals ?? []).filter(
        (a) => a.status === 'rejected' && a.updatedAt >= todayMs
      ).length,
    };
  }, [pendingApprovals, allApprovals]);

  return { stats, loading: stats === null, error: null, refetch: () => {} };
};

// ============================================================================
// useActiveWorkflow - Get active workflow definition
// ============================================================================

export const useActiveWorkflow = (entityType: string) => {
  const definitions = useConvexQuery(api.approvalWorkflow.listWorkflowDefinitions);
  const workflow = useMemo(() => {
    if (!definitions) return null;
    return definitions.find((d) => d.entityType === entityType && d.isActive) ?? null;
  }, [definitions, entityType]);

  return {
    workflow: workflow
      ? {
          id: String(workflow._id),
          name: workflow.name,
          description: '',
          entity_type: workflow.entityType as
            | 'loan_application'
            | 'disbursement'
            | 'kyc'
            | 'settlement',
          version: 1,
          is_active: workflow.isActive,
          stages: workflow.stages.map((s) => ({
            stage_number: s.order,
            name: s.name,
            assigned_role: s.requiredRole,
            is_optional: false,
          })),
          created_at: new Date(workflow.createdAt).toISOString(),
          updated_at: new Date(workflow.updatedAt).toISOString(),
          created_by: '',
        }
      : null,
    loading: definitions === undefined,
    error: null,
    refetch: () => {},
  };
};
