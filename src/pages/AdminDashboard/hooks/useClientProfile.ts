import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinedAt: string;
  totalValue: number;
  activeLoans: number;
  creditScore: number;
  totalBorrowed: number;
  totalRepaid: number;
  outstandingBalance: number;
  monthlyIncome: number;
  riskLevel: 'low' | 'medium' | 'high';
  isPremium: boolean;
  kycStatus: 'verified' | 'pending' | 'rejected';
  kycSource: 'RPC' | 'Derived';
}

export const useClientProfile = (clientId: string) => {
  const rawProfile = useQuery(
    api.users.getUserProfile,
    clientId ? { userId: clientId as Id<'users'> } : 'skip'
  );

  // Fetch all loans for this user (admin query, then filter client-side)
  const allLoans = useQuery(
    api.loans.adminListLoans,
    clientId ? { userId: clientId as Id<'users'> } : 'skip'
  );

  const loading = clientId ? rawProfile === undefined : false;
  const error: string | null = null;

  const client = useMemo<ClientProfile | null>(() => {
    if (!rawProfile) return null;
    const loans = allLoans ?? [];

    const totalBorrowed = loans.reduce((s, l) => s + l.principal, 0);
    const totalRepaid = loans.reduce((s, l) => s + (l.totalPaid ?? 0), 0);
    const outstandingBalance = loans
      .filter((l) => ['active', 'funded'].includes(l.status))
      .reduce((s, l) => s + (l.outstandingBalance ?? l.principal), 0);

    const activeLoanCount = loans.filter((l) => ['active', 'funded'].includes(l.status)).length;

    // Simplified credit score
    let creditScore = 650;
    if (totalRepaid > 0 && totalBorrowed > 0) {
      creditScore += Math.floor((totalRepaid / totalBorrowed) * 150);
    }
    creditScore = Math.max(300, Math.min(850, creditScore));

    let riskLevel: ClientProfile['riskLevel'] = 'low';
    if (outstandingBalance > 100000 || creditScore < 500) riskLevel = 'high';
    else if (outstandingBalance > 50000 || creditScore < 600) riskLevel = 'medium';

    let status: ClientProfile['status'] = 'inactive';
    if (activeLoanCount > 0) status = 'active';
    else if (loans.some((l) => l.status === 'submitted' || l.status === 'under_review'))
      status = 'pending';

    return {
      id: String(rawProfile.userId),
      fullName: rawProfile.fullName || 'Unknown',
      email: rawProfile.email || 'user@example.invalid',
      phone: rawProfile.phone,
      address: undefined,
      dateOfBirth: undefined,
      status,
      joinedAt: rawProfile.createdAt
        ? new Date(rawProfile.createdAt).toISOString()
        : new Date().toISOString(),
      totalValue: totalBorrowed,
      activeLoans: activeLoanCount,
      creditScore,
      totalBorrowed,
      totalRepaid,
      outstandingBalance,
      monthlyIncome: rawProfile.monthlyIncome ?? 0,
      riskLevel,
      isPremium: totalBorrowed > 50000,
      kycStatus: (rawProfile.kycStatus as ClientProfile['kycStatus']) ?? 'pending',
      kycSource: 'Derived',
    };
  }, [rawProfile, allLoans]);

  return { client, loading, error };
};
