import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callRpc } from '@/utils/rpc';
import { getProfile } from '@/services/clientService';

interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinedAt: string;
  totalValue: number;
  activeLoans: number;
  creditScore: number;
  totalBorrowed: number;
  totalRepaid: number;
  outstandingBalance: number;
  monthlyIncome: number;
  riskLevel: 'low' | 'medium' | 'high';
  isPremium: boolean;
  kycStatus: 'verified' | 'pending' | 'rejected';
  kycSource: 'RPC' | 'Derived';
}

export const useClientProfile = (clientId: string) => {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch client profile via service (enforces live schema safety)
        const profileResp = await getProfile({ userId: clientId });
        if (!profileResp.success || !profileResp.profile) {
          throw new Error(profileResp.error || 'Profile not found');
        }
        const profile = profileResp.profile as any;

        // Fetch client's loans
        const { data: loans, error: loansError } = await supabase
          .from('loans')
          .select('*')
          .eq('user_id', clientId);

        if (loansError) throw loansError;

        // Fetch client's payments via loan relationship (payments -> loans)
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            loans!inner(user_id)
          `)
          .eq('loans.user_id', clientId);

        if (paymentsError) throw paymentsError;

        // Prefer admin eligibility RPC, with graceful fallback to documents model
        let kycStatus: 'verified' | 'pending' | 'rejected' = 'pending';
        let kycSource: 'RPC' | 'Derived' = 'Derived';
        
        const rpcResult = await callRpc('check_loan_eligibility_admin', { target_user_id: clientId }, { timeoutMs: 2500, retries: 1 });
        
        if (rpcResult.ok) {
          const elig = Array.isArray(rpcResult.data) ? rpcResult.data?.[0] : rpcResult.data;
          if (elig) {
            kycStatus = elig.eligible ? 'verified' : 'pending';
            kycSource = 'RPC';
          }
        }

        if (kycStatus === 'pending') {
          // Derive KYC status from document_verification_requirements
          const { data: docReqs, error: docReqError } = await supabase
            .from('document_verification_requirements')
            .select('is_required,is_verified,is_submitted,rejection_reason')
            .eq('user_id', clientId);

          if (!docReqError && (docReqs?.length || 0) > 0) {
            const required = docReqs!.filter(d => d.is_required);
            const anyRejected = docReqs!.some(d => !!d.rejection_reason);
            const allVerified = required.length > 0 && required.every(d => d.is_verified);
            if (anyRejected) kycStatus = 'rejected';
            else if (allVerified) kycStatus = 'verified';
            else kycStatus = 'pending';
          } else {
            const { data: kycDoc, error: kycError } = await supabase
              .from('kyc_documents')
              .select('status')
              .eq('user_id', clientId)
              .maybeSingle();
            if (!kycError && kycDoc?.status === 'verified') kycStatus = 'verified';
            else if (!kycError && kycDoc?.status === 'rejected') kycStatus = 'rejected';
          }
        }

        // Calculate metrics
        const totalBorrowed = loans?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;
        const totalRepaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        const outstandingBalance = totalBorrowed - totalRepaid;
        
        const activeLoans = loans?.filter(loan => 
          ['approved', 'active', 'disbursed'].includes(loan.status)
        ).length || 0;

        // Calculate credit score (simplified algorithm)
        let creditScore = 650; // Base score
        if (totalRepaid > 0) {
          const repaymentRatio = totalRepaid / totalBorrowed;
          creditScore += Math.floor(repaymentRatio * 150); // Up to 150 points for good repayment
        }
        if (loans?.some(loan => loan.status === 'overdue')) {
          creditScore -= 100; // Penalty for overdue loans
        }
        creditScore = Math.max(300, Math.min(850, creditScore)); // Clamp between 300-850

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (outstandingBalance > 100000 || creditScore < 500) {
          riskLevel = 'high';
        } else if (outstandingBalance > 50000 || creditScore < 600) {
          riskLevel = 'medium';
        }

        // Determine status
        let status: 'active' | 'inactive' | 'suspended' | 'pending' = 'inactive';
        if (activeLoans > 0) {
          status = 'active';
        } else if (loans?.some(loan => loan.status === 'pending')) {
          status = 'pending';
        }

        // Try to fetch email from auth.users via service role or fallback
        let email: string = '';
        try {
          const { data: viewRow } = await supabase
            .from('profiles_with_roles')
            .select('email')
            .eq('user_id', clientId)
            .maybeSingle();
          email = viewRow?.email || '';
        } catch (e) {
          // Fallback: profiles_with_roles view may not exist, use a placeholder
          console.warn('profiles_with_roles view not available, using placeholder email');
          email = 'user@namlend.com';
        }

        const clientProfile: ClientProfile = {
          id: profile.user_id,
          fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
          email,
          phone: profile.phone_number,
          address: profile.address_line1 || undefined,
          dateOfBirth: profile.date_of_birth,
          status,
          joinedAt: profile.created_at || new Date().toISOString(),
          totalValue: totalBorrowed,
          activeLoans,
          creditScore,
          totalBorrowed,
          totalRepaid,
          outstandingBalance,
          monthlyIncome: profile.monthly_income || 0,
          riskLevel,
          isPremium: totalBorrowed > 50000,
          kycStatus,
          kycSource
        };

        setClient(clientProfile);
      } catch (err) {
        console.error('Error fetching client profile:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch client profile';
        console.error('Detailed error for client', clientId, ':', errorMessage);
        setError(`Failed to load client profile: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClientProfile();
    }
  }, [clientId]);

  return { client, loading, error };
};
