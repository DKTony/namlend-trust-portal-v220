import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'loan_officer' | 'client' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  kycStatus: 'verified' | 'pending' | 'rejected';
  location?: string;
  avatar?: string;
  permissions: string[];
  isVerified: boolean;
  loginCount: number;
  department?: string;
}

interface UseUsersListReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  totalUsers: number;
  filteredUsers: User[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  refreshUsers: () => void;
  deleteUser: (userId: string) => Promise<void>;
  updateUserStatus: (userId: string, status: string) => Promise<void>;
}

const getRolePermissions = (role: string): string[] => {
  switch (role) {
    case 'admin':
      return ['user_management', 'loan_approval', 'system_admin', 'financial_reports'];
    case 'loan_officer':
      return ['loan_approval', 'client_management', 'kyc_verification'];
    case 'support':
      return ['client_support', 'ticket_management'];
    case 'client':
    default:
      return ['profile_view', 'loan_application'];
  }
};

const getDepartmentByRole = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administration';
    case 'loan_officer':
      return 'Lending';
    case 'support':
      return 'Customer Support';
    default:
      return 'N/A';
  }
};

export const useUsersList = (): UseUsersListReturn => {
  const rawUsers = useQuery(api.users.listUsers, {});
  const deactivateUserMutation = useMutation(api.users.deactivateUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const loading = rawUsers === undefined;

  // Transform Convex users into the User shape
  const users: User[] = useMemo(() => {
    if (!rawUsers) return [];
    return rawUsers.map((u) => {
      const role = (u.role ?? 'client') as User['role'];
      return {
        // Must be the users-table id (u.userId), NOT the profile doc _id — this id is
        // cast to Id<'users'> by role assignment, deactivation, and status updates.
        id: String(u.userId),
        fullName: u.fullName || 'Unknown User',
        email: u.email || 'No email',
        phone: u.phone,
        role,
        status: 'active' as User['status'],
        lastLogin: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        kycStatus: (u.kycStatus ?? 'pending') as User['kycStatus'],
        location: 'Namibia',
        permissions: getRolePermissions(role),
        isVerified: u.kycStatus === 'verified',
        loginCount: 0,
        department: getDepartmentByRole(role),
      };
    });
  }, [rawUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchTerm === '' ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const refreshUsers = () => {
    // Convex queries are reactive — no manual refetch needed
  };

  const deleteUser = async (userId: string) => {
    try {
      await deactivateUserMutation({
        targetUserId: userId as Id<'users'>,
        reason: 'Deactivated by admin',
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      if (status === 'inactive' || status === 'suspended') {
        await deactivateUserMutation({
          targetUserId: userId as Id<'users'>,
          reason: `Status changed to ${status} by admin`,
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  return {
    users,
    loading,
    error,
    totalUsers: users.length,
    filteredUsers,
    searchTerm,
    setSearchTerm,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    refreshUsers,
    deleteUser,
    updateUserStatus,
  };
};
