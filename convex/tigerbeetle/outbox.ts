/**
 * TigerBeetle Outbox — enqueue, claim, complete, fail.
 * Used by financial mutations (disbursements.ts, payments.ts) to atomically
 * enqueue ledger events, then processed by the scheduled outbox worker.
 *
 * Pattern: outbox entry created in same mutation → cannot be lost.
 */

import { v } from 'convex/values';
import { query, internalMutation, internalQuery } from '../_generated/server';
import { assertAdmin } from '../lib/auth';

// ---------------------------------------------------------------------------
// Internal: used by tigerBeetleOutboxWorker scheduled action
// ---------------------------------------------------------------------------

/** Claim a batch of pending entries for processing. */
export const claimPendingEntries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, { batchSize }) => {
    const now = Date.now();
    const candidates = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('asc')
      .take(batchSize ?? 50);

    const failedCandidates = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'failed'))
      .order('asc')
      .take(batchSize ?? 50);

    // Filter failed candidates whose retry window has elapsed
    const eligibleFailed = failedCandidates.filter((e) => !e.nextRetryAt || e.nextRetryAt <= now);

    const all = [...candidates, ...eligibleFailed].slice(0, batchSize ?? 50);

    // Mark all as processing
    for (const entry of all) {
      await ctx.db.patch(entry._id, { status: 'processing' });
    }

    return all;
  },
});

/** Mark an entry as completed after successful TigerBeetle post. */
export const completeEntry = internalMutation({
  args: {
    entryId: v.id('tigerBeetleOutbox'),
    tbTransferIds: v.array(v.string()),
  },
  handler: async (ctx, { entryId, tbTransferIds }) => {
    await ctx.db.patch(entryId, {
      status: 'completed',
      tbTransferIds,
      processedAt: Date.now(),
    });
  },
});

/** Mark an entry as failed with exponential backoff retry scheduling. */
export const failEntry = internalMutation({
  args: {
    entryId: v.id('tigerBeetleOutbox'),
    errorMessage: v.string(),
  },
  handler: async (ctx, { entryId, errorMessage }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) return;

    const retryCount = (entry.retryCount ?? 0) + 1;
    // Exponential backoff: 1, 2, 4, 8, 16 minutes
    const nextRetryMs = Math.pow(2, retryCount) * 60_000;
    const nextRetryAt = Date.now() + nextRetryMs;

    await ctx.db.patch(entryId, {
      status: retryCount >= 5 ? 'dead_letter' : 'failed',
      retryCount,
      nextRetryAt,
      lastError: errorMessage,
    });
  },
});

/** Reset a dead_letter entry for manual retry (admin only). */
export const resetDeadLetter = internalMutation({
  args: { entryId: v.id('tigerBeetleOutbox') },
  handler: async (ctx, { entryId }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) return;
    if (entry.status !== 'dead_letter' && entry.status !== 'failed') {
      // Only dead_letter or failed entries can be reset
      return;
    }
    await ctx.db.patch(entryId, {
      status: 'pending',
      retryCount: 0,
      nextRetryAt: undefined,
      lastError: undefined,
    });
  },
});

// ---------------------------------------------------------------------------
// Queries (admin monitoring)
// ---------------------------------------------------------------------------

export const getOutboxStats = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const pending = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();
    const failed = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'failed'))
      .collect();
    const deadLetter = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'dead_letter'))
      .collect();

    return {
      pending: pending.length,
      failed: failed.length,
      deadLetter: deadLetter.length,
    };
  },
});

export const listDeadLetterEntries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertAdmin(ctx);
    return ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'dead_letter'))
      .order('desc')
      .take(limit ?? 50);
  },
});
