export const PRODUCTION_CONVEX_URL = 'https://aromatic-okapi-265.convex.cloud';

type E2EEnv = {
  VITE_CONVEX_URL?: string;
  E2E_ALLOW_MUTATING_SEED?: string;
};

export function requireSafeConvexUrl(env: E2EEnv): string {
  const convexUrl = env.VITE_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error(
      'VITE_CONVEX_URL is required for E2E tests. Use a dedicated staging Convex URL.'
    );
  }
  if (convexUrl === PRODUCTION_CONVEX_URL) {
    throw new Error(`Refusing to run mutating E2E setup against production Convex: ${convexUrl}`);
  }
  return convexUrl;
}

export function shouldSeedConvex(env: E2EEnv): boolean {
  return env.E2E_ALLOW_MUTATING_SEED === 'true';
}
