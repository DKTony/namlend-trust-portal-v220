import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  const mockUsers: User[] = [
    {
      id: 'user-1',
      fullName: 'John Doe',
      email: 'john.doe@namlend.com',
      phone: '+264 81 123 4567',
      role: 'loan_officer',
      status: 'active',
      isVerified: true,
      lastLogin: '2024-01-15T10:30:00Z',
      createdAt: '2023-06-01T09:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      department: 'Loan Operations',
      loginCount: 245
    },
    {
      id: 'user-2',
      fullName: 'Jane Smith',
      email: 'jane.smith@namlend.com',
      phone: '+264 81 234 5678',
      role: 'admin',
      status: 'active',
      isVerified: true,
      lastLogin: '2024-01-15T14:20:00Z',
      createdAt: '2023-05-15T08:00:00Z',
      updatedAt: '2024-01-15T14:20:00Z',
      department: 'Administration',
      loginCount: 892
    },
    {
      id: 'user-3',
      fullName: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'client',
      status: 'suspended',
      isVerified: false,
      lastLogin: '2024-01-10T16:45:00Z',
      createdAt: '2023-12-01T10:00:00Z',
      updatedAt: '2024-01-12T09:15:00Z',
      loginCount: 23
    },
    {
      id: 'user-4',
      fullName: 'Alice Wilson',
      email: 'alice.wilson@namlend.com',
      phone: '+264 81 345 6789',
      role: 'support',
      status: 'active',
      isVerified: true,
      lastLogin: '2024-01-15T12:00:00Z',
      createdAt: '2023-08-20T11:30:00Z',
      updatedAt: '2024-01-15T12:00:00Z',
      department: 'Customer Support',
      loginCount: 156
    }
  ];

  const mockRoles: Role[] = [
    {
      id: 'role-1',
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full system access with all administrative privileges',
      isSystem: true,
      isActive: true,
      userCount: 3,
      permissions: ['user_management', 'loan_processing', 'financial_reports', 'system_settings', 'audit_logs'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    },
    {
      id: 'role-2',
      name: 'loan_officer',
      displayName: 'Loan Officer',
      description: 'Loan processing and client management capabilities',
      isSystem: true,
      isActive: true,
      userCount: 12,
      permissions: ['loan_processing', 'client_management', 'payment_processing', 'basic_reports'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-06-15T10:00:00Z'
    },
    {
      id: 'role-3',
      name: 'client',
      displayName: 'Client',
      description: 'Basic client access to personal account and loan information',
      isSystem: true,
      isActive: true,
      userCount: 1250,
      permissions: ['view_profile', 'view_loans', 'make_payments', 'upload_documents'],
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    },
    {
      id: 'role-4',
      name: 'support',
      displayName: 'Support Agent',
      description: 'Customer support and basic client assistance',
      isSystem: false,
      isActive: true,
      userCount: 8,
      permissions: ['client_support', 'view_client_info', 'basic_reports', 'ticket_management'],
      createdAt: '2023-03-01T00:00:00Z',
      updatedAt: '2023-09-20T14:30:00Z'
    }
  ];

  const mockPermissions: Permission[] = [
    {
      id: 'perm-1',
      name: 'user_management',
      displayName: 'User Management',
      description: 'Create, edit, and manage user accounts',
      category: 'Administration',
      riskLevel: 'high',
      isSystem: true
    },
    {
      id: 'perm-2',
      name: 'loan_processing',
      displayName: 'Loan Processing',
      description: 'Process loan applications and approvals',
      category: 'Loans',
      riskLevel: 'medium',
      isSystem: true
    },
    {
      id: 'perm-3',
      name: 'financial_reports',
      displayName: 'Financial Reports',
      description: 'Access financial reports and analytics',
      category: 'Reports',
      riskLevel: 'medium',
      isSystem: true
    },
    {
      id: 'perm-4',
      name: 'system_settings',
      displayName: 'System Settings',
      description: 'Modify system configuration and settings',
      category: 'Administration',
      riskLevel: 'critical',
      isSystem: true
    },
    {
      id: 'perm-5',
      name: 'audit_logs',
      displayName: 'Audit Logs',
      description: 'View system audit logs and user activity',
      category: 'Security',
      riskLevel: 'high',
      isSystem: true
    },
    {
      id: 'perm-6',
      name: 'client_management',
      displayName: 'Client Management',
      description: 'Manage client accounts and information',
      category: 'Clients',
      riskLevel: 'medium',
      isSystem: true
    },
    {
      id: 'perm-7',
      name: 'payment_processing',
      displayName: 'Payment Processing',
      description: 'Process and manage loan payments',
      category: 'Payments',
      riskLevel: 'medium',
      isSystem: true
    },
    {
      id: 'perm-8',
      name: 'basic_reports',
      displayName: 'Basic Reports',
      description: 'Access basic reporting functionality',
      category: 'Reports',
      riskLevel: 'low',
      isSystem: true
    },
    {
      id: 'perm-9',
      name: 'view_profile',
      displayName: 'View Profile',
      description: 'View own profile information',
      category: 'Profile',
      riskLevel: 'low',
      isSystem: true
    },
    {
      id: 'perm-10',
      name: 'view_loans',
      displayName: 'View Loans',
      description: 'View own loan information',
      category: 'Loans',
      riskLevel: 'low',
      isSystem: true
    }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load users from Supabase profiles with embedded role
      const { data, error } = await supabase
        .from('profiles_with_roles')
        .select(`
          user_id,
          first_name,
          last_name,
          phone_number,
          verified,
          created_at,
          updated_at,
          last_login,
          email,
          role
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: User[] = (data || []).map((row: any) => ({
        id: row.user_id,
        fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown User',
        email: row.email || 'No email',
        phone: row.phone_number ?? undefined,
        role: (row?.role as User['role']) || 'client',
        status: row.verified ? 'active' : 'pending',
        isVerified: !!row.verified,
        lastLogin: row.last_login || row.updated_at || row.created_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        department: undefined,
        loginCount: 0
      }));

      setUsers(mapped);

      // Build role summaries based on allowed app roles
      const roleCounts = {
        admin: mapped.filter(u => u.role === 'admin').length,
        loan_officer: mapped.filter(u => u.role === 'loan_officer').length,
        client: mapped.filter(u => u.role === 'client').length
      } as const;

      setRoles([
        {
          id: 'role-admin',
          name: 'admin',
          displayName: 'Administrator',
          description: 'Full administrative access',
          isSystem: true,
          isActive: true,
          userCount: roleCounts.admin,
          permissions: ['user_management', 'system_settings', 'audit_logs', 'loan_processing'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'role-loan_officer',
          name: 'loan_officer',
          displayName: 'Loan Officer',
          description: 'Loan processing and client management',
          isSystem: true,
          isActive: true,
          userCount: roleCounts.loan_officer,
          permissions: ['loan_processing', 'client_management', 'basic_reports'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'role-client',
          name: 'client',
          displayName: 'Client',
          description: 'Client access',
          isSystem: true,
          isActive: true,
          userCount: roleCounts.client,
          permissions: ['view_profile', 'view_loans', 'upload_documents'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);

      // Keep existing mock permissions for now (no permissions table)
      setPermissions(mockPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user management data');
      // Fallback to mocks to keep UI operational
      setUsers(mockUsers);
      setRoles(mockRoles);
      setPermissions(mockPermissions);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchData();
  };

  const createUser = async (userData: Partial<User>) => {
    try {
      // TODO: Implement actual user creation
      const newUser: User = {
        id: `user-${Date.now()}`,
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone,
        role: userData.role || 'client',
        status: userData.status || 'pending',
        isVerified: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        department: userData.department,
        loginCount: 0
      };

      setUsers(prev => [...prev, newUser]);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    try {
      // TODO: Implement actual user update
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, ...updates, updatedAt: new Date().toISOString() }
          : user
      ));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // TODO: Implement actual user deletion
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      // Resolve to actual app role name
      const role = roles.find(r => r.id === roleId) || roles.find(r => r.name === roleId);
      const targetRole = (role?.name ?? roleId) as 'admin' | 'loan_officer' | 'client' | 'support';

      if (!['admin', 'loan_officer', 'client'].includes(targetRole)) {
        throw new Error('Unsupported role for assignment');
      }

      const { error } = await supabase.functions.invoke('admin-assign-role', {
        body: {
          target_user_id: userId,
          target_role: targetRole as 'admin' | 'loan_officer' | 'client'
        }
      });

      if (error) throw error;

      // Update local state on success
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: targetRole as User['role'], updatedAt: new Date().toISOString() }
          : user
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign role';
      setError(message);
      throw new Error(message);
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    // Normalize removal by assigning the default 'client' role
    await assignRole(userId, 'client');
  };

  const createRole = async (roleData: Partial<Role>) => {
    try {
      // TODO: Implement actual role creation
      const newRole: Role = {
        id: `role-${Date.now()}`,
        name: roleData.name || '',
        displayName: roleData.displayName || '',
        description: roleData.description || '',
        isSystem: false,
        isActive: true,
        userCount: 0,
        permissions: roleData.permissions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setRoles(prev => [...prev, newRole]);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create role');
    }
  };

  const updateRole = async (roleId: string, updates: Partial<Role>) => {
    try {
      // TODO: Implement actual role update
      setRoles(prev => prev.map(role => 
        role.id === roleId 
          ? { ...role, ...updates, updatedAt: new Date().toISOString() }
          : role
      ));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      // TODO: Implement actual role deletion
      const role = roles.find(r => r.id === roleId);
      if (role?.isSystem) {
        throw new Error('Cannot delete system roles');
      }
      setRoles(prev => prev.filter(role => role.id !== roleId));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    deleteRole
  };
};

// TODO: Implement actual Supabase integration
/*
Example Supabase implementation:

import { supabase } from '@/integrations/supabase/client';

const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      user_roles(role),
      user_login_logs(created_at)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

const fetchRoles = async () => {
  const { data, error } = await supabase
    .from('roles')
    .select(`
      *,
      role_permissions(permission),
      user_roles(user_id)
    `);

  if (error) throw error;
  return data;
};

const fetchPermissions = async () => {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw error;
  return data;
};
*/
