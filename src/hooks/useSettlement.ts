/**
 * Settlement React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as settlementService from '@/services/settlementService';
import type { SettlementRunState, SettlementReportType } from '@/types/settlement';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const settlementKeys = {
  all: ['settlement'] as const,
  runs: () => [...settlementKeys.all, 'runs'] as const,
  runsList: (filters: Record<string, unknown>) => [...settlementKeys.runs(), filters] as const,
  runDetails: (id: string) => [...settlementKeys.runs(), id] as const,
  batches: () => [...settlementKeys.all, 'batches'] as const,
  batchDetails: (id: string) => [...settlementKeys.batches(), id] as const,
  reports: () => [...settlementKeys.all, 'reports'] as const,
  reportsList: (filters: Record<string, unknown>) =>
    [...settlementKeys.reports(), filters] as const,
  reportContent: (id: string) => [...settlementKeys.reports(), id] as const,
  adjustments: () => [...settlementKeys.all, 'adjustments'] as const,
  adjustmentsList: (filters: Record<string, unknown>) =>
    [...settlementKeys.adjustments(), filters] as const,
  timeouts: () => [...settlementKeys.all, 'timeouts'] as const,
  timeoutsList: (status?: string) => [...settlementKeys.timeouts(), status] as const,
  statistics: (from?: string, to?: string) =>
    [...settlementKeys.all, 'statistics', from, to] as const,
  participants: () => [...settlementKeys.all, 'participants'] as const,
  acknowledgements: (runId: string) => [...settlementKeys.all, 'acks', runId] as const,
};

// ============================================================================
// SETTLEMENT RUNS
// ============================================================================

export function useSettlementRuns(params?: {
  dateFrom?: string;
  dateTo?: string;
  state?: SettlementRunState;
  limit?: number;
}) {
  return useQuery({
    queryKey: settlementKeys.runsList(params || {}),
    queryFn: () => settlementService.getSettlementRuns(params),
    select: (result) => result.data ?? [],
  });
}

export function useSettlementRunDetails(runId: string | undefined) {
  return useQuery({
    queryKey: settlementKeys.runDetails(runId || ''),
    queryFn: () => settlementService.getSettlementRunDetails(runId!),
    enabled: !!runId,
    select: (result) => result.data ?? null,
  });
}

// ============================================================================
// PACS.009 BATCHES
// ============================================================================

export function usePacs009BatchDetails(batchId: string | undefined) {
  return useQuery({
    queryKey: settlementKeys.batchDetails(batchId || ''),
    queryFn: () => settlementService.getPacs009BatchDetails(batchId!),
    enabled: !!batchId,
    select: (result) => result.data ?? null,
  });
}

export function usePacs009Batches(runId: string | undefined) {
  return useQuery({
    queryKey: [...settlementKeys.batches(), 'run', runId],
    queryFn: () => settlementService.getPacs009Batches(runId!),
    enabled: !!runId,
    select: (result) => result.data ?? [],
  });
}

// ============================================================================
// REPORTS
// ============================================================================

export function useSettlementReports(params?: {
  runId?: string;
  reportType?: SettlementReportType;
  participantId?: string;
}) {
  return useQuery({
    queryKey: settlementKeys.reportsList(params || {}),
    queryFn: () => settlementService.getSettlementReports(params),
    select: (result) => result.data ?? [],
  });
}

export function useReportContent(reportId: string | undefined) {
  return useQuery({
    queryKey: settlementKeys.reportContent(reportId || ''),
    queryFn: () => settlementService.getReportContent(reportId!),
    enabled: !!reportId,
  });
}

// ============================================================================
// ADJUSTMENTS
// ============================================================================

export function useSettlementAdjustments(params?: { status?: string; runId?: string }) {
  return useQuery({
    queryKey: settlementKeys.adjustmentsList(params || {}),
    queryFn: () => settlementService.getSettlementAdjustments(params),
  });
}

export function useUpdateAdjustmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      adjustmentId,
      status,
      notes,
    }: {
      adjustmentId: string;
      status: string;
      notes?: string;
    }) => settlementService.updateAdjustmentStatus(adjustmentId, status, notes),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.adjustments() });
      toast({
        title: 'Adjustment Updated',
        description: 'The adjustment status has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update adjustment: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// TIMEOUT TRANSACTIONS
// ============================================================================

export function useTimeoutTransactions(status?: string) {
  return useQuery({
    queryKey: settlementKeys.timeoutsList(status),
    queryFn: () => settlementService.getTimeoutTransactions(status),
  });
}

export function useResolveTimeout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      timeoutId,
      status,
      notes,
    }: {
      timeoutId: string;
      status: 'resolved' | 'written_off';
      notes: string;
    }) => settlementService.resolveTimeoutTransaction(timeoutId, status, notes),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settlementKeys.timeouts() });
      toast({
        title: 'Timeout Resolved',
        description: 'The timeout transaction has been resolved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to resolve timeout: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// STATISTICS
// ============================================================================

export function useSettlementStatistics(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: settlementKeys.statistics(dateFrom, dateTo),
    queryFn: () => settlementService.getSettlementStatistics(dateFrom, dateTo),
  });
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

export function useSettlementParticipants() {
  return useQuery({
    queryKey: settlementKeys.participants(),
    queryFn: () => settlementService.getSettlementParticipants(),
  });
}

// ============================================================================
// ACKNOWLEDGEMENTS
// ============================================================================

export function useAcknowledgements(runId: string | undefined) {
  return useQuery({
    queryKey: settlementKeys.acknowledgements(runId || ''),
    queryFn: () => settlementService.getAcknowledgements(runId!),
    enabled: !!runId,
  });
}

// ============================================================================
// SETTLEMENT PROCESSING MUTATIONS
// ============================================================================

export function useCreateSettlementRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params?: { settlementDate?: string; windowId?: string }) =>
      settlementService.createSettlementRun(params),
    retry: false,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: settlementKeys.runs() });
        toast({
          title: 'Settlement Run Created',
          description: `Run ${data.run_code} created successfully.`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create settlement run',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create settlement run: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useProcessSettlementRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      runId,
      dateFrom,
      dateTo,
    }: {
      runId: string;
      dateFrom?: string;
      dateTo?: string;
    }) => settlementService.processSettlementRun(runId, dateFrom, dateTo),
    retry: false,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: settlementKeys.all });
        toast({
          title: 'Settlement Processed',
          description: `Processed ${data.ingest?.transactions_processed || 0} transactions, created ${data.batches?.batches_created || 0} batches.`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to process settlement',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to process settlement: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkSettlementSettled() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (runId: string) => settlementService.markSettlementSettled(runId),
    retry: false,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: settlementKeys.all });
        toast({
          title: 'Settlement Settled',
          description: 'Settlement run has been marked as settled.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to mark settlement as settled',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to settle: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useSettlementObligations(runId: string | undefined) {
  return useQuery({
    queryKey: [...settlementKeys.all, 'obligations', runId],
    queryFn: () => settlementService.getSettlementObligations(runId!),
    enabled: !!runId,
  });
}

export function useNetInstructions(runId: string | undefined) {
  return useQuery({
    queryKey: [...settlementKeys.all, 'net-instructions', runId],
    queryFn: () => settlementService.getNetInstructions(runId!),
    enabled: !!runId,
  });
}

export function useSettlementWindows() {
  return useQuery({
    queryKey: [...settlementKeys.all, 'windows'],
    queryFn: () => settlementService.getSettlementWindows(),
  });
}
