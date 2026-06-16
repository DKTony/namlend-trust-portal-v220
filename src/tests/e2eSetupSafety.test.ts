import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_CONVEX_URL,
  requireSafeConvexUrl,
  shouldSeedConvex,
} from '../../e2e/setupSafety';

describe('E2E setup safety', () => {
  it('rejects a missing Convex URL', () => {
    expect(() => requireSafeConvexUrl({})).toThrow(/VITE_CONVEX_URL is required/);
  });

  it('rejects the production Convex URL', () => {
    expect(() => requireSafeConvexUrl({ VITE_CONVEX_URL: PRODUCTION_CONVEX_URL })).toThrow(
      /Refusing to run mutating E2E setup against production Convex/
    );
  });

  it('requires an explicit mutating seed opt-in', () => {
    expect(shouldSeedConvex({ VITE_CONVEX_URL: 'https://staging.convex.cloud' })).toBe(false);
    expect(
      shouldSeedConvex({
        VITE_CONVEX_URL: 'https://staging.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
      })
    ).toBe(true);
  });

  it('accepts a non-production staging Convex URL', () => {
    expect(requireSafeConvexUrl({ VITE_CONVEX_URL: 'https://staging.convex.cloud' })).toBe(
      'https://staging.convex.cloud'
    );
  });
});
