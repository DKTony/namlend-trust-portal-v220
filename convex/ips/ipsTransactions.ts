/**
 * IPS Transactions — portal lifecycle owner for IPP/IPS repayment and
 * disbursement flows.
 *
 * The public portal mutations generate TSD-compliant message IDs server-side,
 * create/link pending financial records, and schedule the actual ReqPay action.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { completeDisbursementCore } from '../lib/disbursementCompletion';
import { DOMAIN_EVENTS, emitDomainEvent } from '../lib/domainEvents';
import { assertCallerClientFeatureEnabled, assertCallerFeatureEnabled } from '../lib/entitlements';
import { computePayoffQuoteNAD } from '../lib/paymentAllocation';
import { applyCompletedRepayment } from '../lib/repaymentApplication';
import {
  assertAuthenticated,
  assertOwnerOrTenantStaff,
  assertStaff,
  assertTenantStaff,
} from '../lib/auth';
import { assertKycVerifiedForUser } from '../lib/kyc';
import { assertAliasUsable } from '../lib/ipsAliasRules';
import { getErrorEntry } from '../lib/ipsErrorCodes';
import { getPortalFlowDefaults } from '../lib/ipsProductionConfig';
import {
  deriveUseCaseType,
  enforceTransactionLimits,
  type IpsUseCaseType,
} from '../lib/ipsTransactionLimits';
import { generateMsgId } from '../lib/ipsXmlBuilder';
import { enqueueOutboxIdempotent } from '../lib/outbox';
import { emitRelationship } from '../lib/relationshipEmitter';
import { applyTenantScope, resolveWriteInstitution, tenantReadScope } from '../lib/tenancy';
import { ipsTransactionStatus } from '../schema';

const SEVEN_YEARS_MS = 7 * 365 * 24 * 60 * 60 * 1000;

type TerminalStatus = 'completed' | 'failed' | 'reversed' | 'timeout';
type UpdateStatus = 'processing' | TerminalStatus;

function toSettlementDate(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function mergeMetadata(existing: unknown, extra: Record<string, unknown>) {
  return {
    ...(existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {}),
    ...extra,
  };
}

async function authorizeTransactionRead(
  ctx: any,
  tx: { userId?: Id<'users'>; institutionId?: Id<'institutions'> } | null
) {
  if (!tx) return;
  if (tx.userId) {
    await assertOwnerOrTenantStaff(ctx, tx.userId, tx.institutionId);
  } else if (tx.institutionId) {
    await assertTenantStaff(ctx, tx.institutionId);
  } else {
    await assertStaff(ctx);
  }
}

async function findTransactionForClientRequest(
  ctx: any,
  ownerUserId: Id<'users'>,
  clientRequestId?: string
) {
  if (!clientRequestId) return null;

  return ctx.db
    .query('ipsTransactions')
    .withIndex('by_clientRequestId', (q: any) => q.eq('clientRequestId', clientRequestId))
    .filter((q: any) => q.eq(q.field('userId'), ownerUserId))
    .first();
}

async function resolveUsableAliasForUser(
  ctx: any,
  userId: Id<'users'>,
  aliasId?: Id<'ipsAliasDirectory'>,
  addr?: string
) {
  const alias = aliasId
    ? await ctx.db.get(aliasId)
    : addr
      ? await ctx.db
          .query('ipsAliasDirectory')
          .withIndex('by_addr', (q: any) => q.eq('addr', addr))
          .first()
      : null;

  if (!alias) {
    throw new ConvexError({
      code: 'ALIAS_REQUIRED',
      message: 'Select an active IPS payment address before initiating this transaction.',
    });
  }

  if (alias.userId !== userId) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'The payment address does not belong to this customer.',
    });
  }

  assertAliasUsable(alias);
  await assertPaymentAddressNotListed(ctx, alias.addr, 'customer');
  return alias;
}

async function assertPaymentAddressNotListed(ctx: any, addr: string | undefined, role: string) {
  if (!addr) return;
  const listing = await ctx.db
    .query('ippHandleListings')
    .withIndex('by_addr_status', (q: any) => q.eq('addr', addr).eq('status', 'active'))
    .first();

  if (listing) {
    throw new ConvexError({
      code: 'ALIAS_LISTED',
      message: `The ${role} payment address is currently ${listing.listingType}ed for IPS use.`,
    });
  }
}

async function insertIpsOutbox(
  ctx: any,
  txId: Id<'ipsTransactions'>,
  msgId: string,
  amount: number,
  direction: string
) {
  await enqueueOutboxIdempotent(ctx, {
    idempotencyKey: `ips:initiate:${txId}`,
    eventType: 'IPS_INITIATE',
    sourceTable: 'ipsTransactions',
    sourceId: txId,
    payload: {
      amount: Math.round(amount * 100),
      msg_id: msgId,
      direction,
    },
  });
}

async function recordIppEvidence(
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
    severity: evidenceType === 'incident' || evidenceType === 'timeout' ? 'warning' : 'info',
    status: 'open',
    reportDueAt: evidenceType === 'incident' ? now + 48 * 60 * 60 * 1000 : undefined,
    retentionUntil: now + SEVEN_YEARS_MS,
    metadata,
    createdAt: now,
    updatedAt: now,
  });
}

async function completeLinkedPayment(
  ctx: any,
  paymentId: Id<'paymentTransactions'>,
  tx: any,
  now: number
) {
  const payment = await ctx.db.get(paymentId);
  if (!payment || payment.status === 'completed') return;
  if (!['pending', 'processing'].includes(payment.status)) return;

  // Shared completion routine: derives principal/interest splits from the
  // amortization schedule, updates the loan in integer cents, and enqueues the
  // REPAYMENT ledger legs (previously missing on the IPS path — only the
  // IPS_COMPLETE clearing leg was posted). Idempotency key
  // `repayment:payment:{id}` is shared with the manual/webhook paths, so a
  // payment completed via any route posts exactly one REPAYMENT entry.
  await applyCompletedRepayment(ctx, {
    payment,
    feesPaidNAD: payment.feesPaid ?? 0,
    now,
  });

  // IPS provenance on top of the routine's patch
  const refreshed = await ctx.db.get(paymentId);
  await ctx.db.patch(paymentId, {
    metadata: mergeMetadata(refreshed?.metadata ?? payment.metadata, {
      ipsStatus: 'completed',
      ipsMsgId: tx.msgId,
      ipsTransactionId: tx._id,
    }),
    updatedAt: now,
  });

  scheduleAuditLog(ctx, 'payment', paymentId, 'COMPLETE', payment.status, 'completed');
}

async function failLinkedPayment(
  ctx: any,
  paymentId: Id<'paymentTransactions'>,
  tx: any,
  now: number,
  reason?: string
) {
  const payment = await ctx.db.get(paymentId);
  if (!payment || !['pending', 'processing'].includes(payment.status)) return;

  await ctx.db.patch(paymentId, {
    status: 'failed',
    metadata: mergeMetadata(payment.metadata, {
      failureReason: reason,
      ipsStatus: 'failed',
      ipsMsgId: tx.msgId,
      ipsTransactionId: tx._id,
    }),
    updatedAt: now,
  });

  scheduleAuditLog(ctx, 'payment', paymentId, 'FAIL', payment.status, 'failed', reason);
}

async function updateLinkedDisbursement(
  ctx: any,
  disbursementId: Id<'disbursements'>,
  tx: any,
  status: UpdateStatus,
  now: number,
  reason?: string
) {
  const disbursement = await ctx.db.get(disbursementId);
  if (!disbursement) return;

  if (status === 'processing' && disbursement.status === 'pending') {
    await ctx.db.patch(disbursementId, {
      status: 'processing',
      method: 'ips',
      metadata: mergeMetadata(disbursement.metadata, {
        ipsStatus: 'processing',
        ipsMsgId: tx.msgId,
        ipsTransactionId: tx._id,
      }),
      updatedAt: now,
    });
    scheduleAuditLog(ctx, 'disbursement', disbursementId, 'PROCESS', 'pending', 'processing');
    return;
  }

  if (status === 'completed' && disbursement.status !== 'completed') {
    if (!['pending', 'processing'].includes(disbursement.status)) return;
    await completeDisbursementCore(ctx, {
      disbursementId,
      referenceNumber: tx.endToEndId ?? tx.msgId,
      method: 'ips',
      ledgerFamily: 'ips',
      processedAt: now,
      metadata: {
        ipsStatus: 'completed',
        ipsMsgId: tx.msgId,
        ipsTransactionId: tx._id,
      },
    });
    return;
  }

  if (status === 'failed' && ['pending', 'processing'].includes(disbursement.status)) {
    await ctx.db.patch(disbursementId, {
      status: 'failed',
      method: 'ips',
      failureReason: reason,
      metadata: mergeMetadata(disbursement.metadata, {
        ipsStatus: 'failed',
        ipsMsgId: tx.msgId,
        ipsTransactionId: tx._id,
      }),
      updatedAt: now,
    });
    scheduleAuditLog(
      ctx,
      'disbursement',
      disbursementId,
      'FAIL',
      disbursement.status,
      'failed',
      reason
    );
    await ctx.scheduler.runAfter(0, internal.notifications.createStaffNotifications, {
      institutionId: disbursement.institutionId,
      title: 'IPS Disbursement Failed',
      message: 'An IPS disbursement failed and requires reconciliation.',
      category: 'payment',
      priority: 'urgent',
      actionUrl: '/admin/loans',
      actionLabel: 'Review IPS Disbursement',
      dedupeKey: `disbursement:${disbursementId}:failed:staff`,
      entityType: 'disbursements',
      entityId: String(disbursementId),
      metadata: { disbursementId, ipsTransactionId: tx._id, loanId: disbursement.loanId },
    });
  }
}

async function applyLinkedLifecycleSideEffects(
  ctx: any,
  tx: any,
  status: UpdateStatus,
  now: number,
  reason?: string
) {
  if (tx.paymentId) {
    if (status === 'processing') {
      const payment = await ctx.db.get(tx.paymentId);
      if (payment?.status === 'pending') {
        await ctx.db.patch(tx.paymentId, {
          status: 'processing',
          metadata: mergeMetadata(payment.metadata, {
            ipsStatus: 'processing',
            ipsMsgId: tx.msgId,
            ipsTransactionId: tx._id,
          }),
          updatedAt: now,
        });
      }
    } else if (status === 'completed') {
      await completeLinkedPayment(ctx, tx.paymentId, tx, now);
    } else if (status === 'failed') {
      await failLinkedPayment(ctx, tx.paymentId, tx, now, reason);
    }
  }

  if (tx.disbursementId) {
    await updateLinkedDisbursement(ctx, tx.disbursementId, tx, status, now, reason);
  }
}

async function updateIpsTransactionStatusCore(
  ctx: any,
  args: {
    transactionId: Id<'ipsTransactions'>;
    status: UpdateStatus;
    rawResponse?: unknown;
    errorCode?: string;
    errorDescription?: string;
    settlementDate?: string;
    transport?: unknown;
  }
) {
  const tx = await ctx.db.get(args.transactionId);
  if (!tx) throw new ConvexError({ code: 'NOT_FOUND', message: 'IPS transaction not found.' });

  const now = Date.now();
  const terminal = ['completed', 'failed', 'reversed', 'timeout'].includes(args.status);
  const updates: Record<string, unknown> = {
    status: args.status,
    rawResponse: args.rawResponse,
    errorCode: args.errorCode,
    errorDescription: args.errorDescription,
    settlementDate:
      args.status === 'completed'
        ? (args.settlementDate ?? tx.settlementDate ?? toSettlementDate(now))
        : args.settlementDate,
    updatedAt: now,
  };

  if (args.transport) {
    updates.transport = mergeMetadata(tx.transport, args.transport as Record<string, unknown>);
  }
  if (args.status === 'processing') {
    updates.ackAt = tx.ackAt ?? now;
  }
  if (terminal) {
    updates.callbackAt = now;
  }
  if (args.status === 'completed') {
    updates.completedAt = now;
    await enqueueOutboxIdempotent(ctx, {
      idempotencyKey: `ipsComplete:${args.transactionId}`,
      eventType: 'IPS_COMPLETE',
      sourceTable: 'ipsTransactions',
      sourceId: args.transactionId,
      payload: {
        amount: Math.round(tx.amount * 100),
        msg_id: tx.msgId,
        direction: tx.direction,
        loan_id: tx.loanId,
        disbursement_id: tx.disbursementId,
        payment_id: tx.paymentId,
      },
    });
  } else if (args.status === 'failed') {
    await enqueueOutboxIdempotent(ctx, {
      idempotencyKey: `ips:reverse:${args.transactionId}`,
      eventType: 'IPS_REVERSE',
      sourceTable: 'ipsTransactions',
      sourceId: args.transactionId,
      payload: {
        amount: Math.round(tx.amount * 100),
        msg_id: tx.msgId,
        direction: tx.direction,
        loan_id: tx.loanId,
        disbursement_id: tx.disbursementId,
        payment_id: tx.paymentId,
        reason: args.errorDescription,
      },
    });
  }

  await ctx.db.patch(args.transactionId, updates);

  await applyLinkedLifecycleSideEffects(ctx, tx, args.status, now, args.errorDescription);
  await ctx.scheduler.runAfter(0, internal.ippOperations.evaluateIpsTransactionRiskInternal, {
    transactionId: args.transactionId,
    trigger: `status_${args.status}`,
  });

  if (terminal) {
    await ctx.scheduler.runAfter(0, internal.ippOperations.createTerminalReceiptInternal, {
      transactionId: args.transactionId,
      terminalStatus: args.status,
      reason: args.errorDescription,
    });
  }

  if (args.status === 'timeout') {
    await recordIppEvidence(
      ctx,
      'timeout',
      'ipsTransactions',
      String(args.transactionId),
      'IPS transaction timed out pending deemed resolution.',
      {
        msgId: tx.msgId,
        errorCode: args.errorCode,
      }
    );
  } else if (args.status === 'failed') {
    const errorEntry = getErrorEntry(args.errorCode ?? 'UNKNOWN');
    if (errorEntry.classification === 'TD') {
      await recordIppEvidence(
        ctx,
        'incident',
        'ipsTransactions',
        String(args.transactionId),
        'Technical IPS decline reached terminal failure.',
        {
          msgId: tx.msgId,
          errorCode: args.errorCode,
          classification: errorEntry.classification,
        }
      );
    }
  }

  scheduleAuditLog(
    ctx,
    'ips_transaction',
    args.transactionId,
    'STATUS_CHANGE',
    tx.status,
    args.status
  );
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getTransaction = query({
  args: { transactionId: v.id('ipsTransactions') },
  handler: async (ctx, { transactionId }) => {
    const tx = await ctx.db.get(transactionId);
    await authorizeTransactionRead(ctx, tx);
    return tx;
  },
});

export const getTransactionByMsgId = query({
  args: { msgId: v.string() },
  handler: async (ctx, { msgId }) => {
    const tx = await ctx.db
      .query('ipsTransactions')
      .withIndex('by_msgId', (q) => q.eq('msgId', msgId))
      .first();
    await authorizeTransactionRead(ctx, tx);
    return tx;
  },
});

/** Internal version — callable from actions/webhooks without auth context. */
export const getTransactionByMsgIdInternal = internalQuery({
  args: { msgId: v.string() },
  handler: async (ctx, { msgId }) => {
    return ctx.db
      .query('ipsTransactions')
      .withIndex('by_msgId', (q) => q.eq('msgId', msgId))
      .first();
  },
});

export const getTransactionsForSettlementInternal = internalQuery({
  args: {
    settlementDate: v.string(),
  },
  handler: async (ctx, { settlementDate }) => {
    return ctx.db
      .query('ipsTransactions')
      .withIndex('by_settlementDate_status', (q) =>
        q.eq('settlementDate', settlementDate).eq('status', 'completed')
      )
      .collect();
  },
});

export const getTransactionsByLoan = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);
    return ctx.db
      .query('ipsTransactions')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('desc')
      .collect();
  },
});

export const adminListIpsTransactions = query({
  args: {
    status: v.optional(ipsTransactionStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'ippOnboarding');
    const scope = await tenantReadScope(ctx);
    if (status) {
      const rows = await ctx.db
        .query('ipsTransactions')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
      return applyTenantScope(rows, scope);
    }
    const rows = await ctx.db
      .query('ipsTransactions')
      .order('desc')
      .take(limit ?? 100);
    return applyTenantScope(rows, scope);
  },
});

// ---------------------------------------------------------------------------
// Portal Mutations
// ---------------------------------------------------------------------------

export const initiateIpsRepayment = mutation({
  args: {
    loanId: v.id('loans'),
    amount: v.number(),
    payerVpa: v.optional(v.string()),
    payerAliasId: v.optional(v.id('ipsAliasDirectory')),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAuthenticated(ctx);
    await assertCallerFeatureEnabled(ctx, 'ippOnboarding');
    await assertCallerClientFeatureEnabled(ctx, 'clientBanking');
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);

    const existing = await findTransactionForClientRequest(ctx, loan.userId, args.clientRequestId);
    if (existing) {
      return {
        success: true,
        message: 'Payment request already initiated.',
        ips_transaction_id: String(existing._id),
        payment_id: existing.paymentId ? String(existing.paymentId) : undefined,
        msg_id: existing.msgId,
        amount: existing.amount,
        currency: existing.currency,
        payer_vpa: existing.debtorVpa,
        payee_vpa: existing.creditorVpa,
        loan_id: String(existing.loanId),
        outstanding_after: Math.max(
          0,
          (loan.outstandingBalance ?? loan.principal) - existing.amount
        ),
      };
    }

    if (!['active', 'funded'].includes(loan.status)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot initiate IPS repayment for loan status '${loan.status}'.`,
      });
    }

    const outstanding = loan.outstandingBalance ?? loan.principal;
    // Cap at the payoff quote (outstanding principal + interest already due)
    // so a delinquent borrower can settle in full, while overpayment beyond
    // settlement is still rejected at initiation.
    const scheduleRows = await ctx.db
      .query('paymentSchedules')
      .withIndex('by_loanId', (q) => q.eq('loanId', args.loanId))
      .collect();
    const payoffQuote = computePayoffQuoteNAD(scheduleRows, outstanding, Date.now());
    const maxPayable = Math.max(outstanding, payoffQuote);
    if (args.amount <= 0 || args.amount > maxPayable + 0.005) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Payment amount must be positive and no more than the settlement amount.',
      });
    }

    const payerAlias = await resolveUsableAliasForUser(
      ctx,
      loan.userId,
      args.payerAliasId,
      args.payerVpa
    );
    const defaults = getPortalFlowDefaults();
    const msgId = generateMsgId();
    const now = Date.now();

    await enforceTransactionLimits(ctx, loan.userId, args.amount, 'P2P');

    const paymentId = await ctx.db.insert('paymentTransactions', {
      loanId: args.loanId,
      userId: loan.userId,
      institutionId: await resolveWriteInstitution(ctx, { loanId: args.loanId }),
      amount: args.amount,
      method: 'ips',
      status: 'pending',
      referenceNumber: msgId,
      externalTransactionId: args.clientRequestId,
      paymentDate: now,
      metadata: {
        ipsFlow: 'repayment',
        clientRequestId: args.clientRequestId,
      },
      createdAt: now,
      updatedAt: now,
    });

    const txId = await ctx.db.insert('ipsTransactions', {
      msgId,
      txType: 'request_to_pay',
      direction: 'inbound',
      useCaseType: 'P2P',
      status: 'pending',
      amount: args.amount,
      currency: 'NAD',
      debtorVpa: payerAlias.addr,
      creditorVpa: defaults.collectionsVpa,
      endToEndId: msgId,
      remittanceInfo: `Loan repayment ${args.loanId}`,
      loanId: args.loanId,
      institutionId: loan.institutionId,
      userId: loan.userId,
      paymentId,
      clientRequestId: args.clientRequestId,
      purposeCode: defaults.repaymentPurposeCode,
      initiationMode: defaults.repaymentInitiationMode,
      channel: defaults.webChannel,
      limitScopeKey: `${loan.userId}:P2P`,
      transport: { scheduledAction: 'ReqPay.COLLECT' },
      initiatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(paymentId, {
      ipsTransactionId: txId,
      metadata: {
        ipsFlow: 'repayment',
        clientRequestId: args.clientRequestId,
        ipsTransactionId: txId,
      },
      updatedAt: now,
    });

    await insertIpsOutbox(ctx, txId, msgId, args.amount, 'inbound');
    await ctx.scheduler.runAfter(0, internal.ippOperations.evaluateIpsTransactionRiskInternal, {
      transactionId: txId,
      trigger: 'initiate_repayment',
    });
    await ctx.scheduler.runAfter(0, internal.actions.ipsAdapter.initiateCollectRequest, {
      transactionId: txId,
      msgId,
      amount: args.amount,
      payerVpa: payerAlias.addr,
      payeeVpa: defaults.collectionsVpa,
      note: `Loan repayment ${args.loanId}`,
      purposeCode: defaults.repaymentPurposeCode,
      initiationMode: defaults.repaymentInitiationMode,
    });

    scheduleAuditLog(ctx, 'ips_transaction', txId, 'INITIATE_REPAYMENT', 'none', 'pending');
    return {
      success: true,
      message: 'Payment request initiated. Completion depends on IPS confirmation.',
      ips_transaction_id: String(txId),
      payment_id: String(paymentId),
      msg_id: msgId,
      amount: args.amount,
      currency: 'NAD',
      payer_vpa: payerAlias.addr,
      payee_vpa: defaults.collectionsVpa,
      loan_id: String(args.loanId),
      outstanding_after:
        Math.max(0, Math.round(outstanding * 100) - Math.round(args.amount * 100)) / 100,
    };
  },
});

async function initiateIpsDisbursementCore(
  ctx: any,
  args: {
    disbursementId: Id<'disbursements'>;
    payeeVpa: string;
    clientRequestId?: string;
  }
) {
  const disbursement = await ctx.db.get(args.disbursementId);
  if (!disbursement) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });
  }

  const loan = await ctx.db.get(disbursement.loanId);
  if (!loan || loan.userId !== disbursement.userId) {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: 'Disbursement is not linked to a valid loan/customer record.',
    });
  }

  // Idempotent retries are lookups, not new financial actions. Return the
  // original transaction even after the loan/disbursement has reached a
  // terminal state or the customer's later KYC state has changed.
  if (disbursement.ipsTransactionId) {
    const existing = await ctx.db.get(disbursement.ipsTransactionId);
    if (existing) {
      return {
        success: true,
        message: 'Disbursement request already initiated.',
        ips_transaction_id: String(existing._id),
        msg_id: existing.msgId,
        amount: existing.amount,
        currency: existing.currency,
        payer_vpa: existing.debtorVpa,
        payee_vpa: existing.creditorVpa,
        loan_id: String(existing.loanId),
        disbursement_id: String(args.disbursementId),
      };
    }
  }

  const existingForRequest = await findTransactionForClientRequest(
    ctx,
    disbursement.userId,
    args.clientRequestId
  );
  if (existingForRequest) {
    if (existingForRequest.disbursementId !== args.disbursementId) {
      throw new ConvexError({
        code: 'CONFLICT',
        message: 'The client request ID is already linked to another disbursement.',
      });
    }
    return {
      success: true,
      message: 'Disbursement request already initiated.',
      ips_transaction_id: String(existingForRequest._id),
      msg_id: existingForRequest.msgId,
      amount: existingForRequest.amount,
      currency: existingForRequest.currency,
      payer_vpa: existingForRequest.debtorVpa,
      payee_vpa: existingForRequest.creditorVpa,
      loan_id: String(existingForRequest.loanId),
      disbursement_id: String(args.disbursementId),
    };
  }

  await assertKycVerifiedForUser(ctx, loan.userId, 'initiate IPS disbursement');
  if (loan.status !== 'approved') {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: `Loan must be approved before IPS disbursement. Current: '${loan.status}'.`,
    });
  }
  if (Math.abs(disbursement.amount - loan.principal) > 0.01) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Partial disbursement is disabled. Amount must equal the loan principal.',
    });
  }

  if (!['pending', 'processing'].includes(disbursement.status)) {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: `Cannot initiate IPS disbursement from '${disbursement.status}'.`,
    });
  }

  if (disbursement.amount <= 0) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'Disbursement amount must be positive.',
    });
  }

  const payeeAlias = await resolveUsableAliasForUser(
    ctx,
    disbursement.userId,
    undefined,
    args.payeeVpa
  );
  const defaults = getPortalFlowDefaults();
  const msgId = generateMsgId();
  const now = Date.now();

  await enforceTransactionLimits(ctx, disbursement.userId, disbursement.amount, 'B2P');

  const txId = await ctx.db.insert('ipsTransactions', {
    msgId,
    txType: 'credit_transfer',
    direction: 'outbound',
    useCaseType: 'B2P',
    status: 'pending',
    amount: disbursement.amount,
    currency: 'NAD',
    debtorVpa: defaults.disbursementsVpa,
    creditorVpa: payeeAlias.addr,
    endToEndId: msgId,
    remittanceInfo: `Loan disbursement ${args.disbursementId}`,
    loanId: disbursement.loanId,
    institutionId: disbursement.institutionId,
    userId: disbursement.userId,
    disbursementId: args.disbursementId,
    clientRequestId: args.clientRequestId,
    purposeCode: defaults.disbursementPurposeCode,
    initiationMode: defaults.disbursementInitiationMode,
    channel: defaults.webChannel,
    limitScopeKey: `${disbursement.userId}:B2P:${payeeAlias.addr}`,
    transport: { scheduledAction: 'ReqPay.PAY' },
    initiatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.patch(args.disbursementId, {
    method: 'ips',
    ipsTransactionId: txId,
    metadata: mergeMetadata(disbursement.metadata, {
      ipsFlow: 'disbursement',
      clientRequestId: args.clientRequestId,
      ipsTransactionId: txId,
    }),
    updatedAt: now,
  });

  await insertIpsOutbox(ctx, txId, msgId, disbursement.amount, 'outbound');
  await ctx.scheduler.runAfter(0, internal.ippOperations.evaluateIpsTransactionRiskInternal, {
    transactionId: txId,
    trigger: 'initiate_disbursement',
  });
  await ctx.scheduler.runAfter(0, internal.actions.ipsAdapter.initiateOutboundTransfer, {
    transactionId: txId,
    msgId,
    amount: disbursement.amount,
    creditorVpa: payeeAlias.addr,
    debtorVpa: defaults.disbursementsVpa,
    remittanceInfo: `Loan disbursement ${args.disbursementId}`,
    purposeCode: defaults.disbursementPurposeCode,
    initiationMode: defaults.disbursementInitiationMode,
  });

  scheduleAuditLog(ctx, 'ips_transaction', txId, 'INITIATE_DISBURSEMENT', 'none', 'pending');
  await ctx.scheduler.runAfter(0, internal.notifications.createStaffNotifications, {
    institutionId: disbursement.institutionId ?? loan.institutionId,
    title: 'IPS Disbursement Pending',
    message: 'An IPS disbursement is awaiting provider completion confirmation.',
    category: 'payment',
    priority: 'high',
    actionUrl: '/admin/loans',
    actionLabel: 'View IPS Disbursement',
    dedupeKey: `ips:${txId}:pending:staff`,
    entityType: 'ipsTransactions',
    entityId: String(txId),
    metadata: { ipsTransactionId: txId, disbursementId: args.disbursementId, loanId: loan._id },
  });
  return {
    success: true,
    message: 'Disbursement request initiated. Completion depends on IPS confirmation.',
    ips_transaction_id: String(txId),
    msg_id: msgId,
    amount: disbursement.amount,
    currency: 'NAD',
    payer_vpa: defaults.disbursementsVpa,
    payee_vpa: payeeAlias.addr,
    loan_id: String(disbursement.loanId),
    disbursement_id: String(args.disbursementId),
  };
}

/**
 * Atomically create/reuse the IPS disbursement and its linked IPS transaction.
 * Opening the UI no longer creates a financial row; this mutation is called only
 * after the operator confirms the rail, destination, amount, and loan.
 */
export const startLoanDisbursement = mutation({
  args: {
    loanId: v.id('loans'),
    amount: v.number(),
    payeeVpa: v.string(),
    clientRequestId: v.string(),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'ippOnboarding');
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    if (loan.institutionId) await assertTenantStaff(ctx, loan.institutionId);
    const existingByRequest = await findTransactionForClientRequest(
      ctx,
      loan.userId,
      args.clientRequestId
    );
    if (existingByRequest) {
      if (existingByRequest.loanId !== args.loanId || !existingByRequest.disbursementId) {
        throw new ConvexError({
          code: 'CONFLICT',
          message: 'The client request ID is already linked to another IPS operation.',
        });
      }
      return initiateIpsDisbursementCore(ctx, {
        disbursementId: existingByRequest.disbursementId,
        payeeVpa: args.payeeVpa,
        clientRequestId: args.clientRequestId,
      });
    }

    await assertKycVerifiedForUser(ctx, loan.userId, 'start IPS disbursement');
    if (loan.status !== 'approved') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Loan must be approved before disbursement. Current: '${loan.status}'.`,
      });
    }
    if (args.amount <= 0 || Math.abs(args.amount - loan.principal) > 0.01) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Partial disbursement is disabled. Amount must equal loan principal (${loan.principal}).`,
      });
    }

    const existingPending = await ctx.db
      .query('disbursements')
      .withIndex('by_loanId_status', (q: any) =>
        q.eq('loanId', args.loanId).eq('status', 'pending')
      )
      .first();
    const existingProcessing = await ctx.db
      .query('disbursements')
      .withIndex('by_loanId_status', (q: any) =>
        q.eq('loanId', args.loanId).eq('status', 'processing')
      )
      .first();
    if (existingProcessing && existingProcessing.method !== 'ips') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'A non-IPS disbursement is already processing for this loan.',
      });
    }

    const now = Date.now();
    let disbursementId = (existingPending ?? existingProcessing)?._id;
    if (!disbursementId) {
      disbursementId = await ctx.db.insert('disbursements', {
        loanId: args.loanId,
        userId: loan.userId,
        institutionId:
          loan.institutionId ?? (await resolveWriteInstitution(ctx, { loanId: args.loanId })),
        amount: args.amount,
        method: 'ips',
        status: 'pending',
        initiatedBy: staffId,
        createdAt: now,
        updatedAt: now,
      });
      scheduleAuditLog(ctx, 'disbursement', disbursementId, 'INITIATE', 'none', 'pending');
      emitDomainEvent(
        ctx,
        DOMAIN_EVENTS.DISBURSEMENT_INITIATED,
        'disbursements',
        disbursementId,
        { loanId: args.loanId, amount: args.amount, method: 'ips' },
        { actorId: staffId, actorType: 'user' }
      );
      emitRelationship(
        ctx,
        { type: 'loans', id: args.loanId },
        { type: 'disbursements', id: disbursementId },
        'disbursed_via'
      );
    } else if ((existingPending ?? existingProcessing)?.method !== 'ips') {
      await ctx.db.patch(disbursementId, { method: 'ips', updatedAt: now });
      scheduleAuditLog(ctx, 'disbursement', disbursementId, 'SELECT_RAIL', 'unselected', 'ips');
    }

    return initiateIpsDisbursementCore(ctx, {
      disbursementId,
      payeeVpa: args.payeeVpa,
      clientRequestId: args.clientRequestId,
    });
  },
});

/** Compatibility wrapper for callers that already created a pending row. */
export const initiateIpsDisbursement = mutation({
  args: {
    disbursementId: v.id('disbursements'),
    payeeVpa: v.string(),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'ippOnboarding');
    const disbursement = await ctx.db.get(args.disbursementId);
    if (!disbursement) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });
    }
    if (disbursement.institutionId) await assertTenantStaff(ctx, disbursement.institutionId);
    return initiateIpsDisbursementCore(ctx, args);
  },
});

// ---------------------------------------------------------------------------
// Compatibility Mutation
// ---------------------------------------------------------------------------

/**
 * Deprecated low-level IPS transaction mutation.
 *
 * Kept temporarily for older callers. It now enforces object-level access,
 * validates flow state, ignores caller-provided msgId for new rows, and
 * schedules the outbound transport when enough VPA data is present.
 */
export const initiateIpsTransaction = mutation({
  args: {
    msgId: v.optional(v.string()),
    txType: v.union(
      v.literal('credit_transfer'),
      v.literal('request_to_pay'),
      v.literal('reversal')
    ),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    amount: v.number(),
    currency: v.string(),
    debtorVpa: v.optional(v.string()),
    creditorVpa: v.optional(v.string()),
    debtorName: v.optional(v.string()),
    creditorName: v.optional(v.string()),
    debtorBic: v.optional(v.string()),
    creditorBic: v.optional(v.string()),
    endToEndId: v.optional(v.string()),
    remittanceInfo: v.optional(v.string()),
    loanId: v.optional(v.id('loans')),
    disbursementId: v.optional(v.id('disbursements')),
    externalRef: v.optional(v.string()),
    clientRequestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await assertAuthenticated(ctx);
    await assertCallerFeatureEnabled(ctx, 'ippOnboarding');
    await assertCallerClientFeatureEnabled(ctx, 'clientBanking');

    if (args.amount <= 0 || args.currency !== 'NAD') {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'IPS transactions must be positive NAD amounts.',
      });
    }

    let ownerUserId = callerId;
    let linkedLoanId = args.loanId;
    let linkedDisbursementId = args.disbursementId;

    if (args.loanId) {
      const loan = await ctx.db.get(args.loanId);
      if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
      await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);
      ownerUserId = loan.userId;
    }

    if (args.disbursementId) {
      await assertStaff(ctx);
      const disbursement = await ctx.db.get(args.disbursementId);
      if (!disbursement) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });
      }
      if (disbursement.institutionId) await assertTenantStaff(ctx, disbursement.institutionId);
      if (!['pending', 'processing'].includes(disbursement.status)) {
        throw new ConvexError({
          code: 'INVALID_STATE',
          message: `Cannot initiate IPS disbursement from '${disbursement.status}'.`,
        });
      }
      ownerUserId = disbursement.userId;
      linkedLoanId = disbursement.loanId;
      linkedDisbursementId = args.disbursementId;
    } else if (!args.loanId) {
      await assertStaff(ctx);
    }

    const clientRequestId = args.clientRequestId ?? args.externalRef ?? args.msgId;
    const existing = await findTransactionForClientRequest(ctx, ownerUserId, clientRequestId);
    if (existing) return existing._id;

    const useCaseType: IpsUseCaseType =
      linkedDisbursementId && args.direction === 'outbound'
        ? 'B2P'
        : deriveUseCaseType(args.txType, args.remittanceInfo, undefined);

    await enforceTransactionLimits(ctx, ownerUserId, args.amount, useCaseType);
    await assertPaymentAddressNotListed(ctx, args.debtorVpa, 'debtor');
    await assertPaymentAddressNotListed(ctx, args.creditorVpa, 'creditor');

    const now = Date.now();
    const msgId = generateMsgId();
    const txId = await ctx.db.insert('ipsTransactions', {
      ...args,
      msgId,
      clientRequestId,
      loanId: linkedLoanId,
      disbursementId: linkedDisbursementId,
      userId: ownerUserId,
      institutionId: await resolveWriteInstitution(ctx, {
        loanId: linkedLoanId ?? undefined,
        userId: ownerUserId ?? undefined,
      }),
      useCaseType,
      status: 'pending',
      initiatedAt: now,
      createdAt: now,
      updatedAt: now,
      metadata: {
        deprecatedMutation: true,
        callerProvidedMsgId: args.msgId,
      },
    });

    await insertIpsOutbox(ctx, txId, msgId, args.amount, args.direction);
    await ctx.scheduler.runAfter(0, internal.ippOperations.evaluateIpsTransactionRiskInternal, {
      transactionId: txId,
      trigger: 'initiate_compatibility',
    });

    if (args.debtorVpa && args.creditorVpa) {
      if (args.direction === 'outbound') {
        await ctx.scheduler.runAfter(0, internal.actions.ipsAdapter.initiateOutboundTransfer, {
          transactionId: txId,
          msgId,
          amount: args.amount,
          creditorVpa: args.creditorVpa,
          debtorVpa: args.debtorVpa,
          remittanceInfo: args.remittanceInfo,
        });
      } else if (args.txType === 'request_to_pay') {
        await ctx.scheduler.runAfter(0, internal.actions.ipsAdapter.initiateCollectRequest, {
          transactionId: txId,
          msgId,
          amount: args.amount,
          payerVpa: args.debtorVpa,
          payeeVpa: args.creditorVpa,
          note: args.remittanceInfo,
        });
      }
    }

    return txId;
  },
});

// ---------------------------------------------------------------------------
// Status Updates
// ---------------------------------------------------------------------------

export const updateIpsTransactionStatus = mutation({
  args: {
    transactionId: v.id('ipsTransactions'),
    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('reversed'),
      v.literal('timeout')
    ),
    rawResponse: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    settlementDate: v.optional(v.string()),
    transport: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'ippOnboarding');
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'IPS transaction not found.' });
    }
    if (transaction.institutionId) await assertTenantStaff(ctx, transaction.institutionId);
    await updateIpsTransactionStatusCore(ctx, args);
  },
});

export const updateIpsTransactionStatusInternal = internalMutation({
  args: {
    transactionId: v.id('ipsTransactions'),
    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('reversed'),
      v.literal('timeout')
    ),
    rawResponse: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    settlementDate: v.optional(v.string()),
    transport: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await updateIpsTransactionStatusCore(ctx, args);
  },
});
