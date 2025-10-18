import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch loans for each client
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*');

      if (loansError) throw loansError;

      // Fetch KYC documents
      const { data: kycDocs, error: kycError } = await supabase
        .from('kyc_documents')
        .select('user_id, status');

      if (kycError) throw kycError;

      // Transform data into Client objects
      const transformedClients: Client[] = profiles?.map(profile => {
        const userLoans = loans?.filter(loan => loan.user_id === profile.user_id) || [];
        const userKyc = kycDocs?.find(doc => doc.user_id === profile.user_id);
        
        const totalValue = userLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
        const activeLoans = userLoans.filter(loan => 
          ['approved', 'active', 'disbursed'].includes(loan.status)
        );

        // Determine client status based on activity and loan status
        let clientStatus: 'active' | 'inactive' | 'suspended' | 'pending' = 'inactive';
        if (activeLoans.length > 0) {
          clientStatus = 'active';
        } else if (userLoans.some(loan => loan.status === 'pending')) {
          clientStatus = 'pending';
        }

        // Calculate risk level based on loan history and amounts
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (totalValue > 100000) {
          riskLevel = 'high';
        } else if (totalValue > 50000 || userLoans.some(loan => loan.status === 'overdue')) {
          riskLevel = 'medium';
        }

        return {
          id: profile.user_id, // Use user_id instead of profile.id for consistency
          fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          email: `user-${profile.user_id?.slice(0, 8)}@namlend.com`,
          phone: profile.phone,
          address: profile.address,
          status: clientStatus,
          joinedAt: profile.created_at || new Date().toISOString(),
          totalLoans: userLoans.length,
          totalValue,
          lastActivity: profile.updated_at || profile.created_at || new Date().toISOString(),
          riskLevel,
          isPremium: totalValue > 50000,
          kycStatus: (userKyc?.status as 'verified' | 'pending' | 'rejected') || 'pending'
        };
      }) || [];

      // Apply filters
      let filteredClients = transformedClients;

      // Status filter
      if (status !== 'all') {
        filteredClients = filteredClients.filter(client => client.status === status);
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredClients = filteredClients.filter(client =>
          client.fullName.toLowerCase().includes(searchLower) ||
          client.email.toLowerCase().includes(searchLower) ||
          (client.id && client.id.toLowerCase().includes(searchLower))
        );
      }

      // Sort by last activity (most recent first)
      filteredClients.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );

      setClients(filteredClients);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [status, searchTerm]);

  return { clients, loading, error, refetch: fetchClients };
};
