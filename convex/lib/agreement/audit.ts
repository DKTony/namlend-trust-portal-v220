/**
 * Agreement audit records. Each event is written twice, deliberately:
 *  - `stateTransitions` (via scheduleAuditLog): the lifecycle transition and its actor;
 *  - `auditLogs` (via scheduleAuditEntry): the named action, the responsible user, the
 *    outcome and a detail line — loan reference, purpose or document hash.
 * `stateTransitions` has no action column, so without the second write "who printed
 * this agreement" would be unanswerable. Detail lines never contain borrower PII.
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../../_generated/dataModel';
import { scheduleAuditEntry, scheduleAuditLog } from '../audit';

export function auditAgreement(
  ctx: GenericMutationCtx<DataModel>,
  actorId: Id<'users'> | undefined,
  entityType: string,
  entityId: string,
  action: string,
  fromState: string,
  toState: string,
  detail?: string
): void {
  scheduleAuditLog(ctx, entityType, entityId, action, fromState, toState, detail, { actorId });
  scheduleAuditEntry(ctx, {
    entityType,
    entityId,
    action,
    oldState: { status: fromState },
    newState: { status: toState, ...(detail ? { detail } : {}) },
    userId: actorId,
  });
}
