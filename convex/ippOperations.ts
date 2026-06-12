/**
 * IPP Operations Control Center.
 *
 * Owns scheme-facing operational controls that sit around the core IPS
 * transaction path: disputes, adjustments, fraud/risk events, handle listings,
 * incident evidence, and customer receipts.
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import {
  ippDisputeCaseType,
  ippDisputeStatus,
  ippListingStatus,
  ippRiskSeverity,
  ipsTransactionStatus,
} from './schema';
import { assertAdmin, assertStaff, assertOwnerOrStaff } from './lib/auth';
import { scheduleAuditLog } from './lib/audit';
import {
  dueDaysForIppCase,
  requiresSettlementAdjustmentForIppCase,
  scoreIpsRiskSignals,
} from './lib/ippOperationsRules';

const DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_YEARS_MS = 7 * 365 * DAY_MS;
const FIVE_YEARS_MS = 5 * 365 * DAY_MS;

const terminalIpsStatuses = new Set(['completed', 'failed', 'reversed', 'timeout']);

function makeCaseId(now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  return `IPP-${day}-${String(now).slice(-7)}`;
}

function makeReceiptNumber(tx: { msgId?: string }, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10).replace(/-/g, '');
  return `IPR-${day}-${(tx.msgId ?? String(now)).slice(-10)}`;
}

function formatNad(amount: number) {
  return `N$ ${amount.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function recordEvidence(
  ctx: any,
  evidenceType:
    | 'incident'
    | 'dispute'
    | 'hotlist'
    | 'blacklist'
    | 'settlement'
    | 'timeout'
    | 'audit',
  entityType: string,
  entityId: string,
  summary: string,
  metadata?: Record<string, unknown>
) {
  const now = Date.now();
  await ctx.db.insert('ippComplianceEvidence', {
    evidenceType,
    entityType,
    entityId,
    summary,
    severity: evidenceType === 'incident' || evidenceType === 'blacklist' ? 'critical' : 'warning',
    status: 'open',
    reportDueAt: evidenceType === 'incident' ? now + 48 * 60 * 60 * 1000 : undefined,
    retentionUntil: now + SEVEN_YEARS_MS,
    metadata,
    createdAt: now,
    updatedAt: now,
  });
}

async function createAdjustmentForCase(ctx: any, disputeCase: any, staffId: Id<'users'>) {
  if (disputeCase.settlementAdjustmentId) return disputeCase.settlementAdjustmentId;

  if (!disputeCase.sourceParticipantId || !disputeCase.targetParticipantId) {
    await recordEvidence(
      ctx,
      'dispute',
      'ippDisputeCases',
      String(disputeCase._id),
      'Dispute resolved without participant mapping; settlement adjustment requires manual participant assignment.',
      { caseId: disputeCase.caseId, caseType: disputeCase.caseType }
    );
    return undefined;
  }

  const now = Date.now();
  const adjustmentId = await ctx.db.insert('settlementAdjustments', {
    runId: disputeCase.runId,
    originalTxId: disputeCase.originalTxId,
    adjustmentType: disputeCase.caseType,
    sourceParticipantId: disputeCase.sourceParticipantId,
    targetParticipantId: disputeCase.targetParticipantId,
    amount: disputeCase.amount,
    currency: disputeCase.currency,
    reasonCode: disputeCase.reasonCode,
    reasonDescription: disputeCase.reasonDescription,
    status: 'pending',
    responseRequiredBy: now + 7 * DAY_MS,
    createdBy: staffId,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(disputeCase._id, {
    settlementAdjustmentId: adjustmentId,
    updatedAt: now,
  });

  scheduleAuditLog(
    ctx,
    'settlementAdjustments',
    adjustmentId,
    'CREATE_FROM_DISPUTE',
    'none',
    'pending',
    disputeCase.caseId
  );

  return adjustmentId;
}

async function getActiveListingsForAddr(ctx: any, addr?: string) {
  if (!addr) return [];
  return ctx.db
    .query('ippHandleListings')
    .withIndex('by_addr_status', (q: any) => q.eq('addr', addr).eq('status', 'active'))
    .collect();
}

async function evaluateTransactionRisk(ctx: any, tx: any, trigger: string) {
  if (!tx) return null;

  const now = Date.now();
  let recentHourCount = 0;
  let recentHourAmount = 0;

  if (tx.userId) {
    const recent = await ctx.db
      .query('ipsTransactions')
      .withIndex('by_userId', (q: any) => q.eq('userId', tx.userId))
      .collect();
    const recentHour = recent.filter((item: any) => (item.createdAt ?? 0) >= now - 60 * 60 * 1000);
    recentHourCount = recentHour.length;
    recentHourAmount = recentHour.reduce((sum: number, item: any) => sum + (item.amount ?? 0), 0);
  }

  const debtorListings = await getActiveListingsForAddr(ctx, tx.debtorVpa);
  const creditorListings = await getActiveListingsForAddr(ctx, tx.creditorVpa);
  const risk = scoreIpsRiskSignals({
    amount: tx.amount,
    status: tx.status,
    errorCode: tx.errorCode,
    ageMs: now - (tx.createdAt ?? now),
    recentHourCount,
    recentHourAmount,
    hasActiveHandleListing: Boolean(debtorListings.length || creditorListings.length),
  });
  const { score, severity, decision, triggeredRules } = risk;

  if (score < 20) return null;

  let alertId: Id<'ipsAlerts'> | undefined;

  if (score >= 35) {
    const existingAlerts = await ctx.db
      .query('ipsAlerts')
      .withIndex('by_isResolved', (q: any) => q.eq('isResolved', false))
      .collect();
    const duplicate = existingAlerts.find(
      (alert: any) =>
        alert.transactionId === tx._id &&
        alert.alertType === 'ipp_risk_score' &&
        alert.metadata?.score === score
    );

    alertId =
      duplicate?._id ??
      (await ctx.db.insert('ipsAlerts', {
        transactionId: tx._id,
        alertType: 'ipp_risk_score',
        severity: severity === 'critical' || severity === 'high' ? 'critical' : 'warning',
        message: `IPP risk score ${score}: ${triggeredRules.join(', ')}`,
        isResolved: false,
        metadata: { score, triggeredRules, trigger },
        createdAt: now,
      }));
  }

  const riskEventId = await ctx.db.insert('ippRiskEvents', {
    transactionId: tx._id,
    userId: tx.userId,
    score,
    severity,
    decision,
    triggeredRules,
    reason: triggeredRules.join(', '),
    status: 'open',
    alertId,
    metadata: { trigger, msgId: tx.msgId, amount: tx.amount, useCaseType: tx.useCaseType },
    createdAt: now,
  });

  if (severity === 'critical') {
    const addr = tx.debtorVpa ?? tx.creditorVpa;
    const existing = await getActiveListingsForAddr(ctx, addr);
    if (addr && !existing.length) {
      await ctx.db.insert('ippHandleListings', {
        userId: tx.userId,
        addr,
        listingType: 'hotlist',
        status: 'active',
        source: 'fraud_rule',
        reasonCode: 'AUTO_CRITICAL_RISK',
        reasonDescription: `Critical IPP risk score ${score}`,
        evidence: { riskEventId, transactionId: tx._id, triggeredRules },
        effectiveAt: now,
        expiresAt: now + 30 * DAY_MS,
        reviewDueAt: now + 15 * DAY_MS,
        createdAt: now,
        updatedAt: now,
      });
    }

    await recordEvidence(
      ctx,
      'incident',
      'ippRiskEvents',
      String(riskEventId),
      `Critical IPP risk event for transaction ${tx.msgId}.`,
      { score, triggeredRules, transactionId: tx._id }
    );
  }

  return { riskEventId, score, severity, decision, triggeredRules };
}

// ---------------------------------------------------------------------------
// Disputes and adjustments
// ---------------------------------------------------------------------------

export const listDisputeCases = query({
  args: {
    status: v.optional(ippDisputeStatus),
    caseType: v.optional(ippDisputeCaseType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    let rows = args.status
      ? await ctx.db
          .query('ippDisputeCases')
          .withIndex('by_status', (q) => q.eq('status', args.status!))
          .order('desc')
          .take(args.limit ?? 100)
      : await ctx.db
          .query('ippDisputeCases')
          .order('desc')
          .take(args.limit ?? 100);

    if (args.caseType) rows = rows.filter((row) => row.caseType === args.caseType);
    return rows;
  },
});

export const createDisputeCase = mutation({
  args: {
    originalTxId: v.optional(v.id('ipsTransactions')),
    runId: v.optional(v.id('settlementRuns')),
    caseType: ippDisputeCaseType,
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    reasonCode: v.optional(v.string()),
    reasonDescription: v.string(),
    sourceParticipantId: v.optional(v.id('settlementParticipants')),
    targetParticipantId: v.optional(v.id('settlementParticipants')),
    evidence: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    const now = Date.now();
    const tx = args.originalTxId ? await ctx.db.get(args.originalTxId) : null;

    if (args.originalTxId && !tx) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'IPS transaction not found.' });
    }

    const amount = args.amount ?? tx?.amount;
    if (!amount || amount <= 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'A positive dispute amount is required.',
      });
    }

    const caseId = makeCaseId(now);
    const disputeId = await ctx.db.insert('ippDisputeCases', {
      caseId,
      originalTxId: args.originalTxId,
      runId: args.runId,
      caseType: args.caseType,
      status: 'opened',
      amount,
      currency: args.currency ?? tx?.currency ?? 'NAD',
      reasonCode: args.reasonCode,
      reasonDescription: args.reasonDescription,
      sourceParticipantId: args.sourceParticipantId,
      targetParticipantId: args.targetParticipantId,
      raisedByUserId: staffId,
      responseDueAt: now + dueDaysForIppCase(args.caseType) * DAY_MS,
      evidence: args.evidence,
      retentionUntil: now + SEVEN_YEARS_MS,
      createdAt: now,
      updatedAt: now,
    });

    if (tx) {
      await ctx.db.patch(tx._id, {
        metadata: {
          ...(tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : {}),
          disputeCaseId: disputeId,
          disputeCaseStatus: 'opened',
        },
        updatedAt: now,
      });
    }

    await ctx.db.insert('ipsAlerts', {
      transactionId: args.originalTxId,
      alertType: 'ipp_dispute_case',
      severity: ['arbitration', 'chargeback'].includes(args.caseType) ? 'critical' : 'warning',
      message: `${caseId} opened: ${args.reasonDescription}`,
      isResolved: false,
      metadata: { disputeCaseId: disputeId, caseType: args.caseType },
      createdAt: now,
    });

    await recordEvidence(
      ctx,
      'dispute',
      'ippDisputeCases',
      String(disputeId),
      `${caseId} opened for ${formatNad(amount)}.`,
      { caseType: args.caseType, originalTxId: args.originalTxId }
    );

    scheduleAuditLog(ctx, 'ippDisputeCases', disputeId, 'CREATE', 'none', 'opened');
    return disputeId;
  },
});

export const transitionDisputeCase = mutation({
  args: {
    disputeCaseId: v.id('ippDisputeCases'),
    status: ippDisputeStatus,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    const disputeCase = await ctx.db.get(args.disputeCaseId);
    if (!disputeCase) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Dispute case not found.' });
    }
    if (disputeCase.status === 'closed') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Closed dispute cases cannot change.',
      });
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
      resolutionNotes: args.notes,
    };
    if (['accepted', 'rejected', 'resolved', 'deemed_accepted', 'closed'].includes(args.status)) {
      updates.resolvedAt = now;
    }

    await ctx.db.patch(args.disputeCaseId, updates);

    const updated = { ...disputeCase, ...updates };
    if (requiresSettlementAdjustmentForIppCase(disputeCase.caseType, args.status)) {
      await createAdjustmentForCase(ctx, updated, staffId);
    }

    if (disputeCase.originalTxId) {
      const tx = await ctx.db.get(disputeCase.originalTxId);
      if (tx) {
        await ctx.db.patch(disputeCase.originalTxId, {
          metadata: {
            ...(tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : {}),
            disputeCaseStatus: args.status,
            disputeCaseResolutionNotes: args.notes,
          },
          updatedAt: now,
        });
      }
    }

    scheduleAuditLog(
      ctx,
      'ippDisputeCases',
      args.disputeCaseId,
      'TRANSITION',
      disputeCase.status,
      args.status,
      args.notes
    );
  },
});

// ---------------------------------------------------------------------------
// Risk and listing operations
// ---------------------------------------------------------------------------

export const listRiskEvents = query({
  args: {
    status: v.optional(v.union(v.literal('open'), v.literal('reviewing'), v.literal('resolved'))),
    severity: v.optional(ippRiskSeverity),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    let rows = args.status
      ? await ctx.db
          .query('ippRiskEvents')
          .withIndex('by_status', (q) => q.eq('status', args.status!))
          .order('desc')
          .take(args.limit ?? 100)
      : await ctx.db
          .query('ippRiskEvents')
          .order('desc')
          .take(args.limit ?? 100);
    if (args.severity) rows = rows.filter((row) => row.severity === args.severity);
    return rows;
  },
});

export const resolveRiskEvent = mutation({
  args: {
    riskEventId: v.id('ippRiskEvents'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    const event = await ctx.db.get(args.riskEventId);
    if (!event) throw new ConvexError({ code: 'NOT_FOUND', message: 'Risk event not found.' });
    const now = Date.now();

    await ctx.db.patch(args.riskEventId, {
      status: 'resolved',
      resolvedAt: now,
      resolvedBy: staffId,
      metadata: { ...objectRecord(event.metadata), resolutionNotes: args.notes },
    });

    if (event.alertId) {
      await ctx.db.patch(event.alertId, {
        isResolved: true,
        resolvedAt: now,
        resolvedBy: staffId,
      });
    }
  },
});

export const listHandleListings = query({
  args: {
    status: v.optional(ippListingStatus),
    listingType: v.optional(v.union(v.literal('hotlist'), v.literal('blacklist'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    let rows = args.status
      ? await ctx.db
          .query('ippHandleListings')
          .withIndex('by_status', (q) => q.eq('status', args.status!))
          .order('desc')
          .take(args.limit ?? 100)
      : await ctx.db
          .query('ippHandleListings')
          .order('desc')
          .take(args.limit ?? 100);

    if (args.listingType) rows = rows.filter((row) => row.listingType === args.listingType);
    return rows;
  },
});

export const createHandleListing = mutation({
  args: {
    addr: v.string(),
    listingType: v.union(v.literal('hotlist'), v.literal('blacklist')),
    source: v.union(
      v.literal('manual'),
      v.literal('fraud_rule'),
      v.literal('operator_instruction'),
      v.literal('sanctions'),
      v.literal('court_order')
    ),
    reasonCode: v.optional(v.string()),
    reasonDescription: v.string(),
    evidence: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const staffId =
      args.listingType === 'blacklist' ? await assertAdmin(ctx) : await assertStaff(ctx);
    const alias = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', args.addr))
      .first();
    const now = Date.now();
    const existing = await ctx.db
      .query('ippHandleListings')
      .withIndex('by_addr_status', (q) => q.eq('addr', args.addr).eq('status', 'active'))
      .first();

    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE_LISTING',
        message: 'This payment address already has an active IPP listing.',
      });
    }

    const listingId = await ctx.db.insert('ippHandleListings', {
      userId: alias?.userId,
      aliasId: alias?._id,
      addr: args.addr,
      listingType: args.listingType,
      status: 'active',
      source: args.source,
      reasonCode: args.reasonCode,
      reasonDescription: args.reasonDescription,
      evidence: args.evidence,
      effectiveAt: now,
      expiresAt: args.listingType === 'hotlist' ? now + 30 * DAY_MS : undefined,
      reviewDueAt: args.listingType === 'hotlist' ? now + 15 * DAY_MS : undefined,
      createdBy: staffId,
      createdAt: now,
      updatedAt: now,
    });

    if (alias && alias.status !== 'BLOCKED') {
      await ctx.db.patch(alias._id, { status: 'BLOCKED', updatedAt: now });
    }

    await recordEvidence(
      ctx,
      args.listingType,
      'ippHandleListings',
      String(listingId),
      `${args.listingType} applied to ${args.addr}.`,
      { reasonCode: args.reasonCode, source: args.source }
    );

    scheduleAuditLog(ctx, 'ippHandleListings', listingId, 'CREATE', 'none', 'active');
    return listingId;
  },
});

export const revokeHandleListing = mutation({
  args: {
    listingId: v.id('ippHandleListings'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new ConvexError({ code: 'NOT_FOUND', message: 'Listing not found.' });

    const now = Date.now();
    await ctx.db.patch(args.listingId, {
      status: 'revoked',
      revokedAt: now,
      revokedBy: staffId,
      updatedAt: now,
      evidence: { ...objectRecord(listing.evidence), revocationNotes: args.notes },
    });

    if (listing.aliasId) {
      const activeOthers = await ctx.db
        .query('ippHandleListings')
        .withIndex('by_aliasId', (q) => q.eq('aliasId', listing.aliasId!))
        .collect();
      const stillListed = activeOthers.some(
        (row) => row._id !== args.listingId && row.status === 'active'
      );
      if (!stillListed) {
        const alias = await ctx.db.get(listing.aliasId);
        if (alias?.syncedWithIps) {
          await ctx.db.patch(listing.aliasId, { status: 'ACTIVE', updatedAt: now });
        }
      }
    }

    scheduleAuditLog(ctx, 'ippHandleListings', args.listingId, 'REVOKE', listing.status, 'revoked');
  },
});

export const isAliasListedInternal = internalQuery({
  args: { addr: v.string() },
  handler: async (ctx, { addr }) => {
    const rows = await ctx.db
      .query('ippHandleListings')
      .withIndex('by_addr_status', (q) => q.eq('addr', addr).eq('status', 'active'))
      .collect();
    return rows[0] ?? null;
  },
});

export const evaluateIpsTransactionRiskInternal = internalMutation({
  args: {
    transactionId: v.id('ipsTransactions'),
    trigger: v.string(),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    return evaluateTransactionRisk(ctx, tx, args.trigger);
  },
});

export const runRiskScan = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    const rows = await ctx.db
      .query('ipsTransactions')
      .order('desc')
      .take(args.limit ?? 100);
    const results = [];
    for (const tx of rows) {
      results.push(await evaluateTransactionRisk(ctx, tx, 'manual_scan'));
    }
    return {
      scanned: rows.length,
      flagged: results.filter(Boolean).length,
    };
  },
});

// ---------------------------------------------------------------------------
// Receipts and summaries
// ---------------------------------------------------------------------------

export const createTerminalReceiptInternal = internalMutation({
  args: {
    transactionId: v.id('ipsTransactions'),
    terminalStatus: ipsTransactionStatus,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!terminalIpsStatuses.has(args.terminalStatus)) return null;
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) return null;

    const existing = await ctx.db
      .query('ippTransactionReceipts')
      .withIndex('by_transactionId', (q) => q.eq('transactionId', args.transactionId))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    let notificationId: Id<'notifications'> | undefined;
    const receiptNumber = makeReceiptNumber(tx, now);
    const reason = args.reason ?? tx.errorDescription;

    if (tx.userId) {
      const title =
        args.terminalStatus === 'completed'
          ? 'IPS transaction completed'
          : args.terminalStatus === 'reversed'
            ? 'IPS transaction reversed'
            : args.terminalStatus === 'timeout'
              ? 'IPS transaction needs review'
              : 'IPS transaction failed';
      const body = `${receiptNumber}: ${formatNad(tx.amount)} ${args.terminalStatus}. ${reason ?? 'No additional reason provided.'}`;
      notificationId = await ctx.db.insert('notifications', {
        userId: tx.userId,
        type: 'ipp_transaction_receipt',
        channel: 'in_app',
        title,
        body,
        message: body,
        category: 'payment',
        priority: args.terminalStatus === 'completed' ? 'normal' : 'high',
        entityType: 'ipsTransactions',
        entityId: String(args.transactionId),
        isRead: false,
        metadata: {
          receiptNumber,
          msgId: tx.msgId,
          status: args.terminalStatus,
          amount: tx.amount,
          currency: tx.currency,
          payerAlias: tx.debtorVpa,
          payeeAlias: tx.creditorVpa,
        },
        createdAt: now,
      });
    }

    if (args.terminalStatus !== 'completed') {
      await ctx.db.insert('ipsAlerts', {
        transactionId: args.transactionId,
        alertType: 'ipp_terminal_exception',
        severity: args.terminalStatus === 'timeout' ? 'critical' : 'warning',
        message: `${tx.msgId} ended as ${args.terminalStatus}: ${reason ?? 'No reason supplied'}`,
        isResolved: false,
        metadata: { receiptNumber, status: args.terminalStatus, reason },
        createdAt: now,
      });
    }

    return ctx.db.insert('ippTransactionReceipts', {
      transactionId: args.transactionId,
      userId: tx.userId,
      receiptNumber,
      terminalStatus: args.terminalStatus,
      amount: tx.amount,
      currency: tx.currency,
      direction: tx.direction,
      payerAlias: tx.debtorVpa,
      payeeAlias: tx.creditorVpa,
      reason,
      notificationId,
      metadata: { msgId: tx.msgId, loanId: tx.loanId, paymentId: tx.paymentId },
      createdAt: now,
    });
  },
});

export const listReceipts = query({
  args: {
    userId: v.optional(v.id('users')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await assertOwnerOrStaff(ctx, args.userId);
      return ctx.db
        .query('ippTransactionReceipts')
        .withIndex('by_userId', (q) => q.eq('userId', args.userId))
        .order('desc')
        .take(args.limit ?? 50);
    }
    await assertStaff(ctx);
    return ctx.db
      .query('ippTransactionReceipts')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

export const getOperationsSummary = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    const [disputes, risks, listings, alerts, receipts] = await Promise.all([
      ctx.db
        .query('ippDisputeCases')
        .withIndex('by_status', (q) => q.eq('status', 'opened'))
        .collect(),
      ctx.db
        .query('ippRiskEvents')
        .withIndex('by_status', (q) => q.eq('status', 'open'))
        .collect(),
      ctx.db
        .query('ippHandleListings')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect(),
      ctx.db
        .query('ipsAlerts')
        .withIndex('by_isResolved', (q) => q.eq('isResolved', false))
        .collect(),
      ctx.db.query('ippTransactionReceipts').order('desc').take(25),
    ]);

    return {
      openDisputes: disputes.length,
      openRiskEvents: risks.length,
      criticalRiskEvents: risks.filter((event) => event.severity === 'critical').length,
      activeListings: listings.length,
      unresolvedAlerts: alerts.length,
      recentReceipts: receipts.length,
    };
  },
});
