/**
 * useKYCEligibility Hook
 *
 * Fetches KYC document verification eligibility status for current user.
 * Wraps the existing check_loan_eligibility RPC function.
 *
 * Used by:
 * - LoanApplication.tsx - To gate loan submissions
 * - Dashboard.tsx - To show verification status
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { callRpc } from '@/utils/rpc';

export interface KYCEligibility {
  eligible: boolean;
  required_docs: number;
  verified_docs: number;
  profile_completion_percentage: number;
  missing_required_docs: string[];
}

interface UseKYCEligibilityReturn {
  eligibility: KYCEligibility | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isEligible: boolean;
  verificationProgress: number;
}

export function useKYCEligibility(): UseKYCEligibilityReturn {
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState<KYCEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEligibility = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await callRpc<KYCEligibility | KYCEligibility[]>(
        'check_loan_eligibility',
        {},
        { timeoutMs: 3000, retries: 1 }
      );

      if (result.ok && result.data) {
        // RPC may return array or single object
        if (Array.isArray(result.data) && result.data.length > 0) {
          setEligibility(result.data[0]);
        } else if (!Array.isArray(result.data)) {
          setEligibility(result.data);
        } else {
          // Empty array - no eligibility data
          setEligibility(null);
        }
      } else {
        console.warn('Eligibility RPC failed:', result.error);
        setError('Failed to fetch eligibility status');
      }
    } catch (err) {
      console.error('Error fetching eligibility:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  // Calculate verification progress percentage
  const verificationProgress = eligibility && eligibility.required_docs > 0
    ? Math.round((eligibility.verified_docs / eligibility.required_docs) * 100)
    : 0;

  return {
    eligibility,
    loading,
    error,
    refetch: fetchEligibility,
    isEligible: eligibility?.eligible ?? false,
    verificationProgress
  };
}

export default useKYCEligibility;
