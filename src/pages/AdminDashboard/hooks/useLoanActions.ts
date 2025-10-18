import { useState } from 'react';
import { updateLoanStatus } from '@/services/loanService';
import { useToast } from '@/hooks/use-toast';

export const useLoanActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const approveLoan = async (loanId: string) => {
    try {
      setLoading(true);

      const { success, error } = await updateLoanStatus({ loanId, status: 'approved' });
      if (!success) {
        console.error('Error approving loan:', error);
        toast({
          title: "Error",
          description: "Failed to approve loan. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Loan Approved",
        description: "The loan application has been successfully approved.",
        variant: "default",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error approving loan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const rejectLoan = async (loanId: string, reason?: string) => {
    try {
      setLoading(true);

      const { success, error } = await updateLoanStatus({ loanId, status: 'rejected' });
      if (!success) {
        console.error('Error rejecting loan:', error);
        toast({
          title: "Error",
          description: "Failed to reject loan. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Loan Rejected",
        description: "The loan application has been rejected.",
        variant: "default",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error rejecting loan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disburseLoan = async (loanId: string) => {
    try {
      setLoading(true);

      const { success, error } = await updateLoanStatus({ loanId, status: 'disbursed' });
      if (!success) {
        console.error('Error disbursing loan:', error);
        toast({
          title: "Error",
          description: "Failed to disburse loan. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Loan Disbursed",
        description: "The loan has been successfully disbursed.",
        variant: "default",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error disbursing loan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const bulkApproveLoan = async (loanIds: string[]) => {
    try {
      setLoading(true);

      const results = await Promise.all(
        loanIds.map(id => updateLoanStatus({ loanId: id, status: 'approved' }))
      );
      const allOk = results.every(r => r.success);
      if (!allOk) {
        console.error('Error bulk approving loans:', results.find(r => !r.success)?.error);
        toast({
          title: "Error",
          description: "Failed to approve loans. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Loans Approved",
        description: `${loanIds.length} loan applications have been approved.`,
        variant: "default",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error bulk approving loans:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const bulkRejectLoan = async (loanIds: string[]) => {
    try {
      setLoading(true);

      const results = await Promise.all(
        loanIds.map(id => updateLoanStatus({ loanId: id, status: 'rejected' }))
      );
      const allOk = results.every(r => r.success);
      if (!allOk) {
        console.error('Error bulk rejecting loans:', results.find(r => !r.success)?.error);
        toast({
          title: "Error",
          description: "Failed to reject loans. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Loans Rejected",
        description: `${loanIds.length} loan applications have been rejected.`,
        variant: "default",
      });

      return true;
    } catch (error) {
      console.error('Unexpected error bulk rejecting loans:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
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
    loading
  };
};
