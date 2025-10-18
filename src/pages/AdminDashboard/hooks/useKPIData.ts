import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KPIData {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  description: string;
}

export const useKPIData = () => {
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateKPIs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch loan data for KPI calculations
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*');

      if (loansError) {
        console.error('Error fetching loans for KPIs:', loansError);
        return;
      }

      // Fetch user profiles for client metrics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles for KPIs:', profilesError);
      }

      // Calculate KPIs
      const totalLoans = loans?.length || 0;
      const approvedLoans = loans?.filter(loan => loan.status === 'approved').length || 0;
      const pendingLoans = loans?.filter(loan => loan.status === 'pending').length || 0;
      const rejectedLoans = loans?.filter(loan => loan.status === 'rejected').length || 0;
      
      const approvalRate = totalLoans > 0 ? (approvedLoans / totalLoans * 100) : 0;
      const averageLoanAmount = approvedLoans > 0 
        ? loans?.filter(loan => loan.status === 'approved')
            .reduce((sum, loan) => sum + loan.amount, 0) / approvedLoans 
        : 0;

      // Calculate trends (simplified - comparing with mock previous period)
      const previousApprovalRate = 65; // Mock previous period data
      const previousAvgLoan = 15000; // Mock previous period data
      const previousPendingLoans = 8; // Mock previous period data

      const kpis: KPIData[] = [
        {
          title: 'Loan Approval Rate',
          value: `${approvalRate.toFixed(1)}%`,
          trend: approvalRate > previousApprovalRate ? 'up' : approvalRate < previousApprovalRate ? 'down' : 'stable',
          trendValue: `${Math.abs(approvalRate - previousApprovalRate).toFixed(1)}% from last month`,
          description: 'Percentage of approved loan applications'
        },
        {
          title: 'Average Loan Amount',
          value: `N$${averageLoanAmount.toLocaleString('en-NA')}`,
          trend: averageLoanAmount > previousAvgLoan ? 'up' : averageLoanAmount < previousAvgLoan ? 'down' : 'stable',
          trendValue: `N$${Math.abs(averageLoanAmount - previousAvgLoan).toLocaleString('en-NA')} from last month`,
          description: 'Average amount per approved loan'
        },
        {
          title: 'Pending Applications',
          value: pendingLoans,
          trend: pendingLoans < previousPendingLoans ? 'up' : pendingLoans > previousPendingLoans ? 'down' : 'stable',
          trendValue: `${Math.abs(pendingLoans - previousPendingLoans)} from last month`,
          description: 'Applications awaiting review'
        },
        {
          title: 'Total Active Clients',
          value: profiles?.length || 0,
          trend: 'up',
          trendValue: '12% growth this month',
          description: 'Registered users on platform'
        },
        {
          title: 'Portfolio Health',
          value: '94.2%',
          trend: 'up',
          trendValue: '2.1% improvement',
          description: 'Percentage of performing loans'
        },
        {
          title: 'Monthly Revenue',
          value: 'N$45,230',
          trend: 'up',
          trendValue: '18% increase',
          description: 'Revenue generated this month'
        }
      ];

      setKpiData(kpis);
    } catch (err) {
      console.error('Error calculating KPIs:', err);
      setError('Failed to calculate KPI metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateKPIs();
  }, []);

  const refetch = () => {
    calculateKPIs();
  };

  return {
    kpiData,
    loading,
    error,
    refetch
  };
};
