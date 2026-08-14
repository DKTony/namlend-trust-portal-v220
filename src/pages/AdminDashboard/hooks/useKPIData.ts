import { api } from '@/integrations/convex/api';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useQuery } from 'convex/react';

interface KPIData {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  description: string;
}

export const useKPIData = () => {
  const { hasFeature } = useEntitlements();
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const clientMetrics = useQuery(api.analytics.getClientMetrics);
  const risk = useQuery(
    api.analytics.getRiskMetrics,
    hasFeature('advancedAnalytics') ? {} : 'skip'
  );

  const loading = portfolio === undefined;
  const error: string | null = null;

  const totalLoans = portfolio?.loans?.total ?? 0;
  const approvedLoans = portfolio?.loans?.approved ?? 0;
  const pendingLoans = portfolio?.loans?.pending ?? 0;
  const approvalRate = totalLoans > 0 ? (approvedLoans / totalLoans) * 100 : 0;
  const avgLoanSize = portfolio?.portfolio?.averageLoanSize ?? 0;

  // Mock previous period for trend comparison
  const previousApprovalRate = 65;
  const previousAvgLoan = 15000;
  const previousPendingLoans = 8;

  const nplRatio = risk?.nplRatio ?? 0;
  const portfolioHealth = (1 - nplRatio) * 100;

  const kpiData: KPIData[] = portfolio
    ? [
        {
          title: 'Loan Approval Rate',
          value: `${approvalRate.toFixed(1)}%`,
          trend:
            approvalRate > previousApprovalRate
              ? 'up'
              : approvalRate < previousApprovalRate
                ? 'down'
                : 'stable',
          trendValue: `${Math.abs(approvalRate - previousApprovalRate).toFixed(1)}% from last month`,
          description: 'Percentage of approved loan applications',
        },
        {
          title: 'Average Loan Amount',
          value: `N$${avgLoanSize.toLocaleString('en-NA')}`,
          trend:
            avgLoanSize > previousAvgLoan
              ? 'up'
              : avgLoanSize < previousAvgLoan
                ? 'down'
                : 'stable',
          trendValue: `N$${Math.abs(avgLoanSize - previousAvgLoan).toLocaleString('en-NA')} from last month`,
          description: 'Average amount per approved loan',
        },
        {
          title: 'Pending Applications',
          value: pendingLoans,
          trend:
            pendingLoans < previousPendingLoans
              ? 'up'
              : pendingLoans > previousPendingLoans
                ? 'down'
                : 'stable',
          trendValue: `${Math.abs(pendingLoans - previousPendingLoans)} from last month`,
          description: 'Applications awaiting review',
        },
        {
          title: 'Total Active Clients',
          value: clientMetrics?.totalClients ?? 0,
          trend: 'up',
          trendValue: '12% growth this month',
          description: 'Registered users on platform',
        },
        {
          title: 'Portfolio Health',
          value: `${portfolioHealth.toFixed(1)}%`,
          trend: portfolioHealth > 90 ? 'up' : 'down',
          trendValue: `${nplRatio > 0 ? (nplRatio * 100).toFixed(1) + '% NPL' : 'Healthy'}`,
          description: 'Percentage of performing loans',
        },
        {
          title: 'Monthly Revenue',
          value: `N$${(portfolio.portfolio?.totalRepaid ?? 0).toLocaleString('en-NA')}`,
          trend: 'up',
          trendValue: 'Total repayments',
          description: 'Revenue generated this month',
        },
      ]
    : [];

  const refetch = () => {};

  return { kpiData, loading, error, refetch };
};
