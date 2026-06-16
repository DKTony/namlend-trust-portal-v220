/**
 * Relationship emitter — fire-and-forget pattern for entity graph edges.
 *
 * When creating any entity that connects to other entities, call emitRelationship()
 * to register the edge in the knowledge graph. Uses the same scheduler pattern
 * as audit logging and event emission — never blocks the calling mutation.
 *
 * Relationships are append-only. To "delete" a relationship, it is deactivated
 * (effectiveTo set, status -> inactive). History is permanent.
 */

import { GenericMutationCtx } from 'convex/server';
import { internal } from '../_generated/api';
import { DataModel } from '../_generated/dataModel';

type MutCtx = GenericMutationCtx<DataModel>;

/**
 * Schedule a relationship creation in the knowledge graph.
 * Fire-and-forget — never throws, never blocks the calling mutation.
 */
export function emitRelationship(
  ctx: MutCtx,
  source: { type: string; id: string },
  target: { type: string; id: string },
  relationshipType: string,
  metadata?: Record<string, unknown>
): void {
  ctx.scheduler
    .runAfter(0, internal.ontology.relationships.createRelationship, {
      sourceEntityType: source.type,
      sourceEntityId: source.id,
      targetEntityType: target.type,
      targetEntityId: target.id,
      relationshipType,
      metadata,
    })
    .catch((err: unknown) => {
      console.error('[relationships] emitRelationship enqueue failed:', err);
    });
}

/**
 * Schedule a relationship deactivation.
 * Fire-and-forget — sets effectiveTo and status to inactive.
 */
export function deactivateRelationship(
  ctx: MutCtx,
  source: { type: string; id: string },
  target: { type: string; id: string },
  relationshipType: string
): void {
  ctx.scheduler
    .runAfter(0, internal.ontology.relationships.deactivateByEntities, {
      sourceEntityType: source.type,
      sourceEntityId: source.id,
      targetEntityType: target.type,
      targetEntityId: target.id,
      relationshipType,
    })
    .catch((err: unknown) => {
      console.error('[relationships] deactivateRelationship enqueue failed:', err);
    });
}
