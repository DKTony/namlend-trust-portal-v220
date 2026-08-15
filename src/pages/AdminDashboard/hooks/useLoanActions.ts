import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { useMutation } from 'convex/react';
import { useState } from 'react';

export const useLoanActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const approveMutation = useMutation(api.loans.approveLoan);
  const rejectMutation = useMutation(api.loans.rejectLoan);
  const initiateDisbursementMutation = useMutation(api.disbursements.initiateDisbursement);
  const moveToReviewMutation = useMutation(api.loans.moveToReview);

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

  const disburseLoan = async (loanId: string, amount: number) => {
    try {
      setLoading(true);
      await initiateDisbursementMutation({
        loanId: loanId as Id<'loans'>,
        amount,
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
    moveToReview: async (loanId: string) => {
      try {
        setLoading(true);
        await moveToReviewMutation({ loanId: loanId as Id<'loans'> });
        toast({
          title: 'Moved to review',
          description: 'The application is now under review.',
        });
        return true;
      } catch (error) {
        console.error('Error moving loan to review:', error);
        toast({
          title: 'Error',
          description: 'Failed to move the loan to review.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    loading,
  };
};
