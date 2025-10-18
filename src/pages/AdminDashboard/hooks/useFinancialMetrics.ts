import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancialSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_summary')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching financial summary:', error);
        // Return mock data if the view doesn't exist yet
        return {
          total_clients: 0,
          total_loans: 0,
          total_disbursed: 0,
          pending_amount: 0,
          rejected_amount: 0,
          total_repayments: 0,
          overdue_payments: 0
        };
      }

      return data;
    } catch (err) {
      console.error('Error in fetchFinancialSummary:', err);
      return null;
    }
  };

  const fetchRevenueData = async () => {
    try {
      // Try to fetch from loan_performance_summary view if it exists
      const { data, error } = await supabase
        .from('loans')
        .select(`
          created_at,
          amount,
          status
        `)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching revenue data:', error);
        return [];
      }

      // Process the data to create monthly revenue trends
      const monthlyData: Record<string, RevenueData> = data.reduce((acc: Record<string, RevenueData>, loan: any) => {
        const month = new Date(loan.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        if (!acc[month]) {
          acc[month] = {
            month,
            revenue: 0,
            disbursed: 0,
            repayments: 0
          };
        }

        if (loan.status === 'approved') {
          acc[month].disbursed += loan.amount;
          // Estimate revenue as 10% of loan amount (simplified)
          acc[month].revenue += loan.amount * 0.1;
        }

        return acc;
      }, {});

      return Object.values(monthlyData).slice(-6) as RevenueData[]; // Last 6 months
    } catch (err) {
      console.error('Error in fetchRevenueData:', err);
      return [];
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, revenueData] = await Promise.all([
        fetchFinancialSummary(),
        fetchRevenueData()
      ]);

      if (summaryData) {
        setMetrics({
          totalClients: summaryData.total_clients || 0,
          totalDisbursed: summaryData.total_disbursed || 0,
          totalRepayments: summaryData.total_repayments || 0,
          overduePayments: summaryData.overdue_payments || 0,
          totalLoans: summaryData.total_loans || 0,
          pendingAmount: summaryData.pending_amount || 0,
          rejectedAmount: summaryData.rejected_amount || 0
        });
      }

      setRevenueData(revenueData);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load financial metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const refetch = () => {
    fetchMetrics();
  };

  return {
    metrics,
    revenueData,
    loading,
    error,
    refetch
  };
};
