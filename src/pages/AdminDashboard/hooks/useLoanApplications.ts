import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { type LoanStatus, type LoanApplication } from '@/types/loan';

// Re-export LoanApplication for components that import from this hook
export type { LoanApplication };

/** Convex loanStatus values that map to the legacy 'pending' filter bucket */
const PENDING_STATUSES: LoanStatus[] = ['pending', 'submitted', 'under_review'] as LoanStatus[];

interface UseLoanApplicationsParams {
  status: 'pending' | 'approved' | 'rejected' | 'all';
  searchTerm: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  priority?: string;
  /** Kept for API compatibility — Convex is reactive so this is a no-op */
  refreshKey?: number;
}

export const useLoanApplications = ({
  status,
  searchTerm,
  dateFrom,
  dateTo,
  amountMin,
  amountMax,
}: UseLoanApplicationsParams) => {
  // Convex reactive query — no status filter when 'all', otherwise pass the
  // canonical status value. 'pending' in the legacy UI means any pre-approval state.
  const convexStatus =
    status === 'all'
      ? undefined
      : status === 'pending'
        ? undefined // fetch all, filter client-side for pending bucket
        : (status as LoanStatus);

  const rawLoans = useQuery(api.loans.adminListLoans, { status: convexStatus });

  const loading = rawLoans === undefined;
  const error: string | null = null;

  const applications: LoanApplication[] = useMemo(() => {
    if (!rawLoans) return [];

    let items: LoanApplication[] = rawLoans.map((row) => ({
      id: String(row._id),
      applicantName: 'Unknown', // enriched by LoanApplicationsList via getUserProfile if needed
      applicantEmail: '',
      amount: row.principal ?? 0,
      purpose: row.purpose ?? 'Not specified',
      status: row.status as LoanApplication['status'],
      submittedAt: row._creationTime
        ? new Date(row._creationTime).toISOString()
        : new Date().toISOString(),
      source: 'loan' as const,
      termMonths: row.termMonths,
      interestRate: row.interestRate,
      approvedAt: row.disbursedAt ? new Date(row.disbursedAt).toISOString() : undefined,
      disbursedAt: row.disbursedAt ? new Date(row.disbursedAt).toISOString() : undefined,
      // Canonical scoring fields (N1) — no mocks
      creditScore: row.creditScore,
    }));

    // Pending bucket = all pre-approval statuses
    if (status === 'pending') {
      items = items.filter((a) => PENDING_STATUSES.includes(a.status as LoanStatus));
    }

    // Search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(
        (a) =>
          a.applicantName.toLowerCase().includes(lower) ||
          a.applicantEmail.toLowerCase().includes(lower) ||
          a.purpose.toLowerCase().includes(lower) ||
          a.id.toLowerCase().includes(lower) ||
          String(a.amount).includes(searchTerm)
      );
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      items = items.filter((a) => new Date(a.submittedAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      items = items.filter((a) => new Date(a.submittedAt) <= to);
    }

    // Amount range filter
    if (amountMin !== undefined) items = items.filter((a) => a.amount >= amountMin);
    if (amountMax !== undefined) items = items.filter((a) => a.amount <= amountMax);

    return items;
  }, [rawLoans, status, searchTerm, dateFrom, dateTo, amountMin, amountMax]);

  const refetch = () => {}; // Convex is reactive — kept for API compatibility

  return { applications, loading, error, refetch };
};
