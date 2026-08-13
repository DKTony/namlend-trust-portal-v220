import { api } from '@/integrations/convex/api';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useQuery } from 'convex/react';

interface PaymentMetrics {
  totalPaymentsToday: number;
  pendingDisbursements: number;
  pendingDisbursementCount: number;
  overdueAmount: number;
  overdueCount: number;
  collectionsThisMonth: number;
  paymentSuccessRate: number;
  activePaymentPlans: number;
  settledLoansCount: number;
  settledLoansAmount: number;
}

export const usePaymentMetrics = () => {
  const { enforced, entitlements, isLoading: entitlementsLoading } = useEntitlements();
  const advancedAnalyticsEnabled =
    !entitlementsLoading && (!enforced || entitlements.has('advancedAnalytics'));
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const risk = useQuery(api.analytics.getRiskMetrics, advancedAnalyticsEnabled ? {} : 'skip');
  const revenue = useQuery(api.analytics.getRevenueMetrics, advancedAnalyticsEnabled ? {} : 'skip');
  const allLoans = useQuery(api.loans.adminListLoans, {});

  // Today's total is summed server-side (no 100-row cap, uses the settlement
  // date paymentDate not the drift-prone updatedAt, excludes reversed via the
  // completed-status index). Pass local midnight so "today" is the admin's day.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const paymentsToday = useQuery(api.analytics.getPaymentsTotalSince, {
    sinceMs: todayStart.getTime(),
  });

  const loading = portfolio === undefined;
  const error: string | null = null;

  // Derive metrics from reactive Convex data
  const loans = allLoans ?? [];
  const approvedLoans = loans.filter((l) => l.status === 'approved');
  const activeLoans = loans.filter((l) => ['active', 'funded', 'disbursed'].includes(l.status));
  const settledLoans = loans.filter((l) => l.status === 'paid_off');

  const metrics: PaymentMetrics = {
    totalPaymentsToday: paymentsToday?.total ?? 0,
    pendingDisbursements: approvedLoans.reduce((s, l) => s + (l.principal ?? 0), 0),
    pendingDisbursementCount: approvedLoans.length,
    overdueAmount: risk?.overdueAmount ?? 0,
    overdueCount: risk?.nonPerformingLoans ?? 0,
    collectionsThisMonth: revenue?.totalCollected ?? 0,
    paymentSuccessRate: (revenue?.paymentCount ?? 0) > 0 ? 100 : 0, // simplified
    activePaymentPlans: activeLoans.length,
    settledLoansCount: settledLoans.length,
    settledLoansAmount: settledLoans.reduce((s, l) => s + (l.totalPaid ?? l.principal ?? 0), 0),
  };

  const refetch = () => {};

  return { metrics, loading, error, refetch };
};
