export const PRODUCTION_CONVEX_URL = 'https://aromatic-okapi-265.convex.cloud';
export const LEGACY_SHARED_E2E_CONVEX_URL = 'https://brave-mole-108.convex.cloud';

type E2EEnv = {
  CI?: string;
  VITE_CONVEX_URL?: string;
  E2E_ALLOW_MUTATING_SEED?: string;
  E2E_ALLOW_DEDICATED_DEV_TARGET?: string;
  E2E_DISPOSABLE_CONVEX_PREVIEW?: string;
  E2E_PRESEEDED_CONVEX_PREVIEW?: string;
};

export function requireSafeConvexUrl(env: E2EEnv): string {
  const convexUrl = env.VITE_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error(
      'VITE_CONVEX_URL is required for E2E tests. Use a dedicated staging Convex URL.'
    );
  }
  let convexOrigin: string;
  try {
    convexOrigin = new URL(convexUrl).origin;
  } catch {
    throw new Error(`VITE_CONVEX_URL is not a valid URL: ${convexUrl}`);
  }
  if (convexOrigin === PRODUCTION_CONVEX_URL) {
    throw new Error(
      `Refusing to run mutating E2E setup against production Convex: ${convexOrigin}`
    );
  }
  if (convexOrigin === LEGACY_SHARED_E2E_CONVEX_URL) {
    throw new Error(
      `Refusing to run E2E against the retired shared Convex deployment: ${convexOrigin}`
    );
  }
  if (env.E2E_ALLOW_MUTATING_SEED === 'true') {
    const disposablePreview = env.E2E_DISPOSABLE_CONVEX_PREVIEW === 'true';
    const runningInCI = Boolean(env.CI && env.CI.toLowerCase() !== 'false');
    const explicitlyAllowedDedicatedDev =
      !runningInCI && env.E2E_ALLOW_DEDICATED_DEV_TARGET === 'true';
    if (!disposablePreview && !explicitlyAllowedDedicatedDev) {
      throw new Error(
        'Mutating E2E requires a freshly created disposable preview. Local dedicated-dev use additionally requires E2E_ALLOW_DEDICATED_DEV_TARGET=true.'
      );
    }
  }
  return convexOrigin;
}

export function shouldSeedConvex(env: E2EEnv): boolean {
  return env.E2E_ALLOW_MUTATING_SEED === 'true' && env.E2E_PRESEEDED_CONVEX_PREVIEW !== 'true';
}
