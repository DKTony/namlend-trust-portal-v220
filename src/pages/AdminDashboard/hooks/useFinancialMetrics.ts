import { api } from '@/integrations/convex/api';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useQuery } from 'convex/react';

interface FinancialMetrics {
  totalClients: number;
  totalDisbursed: number;
  totalRepayments: number;
  overduePayments: number;
  totalLoans: number;
  pendingAmount: number;
  rejectedAmount: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  disbursed: number;
  repayments: number;
}

export const useFinancialMetrics = () => {
  const { hasFeature } = useEntitlements();
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const risk = useQuery(
    api.analytics.getRiskMetrics,
    hasFeature('advancedAnalytics') ? {} : 'skip'
  );
  const trends = useQuery(
    api.analytics.getMonthlyTrends,
    hasFeature('advancedAnalytics') ? { months: 6 } : 'skip'
  );
  const clientMetrics = useQuery(api.analytics.getClientMetrics);

  const loading = portfolio === undefined;
  const error: string | null = null;

  const metrics: FinancialMetrics | null = portfolio
    ? {
        totalClients: clientMetrics?.totalClients ?? 0,
        totalDisbursed: portfolio.portfolio?.totalDisbursed ?? 0,
        totalRepayments: portfolio.portfolio?.totalRepaid ?? 0,
        overduePayments: risk?.overdueAmount ?? 0,
        totalLoans: portfolio.loans?.total ?? 0,
        pendingAmount: 0, // not directly tracked
        rejectedAmount: 0,
      }
    : null;

  const revenueData: RevenueData[] = (trends ?? []).map((t) => ({
    month: t.month,
    revenue: t.collectionsAmount * 0.1, // simplified estimate
    disbursed: t.disbursedAmount,
    repayments: t.collectionsAmount,
  }));

  const refetch = () => {
    // Convex queries are reactive — no manual refetch needed
  };

  return {
    metrics,
    revenueData,
    loading,
    error,
    refetch,
  };
};
