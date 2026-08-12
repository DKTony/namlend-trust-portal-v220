import { api } from '@/integrations/convex/api';
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from 'convex/react';
import { useMemo } from 'react';
import type { Id } from '../../../../convex/_generated/dataModel';

// Use the interface that matches the RPC function return
export interface Disbursement {
  id: string;
  loan_id: string;
  client_name: string; // From RPC function
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed' | 'cancelled';
  method: string;
  reference: string;
  scheduled_at: string;
  processed_at?: string;
  ips_status?: string;
  created_at: string;
}

export const useDisbursements = (
  status: 'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'failed' = 'all',
  searchTerm: string = ''
) => {
  // Convex reactive query
  const rawDisbursements = useConvexQuery(api.disbursements.adminListDisbursements, {
    status: (status !== 'all' ? status : undefined) as any,
  });

  const loading = rawDisbursements === undefined;
  const error: string | null = null;

  const disbursements: Disbursement[] = useMemo(() => {
    if (!rawDisbursements) return [];

    let transformed: Disbursement[] = rawDisbursements.map((d: any) => ({
      id: String(d._id),
      loan_id: String(d.loanId ?? ''),
      client_name: d.clientName ?? 'Unknown Client',
      amount: d.amount ?? 0,
      status: (d.status ?? 'pending') as Disbursement['status'],
      method: d.actualRail ?? d.method ?? 'bank_transfer',
      reference: d.referenceNumber ?? `DIS-${String(d._id).slice(0, 8)}`,
      scheduled_at: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      processed_at: d.processedAt ? new Date(d.processedAt).toISOString() : undefined,
      ips_status: d.ipsStatus,
      created_at: d.createdAt ? new Date(d.createdAt).toISOString() : '',
    }));

    // Apply search filter
    if ((searchTerm ?? '').trim()) {
      const searchLower = searchTerm.toLowerCase();
      transformed = transformed.filter(
        (d) =>
          d.client_name.toLowerCase().includes(searchLower) ||
          d.reference.toLowerCase().includes(searchLower) ||
          d.id.toLowerCase().includes(searchLower) ||
          d.amount.toString().includes(searchTerm)
      );
    }

    return transformed;
  }, [rawDisbursements, searchTerm]);

  const refetch = () => {}; // Convex is reactive

  // Convex mutations for disbursement state transitions
  const processMutation = useConvexMutation(api.disbursements.processDisbursement);
  const completeMutation = useConvexMutation(api.disbursements.completeDisbursement);
  const failMutation = useConvexMutation(api.disbursements.failDisbursement);

  const approveDisbursementAction = async (disbursementId: string, _notes?: string) => {
    // Approve = transition from pending to processing (ready for bank transfer)
    await processMutation({
      disbursementId: disbursementId as Id<'disbursements'>,
    });
    return { success: true };
  };

  const markProcessingAction = async (disbursementId: string, paymentReference: string) => {
    await processMutation({
      disbursementId: disbursementId as Id<'disbursements'>,
      referenceNumber: paymentReference,
    });
    return { success: true };
  };

  const completeDisbursementAction = async (
    disbursementId: string,
    confirmationReference: string
  ) => {
    await completeMutation({
      disbursementId: disbursementId as Id<'disbursements'>,
      referenceNumber: confirmationReference,
    });
    return { success: true };
  };

  const failDisbursementAction = async (disbursementId: string, reason: string) => {
    await failMutation({
      disbursementId: disbursementId as Id<'disbursements'>,
      reason,
    });
    return { success: true };
  };

  return {
    disbursements,
    loading,
    error,
    refetch,
    approveDisbursement: approveDisbursementAction,
    markProcessing: markProcessingAction,
    completeDisbursement: completeDisbursementAction,
    failDisbursement: failDisbursementAction,
  };
};
