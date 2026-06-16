import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

/**
 * Standard service result type for consistent API responses
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Extended service result with additional metadata
 */
export interface ServiceResultWithMeta<T> extends ServiceResult<T> {
  meta?: {
    duration?: number;
    cached?: boolean;
    source?: string;
  };
}

/**
 * RPC result type (can be any shape, we extract success/error from it)
 * Using a more permissive type to allow any result shape from RPC calls
 */

type RpcResult = { success?: boolean; error?: string } & Record<string, any>;

/**
 * Generic wrapper for service operations that handles the repetitive try/catch pattern.
 * Eliminates ~500 lines of boilerplate across service files.
 *
 * @param operation - Async function that returns Supabase query result
 * @param context - Operation name for logging/error context
 * @param params - Optional parameters for error context
 * @returns Standardized ServiceResult
 *
 * @example
 * // Before (verbose pattern):
 * export async function getLoans(): Promise<{ success: boolean; loans?: Loan[]; error?: string }> {
 *   try {
 *     debugLog('📋 Fetching loans');
 *     const { data, error } = await supabase.from('loans').select('*');
 *     if (error) {
 *       debugLog('❌ Get loans failed', error);
 *       return { success: false, error: error.message };
 *     }
 *     debugLog('✅ Loans retrieved', { count: data?.length });
 *     return { success: true, loans: data };
 *   } catch (error) {
 *     handleDatabaseError(error, 'getLoans', {});
 *     return { success: false, error: 'Unexpected error occurred' };
 *   }
 * }
 *
 * // After (simplified with wrapper):
 * export async function getLoans(): Promise<ServiceResult<Loan[]>> {
 *   return withServiceResult(
 *     () => supabase.from('loans').select('*'),
 *     'getLoans'
 *   );
 * }
 */

export async function withServiceResult<T>(
  operation: () => PromiseLike<{ data: any; error: any }>,
  context: string,
  params?: Record<string, unknown>
): Promise<ServiceResult<T>> {
  try {
    debugLog(`🔄 ${context}`, params || {});

    const { data, error } = await operation();

    if (error) {
      debugLog(`❌ ${context} failed`, error);
      return { success: false, error: error.message };
    }

    debugLog(`✅ ${context} succeeded`, { hasData: data !== null });
    return { success: true, data: data ?? undefined };
  } catch (error) {
    debugLog(`❌ ${context} unexpected error`, error);
    handleDatabaseError(error, context, params);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Wrapper for RPC operations that return { success, error, ...data } shape.
 * Handles the common RPC response pattern used across the codebase.
 *
 * @param operation - Async function that returns RPC result
 * @param context - Operation name for logging/error context
 * @param params - Optional parameters for error context
 * @returns The RPC result with consistent error handling
 *
 * @example
 * export async function processPayment(input: PaymentInput): Promise<ProcessPaymentResult> {
 *   return withRpcResult(
 *     () => supabase.rpc('process_loan_payment', { p_loan_id: input.loanId, ... }),
 *     'processPayment',
 *     { loanId: input.loanId }
 *   );
 * }
 */

export async function withRpcResult<T extends RpcResult>(
  operation: () => PromiseLike<{ data: any; error: any }>,
  context: string,
  params?: Record<string, unknown>
): Promise<T> {
  try {
    debugLog(`🔄 ${context}`, params || {});

    const { data, error } = await operation();

    if (error) {
      debugLog(`❌ ${context} failed`, error);
      return { success: false, error: error.message } as T;
    }

    if (!data) {
      debugLog(`❌ ${context} returned no data`);
      return { success: false, error: 'No data returned' } as T;
    }

    // Check if RPC returned an error in the result
    if (data.success === false) {
      debugLog(`❌ ${context} returned error`, data.error);
      return data;
    }

    debugLog(`✅ ${context} succeeded`);
    return data;
  } catch (error) {
    debugLog(`❌ ${context} unexpected error`, error);
    handleDatabaseError(error, context, params);
    return { success: false, error: 'Unexpected error occurred' } as T;
  }
}

/**
 * Wrapper with performance measurement for operations that need timing.
 * Combines withServiceResult with measurePerformance.
 *
 * @param operation - Async function that returns Supabase query result
 * @param context - Operation name for logging/error context
 * @param params - Optional parameters for error context
 * @returns Standardized ServiceResult with performance tracking
 */

export async function withMeasuredServiceResult<T>(
  operation: () => PromiseLike<{ data: any; error: any }>,
  context: string,
  params?: Record<string, unknown>
): Promise<ServiceResult<T>> {
  return measurePerformance(context, () => withServiceResult(operation, context, params));
}

/**
 * Wrapper with performance measurement for RPC operations.
 * Combines withRpcResult with measurePerformance.
 */

export async function withMeasuredRpcResult<T extends RpcResult>(
  operation: () => PromiseLike<{ data: any; error: any }>,
  context: string,
  params?: Record<string, unknown>
): Promise<T> {
  return measurePerformance(context, () => withRpcResult(operation, context, params));
}

/**
 * Extract array data with count logging
 */

export async function withArrayResult<T>(
  operation: () => PromiseLike<{ data: any; error: any }>,
  context: string,
  params?: Record<string, unknown>
): Promise<ServiceResult<T[]> & { count?: number }> {
  const result = await withServiceResult<T[]>(operation, context, params);

  if (result.success && Array.isArray(result.data)) {
    const count = (result.data as T[]).length;
    debugLog(`📊 ${context} count: ${count}`);
    return { ...result, data: result.data as T[], count };
  }

  return { ...result, data: (result.data ?? []) as T[] };
}

/**
 * Extract single item with existence check
 */

export async function withSingleResult<T>(
  operation: () => PromiseLike<{ data: any; error: any }>,
  context: string,
  notFoundMessage?: string,
  params?: Record<string, unknown>
): Promise<ServiceResult<T>> {
  const result = await withServiceResult<T>(operation, context, params);

  if (result.success && !result.data) {
    return {
      success: false,
      error: notFoundMessage || `${context}: Record not found`,
    };
  }

  return result as ServiceResult<T>;
}

/**
 * Type guard for checking if result was successful
 */
export function isSuccess<T>(result: ServiceResult<T>): result is ServiceResult<T> & { data: T } {
  return result.success && result.data !== undefined;
}

/**
 * Transform successful result data
 */
export function mapResult<T, U>(
  result: ServiceResult<T>,
  transform: (data: T) => U
): ServiceResult<U> {
  if (!result.success || result.data === undefined) {
    return { success: false, error: result.error };
  }
  return { success: true, data: transform(result.data) };
}
