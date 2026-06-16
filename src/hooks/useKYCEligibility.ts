/**
 * useKYCEligibility Hook — Convex-native implementation
 *
 * Replaces the legacy callRpc('check_loan_eligibility') Supabase call.
 * Uses api.users.getMyKycDocuments (reactive Convex query) so the gate
 * lifts in real-time when an admin approves a document — no page reload
 * required.
 *
 * Required document types (from KYC.tsx):
 *   id_card       — national ID or passport (required)
 *   proof_income  — payslip or employer letter (required)
 */

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

const REQUIRED_DOC_TYPES = ['id_card', 'proof_income'] as const;

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

  // Reactive Convex query — auto-updates when KYC docs change
  const rawDocs = useQuery(api.users.getMyKycDocuments, user ? {} : 'skip');
  const profile = useQuery(api.users.getMyProfile, user ? {} : 'skip');

  const loading = user ? rawDocs === undefined || profile === undefined : false;

  const eligibility = useMemo((): KYCEligibility | null => {
    if (!user) return null;
    if (rawDocs === undefined) return null;

    // Build a set of approved document types
    const approvedTypes = new Set(
      (rawDocs ?? []).filter((doc) => doc.status === 'approved').map((doc) => doc.documentType)
    );

    const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !approvedTypes.has(t));
    const verifiedCount = REQUIRED_DOC_TYPES.filter((t) => approvedTypes.has(t)).length;

    // Profile completion: full_name + phone + employment_status + monthly_income = 4 fields
    const profileFields = [
      profile?.fullName,
      profile?.phone,
      profile?.employmentStatus,
      profile?.monthlyIncome,
    ];
    const completedFields = profileFields.filter(Boolean).length;
    const profileCompletion = Math.round((completedFields / profileFields.length) * 100);

    return {
      eligible: missingDocs.length === 0,
      required_docs: REQUIRED_DOC_TYPES.length,
      verified_docs: verifiedCount,
      profile_completion_percentage: profileCompletion,
      missing_required_docs: missingDocs,
    };
  }, [rawDocs, profile, user]);

  const verificationProgress =
    eligibility && eligibility.required_docs > 0
      ? Math.round((eligibility.verified_docs / eligibility.required_docs) * 100)
      : 0;

  return {
    eligibility,
    loading,
    error: null,
    refetch: async () => {
      // No-op: Convex reactive queries update automatically
    },
    isEligible: eligibility?.eligible ?? false,
    verificationProgress,
  };
}

export default useKYCEligibility;
