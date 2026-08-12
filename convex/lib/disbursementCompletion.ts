/**
 * Canonical disbursement completion.
 *
 * Both operator-confirmed rails and IPS callbacks use this core so the financial
 * state transition, schedule, projections, audits, and notifications cannot drift.
 * The ledger family remains rail-specific: manual rails enqueue DISBURSEMENT,
 * while IPS keeps its IPS_INITIATE / IPS_COMPLETE transfer pair.
 */

import type { GenericMutationCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { internal } from '../_generated/api';
import type { DataModel, Id } from '../_generated/dataModel';
import { calculateMonthlyInstalment, calculateTotalRepayable } from './amortization';
import { scheduleAuditLog } from './audit';
import { DOMAIN_EVENTS, emitDomainEvent } from './domainEvents';
import { enqueueOutboxIdempotent } from './outbox';
import { ensurePaymentSchedule } from './scheduleGeneration';

type MutCtx = GenericMutationCtx<DataModel>;

type DisbursementMethod = 'bank_transfer' | 'ips' | 'mobile_money' | 'cash' | 'cheque';

function mergeMetadata(existing: unknown, extra: Record<string, unknown>) {
  return {
    ...(existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {}),
    ...extra,
  };
}

export async function completeDisbursementCore(
  ctx: MutCtx,
  args: {
    disbursementId: Id<'disbursements'>;
    referenceNumber?: string;
    method?: DisbursementMethod;
    ledgerFamily: 'manual' | 'ips';
    actorId?: Id<'users'>;
    metadata?: Record<string, unknown>;
    processedAt?: number;
  }
) {
  const disbursement = await ctx.db.get(args.disbursementId);
  if (!disbursement) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });
  }

  // A provider retry after completion is a successful no-op. Every effect below is
  // emitted only on the first terminal transition.
  if (disbursement.status === 'completed') {
    return { completed: false, alreadyCompleted: true, loanId: disbursement.loanId };
  }
  if (!['pending', 'processing'].includes(disbursement.status)) {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: `Cannot complete disbursement with status '${disbursement.status}'.`,
    });
  }

  const loan = await ctx.db.get(disbursement.loanId);
  if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
  if (loan.userId !== disbursement.userId) {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: 'Disbursement is not linked to the expected borrower.',
    });
  }
  if (loan.status !== 'approved') {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: `Loan is no longer 'approved' (current: '${loan.status}'). Fail or reconcile this disbursement instead.`,
    });
  }
  if (Math.abs(disbursement.amount - loan.principal) > 0.01) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `Disbursement amount ${disbursement.amount} does not equal loan principal ${loan.principal}.`,
    });
  }
  if (args.ledgerFamily === 'ips' && args.method && args.method !== 'ips') {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: 'IPS completion must retain IPS provenance.',
    });
  }

  const now = args.processedAt ?? Date.now();
  const method = args.ledgerFamily === 'ips' ? 'ips' : (args.method ?? disbursement.method);
  const referenceNumber = args.referenceNumber ?? disbursement.referenceNumber;

  await ctx.db.patch(args.disbursementId, {
    status: 'completed',
    method,
    referenceNumber,
    processedAt: now,
    metadata: args.metadata
      ? mergeMetadata(disbursement.metadata, args.metadata)
      : disbursement.metadata,
    updatedAt: now,
  });

  if (args.ledgerFamily === 'manual') {
    await enqueueOutboxIdempotent(ctx, {
      idempotencyKey: `disbursement:${args.disbursementId}`,
      eventType: 'DISBURSEMENT',
      sourceTable: 'disbursements',
      sourceId: args.disbursementId,
      payload: {
        loan_id: disbursement.loanId,
        amount: Math.round(disbursement.amount * 100),
        disbursement_id: args.disbursementId,
        transfer_code: 1001,
      },
    });
  }

  await ctx.db.patch(disbursement.loanId, {
    status: 'funded',
    disbursedAt: now,
    outstandingBalance: loan.outstandingBalance ?? loan.principal,
    monthlyPayment:
      loan.monthlyPayment ??
      calculateMonthlyInstalment(loan.principal, loan.interestRate, loan.termMonths),
    totalRepayment:
      loan.totalRepayment ??
      calculateTotalRepayable(loan.principal, loan.interestRate, loan.termMonths),
    updatedAt: now,
  });
  scheduleAuditLog(ctx, 'loan', disbursement.loanId, 'FUND', 'approved', 'funded');
  emitDomainEvent(
    ctx,
    DOMAIN_EVENTS.LOAN_FUNDED,
    'loans',
    disbursement.loanId,
    { principal: loan.principal, disbursementId: args.disbursementId },
    { actorId: args.actorId, actorType: args.actorId ? 'user' : 'system' }
  );

  const installments = await ensurePaymentSchedule(ctx, loan, now);
  if (installments > 0) {
    scheduleAuditLog(
      ctx,
      'paymentSchedules',
      disbursement.loanId,
      'GENERATE_SCHEDULE',
      'none',
      'scheduled'
    );
    emitDomainEvent(ctx, DOMAIN_EVENTS.SCHEDULE_GENERATED, 'loans', disbursement.loanId, {
      loanId: disbursement.loanId,
      installments,
      termMonths: loan.termMonths,
    });
  }

  scheduleAuditLog(
    ctx,
    'disbursement',
    args.disbursementId,
    'COMPLETE',
    disbursement.status,
    'completed'
  );
  emitDomainEvent(
    ctx,
    DOMAIN_EVENTS.DISBURSEMENT_COMPLETED,
    'disbursements',
    args.disbursementId,
    { loanId: disbursement.loanId, amount: disbursement.amount, method },
    { actorId: args.actorId, actorType: args.actorId ? 'user' : 'system' }
  );

  const amountFormatted = `N$ ${disbursement.amount.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
    userId: disbursement.userId,
    title: 'Loan Funds Disbursed',
    message: `${amountFormatted} has been disbursed to your account${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}. Your loan is now active.`,
    category: 'loan',
    priority: 'high',
    actionUrl: `/loans/${disbursement.loanId}`,
    actionLabel: 'View Loan',
    dedupeKey: `disbursement:${args.disbursementId}:completed:client`,
    entityType: 'disbursements',
    entityId: String(args.disbursementId),
    metadata: {
      loanId: disbursement.loanId,
      disbursementId: args.disbursementId,
      amount: disbursement.amount,
      referenceNumber,
      method,
    },
  });
  await ctx.scheduler.runAfter(0, internal.notifications.createStaffNotifications, {
    institutionId: disbursement.institutionId ?? loan.institutionId,
    title: 'Disbursement Completed',
    message: `${amountFormatted} was disbursed successfully via ${method.replace('_', ' ')}.`,
    category: 'payment',
    priority: 'high',
    actionUrl: '/admin/loans',
    actionLabel: 'View Disbursement',
    dedupeKey: `disbursement:${args.disbursementId}:completed:staff`,
    entityType: 'disbursements',
    entityId: String(args.disbursementId),
    metadata: {
      loanId: disbursement.loanId,
      disbursementId: args.disbursementId,
      amount: disbursement.amount,
      referenceNumber,
      method,
    },
  });

  return { completed: true, alreadyCompleted: false, loanId: disbursement.loanId, installments };
}
