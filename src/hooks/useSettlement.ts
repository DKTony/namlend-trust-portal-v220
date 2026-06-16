/**
 * Settlement React Hooks — Convex-native.
 * Replaces legacy Supabase RPC calls with Convex useQuery/useAction.
 * All queries are reactive (auto-update on data changes).
 */

import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { SettlementRunState } from '@/types/settlement';
import { useAction, useQuery as useConvexQuery, useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import type { Id } from '../../convex/_generated/dataModel';

const noopRefetch = () => undefined;

function docId(row: any): string {
  return String(row?.id ?? row?._id ?? '');
}

function toIso(value: any): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return new Date(value).toISOString();
  return String(value);
}

function toDateOnly(value: any): string {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function parseRunSlug(value?: string) {
  const match = value?.match(/SR-(\d{8})-(SW\d)/i);
  if (!match) return null;
  const [, compactDate, windowId] = match;
  return {
    settlementDate: `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`,
    windowId: windowId.toUpperCase(),
  };
}

function mapRun(run: any) {
  if (!run) return run;
  return {
    ...run,
    id: docId(run),
    run_id: run.run_id ?? run.runId,
    window_id: run.window_id ?? run.windowId,
    settlement_date: run.settlement_date ?? run.settlementDate,
    scheme_version: run.scheme_version ?? run.schemeVersion,
    amendment_seq: run.amendment_seq ?? run.amendmentSeq,
    transaction_count: run.transaction_count ?? run.transactionCount ?? 0,
    total_principal: run.total_principal ?? run.totalPrincipal ?? 0,
    total_interchange: run.total_interchange ?? run.totalInterchange ?? 0,
    total_switching_fee: run.total_switching_fee ?? run.totalSwitchingFee ?? 0,
    net_instruction_count: run.net_instruction_count ?? run.netInstructionCount ?? 0,
    cutoff_at: toIso(run.cutoff_at ?? run.cutoffAt),
    netting_completed_at: toIso(run.netting_completed_at ?? run.nettingCompletedAt),
    generated_at: toIso(run.generated_at ?? run.generatedAt),
    dispatched_at: toIso(run.dispatched_at ?? run.dispatchedAt),
    settled_at: toIso(run.settled_at ?? run.settledAt),
    closed_at: toIso(run.closed_at ?? run.closedAt),
    created_by: run.created_by ?? run.createdBy ?? null,
    created_at: toIso(run.created_at ?? run.createdAt),
    updated_at: toIso(run.updated_at ?? run.updatedAt),
  };
}

function mapBatch(batch: any) {
  if (!batch) return batch;
  return {
    ...batch,
    id: docId(batch),
    run_id: String(batch.run_id ?? batch.runId ?? ''),
    batch_type: batch.batch_type ?? batch.batchType,
    msg_id: batch.msg_id ?? batch.msgId,
    file_name: batch.file_name ?? batch.fileName,
    file_content: batch.file_content ?? batch.fileContent ?? null,
    file_checksum: batch.file_checksum ?? batch.fileChecksum ?? null,
    file_size: batch.file_size ?? batch.fileSize ?? null,
    instruction_count: batch.instruction_count ?? batch.instructionCount ?? 0,
    total_amount: batch.total_amount ?? batch.totalAmount ?? 0,
    dispatched_at: toIso(batch.dispatched_at ?? batch.dispatchedAt),
    validated_at: toIso(batch.validated_at ?? batch.validatedAt),
    accepted_at: toIso(batch.accepted_at ?? batch.acceptedAt),
    failed_at: toIso(batch.failed_at ?? batch.failedAt),
    failure_reason: batch.failure_reason ?? batch.failureReason ?? null,
    created_at: toIso(batch.created_at ?? batch.createdAt),
    updated_at: toIso(batch.updated_at ?? batch.updatedAt),
  };
}

function mapReport(report: any) {
  if (!report) return report;
  const parsedRun = parseRunSlug(report.file_name ?? report.fileName);
  return {
    ...report,
    id: docId(report),
    run_id: String(report.run_id ?? report.runId ?? ''),
    run_date:
      report.run_date ??
      parsedRun?.settlementDate ??
      toDateOnly(report.created_at ?? report.createdAt),
    window_id: report.window_id ?? parsedRun?.windowId ?? 'SW1',
    participant_id: report.participant_id ?? report.participantId ?? null,
    participant_name: report.participant_name ?? report.participantName ?? null,
    report_type: report.report_type ?? report.reportType,
    file_name: report.file_name ?? report.fileName,
    file_content: report.file_content ?? report.fileContent ?? null,
    file_checksum: report.file_checksum ?? report.fileChecksum ?? null,
    file_size: report.file_size ?? report.fileSize ?? null,
    report_data: report.report_data ?? report.reportData ?? null,
    distributed_at: toIso(report.distributed_at ?? report.distributedAt),
    distribution_channel: report.distribution_channel ?? report.distributionChannel ?? null,
    created_at: toIso(report.created_at ?? report.createdAt),
  };
}

function mapParticipant(participant: any) {
  if (!participant) return participant;
  return {
    ...participant,
    id: docId(participant),
    routing_code: participant.routing_code ?? participant.routingCode,
    swift_bic: participant.swift_bic ?? participant.swiftBic,
    participant_type: participant.participant_type ?? participant.participantType,
    sponsor_id: participant.sponsor_id ?? participant.sponsorId ?? null,
    niss_account_ref: participant.niss_account_ref ?? participant.nissAccountRef ?? null,
    is_operator: participant.is_operator ?? participant.isOperator ?? false,
    created_at: toIso(participant.created_at ?? participant.createdAt),
    updated_at: toIso(participant.updated_at ?? participant.updatedAt),
  };
}

function participantLabel(id: any) {
  return id ? String(id).slice(-10) : 'Unknown';
}

function mapNetInstruction(instruction: any) {
  if (!instruction) return instruction;
  const sourceId = instruction.source_participant_id ?? instruction.sourceParticipantId;
  const targetId = instruction.target_participant_id ?? instruction.targetParticipantId;
  return {
    ...instruction,
    id: docId(instruction),
    run_id: String(instruction.run_id ?? instruction.runId ?? ''),
    instruction_id: instruction.instruction_id ?? instruction.instructionId,
    source_participant_id: String(sourceId ?? ''),
    target_participant_id: String(targetId ?? ''),
    source: instruction.source ?? participantLabel(sourceId),
    source_bic: instruction.source_bic ?? participantLabel(sourceId),
    target: instruction.target ?? participantLabel(targetId),
    target_bic: instruction.target_bic ?? participantLabel(targetId),
    category_group: instruction.category_group ?? instruction.categoryGroup,
    batch_type: instruction.batch_type ?? instruction.batchType,
    end_to_end_id: instruction.end_to_end_id ?? instruction.endToEndId ?? null,
    created_at: toIso(instruction.created_at ?? instruction.createdAt),
  };
}

function mapExposure(exposure: any) {
  if (!exposure) return exposure;
  const participantId = exposure.participant_id ?? exposure.participantId;
  return {
    ...exposure,
    id: docId(exposure),
    run_id: String(exposure.run_id ?? exposure.runId ?? ''),
    participant_id: String(participantId ?? ''),
    participant: exposure.participant ?? participantLabel(participantId),
    gross_payables: exposure.gross_payables ?? exposure.grossPayables ?? 0,
    gross_receivables: exposure.gross_receivables ?? exposure.grossReceivables ?? 0,
    net_position: exposure.net_position ?? exposure.netPosition ?? 0,
    switching_fee_payable: exposure.switching_fee_payable ?? exposure.switchingFeePayable ?? 0,
    interchange_net: exposure.interchange_net ?? exposure.interchangeNet ?? 0,
    calculated_at: toIso(exposure.calculated_at ?? exposure.calculatedAt),
  };
}

function mapAcknowledgement(ack: any) {
  if (!ack) return ack;
  return {
    ...ack,
    id: docId(ack),
    msg_id: ack.msg_id ?? ack.msgId,
    ack_type: ack.ack_type ?? ack.ackType,
    batch_id: String(ack.batch_id ?? ack.batchId ?? ''),
    run_id: String(ack.run_id ?? ack.runId ?? ''),
    raw_payload: ack.raw_payload ?? ack.rawPayload ?? null,
    error_code: ack.error_code ?? ack.errorCode ?? null,
    error_description: ack.error_description ?? ack.errorDescription ?? null,
    received_at: toIso(ack.received_at ?? ack.receivedAt),
    processed_at: toIso(ack.processed_at ?? ack.processedAt),
    created_at: toIso(ack.created_at ?? ack.createdAt),
  };
}

function mapAdjustment(adjustment: any) {
  if (!adjustment) return adjustment;
  return {
    ...adjustment,
    id: docId(adjustment),
    run_id: String(adjustment.run_id ?? adjustment.runId ?? ''),
    original_tx_id: String(adjustment.original_tx_id ?? adjustment.originalTxId ?? ''),
    adjustment_type: adjustment.adjustment_type ?? adjustment.adjustmentType,
    source_participant_id: String(
      adjustment.source_participant_id ?? adjustment.sourceParticipantId ?? ''
    ),
    target_participant_id: String(
      adjustment.target_participant_id ?? adjustment.targetParticipantId ?? ''
    ),
    source_participant: participantLabel(
      adjustment.source_participant_id ?? adjustment.sourceParticipantId
    ),
    target_participant: participantLabel(
      adjustment.target_participant_id ?? adjustment.targetParticipantId
    ),
    reason_code: adjustment.reason_code ?? adjustment.reasonCode ?? null,
    reason_description: adjustment.reason_description ?? adjustment.reasonDescription ?? null,
    response_required_by: toIso(adjustment.response_required_by ?? adjustment.responseRequiredBy),
    responded_at: toIso(adjustment.responded_at ?? adjustment.respondedAt),
    response_notes: adjustment.response_notes ?? adjustment.responseNotes ?? null,
    settled_in_run_id: String(adjustment.settled_in_run_id ?? adjustment.settledInRunId ?? ''),
    created_at: toIso(adjustment.created_at ?? adjustment.createdAt),
    updated_at: toIso(adjustment.updated_at ?? adjustment.updatedAt),
  };
}

function mapTimeout(timeout: any) {
  if (!timeout) return timeout;
  return {
    ...timeout,
    id: docId(timeout),
    run_id: String(timeout.run_id ?? timeout.runId ?? ''),
    original_tx_id: String(timeout.original_tx_id ?? timeout.originalTxId ?? ''),
    participant_id: String(timeout.participant_id ?? timeout.participantId ?? ''),
    counterparty_id: String(timeout.counterparty_id ?? timeout.counterpartyId ?? ''),
    participant: participantLabel(timeout.participant_id ?? timeout.participantId),
    counterparty: participantLabel(timeout.counterparty_id ?? timeout.counterpartyId),
    timeout_reason: timeout.timeout_reason ?? timeout.timeoutReason ?? null,
    resolution_notes: timeout.resolution_notes ?? timeout.resolutionNotes ?? null,
    resolved_at: toIso(timeout.resolved_at ?? timeout.resolvedAt),
    created_at: toIso(timeout.created_at ?? timeout.createdAt),
    updated_at: toIso(timeout.updated_at ?? timeout.updatedAt),
  };
}

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
  return {
    data: (data ?? []).map(mapRun),
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
}

export function useSettlementRunDetails(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementRuns.getSettlementRunDetails,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  const mapped = data
    ? {
        ...data,
        run: mapRun((data as any).run),
        obligations: ((data as any).obligations ?? []).map((obligation: any) => ({
          ...obligation,
          id: docId(obligation),
          run_id: String(obligation.run_id ?? obligation.runId ?? ''),
          source_participant_id: String(
            obligation.source_participant_id ?? obligation.sourceParticipantId ?? ''
          ),
          target_participant_id: String(
            obligation.target_participant_id ?? obligation.targetParticipantId ?? ''
          ),
          source_tx_id: String(obligation.source_tx_id ?? obligation.sourceTxId ?? ''),
          fee_rule_id: String(obligation.fee_rule_id ?? obligation.feeRuleId ?? ''),
          created_at: toIso(obligation.created_at ?? obligation.createdAt),
        })),
        batches: ((data as any).batches ?? []).map(mapBatch),
        net_instructions: (
          (data as any).net_instructions ??
          (data as any).netInstructions ??
          []
        ).map(mapNetInstruction),
        exposures: ((data as any).exposures ?? []).map(mapExposure),
        acknowledgements: ((data as any).acknowledgements ?? []).map(mapAcknowledgement),
      }
    : null;
  return { data: mapped, isLoading: data === undefined, isError: false, error: null };
}

// ============================================================================
// PACS.009 BATCHES
// ============================================================================

export function usePacs009BatchDetails(batchId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementBatches.getBatch,
    batchId ? { batchId: batchId as Id<'settlementPacs009Batches'> } : 'skip'
  );
  const mapped = data ? { batch: mapBatch(data), instructions: [] } : null;
  return { data: mapped, isLoading: data === undefined, isError: false, error: null };
}

export function usePacs009Batches(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementBatches.listBatchesByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return {
    data: (data ?? []).map(mapBatch),
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
}

// ============================================================================
// REPORTS
// ============================================================================

export function useSettlementReports(params?: {
  runId?: string;
  reportType?: string;
  participantId?: string;
}) {
  const byRun = useConvexQuery(
    api.settlement.settlementReports.listReportsByRun,
    params?.runId ? { runId: params.runId as Id<'settlementRuns'> } : 'skip'
  );
  const recent = useConvexQuery(
    api.settlement.settlementReports.listRecentReports,
    params?.runId ? 'skip' : { reportType: params?.reportType, limit: 50 }
  );
  const data = params?.runId ? byRun : recent;
  const mapped = (data ?? [])
    .map(mapReport)
    .filter((report: any) => !params?.reportType || report.report_type === params.reportType)
    .filter(
      (report: any) => !params?.participantId || report.participant_id === params.participantId
    );
  return {
    data: mapped,
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
}

export function useReportContent(reportId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementReports.getReport,
    reportId ? { reportId: reportId as Id<'settlementReports'> } : 'skip'
  );
  return {
    data: data ? mapReport(data) : null,
    isLoading: data === undefined,
    isError: false,
    error: null,
  };
}

// ============================================================================
// ADJUSTMENTS
// ============================================================================

export function useSettlementAdjustments(params?: { status?: string; runId?: string }) {
  const byRun = useConvexQuery(
    api.settlement.settlementAdjustments.listAdjustmentsByRun,
    params?.runId ? { runId: params.runId as Id<'settlementRuns'> } : 'skip'
  );
  const byStatus = useConvexQuery(
    api.settlement.settlementAdjustments.listAdjustmentsByStatus,
    !params?.runId && params?.status ? { status: params.status } : 'skip'
  );
  const pending = useConvexQuery(
    api.settlement.settlementAdjustments.listPendingAdjustments,
    !params?.runId && !params?.status ? {} : 'skip'
  );
  const data = params?.runId ? byRun : params?.status ? byStatus : pending;
  return {
    data: (data ?? []).map(mapAdjustment),
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
}

export function useUpdateAdjustmentStatus() {
  const { toast } = useToast();
  const approveAction = useMutation(api.settlement.settlementAdjustments.approveAdjustment as any);
  const rejectAction = useMutation(api.settlement.settlementAdjustments.rejectAdjustment as any);

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
  const mapped = (data ?? []).map(mapTimeout);
  const filtered = status && mapped ? mapped.filter((t: any) => t.status === status) : mapped;
  return {
    data: filtered ?? [],
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
}

export function useResolveTimeout() {
  const { toast } = useToast();
  const resolveAction = useMutation(
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
          resolution: status === 'written_off' ? 'written_off' : 'reprocessed',
          resolutionNotes: notes,
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
  return {
    data: (data ?? []).map(mapParticipant),
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
}

// ============================================================================
// ACKNOWLEDGEMENTS
// ============================================================================

export function useAcknowledgements(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementAcknowledgements.listAcknowledgementsByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return {
    data: (data ?? []).map(mapAcknowledgement),
    isLoading: data === undefined,
    isError: false,
    error: null,
    refetch: noopRefetch,
  };
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
  return { data: data ?? [], isLoading: data === undefined, isError: false, error: null };
}

export function useNetInstructions(runId: string | undefined) {
  const data = useConvexQuery(
    api.settlement.settlementNetting.listNetInstructionsByRun,
    runId ? { runId: runId as Id<'settlementRuns'> } : 'skip'
  );
  return {
    data: (data ?? []).map(mapNetInstruction),
    isLoading: data === undefined,
    isError: false,
    error: null,
  };
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
