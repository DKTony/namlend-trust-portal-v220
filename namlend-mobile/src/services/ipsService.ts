/**
 * IPS (Instant Payment System) Service
 * Version: v3.0.0
 * 
 * Handles IPS/IPN integration for real-time payments in Namibia
 * Aligned with main platform ipsService.ts
 */

import { supabase } from './supabaseClient';
import { VPA, IPSTransaction, IPSTransactionStatus } from '../types';

export interface InitiateIPSRepaymentParams {
  loanId: string;
  amount: number;
  payerVpa: string;
}

export interface InitiateIPSRepaymentResult {
  success: boolean;
  transaction_id?: string;
  ips_txn_id?: string;
  status?: IPSTransactionStatus;
  message?: string;
  error?: string;
}

export interface InitiateIPSDisbursementParams {
  loanId: string;
  payeeVpa: string;
}

export interface InitiateIPSDisbursementResult {
  success: boolean;
  transaction_id?: string;
  ips_txn_id?: string;
  status?: IPSTransactionStatus;
  message?: string;
  error?: string;
}

export interface ValidateVPAResult {
  success: boolean;
  valid?: boolean;
  name?: string;
  provider?: string;
  error?: string;
}

export interface TransactionStatusResult {
  success: boolean;
  transaction?: IPSTransaction;
  error?: string;
}

export class IPSService {
  /**
   * Initiate loan repayment via IPS
   */
  static async initiateIPSRepayment(
    params: InitiateIPSRepaymentParams
  ): Promise<InitiateIPSRepaymentResult> {
    try {
      const { data, error } = await supabase.rpc('initiate_ips_repayment', {
        p_loan_id: params.loanId,
        p_amount: params.amount,
        p_payer_vpa: params.payerVpa
      });

      if (error) {
        console.error('IPS repayment initiation failed:', error);
        return { success: false, error: error.message };
      }

      return data as InitiateIPSRepaymentResult;
    } catch (error) {
      console.error('Error initiating IPS repayment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initiate loan disbursement via IPS
   */
  static async initiateIPSDisbursement(
    params: InitiateIPSDisbursementParams
  ): Promise<InitiateIPSDisbursementResult> {
    try {
      const { data, error } = await supabase.rpc('initiate_ips_disbursement', {
        p_loan_id: params.loanId,
        p_payee_vpa: params.payeeVpa
      });

      if (error) {
        console.error('IPS disbursement initiation failed:', error);
        return { success: false, error: error.message };
      }

      return data as InitiateIPSDisbursementResult;
    } catch (error) {
      console.error('Error initiating IPS disbursement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate a VPA address
   */
  static async validateVPA(vpa: string): Promise<ValidateVPAResult> {
    try {
      // Basic format validation
      const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
      if (!vpaRegex.test(vpa)) {
        return { 
          success: true, 
          valid: false, 
          error: 'Invalid VPA format. Expected format: user@provider' 
        };
      }

      // Call the IPS adapter edge function for full validation
      const { data, error } = await supabase.functions.invoke('ips-adapter', {
        body: {
          action: 'validate-vpa',
          vpa: vpa
        }
      });

      if (error) {
        console.error('VPA validation request failed:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        valid: data?.valid ?? false,
        name: data?.name,
        provider: data?.provider
      };
    } catch (error) {
      console.error('Error validating VPA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get IPS transaction status
   */
  static async getTransactionStatus(
    transactionId: string
  ): Promise<TransactionStatusResult> {
    try {
      const { data, error } = await supabase.rpc('get_ips_transaction_status', {
        p_transaction_id: transactionId
      });

      if (error) {
        console.error('Get IPS transaction status failed:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        transaction: data as IPSTransaction
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's saved VPAs
   */
  static async getUserVPAs(userId?: string): Promise<VPA[]> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        console.error('No user ID available for VPA lookup');
        return [];
      }

      const { data, error } = await supabase
        .from('ips_vpas')
        .select('*')
        .eq('user_id', targetUserId)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('Error fetching user VPAs:', error);
        return [];
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        user_id: row.user_id as string,
        vpa_address: row.vpa_address as string,
        provider: (row.provider as string) || 'unknown',
        is_default: (row.is_default as boolean) || false,
        is_verified: (row.is_verified as boolean) || false,
        verified_at: row.verified_at as string | undefined,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string
      }));
    } catch (error) {
      console.error('Error fetching user VPAs:', error);
      return [];
    }
  }

  /**
   * Save or update a VPA for the current user
   */
  static async upsertVPA(params: {
    vpaAddress: string;
    provider?: string;
    isDefault?: boolean;
  }): Promise<{ success: boolean; vpa?: VPA; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // First validate the VPA
      const validation = await this.validateVPA(params.vpaAddress);
      if (!validation.success || !validation.valid) {
        return { 
          success: false, 
          error: validation.error || 'Invalid VPA address' 
        };
      }

      // If setting as default, clear other defaults first
      if (params.isDefault) {
        await supabase
          .from('ips_vpas')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('ips_vpas')
        .upsert({
          user_id: user.id,
          vpa_address: params.vpaAddress,
          provider: params.provider || validation.provider || 'unknown',
          is_default: params.isDefault || false,
          is_verified: true, // Since we validated above
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,vpa_address'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting VPA:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        vpa: {
          id: data.id,
          user_id: data.user_id,
          vpa_address: data.vpa_address,
          provider: data.provider,
          is_default: data.is_default,
          is_verified: data.is_verified,
          verified_at: data.verified_at,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
      };
    } catch (error) {
      console.error('Error upserting VPA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a VPA
   */
  static async deleteVPA(vpaId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('ips_vpas')
        .delete()
        .eq('id', vpaId);

      if (error) {
        console.error('Error deleting VPA:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting VPA:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get IPS transactions for a loan
   */
  static async getLoanIPSTransactions(loanId: string): Promise<IPSTransaction[]> {
    try {
      const { data, error } = await supabase.rpc('get_loan_ips_transactions', {
        p_loan_id: loanId
      });

      if (error) {
        console.error('Error fetching loan IPS transactions:', error);
        return [];
      }

      return (data || []) as IPSTransaction[];
    } catch (error) {
      console.error('Error fetching loan IPS transactions:', error);
      return [];
    }
  }
}
