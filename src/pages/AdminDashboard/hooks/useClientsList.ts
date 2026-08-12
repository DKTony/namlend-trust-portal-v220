import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

interface Client {
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
}

export const useClientsList = (status: string, searchTerm: string) => {
  const allUsers = useQuery(api.users.adminListClientsWithPortfolio, {});

  const loading = allUsers === undefined;
  const error: string | null = null;

  const clients = useMemo(() => {
    if (!allUsers) return [];
    const transformed: Client[] = allUsers.map((user) => {
      const totalValue = user.totalPrincipal;

      let clientStatus: Client['status'] = 'inactive';
      if (user.activeLoanCount > 0) clientStatus = 'active';
      else if (user.pendingLoanCount > 0) clientStatus = 'pending';
      else if (user.profileStatus === 'suspended') clientStatus = 'suspended';

      let riskLevel: Client['riskLevel'] = 'low';
      if (totalValue > 100000) riskLevel = 'high';
      else if (totalValue > 50000) riskLevel = 'medium';

      return {
        id: String(user.userId),
        fullName: user.fullName || 'Unknown',
        email: user.email || `user-${String(user.userId).slice(0, 8)}@example.invalid`,
        phone: user.phone,
        address: user.address,
        status: clientStatus,
        joinedAt: user.joinedAt ? new Date(user.joinedAt).toISOString() : new Date().toISOString(),
        totalLoans: user.loanCount,
        totalValue,
        lastActivity: user.latestActivity
          ? new Date(user.latestActivity).toISOString()
          : new Date().toISOString(),
        riskLevel,
        isPremium: totalValue > 50000,
        kycStatus: (user.kycStatus as Client['kycStatus']) ?? 'pending',
      };
    });

    let filtered = transformed;
    if (status !== 'all') filtered = filtered.filter((c) => c.status === status);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    filtered.sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
    return filtered;
  }, [allUsers, status, searchTerm]);

  const refetch = () => {};
  return { clients, loading, error, refetch };
};
