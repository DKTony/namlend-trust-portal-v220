/**
 * Settlement React Hooks — Convex-native.
 * Replaces legacy Supabase RPC calls with Convex useQuery/useAction.
 * All queries are reactive (auto-update on data changes).
 */

import { useQuery as useConvexQuery, useAction } from 'convex/react';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { SettlementRunState } from '@/types/settlement';

// ============================================================================
// SETTLEMENT RUNS
// ============================================================================

export function useSettlementRuns(params?: {
  dateFrom?: string;
  dateTo?: string;
  state?: SettlementRunState;
  limit?: number;
}) {
  const data = useConvexQuery(api.settlement.settlementRuns.listSettlementRuns, {
    state: params?.state as any,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    limit: params?.limit,
  });
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

export function useSettlementRunDetails(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementRuns.getSettlementRunDetails,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return { data: data ?? null, isLoading: data === undefined, error: null };
}

// ============================================================================
// PACS.009 BATCHES
// ============================================================================

export function usePacs009BatchDetails(batchId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementBatches.getBatch,
    batchId ? { batchId: batchId as Id<'settlementPacs009Batches'> } : 'skip'
  );
  return { data: data ?? null, isLoading: data === undefined, error: null };
}

export function usePacs009Batches(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementBatches.listBatchesByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

// ============================================================================
// REPORTS
// ============================================================================

export function useSettlementReports(params?: {
  runId?: string;
  reportType?: string;
  participantId?: string;
}) {
  const data = useConvexQuery(
    api.settlement.settlementReports.listReportsByRun,
    params?.runId ? { runId: params.runId as Id<'settlementRuns'> } : 'skip'
  );
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

export function useReportContent(reportId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementReports.getReport,
    reportId ? { reportId: reportId as Id<'settlementReports'> } : 'skip'
  );
  return { data: data ?? null, isLoading: data === undefined, error: null };
}

// ============================================================================
// ADJUSTMENTS
// ============================================================================

export function useSettlementAdjustments(params?: { status?: string; runId?: string }) {
  const byRun = useConvexQuery(
    api.settlement.settlementAdjustments.listAdjustmentsByRun,
    params?.runId ? { runId: params.runId as Id<'settlementRuns'> } : 'skip'
  );
  const pending = useConvexQuery(
    api.settlement.settlementAdjustments.listPendingAdjustments,
    !params?.runId ? {} : 'skip'
  );
  const data = params?.runId ? byRun : pending;
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

export function useUpdateAdjustmentStatus() {
  const { toast } = useToast();
  const approveAction = useAction(api.settlement.settlementAdjustments.approveAdjustment as any);
  const rejectAction = useAction(api.settlement.settlementAdjustments.rejectAdjustment as any);

  const mutate = useCallback(
    async ({
      adjustmentId,
      status,
      notes,
    }: {
      adjustmentId: string;
      status: string;
      notes?: string;
    }) => {
      try {
        if (status === 'approved') {
          await approveAction({ adjustmentId: adjustmentId as Id<'settlementAdjustments'>, notes });
        } else {
          await rejectAction({
            adjustmentId: adjustmentId as Id<'settlementAdjustments'>,
            reason: notes ?? 'Rejected',
          });
        }
        toast({
          title: 'Adjustment Updated',
          description: 'The adjustment status has been updated successfully.',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Failed to update adjustment: ${error.message}`,
          variant: 'destructive',
        });
      }
    },
    [approveAction, rejectAction, toast]
  );

  return { mutate, mutateAsync: mutate, isLoading: false, isPending: false };
}

// ============================================================================
// TIMEOUT TRANSACTIONS
// ============================================================================

export function useTimeoutTransactions(status?: string) {
  const data = useConvexQuery(api.settlement.settlementTimeouts.listPendingTimeouts, {});
  const filtered = status && data ? data.filter((t: any) => t.status === status) : data;
  return { data: filtered ?? [], isLoading: data === undefined, error: null };
}

export function useResolveTimeout() {
  const { toast } = useToast();
  const resolveAction = useAction(
    api.settlement.settlementTimeouts.resolveTimeoutTransaction as any
  );

  const mutate = useCallback(
    async ({
      timeoutId,
      status,
      notes,
    }: {
      timeoutId: string;
      status: 'resolved' | 'written_off';
      notes: string;
    }) => {
      try {
        await resolveAction({
          timeoutId: timeoutId as Id<'settlementTimeoutTransactions'>,
          resolution: status,
          notes,
        });
        toast({
          title: 'Timeout Resolved',
          description: 'The timeout transaction has been resolved.',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Failed to resolve timeout: ${error.message}`,
          variant: 'destructive',
        });
      }
    },
    [resolveAction, toast]
  );

  return { mutate, mutateAsync: mutate, isLoading: false, isPending: false };
}

// ============================================================================
// STATISTICS
// ============================================================================

export function useSettlementStatistics(dateFrom?: string, dateTo?: string) {
  const data = useConvexQuery(api.settlement.settlementRuns.getSettlementStatistics, {
    dateFrom,
    dateTo,
  });
  return { data: data ?? null, isLoading: data === undefined, error: null };
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

export function useSettlementParticipants() {
  const data = useConvexQuery(api.settlement.settlementParticipants.listParticipants, {});
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

// ============================================================================
// ACKNOWLEDGEMENTS
// ============================================================================

export function useAcknowledgements(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementAcknowledgements.listAcknowledgementsByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

// ============================================================================
// SETTLEMENT PROCESSING MUTATIONS (Actions)
// ============================================================================

export function useCreateSettlementRun() {
  const { toast } = useToast();
  const createAction = useAction(api.settlement.settlementActions.createSettlementRun);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (params?: { settlementDate?: string; windowId?: string }) => {
      setIsPending(true);
      try {
        const runId = await createAction({
          windowId: params?.windowId || 'SW1',
          settlementDate: params?.settlementDate || new Date().toISOString().split('T')[0],
        });
        toast({ title: 'Settlement Run Created', description: `Run created successfully.` });
        return { success: true, run_id: runId };
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Failed to create settlement run: ${error.message}`,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      } finally {
        setIsPending(false);
      }
    },
    [createAction, toast]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function useProcessSettlementRun() {
  const { toast } = useToast();
  const processAction = useAction(api.settlement.settlementActions.processSettlementRun);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async ({ runId }: { runId: string; dateFrom?: string; dateTo?: string }) => {
      setIsPending(true);
      try {
        const result = await processAction({ runId: runId as Id<'settlementRuns'> });
        toast({
          title: 'Settlement Processed',
          description: `Processed ${result.obligationCount} obligations, created ${result.batchCount} batches.`,
        });
        return { success: true, ...result };
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Failed to process settlement: ${error.message}`,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      } finally {
        setIsPending(false);
      }
    },
    [processAction, toast]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function useMarkSettlementSettled() {
  const { toast } = useToast();
  const settleAction = useAction(api.settlement.settlementActions.markSettlementSettled);
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (runId: string) => {
      setIsPending(true);
      try {
        await settleAction({ runId: runId as Id<'settlementRuns'> });
        toast({
          title: 'Settlement Settled',
          description: 'Settlement run has been marked as settled.',
        });
        return { success: true };
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Failed to settle: ${error.message}`,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      } finally {
        setIsPending(false);
      }
    },
    [settleAction, toast]
  );

  return { mutate, mutateAsync: mutate, isPending, isLoading: isPending };
}

export function useSettlementObligations(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementObligations.listObligationsByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

export function useNetInstructions(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementNetting.listNetInstructionsByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

export function useSettlementWindows() {
  const data = useConvexQuery(api.settlement.settlementParticipants.listSettlementWindows, {});
  return { data: data ?? [], isLoading: data === undefined, error: null };
}

// Legacy key exports for backward compatibility with any TanStack Query consumers
export const settlementKeys = {
  all: ['settlement'] as const,
  runs: () => ['settlement', 'runs'] as const,
  runsList: (filters: Record<string, unknown>) => ['settlement', 'runs', filters] as const,
  runDetails: (id: string) => ['settlement', 'runs', id] as const,
  batches: () => ['settlement', 'batches'] as const,
  batchDetails: (id: string) => ['settlement', 'batches', id] as const,
  reports: () => ['settlement', 'reports'] as const,
  reportsList: (filters: Record<string, unknown>) => ['settlement', 'reports', filters] as const,
  reportContent: (id: string) => ['settlement', 'reports', id] as const,
  adjustments: () => ['settlement', 'adjustments'] as const,
  adjustmentsList: (filters: Record<string, unknown>) =>
    ['settlement', 'adjustments', filters] as const,
  timeouts: () => ['settlement', 'timeouts'] as const,
  timeoutsList: (status?: string) => ['settlement', 'timeouts', status] as const,
  statistics: (from?: string, to?: string) => ['settlement', 'statistics', from, to] as const,
  participants: () => ['settlement', 'participants'] as const,
  acknowledgements: (runId: string) => ['settlement', 'acks', runId] as const,
};
