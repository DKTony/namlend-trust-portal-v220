import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'loan_officer' | 'client' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  isVerified: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  loginCount: number;
  department?: string;
  address?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  notes?: string;
}

interface UseUserProfileReturn {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateUser: (updates: Partial<UserData>) => Promise<boolean>;
  suspendUser: () => Promise<boolean>;
}

const getRolePermissions = (role: string): string[] => {
  switch (role) {
    case 'admin':
      return [
        'user_management',
        'loan_approval',
        'system_admin',
        'financial_reports',
        'audit_logs',
      ];
    case 'loan_officer':
      return ['loan_processing', 'client_management', 'payment_processing', 'basic_reports'];
    case 'support':
      return ['client_support', 'ticket_management', 'basic_reports'];
    case 'client':
    default:
      return ['profile_view', 'loan_application', 'payment_history'];
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

export const useUserProfile = (userId: string): UseUserProfileReturn => {
  const [error, setError] = useState<string | null>(null);

  // Convex reactive query for user profile
  const rawProfile = useQuery(
    api.users.getUserProfile,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );

  // Role lives in userRoles table, not profiles
  const rawRole = useQuery(
    api.users.getUserRole,
    userId ? { userId: userId as Id<'users'> } : 'skip'
  );

  const loading = userId ? rawProfile === undefined || rawRole === undefined : false;

  const role = ((rawRole as string | undefined) ?? 'client') as UserData['role'];

  const user: UserData | null = rawProfile
    ? {
        id: String(rawProfile._id),
        fullName: rawProfile.fullName || 'Unknown User',
        email: rawProfile.email || 'No email',
        phone: rawProfile.phone,
        role,
        status: 'active',
        isVerified: true,
        lastLogin: rawProfile.updatedAt
          ? new Date(rawProfile.updatedAt).toISOString()
          : new Date().toISOString(),
        createdAt: rawProfile.createdAt
          ? new Date(rawProfile.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: rawProfile.updatedAt
          ? new Date(rawProfile.updatedAt).toISOString()
          : new Date().toISOString(),
        permissions: getRolePermissions(role),
        loginCount: 0,
        department: getDepartmentByRole(role),
        notes: '',
      }
    : null;

  const adminUpdateProfileMutation = useMutation(api.users.adminUpdateProfile);
  const assignRoleMutation = useMutation(api.users.assignRole);

  const updateUser = async (updates: Partial<UserData & { role: string }>): Promise<boolean> => {
    try {
      setError(null);
      const targetUserId = userId as Id<'users'>;

      const profileUpdates: { fullName?: string; phone?: string } = {};
      if (updates.fullName !== undefined) profileUpdates.fullName = updates.fullName;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;

      if (Object.keys(profileUpdates).length > 0) {
        await adminUpdateProfileMutation({ targetUserId, ...profileUpdates });
      }

      if (updates.role && updates.role !== user?.role) {
        const validRoles = ['client', 'loan_officer', 'admin'] as const;
        const newRole = validRoles.includes(updates.role as (typeof validRoles)[number])
          ? (updates.role as (typeof validRoles)[number])
          : 'client';
        await assignRoleMutation({ targetUserId, role: newRole });
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user';
      setError(msg);
      return false;
    }
  };

  const suspendUser = async (): Promise<boolean> => {
    try {
      setError(null);
      await assignRoleMutation({ targetUserId: userId as Id<'users'>, role: 'client' });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to suspend user';
      setError(msg);
      return false;
    }
  };

  const refetch = () => {};

  return { user, loading, error, refetch, updateUser, suspendUser };
};
