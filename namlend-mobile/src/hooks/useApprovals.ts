/**
 * Approvals Hook with React Query
 * Version: v2.4.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalService } from '../services/approvalService';

/**
 * Get approval queue
 */
export const useApprovalQueue = (filters?: {
  status?: string;
  priority?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['approvals', 'queue', filters],
    queryFn: () => ApprovalService.getApprovalQueue(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get pending workflow stages
 */
export const useMyPendingStages = () => {
  return useQuery({
    queryKey: ['workflow', 'pending-stages'],
    queryFn: () => ApprovalService.getMyPendingStages(),
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Get approval statistics
 */
export const useApprovalStats = () => {
  return useQuery({
    queryKey: ['approvals', 'stats'],
    queryFn: () => ApprovalService.getApprovalStats(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Approve request mutation
 */
export const useApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes?: string }) =>
      ApprovalService.approveRequest(requestId, notes),
    onSuccess: () => {
      // Invalidate and refetch approval queries
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
    },
  });
};

/**
 * Reject request mutation
 */
export const useRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes: string }) =>
      ApprovalService.rejectRequest(requestId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
    },
  });
};

/**
 * Approve workflow stage mutation
 */
export const useApproveWorkflowStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stageId, notes }: { stageId: string; notes?: string }) =>
      ApprovalService.approveWorkflowStage(stageId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
};

/**
 * Reject workflow stage mutation
 */
export const useRejectWorkflowStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stageId, notes }: { stageId: string; notes: string }) =>
      ApprovalService.rejectWorkflowStage(stageId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
};
