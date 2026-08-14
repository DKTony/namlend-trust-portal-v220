/** Canonical Convex-backed KYC eligibility projection. */

import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { api } from '@/integrations/convex/api';
import type { QueryData } from '@/types/convex';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export type KYCOverview = QueryData<typeof api.kycDocuments.getMyKycOverview>;

export interface KYCEligibility {
  eligible: boolean;
  required_docs: number;
  verified_docs: number;
  profile_completion_percentage: number;
  missing_required_docs: string[];
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
}

interface UseKYCEligibilityReturn {
  eligibility: KYCEligibility | null;
  overview: KYCOverview | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isEligible: boolean;
  verificationProgress: number;
}

export function useKYCEligibility(): UseKYCEligibilityReturn {
  const { user } = useAuth();
  const { hasFeature } = useEntitlements();
  const documentsEnabled = hasFeature('clientDocuments');
  const overview = useQuery(
    api.kycDocuments.getMyKycOverview,
    user && documentsEnabled ? {} : 'skip'
  );
  const profile = useQuery(api.users.getMyProfile, user ? {} : 'skip');
  const loading =
    user && documentsEnabled ? overview === undefined || profile === undefined : false;

  const eligibility = useMemo((): KYCEligibility | null => {
    if (!user || !overview) return null;
    const required = overview.requiredDocumentTypes;
    const approved = new Set(overview.approvedRequiredDocumentTypes);
    const missingApproval = required.filter((type) => !approved.has(type));
    const profileFields = [
      profile?.fullName,
      profile?.phone,
      profile?.employmentStatus,
      profile?.monthlyIncome,
    ];
    const completedFields = profileFields.filter(Boolean).length;

    return {
      eligible: overview.eligible,
      required_docs: required.length,
      verified_docs: approved.size,
      profile_completion_percentage: Math.round((completedFields / profileFields.length) * 100),
      missing_required_docs: missingApproval,
      status: overview.status,
    };
  }, [overview, profile, user]);

  const verificationProgress =
    eligibility && eligibility.required_docs > 0
      ? Math.round((eligibility.verified_docs / eligibility.required_docs) * 100)
      : 0;

  return {
    eligibility,
    overview: overview ?? null,
    loading,
    error: null,
    refetch: async () => {},
    isEligible: eligibility?.eligible ?? false,
    verificationProgress,
  };
}

export default useKYCEligibility;
