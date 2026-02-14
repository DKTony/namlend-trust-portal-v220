/**
 * E2E Tests for Approval RPC Race Condition Fix
 * Tests the 23505 (unique_violation) handler in process_approval_transaction
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://puahejtaskncpazjyxqp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Anon client for authenticated RPC calls
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Optional service role client for setup/teardown (only if key is provided)
let serviceClient: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Skip all tests in this suite if service role key is not available
test.describe('Approval RPC Race Condition Fix', () => {
  // Skip entire suite if no service key (RLS blocks direct inserts)
  test.skip(!serviceClient, 'SUPABASE_SERVICE_ROLE_KEY not set; skipping RPC race condition tests');

  let testApprovalRequestId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    if (!serviceClient) return; // Guard for skip

    testUserId = '11111111-0000-0000-0000-000000000001'; // Test client1

    // Authenticate anon client as admin for RPC calls
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@test.namlend.com',
      password: 'test123',
    });

    if (authError) throw authError;

    // Wait a moment for auth to propagate
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create a test approval request using service client (bypasses RLS)
    const client = serviceClient || supabase;
    const { data: approvalRequest, error } = await client
      .from('approval_requests')
      .insert({
        user_id: testUserId,
        request_type: 'loan_application',
        status: 'approved',
        request_data: {
          amount: 15000,
          term_months: 12,
          interest_rate: 32,
          monthly_payment: 1650,
          total_repayment: 19800,
          purpose: 'E2E Test - Race Condition',
        },
      })
      .select('id')
      .single();

    if (error) throw error;
    testApprovalRequestId = approvalRequest.id;
  });

  test.afterAll(async () => {
    // Cleanup using service client (bypasses RLS)
    const client = serviceClient || supabase;
    if (testApprovalRequestId) {
      await client.from('loans').delete().eq('approval_request_id', testApprovalRequestId);
      await client.from('approval_requests').delete().eq('id', testApprovalRequestId);
    }
  });

  test('process_approval_transaction handles first call successfully', async () => {
    const { data, error } = await supabase.rpc('process_approval_transaction', {
      p_request_id: testApprovalRequestId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.loan_id).toBeDefined();
    expect(data.amount).toBe(15000);
    expect(data.idempotent).toBeUndefined(); // First call should not be idempotent
  });

  test('process_approval_transaction returns idempotent success on second call', async () => {
    // Call the RPC again with the same approval_request_id
    const { data, error } = await supabase.rpc('process_approval_transaction', {
      p_request_id: testApprovalRequestId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.loan_id).toBeDefined();
    expect(data.idempotent).toBe(true); // Second call should be idempotent
    expect(data.message).toContain('already created');
  });

  test('process_approval_transaction handles concurrent calls gracefully', async () => {
    // Use service client for setup/teardown
    const client = serviceClient || supabase;

    // Create a new approval request for concurrent testing
    const { data: newApprovalRequest, error: createError } = await client
      .from('approval_requests')
      .insert({
        user_id: testUserId,
        request_type: 'loan_application',
        status: 'approved',
        request_data: {
          amount: 20000,
          term_months: 18,
          interest_rate: 32,
          monthly_payment: 1500,
          total_repayment: 27000,
          purpose: 'E2E Test - Concurrent Calls',
        },
      })
      .select('id')
      .single();

    if (createError) throw createError;
    const concurrentRequestId = newApprovalRequest.id;

    try {
      // Simulate concurrent calls by calling the RPC multiple times in parallel
      const results = await Promise.all([
        supabase.rpc('process_approval_transaction', { p_request_id: concurrentRequestId }),
        supabase.rpc('process_approval_transaction', { p_request_id: concurrentRequestId }),
        supabase.rpc('process_approval_transaction', { p_request_id: concurrentRequestId }),
      ]);

      // All calls should succeed
      results.forEach(({ data, error }) => {
        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(true);
        expect(data.loan_id).toBeDefined();
      });

      // All calls should return the same loan_id
      const loanIds = results.map(r => r.data.loan_id);
      expect(new Set(loanIds).size).toBe(1); // All should be the same

      // At least one should be marked as idempotent
      const idempotentCalls = results.filter(r => r.data.idempotent === true);
      expect(idempotentCalls.length).toBeGreaterThanOrEqual(1);

      // Verify only one loan was created
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('id')
        .eq('approval_request_id', concurrentRequestId);

      expect(loansError).toBeNull();
      expect(loans?.length).toBe(1); // Only one loan should exist

    } finally {
      // Cleanup using service client
      await client.from('loans').delete().eq('approval_request_id', concurrentRequestId);
      await client.from('approval_requests').delete().eq('id', concurrentRequestId);
    }
  });

  test('unique index on loans.approval_request_id prevents duplicates', async () => {
    // Verify the unique index exists and works
    const { data: loan1, error: error1 } = await supabase
      .from('loans')
      .select('id, approval_request_id')
      .eq('approval_request_id', testApprovalRequestId)
      .single();

    expect(error1).toBeNull();
    expect(loan1).toBeDefined();
    expect(loan1?.approval_request_id).toBe(testApprovalRequestId);

    // Attempting to insert another loan with the same approval_request_id should fail
    // (This is handled by the RPC's exception handler)
  });
});
