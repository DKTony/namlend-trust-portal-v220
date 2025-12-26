/**
 * Payment Service
 * Version: v3.0.0
 * 
 * Handles payment operations with full RPC integration
 * Aligned with main platform paymentService.ts
 */

import { supabase } from './supabaseClient';
import { Payment, PaymentMethod, PaymentSchedule, LoanPaymentDetails, LoanPortfolioSummary, ProcessPaymentResult } from '../types';
 

export class PaymentService {
  /**
   * Get all payments for a loan
   */
  static async getPaymentsByLoan(loanId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          loan_id,
          amount,
          payment_method,
          status,
          paid_at,
          reference_number,
          notes,
          created_at
        `)
        .eq('loan_id', loanId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }

  /**
   * Get all payments for current user
   */
  static async getMyPayments(): Promise<Payment[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // payments table has no user_id; filter via inner join to loans
      const { data, error } = await supabase
        .from('payments')
        .select('*, loans!inner(user_id)')
        .eq('loans.user_id', user.id)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      // Strip joined object if present
      const rows = (data || []).map((p: any) => {
        const { loans, ...rest } = p || {};
        return rest;
      });
      return rows as unknown as Payment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  }

  /**
   * Process a loan payment using the RPC for atomic processing
   * This integrates with the main platform's process_loan_payment RPC
   */
  static async processLoanPayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    referenceNumber?: string,
    notes?: string
  ): Promise<ProcessPaymentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Validate amount
      if (amount <= 0) {
        return { success: false, error: 'Invalid payment amount' };
      }

      // Use the atomic RPC for payment processing
      const { data, error } = await supabase.rpc('process_loan_payment', {
        p_loan_id: loanId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_reference_number: referenceNumber || null,
        p_notes: notes || null
      });

      if (error) {
        console.error('Process loan payment RPC failed:', error);
        return { success: false, error: error.message };
      }

      return data as ProcessPaymentResult;
    } catch (error) {
      console.error('Error processing payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Legacy initiatePayment - now uses processLoanPayment internally
   */
  static async initiatePayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    referenceNumber?: string
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    const result = await this.processLoanPayment(loanId, amount, paymentMethod, referenceNumber);
    return {
      success: result.success,
      paymentId: result.payment_id,
      error: result.error
    };
  }

  /**
   * Get comprehensive loan payment details using RPC
   * Includes schedule, payments, and summary
   */
  static async getLoanPaymentDetails(loanId: string): Promise<LoanPaymentDetails> {
    try {
      const { data, error } = await supabase.rpc('get_loan_payment_details', {
        p_loan_id: loanId
      });

      if (error) {
        console.error('Get loan payment details RPC failed:', error);
        return { success: false, error: error.message };
      }

      return data as LoanPaymentDetails;
    } catch (error) {
      console.error('Error fetching loan payment details:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get payment schedule for a loan using RPC
   */
  static async getPaymentSchedule(loanId: string): Promise<{
    success: boolean;
    schedule?: PaymentSchedule[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_payment_schedule', {
        p_loan_id: loanId
      });

      if (error) {
        console.error('Get payment schedule RPC failed:', error);
        return { success: false, error: error.message };
      }

      return { success: true, schedule: data as PaymentSchedule[] || [] };
    } catch (error) {
      console.error('Error fetching payment schedule:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get user's loan portfolio summary using RPC
   */
  static async getLoanPortfolioSummary(userId?: string): Promise<LoanPortfolioSummary> {
    try {
      const { data, error } = await supabase.rpc('get_loan_portfolio_summary', {
        p_user_id: userId || null
      });

      if (error) {
        console.error('Get loan portfolio summary RPC failed:', error);
        return { success: false, error: error.message };
      }

      return data as LoanPortfolioSummary;
    } catch (error) {
      console.error('Error fetching portfolio summary:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get payment statistics (enhanced version using payment details)
   */
  static async getPaymentStats(loanId: string) {
    try {
      const details = await this.getLoanPaymentDetails(loanId);
      
      if (!details.success || !details.summary) {
        // Fallback to basic query
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id,
            loan_id,
            amount,
            payment_method,
            status,
            paid_at
          `)
          .eq('loan_id', loanId);

        const list: Payment[] = (payments ?? []) as Payment[];
        const completed = list.filter((p: Payment) => p.status === 'completed');
        const pending = list.filter((p: Payment) => p.status === 'pending');

        const toNumber = (v: unknown): number => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        return {
          totalPaid: completed.reduce((sum, p) => sum + toNumber(p.amount), 0),
          pendingPayments: pending.reduce((sum, p) => sum + toNumber(p.amount), 0),
          lastPaymentDate: completed.map(p => p.paid_at).filter(Boolean).sort().reverse()[0] || null,
          paymentCount: list.length,
          outstandingBalance: 0,
          isSettled: false,
        };
      }

      return {
        totalPaid: details.summary.total_paid,
        pendingPayments: details.summary.overdue_amount,
        lastPaymentDate: details.payments?.filter(p => p.paid_at).sort((a, b) => 
          new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime()
        )[0]?.paid_at || null,
        paymentCount: details.payments?.length || 0,
        outstandingBalance: details.summary.outstanding_balance,
        isSettled: details.summary.is_settled,
        nextDueDate: details.summary.next_due_date,
        installmentsPaid: details.summary.installments_paid,
        installmentsRemaining: details.summary.installments_remaining,
      };
    } catch (error) {
      console.error('Error calculating payment stats:', error);
      return {
        totalPaid: 0,
        pendingPayments: 0,
        lastPaymentDate: null,
        paymentCount: 0,
        outstandingBalance: 0,
        isSettled: false,
      };
    }
  }
}
