/**
 * Settlement Long-Running Actions — replaces 14 SQL RPCs.
 * All operations are Convex Actions (no 1-second time limit).
 *
 * Settlement pipeline:
 *   createSettlementRun → processSettlementRun (4 stages) → markSettlementSettled
 *
 * Each DB write uses ctx.runMutation() for atomic semantics at each checkpoint.
 * pacs.009 XML uses xmlEscape() on ALL user-sourced values (injection prevention).
 *
 * IDEMPOTENCY: markSettlementSettled throws if run is already settled.
 * IMMUTABILITY: settlementObligations are never updated after creation.
 */

import { action, internalAction, internalMutation } from '../_generated/server';
import type { ActionCtx } from '../_generated/server';
import { internal, api } from '../_generated/api';
import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { xmlEscape } from '../lib/xmlEscape';
import { Id } from '../_generated/dataModel';
import { sha256Hex } from '../lib/ipsAliasRules';

// ---------------------------------------------------------------------------
// Internal mutations (called from Actions via ctx.runMutation)
// ---------------------------------------------------------------------------

/** Transition settlement run state — validates FSM. */
export const transitionRunState = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    fromState: v.string(),
    toState: v.string(),
    updates: v.optional(v.any()),
  },
  handler: async (ctx, { runId, fromState, toState, updates }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new ConvexError({ code: 'NOT_FOUND', message: 'Settlement run not found.' });

    if (run.state !== fromState) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot transition from '${run.state}' (expected '${fromState}') to '${toState}'.`,
      });
    }

    await ctx.db.patch(runId, {
      state: toState,
      updatedAt: Date.now(),
      ...updates,
    });
  },
});

/** Insert obligations in batch. */
export const insertObligations = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    obligations: v.array(
      v.object({
        sourceParticipantId: v.id('settlementParticipants'),
        targetParticipantId: v.id('settlementParticipants'),
        category: v.union(
          v.literal('principal'),
          v.literal('interchange'),
          v.literal('switching_fee'),
          v.literal('penalty'),
          v.literal('adjustment')
        ),
        amount: v.number(),
        sourceTxId: v.optional(v.id('ipsTransactions')),
        metadata: v.optional(v.any()),
      })
    ),
    transactionCount: v.number(),
    totalPrincipal: v.number(),
    totalInterchange: v.number(),
    totalSwitchingFee: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const ob of args.obligations) {
      await ctx.db.insert('settlementObligations', {
        runId: args.runId,
        ...ob,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.runId, {
      transactionCount: args.transactionCount,
      totalPrincipal: args.totalPrincipal,
      totalInterchange: args.totalInterchange,
      totalSwitchingFee: args.totalSwitchingFee,
      updatedAt: now,
    });
  },
});

/** Insert net instructions + exposures after bilateral netting. */
export const insertNetInstructions = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    instructions: v.array(
      v.object({
        instructionId: v.string(),
        sourceParticipantId: v.id('settlementParticipants'),
        targetParticipantId: v.id('settlementParticipants'),
        amount: v.number(),
        categoryGroup: v.string(),
        batchType: v.union(v.literal('main'), v.literal('switching_fee')),
        endToEndId: v.optional(v.string()),
      })
    ),
    exposures: v.array(
      v.object({
        participantId: v.id('settlementParticipants'),
        grossPayables: v.number(),
        grossReceivables: v.number(),
        netPosition: v.number(),
        switchingFeePayable: v.number(),
        interchangeNet: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const inst of args.instructions) {
      await ctx.db.insert('settlementNetInstructions', {
        runId: args.runId,
        ...inst,
        createdAt: now,
      });
    }
    for (const exp of args.exposures) {
      await ctx.db.insert('settlementExposures', {
        runId: args.runId,
        ...exp,
        calculatedAt: now,
      });
    }

    await ctx.db.patch(args.runId, {
      netInstructionCount: args.instructions.length,
      nettingCompletedAt: now,
      updatedAt: now,
    });
  },
});

/** Insert pacs.009 batch record. */
export const insertPacs009Batch = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    batchType: v.union(v.literal('main'), v.literal('switching_fee')),
    msgId: v.string(),
    fileName: v.string(),
    fileContent: v.string(),
    fileChecksum: v.string(),
    fileSize: v.number(),
    instructionCount: v.number(),
    totalAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert('settlementPacs009Batches', {
      ...args,
      status: 'generated',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const insertSettlementReport = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    reportType: v.union(
      v.literal('raw_data'),
      v.literal('ntsl'),
      v.literal('adjustment'),
      v.literal('pending_adjustment_response'),
      v.literal('pending_status'),
      v.literal('timeout')
    ),
    fileName: v.string(),
    fileContent: v.string(),
    fileChecksum: v.string(),
    fileSize: v.number(),
    reportData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('settlementReports', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/** Mark settlement as settled (idempotency guard). */
export const markSettled = internalMutation({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new ConvexError({ code: 'NOT_FOUND', message: 'Settlement run not found.' });

    // IDEMPOTENCY: throw if already settled or closed
    if (run.state === 'settled' || run.state === 'closed') {
      throw new ConvexError({
        code: 'ALREADY_SETTLED',
        message: `Settlement run ${runId} is already in state '${run.state}'.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(runId, {
      state: 'settled',
      settledAt: now,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Public Actions
// ---------------------------------------------------------------------------

/**
 * Create a settlement run.
 * Replaces `create_settlement_run` RPC.
 */
export const createSettlementRun = action({
  args: {
    windowId: v.string(),
    settlementDate: v.string(),
    currency: v.optional(v.string()),
    schemeVersion: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    await ctx.runQuery(internal.lib.auth.assertAdminForAction, {});

    const now = Date.now();
    const runId = await ctx.runMutation(internal.settlement.settlementActions.createRunRecord, {
      windowId: args.windowId,
      settlementDate: args.settlementDate,
      currency: args.currency ?? 'NAD',
      schemeVersion: args.schemeVersion ?? '1.0',
      now,
    });

    return runId;
  },
});

export const createRunRecord = internalMutation({
  args: {
    windowId: v.string(),
    settlementDate: v.string(),
    currency: v.string(),
    schemeVersion: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    // Generate human-readable runId
    const date = args.settlementDate.replace(/-/g, '');
    const runId_human = `SR-${date}-${args.windowId}`;

    return ctx.db.insert('settlementRuns', {
      runId: runId_human,
      windowId: args.windowId,
      settlementDate: args.settlementDate,
      currency: args.currency,
      schemeVersion: args.schemeVersion,
      state: 'collecting',
      amendmentSeq: 0,
      transactionCount: 0,
      totalPrincipal: 0,
      totalInterchange: 0,
      totalSwitchingFee: 0,
      netInstructionCount: 0,
      createdAt: args.now,
      updatedAt: args.now,
    });
  },
});

/**
 * Process a settlement run through all 4 stages:
 *   collecting → prepare_inputs → netting → generated
 *
 * Replaces 4 RPCs: ingest_ips_transactions, compute_settlement_netting,
 *   generate_pacs009_batches, generate_settlement_reports
 */
export const processSettlementRun = action({
  args: {
    runId: v.id('settlementRuns'),
  },
  handler: async (
    ctx,
    { runId }
  ): Promise<{
    obligationCount: number;
    netInstructionCount: number;
    batchCount: number;
  }> => {
    await ctx.runQuery(internal.lib.auth.assertAdminForAction, {});
    console.log(`[settlement] Processing run ${runId}`);

    // --- Stage 1: cutoff_reached → prepare_inputs ---
    await ctx.runMutation(internal.settlement.settlementActions.transitionRunState, {
      runId,
      fromState: 'collecting',
      toState: 'cutoff_reached',
      updates: { cutoffAt: Date.now() },
    });

    await ctx.runMutation(internal.settlement.settlementActions.transitionRunState, {
      runId,
      fromState: 'cutoff_reached',
      toState: 'prepare_inputs',
    });

    // --- Stage 2: Ingest IPS transactions and approved operational adjustments ---
    const [transactionObligations, adjustmentBatch] = await Promise.all([
      ingestIpsTransactions(ctx, runId),
      ingestSettlementAdjustments(ctx, runId),
    ]);
    const obligations = [...transactionObligations, ...adjustmentBatch.obligations];
    console.log(`[settlement] Ingested ${obligations.length} obligations`);

    await ctx.runMutation(internal.settlement.settlementActions.insertObligations, {
      runId,
      obligations,
      transactionCount: obligations.filter((o) => o.category === 'principal').length,
      totalPrincipal: obligations
        .filter((o) => o.category === 'principal')
        .reduce((s, o) => s + o.amount, 0),
      totalInterchange: obligations
        .filter((o) => o.category === 'interchange')
        .reduce((s, o) => s + o.amount, 0),
      totalSwitchingFee: obligations
        .filter((o) => o.category === 'switching_fee')
        .reduce((s, o) => s + o.amount, 0),
    });

    await ctx.runMutation(internal.settlement.settlementActions.transitionRunState, {
      runId,
      fromState: 'prepare_inputs',
      toState: 'netting',
    });

    // --- Stage 3: Bilateral netting ---
    const { instructions, exposures } = computeBilateralNetting(obligations);
    console.log(`[settlement] Computed ${instructions.length} net instructions`);

    await ctx.runMutation(internal.settlement.settlementActions.insertNetInstructions, {
      runId,
      instructions,
      exposures,
    });

    await ctx.runMutation(internal.settlement.settlementActions.transitionRunState, {
      runId,
      fromState: 'netting',
      toState: 'generated',
      updates: { generatedAt: Date.now() },
    });

    // --- Stage 4: Generate pacs.009 XML batches ---
    const batches = await generatePacs009Batches(ctx, runId, instructions);
    console.log(`[settlement] Generated ${batches.length} pacs.009 batches`);
    await generateSettlementReports(ctx, runId, obligations, instructions);
    if (adjustmentBatch.adjustmentIds.length) {
      await ctx.runMutation(
        internal.settlement.settlementAdjustments.markAdjustmentsSettledInternal,
        {
          runId,
          adjustmentIds: adjustmentBatch.adjustmentIds,
        }
      );
    }

    return {
      obligationCount: obligations.length,
      netInstructionCount: instructions.length,
      batchCount: batches.length,
    };
  },
});

/**
 * Mark a settlement run as settled (idempotent — throws if already settled).
 * Replaces `mark_settlement_settled` RPC.
 */
export const markSettlementSettled = action({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await ctx.runQuery(internal.lib.auth.assertAdminForAction, {});
    await ctx.runMutation(internal.settlement.settlementActions.markSettled, { runId });
    console.log(`[settlement] Run ${runId} marked as settled`);
  },
});

// ---------------------------------------------------------------------------
// Internal helpers (pure TypeScript — no DB access)
// ---------------------------------------------------------------------------

interface ObligationInput {
  sourceParticipantId: Id<'settlementParticipants'>;
  targetParticipantId: Id<'settlementParticipants'>;
  category: 'principal' | 'interchange' | 'switching_fee' | 'penalty' | 'adjustment';
  amount: number;
  sourceTxId?: Id<'ipsTransactions'>;
  metadata?: Record<string, unknown>;
}

interface NetInstruction {
  instructionId: string;
  sourceParticipantId: Id<'settlementParticipants'>;
  targetParticipantId: Id<'settlementParticipants'>;
  amount: number;
  categoryGroup: string;
  batchType: 'main' | 'switching_fee';
  endToEndId?: string;
}

interface Exposure {
  participantId: Id<'settlementParticipants'>;
  grossPayables: number;
  grossReceivables: number;
  netPosition: number;
  switchingFeePayable: number;
  interchangeNet: number;
}

interface AdjustmentIngestion {
  obligations: ObligationInput[];
  adjustmentIds: Id<'settlementAdjustments'>[];
}

/**
 * Ingest IPS transactions for a settlement run.
 * Reads completed IPS transactions for the settlement date.
 */
async function ingestIpsTransactions(
  ctx: ActionCtx,
  runId: Id<'settlementRuns'>
): Promise<ObligationInput[]> {
  const run = await ctx.runQuery(api.settlement.settlementRuns.getSettlementRun, { runId });
  if (!run) return [];

  const [transactions, participants] = await Promise.all([
    ctx.runQuery(internal.ips.ipsTransactions.getTransactionsForSettlementInternal, {
      settlementDate: run.settlementDate,
    }),
    ctx.runQuery(internal.settlement.settlementParticipants.listActiveParticipantsInternal, {}),
  ]);

  const sponsorParticipant = resolveSponsorParticipant(participants);
  if (!sponsorParticipant) {
    throw new ConvexError({
      code: 'SETTLEMENT_SPONSOR_MISSING',
      message:
        'No active sponsor settlement participant found. Configure IPS_SPONSOR_PARTICIPANT_CODE or seed a sponsored participant.',
    });
  }

  const obligations: ObligationInput[] = [];
  for (const tx of transactions) {
    if (tx.status !== 'completed' || tx.currency !== run.currency || tx.amount <= 0) continue;
    if (isHeldForDispute(tx)) continue;

    const counterparty =
      tx.direction === 'outbound'
        ? resolveParticipant(participants, tx.creditorBic, tx.creditorVpa)
        : resolveParticipant(participants, tx.debtorBic, tx.debtorVpa);

    const sourceParticipantId =
      tx.direction === 'outbound'
        ? sponsorParticipant._id
        : (counterparty?._id ?? sponsorParticipant._id);
    const targetParticipantId =
      tx.direction === 'outbound'
        ? (counterparty?._id ?? sponsorParticipant._id)
        : sponsorParticipant._id;

    if (sourceParticipantId === targetParticipantId) continue;

    obligations.push({
      sourceParticipantId,
      targetParticipantId,
      category: 'principal',
      amount: Math.round(tx.amount * 100) / 100,
      sourceTxId: tx._id,
      metadata: {
        msgId: tx.msgId,
        direction: tx.direction,
        useCaseType: tx.useCaseType,
        debtorVpa: tx.debtorVpa,
        creditorVpa: tx.creditorVpa,
        loanId: tx.loanId,
        disbursementId: tx.disbursementId,
        paymentId: tx.paymentId,
        completedAt: tx.completedAt,
        sponsoredFallback: !counterparty,
      },
    });
  }

  return obligations;
}

async function ingestSettlementAdjustments(
  ctx: ActionCtx,
  runId: Id<'settlementRuns'>
): Promise<AdjustmentIngestion> {
  const run = await ctx.runQuery(api.settlement.settlementRuns.getSettlementRun, { runId });
  if (!run) return { obligations: [], adjustmentIds: [] };

  const adjustments = await ctx.runQuery(
    internal.settlement.settlementAdjustments.listApprovedAdjustmentsInternal,
    {}
  );

  const obligations: ObligationInput[] = [];
  const adjustmentIds: Id<'settlementAdjustments'>[] = [];

  for (const adjustment of adjustments) {
    if (
      adjustment.amount <= 0 ||
      adjustment.currency !== run.currency ||
      adjustment.sourceParticipantId === adjustment.targetParticipantId
    ) {
      continue;
    }

    obligations.push({
      sourceParticipantId: adjustment.sourceParticipantId,
      targetParticipantId: adjustment.targetParticipantId,
      category: 'adjustment',
      amount: Math.round(adjustment.amount * 100) / 100,
      sourceTxId: adjustment.originalTxId,
      metadata: {
        adjustmentId: adjustment._id,
        adjustmentType: adjustment.adjustmentType,
        reasonCode: adjustment.reasonCode,
        reasonDescription: adjustment.reasonDescription,
      },
    });
    adjustmentIds.push(adjustment._id);
  }

  return { obligations, adjustmentIds };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isHeldForDispute(tx: { metadata?: unknown }): boolean {
  const metadata = metadataRecord(tx.metadata);
  if (!metadata.disputeCaseId) return false;

  const status =
    typeof metadata.disputeCaseStatus === 'string' ? metadata.disputeCaseStatus : 'opened';
  return ['opened', 'awaiting_response', 'represented', 'escalated'].includes(status);
}

function normalizeParticipantKey(value?: string): string | undefined {
  return value?.replace(/[^a-z0-9]/gi, '').toUpperCase() || undefined;
}

function providerTokenFromVpa(vpa?: string): string | undefined {
  const provider = vpa?.split('@')[1];
  return normalizeParticipantKey(provider);
}

function resolveSponsorParticipant(participants: Array<any>) {
  const configured = normalizeParticipantKey(
    process.env.IPS_SPONSOR_PARTICIPANT_CODE ??
      process.env.IPS_SPONSOR_PARTICIPANT_ID ??
      process.env.IPS_SPONSOR_BIC
  );

  if (configured) {
    const match = participants.find((participant) =>
      [participant.routingCode, participant.swiftBic, participant.name, String(participant._id)]
        .map(normalizeParticipantKey)
        .includes(configured)
    );
    if (match) return match;
  }

  return (
    participants.find((participant) => participant.participantType === 'sponsored') ??
    participants.find((participant) => participant.isOperator) ??
    participants[0]
  );
}

function resolveParticipant(participants: Array<any>, bic?: string, vpa?: string) {
  const keys = [normalizeParticipantKey(bic), providerTokenFromVpa(vpa)].filter(Boolean);
  if (!keys.length) return undefined;

  return participants.find((participant) => {
    const participantKeys = [
      participant.routingCode,
      participant.swiftBic,
      participant.name,
      String(participant._id),
    ].map(normalizeParticipantKey);
    return keys.some((key) => participantKeys.includes(key));
  });
}

/**
 * Bilateral netting algorithm.
 * For each pair (A, B): net A→B and B→A into a single net instruction.
 * O(n) using a Map keyed by canonical pair "min:max".
 */
function computeBilateralNetting(obligations: ObligationInput[]): {
  instructions: NetInstruction[];
  exposures: Exposure[];
} {
  // Group by (source, target) pair
  const netMap = new Map<string, number>();
  const participantSet = new Set<Id<'settlementParticipants'>>();

  for (const ob of obligations) {
    if (ob.category === 'switching_fee') continue; // handled separately

    const key =
      ob.sourceParticipantId < ob.targetParticipantId
        ? `${ob.sourceParticipantId}:${ob.targetParticipantId}`
        : `${ob.targetParticipantId}:${ob.sourceParticipantId}`;

    const isSelf = ob.sourceParticipantId < ob.targetParticipantId;
    const existing = netMap.get(key) ?? 0;
    netMap.set(key, isSelf ? existing + ob.amount : existing - ob.amount);

    participantSet.add(ob.sourceParticipantId);
    participantSet.add(ob.targetParticipantId);
  }

  const instructions: NetInstruction[] = [];
  let seq = 1;

  for (const [key, netAmount] of netMap.entries()) {
    if (Math.abs(netAmount) < 0.01) continue; // zero net — skip

    const [aId, bId] = key.split(':') as [
      Id<'settlementParticipants'>,
      Id<'settlementParticipants'>,
    ];
    const source: Id<'settlementParticipants'> = netAmount > 0 ? aId : bId;
    const target: Id<'settlementParticipants'> = netAmount > 0 ? bId : aId;

    instructions.push({
      instructionId: `NI-${seq++}`,
      sourceParticipantId: source,
      targetParticipantId: target,
      amount: Math.abs(netAmount),
      categoryGroup: 'principal_and_interchange',
      batchType: 'main',
      endToEndId: `E2E-${source.slice(-6)}-${target.slice(-6)}-${seq}`,
    });
  }

  // Switching fee instructions (separate batch)
  const feeObligations = obligations.filter((o) => o.category === 'switching_fee');
  for (const ob of feeObligations) {
    instructions.push({
      instructionId: `SF-${seq++}`,
      sourceParticipantId: ob.sourceParticipantId,
      targetParticipantId: ob.targetParticipantId,
      amount: ob.amount,
      categoryGroup: 'switching_fee',
      batchType: 'switching_fee',
    });
  }

  // Compute exposures per participant
  const exposures: Exposure[] = Array.from(participantSet).map((pid) => {
    const payables = obligations
      .filter((o) => o.sourceParticipantId === pid)
      .reduce((s, o) => s + o.amount, 0);
    const receivables = obligations
      .filter((o) => o.targetParticipantId === pid)
      .reduce((s, o) => s + o.amount, 0);
    const switchingFee = obligations
      .filter((o) => o.sourceParticipantId === pid && o.category === 'switching_fee')
      .reduce((s, o) => s + o.amount, 0);
    const interchangeNet =
      obligations
        .filter((o) => o.sourceParticipantId === pid && o.category === 'interchange')
        .reduce((s, o) => s + o.amount, 0) -
      obligations
        .filter((o) => o.targetParticipantId === pid && o.category === 'interchange')
        .reduce((s, o) => s + o.amount, 0);

    return {
      participantId: pid,
      grossPayables: payables,
      grossReceivables: receivables,
      netPosition: receivables - payables,
      switchingFeePayable: switchingFee,
      interchangeNet,
    };
  });

  return { instructions, exposures };
}

/**
 * Generate pacs.009 XML batches for all net instructions.
 * SECURITY: ALL user-sourced values pass through xmlEscape().
 */
async function generatePacs009Batches(
  ctx: ActionCtx,
  runId: Id<'settlementRuns'>,
  instructions: NetInstruction[]
): Promise<string[]> {
  const run = await ctx.runQuery(api.settlement.settlementRuns.getSettlementRun, { runId });
  if (!run) return [];

  const mainInstructions = instructions.filter((i) => i.batchType === 'main');
  const feeInstructions = instructions.filter((i) => i.batchType === 'switching_fee');

  const batchIds: string[] = [];

  for (const [batchType, instList] of [
    ['main', mainInstructions],
    ['switching_fee', feeInstructions],
  ] as const) {
    if ((instList as NetInstruction[]).length === 0) continue;

    const msgId = `${run.runId}-${batchType.toUpperCase()}-${Date.now()}`;
    const fileName = `${xmlEscape(run.runId)}_${batchType}_pacs009.xml`;
    const xml = buildPacs009Xml(msgId, run, instList as NetInstruction[], batchType);
    const fileSize = new TextEncoder().encode(xml).length;
    const checksum = `sha256:${await sha256Hex(xml)}`;

    const batchId = await ctx.runMutation(
      internal.settlement.settlementActions.insertPacs009Batch,
      {
        runId,
        batchType,
        msgId,
        fileName,
        fileContent: xml,
        fileChecksum: checksum,
        fileSize,
        instructionCount: (instList as NetInstruction[]).length,
        totalAmount: (instList as NetInstruction[]).reduce((s, i) => s + i.amount, 0),
      }
    );

    batchIds.push(batchId);
  }

  return batchIds;
}

async function generateSettlementReports(
  ctx: ActionCtx,
  runId: Id<'settlementRuns'>,
  obligations: ObligationInput[],
  instructions: NetInstruction[]
) {
  const run = await ctx.runQuery(api.settlement.settlementRuns.getSettlementRun, { runId });
  if (!run) return;

  const rawRows = obligations.map((obligation) => ({
    sourceParticipantId: obligation.sourceParticipantId,
    targetParticipantId: obligation.targetParticipantId,
    category: obligation.category,
    amount: obligation.amount,
    sourceTxId: obligation.sourceTxId,
    metadata: obligation.metadata,
  }));

  const ntslRows = instructions.map((instruction) => ({
    instructionId: instruction.instructionId,
    sourceParticipantId: instruction.sourceParticipantId,
    targetParticipantId: instruction.targetParticipantId,
    amount: instruction.amount,
    categoryGroup: instruction.categoryGroup,
    batchType: instruction.batchType,
    endToEndId: instruction.endToEndId,
  }));

  const adjustmentRows = obligations
    .filter((obligation) => obligation.category === 'adjustment')
    .map((obligation) => ({
      sourceParticipantId: obligation.sourceParticipantId,
      targetParticipantId: obligation.targetParticipantId,
      amount: obligation.amount,
      sourceTxId: obligation.sourceTxId,
      metadata: obligation.metadata,
    }));
  const pendingAdjustmentRows = await ctx.runQuery(
    internal.settlement.settlementAdjustments.listPendingAdjustmentResponsesInternal,
    {}
  );
  const timeoutRows = obligations.filter((obligation) => obligation.metadata?.timeout === true);
  const pendingRows = obligations.filter((obligation) => obligation.metadata?.pending === true);

  await writeSettlementReport(ctx, runId, run.runId, 'raw_data', rawRows);
  await writeSettlementReport(ctx, runId, run.runId, 'ntsl', ntslRows);
  await writeSettlementReport(ctx, runId, run.runId, 'adjustment', adjustmentRows);
  await writeSettlementReport(
    ctx,
    runId,
    run.runId,
    'pending_adjustment_response',
    pendingAdjustmentRows
  );
  await writeSettlementReport(ctx, runId, run.runId, 'timeout', timeoutRows);
  await writeSettlementReport(ctx, runId, run.runId, 'pending_status', pendingRows);
}

async function writeSettlementReport(
  ctx: ActionCtx,
  runId: Id<'settlementRuns'>,
  runSlug: string,
  reportType:
    | 'raw_data'
    | 'ntsl'
    | 'adjustment'
    | 'pending_adjustment_response'
    | 'pending_status'
    | 'timeout',
  rows: unknown[]
) {
  const fileContent = JSON.stringify({ reportType, rows }, null, 2);
  const fileChecksum = `sha256:${await sha256Hex(fileContent)}`;
  await ctx.runMutation(internal.settlement.settlementActions.insertSettlementReport, {
    runId,
    reportType,
    fileName: `${runSlug}_${reportType}.json`,
    fileContent,
    fileChecksum,
    fileSize: new TextEncoder().encode(fileContent).length,
    reportData: { rows },
  });
}

/**
 * Build a pacs.009 XML message.
 * ALL user-sourced string values MUST pass through xmlEscape().
 *
 * SECURITY: Unescaped values would allow XML injection into SWIFT/NISS messages.
 */
function buildPacs009Xml(
  msgId: string,
  run: { settlementDate: string; currency: string; schemeVersion: string },
  instructions: NetInstruction[],
  batchType: 'main' | 'switching_fee'
): string {
  const now = new Date().toISOString();
  const totalAmount = instructions.reduce((s, i) => s + i.amount, 0).toFixed(2);
  const nbOfTxs = instructions.length;

  const txs = instructions
    .map((inst) => {
      return `<CdtTrfTxInf>
  <PmtId>
    <InstrId>${xmlEscape(inst.instructionId)}</InstrId>
    <EndToEndId>${xmlEscape(inst.endToEndId ?? inst.instructionId)}</EndToEndId>
  </PmtId>
  <IntrBkSttlmAmt Ccy="${xmlEscape(run.currency)}">${inst.amount.toFixed(2)}</IntrBkSttlmAmt>
  <IntrBkSttlmDt>${xmlEscape(run.settlementDate)}</IntrBkSttlmDt>
  <Dbtr>
    <FinInstnId><BIC>${xmlEscape(inst.sourceParticipantId)}</BIC></FinInstnId>
  </Dbtr>
  <Cdtr>
    <FinInstnId><BIC>${xmlEscape(inst.targetParticipantId)}</BIC></FinInstnId>
  </Cdtr>
  <Purp><Cd>${xmlEscape(inst.categoryGroup)}</Cd></Purp>
</CdtTrfTxInf>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.08">
  <FIToFIFCTInstr>
    <GrpHdr>
      <MsgId>${xmlEscape(msgId)}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <TtlIntrBkSttlmAmt Ccy="${xmlEscape(run.currency)}">${totalAmount}</TtlIntrBkSttlmAmt>
      <IntrBkSttlmDt>${xmlEscape(run.settlementDate)}</IntrBkSttlmDt>
      <SttlmMtd>CLRG</SttlmMtd>
      <BtchBookg>true</BtchBookg>
      <SchemeVrsn>${xmlEscape(run.schemeVersion)}</SchemeVrsn>
      <BatchType>${xmlEscape(batchType)}</BatchType>
    </GrpHdr>
${txs}
  </FIToFIFCTInstr>
</Document>`;
}
