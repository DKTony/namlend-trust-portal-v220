import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLoanPaymentDetails } from '@/services/paymentService';

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
 * Features:
 * - Automatic cancellation on unmount (prevents stale state updates)
 * - AbortController pattern for cleanup
 * - Enriches loans with payment details (outstanding balance, progress, etc.)
 * - Filters out settled loans by default
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
  excludeSettled = true
}: UseFetchActiveLoansOptions): UseFetchActiveLoansResult {
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  
  // Track if component is mounted to prevent stale state updates
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch loan details and enrich with balance information
   */
  const fetchLoanDetails = useCallback(async (loanId: string): Promise<LoanWithDetails | null> => {
    const details = await getLoanPaymentDetails(loanId);
    
    if (details.success && details.loan && details.summary) {
      return {
        id: details.loan.id,
        amount: details.loan.amount,
        monthly_payment: details.loan.monthly_payment,
        status: details.loan.status,
        total_repayment: details.loan.total_repayment,
        outstanding_balance: details.summary.outstanding_balance,
        total_paid: details.summary.total_paid,
        next_due_date: details.summary.next_due_date,
        next_payment_amount: details.summary.outstanding_balance > 0 
          ? Math.min(details.loan.monthly_payment, details.summary.outstanding_balance)
          : 0,
        progress_percent: details.summary.total_scheduled > 0 
          ? Math.round((details.summary.total_paid / details.summary.total_scheduled) * 100)
          : 0,
        is_settled: details.summary.is_settled
      };
    }
    return null;
  }, []);

  /**
   * Main fetch function with cancellation support
   */
  const fetchLoans = useCallback(async () => {
    if (!userId) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch active loans for user
      // Note: Using type assertion due to Supabase generated types inference limitation
      const { data, error: fetchError } = await (supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId) as any)
        .in('status', ['active', 'disbursed', 'funded'])
        .order('created_at', { ascending: false });

      // Check if request was cancelled
      if (abortControllerRef.current?.signal.aborted) return;

      if (fetchError) {
        if (isMountedRef.current) {
          setError(fetchError.message);
          setLoans([]);
        }
        return;
      }

      if (data && data.length > 0) {
        const loansWithDetails: LoanWithDetails[] = [];
        
        for (const loan of data) {
          // Check cancellation before each async operation
          if (abortControllerRef.current?.signal.aborted) return;
          
          const details = await fetchLoanDetails(loan.id);
          
          if (details) {
            // Skip settled loans if excludeSettled is true
            if (excludeSettled && details.is_settled) continue;
            loansWithDetails.push(details);
          }
        }

        // Final check before state update
        if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
          setLoans(loansWithDetails);
          
          // Auto-select first loan if none selected
          if (loansWithDetails.length > 0 && !selectedLoanId) {
            setSelectedLoanId(loansWithDetails[0].id);
          }
        }
      } else {
        if (isMountedRef.current) {
          setLoans([]);
        }
      }
    } catch (err) {
      // Only set error if not cancelled and still mounted
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch loans';
        setError(errorMessage);
        console.error('Error fetching loans:', err);
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [userId, excludeSettled, fetchLoanDetails, selectedLoanId]);

  // Initial fetch when enabled
  useEffect(() => {
    isMountedRef.current = true;
    
    if (enabled && userId) {
      fetchLoans();
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, userId, fetchLoans]);

  // Find selected loan from list
  const selectedLoan = loans.find(loan => loan.id === selectedLoanId) || null;

  return {
    loans,
    isLoading,
    error,
    refetch: fetchLoans,
    selectedLoan,
    setSelectedLoanId
  };
}

export default useFetchActiveLoans;
