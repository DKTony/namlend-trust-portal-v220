import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import { useMemo } from 'react';

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

type ConvexPaymentStatus =
  | 'completed'
  | 'failed'
  | 'pending'
  | 'processing'
  | 'refunded'
  | 'reversed';

export const usePaymentsList = (
  status: 'all' | 'pending' | 'completed' | 'failed' | 'overdue',
  searchTerm: string
) => {
  // Convex reactive query — adminListPayments or fallback
  const rawPayments = useConvexQuery(api.payments.adminListPayments, {
    status: status !== 'all' && status !== 'overdue' ? (status as ConvexPaymentStatus) : undefined,
  });

  const loading = rawPayments === undefined;
  const error: string | null = null;

  const payments: Payment[] = useMemo(() => {
    if (!rawPayments) return [];

    const transformed: Payment[] = rawPayments.map((p) => ({
      id: String(p._id),
      loanId: String(p.loanId ?? ''),
      clientName: p.clientName ?? 'Unknown',
      amount: p.amount ?? 0,
      paymentMethod: (p.method ?? p.paymentMethod ?? 'bank_transfer') as Payment['paymentMethod'],
      status: (p.status ?? 'pending') as Payment['status'],
      reference: p.referenceNumber ?? `PAY-${String(p._id).slice(0, 8)}`,
      dueDate: p.dueDate
        ? new Date(p.dueDate).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : undefined,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
    }));

    // Apply search filter
    if (!searchTerm.trim()) return transformed;
    const searchLower = searchTerm.toLowerCase();
    return transformed.filter(
      (payment) =>
        payment.clientName.toLowerCase().includes(searchLower) ||
        payment.reference.toLowerCase().includes(searchLower) ||
        payment.id.toLowerCase().includes(searchLower) ||
        payment.amount.toString().includes(searchTerm)
    );
  }, [rawPayments, searchTerm]);

  const refetch = () => {}; // Convex is reactive

  return {
    payments,
    loading,
    error,
    refetch,
  };
};
