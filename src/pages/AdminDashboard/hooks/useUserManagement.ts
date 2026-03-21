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
  isVerified: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  department?: string;
  loginCount: number;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isSystem: boolean;
}

interface UseUserManagementReturn {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createUser: (userData: Partial<User>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  assignRole: (userId: string, roleId: string) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;
  createRole: (roleData: Partial<Role>) => Promise<void>;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
}

export const useUserManagement = (): UseUserManagementReturn => {
  const rawUsers = useQuery(api.users.listUsers, {});
  const assignRoleMutation = useMutation(api.users.assignRole);
  const adminUpdateProfileMutation = useMutation(api.users.adminUpdateProfile);
  const deactivateUserMutation = useMutation(api.users.deactivateUser);
  const [error, setError] = useState<string | null>(null);

  const loading = rawUsers === undefined;

  // Static permissions list (no permissions table in Convex yet)
  const permissions: Permission[] = useMemo(
    () => [
      {
        id: 'perm-1',
        name: 'user_management',
        displayName: 'User Management',
        description: 'Create, edit, and manage user accounts',
        category: 'Administration',
        riskLevel: 'high',
        isSystem: true,
      },
      {
        id: 'perm-2',
        name: 'loan_processing',
        displayName: 'Loan Processing',
        description: 'Process loan applications and approvals',
        category: 'Loans',
        riskLevel: 'medium',
        isSystem: true,
      },
      {
        id: 'perm-3',
        name: 'financial_reports',
        displayName: 'Financial Reports',
        description: 'Access financial reports and analytics',
        category: 'Reports',
        riskLevel: 'medium',
        isSystem: true,
      },
      {
        id: 'perm-4',
        name: 'system_settings',
        displayName: 'System Settings',
        description: 'Modify system configuration and settings',
        category: 'Administration',
        riskLevel: 'critical',
        isSystem: true,
      },
      {
        id: 'perm-5',
        name: 'audit_logs',
        displayName: 'Audit Logs',
        description: 'View system audit logs and user activity',
        category: 'Security',
        riskLevel: 'high',
        isSystem: true,
      },
      {
        id: 'perm-6',
        name: 'client_management',
        displayName: 'Client Management',
        description: 'Manage client accounts and information',
        category: 'Clients',
        riskLevel: 'medium',
        isSystem: true,
      },
      {
        id: 'perm-7',
        name: 'payment_processing',
        displayName: 'Payment Processing',
        description: 'Process and manage loan payments',
        category: 'Payments',
        riskLevel: 'medium',
        isSystem: true,
      },
      {
        id: 'perm-8',
        name: 'basic_reports',
        displayName: 'Basic Reports',
        description: 'Access basic reporting functionality',
        category: 'Reports',
        riskLevel: 'low',
        isSystem: true,
      },
      {
        id: 'perm-9',
        name: 'view_profile',
        displayName: 'View Profile',
        description: 'View own profile information',
        category: 'Profile',
        riskLevel: 'low',
        isSystem: true,
      },
      {
        id: 'perm-10',
        name: 'view_loans',
        displayName: 'View Loans',
        description: 'View own loan information',
        category: 'Loans',
        riskLevel: 'low',
        isSystem: true,
      },
    ],
    []
  );

  // Transform Convex users into the User shape
  const users: User[] = useMemo(() => {
    if (!rawUsers) return [];
    return rawUsers.map((u) => ({
      id: String(u._id),
      fullName: u.fullName || 'Unknown User',
      email: u.email || 'No email',
      phone: u.phone ?? undefined,
      role: (u.role ?? 'client') as User['role'],
      status: 'active' as User['status'],
      isVerified: true,
      lastLogin: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
      department: undefined,
      loginCount: 0,
    }));
  }, [rawUsers]);

  // Build role summaries from user data
  const roles: Role[] = useMemo(() => {
    const counts = { admin: 0, loan_officer: 0, client: 0 };
    for (const u of users) {
      if (u.role in counts) counts[u.role as keyof typeof counts]++;
    }
    return [
      {
        id: 'role-admin',
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full administrative access',
        isSystem: true,
        isActive: true,
        userCount: counts.admin,
        permissions: ['user_management', 'system_settings', 'audit_logs', 'loan_processing'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'role-loan_officer',
        name: 'loan_officer',
        displayName: 'Loan Officer',
        description: 'Loan processing and client management',
        isSystem: true,
        isActive: true,
        userCount: counts.loan_officer,
        permissions: ['loan_processing', 'client_management', 'basic_reports'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'role-client',
        name: 'client',
        displayName: 'Client',
        description: 'Client access',
        isSystem: true,
        isActive: true,
        userCount: counts.client,
        permissions: ['view_profile', 'view_loans', 'upload_documents'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [users]);

  const refetch = () => {};

  const createUser = async (userData: Partial<User>) => {
    // User creation happens through Convex Auth sign-up flow
    // This stub is kept for the UI interface — actual creation requires auth enrollment
    console.warn(
      'createUser: Users are created through the auth sign-up flow, not admin panel',
      userData
    );
    throw new Error(
      'User creation is handled through the sign-up flow. Invite the user to register.'
    );
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await adminUpdateProfileMutation({
        targetUserId: userId as Id<'users'>,
        fullName: updates.fullName,
        phone: updates.phone,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
      throw new Error(message);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Soft-delete only — 7-year data retention rule
      await deactivateUserMutation({
        targetUserId: userId as Id<'users'>,
        reason: 'Deactivated by admin',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate user';
      setError(message);
      throw new Error(message);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const role = roles.find((r) => r.id === roleId) || roles.find((r) => r.name === roleId);
      const targetRole = (role?.name ?? roleId) as 'admin' | 'loan_officer' | 'client';

      if (!['admin', 'loan_officer', 'client'].includes(targetRole)) {
        throw new Error('Unsupported role for assignment');
      }

      await assignRoleMutation({
        targetUserId: userId as Id<'users'>,
        role: targetRole,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign role';
      setError(message);
      throw new Error(message);
    }
  };

  const removeRole = async (userId: string, _roleId: string) => {
    await assignRole(userId, 'client');
  };

  const createRole = async (roleData: Partial<Role>) => {
    console.warn('createRole not yet implemented for Convex', roleData);
  };

  const updateRole = async (roleId: string, updates: Partial<Role>) => {
    console.warn('updateRole not yet implemented for Convex', roleId, updates);
  };

  const deleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isSystem) throw new Error('Cannot delete system roles');
    console.warn('deleteRole not yet implemented for Convex', roleId);
  };

  return {
    users,
    roles,
    permissions,
    loading,
    error,
    refetch,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    removeRole,
    createRole,
    updateRole,
    deleteRole,
  };
};
