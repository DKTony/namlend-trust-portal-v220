/**
 * IPS RPC Functions E2E Tests
 *
 * Tests for IPS-related database RPC functions
 */

import { test, expect, TEST_USERS } from '../fixtures';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabaseCredentials = Boolean(supabaseAnonKey);

// Optional service role client for setup/teardown (only if key is provided)
let serviceClient: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey) {
  serviceClient = createClient(supabaseUrl, supabaseServiceKey);
}

// Test data
const TEST_PREFIX = 'IPS-TEST-';

test.skip(
  !hasSupabaseCredentials,
  'Legacy Supabase IPS RPC tests require Supabase credentials; skipped in Convex-only E2E.'
);

test.describe('IPS RPC Functions', () => {
  test.skip(
    !hasSupabaseCredentials,
    'Legacy Supabase IPS RPC tests require Supabase credentials; skipped in Convex-only E2E.'
  );

  test.afterAll(async () => {
    if (!serviceClient) return;

    // Cleanup test data
    await serviceClient.from('ips_transactions').delete().like('msg_id', `${TEST_PREFIX}%`);

    await serviceClient
      .from('ips_vpa_registry')
      .delete()
      .like('vpa_address', `${TEST_PREFIX.toLowerCase()}%`);
  });

  test.describe('VPA Management', () => {
    test('upsert_user_vpa - should create a new VPA', async ({ client1Supabase }) => {
      const testVpa = `${TEST_PREFIX.toLowerCase()}user@testbank`;

      const { data, error } = await client1Supabase.rpc('upsert_user_vpa', {
        p_vpa_address: testVpa,
        p_vpa_type: 'HANDLE',
        p_display_name: 'Test VPA',
        p_set_default: true,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.vpa_address).toBe(testVpa);
      expect(data.is_default).toBe(true);
    });

    test('upsert_user_vpa - should reject invalid VPA format', async ({ client1Supabase }) => {
      const { data, error } = await client1Supabase.rpc('upsert_user_vpa', {
        p_vpa_address: 'invalid-vpa-no-at-sign',
        p_vpa_type: 'HANDLE',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('INVALID_VPA_FORMAT');
    });

    test('get_user_vpas - should return user VPAs', async ({ client1Supabase }) => {
      // First create a VPA
      const testVpa = `${TEST_PREFIX.toLowerCase()}getvpa@testbank`;
      await client1Supabase.rpc('upsert_user_vpa', {
        p_vpa_address: testVpa,
        p_vpa_type: 'HANDLE',
      });

      const { data, error } = await client1Supabase.rpc('get_user_vpas', {
        p_user_id: null, // Current user
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.vpas)).toBe(true);
    });

    test('get_user_vpas - should not allow accessing other users VPAs without admin role', async ({
      client1Supabase,
      client2Supabase,
    }) => {
      // Get client2's user ID
      const { data: session } = await client2Supabase.auth.getSession();
      const client2UserId = session?.session?.user?.id;

      if (client2UserId) {
        const { data, error } = await client1Supabase.rpc('get_user_vpas', {
          p_user_id: client2UserId,
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(false);
        expect(data.error).toBe('UNAUTHORIZED');
      }
    });
  });

  test.describe('IPS Transaction Status', () => {
    test('get_ips_transaction_status - should return NOT_FOUND for invalid ID', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('get_ips_transaction_status', {
        p_ips_txn_id: '00000000-0000-0000-0000-000000000000',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('NOT_FOUND');
    });
  });

  test.describe('IPS Disbursement (Admin Only)', () => {
    test('initiate_ips_disbursement - should fail for non-admin users', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('initiate_ips_disbursement', {
        p_disbursement_id: '00000000-0000-0000-0000-000000000000',
        p_payee_vpa: 'test@bank',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    test('initiate_ips_disbursement - admin can initiate (with valid disbursement)', async ({
      adminSupabase,
    }) => {
      const {
        data: { user: adminUser },
      } = await adminSupabase.auth.getUser();
      expect(adminUser).toBeTruthy();

      const { data: loan, error: loanError } = await adminSupabase
        .from('loans')
        .insert({
          user_id: TEST_USERS.client1.id,
          amount: 1500,
          term_months: 3,
          interest_rate: 32,
          monthly_payment: 550,
          total_repayment: 1650,
          total_paid: 0,
          purpose: 'IPS RPC Disbursement',
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminUser!.id,
        })
        .select('id')
        .single();
      expect(loanError).toBeNull();
      expect(loan?.id).toBeTruthy();

      const reference = `${TEST_PREFIX}disb-${Date.now()}`;
      const { data: disbursement, error: disbursementError } = await adminSupabase
        .from('disbursements')
        .insert({
          loan_id: loan!.id,
          amount: 1500,
          status: 'approved',
          reference,
          created_by: adminUser!.id,
        })
        .select('id')
        .single();
      expect(disbursementError).toBeNull();
      expect(disbursement?.id).toBeTruthy();

      const { data, error } = await adminSupabase.rpc('initiate_ips_disbursement', {
        p_disbursement_id: disbursement!.id,
        p_payee_vpa: `${TEST_PREFIX.toLowerCase()}customer@bank`,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);

      await adminSupabase.from('ips_transactions').delete().eq('disbursement_id', disbursement!.id);
      await adminSupabase.from('state_transitions').delete().eq('entity_id', disbursement!.id);
      await adminSupabase.from('disbursements').delete().eq('id', disbursement!.id);
      await adminSupabase.from('loans').delete().eq('id', loan!.id);
    });
  });

  test.describe('IPS Repayment', () => {
    test('initiate_ips_repayment - should fail for invalid loan', async ({ client1Supabase }) => {
      const { data, error } = await client1Supabase.rpc('initiate_ips_repayment', {
        p_loan_id: '00000000-0000-0000-0000-000000000000',
        p_amount: 100.0,
        p_payer_vpa: 'test@bank',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('LOAN_NOT_FOUND');
    });

    test('initiate_ips_repayment - should fail for invalid amount', async ({ client1Supabase }) => {
      // Find a loan owned by client1
      const { data: loans } = await client1Supabase
        .from('loans')
        .select('id, outstanding_balance')
        .in('status', ['disbursed', 'active'])
        .limit(1);

      if (loans && loans.length > 0) {
        const { data, error } = await client1Supabase.rpc('initiate_ips_repayment', {
          p_loan_id: loans[0].id,
          p_amount: -100.0, // Invalid negative amount
          p_payer_vpa: 'test@bank',
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(false);
        expect(data.error).toBe('INVALID_AMOUNT');
      } else {
        test.skip();
      }
    });

    test('initiate_ips_repayment - should fail for amount exceeding balance', async ({
      client1Supabase,
    }) => {
      const { data: loans } = await client1Supabase
        .from('loans')
        .select('id, outstanding_balance')
        .in('status', ['disbursed', 'active'])
        .gt('outstanding_balance', 0)
        .limit(1);

      if (loans && loans.length > 0 && loans[0].outstanding_balance) {
        const { data, error } = await client1Supabase.rpc('initiate_ips_repayment', {
          p_loan_id: loans[0].id,
          p_amount: loans[0].outstanding_balance + 1000, // Exceeds balance
          p_payer_vpa: 'test@bank',
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(false);
        expect(data.error).toBe('AMOUNT_EXCEEDS_BALANCE');
      } else {
        test.skip();
      }
    });

    test('initiate_ips_repayment - should not allow repayment on other users loan', async ({
      client1Supabase,
      client2Supabase,
    }) => {
      // Find a loan owned by client2
      const { data: session } = await client2Supabase.auth.getSession();
      const client2UserId = session?.session?.user?.id;

      if (!client2UserId) {
        test.skip();
        return;
      }

      const { data: loans } = await client2Supabase
        .from('loans')
        .select('id')
        .eq('user_id', client2UserId)
        .in('status', ['disbursed', 'active'])
        .limit(1);

      if (!loans || loans.length === 0) {
        test.skip();
        return;
      }

      const { data, error } = await client1Supabase.rpc('initiate_ips_repayment', {
        p_loan_id: loans[0].id,
        p_amount: 100.0,
        p_payer_vpa: 'test@bank',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('UNAUTHORIZED');
    });
  });

  test.describe('Loan IPS Transactions', () => {
    test('get_loan_ips_transactions - should return transactions for own loan', async ({
      client1Supabase,
    }) => {
      const { data: loans } = await client1Supabase.from('loans').select('id').limit(1);

      if (loans && loans.length > 0) {
        const { data, error } = await client1Supabase.rpc('get_loan_ips_transactions', {
          p_loan_id: loans[0].id,
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.transactions)).toBe(true);
      } else {
        test.skip();
      }
    });

    test('get_loan_ips_transactions - should fail for non-existent loan', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('get_loan_ips_transactions', {
        p_loan_id: '00000000-0000-0000-0000-000000000000',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(false);
      expect(data.error).toBe('LOAN_NOT_FOUND');
    });
  });

  test.describe('Error Code Lookup', () => {
    test('get_ips_error_message - should return message for known code', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('get_ips_error_message', {
        p_code: '00',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).toBe('Payment successful');
    });

    test('get_ips_error_message - should return default for unknown code', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('get_ips_error_message', {
        p_code: 'UNKNOWN',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).toBe('An error occurred. Please try again.');
    });

    test('is_ips_error_retryable - should return true for retryable codes', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('is_ips_error_retryable', {
        p_code: 'UP', // PSP timeout - retryable
      });

      expect(error).toBeNull();
      expect(data).toBe(true);
    });

    test('is_ips_error_retryable - should return false for non-retryable codes', async ({
      client1Supabase,
    }) => {
      const { data, error } = await client1Supabase.rpc('is_ips_error_retryable', {
        p_code: '51', // Insufficient funds - not retryable
      });

      expect(error).toBeNull();
      expect(data).toBe(false);
    });
  });

  test.describe('ID Generation', () => {
    test('generate_ips_msg_id - should generate unique message IDs', async ({ adminSupabase }) => {
      const { data: id1 } = await adminSupabase.rpc('generate_ips_msg_id');
      const { data: id2 } = await adminSupabase.rpc('generate_ips_msg_id');

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^NL\d+/); // Starts with NL followed by timestamp
    });

    test('generate_ips_txn_id - should generate unique transaction IDs', async ({
      adminSupabase,
    }) => {
      const { data: id1 } = await adminSupabase.rpc('generate_ips_txn_id');
      const { data: id2 } = await adminSupabase.rpc('generate_ips_txn_id');

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^TXN\d+/); // Starts with TXN followed by timestamp
    });
  });
});

test.describe('IPS RLS Policies', () => {
  test('ips_error_codes - anyone can read', async ({ client1Supabase }) => {
    const { data, error } = await client1Supabase.from('ips_error_codes').select('*').limit(5);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThan(0);
  });

  test('ips_vpa_registry - users can only see their own VPAs', async ({
    client1Supabase,
    client2Supabase,
  }) => {
    // Create VPA for client1
    const testVpa = `${TEST_PREFIX.toLowerCase()}rls-test@bank`;
    await client1Supabase.rpc('upsert_user_vpa', {
      p_vpa_address: testVpa,
      p_vpa_type: 'HANDLE',
    });

    // Client1 should see it
    const { data: client1Data } = await client1Supabase
      .from('ips_vpa_registry')
      .select('*')
      .eq('vpa_address', testVpa);

    expect(client1Data).toBeDefined();
    expect(client1Data!.length).toBe(1);

    // Client2 should NOT see it
    const { data: client2Data } = await client2Supabase
      .from('ips_vpa_registry')
      .select('*')
      .eq('vpa_address', testVpa);

    expect(client2Data).toBeDefined();
    expect(client2Data!.length).toBe(0);
  });

  test('ips_api_logs - only admins can read', async ({ client1Supabase, adminSupabase }) => {
    // Client should not see logs
    const { data: clientData, error: clientError } = await client1Supabase
      .from('ips_api_logs')
      .select('*')
      .limit(1);

    // Should return empty (RLS blocks)
    expect(clientData).toBeDefined();
    expect(clientData!.length).toBe(0);

    // Admin should be able to see logs (if any exist)
    const { error: adminError } = await adminSupabase.from('ips_api_logs').select('*').limit(1);

    expect(adminError).toBeNull();
  });
});
