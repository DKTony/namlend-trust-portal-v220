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
  const allUsers = useQuery(api.users.listUsers, { role: 'client' });
  const allLoans = useQuery(api.loans.adminListLoans, {});

  const loading = allUsers === undefined;
  const error: string | null = null;

  const clients = useMemo(() => {
    if (!allUsers) return [];
    const loans = allLoans ?? [];

    const transformed: Client[] = allUsers.map((user) => {
      const userLoans = loans.filter((l) => String(l.userId) === String(user._id));
      const totalValue = userLoans.reduce((s, l) => s + (l.amount ?? 0), 0);
      const activeLoans = userLoans.filter((l) =>
        ['approved', 'active', 'funded', 'disbursed'].includes(l.status)
      );

      let clientStatus: Client['status'] = 'inactive';
      if (activeLoans.length > 0) clientStatus = 'active';
      else if (userLoans.some((l) => l.status === 'submitted' || l.status === 'under_review'))
        clientStatus = 'pending';

      let riskLevel: Client['riskLevel'] = 'low';
      if (totalValue > 100000) riskLevel = 'high';
      else if (totalValue > 50000) riskLevel = 'medium';

      return {
        id: String(user._id),
        fullName: user.fullName || 'Unknown',
        email: user.email || `user-${String(user._id).slice(0, 8)}@namlend.com`,
        phone: user.phone,
        address: undefined,
        status: clientStatus,
        joinedAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        totalLoans: userLoans.length,
        totalValue,
        lastActivity: user.updatedAt
          ? new Date(user.updatedAt).toISOString()
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
  }, [allUsers, allLoans, status, searchTerm]);

  const refetch = () => {};
  return { clients, loading, error, refetch };
};
