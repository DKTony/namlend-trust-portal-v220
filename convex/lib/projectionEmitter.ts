/**
 * Projection Emitter — routes domain events to projection handlers.
 *
 * Called by emitDomainEvent() after writing to the event journal.
 * Uses ctx.scheduler.runAfter(0, ...) for fire-and-forget delivery.
 * Each projection handler is idempotent (checks lastEventId).
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { generateCorrelationId } from './eventEmitter';

type MutCtx = GenericMutationCtx<DataModel>;

/**
 * Schedule projection updates for a domain event.
 * Only events with registered handlers trigger projections.
 */
export function scheduleProjection(
  ctx: MutCtx,
  eventName: string,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>
): void {
  const eventId = generateCorrelationId();

  switch (eventName) {
    case 'loan.approved':
      ctx.scheduler
        .runAfter(0, internal.projections.portfolioProjection.onLoanApproved, {
          eventId,
          loanId: entityId,
          amount: typeof payload?.amount === 'number' ? payload.amount : undefined,
        })
        .catch(() => {});
      break;

    case 'loan.funded':
      ctx.scheduler
        .runAfter(0, internal.projections.portfolioProjection.onLoanFunded, {
          eventId,
          loanId: entityId,
        })
        .catch(() => {});
      break;

    case 'payment.completed':
      ctx.scheduler
        .runAfter(0, internal.projections.portfolioProjection.onPaymentCompleted, {
          eventId,
          amount: typeof payload?.amount === 'number' ? payload.amount : undefined,
        })
        .catch(() => {});
      break;

    case 'loan.paid_off':
      ctx.scheduler
        .runAfter(0, internal.projections.portfolioProjection.onLoanPaidOff, {
          eventId,
          loanId: entityId,
        })
        .catch(() => {});
      break;

    case 'disbursement.completed':
      ctx.scheduler
        .runAfter(0, internal.projections.portfolioProjection.onDisbursementCompleted, {
          eventId,
          amount: typeof payload?.amount === 'number' ? payload.amount : undefined,
        })
        .catch(() => {});
      break;

    default:
      // No projection registered for this event — no-op
      break;
  }
}
