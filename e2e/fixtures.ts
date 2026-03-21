/**
 * Playwright Test Fixtures for E2E Tests
 *
 * Provides reusable, isolated Convex client instances for parallel test
 * execution. Supabase fixtures retained for any tests not yet migrated.
 *
 * MIGRATION: Supabase fixtures still work during transition.
 *            New tests should use convexClient and authenticate via the UI.
 */

import 'dotenv/config';
import { test as base, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConvexHttpClient } from 'convex/browser';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const DEFAULT_SUPABASE_PROJECT_ID = 'puahejtaskncpazjyxqp';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  (process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID
    ? `https://${process.env.SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
    : `https://${DEFAULT_SUPABASE_PROJECT_ID}.supabase.co`);

const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://aromatic-okapi-265.convex.cloud';

// ---------------------------------------------------------------------------
// Test users (same credentials work for both Supabase and Convex Auth)
// ---------------------------------------------------------------------------

export const TEST_USERS = {
  client1: {
    email: 'client1@test.namlend.com',
    password: 'test123',
    id: '11111111-0000-0000-0000-000000000001',
  },
  client2: {
    email: 'client2@test.namlend.com',
    password: 'test123',
    id: '22222222-0000-0000-0000-000000000002',
  },
  admin: {
    email: 'admin@test.namlend.com',
    password: 'test123',
    id: 'fbf720fd-7de2-4142-974f-6d6809f4f8c6',
  },
  loanOfficer: {
    email: 'loan_officer@test.namlend.com',
    password: 'test123',
    id: '44444444-0000-0000-0000-000000000004',
  },
};

// ---------------------------------------------------------------------------
// Supabase helpers (retained for backward compatibility)
// ---------------------------------------------------------------------------

function createIsolatedClient(storageKey?: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: storageKey || `test-${Date.now()}-${Math.random()}`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticateSupabaseClient(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<void> {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (!error) return;
    const isRateLimited = /rate limit/i.test(error.message || '');
    if (!isRateLimited || attempt === maxAttempts) {
      throw new Error(`Authentication failed for ${email}: ${error.message}`);
    }
    const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 12000);
    await sleep(backoffMs);
  }
}

// ---------------------------------------------------------------------------
// Convex HTTP client helper (for API-level tests against Convex backend)
// ---------------------------------------------------------------------------

export function createConvexTestClient(): ConvexHttpClient {
  return new ConvexHttpClient(CONVEX_URL);
}

/**
 * Sign in via the app UI (Playwright page).
 * Used by E2E tests that need an authenticated browser session with Convex Auth.
 */
export async function signInViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="sign-in-button"]');
  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Fixture types
// ---------------------------------------------------------------------------

type TestFixtures = {
  // Convex HTTP client (stateless — for API testing)
  convexClient: ConvexHttpClient;

  // Supabase clients (retained for backward compatibility during migration)
  supabaseClient: SupabaseClient;
  client1Supabase: SupabaseClient;
  client2Supabase: SupabaseClient;
  adminSupabase: SupabaseClient;
  loanOfficerSupabase: SupabaseClient;
  anonSupabase: SupabaseClient;
};

export const test = base.extend<TestFixtures>({
  // Convex HTTP client (shared, stateless)
  convexClient: async ({}, use) => {
    const client = createConvexTestClient();
    await use(client);
  },

  // Unauthenticated Supabase client
  supabaseClient: async ({}, use) => {
    const client = createIsolatedClient();
    await use(client);
    await client.auth.signOut();
  },

  client1Supabase: async ({}, use, testInfo) => {
    const client = createIsolatedClient(`client1-${testInfo.testId}-${Date.now()}`);
    await authenticateSupabaseClient(client, TEST_USERS.client1.email, TEST_USERS.client1.password);
    await use(client);
    await client.auth.signOut();
  },

  client2Supabase: async ({}, use, testInfo) => {
    const client = createIsolatedClient(`client2-${testInfo.testId}-${Date.now()}`);
    await authenticateSupabaseClient(client, TEST_USERS.client2.email, TEST_USERS.client2.password);
    await use(client);
    await client.auth.signOut();
  },

  adminSupabase: async ({}, use, testInfo) => {
    const client = createIsolatedClient(`admin-${testInfo.testId}-${Date.now()}`);
    await authenticateSupabaseClient(client, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await use(client);
    await client.auth.signOut();
  },

  loanOfficerSupabase: async ({}, use, testInfo) => {
    const client = createIsolatedClient(`loan-officer-${testInfo.testId}-${Date.now()}`);
    await authenticateSupabaseClient(
      client,
      TEST_USERS.loanOfficer.email,
      TEST_USERS.loanOfficer.password
    );
    await use(client);
    await client.auth.signOut();
  },

  anonSupabase: async ({}, use) => {
    const client = createIsolatedClient('anon');
    await use(client);
  },
});

export { expect } from '@playwright/test';

/**
 * Usage — Convex-based tests:
 *
 * import { test, expect, signInViaUI, TEST_USERS } from './fixtures';
 *
 * test('Admin can list loans', async ({ page, convexClient }) => {
 *   await signInViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
 *   // convexClient is available for API-level assertions
 * });
 *
 * Usage — Supabase fixtures (backward compat, for tests not yet migrated):
 *
 * test('Client cannot access admin data', async ({ client1Supabase }) => {
 *   const { data } = await client1Supabase.from('loans').select('*');
 *   expect(data).toEqual([]);
 * });
 */
