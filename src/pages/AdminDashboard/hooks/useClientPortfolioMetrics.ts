import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';

interface ClientPortfolioMetrics {
  totalClients: number;
  activeClients: number;
  totalClientValue: number;
  avgClientValue: number;
  premiumClients: number;
  pendingVerifications: number;
}

export const useClientPortfolioMetrics = () => {
  const clientMetrics = useQuery(api.analytics.getClientMetrics);
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});

  const loading = clientMetrics === undefined;
  const error: string | null = null;

  const totalClients = clientMetrics?.totalClients ?? 0;
  const totalOutstanding = portfolio?.portfolio?.totalOutstanding ?? 0;

  const metrics: ClientPortfolioMetrics | null = clientMetrics
    ? {
        totalClients,
        activeClients: clientMetrics.withActiveLoans ?? 0,
        totalClientValue: totalOutstanding,
        avgClientValue: totalClients > 0 ? totalOutstanding / totalClients : 0,
        premiumClients: 0, // would need per-client aggregation query
        pendingVerifications: clientMetrics.kycPending ?? 0,
      }
    : null;

  return { metrics, loading, error };
};
