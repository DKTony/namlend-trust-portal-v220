import { describe, expect, it } from 'vitest';
import {
  LEGACY_PRODUCTION_CONVEX_URL,
  LEGACY_SHARED_E2E_CONVEX_URL,
  PRODUCTION_CONVEX_URL,
  requireSafeConvexUrl,
  shouldSeedConvex,
} from '../../e2e/setupSafety';

describe('E2E setup safety', () => {
  it('rejects a missing Convex URL', () => {
    expect(() => requireSafeConvexUrl({})).toThrow(/VITE_CONVEX_URL is required/);
  });

  it('rejects the live production Convex URL', () => {
    expect(() => requireSafeConvexUrl({ VITE_CONVEX_URL: `${PRODUCTION_CONVEX_URL}/` })).toThrow(
      /Refusing to run mutating E2E setup against production Convex/
    );
  });

  it('rejects the legacy production Convex URL', () => {
    expect(() => requireSafeConvexUrl({ VITE_CONVEX_URL: LEGACY_PRODUCTION_CONVEX_URL })).toThrow(
      /Refusing to run mutating E2E setup against production Convex/
    );
  });

  it('rejects the retired shared E2E deployment', () => {
    expect(() => requireSafeConvexUrl({ VITE_CONVEX_URL: LEGACY_SHARED_E2E_CONVEX_URL })).toThrow(
      /retired shared Convex deployment/
    );
  });

  it('requires a disposable preview marker for mutating setup', () => {
    expect(() =>
      requireSafeConvexUrl({
        VITE_CONVEX_URL: 'https://isolated-preview.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
      })
    ).toThrow(/freshly created disposable preview/);
  });

  it('allows an explicitly opted-in dedicated dev target only outside CI', () => {
    expect(
      requireSafeConvexUrl({
        VITE_CONVEX_URL: 'https://dedicated-dev.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
        E2E_ALLOW_DEDICATED_DEV_TARGET: 'true',
      })
    ).toBe('https://dedicated-dev.convex.cloud');

    expect(() =>
      requireSafeConvexUrl({
        CI: '1',
        VITE_CONVEX_URL: 'https://dedicated-dev.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
        E2E_ALLOW_DEDICATED_DEV_TARGET: 'true',
      })
    ).toThrow(/freshly created disposable preview/);
  });

  it('allows CI mutations only with the disposable preview marker', () => {
    expect(
      requireSafeConvexUrl({
        CI: 'true',
        VITE_CONVEX_URL: 'https://isolated-preview.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
        E2E_DISPOSABLE_CONVEX_PREVIEW: 'true',
      })
    ).toBe('https://isolated-preview.convex.cloud');
  });

  it('requires an explicit mutating seed opt-in', () => {
    expect(shouldSeedConvex({ VITE_CONVEX_URL: 'https://staging.convex.cloud' })).toBe(false);
    expect(
      shouldSeedConvex({
        VITE_CONVEX_URL: 'https://staging.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
      })
    ).toBe(true);
    expect(
      shouldSeedConvex({
        VITE_CONVEX_URL: 'https://isolated-preview.convex.cloud',
        E2E_ALLOW_MUTATING_SEED: 'true',
        E2E_PRESEEDED_CONVEX_PREVIEW: 'true',
      })
    ).toBe(false);
  });

  it('accepts a non-production staging Convex URL', () => {
    expect(requireSafeConvexUrl({ VITE_CONVEX_URL: 'https://staging.convex.cloud' })).toBe(
      'https://staging.convex.cloud'
    );
  });
});
