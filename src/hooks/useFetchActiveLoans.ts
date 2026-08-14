import { useEntitlements } from '@/hooks/useEntitlements';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { useMemo, useState } from 'react';

/**
 * Loan with detailed balance information for payment UI
 */
export interface LoanWithDetails {
  id: string;
  amount: number;
  monthly_payment: number;
  status: string;
  total_repayment?: number;
  outstanding_balance: number;
  total_paid: number;
  next_due_date?: string;
  next_payment_amount: number;
  progress_percent: number;
  is_settled: boolean;
}

interface UseFetchActiveLoansOptions {
  userId: string;
  enabled?: boolean;
  excludeSettled?: boolean;
}

interface UseFetchActiveLoansResult {
  loans: LoanWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  selectedLoan: LoanWithDetails | null;
  setSelectedLoanId: (id: string) => void;
}

/**
 * Custom hook to fetch active loans with detailed balance information.
 * Consolidates duplicated fetch logic from PaymentModal (~90 lines reduced).
 *
 * Convex-native: uses reactive useQuery instead of imperative Supabase fetching.
 * Balance details are computed from Convex loan documents directly.
 *
 * @example
 * const { loans, isLoading, selectedLoan, setSelectedLoanId, refetch } = useFetchActiveLoans({
 *   userId: user.id,
 *   enabled: isOpen
 * });
 */
export function useFetchActiveLoans({
  userId,
  enabled = true,
  excludeSettled = true,
}: UseFetchActiveLoansOptions): UseFetchActiveLoansResult {
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const { hasFeature } = useEntitlements();
  const loansEnabled = hasFeature('clientLoans');

  // Convex reactive query — replaces Supabase imperative fetch
  const rawLoans = useQuery(api.loans.getMyLoans, enabled && userId && loansEnabled ? {} : 'skip');

  // Map Convex loan documents to LoanWithDetails shape
  const loans: LoanWithDetails[] = useMemo(() => {
    if (!rawLoans) return [];

    return rawLoans
      .filter((l: any) => ['active', 'disbursed', 'funded'].includes(l.status))
      .map((l: any) => {
        const totalRepayment = l.totalRepayment ?? l.principal ?? 0;
        const totalPaid = l.totalPaid ?? 0;
        const outstandingBalance = l.outstandingBalance ?? l.principal ?? 0;
        const isSettled =
          l.status === 'settled' || l.status === 'paid_off' || outstandingBalance <= 0;
        const progressPercent =
          totalRepayment > 0 ? Math.round((totalPaid / totalRepayment) * 100) : 0;

        return {
          id: l._id,
          amount: l.principal ?? l.amount ?? 0,
          monthly_payment: l.monthlyPayment ?? 0,
          status: l.status,
          total_repayment: totalRepayment,
          outstanding_balance: outstandingBalance,
          total_paid: totalPaid,
          next_payment_amount:
            outstandingBalance > 0 ? Math.min(l.monthlyPayment ?? 0, outstandingBalance) : 0,
          progress_percent: progressPercent,
          is_settled: isSettled,
        } as LoanWithDetails;
      })
      .filter((l: LoanWithDetails) => !(excludeSettled && l.is_settled));
  }, [rawLoans, excludeSettled]);

  const isLoading = enabled && userId && loansEnabled ? rawLoans === undefined : false;

  // Find selected loan from list
  const selectedLoan = loans.find((loan) => loan.id === selectedLoanId) || null;

  // refetch is a no-op with Convex (data is reactive), kept for API compatibility
  const refetch = async () => {};

  return {
    loans,
    isLoading,
    error: null,
    refetch,
    selectedLoan,
    setSelectedLoanId,
  };
}

export default useFetchActiveLoans;
