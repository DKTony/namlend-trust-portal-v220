import { useState, useEffect } from 'react';

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
}

export const useUserProfile = (userId: string): UseUserProfileReturn => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual Supabase query
      // For now, return mock data based on userId
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      const mockUser: UserData = {
        id: userId,
        fullName: `User ${userId.slice(0, 8)}`,
        email: `user.${userId.slice(0, 8)}@namlend.com`,
        phone: '+264 81 123 4567',
        role: 'loan_officer',
        status: 'active',
        isVerified: true,
        lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['loan_processing', 'client_management', 'payment_processing', 'basic_reports'],
        loginCount: Math.floor(Math.random() * 500) + 50,
        department: 'Loan Operations',
        address: '123 Independence Ave, Windhoek, Namibia',
        dateOfBirth: '1985-03-15',
        emergencyContact: '+264 81 987 6543',
        notes: 'Active user with good performance record.'
      };

      setUser(mockUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchUserProfile();
  };

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  return {
    user,
    loading,
    error,
    refetch
  };
};

// TODO: Implement actual Supabase integration
/*
Example Supabase implementation:

import { supabase } from '@/integrations/supabase/client';

export const useUserProfile = (userId: string): UseUserProfileReturn => {
  // ... existing state

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Fetch user permissions
      const { data: permissions, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('permission')
        .in('role', userRoles.map(ur => ur.role));

      if (permissionsError) throw permissionsError;

      // Fetch login statistics
      const { data: loginStats, error: statsError } = await supabase
        .from('user_login_logs')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (statsError) throw statsError;

      const userData: UserData = {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: userRoles[0]?.role || 'client',
        status: profile.status,
        isVerified: profile.email_verified,
        lastLogin: loginStats[0]?.created_at || profile.created_at,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        permissions: permissions.map(p => p.permission),
        loginCount: await getLoginCount(userId),
        department: profile.department,
        address: profile.address,
        dateOfBirth: profile.date_of_birth,
        emergencyContact: profile.emergency_contact,
        notes: profile.notes
      };

      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of implementation
};

const getLoginCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('user_login_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count || 0;
};
*/
