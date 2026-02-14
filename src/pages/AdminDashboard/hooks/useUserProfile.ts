import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Helper to get permissions based on role
const getRolePermissions = (role: string): string[] => {
  switch (role) {
    case 'admin':
      return ['user_management', 'loan_approval', 'system_admin', 'financial_reports', 'audit_logs'];
    case 'loan_officer':
      return ['loan_processing', 'client_management', 'payment_processing', 'basic_reports'];
    case 'support':
      return ['client_support', 'ticket_management', 'basic_reports'];
    case 'client':
    default:
      return ['profile_view', 'loan_application', 'payment_history'];
  }
};

// Helper to get department based on role
const getDepartmentByRole = (role: string): string => {
  switch (role) {
    case 'admin': return 'Administration';
    case 'loan_officer': return 'Lending';
    case 'support': return 'Customer Support';
    default: return 'N/A';
  }
};

export const useUserProfile = (userId: string): UseUserProfileReturn => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile with roles from the view
      const { data: profile, error: profileError } = await supabase
        .from('profiles_with_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error('User not found');
      }

      // Get login count from view_logs (approximate)
      const { count: loginCount } = await supabase
        .from('view_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const userData: UserData = {
        id: profile.user_id,
        fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
        email: profile.email || 'No email',
        phone: profile.phone_number,
        role: (profile.primary_role as UserData['role']) || 'client',
        status: profile.verified ? 'active' : 'pending',
        isVerified: profile.verified || false,
        lastLogin: profile.last_login || profile.updated_at || profile.created_at,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at || profile.created_at,
        permissions: getRolePermissions(profile.primary_role || 'client'),
        loginCount: loginCount || 0,
        department: getDepartmentByRole(profile.primary_role || 'client'),
        notes: ''
      };

      setUser(userData);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<UserData>): Promise<boolean> => {
    if (!userId || !user) return false;

    try {
      // Update profile in database
      const profileUpdates: Record<string, string | boolean> = {};
      
      if (updates.fullName) {
        const nameParts = updates.fullName.split(' ');
        profileUpdates.first_name = nameParts[0] || '';
        profileUpdates.last_name = nameParts.slice(1).join(' ') || '';
      }
      if (updates.phone !== undefined) profileUpdates.phone_number = updates.phone;
      if (updates.isVerified !== undefined) profileUpdates.verified = updates.isVerified;
      profileUpdates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
      return false;
    }
  };

  const suspendUser = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Update user to suspended (set verified to false)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          verified: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Update local state
      setUser(prev => prev ? { ...prev, status: 'suspended', isVerified: false } : null);
      return true;
    } catch (err) {
      console.error('Error suspending user:', err);
      setError(err instanceof Error ? err.message : 'Failed to suspend user');
      return false;
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
    refetch,
    updateUser,
    suspendUser
  };
};
