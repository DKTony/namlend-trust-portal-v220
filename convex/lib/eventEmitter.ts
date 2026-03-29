/**
 * Event Journal emitter — fire-and-forget pattern.
 *
 * Mirrors the existing scheduleAuditLog() pattern in audit.ts.
 * Every state-changing mutation should call emitEvent() to populate
 * the unified event journal alongside the existing audit tables.
 *
 * emitEvent() schedules the write AFTER the current mutation commits,
 * so it never blocks or rolls back the main financial operation.
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';

type MutCtx = GenericMutationCtx<DataModel>;

/**
 * Generate a correlation ID for grouping related events.
 * Format: "corr-{timestamp}-{random}" for uniqueness.
 */
export function generateCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `corr-${ts}-${rand}`;
}

/**
 * Schedules an event journal entry.
 * Fire-and-forget — never throws, never blocks the calling mutation.
 */
export function emitEvent(
  ctx: MutCtx,
  params: {
    eventType: string;
    entityType: string;
    entityId: string;
    domainSource: string;
    correlationId: string;
    causationId?: string;
    actorId?: Id<'users'>;
    actorType: 'user' | 'system' | 'webhook' | 'cron';
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): void {
  ctx.scheduler
    .runAfter(0, internal.ontology.eventJournal.writeEvent, {
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      domainSource: params.domainSource,
      correlationId: params.correlationId,
      causationId: params.causationId,
      actorId: params.actorId,
      actorType: params.actorType,
      payload: params.payload,
      metadata: params.metadata,
      occurredAt: Date.now(),
    })
    .catch((err: unknown) => {
      console.error('[eventJournal] emitEvent enqueue failed:', err);
    });
}
