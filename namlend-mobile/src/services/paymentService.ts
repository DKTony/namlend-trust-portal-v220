/**
 * Payment Service
 * Version: v2.4.2
 * 
 * Handles payment operations and mobile money integration
 */

import { supabase } from './supabaseClient';
import { Payment, PaymentMethod } from '../types';
 

export class PaymentService {
  /**
   * Get all payments for a loan
   */
  static async getPaymentsByLoan(loanId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
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
   * Initiate a payment
   */
  static async initiatePayment(
    loanId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    referenceNumber?: string
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Validate amount
      if (amount <= 0) {
        return { success: false, error: 'Invalid payment amount' };
      }

      const { data, error } = await supabase
        .from('payments')
        .insert({
          loan_id: loanId,
          amount,
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          status: 'pending',
          reference_number: referenceNumber,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, paymentId: data.id };
    } catch (error) {
      console.error('Error initiating payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(loanId: string) {
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', loanId);

      const list: Payment[] = (payments ?? []) as Payment[];

      const completed = list.filter((p: Payment) => p.status === 'completed');
      const pending = list.filter((p: Payment) => p.status === 'pending');

      const toNumber = (v: unknown): number => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const totalPaid: number = completed.reduce((sum: number, p: Payment) => sum + toNumber(p.amount), 0);

      const pendingPayments: number = pending.reduce((sum: number, p: Payment) => sum + toNumber(p.amount), 0);

      const lastPaymentDate: string | null = (completed
        .map((p: Payment) => p.paid_at)
        .filter((d: string | undefined): d is string => Boolean(d))
        .sort()
        .reverse()[0]) ?? null;

      return {
        totalPaid,
        pendingPayments,
        lastPaymentDate,
        paymentCount: list.length,
      };
    } catch (error) {
      console.error('Error calculating payment stats:', error);
      return {
        totalPaid: 0,
        pendingPayments: 0,
        lastPaymentDate: null,
        paymentCount: 0,
      };
    }
  }
}
