/**
 * Payment Gateway Service
 * Handles payment processing through multiple providers
 * Supports: Bank Transfer, Mobile Money (MTC MoMo, TN Mobile), PayToday
 */

import { supabase } from '@/integrations/supabase/client';

// Payment Provider Types
export type PaymentProvider = 
  | 'bank_transfer'
  | 'mobile_money_mtc'
  | 'mobile_money_tn'
  | 'paytoday'
  | 'cash';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface PaymentRequest {
  loanId: string;
  userId: string;
  amount: number;
  provider: PaymentProvider;
  phoneNumber?: string;
  bankAccount?: string;
  reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  status: PaymentStatus;
  message: string;
  providerResponse?: Record<string, unknown>;
}

export interface PaymentVerification {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  paidAt?: string;
  metadata?: Record<string, unknown>;
}

// Provider configurations (in production, these would be environment variables)
const PROVIDER_CONFIG = {
  paytoday: {
    apiUrl: import.meta.env.VITE_PAYTODAY_API_URL || 'https://api.paytoday.com.na',
    merchantId: import.meta.env.VITE_PAYTODAY_MERCHANT_ID || '',
    apiKey: import.meta.env.VITE_PAYTODAY_API_KEY || '',
  },
  mtc_momo: {
    apiUrl: import.meta.env.VITE_MTC_MOMO_API_URL || 'https://api.mtc.com.na/momo',
    merchantCode: import.meta.env.VITE_MTC_MOMO_MERCHANT || '',
  },
  tn_mobile: {
    apiUrl: import.meta.env.VITE_TN_MOBILE_API_URL || 'https://api.tnmobile.com.na',
    merchantCode: import.meta.env.VITE_TN_MOBILE_MERCHANT || '',
  }
};

/**
 * Generate a unique payment reference
 */
function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NL-${timestamp}-${random}`;
}

/**
 * Initiate a payment through the selected provider
 */
export async function initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
  const reference = request.reference || generatePaymentReference();
  
  try {
    // Log payment initiation for audit
    await logPaymentActivity(request.loanId, request.userId, 'initiate', {
      amount: request.amount,
      provider: request.provider,
      reference
    });

    switch (request.provider) {
      case 'bank_transfer':
        return await initiateBankTransfer(request, reference);
      
      case 'mobile_money_mtc':
        return await initiateMTCMoMo(request, reference);
      
      case 'mobile_money_tn':
        return await initiateTNMobile(request, reference);
      
      case 'paytoday':
        return await initiatePayToday(request, reference);
      
      case 'cash':
        return await recordCashPayment(request, reference);
      
      default:
        return {
          success: false,
          status: 'failed',
          message: `Unsupported payment provider: ${request.provider}`
        };
    }
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    return {
      success: false,
      status: 'failed',
      message: error.message || 'Payment initiation failed'
    };
  }
}

/**
 * Verify a payment status
 */
export async function verifyPayment(
  transactionId: string,
  provider: PaymentProvider
): Promise<PaymentVerification> {
  try {
    switch (provider) {
      case 'bank_transfer':
        return await verifyBankTransfer(transactionId);
      
      case 'mobile_money_mtc':
      case 'mobile_money_tn':
        return await verifyMobilePayment(transactionId, provider);
      
      case 'paytoday':
        return await verifyPayToday(transactionId);
      
      default:
        return {
          transactionId,
          status: 'pending',
          amount: 0
        };
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      transactionId,
      status: 'failed',
      amount: 0
    };
  }
}

/**
 * Get payment instructions for a provider
 */
export function getPaymentInstructions(provider: PaymentProvider, reference: string): string {
  switch (provider) {
    case 'bank_transfer':
      return `
Bank Transfer Instructions:
1. Bank: First National Bank Namibia
2. Account Name: NamLend Trust (Pty) Ltd
3. Account Number: 62123456789
4. Branch Code: 280172
5. Reference: ${reference}

Please use the reference number exactly as shown.
Payment typically reflects within 1-2 business days.
      `.trim();
    
    case 'mobile_money_mtc':
      return `
MTC MoMo Payment:
1. Dial *140#
2. Select "Pay"
3. Enter Merchant Code: 12345
4. Enter Amount
5. Enter Reference: ${reference}
6. Confirm with your PIN

Payment confirms instantly.
      `.trim();
    
    case 'mobile_money_tn':
      return `
TN Mobile Money Payment:
1. Dial *111#
2. Select "Payments"
3. Enter Merchant: NAMLEND
4. Enter Amount
5. Enter Reference: ${reference}
6. Confirm with PIN

Payment confirms instantly.
      `.trim();
    
    case 'paytoday':
      return `
PayToday Payment:
1. Visit paytoday.com.na
2. Select "Pay Bill"
3. Search for "NamLend Trust"
4. Enter Reference: ${reference}
5. Complete payment

You'll receive SMS confirmation.
      `.trim();
    
    case 'cash':
      return `
Cash Payment:
Visit any NamLend Trust office with:
1. Your ID document
2. Reference number: ${reference}
3. Cash amount

Operating Hours: Mon-Fri 8am-5pm, Sat 8am-1pm
      `.trim();
    
    default:
      return 'Please contact support for payment instructions.';
  }
}

// ============ Provider-Specific Implementations ============

async function initiateBankTransfer(
  request: PaymentRequest,
  reference: string
): Promise<PaymentResponse> {
  // Bank transfers are manual - create pending record
  const { error } = await supabase
    .from('payments')
    .insert({
      loan_id: request.loanId,
      user_id: request.userId,
      amount: request.amount,
      payment_method: 'bank_transfer',
      status: 'pending',
      reference_number: reference,
      metadata: {
        provider: 'bank_transfer',
        bank_account: request.bankAccount,
        awaiting_confirmation: true
      }
    });

  if (error) {
    return {
      success: false,
      status: 'failed',
      message: 'Failed to create payment record'
    };
  }

  return {
    success: true,
    transactionId: reference,
    reference,
    status: 'pending',
    message: getPaymentInstructions('bank_transfer', reference)
  };
}

async function initiateMTCMoMo(
  request: PaymentRequest,
  reference: string
): Promise<PaymentResponse> {
  // In production, this would call the MTC MoMo API
  // For now, we'll simulate the flow
  
  if (!request.phoneNumber) {
    return {
      success: false,
      status: 'failed',
      message: 'Phone number required for mobile money payment'
    };
  }

  // Validate phone number format (Namibian MTC: starts with 081)
  if (!request.phoneNumber.match(/^(\+264|0)?81\d{7}$/)) {
    return {
      success: false,
      status: 'failed',
      message: 'Invalid MTC phone number. Must start with 081.'
    };
  }

  // Create pending payment record
  const { error } = await supabase
    .from('payments')
    .insert({
      loan_id: request.loanId,
      user_id: request.userId,
      amount: request.amount,
      payment_method: 'mobile_money',
      status: 'pending',
      reference_number: reference,
      metadata: {
        provider: 'mtc_momo',
        phone_number: request.phoneNumber,
        ussd_code: '*140#'
      }
    });

  if (error) {
    return {
      success: false,
      status: 'failed',
      message: 'Failed to create payment record'
    };
  }

  return {
    success: true,
    transactionId: reference,
    reference,
    status: 'pending',
    message: getPaymentInstructions('mobile_money_mtc', reference)
  };
}

async function initiateTNMobile(
  request: PaymentRequest,
  reference: string
): Promise<PaymentResponse> {
  if (!request.phoneNumber) {
    return {
      success: false,
      status: 'failed',
      message: 'Phone number required for mobile money payment'
    };
  }

  // Validate phone number format (Namibian TN: starts with 085)
  if (!request.phoneNumber.match(/^(\+264|0)?85\d{7}$/)) {
    return {
      success: false,
      status: 'failed',
      message: 'Invalid TN Mobile number. Must start with 085.'
    };
  }

  const { error } = await supabase
    .from('payments')
    .insert({
      loan_id: request.loanId,
      user_id: request.userId,
      amount: request.amount,
      payment_method: 'mobile_money',
      status: 'pending',
      reference_number: reference,
      metadata: {
        provider: 'tn_mobile',
        phone_number: request.phoneNumber,
        ussd_code: '*111#'
      }
    });

  if (error) {
    return {
      success: false,
      status: 'failed',
      message: 'Failed to create payment record'
    };
  }

  return {
    success: true,
    transactionId: reference,
    reference,
    status: 'pending',
    message: getPaymentInstructions('mobile_money_tn', reference)
  };
}

async function initiatePayToday(
  request: PaymentRequest,
  reference: string
): Promise<PaymentResponse> {
  // In production, this would create a PayToday payment request
  // and return a payment URL or QR code
  
  const paymentUrl = `https://pay.paytoday.com.na/pay/${reference}?amount=${request.amount}`;
  
  const { error } = await supabase
    .from('payments')
    .insert({
      loan_id: request.loanId,
      user_id: request.userId,
      amount: request.amount,
      payment_method: 'paytoday',
      status: 'pending',
      reference_number: reference,
      metadata: {
        provider: 'paytoday',
        payment_url: paymentUrl
      }
    });

  if (error) {
    return {
      success: false,
      status: 'failed',
      message: 'Failed to create payment record'
    };
  }

  return {
    success: true,
    transactionId: reference,
    reference,
    status: 'pending',
    message: getPaymentInstructions('paytoday', reference),
    providerResponse: { paymentUrl }
  };
}

async function recordCashPayment(
  request: PaymentRequest,
  reference: string
): Promise<PaymentResponse> {
  const { error } = await supabase
    .from('payments')
    .insert({
      loan_id: request.loanId,
      user_id: request.userId,
      amount: request.amount,
      payment_method: 'cash',
      status: 'pending',
      reference_number: reference,
      metadata: {
        provider: 'cash',
        awaiting_collection: true
      }
    });

  if (error) {
    return {
      success: false,
      status: 'failed',
      message: 'Failed to create payment record'
    };
  }

  return {
    success: true,
    transactionId: reference,
    reference,
    status: 'pending',
    message: getPaymentInstructions('cash', reference)
  };
}

async function verifyBankTransfer(transactionId: string): Promise<PaymentVerification> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('reference_number', transactionId)
    .single();

  if (error || !data) {
    return {
      transactionId,
      status: 'failed',
      amount: 0
    };
  }

  return {
    transactionId,
    status: data.status as PaymentStatus,
    amount: data.amount,
    paidAt: data.paid_at,
    metadata: data.metadata as Record<string, unknown>
  };
}

async function verifyMobilePayment(
  transactionId: string,
  provider: PaymentProvider
): Promise<PaymentVerification> {
  // In production, this would call the mobile provider's API
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('reference_number', transactionId)
    .single();

  if (error || !data) {
    return {
      transactionId,
      status: 'failed',
      amount: 0
    };
  }

  return {
    transactionId,
    status: data.status as PaymentStatus,
    amount: data.amount,
    paidAt: data.paid_at,
    metadata: data.metadata as Record<string, unknown>
  };
}

async function verifyPayToday(transactionId: string): Promise<PaymentVerification> {
  // In production, this would call the PayToday API
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('reference_number', transactionId)
    .single();

  if (error || !data) {
    return {
      transactionId,
      status: 'failed',
      amount: 0
    };
  }

  return {
    transactionId,
    status: data.status as PaymentStatus,
    amount: data.amount,
    paidAt: data.paid_at,
    metadata: data.metadata as Record<string, unknown>
  };
}

async function logPaymentActivity(
  loanId: string,
  userId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      table_name: 'payments',
      record_id: loanId,
      action,
      user_id: userId,
      new_values: details,
      created_at: new Date().toISOString()
    });
  } catch {
    // Silent fail - don't block payment for audit log failure
  }
}

// ============ Payment Method UI Helpers ============

export interface PaymentMethodOption {
  id: PaymentProvider;
  name: string;
  description: string;
  icon: string;
  processingTime: string;
  available: boolean;
}

export function getAvailablePaymentMethods(): PaymentMethodOption[] {
  return [
    {
      id: 'bank_transfer',
      name: 'Bank Transfer (EFT)',
      description: 'Transfer from your bank account',
      icon: 'building-2',
      processingTime: '1-2 business days',
      available: true
    },
    {
      id: 'mobile_money_mtc',
      name: 'MTC MoMo',
      description: 'Pay with MTC Mobile Money',
      icon: 'smartphone',
      processingTime: 'Instant',
      available: true
    },
    {
      id: 'mobile_money_tn',
      name: 'TN Mobile Money',
      description: 'Pay with TN Mobile Money',
      icon: 'smartphone',
      processingTime: 'Instant',
      available: true
    },
    {
      id: 'paytoday',
      name: 'PayToday',
      description: 'Pay online with PayToday',
      icon: 'credit-card',
      processingTime: 'Instant',
      available: true
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      description: 'Pay in person at our offices',
      icon: 'banknote',
      processingTime: 'Same day',
      available: true
    }
  ];
}

/**
 * Log payment transaction to database
 */
async function logPaymentTransaction(
  request: PaymentRequest,
  reference: string,
  status: PaymentStatus,
  providerResponse?: Record<string, unknown>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        loan_id: request.loanId,
        user_id: request.userId,
        provider: request.provider,
        reference_number: reference,
        amount: request.amount,
        currency: 'NAD',
        status,
        payment_method: request.provider,
        phone_number: request.phoneNumber,
        bank_account: request.bankAccount,
        provider_response: providerResponse,
        metadata: {}
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error logging payment transaction:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in logPaymentTransaction:', error);
    return null;
  }
}

/**
 * Handle incoming payment webhook
 */
export async function handlePaymentWebhook(
  provider: string,
  reference: string,
  status: PaymentStatus,
  providerData: Record<string, unknown>
): Promise<boolean> {
  try {
    // Log webhook
    await supabase
      .from('payment_webhooks')
      .insert({
        provider,
        event_type: 'payment_update',
        reference_number: reference,
        payload: providerData,
        signature_valid: true
      });
    
    // Update transaction
    const { error } = await supabase
      .from('payment_transactions')
      .update({
        status,
        webhook_received_at: new Date().toISOString(),
        webhook_data: providerData,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        failed_at: status === 'failed' ? new Date().toISOString() : null,
        failure_reason: status === 'failed' ? (providerData.error as string) : null
      })
      .eq('reference_number', reference)
      .eq('provider', provider);
    
    if (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
    
    // If completed, update the payment record
    if (status === 'completed') {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString()
        })
        .eq('reference_number', reference);
    }
    
    return true;
  } catch (error) {
    console.error('Error handling webhook:', error);
    return false;
  }
}

/**
 * Get payment history for a loan
 */
export async function getPaymentHistory(loanId: string): Promise<PaymentVerification[]> {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
    
    return (data || []).map(t => ({
      transactionId: t.reference_number,
      status: t.status as PaymentStatus,
      amount: t.amount,
      paidAt: t.completed_at,
      metadata: t.metadata as Record<string, unknown>
    }));
  } catch (error) {
    console.error('Error in getPaymentHistory:', error);
    return [];
  }
}

export default {
  initiatePayment,
  verifyPayment,
  getPaymentInstructions,
  getAvailablePaymentMethods,
  generatePaymentReference,
  handlePaymentWebhook,
  getPaymentHistory
};
