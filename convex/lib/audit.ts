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
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';

type MutCtx = GenericMutationCtx<DataModel>;

/**
 * Schedules a state transition audit log entry.
 * Fire-and-forget — never throws, never blocks the calling mutation.
 */
export function scheduleAuditLog(
  ctx: MutCtx,
  entityType: string,
  entityId: string,
  action: string,
  fromState: string,
  toState: string,
  reason?: string
): void {
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
}

/**
 * Schedules a general audit log entry (for non-state-transition events).
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
  }
): void {
  ctx.scheduler.runAfter(0, internal.audit.writeAuditEntry, params).catch((err: unknown) => {
    console.error('[audit] scheduleAuditEntry enqueue failed:', err);
  });
}
