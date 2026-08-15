import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';

interface KPIData {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  description: string;
}

export const useKPIData = () => {
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const clientMetrics = useQuery(api.analytics.getClientMetrics);
  const risk = useQuery(api.analytics.getRiskMetrics);

  const loading = portfolio === undefined;
  const error: string | null = null;

  const totalLoans = portfolio?.loans?.total ?? 0;
  const approvedLoans = portfolio?.loans?.approved ?? 0;
  const pendingLoans = portfolio?.loans?.pending ?? 0;
  const approvalRate = totalLoans > 0 ? (approvedLoans / totalLoans) * 100 : 0;
  const avgLoanSize = portfolio?.portfolio?.averageLoanSize ?? 0;

  const nplRatio = risk?.nplRatio ?? 0;
  const portfolioHealth = (1 - nplRatio) * 100;

  const kpiData: KPIData[] = portfolio
    ? [
        {
          title: 'Loan Approval Rate',
          value: `${approvalRate.toFixed(1)}%`,
          trend: 'stable',
          trendValue: `${approvedLoans} of ${totalLoans} loans approved`,
          description: 'Percentage of approved loan applications',
        },
        {
          title: 'Average Loan Amount',
          value: `N$${avgLoanSize.toLocaleString('en-NA')}`,
          trend: 'stable',
          trendValue: 'Current portfolio average',
          description: 'Average amount per approved loan',
        },
        {
          title: 'Pending Applications',
          value: pendingLoans,
          trend: 'stable',
          trendValue: 'Awaiting staff review',
          description: 'Applications awaiting review',
        },
        {
          title: 'Total Active Clients',
          value: clientMetrics?.totalClients ?? 0,
          trend: 'stable',
          trendValue: `${clientMetrics?.newThisMonth ?? 0} new in the last 30 days`,
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
