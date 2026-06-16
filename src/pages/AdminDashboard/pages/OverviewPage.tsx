/**
 * Admin Overview Page
 * Financial summary cards and metrics — the default admin landing page.
 */

import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import React, { useMemo } from 'react';
import FinancialSummaryCards from '../components/Overview/FinancialSummaryCards';

const OverviewPage: React.FC = () => {
  const portfolio = useConvexQuery(api.analytics.getPortfolioSummary, {});
  const clientMetrics = useConvexQuery(api.analytics.getClientMetrics);
  const rawLoans = useConvexQuery(api.loans.adminListLoans, {});

  const metricsLoading = portfolio === undefined;

  const metrics = useMemo(() => {
    if (!portfolio) return null;
    const loans = (rawLoans ?? []) as Array<{
      amount?: number;
      principal?: number;
      status: string;
    }>;
    return {
      totalClients: clientMetrics?.totalClients ?? 0,
      totalDisbursed: portfolio.portfolio.totalDisbursed ?? 0,
      totalRepayments: portfolio.portfolio.totalRepaid ?? 0,
      overduePayments: 0,
      totalLoans: portfolio.loans.total ?? loans.length,
      pendingAmount: loans
        .filter((l) => l.status === 'pending')
        .reduce((sum, l) => sum + (Number(l.amount ?? l.principal) || 0), 0),
      rejectedAmount: loans
        .filter((l) => l.status === 'rejected')
        .reduce((sum, l) => sum + (Number(l.amount ?? l.principal) || 0), 0),
    };
  }, [portfolio, clientMetrics, rawLoans]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FinancialSummaryCards metrics={metrics} loading={metricsLoading} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{/* Placeholder for charts */}</div>
    </div>
  );
};

export default OverviewPage;
