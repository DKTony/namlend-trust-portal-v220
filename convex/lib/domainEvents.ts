/**
 * Semantic Domain Events — typed, past-tense event vocabulary.
 *
 * These complement the generic CRUD events emitted by the audit bridge
 * (scheduleAuditLog → eventJournal). Domain events use past-tense naming
 * (loan.approved, not loan.APPROVE) and carry structured payloads
 * designed for downstream consumers (projections, triggers, UI).
 *
 * Usage: call emitDomainEvent() inside mutations alongside scheduleAuditLog().
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { emitEvent, generateCorrelationId } from './eventEmitter';
import { scheduleProjection } from './projectionEmitter';

type MutCtx = GenericMutationCtx<DataModel>;

/** Domain event catalog — all known semantic event types. */
export const DOMAIN_EVENTS = {
  // Lending lifecycle
  LOAN_CREATED: 'loan.created',
  LOAN_SUBMITTED: 'loan.submitted',
  LOAN_UNDER_REVIEW: 'loan.under_review',
  LOAN_APPROVED: 'loan.approved',
  LOAN_REJECTED: 'loan.rejected',
  LOAN_FUNDED: 'loan.funded',
  LOAN_PAID_OFF: 'loan.paid_off',

  // Disbursement lifecycle
  DISBURSEMENT_INITIATED: 'disbursement.initiated',
  DISBURSEMENT_PROCESSING: 'disbursement.processing',
  DISBURSEMENT_COMPLETED: 'disbursement.completed',
  DISBURSEMENT_FAILED: 'disbursement.failed',
  DISBURSEMENT_REVERSED: 'disbursement.reversed',

  // Payment lifecycle
  PAYMENT_RECORDED: 'payment.recorded',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
} as const;

/** Infer domain source from entity type. */
function inferDomainSource(entityType: string): string {
  if (entityType.startsWith('loan') || entityType === 'loans') return 'lending';
  if (entityType.startsWith('payment') || entityType === 'paymentTransactions') return 'payments';
  if (entityType.startsWith('disbursement') || entityType === 'disbursements') return 'payments';
  return 'system';
}

/**
 * Emit a semantic domain event to the event journal.
 * Fire-and-forget — same pattern as emitEvent() and scheduleAuditLog().
 *
 * @param ctx - Mutation context
 * @param eventName - Semantic event name from DOMAIN_EVENTS (e.g., 'loan.approved')
 * @param entityType - Table name (e.g., 'loans', 'disbursements')
 * @param entityId - Document ID as string
 * @param payload - Structured event data
 * @param options - Optional correlationId, causationId, actorId
 */
export function emitDomainEvent(
  ctx: MutCtx,
  eventName: string,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>,
  options?: {
    correlationId?: string;
    causationId?: string;
    actorId?: Id<'users'>;
    actorType?: 'user' | 'system' | 'webhook' | 'cron';
  }
): void {
  emitEvent(ctx, {
    eventType: eventName,
    entityType,
    entityId,
    domainSource: inferDomainSource(entityType),
    correlationId: options?.correlationId ?? generateCorrelationId(),
    causationId: options?.causationId,
    actorId: options?.actorId,
    actorType: options?.actorType ?? 'system',
    payload,
  });

  // Schedule downstream projection updates (fire-and-forget)
  scheduleProjection(ctx, eventName, entityType, entityId, payload);
}
