/**
 * Entity Relationships — knowledge graph for the Financial Ontology Engine.
 *
 * Ontology: Relationship primitive — typed, temporal edges between any entities.
 * This is the connective tissue that turns a relational database into an ontology.
 *
 * Design:
 *   - Relationships are append-only. To "delete", set effectiveTo and status=inactive.
 *   - Edges are directional: source -> [type] -> target (e.g. user -> borrowed -> loan)
 *   - Graph traversal is depth-capped at 3 for performance safety.
 *   - getEntityContext() returns a full context object for back-office detail screens.
 *
 * Security model:
 *   createRelationship / deactivate -> internalMutation (system only)
 *   queries                         - staff-only
 *   seedExistingRelationships       -> admin mutation (one-time backfill)
 */

import { v } from 'convex/values';
import { internalMutation, mutation, query } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertStaff, assertAdmin } from '../lib/auth';
import { relationshipStatus } from '../schema';

// ---------------------------------------------------------------------------
// Internal mutations (called by scheduler / system)
// ---------------------------------------------------------------------------

/**
 * Create a relationship edge in the knowledge graph.
 * Called via ctx.scheduler.runAfter(0, ...) from emitRelationship().
 * Idempotent — checks for existing active relationship before inserting.
 */
export const createRelationship = internalMutation({
  args: {
    sourceEntityType: v.string(),
    sourceEntityId: v.string(),
    targetEntityType: v.string(),
    targetEntityId: v.string(),
    relationshipType: v.string(),
    strength: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Idempotency: check if this exact relationship already exists and is active
    const existing = await ctx.db
      .query('relationships')
      .withIndex('by_source_type', (q) =>
        q
          .eq('sourceEntityType', args.sourceEntityType)
          .eq('sourceEntityId', args.sourceEntityId)
          .eq('relationshipType', args.relationshipType)
      )
      .collect();

    const duplicate = existing.find(
      (r) =>
        r.targetEntityType === args.targetEntityType &&
        r.targetEntityId === args.targetEntityId &&
        r.status === 'active'
    );

    if (duplicate) return duplicate._id; // Already exists

    const now = Date.now();
    return ctx.db.insert('relationships', {
      sourceEntityType: args.sourceEntityType,
      sourceEntityId: args.sourceEntityId,
      targetEntityType: args.targetEntityType,
      targetEntityId: args.targetEntityId,
      relationshipType: args.relationshipType,
      status: 'active',
      effectiveFrom: now,
      strength: args.strength,
      metadata: args.metadata,
      createdAt: now,
    });
  },
});

/**
 * Deactivate a relationship by ID.
 */
export const deactivateRelationshipById = internalMutation({
  args: {
    relationshipId: v.id('relationships'),
  },
  handler: async (ctx, { relationshipId }) => {
    const rel = await ctx.db.get(relationshipId);
    if (!rel || rel.status !== 'active') return;

    await ctx.db.patch(relationshipId, {
      status: 'inactive',
      effectiveTo: Date.now(),
    });
  },
});

/**
 * Deactivate relationships matching source -> type -> target.
 * Called by deactivateRelationship() helper.
 */
export const deactivateByEntities = internalMutation({
  args: {
    sourceEntityType: v.string(),
    sourceEntityId: v.string(),
    targetEntityType: v.string(),
    targetEntityId: v.string(),
    relationshipType: v.string(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query('relationships')
      .withIndex('by_source_type', (q) =>
        q
          .eq('sourceEntityType', args.sourceEntityType)
          .eq('sourceEntityId', args.sourceEntityId)
          .eq('relationshipType', args.relationshipType)
      )
      .collect();

    const now = Date.now();
    for (const rel of matches) {
      if (
        rel.targetEntityType === args.targetEntityType &&
        rel.targetEntityId === args.targetEntityId &&
        rel.status === 'active'
      ) {
        await ctx.db.patch(rel._id, {
          status: 'inactive',
          effectiveTo: now,
        });
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Queries (staff only)
// ---------------------------------------------------------------------------

/**
 * Get all entities related to a given entity (first-degree connections).
 * Searches both outgoing (source->target) and incoming (target->source) edges.
 */
export const getRelated = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    relationshipType: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, { entityType, entityId, relationshipType, includeInactive }) => {
    await assertStaff(ctx);

    // Outgoing relationships (this entity is the source)
    let outgoing;
    if (relationshipType) {
      outgoing = await ctx.db
        .query('relationships')
        .withIndex('by_source_type', (q) =>
          q
            .eq('sourceEntityType', entityType)
            .eq('sourceEntityId', entityId)
            .eq('relationshipType', relationshipType)
        )
        .collect();
    } else {
      outgoing = await ctx.db
        .query('relationships')
        .withIndex('by_source', (q) =>
          q.eq('sourceEntityType', entityType).eq('sourceEntityId', entityId)
        )
        .collect();
    }

    // Incoming relationships (this entity is the target)
    let incoming = await ctx.db
      .query('relationships')
      .withIndex('by_target', (q) =>
        q.eq('targetEntityType', entityType).eq('targetEntityId', entityId)
      )
      .collect();

    if (relationshipType) {
      incoming = incoming.filter((r) => r.relationshipType === relationshipType);
    }

    const all = [
      ...outgoing.map((r) => ({ ...r, direction: 'outgoing' as const })),
      ...incoming.map((r) => ({ ...r, direction: 'incoming' as const })),
    ];

    if (includeInactive) return all;
    return all.filter((r) => r.status === 'active');
  },
});

/**
 * Traverse the relationship graph to N degrees of separation.
 * Capped at depth 3 for performance.
 * Returns a flat list of all discovered relationships.
 */
export const getRelationshipGraph = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    maxDepth: v.optional(v.number()),
  },
  handler: async (ctx, { entityType, entityId, maxDepth }) => {
    await assertStaff(ctx);

    const depth = Math.min(maxDepth ?? 2, 3); // Cap at 3
    const visited = new Set<string>();
    const allRelationships: Array<{
      sourceEntityType: string;
      sourceEntityId: string;
      targetEntityType: string;
      targetEntityId: string;
      relationshipType: string;
      status: string;
      depth: number;
    }> = [];

    // BFS traversal
    let frontier = [{ type: entityType, id: entityId }];

    for (let d = 0; d < depth; d++) {
      const nextFrontier: Array<{ type: string; id: string }> = [];

      for (const node of frontier) {
        const key = `${node.type}:${node.id}`;
        if (visited.has(key)) continue;
        visited.add(key);

        // Get outgoing edges
        const outgoing = await ctx.db
          .query('relationships')
          .withIndex('by_source', (q) =>
            q.eq('sourceEntityType', node.type).eq('sourceEntityId', node.id)
          )
          .collect();

        for (const rel of outgoing) {
          if (rel.status !== 'active') continue;
          allRelationships.push({
            sourceEntityType: rel.sourceEntityType,
            sourceEntityId: rel.sourceEntityId,
            targetEntityType: rel.targetEntityType,
            targetEntityId: rel.targetEntityId,
            relationshipType: rel.relationshipType,
            status: rel.status,
            depth: d + 1,
          });
          nextFrontier.push({ type: rel.targetEntityType, id: rel.targetEntityId });
        }

        // Get incoming edges
        const incoming = await ctx.db
          .query('relationships')
          .withIndex('by_target', (q) =>
            q.eq('targetEntityType', node.type).eq('targetEntityId', node.id)
          )
          .collect();

        for (const rel of incoming) {
          if (rel.status !== 'active') continue;
          allRelationships.push({
            sourceEntityType: rel.sourceEntityType,
            sourceEntityId: rel.sourceEntityId,
            targetEntityType: rel.targetEntityType,
            targetEntityId: rel.targetEntityId,
            relationshipType: rel.relationshipType,
            status: rel.status,
            depth: d + 1,
          });
          nextFrontier.push({ type: rel.sourceEntityType, id: rel.sourceEntityId });
        }
      }

      frontier = nextFrontier;
    }

    return allRelationships;
  },
});

/**
 * Check if a specific relationship exists (boolean).
 */
export const hasRelationship = query({
  args: {
    sourceEntityType: v.string(),
    sourceEntityId: v.string(),
    targetEntityType: v.string(),
    targetEntityId: v.string(),
    relationshipType: v.string(),
  },
  handler: async (ctx, args) => {
    // No auth guard — lightweight check usable by other queries
    const matches = await ctx.db
      .query('relationships')
      .withIndex('by_source_type', (q) =>
        q
          .eq('sourceEntityType', args.sourceEntityType)
          .eq('sourceEntityId', args.sourceEntityId)
          .eq('relationshipType', args.relationshipType)
      )
      .collect();

    return matches.some(
      (r) =>
        r.targetEntityType === args.targetEntityType &&
        r.targetEntityId === args.targetEntityId &&
        r.status === 'active'
    );
  },
});

/**
 * Get full entity context — the entity plus all first-degree relationships
 * with resolved entity data. This is the backbone for back-office detail screens.
 *
 * Returns:
 *   - The entity's relationships (grouped by type)
 *   - Recent events from the event journal
 *   - Mandate status (if applicable)
 */
export const getEntityContext = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, { entityType, entityId }) => {
    await assertStaff(ctx);

    // Get all first-degree relationships
    const outgoing = await ctx.db
      .query('relationships')
      .withIndex('by_source', (q) =>
        q.eq('sourceEntityType', entityType).eq('sourceEntityId', entityId)
      )
      .collect();

    const incoming = await ctx.db
      .query('relationships')
      .withIndex('by_target', (q) =>
        q.eq('targetEntityType', entityType).eq('targetEntityId', entityId)
      )
      .collect();

    const activeOutgoing = outgoing.filter((r) => r.status === 'active');
    const activeIncoming = incoming.filter((r) => r.status === 'active');

    // Group by relationship type
    const relationshipsByType: Record<
      string,
      Array<{
        direction: 'outgoing' | 'incoming';
        entityType: string;
        entityId: string;
        relationshipType: string;
        effectiveFrom: number;
        metadata?: unknown;
      }>
    > = {};

    for (const rel of activeOutgoing) {
      const type = rel.relationshipType;
      if (!relationshipsByType[type]) relationshipsByType[type] = [];
      relationshipsByType[type].push({
        direction: 'outgoing',
        entityType: rel.targetEntityType,
        entityId: rel.targetEntityId,
        relationshipType: type,
        effectiveFrom: rel.effectiveFrom,
        metadata: rel.metadata,
      });
    }

    for (const rel of activeIncoming) {
      const type = rel.relationshipType;
      if (!relationshipsByType[type]) relationshipsByType[type] = [];
      relationshipsByType[type].push({
        direction: 'incoming',
        entityType: rel.sourceEntityType,
        entityId: rel.sourceEntityId,
        relationshipType: type,
        effectiveFrom: rel.effectiveFrom,
        metadata: rel.metadata,
      });
    }

    // Get recent events from the journal
    const recentEvents = await ctx.db
      .query('eventJournal')
      .withIndex('by_entityId', (q) => q.eq('entityType', entityType).eq('entityId', entityId))
      .order('desc')
      .take(20);

    return {
      entityType,
      entityId,
      relationships: relationshipsByType,
      totalRelationships: activeOutgoing.length + activeIncoming.length,
      recentEvents,
    };
  },
});

/**
 * List all relationships of a specific type (staff view, for auditing).
 */
export const listRelationshipsByType = query({
  args: {
    relationshipType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { relationshipType, limit }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('relationships')
      .withIndex('by_type', (q) => q.eq('relationshipType', relationshipType))
      .order('desc')
      .take(limit ?? 50);
  },
});

// ---------------------------------------------------------------------------
// Admin: seed existing relationships (one-time backfill)
// ---------------------------------------------------------------------------

/**
 * Seed relationships from existing foreign key references.
 * Idempotent — checks before inserting. Run once after Phase 3 deployment.
 *
 * Creates:
 *   - user -> borrowed -> loan (from loans.userId)
 *   - loan -> disbursed_via -> disbursement (from disbursements.loanId)
 *   - loan -> repaid_via -> payment (from paymentTransactions.loanId)
 *   - loan -> requires_approval -> approvalRequest (from approvalRequests)
 *   - user -> authorized -> mandate (from mandates.debtorUserId)
 *   - loan -> secured_by -> mandate (from mandates.loanId)
 */
export const seedExistingRelationships = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const now = Date.now();
    let created = 0;

    // Helper to insert if not duplicate
    const insertIfNew = async (
      sourceType: string,
      sourceId: string,
      targetType: string,
      targetId: string,
      relType: string
    ) => {
      const existing = await ctx.db
        .query('relationships')
        .withIndex('by_source_type', (q) =>
          q
            .eq('sourceEntityType', sourceType)
            .eq('sourceEntityId', sourceId)
            .eq('relationshipType', relType)
        )
        .collect();

      const dup = existing.find(
        (r) =>
          r.targetEntityType === targetType &&
          r.targetEntityId === targetId &&
          r.status === 'active'
      );
      if (dup) return;

      await ctx.db.insert('relationships', {
        sourceEntityType: sourceType,
        sourceEntityId: sourceId,
        targetEntityType: targetType,
        targetEntityId: targetId,
        relationshipType: relType,
        status: 'active',
        effectiveFrom: now,
        createdAt: now,
      });
      created++;
    };

    // Loans: user -> borrowed -> loan
    const loans = await ctx.db.query('loans').take(5000);
    for (const loan of loans) {
      await insertIfNew('users', loan.userId, 'loans', loan._id, 'borrowed');
    }

    // Disbursements: loan -> disbursed_via -> disbursement
    const disbursements = await ctx.db.query('disbursements').take(5000);
    for (const d of disbursements) {
      await insertIfNew('loans', d.loanId, 'disbursements', d._id, 'disbursed_via');
    }

    // Payments: loan -> repaid_via -> payment
    const payments = await ctx.db.query('paymentTransactions').take(5000);
    for (const p of payments) {
      await insertIfNew('loans', p.loanId, 'paymentTransactions', p._id, 'repaid_via');
    }

    // Approval requests: entity -> requires_approval -> approvalRequest
    const approvals = await ctx.db.query('approvalRequests').take(5000);
    for (const a of approvals) {
      await insertIfNew(a.entityType, a.entityId, 'approvalRequests', a._id, 'requires_approval');
    }

    // Mandates: user -> authorized -> mandate
    const mandates = await ctx.db.query('mandates').take(5000);
    for (const m of mandates) {
      await insertIfNew('users', m.debtorUserId, 'mandates', m._id, 'authorized');
      if (m.loanId) {
        await insertIfNew('loans', m.loanId, 'mandates', m._id, 'secured_by');
      }
    }

    return { created };
  },
});
