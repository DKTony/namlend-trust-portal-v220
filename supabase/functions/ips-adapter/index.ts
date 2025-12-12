/**
 * IPS Adapter Edge Function
 * 
 * Handles all communication with the IPS (Instant Payment Solution) platform.
 * This is a mock implementation for development - replace with actual IPS API calls in production.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =============================================================================
// TYPES
// =============================================================================

interface IPSPayRequest {
  ipsTransactionId: string;
  msgId: string;
  txnId: string;
  amount: number;
  currency: string;
  payerVpa: string;
  payerName?: string;
  payeeVpa: string;
  payeeName?: string;
  purposeCode: string;
  note?: string;
  customerRef?: string;
}

interface IPSPayResponse {
  success: boolean;
  error?: string;
  ipsResult?: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'DEEMED';
  ipsErrorCode?: string;
  ipsTxnId?: string;
  ipsRrn?: string;
  errorMessage?: string;
}

interface IPSValidateVPARequest {
  vpa: string;
}

interface IPSValidateVPAResponse {
  success: boolean;
  error?: string;
  isValid?: boolean;
  accountHolderName?: string;
  accountMasked?: string;
  ifscCode?: string;
  providerName?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSCheckStatusRequest {
  ipsTransactionId: string;
  orgMsgId: string;
  orgTxnId: string;
}

interface IPSCheckStatusResponse {
  success: boolean;
  error?: string;
  ipsResult?: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'DEEMED';
  ipsErrorCode?: string;
  ipsTxnId?: string;
  ipsRrn?: string;
  errorMessage?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const IPS_CONFIG = {
  enabled: Deno.env.get('IPS_ENABLED') === 'true',
  environment: Deno.env.get('IPS_ENVIRONMENT') || 'development',
  orgId: Deno.env.get('IPS_ORG_ID') || 'NAMLEND',
  baseUrl: Deno.env.get('IPS_BASE_URL') || 'https://ips-uat.bon.na/api/v2',
  requestTimeoutMs: parseInt(Deno.env.get('IPS_REQUEST_TIMEOUT_MS') || '30000'),
};

const MOCK_MODE = IPS_CONFIG.environment === 'development' || !IPS_CONFIG.enabled;

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================================================
// MOCK RESPONSES (for development)
// =============================================================================

function getMockPayResponse(request: IPSPayRequest): IPSPayResponse {
  // Simulate different scenarios based on amount or VPA
  const amount = request.amount;
  const payeeVpa = request.payeeVpa.toLowerCase();
  
  // Simulate failures for testing
  if (payeeVpa.includes('fail')) {
    return {
      success: false,
      ipsResult: 'FAILURE',
      ipsErrorCode: '51',
      errorMessage: 'Simulated failure for testing',
    };
  }
  
  if (payeeVpa.includes('timeout')) {
    return {
      success: true,
      ipsResult: 'PENDING',
      ipsErrorCode: 'XP',
      ipsTxnId: `IPS${Date.now()}`,
      errorMessage: 'Transaction pending',
    };
  }
  
  if (amount > 50000) {
    return {
      success: false,
      ipsResult: 'FAILURE',
      ipsErrorCode: '61',
      errorMessage: 'Amount exceeds transaction limit',
    };
  }
  
  // Success response
  return {
    success: true,
    ipsResult: 'SUCCESS',
    ipsErrorCode: '00',
    ipsTxnId: `IPS${Date.now()}`,
    ipsRrn: `RRN${Date.now().toString().slice(-12)}`,
  };
}

function getMockValidateVPAResponse(vpa: string): IPSValidateVPAResponse {
  // Simulate VPA validation
  if (!vpa.includes('@')) {
    return {
      success: false,
      isValid: false,
      errorCode: 'XJ',
      errorMessage: 'Invalid VPA format',
    };
  }
  
  const [username, provider] = vpa.split('@');
  
  if (provider.includes('invalid')) {
    return {
      success: false,
      isValid: false,
      errorCode: 'XK',
      errorMessage: 'VPA not registered',
    };
  }
  
  // Valid VPA
  return {
    success: true,
    isValid: true,
    accountHolderName: `Account Holder (${username})`,
    accountMasked: '****1234',
    ifscCode: 'FNBN0001234',
    providerName: provider.toUpperCase(),
  };
}

function getMockCheckStatusResponse(request: IPSCheckStatusRequest): IPSCheckStatusResponse {
  // In mock mode, always return success for status checks
  return {
    success: true,
    ipsResult: 'SUCCESS',
    ipsErrorCode: '00',
    ipsTxnId: `IPS${Date.now()}`,
    ipsRrn: `RRN${Date.now().toString().slice(-12)}`,
  };
}

// =============================================================================
// IPS API CALLS (Production)
// =============================================================================

async function callIPSPay(request: IPSPayRequest): Promise<IPSPayResponse> {
  if (MOCK_MODE) {
    // Add artificial delay to simulate network
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    return getMockPayResponse(request);
  }
  
  // TODO: Implement actual IPS API call
  // This would involve:
  // 1. Building XML message per UPI-Payment.xsd
  // 2. Signing the message with X.509 certificate
  // 3. Sending to IPS endpoint
  // 4. Parsing XML response
  
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSValidateVPA(vpa: string): Promise<IPSValidateVPAResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    return getMockValidateVPAResponse(vpa);
  }
  
  // TODO: Implement actual IPS ReqValAdd API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSCheckStatus(request: IPSCheckStatusRequest): Promise<IPSCheckStatusResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    return getMockCheckStatusResponse(request);
  }
  
  // TODO: Implement actual IPS ReqChkTxn API call
  throw new Error('Production IPS integration not yet implemented');
}

// =============================================================================
// LOGGING
// =============================================================================

async function logAPICall(
  supabase: ReturnType<typeof createClient>,
  correlationId: string,
  ipsTransactionId: string | null,
  apiName: string,
  direction: 'OUTBOUND' | 'INBOUND' | 'CALLBACK',
  requestSummary: Record<string, unknown> | null,
  responseSummary: Record<string, unknown> | null,
  httpStatus: number | null,
  ipsResult: string | null,
  errorCode: string | null,
  sentAt: Date | null,
  receivedAt: Date | null
) {
  try {
    await supabase.from('ips_api_logs').insert({
      correlation_id: correlationId,
      ips_transaction_id: ipsTransactionId,
      api_name: apiName,
      direction,
      request_summary: requestSummary,
      response_summary: responseSummary,
      http_status: httpStatus,
      ips_result: ipsResult,
      error_code: errorCode,
      sent_at: sentAt?.toISOString(),
      received_at: receivedAt?.toISOString(),
      duration_ms: sentAt && receivedAt ? receivedAt.getTime() - sentAt.getTime() : null,
      environment: IPS_CONFIG.environment,
    });
  } catch (error) {
    console.error('Failed to log API call:', error);
  }
}

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

async function handlePay(
  supabase: ReturnType<typeof createClient>,
  request: IPSPayRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Processing payment:`, {
    msgId: request.msgId,
    amount: request.amount,
    payerVpa: request.payerVpa,
    payeeVpa: request.payeeVpa,
  });
  
  // Update transaction status to 'sent'
  await supabase
    .from('ips_transactions')
    .update({ status: 'sent', sent_at: sentAt.toISOString() })
    .eq('id', request.ipsTransactionId);
  
  try {
    const response = await callIPSPay(request);
    const receivedAt = new Date();
    
    // Log the API call
    await logAPICall(
      supabase,
      correlationId,
      request.ipsTransactionId,
      'ReqPay',
      'OUTBOUND',
      {
        msgId: request.msgId,
        txnId: request.txnId,
        amount: request.amount,
        payerVpa: request.payerVpa,
        payeeVpa: request.payeeVpa,
      },
      {
        ipsResult: response.ipsResult,
        ipsErrorCode: response.ipsErrorCode,
        ipsTxnId: response.ipsTxnId,
        ipsRrn: response.ipsRrn,
      },
      response.success ? 200 : 400,
      response.ipsResult || null,
      response.ipsErrorCode || null,
      sentAt,
      receivedAt
    );
    
    console.log(`[${correlationId}] Payment response:`, response);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] Payment error:`, error);
    
    const errorResponse: IPSPayResponse = {
      success: false,
      error: 'IPS_ERROR',
      ipsResult: 'FAILURE',
      ipsErrorCode: '96',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
    
    await logAPICall(
      supabase,
      correlationId,
      request.ipsTransactionId,
      'ReqPay',
      'OUTBOUND',
      { msgId: request.msgId, txnId: request.txnId },
      { error: errorResponse.errorMessage },
      500,
      'FAILURE',
      '96',
      sentAt,
      new Date()
    );
    
    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Return 200 so the client can handle the error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleValidateVPA(
  supabase: ReturnType<typeof createClient>,
  request: IPSValidateVPARequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Validating VPA:`, request.vpa);
  
  try {
    const response = await callIPSValidateVPA(request.vpa);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqValAdd',
      'OUTBOUND',
      { vpa: request.vpa },
      {
        isValid: response.isValid,
        accountHolderName: response.accountHolderName,
        errorCode: response.errorCode,
      },
      response.success ? 200 : 400,
      response.isValid ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] VPA validation error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'VALIDATION_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleCheckStatus(
  supabase: ReturnType<typeof createClient>,
  request: IPSCheckStatusRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Checking status for:`, request.orgTxnId);
  
  try {
    const response = await callIPSCheckStatus(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      request.ipsTransactionId,
      'ReqChkTxn',
      'OUTBOUND',
      { orgMsgId: request.orgMsgId, orgTxnId: request.orgTxnId },
      {
        ipsResult: response.ipsResult,
        ipsErrorCode: response.ipsErrorCode,
        ipsTxnId: response.ipsTxnId,
      },
      response.success ? 200 : 400,
      response.ipsResult || null,
      response.ipsErrorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] Status check error:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'STATUS_CHECK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  // Parse URL to get endpoint
  const url = new URL(req.url);
  const endpoint = url.pathname.replace('/ips-adapter', '');
  
  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const body = await req.json();
    
    switch (endpoint) {
      case '/pay':
        return await handlePay(supabase, body as IPSPayRequest);
      
      case '/validate-vpa':
        return await handleValidateVPA(supabase, body as IPSValidateVPARequest);
      
      case '/check-status':
        return await handleCheckStatus(supabase, body as IPSCheckStatusRequest);
      
      default:
        return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('IPS Adapter error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
