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
// ONBOARDING TYPES
// =============================================================================

interface IPSListAccPvdRequest {
  // No parameters needed - lists all available providers
}

interface IPSListAccPvdResponse {
  success: boolean;
  error?: string;
  providers?: Array<{
    providerCode: string;
    providerName: string;
    providerHandle: string;
    supportsDebitCard: boolean;
    supportsWalletPin: boolean;
    isActive: boolean;
  }>;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSListAccountRequest {
  userId: string;
  mobileNumber: string;
  providerCode: string;
}

interface IPSListAccountResponse {
  success: boolean;
  error?: string;
  accounts?: Array<{
    accRefNumber: string;
    accType: string;
    maskedAccNumber: string;
    accountHolderName: string;
    ifsc?: string;
    mmid?: string;
    allowedCredentials: string[];
  }>;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSRegisterMobileRequest {
  userId: string;
  mobileNumber: string;
  providerCode: string;
  accountRef: string;
  // Encrypted credentials (from Common Library)
  encryptedOtp?: string;
  encryptedPin?: string;
  encryptedCardDigits?: string;
  encryptedExpDate?: string;
  keyId?: string;
}

interface IPSRegisterMobileResponse {
  success: boolean;
  error?: string;
  registered?: boolean;
  ipsPinSet?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSGetAliasRequest {
  aliasAddress: string;
  mobileNumber?: string;
}

interface IPSGetAliasResponse {
  success: boolean;
  error?: string;
  exists?: boolean;
  status?: string;
  entityType?: string;
  cmId?: string;
  expiryTs?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSRegMapperRequest {
  userId: string;
  aliasAddress: string;
  entityType: 'PERSON' | 'ENTITY';
  mobileNumber: string;
  numericId?: string;
  operation: 'ADD' | 'MODIFY' | 'BLOCK' | 'UNBLOCK' | 'DEREGISTER';
}

interface IPSRegMapperResponse {
  success: boolean;
  error?: string;
  registered?: boolean;
  cmId?: string;
  status?: string;
  expiryTs?: string;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSSetCredRequest {
  userId: string;
  mobileNumber: string;
  providerCode: string;
  operation: 'SET' | 'CHANGE' | 'RESET';
  encryptedOldPin?: string;
  encryptedNewPin: string;
  keyId?: string;
}

interface IPSSetCredResponse {
  success: boolean;
  error?: string;
  updated?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

interface IPSListKeysRequest {
  orgId?: string;
}

interface IPSListKeysResponse {
  success: boolean;
  error?: string;
  keys?: Array<{
    keyId: string;
    orgId: string;
    keyType: string;
    publicKey: string;
    validFrom: string;
    validTo: string;
  }>;
  errorCode?: string;
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
// MOCK RESPONSES FOR ONBOARDING (development)
// =============================================================================

function getMockListAccPvdResponse(): IPSListAccPvdResponse {
  return {
    success: true,
    providers: [
      { providerCode: 'FNB', providerName: 'First National Bank Namibia', providerHandle: 'fnb', supportsDebitCard: true, supportsWalletPin: false, isActive: true },
      { providerCode: 'SBN', providerName: 'Standard Bank Namibia', providerHandle: 'sbn', supportsDebitCard: true, supportsWalletPin: false, isActive: true },
      { providerCode: 'NED', providerName: 'Nedbank Namibia', providerHandle: 'nedbank', supportsDebitCard: true, supportsWalletPin: false, isActive: true },
      { providerCode: 'BOW', providerName: 'Bank Windhoek', providerHandle: 'bankwindhoek', supportsDebitCard: true, supportsWalletPin: false, isActive: true },
      { providerCode: 'NAMPOST', providerName: 'NamPost Savings Bank', providerHandle: 'nampost', supportsDebitCard: false, supportsWalletPin: true, isActive: true },
      { providerCode: 'MTC', providerName: 'MTC Mobile Money', providerHandle: 'mtc', supportsDebitCard: false, supportsWalletPin: true, isActive: true },
      { providerCode: 'TN', providerName: 'TN Mobile Money', providerHandle: 'tn', supportsDebitCard: false, supportsWalletPin: true, isActive: true },
    ],
  };
}

function getMockListAccountResponse(request: IPSListAccountRequest): IPSListAccountResponse {
  // Return mock accounts based on provider
  const providerAccounts: Record<string, Array<{ accRefNumber: string; accType: string; maskedAccNumber: string; accountHolderName: string; ifsc?: string; allowedCredentials: string[] }>> = {
    'FNB': [
      { accRefNumber: 'FNB001', accType: 'SAVINGS', maskedAccNumber: '****5678', accountHolderName: 'Test User', ifsc: 'FNBN001', allowedCredentials: ['OTP', 'PIN'] },
      { accRefNumber: 'FNB002', accType: 'CURRENT', maskedAccNumber: '****1234', accountHolderName: 'Test User', ifsc: 'FNBN001', allowedCredentials: ['OTP', 'PIN'] },
    ],
    'SBN': [
      { accRefNumber: 'SBN001', accType: 'SAVINGS', maskedAccNumber: '****9012', accountHolderName: 'Test User', ifsc: 'SBNN001', allowedCredentials: ['OTP', 'PIN'] },
    ],
    'MTC': [
      { accRefNumber: 'MTC001', accType: 'WALLET', maskedAccNumber: '****' + request.mobileNumber.slice(-4), accountHolderName: 'Test User', allowedCredentials: ['PIN'] },
    ],
    'TN': [
      { accRefNumber: 'TN001', accType: 'WALLET', maskedAccNumber: '****' + request.mobileNumber.slice(-4), accountHolderName: 'Test User', allowedCredentials: ['PIN'] },
    ],
  };

  return {
    success: true,
    accounts: providerAccounts[request.providerCode] || [
      { accRefNumber: 'DEFAULT001', accType: 'SAVINGS', maskedAccNumber: '****0000', accountHolderName: 'Test User', allowedCredentials: ['OTP', 'PIN'] },
    ],
  };
}

function getMockRegisterMobileResponse(request: IPSRegisterMobileRequest): IPSRegisterMobileResponse {
  // Simulate successful registration
  return {
    success: true,
    registered: true,
    ipsPinSet: true,
  };
}

function getMockGetAliasResponse(request: IPSGetAliasRequest): IPSGetAliasResponse {
  // Check if alias exists (simulate)
  const aliasExists = !request.aliasAddress.includes('new');
  
  if (aliasExists) {
    return {
      success: true,
      exists: true,
      status: 'ACTIVE',
      entityType: 'PERSON',
      cmId: `CM${Date.now()}`,
      expiryTs: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  
  return {
    success: true,
    exists: false,
  };
}

function getMockRegMapperResponse(request: IPSRegMapperRequest): IPSRegMapperResponse {
  // Simulate successful alias registration
  const expiryTs = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    success: true,
    registered: request.operation === 'ADD' || request.operation === 'MODIFY',
    cmId: `CM${Date.now()}`,
    status: request.operation === 'DEREGISTER' ? 'DEREGISTER' : 'ACTIVE',
    expiryTs,
  };
}

function getMockSetCredResponse(request: IPSSetCredRequest): IPSSetCredResponse {
  // Simulate successful PIN set/change
  return {
    success: true,
    updated: true,
  };
}

function getMockListKeysResponse(request: IPSListKeysRequest): IPSListKeysResponse {
  // Return mock public keys
  return {
    success: true,
    keys: [
      {
        keyId: 'KEY001',
        orgId: request.orgId || 'NAMLEND',
        keyType: 'encryption',
        publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...', // Truncated mock key
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
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
// IPS ONBOARDING API CALLS (Production stubs + mock mode)
// =============================================================================

async function callIPSListAccPvd(): Promise<IPSListAccPvdResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    return getMockListAccPvdResponse();
  }
  // TODO: Implement actual IPS ReqListAccPvd API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSListAccount(request: IPSListAccountRequest): Promise<IPSListAccountResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    return getMockListAccountResponse(request);
  }
  // TODO: Implement actual IPS ReqListAccount API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSRegisterMobile(request: IPSRegisterMobileRequest): Promise<IPSRegisterMobileResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    return getMockRegisterMobileResponse(request);
  }
  // TODO: Implement actual IPS ReqRegMob API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSGetAlias(request: IPSGetAliasRequest): Promise<IPSGetAliasResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    return getMockGetAliasResponse(request);
  }
  // TODO: Implement actual IPS ReqGetAdd API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSRegMapper(request: IPSRegMapperRequest): Promise<IPSRegMapperResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
    return getMockRegMapperResponse(request);
  }
  // TODO: Implement actual IPS ReqRegMapper API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSSetCred(request: IPSSetCredRequest): Promise<IPSSetCredResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));
    return getMockSetCredResponse(request);
  }
  // TODO: Implement actual IPS ReqSetCre API call
  throw new Error('Production IPS integration not yet implemented');
}

async function callIPSListKeys(request: IPSListKeysRequest): Promise<IPSListKeysResponse> {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    return getMockListKeysResponse(request);
  }
  // TODO: Implement actual IPS ReqListKeys API call
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
// ONBOARDING REQUEST HANDLERS
// =============================================================================

async function handleListAccPvd(
  supabase: ReturnType<typeof createClient>
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Listing SoV providers`);
  
  try {
    const response = await callIPSListAccPvd();
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqListAccPvd',
      'OUTBOUND',
      {},
      { providerCount: response.providers?.length || 0 },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] List providers error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'LIST_PROVIDERS_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleListAccount(
  supabase: ReturnType<typeof createClient>,
  request: IPSListAccountRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Listing accounts for:`, request.mobileNumber, request.providerCode);
  
  try {
    const response = await callIPSListAccount(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqListAccount',
      'OUTBOUND',
      { providerCode: request.providerCode, mobileNumber: request.mobileNumber?.slice(-4) },
      { accountCount: response.accounts?.length || 0 },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] List accounts error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'LIST_ACCOUNTS_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleRegisterMobile(
  supabase: ReturnType<typeof createClient>,
  request: IPSRegisterMobileRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Registering mobile:`, request.mobileNumber, request.providerCode);
  
  try {
    const response = await callIPSRegisterMobile(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqRegMob',
      'OUTBOUND',
      { providerCode: request.providerCode, accountRef: request.accountRef },
      { registered: response.registered, ipsPinSet: response.ipsPinSet },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] Register mobile error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'REGISTER_MOBILE_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetAlias(
  supabase: ReturnType<typeof createClient>,
  request: IPSGetAliasRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Getting alias:`, request.aliasAddress);
  
  try {
    const response = await callIPSGetAlias(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqGetAdd',
      'OUTBOUND',
      { aliasAddress: request.aliasAddress },
      { exists: response.exists, status: response.status },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] Get alias error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'GET_ALIAS_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleRegMapper(
  supabase: ReturnType<typeof createClient>,
  request: IPSRegMapperRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] RegMapper operation:`, request.operation, request.aliasAddress);
  
  try {
    const response = await callIPSRegMapper(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqRegMapper',
      'OUTBOUND',
      { aliasAddress: request.aliasAddress, operation: request.operation, entityType: request.entityType },
      { registered: response.registered, cmId: response.cmId, status: response.status },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] RegMapper error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'REG_MAPPER_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleSetCred(
  supabase: ReturnType<typeof createClient>,
  request: IPSSetCredRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] SetCred operation:`, request.operation);
  
  try {
    const response = await callIPSSetCred(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqSetCre',
      'OUTBOUND',
      { operation: request.operation, providerCode: request.providerCode },
      { updated: response.updated },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] SetCred error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'SET_CRED_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleListKeys(
  supabase: ReturnType<typeof createClient>,
  request: IPSListKeysRequest
): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const sentAt = new Date();
  
  console.log(`[${correlationId}] Listing keys for:`, request.orgId || 'all');
  
  try {
    const response = await callIPSListKeys(request);
    const receivedAt = new Date();
    
    await logAPICall(
      supabase,
      correlationId,
      null,
      'ReqListKeys',
      'OUTBOUND',
      { orgId: request.orgId },
      { keyCount: response.keys?.length || 0 },
      response.success ? 200 : 400,
      response.success ? 'SUCCESS' : 'FAILURE',
      response.errorCode || null,
      sentAt,
      receivedAt
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${correlationId}] List keys error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'LIST_KEYS_ERROR',
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
      
      // IPP Onboarding endpoints
      case '/list-acc-pvd':
        return await handleListAccPvd(supabase);
      
      case '/list-account':
        return await handleListAccount(supabase, body as IPSListAccountRequest);
      
      case '/register-mobile':
        return await handleRegisterMobile(supabase, body as IPSRegisterMobileRequest);
      
      case '/get-alias':
        return await handleGetAlias(supabase, body as IPSGetAliasRequest);
      
      case '/reg-mapper':
        return await handleRegMapper(supabase, body as IPSRegMapperRequest);
      
      case '/set-cred':
        return await handleSetCred(supabase, body as IPSSetCredRequest);
      
      case '/list-keys':
        return await handleListKeys(supabase, body as IPSListKeysRequest);
      
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
