import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentMetrics {
  // Amount processed today (completed payments sum)
  totalPaymentsToday: number;
  // Amount waiting to be disbursed (sum of approved loan principals)
  pendingDisbursements: number;
  // Count of items waiting disbursement
  pendingDisbursementCount: number;
  // Approximated overdue amount (sum of pending payments older than 30 days)
  overdueAmount: number;
  // Count of overdue pending payments
  overdueCount: number;
  // Amount collected this calendar month (completed payments sum)
  collectionsThisMonth: number;
  // Completed / total payments (%)
  paymentSuccessRate: number;
  // Approximation: active loans count
  activePaymentPlans: number;
}

export const usePaymentMetrics = () => {
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalPaymentsToday: 0,
    pendingDisbursements: 0,
    pendingDisbursementCount: 0,
    overdueAmount: 0,
    overdueCount: 0,
    collectionsThisMonth: 0,
    paymentSuccessRate: 0,
    activePaymentPlans: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payments data
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*');

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw new Error('Failed to fetch payment data');
      }

      // Fetch loans data for disbursement calculations
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*');

      if (loansError) {
        console.error('Error fetching loans:', loansError);
        throw new Error('Failed to fetch loan data');
      }

      // Time windows
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Payment partitions
      const totalPaymentsCount = payments?.length || 0;
      const completedPayments = (payments || []).filter(p => p.status === 'completed');
      const pendingPayments = (payments || []).filter(p => p.status === 'pending');

      // Payments processed today:
      //  - Completed payments where paid_at is today
      //  - Initiated (pending) payments created today
      // Avoid double counting by only counting completed payments via paid_at
      const todayCompletedAmount = completedPayments
        .filter(p => p.paid_at && new Date(p.paid_at) >= startOfToday)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const todayInitiatedPendingAmount = pendingPayments
        .filter(p => p.created_at && new Date(p.created_at) >= startOfToday)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const totalPaymentsToday = todayCompletedAmount + todayInitiatedPendingAmount;

      const collectionsThisMonth = completedPayments
        .filter(p => p.paid_at && new Date(p.paid_at) >= startOfMonth)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const overdueAmount = pendingPayments
        .filter(p => p.created_at && new Date(p.created_at) < thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const overdueCount = pendingPayments
        .filter(p => p.created_at && new Date(p.created_at) < thirtyDaysAgo)
        .length;

      // Loans partitions
      const approvedLoans = (loans || []).filter(l => l.status === 'approved');
      const activeLoans = (loans || []).filter(l => l.status === 'active');
      const pendingDisbursementsAmount = approvedLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
      const pendingDisbursementCount = approvedLoans.length;

      const paymentSuccessRate = totalPaymentsCount > 0
        ? Math.round((completedPayments.length / totalPaymentsCount) * 100)
        : 0;

      setMetrics({
        totalPaymentsToday,
        pendingDisbursements: pendingDisbursementsAmount,
        pendingDisbursementCount,
        overdueAmount,
        overdueCount,
        collectionsThisMonth,
        paymentSuccessRate,
        activePaymentPlans: activeLoans.length
      });

    } catch (err) {
      console.error('Error fetching payment metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
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
    loading,
    error,
    refetch
  };
};
