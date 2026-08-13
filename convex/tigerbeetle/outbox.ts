/**
 * TigerBeetle Outbox — enqueue, claim, complete, fail.
 * Used by financial mutations (disbursements.ts, payments.ts) to atomically
 * enqueue ledger events, then processed by the scheduled outbox worker.
 *
 * Pattern: outbox entry created in same mutation → cannot be lost.
 */

import { ConvexError, v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { internalMutation, internalQuery, query } from '../_generated/server';
import { scheduleAuditEntry } from '../lib/audit';
import { assertPlatformSupport } from '../lib/platformAuth';

type ReconciliationClass = {
  safe: boolean;
  reason: string;
  sourceStatus?: string;
};

async function classifyDeadLetter(ctx: any, entry: any): Promise<ReconciliationClass> {
  const source = await ctx.db.get(entry.sourceId as any);
  const sourceStatus = source?.status as string | undefined;
  if (!source) return { safe: false, reason: 'source_missing' };

  if (entry.sourceTable === 'disbursements') {
    if (entry.eventType === 'DISBURSEMENT' && sourceStatus === 'completed') {
      return { safe: true, reason: 'completed_disbursement', sourceStatus };
    }
    if (entry.eventType === 'IPS_REVERSE' && ['failed', 'reversed'].includes(sourceStatus ?? '')) {
      return { safe: true, reason: 'terminal_disbursement_reversal', sourceStatus };
    }
    return { safe: false, reason: 'disbursement_not_terminal_consistent', sourceStatus };
  }

  if (entry.sourceTable === 'paymentTransactions') {
    return ['completed', 'reversed'].includes(sourceStatus ?? '')
      ? { safe: true, reason: 'terminal_payment', sourceStatus }
      : { safe: false, reason: 'payment_not_terminal_consistent', sourceStatus };
  }

  if (entry.sourceTable === 'ipsTransactions') {
    return ['completed', 'failed', 'reversed', 'timeout'].includes(sourceStatus ?? '')
      ? { safe: true, reason: 'terminal_ips_transaction', sourceStatus }
      : { safe: false, reason: 'ips_transaction_pending_or_processing', sourceStatus };
  }

  return { safe: false, reason: 'unsupported_source_type', sourceStatus };
}

async function buildReconciliationReport(ctx: any, limit?: number) {
  const deadLetters = await ctx.db
    .query('tigerBeetleOutbox')
    .withIndex('by_status', (q: any) => q.eq('status', 'dead_letter'))
    .order('asc')
    .take(Math.min(limit ?? 500, 1000));
  const classified = await Promise.all(
    deadLetters.map(async (entry: any) => ({
      entryId: entry._id,
      eventType: entry.eventType,
      sourceTable: entry.sourceTable,
      sourceId: entry.sourceId,
      ...(await classifyDeadLetter(ctx, entry)),
    }))
  );

  const completedDisbursements = await ctx.db
    .query('tigerBeetleOutbox')
    .withIndex('by_status', (q: any) => q.eq('status', 'completed'))
    .take(10000);
  const completedLinkedToFailed: Array<{
    entryId: string;
    sourceId: string;
    reason: string;
  }> = [];
  for (const entry of completedDisbursements) {
    if (entry.sourceTable !== 'disbursements' || entry.eventType !== 'DISBURSEMENT') continue;
    const source = await ctx.db.get(entry.sourceId as Id<'disbursements'>);
    if (source?.status === 'failed') {
      completedLinkedToFailed.push({
        entryId: String(entry._id),
        sourceId: entry.sourceId,
        reason: 'completed_ledger_evidence_linked_to_failed_disbursement',
      });
    }
  }

  const byReason = classified.reduce<Record<string, number>>((counts, item) => {
    counts[item.reason] = (counts[item.reason] ?? 0) + 1;
    return counts;
  }, {});
  return {
    scanned: deadLetters.length,
    safeToReplay: classified.filter((item) => item.safe).length,
    blockedForManualReview: classified.filter((item) => !item.safe).length,
    byReason,
    completedLinkedToFailed,
    items: classified,
  };
}

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
// Queries (global infrastructure monitoring; platform roles only)
// ---------------------------------------------------------------------------

export const getOutboxStats = query({
  args: {},
  handler: async (ctx) => {
    await assertPlatformSupport(ctx);
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
    await assertPlatformSupport(ctx);
    return ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'dead_letter'))
      .order('desc')
      .take(limit ?? 50);
  },
});

/** Read-only blast-radius report. It never mutates or compensates ledger state. */
export const getReconciliationReport = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertPlatformSupport(ctx);
    return buildReconciliationReport(ctx, limit);
  },
});

/** Deployment-operator form used by the dry-run rollout. */
export const getReconciliationReportInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: (ctx, { limit }) => buildReconciliationReport(ctx, limit),
});

/** Guarded replay: only source-terminal, internally consistent dead letters are requeued. */
export const requeueSafeDeadLetters = internalMutation({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { dryRun, limit, cursor }) => {
    if (!dryRun && process.env.TIGERBEETLE_MODE !== 'shadow') {
      throw new ConvexError({
        code: 'SHADOW_MODE_REQUIRED',
        message: 'Safe replay is allowed only when TIGERBEETLE_MODE=shadow.',
      });
    }
    const page = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'dead_letter'))
      .order('asc')
      .paginate({ numItems: Math.min(limit ?? 200, 500), cursor: cursor ?? null });

    const classifications = await Promise.all(
      page.page.map(async (entry) => ({ entry, ...(await classifyDeadLetter(ctx, entry)) }))
    );
    const safe = classifications.filter((item) => item.safe);
    if (!dryRun) {
      for (const { entry } of safe) {
        await ctx.db.patch(entry._id, {
          status: 'pending',
          retryCount: 0,
          nextRetryAt: undefined,
          lastError: undefined,
        });
      }
      if (safe.length > 0) {
        scheduleAuditEntry(ctx, {
          entityType: 'tigerBeetleOutbox',
          entityId: 'requeueSafeDeadLetters',
          action: 'REQUEUE_TERMINAL_SHADOW_EVIDENCE',
          newState: {
            scanned: page.page.length,
            requeued: safe.length,
            blocked: classifications.length - safe.length,
          },
        });
      }
    }
    return {
      dryRun,
      scanned: page.page.length,
      safeToReplay: safe.length,
      blockedForManualReview: classifications.length - safe.length,
      byReason: classifications.reduce<Record<string, number>>((counts, item) => {
        counts[item.reason] = (counts[item.reason] ?? 0) + 1;
        return counts;
      }, {}),
      ids: safe.map(({ entry }) => String(entry._id)),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
