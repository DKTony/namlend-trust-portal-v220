/**
 * IPP/IPS Onboarding Service
 * 
 * Service layer for IPP customer and merchant onboarding flows.
 * Handles all onboarding-related operations per FSD user registration flow.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  IPPOnboardingState,
  IPPListAccPvdResponse,
  IPPListAccountRequest,
  IPPListAccountResponse,
  IPPRegisterMobileRequest,
  IPPRegisterMobileResponse,
  IPPGetAliasRequest,
  IPPGetAliasResponse,
  IPPRegMapperRequest,
  IPPRegMapperResponse,
  IPPSetCredRequest,
  IPPSetCredResponse,
  IPPListKeysResponse,
  GetOrCreateIPPOnboardingResult,
  AdvanceIPPOnboardingStepResult,
  IPPOnboardingSummaryResult,
  GetUsersPendingIPPOnboardingResult,
  AdminInitiateIPPOnboardingResult,
  IPPSoVProvider,
} from '@/types/ips';

// =============================================================================
// CONFIGURATION
// =============================================================================

const IPS_ADAPTER_URL = '/functions/v1/ips-adapter';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Call the IPS adapter edge function for onboarding operations
 */
async function callIPSOnboardingAdapter<T, P = unknown>(
  endpoint: string,
  payload?: P
): Promise<T> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(`${IPS_ADAPTER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(payload || {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IPP onboarding adapter error:', errorText);
      return {
        success: false,
        error: 'IPS_ADAPTER_ERROR',
        errorMessage: `HTTP ${response.status}: ${errorText}`,
      } as T;
    }

    return await response.json();
  } catch (error) {
    console.error('IPP onboarding adapter call error:', error);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Network error',
    } as T;
  }
}

// =============================================================================
// ONBOARDING STATE MANAGEMENT
// =============================================================================

/**
 * Get or create onboarding record for a user
 */
export async function getOrCreateOnboarding(
  userId?: string
): Promise<GetOrCreateIPPOnboardingResult> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_ips_onboarding', {
      p_user_id: userId || null,
    });

    if (error) {
      console.error('Get or create onboarding error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return data as GetOrCreateIPPOnboardingResult;
  } catch (error) {
    console.error('Get or create onboarding error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

/**
 * Advance the onboarding step for a user
 */
export async function advanceOnboardingStep(
  userId: string,
  stepName: string,
  stepData?: Record<string, unknown>,
  success: boolean = true,
  errorCode?: string,
  errorMessage?: string
): Promise<AdvanceIPPOnboardingStepResult> {
  try {
    const { data, error } = await supabase.rpc('advance_ips_onboarding_step', {
      p_user_id: userId,
      p_step_name: stepName,
      p_step_data: stepData || {},
      p_success: success,
      p_error_code: errorCode || null,
      p_error_message: errorMessage || null,
    });

    if (error) {
      console.error('Advance onboarding step error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return data as AdvanceIPPOnboardingStepResult;
  } catch (error) {
    console.error('Advance onboarding step error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

/**
 * Check if a user is ready for IPP payments
 */
export async function isUserIPPReady(userId?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_user_ipp_ready', {
      p_user_id: userId || null,
    });

    if (error) {
      console.error('Is user IPP ready error:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('Is user IPP ready error:', error);
    return false;
  }
}

// =============================================================================
// ADMIN ONBOARDING MANAGEMENT
// =============================================================================

/**
 * Get IPP onboarding summary statistics (admin only)
 */
export async function getOnboardingSummary(): Promise<IPPOnboardingSummaryResult> {
  try {
    const { data, error } = await supabase.rpc('get_ipp_onboarding_summary');

    if (error) {
      console.error('Get onboarding summary error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return data as IPPOnboardingSummaryResult;
  } catch (error) {
    console.error('Get onboarding summary error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

/**
 * Get users pending IPP onboarding (admin only)
 */
export async function getUsersPendingOnboarding(
  limit: number = 50,
  offset: number = 0,
  stateFilter?: IPPOnboardingState
): Promise<GetUsersPendingIPPOnboardingResult> {
  try {
    const { data, error } = await supabase.rpc('get_users_pending_ipp_onboarding', {
      p_limit: limit,
      p_offset: offset,
      p_state_filter: stateFilter || null,
    });

    if (error) {
      console.error('Get users pending onboarding error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return data as GetUsersPendingIPPOnboardingResult;
  } catch (error) {
    console.error('Get users pending onboarding error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

/**
 * Admin initiates IPP onboarding for a user
 */
export async function adminInitiateOnboarding(
  userId: string,
  mobileNumber?: string
): Promise<AdminInitiateIPPOnboardingResult> {
  try {
    const { data, error } = await supabase.rpc('admin_initiate_ipp_onboarding', {
      p_user_id: userId,
      p_mobile_number: mobileNumber || null,
    });

    if (error) {
      console.error('Admin initiate onboarding error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return data as AdminInitiateIPPOnboardingResult;
  } catch (error) {
    console.error('Admin initiate onboarding error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

// =============================================================================
// SOV PROVIDER OPERATIONS
// =============================================================================

/**
 * List available SoV (Store of Value) providers from IPS
 */
export async function listSoVProviders(): Promise<IPPListAccPvdResponse> {
  return callIPSOnboardingAdapter<IPPListAccPvdResponse>('/list-acc-pvd');
}

/**
 * Get cached SoV providers from database
 */
export async function getCachedSoVProviders(): Promise<{
  success: boolean;
  error?: string;
  providers?: IPPSoVProvider[];
}> {
  try {
    const { data, error } = await supabase
      .from('ips_sov_providers')
      .select('*')
      .eq('is_active', true)
      .order('provider_name');

    if (error) {
      console.error('Get cached SoV providers error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return { success: true, providers: data as IPPSoVProvider[] };
  } catch (error) {
    console.error('Get cached SoV providers error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

/**
 * Refresh SoV providers from IPS and update cache
 */
export async function refreshSoVProviders(): Promise<IPPListAccPvdResponse> {
  const response = await listSoVProviders();

  if (response.success && response.providers) {
    // Update cache in database
    for (const provider of response.providers) {
      await supabase
        .from('ips_sov_providers')
        .upsert(
          {
            provider_code: provider.providerCode,
            provider_name: provider.providerName,
            provider_handle: provider.providerHandle,
            supports_debit_card: provider.supportsDebitCard,
            supports_wallet_pin: provider.supportsWalletPin,
            is_active: provider.isActive,
            last_fetched_at: new Date().toISOString(),
          },
          { onConflict: 'provider_code' }
        );
    }
  }

  return response;
}

// =============================================================================
// ACCOUNT OPERATIONS
// =============================================================================

/**
 * List accounts for a user from a specific provider
 */
export async function listAccounts(
  request: IPPListAccountRequest
): Promise<IPPListAccountResponse> {
  return callIPSOnboardingAdapter<IPPListAccountResponse, IPPListAccountRequest>(
    '/list-account',
    request
  );
}

// =============================================================================
// MOBILE REGISTRATION OPERATIONS
// =============================================================================

/**
 * Register a mobile number with IPS
 */
export async function registerMobile(
  request: IPPRegisterMobileRequest
): Promise<IPPRegisterMobileResponse> {
  return callIPSOnboardingAdapter<IPPRegisterMobileResponse, IPPRegisterMobileRequest>(
    '/register-mobile',
    request
  );
}

// =============================================================================
// ALIAS OPERATIONS
// =============================================================================

/**
 * Get alias information from IPS
 */
export async function getAlias(
  request: IPPGetAliasRequest
): Promise<IPPGetAliasResponse> {
  return callIPSOnboardingAdapter<IPPGetAliasResponse, IPPGetAliasRequest>(
    '/get-alias',
    request
  );
}

/**
 * Register or modify an alias in IPS
 */
export async function registerAlias(
  request: IPPRegMapperRequest
): Promise<IPPRegMapperResponse> {
  return callIPSOnboardingAdapter<IPPRegMapperResponse, IPPRegMapperRequest>(
    '/reg-mapper',
    request
  );
}

/**
 * Check if an alias is available
 */
export async function isAliasAvailable(aliasAddress: string): Promise<boolean> {
  const response = await getAlias({ aliasAddress });
  return response.success && !response.exists;
}

// =============================================================================
// CREDENTIAL OPERATIONS
// =============================================================================

/**
 * Set or change IPS PIN
 */
export async function setCredential(
  request: IPPSetCredRequest
): Promise<IPPSetCredResponse> {
  return callIPSOnboardingAdapter<IPPSetCredResponse, IPPSetCredRequest>(
    '/set-cred',
    request
  );
}

// =============================================================================
// KEY MANAGEMENT
// =============================================================================

/**
 * List public keys from IPS for credential encryption
 */
export async function listKeys(orgId?: string): Promise<IPPListKeysResponse> {
  return callIPSOnboardingAdapter<IPPListKeysResponse>('/list-keys', { orgId });
}

/**
 * Get cached keys from database
 */
export async function getCachedKeys(orgId?: string): Promise<{
  success: boolean;
  error?: string;
  keys?: Array<{
    key_id: string;
    org_id: string;
    key_type: string;
    public_key: string;
    valid_from: string;
    valid_to: string;
  }>;
}> {
  try {
    let query = supabase
      .from('ips_keys_cache')
      .select('key_id, org_id, key_type, public_key, valid_from, valid_to')
      .eq('is_active', true)
      .gte('valid_to', new Date().toISOString());

    if (orgId) {
      query = query.eq('org_id', orgId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get cached keys error:', error);
      return { success: false, error: 'DATABASE_ERROR' };
    }

    return { success: true, keys: data };
  } catch (error) {
    console.error('Get cached keys error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

// =============================================================================
// COMPLETE ONBOARDING FLOW ORCHESTRATOR
// =============================================================================

/**
 * Execute a complete onboarding step with IPS call and state update
 */
export async function executeOnboardingStep<T extends { success: boolean; error?: string; errorCode?: string; errorMessage?: string }>(
  userId: string,
  stepName: string,
  ipsOperation: () => Promise<T>,
  extractStepData?: (response: T) => Record<string, unknown>
): Promise<{
  success: boolean;
  error?: string;
  ipsResponse?: T;
  onboardingResult?: AdvanceIPPOnboardingStepResult;
}> {
  try {
    // Execute IPS operation
    const ipsResponse = await ipsOperation();

    // Extract step data if extractor provided
    const stepData = extractStepData ? extractStepData(ipsResponse) : {};

    // Update onboarding state
    const onboardingResult = await advanceOnboardingStep(
      userId,
      stepName,
      stepData,
      ipsResponse.success,
      ipsResponse.errorCode,
      ipsResponse.errorMessage
    );

    return {
      success: ipsResponse.success && onboardingResult.success,
      error: ipsResponse.error || onboardingResult.error,
      ipsResponse,
      onboardingResult,
    };
  } catch (error) {
    console.error('Execute onboarding step error:', error);
    
    // Record the failure
    await advanceOnboardingStep(
      userId,
      stepName,
      {},
      false,
      'UNEXPECTED_ERROR',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
    };
  }
}

/**
 * Select a SoV provider for the user
 */
export async function selectSoVProvider(
  userId: string,
  providerCode: string,
  providerName: string,
  providerHandle: string
): Promise<AdvanceIPPOnboardingStepResult> {
  return advanceOnboardingStep(userId, 'sov_selection', {
    sov_provider_code: providerCode,
    sov_provider_name: providerName,
    sov_provider_handle: providerHandle,
  });
}

/**
 * Select an account for linking
 */
export async function selectAccount(
  userId: string,
  accountRef: string,
  accountMasked: string,
  accountType: string,
  ifsc?: string
): Promise<AdvanceIPPOnboardingStepResult> {
  return advanceOnboardingStep(userId, 'list_accounts', {
    selected_account_ref: accountRef,
    selected_account_masked: accountMasked,
    selected_account_type: accountType,
    selected_account_ifsc: ifsc,
  });
}

/**
 * Complete mobile registration and verification
 */
export async function completeMobileRegistration(
  userId: string,
  mobileNumber: string,
  providerCode: string,
  accountRef: string
): Promise<{
  success: boolean;
  error?: string;
  registered?: boolean;
}> {
  const result = await executeOnboardingStep(
    userId,
    'verification',
    () => registerMobile({ userId, mobileNumber, providerCode, accountRef }),
    (response) => ({
      verification_method: 'MOBILE_REGISTRATION',
      verified_at: new Date().toISOString(),
    })
  );

  return {
    success: result.success,
    error: result.error,
    registered: result.ipsResponse?.registered as boolean,
  };
}

/**
 * Complete alias registration
 */
export async function completeAliasRegistration(
  userId: string,
  aliasAddress: string,
  mobileNumber: string,
  entityType: 'PERSON' | 'ENTITY' = 'PERSON'
): Promise<{
  success: boolean;
  error?: string;
  cmId?: string;
}> {
  const result = await executeOnboardingStep(
    userId,
    'register_alias',
    () => registerAlias({ userId, aliasAddress, entityType, mobileNumber, operation: 'ADD' }),
    (response) => ({
      long_alias: aliasAddress,
      short_alias_mobile: mobileNumber,
      cm_id: response.cmId,
      mobile_id_status: response.status || 'ACTIVE',
    })
  );

  return {
    success: result.success,
    error: result.error,
    cmId: result.ipsResponse?.cmId as string,
  };
}

/**
 * Complete IPS PIN setup
 */
export async function completeIPSPinSetup(
  userId: string,
  mobileNumber: string,
  providerCode: string,
  encryptedPin: string,
  keyId?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const result = await executeOnboardingStep(
    userId,
    'set_ips_pin',
    () => setCredential({
      userId,
      mobileNumber,
      providerCode,
      operation: 'SET',
      encryptedNewPin: encryptedPin,
      keyId,
    })
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Mark onboarding as complete
 */
export async function markOnboardingComplete(
  userId: string
): Promise<AdvanceIPPOnboardingStepResult> {
  return advanceOnboardingStep(userId, 'complete', {});
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a suggested alias for a user
 */
export function generateSuggestedAlias(
  firstName: string,
  lastName: string,
  providerHandle: string
): string {
  const baseName = `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}`;
  const random = Math.floor(Math.random() * 1000);
  return `${baseName}${random}@${providerHandle}`;
}

/**
 * Validate alias format
 */
export function isValidAliasFormat(alias: string): boolean {
  const aliasRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return aliasRegex.test(alias);
}

/**
 * Extract provider handle from alias
 */
export function getProviderFromAlias(alias: string): string | null {
  const parts = alias.split('@');
  return parts.length === 2 ? parts[1] : null;
}
