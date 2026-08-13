/**
 * Analytics — read-only aggregation queries.
 * Replaces api-analytics Supabase edge function.
 * All queries are staff-only; no user data is returned unfiltered.
 *
 * When portfolioMetrics projections are populated, getPortfolioSummary
 * reads the pre-computed values (O(1)) instead of scanning full tables.
 */

import { v } from 'convex/values';
import { query } from './_generated/server';
import { assertStaff } from './lib/auth';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import { applyTenantScope, tenantReadScope } from './lib/tenancy';

// ---------------------------------------------------------------------------
// Portfolio Overview
// ---------------------------------------------------------------------------

export const getPortfolioSummary = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { dateFrom, dateTo }) => {
    await assertStaff(ctx);
    const scope = await tenantReadScope(ctx);

    // Source records remain authoritative. portfolioMetrics is a rebuildable read model
    // and is not selected until an explicit consistency marker is introduced.
    const [allLoans, allDisbursements, allPayments] = await Promise.all([
      ctx.db.query('loans').take(10000),
      ctx.db.query('disbursements').take(10000),
      ctx.db.query('paymentTransactions').take(10000),
    ]);
    const loans = applyTenantScope(allLoans, scope);
    const disbursements = applyTenantScope(allDisbursements, scope);
    const payments = applyTenantScope(allPayments, scope);

    const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toMs = dateTo ? new Date(dateTo).getTime() : Infinity;

    const filteredLoans = loans.filter((l) => l.createdAt >= fromMs && l.createdAt <= toMs);

    const activeLoans = filteredLoans.filter((l) =>
      ['active', 'funded', 'disbursed'].includes(l.status)
    );
    const totalPortfolio = activeLoans.reduce(
      (s, l) => s + (l.outstandingBalance ?? l.principal ?? 0),
      0
    );

    return {
      loans: {
        total: filteredLoans.length,
        active: activeLoans.length,
        pending: filteredLoans.filter((l) => ['submitted', 'under_review'].includes(l.status))
          .length,
        approved: filteredLoans.filter((l) => l.status === 'approved').length,
        rejected: filteredLoans.filter((l) => l.status === 'rejected').length,
        completed: filteredLoans.filter((l) => l.status === 'paid_off').length,
      },
      portfolio: {
        totalOutstanding: totalPortfolio,
        totalDisbursed: disbursements
          .filter((d) => d.status === 'completed')
          .reduce((s, d) => s + (d.amount ?? 0), 0),
        totalRepaid: payments
          .filter((p) => p.status === 'completed')
          .reduce((s, p) => s + (p.amount ?? 0), 0),
        averageLoanSize: activeLoans.length > 0 ? totalPortfolio / activeLoans.length : 0,
      },
      source: 'full_scan' as const,
    };
  },
});

// ---------------------------------------------------------------------------
// Revenue & Fees
// ---------------------------------------------------------------------------

export const getRevenueMetrics = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { dateFrom, dateTo }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'advancedAnalytics');

    const payments = applyTenantScope(
      await ctx.db.query('paymentTransactions').take(10000),
      await tenantReadScope(ctx)
    );

    const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toMs = dateTo ? new Date(dateTo).getTime() : Infinity;

    const filtered = payments.filter(
      (p) => p.createdAt >= fromMs && p.createdAt <= toMs && p.status === 'completed'
    );

    const interestIncome = filtered.reduce((s, p) => s + (p.interestPaid ?? 0), 0);
    const feesIncome = filtered.reduce((s, p) => s + (p.feesPaid ?? 0), 0);
    const principalRepaid = filtered.reduce((s, p) => s + (p.principalPaid ?? 0), 0);

    return {
      interestIncome,
      feesIncome,
      totalIncome: interestIncome + feesIncome,
      principalRepaid,
      totalCollected: interestIncome + feesIncome + principalRepaid,
      paymentCount: filtered.length,
    };
  },
});

/**
 * Total value of payments that SETTLED on/after `sinceMs` (default: 24h ago).
 * The caller passes its local midnight so "today" respects the admin's
 * timezone, while the sum runs server-side over every completed payment (no
 * client-side row cap). Reversed/refunded payments carry a non-'completed'
 * status and are therefore excluded automatically; `paymentDate` is the
 * settlement date and does not drift when the row is later patched.
 */
export const getPaymentsTotalSince = query({
  args: { sinceMs: v.optional(v.number()) },
  handler: async (ctx, { sinceMs }) => {
    await assertStaff(ctx);
    const scope = await tenantReadScope(ctx);
    const since = sinceMs ?? Date.now() - 24 * 60 * 60 * 1000;
    // This query backs an always-visible dashboard stat, so it must stay cheap
    // as the payments table grows. Completed payments come back newest-first,
    // and we only want a recent window (typically "today"), so we page from the
    // newest and stop as soon as we pass the window — bounded work regardless
    // of total table size. WINDOW_CAP guards against a pathological run of
    // out-of-window rows (a payment created long ago but completed recently).
    const WINDOW_CAP = 2000;
    let total = 0;
    let count = 0;
    let scanned = 0;
    for await (const p of ctx.db
      .query('paymentTransactions')
      .withIndex('by_status', (q) => q.eq('status', 'completed'))
      .order('desc')) {
      if (++scanned > WINDOW_CAP) break;
      if (scope && p.institutionId !== undefined && p.institutionId !== scope) continue;
      if ((p.paymentDate ?? p.createdAt) >= since) {
        total += p.amount ?? 0;
        count += 1;
      }
    }
    return { total, count };
  },
});

// ---------------------------------------------------------------------------
// Risk Analysis
// ---------------------------------------------------------------------------

export const getRiskMetrics = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'advancedAnalytics');

    const now = Date.now();
    const scope = await tenantReadScope(ctx);
    const [loanRows, overdueRows, partiallyPaidRows] = await Promise.all([
      ctx.db.query('loans').take(10000),
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'overdue' as const))
        .take(10000),
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'partially_paid' as const))
        .take(10000),
    ]);
    const loans = applyTenantScope(loanRows, scope);
    const markedOverdue = applyTenantScope(overdueRows, scope);
    const partiallyPaid = applyTenantScope(partiallyPaidRows, scope);

    // partially_paid is sticky — past-due partially paid installments count
    // toward NPL/PAR with their REMAINING amount, not the full installment.
    const overdueSchedules = [...markedOverdue, ...partiallyPaid.filter((s) => s.dueDate < now)];
    const remainingDue = (o: (typeof overdueSchedules)[number]) =>
      Math.max(0, Math.round(((o.totalDue ?? 0) - (o.paidAmount ?? 0)) * 100)) / 100;

    const activeLoans = loans.filter((l) => ['active', 'funded', 'disbursed'].includes(l.status));
    const totalPortfolio = activeLoans.reduce(
      (s, l) => s + (l.outstandingBalance ?? l.principal ?? 0),
      0
    );
    const overdueAmount = overdueSchedules.reduce((s, o) => s + remainingDue(o), 0);

    const MS_PER_DAY = 86_400_000;

    const over30 = overdueSchedules.filter((o) => (now - o.dueDate) / MS_PER_DAY > 30);
    const over90 = overdueSchedules.filter((o) => (now - o.dueDate) / MS_PER_DAY > 90);

    return {
      nonPerformingLoans: overdueSchedules.length,
      overdueAmount,
      nplRatio: totalPortfolio > 0 ? overdueAmount / totalPortfolio : 0,
      par30: over30.reduce((s, o) => s + remainingDue(o), 0),
      par90: over90.reduce((s, o) => s + remainingDue(o), 0),
      par30Ratio:
        totalPortfolio > 0 ? over30.reduce((s, o) => s + remainingDue(o), 0) / totalPortfolio : 0,
    };
  },
});

// ---------------------------------------------------------------------------
// User & Client Metrics
// ---------------------------------------------------------------------------

export const getClientMetrics = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);

    const scope = await tenantReadScope(ctx);
    const [profileRows, loanRows] = await Promise.all([
      ctx.db.query('profiles').take(10000),
      ctx.db.query('loans').take(10000),
    ]);
    const profiles = applyTenantScope(profileRows, scope);
    const loans = applyTenantScope(loanRows, scope);

    const now = Date.now();
    const MS_30_DAYS = 30 * 86_400_000;

    return {
      totalClients: profiles.length,
      kycApproved: profiles.filter((p) => p.kycStatus === 'verified').length,
      kycPending: profiles.filter((p) => p.kycStatus === 'pending').length,
      newThisMonth: profiles.filter((p) => p.createdAt > now - MS_30_DAYS).length,
      withActiveLoans: new Set(
        loans
          .filter((l) => ['active', 'funded', 'disbursed'].includes(l.status))
          .map((l) => String(l.userId))
      ).size,
      repeatBorrowers: (() => {
        const counts: Record<string, number> = {};
        for (const l of loans) {
          const uid = String(l.userId);
          counts[uid] = (counts[uid] ?? 0) + 1;
        }
        return Object.values(counts).filter((c) => c > 1).length;
      })(),
    };
  },
});

// ---------------------------------------------------------------------------
// Monthly Trend Data (for charts)
// ---------------------------------------------------------------------------

export const getMonthlyTrends = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, { months }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'advancedAnalytics');

    const lookback = months ?? 12;
    const now = Date.now();
    const MS_PER_MONTH = 30 * 86_400_000;

    const scope = await tenantReadScope(ctx);
    const [loanRows, paymentRows] = await Promise.all([
      ctx.db.query('loans').take(10000),
      ctx.db.query('paymentTransactions').take(10000),
    ]);
    const loans = applyTenantScope(loanRows, scope);
    const payments = applyTenantScope(paymentRows, scope);

    const trends: Array<{
      month: string;
      newLoans: number;
      disbursedAmount: number;
      collectionsAmount: number;
      paymentCount: number;
    }> = [];
    for (let i = lookback - 1; i >= 0; i--) {
      const periodStart = now - (i + 1) * MS_PER_MONTH;
      const periodEnd = now - i * MS_PER_MONTH;

      const periodLoans = loans.filter(
        (l) => l.createdAt >= periodStart && l.createdAt < periodEnd
      );
      const periodPayments = payments.filter(
        (p) => p.createdAt >= periodStart && p.createdAt < periodEnd && p.status === 'completed'
      );

      const date = new Date(periodEnd);
      trends.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        newLoans: periodLoans.length,
        disbursedAmount: periodLoans
          .filter((l) => ['funded', 'disbursed', 'active'].includes(l.status))
          .reduce((s, l) => s + (l.principal ?? 0), 0),
        collectionsAmount: periodPayments.reduce((s, p) => s + (p.amount ?? 0), 0),
        paymentCount: periodPayments.length,
      });
    }

    return trends;
  },
});

// ---------------------------------------------------------------------------
// IPS Analytics
// ---------------------------------------------------------------------------

export const getIpsAnalytics = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { dateFrom, dateTo }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'advancedAnalytics');

    const transactions = applyTenantScope(
      await ctx.db.query('ipsTransactions').take(10000),
      await tenantReadScope(ctx)
    );

    const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toMs = dateTo ? new Date(dateTo).getTime() : Infinity;
    const filtered = transactions.filter((t) => t.createdAt >= fromMs && t.createdAt <= toMs);

    return {
      total: filtered.length,
      completed: filtered.filter((t) => t.status === 'completed').length,
      failed: filtered.filter((t) => t.status === 'failed').length,
      processing: filtered.filter((t) => t.status === 'processing').length,
      totalAmount: filtered.reduce((s, t) => s + (t.amount ?? 0), 0),
      successRate:
        filtered.length > 0
          ? filtered.filter((t) => t.status === 'completed').length / filtered.length
          : 0,
    };
  },
});
