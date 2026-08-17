import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export const RECENT_ENROLLMENT_MS = 14 * 24 * 60 * 60 * 1000;

export type ClientListStatus = 'all' | 'active' | 'inactive' | 'suspended' | 'pending' | 'recent';

export interface ClientListItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinedAt: string;
  totalLoans: number;
  totalValue: number;
  lastActivity: string;
  riskLevel: 'low' | 'medium' | 'high';
  isPremium: boolean;
  kycStatus: 'verified' | 'pending' | 'rejected';
  signupSource?: string;
  isNew: boolean;
}

export const useClientsList = (status: ClientListStatus | string, searchTerm: string) => {
  const allUsers = useQuery(api.users.adminListClientsWithPortfolio, {});

  const loading = allUsers === undefined;
  const error: string | null = null;

  const clients = useMemo(() => {
    if (!allUsers) return [];
    const now = Date.now();
    const transformed: ClientListItem[] = allUsers.map((user) => {
      const totalValue = user.totalPrincipal;
      const joinedAt = user.joinedAt
        ? new Date(user.joinedAt).toISOString()
        : new Date().toISOString();

      let clientStatus: ClientListItem['status'] = 'inactive';
      if (user.activeLoanCount > 0) clientStatus = 'active';
      else if (user.pendingLoanCount > 0) clientStatus = 'pending';
      else if (user.profileStatus === 'suspended') clientStatus = 'suspended';

      let riskLevel: ClientListItem['riskLevel'] = 'low';
      if (totalValue > 100000) riskLevel = 'high';
      else if (totalValue > 50000) riskLevel = 'medium';

      return {
        id: String(user.userId),
        fullName: user.fullName || 'Unknown',
        email: user.email || `user-${String(user.userId).slice(0, 8)}@example.invalid`,
        phone: user.phone,
        address: user.address,
        status: clientStatus,
        joinedAt,
        totalLoans: user.loanCount,
        totalValue,
        lastActivity: user.latestActivity
          ? new Date(user.latestActivity).toISOString()
          : new Date().toISOString(),
        riskLevel,
        isPremium: totalValue > 50000,
        kycStatus: (user.kycStatus as ClientListItem['kycStatus']) ?? 'pending',
        signupSource: user.signupSource,
        isNew: now - new Date(joinedAt).getTime() <= RECENT_ENROLLMENT_MS,
      };
    });

    let filtered = transformed;
    if (status === 'recent') {
      filtered = filtered.filter((c) => c.isNew);
    } else if (status !== 'all') {
      filtered = filtered.filter((c) => c.status === status);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    return filtered;
  }, [allUsers, status, searchTerm]);

  const refetch = () => {};
  return { clients, loading, error, refetch };
};
