import { useState, useEffect } from 'react';
import { paymentsAPI } from '@/services/api-client';

interface Payment {
  id: string;
  loanId: string;
  clientName: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order';
  status: 'pending' | 'completed' | 'failed' | 'overdue';
  reference: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

interface PaymentApiItem {
  id: string;
  loan_id: string;
  amount: number;
  payment_method?: string;
  status?: string;
  reference_number?: string;
  paid_at?: string;
  created_at: string;
  client_name?: string;
  due_date?: string;
}

export const usePaymentsList = (
  status: 'all' | 'pending' | 'completed' | 'failed' | 'overdue',
  searchTerm: string
) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payments via API orchestration layer
      const result = await paymentsAPI.list({
        status: status !== 'all' ? status : undefined,
      });

      if (!result.success) {
        console.error('Error fetching payments via API:', result.error);
        throw new Error(result.error || 'Failed to fetch payments');
      }

      const paymentsData = (result.data as PaymentApiItem[]) || [];

      // Transform payments data
      const transformedPayments: Payment[] = paymentsData.map((payment: PaymentApiItem) => ({
        id: payment.id,
        loanId: payment.loan_id,
        clientName: payment.client_name || 'Unknown',
        amount: payment.amount || 0,
        paymentMethod: (payment.payment_method as Payment['paymentMethod']) || 'bank_transfer',
        status: (payment.status as Payment['status']) || 'pending',
        reference: payment.reference_number || `PAY-${payment.id.slice(0, 8)}`,
        dueDate: payment.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: payment.paid_at,
        createdAt: payment.created_at
      }));

      // Apply search filter (status filter is handled by API)
      let filteredPayments = transformedPayments;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredPayments = filteredPayments.filter(payment =>
          payment.clientName.toLowerCase().includes(searchLower) ||
          payment.reference.toLowerCase().includes(searchLower) ||
          payment.id.toLowerCase().includes(searchLower) ||
          payment.amount.toString().includes(searchTerm)
        );
      }

      setPayments(filteredPayments);

    } catch (err) {
      console.error('Error in fetchPayments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [status, searchTerm]);

  const refetch = () => {
    fetchPayments();
  };

  return {
    payments,
    loading,
    error,
    refetch
  };
};
