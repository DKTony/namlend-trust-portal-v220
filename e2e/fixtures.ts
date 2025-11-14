/**
 * Playwright Test Fixtures for E2E Tests
 * 
 * Provides reusable, isolated Supabase client instances with proper authentication
 * for parallel test execution without session conflicts.
 */

import { test as base } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials
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

/**
 * Create an isolated Supabase client with unique storage key
 * to prevent session conflicts in parallel test execution
 */
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

/**
 * Authenticate a client with given credentials
 */
async function authenticateClient(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Authentication failed for ${email}: ${error.message}`);
  }
}

/**
 * Extended test fixtures with authenticated Supabase clients
 */
type TestFixtures = {
  // Isolated, unauthenticated client
  supabaseClient: SupabaseClient;
  
  // Pre-authenticated clients for each user type
  client1Supabase: SupabaseClient;
  client2Supabase: SupabaseClient;
  adminSupabase: SupabaseClient;
  loanOfficerSupabase: SupabaseClient;
  
  // Anonymous client (no authentication)
  anonSupabase: SupabaseClient;
};

export const test = base.extend<TestFixtures>({
  /**
   * Isolated Supabase client (unauthenticated)
   * Use this when you need to authenticate manually in your test
   */
  supabaseClient: async ({}, use) => {
    const client = createIsolatedClient();
    await use(client);
    await client.auth.signOut();
  },

  /**
   * Pre-authenticated client1 (regular client user)
   */
  client1Supabase: async ({}, use, testInfo) => {
    const storageKey = `client1-${testInfo.testId}-${Date.now()}`;
    const client = createIsolatedClient(storageKey);
    await authenticateClient(client, TEST_USERS.client1.email, TEST_USERS.client1.password);
    await use(client);
    await client.auth.signOut();
  },

  /**
   * Pre-authenticated client2 (regular client user)
   */
  client2Supabase: async ({}, use, testInfo) => {
    const storageKey = `client2-${testInfo.testId}-${Date.now()}`;
    const client = createIsolatedClient(storageKey);
    await authenticateClient(client, TEST_USERS.client2.email, TEST_USERS.client2.password);
    await use(client);
    await client.auth.signOut();
  },

  /**
   * Pre-authenticated admin user
   */
  adminSupabase: async ({}, use, testInfo) => {
    const storageKey = `admin-${testInfo.testId}-${Date.now()}`;
    const client = createIsolatedClient(storageKey);
    await authenticateClient(client, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await use(client);
    await client.auth.signOut();
  },

  /**
   * Pre-authenticated loan officer user
   */
  loanOfficerSupabase: async ({}, use, testInfo) => {
    const storageKey = `loan-officer-${testInfo.testId}-${Date.now()}`;
    const client = createIsolatedClient(storageKey);
    await authenticateClient(client, TEST_USERS.loanOfficer.email, TEST_USERS.loanOfficer.password);
    await use(client);
    await client.auth.signOut();
  },

  /**
   * Anonymous client (no authentication)
   * Use this for testing unauthenticated access
   */
  anonSupabase: async ({}, use) => {
    const client = createIsolatedClient('anon');
    await use(client);
  },
});

export { expect } from '@playwright/test';

/**
 * Usage Example:
 * 
 * import { test, expect } from './fixtures';
 * 
 * test('Admin can create disbursement', async ({ adminSupabase }) => {
 *   const { data, error } = await adminSupabase
 *     .from('disbursements')
 *     .insert({ ... });
 *   
 *   expect(error).toBeNull();
 *   expect(data).toBeTruthy();
 * });
 * 
 * test('Client cannot access admin data', async ({ client1Supabase }) => {
 *   const { data, error } = await client1Supabase
 *     .from('admin_only_table')
 *     .select('*');
 *   
 *   expect(data).toEqual([]);
 * });
 */
