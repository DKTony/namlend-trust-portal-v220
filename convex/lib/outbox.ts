/**
 * Idempotent TigerBeetle outbox enqueue.
 *
 * Every money-movement ledger entry must map one-to-one to its money movement.
 * Callers pass a deterministic idempotencyKey (e.g. `repayment:payment:{id}`);
 * a second enqueue with the same key is a no-op. This makes double-clicks,
 * webhook/IPS replays, and retries safe.
 *
 * Key conventions (keep these stable):
 *   repayment:payment:{paymentId}      — manual completion AND payment webhook share this
 *   disbursement:{disbursementId}
 *   disbursement:reverse:{disbursementId}
 *   ips:initiate:{ipsTransactionId}
 *   ipsComplete:{ipsTransactionId}
 *   ips:reverse:{ipsTransactionId}
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';

type MutCtx = GenericMutationCtx<DataModel>;

export interface OutboxEnqueueArgs {
  idempotencyKey: string;
  eventType: string;
  sourceTable: string;
  sourceId: string;
  payload: Record<string, unknown>;
}

/**
 * Insert a TigerBeetle outbox row unless one already exists for `idempotencyKey`.
 * Returns whether a new row was created and the row id either way.
 */
export async function enqueueOutboxIdempotent(
  ctx: MutCtx,
  args: OutboxEnqueueArgs
): Promise<{ enqueued: boolean; id: Id<'tigerBeetleOutbox'> }> {
  const existing = await ctx.db
    .query('tigerBeetleOutbox')
    .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
    .first();
  if (existing) {
    return { enqueued: false, id: existing._id };
  }

  const id = await ctx.db.insert('tigerBeetleOutbox', {
    eventType: args.eventType,
    sourceTable: args.sourceTable,
    sourceId: args.sourceId,
    payload: args.payload,
    idempotencyKey: args.idempotencyKey,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  });
  return { enqueued: true, id };
}
