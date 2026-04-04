import { ConvexError } from 'convex/values';

/**
 * Extract a user-friendly message from a Convex mutation error.
 * Returns specific messages for known error codes (FORBIDDEN, NOT_FOUND, etc.)
 * and falls back to the provided default message.
 */
export function handleMutationError(error: unknown, fallbackMessage: string): string {
  if (error instanceof ConvexError) {
    const data = error.data as Record<string, unknown> | undefined;
    if (data?.code === 'FORBIDDEN') return 'Admin access required for this action.';
    if (data?.code === 'NOT_FOUND') return String(data.message ?? 'Record not found.');
    if (data?.code === 'VALIDATION') return String(data.message ?? 'Validation error.');
    if (data?.code === 'INVALID_STATE')
      return String(data.message ?? 'Invalid state for this operation.');
    if (data?.message) return String(data.message);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}
