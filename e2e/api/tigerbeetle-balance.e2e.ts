/**
 * E2E Tests for TigerBeetle Balance Fixes
 * Tests the fixes for:
 * - useTigerBeetleBalance entity_type mapping
 * - ledgerService.getLoanBalance fallback columns
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://puahejtaskncpazjyxqp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// QUARANTINE: Legacy Supabase test — queries Supabase `loan_balance_summary` view and
// `tigerbeetle_accounts` table directly. Convex equivalent: api.loans.getLoanBalance.
// Status: fail (legacy Supabase dependency) — tracked in plan N4 triage.
// Self-skips when VITE_SUPABASE_ANON_KEY is absent.
test.describe('TigerBeetle Balance Fixes', () => {
  test.skip(
    !SUPABASE_ANON_KEY,
    'QUARANTINE [legacy-supabase]: VITE_SUPABASE_ANON_KEY must be set. Migrate to Convex api.loans in N2 batch.'
  );
  let testLoanId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    // Authenticate as admin to bypass RLS
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@test.namlend.com',
      password: 'Test1234!',
    });

    if (authError) throw authError;

    // Create test user and loan for balance testing
    testUserId = '11111111-0000-0000-0000-000000000001'; // Test client1

    // Create a test loan
    const { data: loan, error } = await supabase
      .from('loans')
      .insert({
        user_id: testUserId,
        amount: 10000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 1100,
        total_repayment: 13200,
        purpose: 'E2E Test - TigerBeetle Balance',
        status: 'disbursed',
      })
      .select('id')
      .single();

    if (error) throw error;
    testLoanId = loan.id;
  });

  test.afterAll(async () => {
    // Cleanup test loan
    if (testLoanId) {
      await supabase.from('loans').delete().eq('id', testLoanId);
    }
  });

  test('loan_balance_summary view returns correct columns', async () => {
    // Test that the view has the correct schema
    const { data, error } = await supabase
      .from('loan_balance_summary')
      .select('loan_id, principal_balance, interest_balance, fees_balance, total_balance')
      .eq('loan_id', testLoanId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.loan_id).toBe(testLoanId);
    expect(typeof data?.principal_balance).toBe('number');
    expect(typeof data?.interest_balance).toBe('number');
    expect(typeof data?.fees_balance).toBe('number');
    expect(typeof data?.total_balance).toBe('number');
  });

  test('tigerbeetle_accounts uses correct entity_type values', async () => {
    // Verify that accounts are created with LOAN_* entity types, not 'loan'
    const { data: accounts, error } = await supabase
      .from('tigerbeetle_accounts')
      .select('id, entity_type, entity_id')
      .eq('entity_id', testLoanId);

    expect(error).toBeNull();

    if (accounts && accounts.length > 0) {
      // If accounts exist, verify they use correct entity types
      const validTypes = ['LOAN_PRINCIPAL', 'LOAN_INTEREST', 'LOAN_FEES'];
      accounts.forEach((account: { entity_type: string }) => {
        expect(validTypes).toContain(account.entity_type);
        expect(account.entity_type).not.toBe('loan'); // Should NOT be 'loan'
      });
    }
  });

  test('ledgerService.getLoanBalance fallback works with correct columns', async () => {
    // This tests the fallback path - directly query the view instead of RPC
    // (The RPC doesn't exist, but the view does and is used by ledgerService)
    const { data, error } = await supabase
      .from('loan_balance_summary')
      .select('principal_balance, interest_balance, fees_balance, total_balance')
      .eq('loan_id', testLoanId)
      .single();

    // Should succeed with correct column names
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.principal_balance).toBeDefined();
    expect(data?.interest_balance).toBeDefined();
    expect(data?.fees_balance).toBeDefined();
    expect(data?.total_balance).toBeDefined();
  });

  test('useTigerBeetleBalance hook can query with correct entity_type filter', async () => {
    // Test the query pattern used by useTigerBeetleBalance
    const LOAN_ACCOUNT_TYPES = ['LOAN_PRINCIPAL', 'LOAN_INTEREST', 'LOAN_FEES'];

    const { data: accounts, error } = await supabase
      .from('tigerbeetle_accounts')
      .select('id, entity_type')
      .in('entity_type', LOAN_ACCOUNT_TYPES)
      .eq('entity_id', testLoanId);

    // Should not error even if no accounts exist
    expect(error).toBeNull();
    expect(Array.isArray(accounts)).toBe(true);
  });

  test('balance calculation handles missing TigerBeetle data gracefully', async () => {
    // Test that balance queries don't fail when TigerBeetle data is missing
    const { data: viewData, error: viewError } = await supabase
      .from('loan_balance_summary')
      .select('*')
      .eq('loan_id', testLoanId)
      .single();

    expect(viewError).toBeNull();
    expect(viewData).toBeDefined();

    // View should return valid balance data from loans table
    expect(viewData?.total_balance).toBeGreaterThanOrEqual(0);
  });
});
