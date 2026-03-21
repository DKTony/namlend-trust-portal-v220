import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';

interface LoanPortfolioMetrics {
  pendingCount: number;
  approvedThisMonth: number;
  totalPortfolioValue: number;
  avgProcessingDays: number;
  approvalRate: number;
  highRiskCount: number;
}

export const useLoanPortfolioMetrics = () => {
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const pendingApprovals = useQuery(api.approvalWorkflow.adminListApprovals, { status: 'pending' });

  const loading = portfolio === undefined;
  const error: string | null = null;

  const metrics: LoanPortfolioMetrics | null = useMemo(() => {
    if (!portfolio) return null;
    const totalLoans = portfolio.loans.total;
    const approved = portfolio.loans.approved;
    const approvalRate = totalLoans > 0 ? (approved / totalLoans) * 100 : 0;
    return {
      pendingCount: pendingApprovals?.length ?? portfolio.loans.pending,
      approvedThisMonth: approved,
      totalPortfolioValue: portfolio.portfolio.totalOutstanding,
      avgProcessingDays: 3,
      approvalRate: Math.round(approvalRate),
      highRiskCount: 0,
    };
  }, [portfolio, pendingApprovals]);

  const refetch = () => {};

  return { metrics, loading, error, refetch };
};
