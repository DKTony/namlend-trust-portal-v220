/**
 * Audit log scheduler helper — fire-and-forget pattern.
 *
 * Replaces AuditService.logStateTransition(...).catch() pattern from Supabase.
 *
 * How it works:
 *   ctx.scheduler.runAfter(0, internal.audit.writeStateTransition, {...})
 *
 * runAfter(0) schedules the write to execute AFTER the current mutation commits.
 * This means:
 *   1. Main financial operation completes atomically
 *   2. Audit write is enqueued as a separate scheduled function
 *   3. If audit write fails, it retries automatically (Convex scheduler retry)
 *   4. Main mutation is never blocked or rolled back by audit failures
 *
 * This exactly mirrors the `.catch(err => console.error(...))` pattern
 * in the Supabase implementation.
 *
 * ONTOLOGY BRIDGE: Both functions now also emit an event journal entry,
 * so existing code automatically populates the unified event stream.
 */

import { GenericMutationCtx } from 'convex/server';
import { internal } from '../_generated/api';
import { DataModel, Id } from '../_generated/dataModel';
import { emitEvent, generateCorrelationId } from './eventEmitter';

type MutCtx = GenericMutationCtx<DataModel>;

/**
 * Schedules a state transition audit log entry.
 * Also emits an event journal entry for the ontology event stream.
 * Fire-and-forget — never throws, never blocks the calling mutation.
 */
export function scheduleAuditLog(
  ctx: MutCtx,
  entityType: string,
  entityId: string,
  action: string,
  fromState: string,
  toState: string,
  reason?: string,
  options?: { correlationId?: string; causationId?: string }
): void {
  // Original audit log write
  ctx.scheduler
    .runAfter(0, internal.audit.writeStateTransition, {
      entityType,
      entityId,
      action,
      fromState,
      toState,
      reason,
    })
    .catch((err: unknown) => {
      console.error('[audit] scheduleAuditLog enqueue failed:', err);
    });

  // Ontology bridge: emit event journal entry
  emitEvent(ctx, {
    eventType: `${entityType}.${action}`,
    entityType,
    entityId,
    domainSource: inferDomainSource(entityType),
    correlationId: options?.correlationId ?? generateCorrelationId(),
    causationId: options?.causationId,
    actorType: 'system',
    payload: { fromState, toState, reason },
  });
}

/**
 * Schedules a general audit log entry (for non-state-transition events).
 * Also emits an event journal entry for the ontology event stream.
 */
export function scheduleAuditEntry(
  ctx: MutCtx,
  params: {
    entityType: string;
    entityId: string;
    action: string;
    oldState?: Record<string, any>;
    newState?: Record<string, any>;
    userId?: Id<'users'>;
    correlationId?: string;
    causationId?: string;
  }
): void {
  // Original audit log write (pass only the fields writeAuditEntry expects)
  ctx.scheduler
    .runAfter(0, internal.audit.writeAuditEntry, {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldState: params.oldState,
      newState: params.newState,
      userId: params.userId,
    })
    .catch((err: unknown) => {
      console.error('[audit] scheduleAuditEntry enqueue failed:', err);
    });

  // Ontology bridge: emit event journal entry
  emitEvent(ctx, {
    eventType: `${params.entityType}.${params.action}`,
    entityType: params.entityType,
    entityId: params.entityId,
    domainSource: inferDomainSource(params.entityType),
    correlationId: params.correlationId ?? generateCorrelationId(),
    causationId: params.causationId,
    actorId: params.userId,
    actorType: params.userId ? 'user' : 'system',
    payload: {
      action: params.action,
      oldState: params.oldState,
      newState: params.newState,
    },
  });
}

/**
 * Infer the ontology domain source from an entity type.
 * Maps table names to their domain for event journal categorization.
 */
function inferDomainSource(entityType: string): string {
  const domainMap: Record<string, string> = {
    loans: 'lending',
    loanDocuments: 'lending',
    kycDocuments: 'identity',
    loanApprovals: 'lending',
    disbursements: 'payments',
    paymentTransactions: 'payments',
    paymentSchedules: 'payments',
    approvalRequests: 'workflow',
    approvalHistory: 'workflow',
    ipsTransactions: 'ips',
    vpaRegistry: 'ips',
    settlementRuns: 'settlement',
    settlementObligations: 'settlement',
    mandates: 'mandates',
    mandateExecutions: 'mandates',
    consentRecords: 'mandates',
    collectionsInteractions: 'collections',
    promiseToPay: 'collections',
    systemConfiguration: 'system',
    notifications: 'notifications',
  };
  return domainMap[entityType] ?? 'system';
}
