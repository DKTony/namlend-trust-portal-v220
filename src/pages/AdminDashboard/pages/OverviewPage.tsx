/**
 * Admin Overview Page
 * Financial summary cards and metrics — the default admin landing page.
 */

import React, { useMemo } from 'react';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import FinancialSummaryCards from '../components/Overview/FinancialSummaryCards';

const OverviewPage: React.FC = () => {
  const portfolio = useConvexQuery(api.analytics.getPortfolioSummary);
  const clientMetrics = useConvexQuery(api.analytics.getClientMetrics);
  const rawLoans = useConvexQuery(api.loans.adminListLoans, {});

  const metricsLoading = portfolio === undefined;

  const metrics = useMemo(() => {
    if (!portfolio) return null;
    const loans = rawLoans ?? [];
    return {
      totalClients: clientMetrics?.totalClients ?? 0,
      totalDisbursed: portfolio.totalDisbursed ?? 0,
      totalRepayments: portfolio.totalRepayments ?? 0,
      overduePayments: portfolio.overdueCount ?? 0,
      totalLoans: portfolio.totalLoans ?? loans.length,
      pendingAmount: loans
        .filter((l: any) => l.status === 'pending')
        .reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0),
      rejectedAmount: loans
        .filter((l: any) => l.status === 'rejected')
        .reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0),
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
