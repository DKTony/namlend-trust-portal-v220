import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProfilesWithRoles } from '@/services/adminService';

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

// Mock data for development
const mockUsers: User[] = [
  {
    id: '1',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+264 81 123 4567',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-01-15T10:30:00Z',
    createdAt: '2023-06-15T08:00:00Z',
    kycStatus: 'verified',
    location: 'Windhoek, Namibia',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
    permissions: ['user_management', 'loan_approval', 'system_admin', 'financial_reports'],
    isVerified: true,
    loginCount: 156,
    department: 'Administration'
  },
  {
    id: '2',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+264 81 234 5678',
    role: 'loan_officer',
    status: 'active',
    lastLogin: '2024-01-14T16:45:00Z',
    createdAt: '2023-08-20T09:15:00Z',
    kycStatus: 'verified',
    location: 'Swakopmund, Namibia',
    permissions: ['loan_approval', 'client_management', 'kyc_verification'],
    isVerified: true,
    loginCount: 89,
    department: 'Lending'
  },
  {
    id: '3',
    fullName: 'Michael Brown',
    email: 'michael.brown@example.com',
    phone: '+264 81 345 6789',
    role: 'client',
    status: 'active',
    lastLogin: '2024-01-13T14:20:00Z',
    createdAt: '2023-09-10T11:30:00Z',
    kycStatus: 'pending',
    location: 'Walvis Bay, Namibia',
    permissions: ['profile_view', 'loan_application'],
    isVerified: false,
    loginCount: 23,
    department: 'N/A'
  },
  {
    id: '4',
    fullName: 'Emily Davis',
    email: 'emily.davis@example.com',
    phone: '+264 81 456 7890',
    role: 'support',
    status: 'inactive',
    lastLogin: '2024-01-10T09:15:00Z',
    createdAt: '2023-10-05T13:45:00Z',
    kycStatus: 'verified',
    location: 'Oshakati, Namibia',
    permissions: ['client_support', 'ticket_management'],
    isVerified: true,
    loginCount: 67,
    department: 'Customer Support'
  },
  {
    id: '5',
    fullName: 'David Wilson',
    email: 'david.wilson@example.com',
    phone: '+264 81 567 8901',
    role: 'client',
    status: 'suspended',
    lastLogin: '2024-01-08T12:00:00Z',
    createdAt: '2023-11-12T10:20:00Z',
    kycStatus: 'rejected',
    location: 'Rundu, Namibia',
    permissions: [],
    isVerified: false,
    loginCount: 12,
    department: 'N/A'
  }
];

// Helper functions for role-based data
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
    case 'client':
    default:
      return 'N/A';
  }
};

export const useUsersList = (): UseUsersListReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch real users from Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Prefer service layer (RPC under the hood) with fallback to view if needed
        let usersData: any[] | null = null;
        let usersError: any = null;

        const svc = await getProfilesWithRoles({});
        if (svc.success && svc.results) {
          usersData = svc.results as any[];
        } else {
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
              primary_role,
              roles,
              is_admin,
              is_loan_officer,
              is_client
            `);
          usersData = data as any[] | null;
          usersError = error as any;
        }

        if (usersError) {
          console.error('Error fetching users:', usersError);
          // Fallback to mock data on error
          setUsers(mockUsers);
          setError('Using mock data - database connection issue');
        } else if (usersData) {
          // Transform Supabase data to match our User interface
          const transformedUsers: User[] = usersData.map((profile: any) => ({
            id: profile.user_id,
            fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
            email: profile.email || 'No email',
            phone: profile.phone_number,
            role: profile.primary_role || 'client',
            status: profile.verified ? 'active' : 'pending',
            lastLogin: profile.last_login || profile.updated_at || profile.created_at,
            createdAt: profile.created_at,
            kycStatus: profile.verified ? 'verified' : 'pending',
            location: 'Namibia', // Default location
            permissions: getRolePermissions(profile.primary_role || 'client'),
            isVerified: profile.verified || false,
            loginCount: Math.floor(Math.random() * 100) + 1, // Mock login count
            department: getDepartmentByRole(profile.primary_role || 'client')
          }));
          
          setUsers(transformedUsers);
          setError(null);
        } else {
          // No data returned, use mock data
          setUsers(mockUsers);
          setError('No users found - using mock data');
        }
      } catch (err) {
        console.error('Unexpected error fetching users:', err);
        setUsers(mockUsers);
        setError('Failed to fetch users - using mock data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const refreshUsers = async () => {
    setLoading(true);
    try {
      // Re-fetch users from Supabase
      let usersData: any[] | null = null;
      let usersError: any = null;

      const svc = await getProfilesWithRoles({});
      if (svc.success && svc.results) {
        usersData = svc.results as any[];
      } else {
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
            primary_role,
            roles,
            is_admin,
            is_loan_officer,
            is_client
          `);
        usersData = data as any[] | null;
        usersError = error as any;
      }

      if (usersError) {
        console.error('Error refreshing users:', usersError);
        setError('Failed to refresh users');
      } else if (usersData) {
        const transformedUsers: User[] = usersData.map((profile: any) => ({
          id: profile.user_id,
          fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
          email: profile.email || 'No email',
          phone: profile.phone_number,
          role: profile.primary_role || 'client',
          status: profile.verified ? 'active' : 'pending',
          lastLogin: profile.last_login || profile.updated_at || profile.created_at,
          createdAt: profile.created_at,
          kycStatus: profile.verified ? 'verified' : 'pending',
          location: 'Namibia',
          permissions: getRolePermissions(profile.primary_role || 'client'),
          isVerified: profile.verified || false,
          loginCount: Math.floor(Math.random() * 100) + 1,
          department: getDepartmentByRole(profile.primary_role || 'client')
        }));
        
        setUsers(transformedUsers);
        setError(null);
      }
    } catch (err) {
      console.error('Unexpected error refreshing users:', err);
      setError('Failed to refresh users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete user profile (this will cascade to related records due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw new Error('Failed to delete user from database');
      }

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      console.log('User deleted successfully:', userId);
    } catch (err) {
      console.error('Delete user error:', err);
      setError('Failed to delete user');
      throw err;
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      // Update user verification status in profiles table
      const isActive = status === 'active';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          verified: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user status:', updateError);
        throw new Error('Failed to update user status in database');
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, status: status as User['status'], isVerified: isActive }
          : user
      ));
      console.log('User status updated successfully:', userId, status);
    } catch (err) {
      console.error('Update user status error:', err);
      setError('Failed to update user status');
      throw err;
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
    updateUserStatus
  };
};
