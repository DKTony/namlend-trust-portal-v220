/**
 * Loan Service
 * Version: v2.4.2
 * 
 * Handles loan-related API operations
 */

import { supabase } from './supabaseClient';
import { Loan, LoanApplication } from '../types';

export class LoanService {
  /**
   * Get all loans for current user
   */
  static async getMyLoans(): Promise<Loan[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching loans:', error);
      throw error;
    }
  }

  /**
   * Get loan by ID
   */
  static async getLoanById(loanId: string): Promise<Loan | null> {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching loan:', error);
      throw error;
    }
  }

  /**
   * Get pending loan applications for current user
   */
  static async getMyApplications(): Promise<LoanApplication[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('request_type', 'loan_application')
        .in('status', ['pending', 'under_review'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  /**
   * Get loan repayment schedule
   */
  static async getRepaymentSchedule(loanId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('paid_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching repayment schedule:', error);
      throw error;
    }
  }

  /**
   * Submit a new loan application
   */
  static async submitLoanApplication(
    userId: string,
    applicationData: any
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Submit to approval_requests table for workflow processing
      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          user_id: userId,
          request_type: 'loan_application',
          request_data: applicationData,
          status: 'pending',
          priority: 'normal',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting loan application:', error);
        return {
          success: false,
          error: error.message || 'Failed to submit loan application',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error in submitLoanApplication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate loan statistics for dashboard
   */
  static async getLoanStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user.id);

      const activeLoans = loans?.filter(l => l.status === 'active' || l.status === 'disbursed') || [];
      const totalBorrowed = loans?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) || 0;
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + (Number(l.total_repayment) || 0), 0);
      
      // Get most recent disbursed_at as proxy for next payment tracking
      const lastDisbursedLoan = activeLoans
        .filter(l => l.disbursed_at)
        .sort((a, b) => new Date(b.disbursed_at).getTime() - new Date(a.disbursed_at).getTime())[0];

      return {
        activeLoans: activeLoans.length,
        totalBorrowed,
        totalOutstanding,
        lastDisbursedDate: lastDisbursedLoan?.disbursed_at || null,
      };
    } catch (error) {
      console.error('Error calculating loan stats:', error);
      return {
        activeLoans: 0,
        totalBorrowed: 0,
        totalOutstanding: 0,
        lastDisbursedDate: null,
      };
    }
  }
}
