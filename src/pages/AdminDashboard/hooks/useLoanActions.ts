import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { useToast } from '@/hooks/use-toast';

export const useLoanActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const approveMutation = useMutation(api.loans.approveLoan);
  const rejectMutation = useMutation(api.loans.rejectLoan);
  const initiateDisbursementMutation = useMutation(api.disbursements.initiateDisbursement);

  const approveLoan = async (loanId: string) => {
    try {
      setLoading(true);
      await approveMutation({ loanId: loanId as Id<'loans'> });
      toast({
        title: 'Loan Approved',
        description: 'The loan application has been successfully approved.',
      });
      return true;
    } catch (error) {
      console.error('Error approving loan:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve loan. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const rejectLoan = async (loanId: string, reason?: string) => {
    try {
      setLoading(true);
      await rejectMutation({
        loanId: loanId as Id<'loans'>,
        reason: reason ?? 'Rejected by admin',
      });
      toast({ title: 'Loan Rejected', description: 'The loan application has been rejected.' });
      return true;
    } catch (error) {
      console.error('Error rejecting loan:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject loan. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disburseLoan = async (loanId: string) => {
    try {
      setLoading(true);
      // Initiate disbursement for the approved loan (creates a pending disbursement record)
      await initiateDisbursementMutation({
        loanId: loanId as Id<'loans'>,
        amount: 0, // Amount is pulled from the loan record inside the mutation
        method: 'bank_transfer',
      });
      toast({
        title: 'Disbursement Initiated',
        description: 'The loan disbursement has been initiated.',
      });
      return true;
    } catch (error) {
      console.error('Error initiating disbursement:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate disbursement. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const bulkApproveLoan = async (loanIds: string[]) => {
    try {
      setLoading(true);
      await Promise.all(loanIds.map((id) => approveMutation({ loanId: id as Id<'loans'> })));
      toast({
        title: 'Loans Approved',
        description: `${loanIds.length} loan applications have been approved.`,
      });
      return true;
    } catch (error) {
      console.error('Error bulk approving loans:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve loans. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const bulkRejectLoan = async (loanIds: string[]) => {
    try {
      setLoading(true);
      await Promise.all(
        loanIds.map((id) =>
          rejectMutation({ loanId: id as Id<'loans'>, reason: 'Bulk rejected by admin' })
        )
      );
      toast({
        title: 'Loans Rejected',
        description: `${loanIds.length} loan applications have been rejected.`,
      });
      return true;
    } catch (error) {
      console.error('Error bulk rejecting loans:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject loans. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    approveLoan,
    rejectLoan,
    disburseLoan,
    bulkApproveLoan,
    bulkRejectLoan,
    loading,
  };
};
