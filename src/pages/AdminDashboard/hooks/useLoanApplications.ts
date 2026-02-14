import { useState, useEffect } from 'react';
import { loansAPI } from '@/services/api-client';
import { LoanApplication } from '@/types/loan';

// API response row type
interface LoanApiItem {
  id: string;
  user_id: string;
  applicant_name?: string;
  applicant_email?: string;
  amount?: number;
  purpose?: string;
  status: string;
  created_at: string;
  source?: string;
  employment_status?: string;
  monthly_income?: number;
  approved_at?: string;
  disbursed_at?: string;
  term_months?: number;
  interest_rate?: number;
}

// Re-export LoanApplication for components that import from this hook
export type { LoanApplication };

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

      // Fetch via API orchestration layer
      const result = await loansAPI.list({
        status: status === 'pending' ? 'pending,under_review' : status !== 'all' ? status : undefined,
        startDate: dateFrom,
        endDate: dateTo,
      });

      if (!result.success) {
        console.error('Error fetching loans via API:', result.error);
        throw new Error(result.error || 'Failed to fetch loan applications');
      }

      const loansData = (result.data as LoanApiItem[]) || [];

      // Transform API data to LoanApplication interface
      const transformedApplications: LoanApplication[] = loansData.map((row: LoanApiItem) => ({
        id: row.id,
        applicantName: row.applicant_name || 'Unknown',
        applicantEmail: row.applicant_email || `user-${row.user_id?.slice(0, 8)}@namlend.com`,
        amount: row.amount || 0,
        purpose: row.purpose || 'Not specified',
        status: row.status as LoanApplication['status'],
        submittedAt: row.created_at,
        source: (row.source as 'loan' | 'approval') || 'loan',
        employmentStatus: row.employment_status || 'Not specified',
        monthlyIncome: row.monthly_income || 0,
        approvedAt: row.approved_at || undefined,
        disbursedAt: row.disbursed_at || undefined,
        termMonths: row.term_months || undefined,
        interestRate: row.interest_rate || undefined,
        riskScore: Math.floor(Math.random() * 100),
        creditScore: Math.floor(Math.random() * 300) + 500
      }));

      // Apply client-side filters
      const filteredApplications = applyFilters(transformedApplications);

      setApplications(filteredApplications);
    } catch (err) {
      console.error('Error in fetchApplications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
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
