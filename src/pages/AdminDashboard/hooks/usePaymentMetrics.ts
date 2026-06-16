import { api } from '@/integrations/convex/api';
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
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const risk = useQuery(api.analytics.getRiskMetrics);
  const revenue = useQuery(api.analytics.getRevenueMetrics, {});
  const allLoans = useQuery(api.loans.adminListLoans, {});
  const completedPayments = useQuery(api.payments.adminListPayments, { status: 'completed' });

  const loading = portfolio === undefined;
  const error: string | null = null;

  // Derive metrics from reactive Convex data
  const loans = allLoans ?? [];
  const approvedLoans = loans.filter((l) => l.status === 'approved');
  const activeLoans = loans.filter((l) => ['active', 'funded', 'disbursed'].includes(l.status));
  const settledLoans = loans.filter((l) => l.status === 'paid_off');

  // Calculate today's completed payment total
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const totalPaymentsToday = (completedPayments ?? [])
    .filter((p) => (p.updatedAt ?? p.createdAt) >= todayMs)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const metrics: PaymentMetrics = {
    totalPaymentsToday,
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
