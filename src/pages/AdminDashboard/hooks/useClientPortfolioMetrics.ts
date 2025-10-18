import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientPortfolioMetrics {
  totalClients: number;
  activeClients: number;
  totalClientValue: number;
  avgClientValue: number;
  premiumClients: number;
  pendingVerifications: number;
}

export const useClientPortfolioMetrics = () => {
  const [metrics, setMetrics] = useState<ClientPortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch profiles data
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) throw profilesError;

        // Fetch loans data for portfolio calculations
        const { data: loans, error: loansError } = await supabase
          .from('loans')
          .select('*');

        if (loansError) throw loansError;

        // Fetch KYC documents for verification status
        const { data: kycDocs, error: kycError } = await supabase
          .from('kyc_documents')
          .select('user_id, status');

        if (kycError) throw kycError;

        // Calculate metrics
        const totalClients = profiles?.length || 0;
        
        // Active clients (those with recent activity or active loans)
        const activeClients = profiles?.filter(profile => {
          const hasActiveLoans = loans?.some(loan => 
            loan.user_id === profile.id && 
            ['pending', 'approved', 'active'].includes(loan.status)
          );
          return hasActiveLoans || profile.updated_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }).length || 0;

        // Calculate total client value (sum of all loan amounts per client)
        const clientValues = new Map<string, number>();
        loans?.forEach(loan => {
          const currentValue = clientValues.get(loan.user_id) || 0;
          clientValues.set(loan.user_id, currentValue + (loan.amount || 0));
        });

        const totalClientValue = Array.from(clientValues.values()).reduce((sum, value) => sum + value, 0);
        const avgClientValue = totalClients > 0 ? totalClientValue / totalClients : 0;

        // Premium clients (those with portfolio value > N$50,000)
        const premiumClients = Array.from(clientValues.values()).filter(value => value > 50000).length;

        // Pending verifications (KYC documents with pending status)
        const pendingVerifications = kycDocs?.filter(doc => doc.status === 'pending').length || 0;

        const calculatedMetrics: ClientPortfolioMetrics = {
          totalClients,
          activeClients,
          totalClientValue,
          avgClientValue,
          premiumClients,
          pendingVerifications
        };

        setMetrics(calculatedMetrics);
      } catch (err) {
        console.error('Error fetching client portfolio metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
};
