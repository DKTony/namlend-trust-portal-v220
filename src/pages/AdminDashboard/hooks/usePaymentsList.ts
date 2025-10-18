import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { listPayments } from '@/services/paymentService';

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

      // Fetch payments via service layer
      const svc = await listPayments();
      if (!svc.success) {
        console.error('Error fetching payments via service:', svc.error);
        throw new Error('Failed to fetch payments');
      }
      const paymentsData = svc.payments || [];

      // Fetch loans data to get loan information
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('id, user_id, amount');

      if (loansError) {
        console.error('Error fetching loans:', loansError);
        throw new Error('Failed to fetch loans');
      }

      // Fetch profiles data to get client names
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error('Failed to fetch profiles');
      }

      // Create maps for quick lookup
      const loansMap = new Map();
      loansData?.forEach(loan => {
        loansMap.set(loan.id, loan);
      });

      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Transform payments data
      const transformedPayments: Payment[] = (paymentsData || []).map(payment => {
        const loan = loansMap.get(payment.loan_id);
        const profile = loan ? profilesMap.get(loan.user_id) : null;
        
        return {
          id: payment.id,
          loanId: payment.loan_id,
          clientName: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
            : 'Unknown',
          amount: payment.amount || 0,
          paymentMethod: payment.payment_method || 'bank_transfer',
          status: payment.status || 'pending',
          reference: payment.reference_number || `PAY-${payment.id.slice(0, 8)}`,
          dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Mock due date
          paidAt: payment.paid_at,
          createdAt: payment.created_at
        };
      });

      // Apply status filter
      let filteredPayments = transformedPayments;
      if (status !== 'all') {
        filteredPayments = transformedPayments.filter(payment => payment.status === status);
      }

      // Apply search filter
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
