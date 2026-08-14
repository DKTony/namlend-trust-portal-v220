import { ConvexError } from 'convex/values';
import { describe, expect, test } from 'vitest';
import { BACKEND_CATALOG_STALE_HINT, handleMutationError } from './mutationError';

describe('handleMutationError', () => {
  test('maps VALIDATION_ERROR to the server message', () => {
    const error = new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'effectiveTo must be in the future.',
    });
    expect(handleMutationError(error, 'fallback')).toBe('effectiveTo must be in the future.');
  });

  test('maps FEATURE_DEPENDENCY_MISSING and ALWAYS_ON_FEATURE', () => {
    expect(
      handleMutationError(
        new ConvexError({
          code: 'FEATURE_DEPENDENCY_MISSING',
          message: "Feature 'clientBanking' requires 'ippOnboarding'.",
        }),
        'fallback'
      )
    ).toBe("Feature 'clientBanking' requires 'ippOnboarding'.");
    expect(
      handleMutationError(
        new ConvexError({
          code: 'ALWAYS_ON_FEATURE',
          message: "Always-on feature 'loans' cannot be revoked.",
        }),
        'fallback'
      )
    ).toBe("Always-on feature 'loans' cannot be revoked.");
  });

  test('maps enforcement activation codes', () => {
    expect(
      handleMutationError(
        new ConvexError({
          code: 'ENFORCEMENT_NOT_READY',
          message: '1 Client Portal catalogue rows are missing.',
        }),
        'fallback'
      )
    ).toBe('1 Client Portal catalogue rows are missing.');
    expect(
      handleMutationError(
        new ConvexError({
          code: 'TENANCY_ENFORCEMENT_REQUIRED',
          message: 'Tenancy enforcement must be active before entitlement enforcement.',
        }),
        'fallback'
      )
    ).toBe('Tenancy enforcement must be active before entitlement enforcement.');
    expect(
      handleMutationError(
        new ConvexError({
          code: 'PROTECTED_RULE_API_REQUIRED',
          message: 'Use the protected entitlement-enforcement activation operation.',
        }),
        'fallback'
      )
    ).toBe('Use the protected entitlement-enforcement activation operation.');
  });

  test('appends a catalog-stale hint for unknown feature keys', () => {
    const message = handleMutationError(
      new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Unknown feature key (not in code manifest): clientPayments',
      }),
      'fallback'
    );
    expect(message).toContain('clientPayments');
    expect(message).toContain(BACKEND_CATALOG_STALE_HINT);
  });

  test('parses wrapped ConvexError JSON from the browser client', () => {
    const error = new Error(
      '[CONVEX M(platform/entitlements:setTenantEntitlement)] Server Error\nUncaught ConvexError: {"code":"VALIDATION_ERROR","message":"Feature is unknown or not tenant-grantable: clientSelfService"}'
    );
    const message = handleMutationError(error, 'fallback');
    expect(message).toContain('clientSelfService');
    expect(message).toContain(BACKEND_CATALOG_STALE_HINT);
  });
});
