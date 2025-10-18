import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Feature flag for unified view (set to false to rollback to legacy queries)
const USE_UNIFIED_VIEW = true;

interface LoanApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  submittedAt: string;
  riskScore?: number;
  monthlyIncome?: number;
  employmentStatus?: string;
  creditScore?: number;
  source?: 'loan' | 'approval';
}

interface UseLoanApplicationsParams {
  status: 'pending' | 'approved' | 'rejected' | 'all';
  searchTerm: string;
  // Enhanced filters
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  priority?: string;
  // Realtime refresh trigger
  refreshKey?: number;
}

export const useLoanApplications = ({
  status,
  searchTerm,
  dateFrom,
  dateTo,
  amountMin,
  amountMax,
  priority,
  refreshKey
}: UseLoanApplicationsParams) => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      let transformedApplications: LoanApplication[] = [];

      // Use unified view if feature flag is enabled
      if (USE_UNIFIED_VIEW) {
        transformedApplications = await fetchFromUnifiedView();
      } else {
        // Legacy path: separate queries for approvals and loans
        transformedApplications = await fetchLegacy();
      }

      // Apply all filters
      let filteredApplications = applyFilters(transformedApplications);

      setApplications(filteredApplications);
    } catch (err) {
      console.error('Error in fetchApplications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromUnifiedView = async (): Promise<LoanApplication[]> => {
    // Query unified view
    let query = supabase
      .from('loan_applications_unified')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status === 'pending') {
      query = query.in('status', ['pending', 'under_review']);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error: viewError } = await query;

    if (viewError) {
      console.error('Error fetching from unified view:', viewError);
      throw new Error('Failed to fetch loan applications from unified view');
    }

    // Transform unified view data to LoanApplication interface
    return (data || []).map((row: any) => ({
      id: row.id,
      applicantName: row.applicant_name || 'Unknown',
      applicantEmail: row.applicant_email || `user-${row.user_id?.slice(0, 8)}@namlend.com`,
      amount: row.amount || 0,
      purpose: row.purpose || 'Not specified',
      status: row.status as LoanApplication['status'],
      submittedAt: row.created_at,
      source: row.source as 'loan' | 'approval',
      employmentStatus: row.employment_status || 'Not specified',
      monthlyIncome: row.monthly_income || 0,
      // Mock data (TODO: add to view or remove)
      riskScore: Math.floor(Math.random() * 100),
      creditScore: Math.floor(Math.random() * 300) + 500
    }));
  };

  const fetchLegacy = async (): Promise<LoanApplication[]> => {
    let transformedApplications: LoanApplication[] = [];
    
    if (status === 'pending') {
        // Pending applications live in approval workflow until approved. Pull from approval_requests_expanded
        const { data: requests, error: reqError } = await supabase
          .from('approval_requests_expanded')
          .select('id, user_id, request_type, status, request_data, created_at, user_first_name, user_last_name')
          .eq('request_type', 'loan_application')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (reqError) {
          console.error('Error fetching pending loan applications from approvals:', reqError);
          throw new Error('Failed to fetch pending loan applications');
        }

        // Fetch employment status from profiles for pending applications
        const userIds = (requests || []).map(r => r.user_id).filter(Boolean);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, employment_status, monthly_income')
          .in('user_id', userIds);

        if (profilesError) {
          console.warn('Error fetching profiles for pending applications:', profilesError);
        }

        const profilesMap = new Map();
        profiles?.forEach((profile: any) => {
          profilesMap.set(profile.user_id, profile);
        });

        transformedApplications = (requests || []).map((r: any) => {
          const amount = Number(r.request_data?.amount ?? 0) || 0;
          const purpose = r.request_data?.purpose || r.request_data?.loan_purpose || 'Not specified';
          const first = r.user_first_name || '';
          const last = r.user_last_name || '';
          const name = `${first} ${last}`.trim() || 'Unknown';
          const profile = profilesMap.get(r.user_id);
          return {
            id: r.id, // approval request id acts as application id during pending
            applicantName: name,
            applicantEmail: `user-${r.user_id?.slice(0,8)}@namlend.com`,
            amount,
            purpose,
            status: 'pending',
            submittedAt: r.created_at,
            source: 'approval',
            // Real data from profiles
            employmentStatus: profile?.employment_status || 'Not specified',
            monthlyIncome: profile?.monthly_income || 0,
            // Keep mocked extras for UI badges (TODO: replace with real data)
            riskScore: Math.floor(Math.random() * 100),
            creditScore: Math.floor(Math.random() * 300) + 500
          };
        });
      } else {
        // Build query based on status filter from loans table
        let loansQuery = supabase
          .from('loans')
          .select('id, amount, purpose, status, created_at, user_id')
          .order('created_at', { ascending: false });

        if (status !== 'all') {
          loansQuery = loansQuery.eq('status', status);
        }

        const { data: loans, error: loansError } = await loansQuery;
        if (loansError) {
          console.error('Error fetching loans:', loansError);
          throw new Error('Failed to fetch loan applications');
        }

        // Fetch profiles with employment status
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, employment_status, monthly_income');
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw new Error('Failed to fetch user profiles');
        }

        // Create a map of profiles for quick lookup
        const profilesMap = new Map();
        profiles?.forEach((profile: any) => {
          profilesMap.set(profile.user_id, profile);
        });

        // Transform data to match interface
        transformedApplications = (loans || []).map((loan: any) => {
          const profile = profilesMap.get(loan.user_id);
          return {
            id: loan.id,
            applicantName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
            applicantEmail: `user-${loan.user_id?.slice(0, 8)}@namlend.com`,
            amount: loan.amount || 0,
            purpose: loan.purpose || 'Not specified',
            status: loan.status as LoanApplication['status'],
            submittedAt: loan.created_at,
            source: 'loan',
            // Real data from profiles
            employmentStatus: profile?.employment_status || 'Not specified',
            monthlyIncome: profile?.monthly_income || 0,
            // Mock additional data for demo purposes (TODO: replace with real data)
            riskScore: Math.floor(Math.random() * 100),
            creditScore: Math.floor(Math.random() * 300) + 500
          };
        });
    }

    return transformedApplications;
  };

  const applyFilters = (applications: LoanApplication[]): LoanApplication[] => {
    let filtered = applications;
    
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.applicantName.toLowerCase().includes(searchLower) ||
        app.applicantEmail.toLowerCase().includes(searchLower) ||
        app.purpose.toLowerCase().includes(searchLower) ||
        app.id.toLowerCase().includes(searchLower) ||
        app.amount.toString().includes(searchTerm)
      );
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(app => 
        new Date(app.submittedAt) >= fromDate
      );
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(app => 
        new Date(app.submittedAt) <= toDate
      );
    }

    // Amount range filter
    if (amountMin !== undefined) {
      filtered = filtered.filter(app => app.amount >= amountMin);
    }
    if (amountMax !== undefined) {
      filtered = filtered.filter(app => app.amount <= amountMax);
    }

    // Priority filter (only for pending)
    if (priority && status === 'pending') {
      // Priority is now available from unified view for approval-sourced items
      console.log('Priority filter:', priority);
    }

    return filtered;
  };

  useEffect(() => {
    fetchApplications();
  }, [status, searchTerm, dateFrom, dateTo, amountMin, amountMax, priority, refreshKey]);

  const refetch = () => {
    fetchApplications();
  };

  return {
    applications,
    loading,
    error,
    refetch
  };
};
