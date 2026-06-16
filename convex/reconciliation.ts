/**
 * Reconciliation — bank transactions, reconciliation runs, fuzzy matching.
 * Replaces reconciliationService.ts Supabase calls.
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAdmin, assertStaff } from './lib/auth';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import {
  applyTenantScope,
  assertSameTenant,
  resolveWriteInstitution,
  tenantReadScope,
} from './lib/tenancy';

// ---------------------------------------------------------------------------
// Bank Transactions
// ---------------------------------------------------------------------------

export const listBankTransactions = query({
  args: {
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, source, limit }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');
    let results = applyTenantScope(
      await ctx.db
        .query('bankTransactions')
        .order('desc')
        .take(limit ?? 100),
      await tenantReadScope(ctx)
    );

    if (status) results = results.filter((t) => t.status === status);
    if (source) results = results.filter((t) => (t as Record<string, unknown>).source === source);
    return results;
  },
});

export const getBankTransaction = query({
  args: { transactionId: v.id('bankTransactions') },
  handler: async (ctx, { transactionId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');
    const txn = await ctx.db.get(transactionId);
    assertSameTenant(await tenantReadScope(ctx), txn?.institutionId);
    return txn;
  },
});

export const importBankTransactions = mutation({
  args: {
    transactions: v.array(
      v.object({
        externalId: v.string(),
        amount: v.number(),
        transactionDate: v.string(),
        transactionType: v.union(v.literal('credit'), v.literal('debit')),
        reference: v.optional(v.string()),
        description: v.optional(v.string()),
        source: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { transactions }) => {
    await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');
    const institutionId = await resolveWriteInstitution(ctx);

    let imported = 0;
    let duplicates = 0;

    for (const txn of transactions) {
      // Check for duplicate via externalId
      const existing = await ctx.db
        .query('bankTransactions')
        .withIndex('by_externalId', (q) => q.eq('externalId', txn.externalId))
        .first();

      if (existing) {
        duplicates++;
        continue;
      }

      await ctx.db.insert('bankTransactions', {
        ...txn,
        institutionId,
        source: txn.source ?? 'manual',
        status: 'unmatched',
        importedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      imported++;
    }

    return { imported, duplicates };
  },
});

// ---------------------------------------------------------------------------
// Reconciliation Runs
// ---------------------------------------------------------------------------

export const listReconciliationRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');
    return applyTenantScope(
      await ctx.db
        .query('reconciliationRuns')
        .order('desc')
        .take(limit ?? 50),
      await tenantReadScope(ctx)
    );
  },
});

export const getReconciliationRun = query({
  args: { runId: v.id('reconciliationRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');
    const run = await ctx.db.get(runId);
    if (!run) return null;
    assertSameTenant(await tenantReadScope(ctx), run.institutionId);

    const transactions = await ctx.db
      .query('bankTransactions')
      .withIndex('by_runId', (q) => q.eq('runId', runId))
      .collect();

    return { run, transactions };
  },
});

export const createReconciliationRun = mutation({
  args: {
    periodStart: v.string(),
    periodEnd: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');
    const now = Date.now();
    return ctx.db.insert('reconciliationRuns', {
      ...args,
      institutionId: await resolveWriteInstitution(ctx),
      status: 'pending',
      matchedCount: 0,
      unmatchedCount: 0,
      totalAmount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export const matchTransaction = mutation({
  args: {
    transactionId: v.id('bankTransactions'),
    paymentId: v.id('paymentTransactions'),
    matchConfidence: v.number(),
    matchNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');

    const txn = await ctx.db.get(args.transactionId);
    if (!txn) throw new Error('Bank transaction not found');
    if (txn.status === 'matched') {
      throw new Error('Transaction already matched');
    }

    await ctx.db.patch(args.transactionId, {
      status: 'matched',
      matchedPaymentId: args.paymentId,
      matchConfidence: args.matchConfidence,
      matchNotes: args.matchNotes,
      matchedAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'bankTransactions',
      args.transactionId,
      'match_transaction',
      'unmatched',
      'matched',
      args.matchNotes
    );
  },
});

export const disputeTransaction = mutation({
  args: {
    transactionId: v.id('bankTransactions'),
    reason: v.string(),
  },
  handler: async (ctx, { transactionId, reason }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');

    await ctx.db.patch(transactionId, {
      status: 'disputed',
      matchNotes: reason,
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'bankTransactions',
      transactionId,
      'dispute_transaction',
      'unmatched',
      'disputed',
      reason
    );
  },
});

export const excludeTransaction = mutation({
  args: {
    transactionId: v.id('bankTransactions'),
    reason: v.string(),
  },
  handler: async (ctx, { transactionId, reason }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');

    await ctx.db.patch(transactionId, {
      status: 'excluded',
      matchNotes: reason,
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'bankTransactions',
      transactionId,
      'exclude_transaction',
      'unmatched',
      'excluded',
      reason
    );
  },
});

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const getReconciliationStats = query({
  args: { runId: v.optional(v.id('reconciliationRuns')) },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantReconciliation');

    const transactions = applyTenantScope(
      runId
        ? await ctx.db
            .query('bankTransactions')
            .withIndex('by_runId', (q) => q.eq('runId', runId))
            .collect()
        : await ctx.db.query('bankTransactions').take(10000),
      await tenantReadScope(ctx)
    );

    return {
      total: transactions.length,
      matched: transactions.filter((t) => t.status === 'matched').length,
      unmatched: transactions.filter((t) => t.status === 'unmatched').length,
      disputed: transactions.filter((t) => t.status === 'disputed').length,
      excluded: transactions.filter((t) => t.status === 'excluded').length,
      totalAmount: transactions.reduce((s, t) => s + (t.amount ?? 0), 0),
      matchedAmount: transactions
        .filter((t) => t.status === 'matched')
        .reduce((s, t) => s + (t.amount ?? 0), 0),
    };
  },
});
