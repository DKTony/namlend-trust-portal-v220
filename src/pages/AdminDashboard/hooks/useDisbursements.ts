import { useState, useEffect } from 'react';
import { 
  getPendingDisbursements,
  approveDisbursement,
  markDisbursementProcessing,
  completeDisbursement,
  failDisbursement
} from '@/services/disbursementService';

// Use the interface that matches the RPC function return
export interface Disbursement {
  id: string;
  loan_id: string;
  client_name: string; // From RPC function
  amount: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed';
  method: string;
  reference: string;
  scheduled_at: string;
  created_at: string;
}

export const useDisbursements = (
  status: 'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'failed' = 'all',
  searchTerm: string = ''
) => {
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDisbursements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pending disbursements from service
      const result = await getPendingDisbursements();

      if (!result.success) {
        setError(result.error || 'Failed to fetch disbursements');
        setDisbursements([]);
        return;
      }

      let filteredDisbursements = result.disbursements || [];

      // Apply status filter
      if (status !== 'all') {
        filteredDisbursements = filteredDisbursements.filter(
          disbursement => disbursement.status === status
        );
      }

      // Apply search filter
      if ((searchTerm ?? '').trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredDisbursements = filteredDisbursements.filter(disbursement =>
          disbursement.client_name.toLowerCase().includes(searchLower) ||
          disbursement.reference.toLowerCase().includes(searchLower) ||
          disbursement.id.toLowerCase().includes(searchLower) ||
          disbursement.amount.toString().includes(searchTerm)
        );
      }

      setDisbursements(filteredDisbursements);

    } catch (err) {
      console.error('Error in fetchDisbursements:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisbursements();
  }, [status, searchTerm]);

  const refetch = () => {
    fetchDisbursements();
  };

  const approveDisbursementAction = async (disbursementId: string, notes?: string) => {
    try {
      const result = await approveDisbursement(disbursementId, notes);
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve disbursement');
      }
      refetch();
      return result;
    } catch (err) {
      console.error('Error approving disbursement:', err);
      throw err;
    }
  };

  const markProcessingAction = async (disbursementId: string, notes?: string) => {
    try {
      const result = await markDisbursementProcessing(disbursementId, notes);
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark as processing');
      }
      refetch();
      return result;
    } catch (err) {
      console.error('Error marking as processing:', err);
      throw err;
    }
  };

  const completeDisbursementAction = async (
    disbursementId: string,
    paymentReference: string,
    notes?: string
  ) => {
    try {
      const result = await completeDisbursement(disbursementId, paymentReference, notes);
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete disbursement');
      }
      refetch();
      return result;
    } catch (err) {
      console.error('Error completing disbursement:', err);
      throw err;
    }
  };

  const failDisbursementAction = async (disbursementId: string, reason: string) => {
    try {
      const result = await failDisbursement(disbursementId, reason);
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark as failed');
      }
      refetch();
      return result;
    } catch (err) {
      console.error('Error failing disbursement:', err);
      throw err;
    }
  };

  return {
    disbursements,
    loading,
    error,
    refetch,
    approveDisbursement: approveDisbursementAction,
    markProcessing: markProcessingAction,
    completeDisbursement: completeDisbursementAction,
    failDisbursement: failDisbursementAction
  };
};
