import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LoanPortfolioMetrics {
  pendingCount: number;
  approvedThisMonth: number;
  totalPortfolioValue: number;
  avgProcessingDays: number;
  approvalRate: number;
  highRiskCount: number;
}

export const useLoanPortfolioMetrics = () => {
  const [metrics, setMetrics] = useState<LoanPortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all loans for calculations
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*');

      if (loansError) {
        console.error('Error fetching loans:', loansError);
        throw new Error('Failed to fetch loan data');
      }

      // Fetch pending loan applications from approvals view to align with workflow
      const { data: pendingRequests, error: pendingReqError } = await supabase
        .from('approval_requests_expanded')
        .select('id')
        .eq('request_type', 'loan_application')
        .eq('status', 'pending');
      if (pendingReqError) {
        console.error('Error fetching pending approval requests:', pendingReqError);
        throw new Error('Failed to fetch pending approval requests');
      }

      // Calculate metrics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Pending applications count should reflect approvals, not loans table
      const pendingLoans = loans?.filter(loan => loan.status === 'pending') || [];
      const approvedLoans = loans?.filter(loan => loan.status === 'approved') || [];
      const approvedThisMonth = loans?.filter(loan => 
        loan.status === 'approved' && new Date(loan.updated_at) >= thisMonth
      ) || [];
      
      const totalLoans = loans?.length || 0;
      const approvalRate = totalLoans > 0 ? (approvedLoans.length / totalLoans) * 100 : 0;
      
      // Calculate total portfolio value (approved + disbursed loans)
      const portfolioLoans = loans?.filter(loan => 
        loan.status === 'approved' || loan.status === 'disbursed'
      ) || [];
      const totalPortfolioValue = portfolioLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
      
      // Mock calculations for metrics not directly available
      const avgProcessingDays = 3; // Mock average processing time
      const highRiskCount = pendingLoans.filter(loan => 
        (loan.amount || 0) > 100000 // Consider high amounts as high risk for now
      ).length;

      const calculatedMetrics: LoanPortfolioMetrics = {
        pendingCount: pendingRequests?.length || 0,
        approvedThisMonth: approvedThisMonth.length,
        totalPortfolioValue,
        avgProcessingDays,
        approvalRate: Math.round(approvalRate),
        highRiskCount
      };

      setMetrics(calculatedMetrics);
    } catch (err) {
      console.error('Error calculating portfolio metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioMetrics();
  }, []);

  const refetch = () => {
    fetchPortfolioMetrics();
  };

  return {
    metrics,
    loading,
    error,
    refetch
  };
};
