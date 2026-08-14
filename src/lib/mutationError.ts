import { ConvexError } from 'convex/values';

export const BACKEND_CATALOG_STALE_HINT =
  'Backend catalog is behind the UI — restart npx convex dev (or redeploy) then retry.';

const CODE_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'Admin access required for this action.',
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return undefined;
}

/** Pull structured Convex error data from the several shapes the client can throw. */
export function getConvexErrorData(error: unknown): Record<string, unknown> | undefined {
  if (error instanceof ConvexError) {
    return asRecord(error.data);
  }
  if (error && typeof error === 'object' && 'data' in error) {
    const data = asRecord((error as { data: unknown }).data);
    if (data) return data;
  }
  if (error instanceof Error) {
    const match = error.message.match(/Uncaught ConvexError:\s*(\{[\s\S]*\})/);
    if (match?.[1]) {
      try {
        return asRecord(JSON.parse(match[1]));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function withCatalogHint(message: string): string {
  if (
    /unknown feature key|not tenant-grantable|not in code manifest/i.test(message) &&
    !message.includes(BACKEND_CATALOG_STALE_HINT)
  ) {
    return `${message} ${BACKEND_CATALOG_STALE_HINT}`;
  }
  return message;
}

/**
 * Extract a user-friendly message from a Convex mutation error.
 * Returns specific messages for known error codes (FORBIDDEN, NOT_FOUND, etc.)
 * and falls back to the provided default message.
 */
export function handleMutationError(error: unknown, fallbackMessage: string): string {
  const data = getConvexErrorData(error);
  if (data?.code === 'FORBIDDEN') return CODE_MESSAGES.FORBIDDEN;
  if (
    data?.code === 'NOT_FOUND' ||
    data?.code === 'VALIDATION' ||
    data?.code === 'VALIDATION_ERROR' ||
    data?.code === 'INVALID_STATE' ||
    data?.code === 'FEATURE_DEPENDENCY_MISSING' ||
    data?.code === 'ALWAYS_ON_FEATURE' ||
    data?.code === 'ENFORCEMENT_NOT_READY' ||
    data?.code === 'TENANCY_ENFORCEMENT_REQUIRED' ||
    data?.code === 'PROTECTED_RULE_API_REQUIRED'
  ) {
    return withCatalogHint(String(data.message ?? fallbackMessage));
  }
  if (data?.message) return withCatalogHint(String(data.message));
  if (error instanceof Error && error.message) {
    return withCatalogHint(error.message);
  }
  return fallbackMessage;
}
