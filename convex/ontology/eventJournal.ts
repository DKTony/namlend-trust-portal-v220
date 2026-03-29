/**
 * Event Journal — unified financial event stream with causality tracking.
 *
 * Ontology: Event primitive — every state-changing mutation writes here.
 * Supplements stateTransitions (FSM transitions) and auditLogs (CRUD changes)
 * by adding correlationId/causationId for cross-domain causality chains.
 *
 * Security model:
 *   writeEvent → internalMutation (NOT callable from browser)
 *   queries             - staff-only
 */

import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';
import { assertStaff } from '../lib/auth';
import { eventActorType } from '../schema';

// ---------------------------------------------------------------------------
// Internal writes (not callable from browser)
// ---------------------------------------------------------------------------

/**
 * Write an event journal entry.
 * Called via ctx.scheduler.runAfter(0, internal.ontology.eventJournal.writeEvent, {...})
 * from the emitEvent() helper in lib/eventEmitter.ts.
 *
 * Computes a monotonic version number per entityId for ordering.
 */
export const writeEvent = internalMutation({
  args: {
    eventType: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    domainSource: v.string(),
    payload: v.optional(v.any()),
    correlationId: v.string(),
    causationId: v.optional(v.string()),
    actorId: v.optional(v.id('users')),
    actorType: eventActorType,
    occurredAt: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Compute monotonic version for this entity
    const latest = await ctx.db
      .query('eventJournal')
      .withIndex('by_entityId', (q) =>
        q.eq('entityType', args.entityType).eq('entityId', args.entityId)
      )
      .order('desc')
      .first();

    const version = latest ? latest.version + 1 : 1;

    await ctx.db.insert('eventJournal', {
      eventType: args.eventType,
      entityType: args.entityType,
      entityId: args.entityId,
      domainSource: args.domainSource,
      payload: args.payload,
      correlationId: args.correlationId,
      causationId: args.causationId,
      actorId: args.actorId,
      actorType: args.actorType,
      version,
      occurredAt: args.occurredAt,
      recordedAt: Date.now(),
      metadata: args.metadata,
    });
  },
});

// ---------------------------------------------------------------------------
// Queries (staff only)
// ---------------------------------------------------------------------------

/**
 * Get all events for a specific entity, ordered by version (ascending).
 * Powers the "what happened to this entity?" view.
 */
export const getEventsByEntity = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { entityType, entityId, limit }) => {
    await assertStaff(ctx);
    const events = await ctx.db
      .query('eventJournal')
      .withIndex('by_entityId', (q) => q.eq('entityType', entityType).eq('entityId', entityId))
      .order('asc')
      .take(limit ?? 100);
    return events;
  },
});

/**
 * Get all events in a correlation chain.
 * Powers the "trace this financial operation end-to-end" view.
 */
export const getEventsByCorrelation = query({
  args: {
    correlationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { correlationId, limit }) => {
    await assertStaff(ctx);
    const events = await ctx.db
      .query('eventJournal')
      .withIndex('by_correlationId', (q) => q.eq('correlationId', correlationId))
      .order('asc')
      .take(limit ?? 200);
    return events;
  },
});

/**
 * Get all events caused by a specific event (causation chain traversal).
 * Powers "what did this event trigger?" tracing.
 */
export const getEventsByCausation = query({
  args: {
    causationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { causationId, limit }) => {
    await assertStaff(ctx);
    const events = await ctx.db
      .query('eventJournal')
      .withIndex('by_causationId', (q) => q.eq('causationId', causationId))
      .order('asc')
      .take(limit ?? 200);
    return events;
  },
});

/**
 * Get a paginated stream of all events, filterable by domainSource or eventType.
 * Powers the operational event feed for back-office monitoring.
 */
export const getEventStream = query({
  args: {
    domainSource: v.optional(v.string()),
    eventType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { domainSource, eventType, limit }) => {
    await assertStaff(ctx);
    const cap = limit ?? 50;

    if (eventType) {
      return ctx.db
        .query('eventJournal')
        .withIndex('by_eventType', (q) => q.eq('eventType', eventType))
        .order('desc')
        .take(cap);
    }

    if (domainSource) {
      return ctx.db
        .query('eventJournal')
        .withIndex('by_domainSource', (q) => q.eq('domainSource', domainSource))
        .order('desc')
        .take(cap);
    }

    // Default: recent events by time
    return ctx.db.query('eventJournal').withIndex('by_occurredAt').order('desc').take(cap);
  },
});

/**
 * Count events by domain source — useful for monitoring dashboards.
 */
export const getEventCountByDomain = query({
  args: {
    domainSource: v.string(),
  },
  handler: async (ctx, { domainSource }) => {
    await assertStaff(ctx);
    const events = await ctx.db
      .query('eventJournal')
      .withIndex('by_domainSource', (q) => q.eq('domainSource', domainSource))
      .collect();
    return events.length;
  },
});
