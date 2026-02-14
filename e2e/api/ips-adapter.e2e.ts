/**
 * IPS Adapter Edge Function E2E Tests
 * 
 * Integration tests for the IPS adapter edge function endpoints
 */

import { test, expect } from '../fixtures';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Edge function URL
const IPS_ADAPTER_URL = `${supabaseUrl}/functions/v1/ips-adapter`;

// Optional service role client for cleanup (only if key is provided)
let serviceClient: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey) {
  serviceClient = createClient(supabaseUrl, supabaseServiceKey);
}

// Test data prefix
const TEST_PREFIX = 'IPS-ADAPTER-TEST-';

test.describe('IPS Adapter Edge Function', () => {
  let authToken: string;

  test.beforeEach(async ({ adminSupabase }) => {
    const { data: { session }, error } = await adminSupabase.auth.getSession();
    if (error) {
      throw new Error(`Failed to get admin session for IPS adapter tests: ${error.message}`);
    }
    authToken = session?.access_token || '';
    if (!authToken) {
      throw new Error('Admin auth token missing for IPS adapter tests.');
    }
  });

  test.afterAll(async () => {
    if (!serviceClient) return;

    // Cleanup test transactions
    await serviceClient
      .from('ips_transactions')
      .delete()
      .like('msg_id', `${TEST_PREFIX}%`);
  });

  test.describe('POST /validate-vpa', () => {
    test('should validate a properly formatted VPA', async () => {
      const response = await fetch(`${IPS_ADAPTER_URL}/validate-vpa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          vpa: 'testuser@fnb',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.isValid).toBe(true);
      expect(data.accountHolderName).toBeDefined();
      expect(data.providerName).toBe('FNB');
    });

    test('should reject invalid VPA format', async () => {
      const response = await fetch(`${IPS_ADAPTER_URL}/validate-vpa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          vpa: 'invalid-no-at-sign',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.isValid).toBe(false);
      expect(data.errorCode).toBe('XJ');
    });

    test('should return not registered for unknown provider', async () => {
      const response = await fetch(`${IPS_ADAPTER_URL}/validate-vpa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          vpa: 'user@invalid-provider',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.isValid).toBe(false);
      expect(data.errorCode).toBe('XK');
    });
  });

  test.describe('POST /pay', () => {
    test('should process a successful payment', async ({ adminSupabase }) => {
      // First create a test IPS transaction record
      const msgId = `${TEST_PREFIX}MSG-${Date.now()}`;
      const txnId = `${TEST_PREFIX}TXN-${Date.now()}`;
      
      const { data: txn, error: txnError } = await adminSupabase
        .from('ips_transactions')
        .insert({
          msg_id: msgId,
          txn_id: txnId,
          transaction_type: 'REPAYMENT',
          ips_txn_type: 'PAY',
          amount: 100.00,
          currency: 'NAD',
          payer_vpa: 'testpayer@bank',
          payee_vpa: 'collections@namlend',
          status: 'initiated',
        })
        .select()
        .single();

      expect(txnError).toBeNull();
      expect(txn).toBeDefined();

      const response = await fetch(`${IPS_ADAPTER_URL}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ipsTransactionId: txn!.id,
          msgId: msgId,
          txnId: txnId,
          amount: 100.00,
          currency: 'NAD',
          payerVpa: 'testpayer@bank',
          payeeVpa: 'collections@namlend',
          purposeCode: 'PERS',
          note: 'Test payment',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.ipsResult).toBe('SUCCESS');
      expect(data.ipsErrorCode).toBe('00');
      expect(data.ipsTxnId).toBeDefined();
      expect(data.ipsRrn).toBeDefined();
    });

    test('should handle payment failure (simulated)', async ({ adminSupabase }) => {
      const msgId = `${TEST_PREFIX}MSG-FAIL-${Date.now()}`;
      const txnId = `${TEST_PREFIX}TXN-FAIL-${Date.now()}`;
      
      const { data: txn } = await adminSupabase
        .from('ips_transactions')
        .insert({
          msg_id: msgId,
          txn_id: txnId,
          transaction_type: 'REPAYMENT',
          ips_txn_type: 'PAY',
          amount: 100.00,
          currency: 'NAD',
          payer_vpa: 'testpayer@bank',
          payee_vpa: 'fail@testbank', // VPA with 'fail' triggers mock failure
          status: 'initiated',
        })
        .select()
        .single();

      const response = await fetch(`${IPS_ADAPTER_URL}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ipsTransactionId: txn!.id,
          msgId: msgId,
          txnId: txnId,
          amount: 100.00,
          currency: 'NAD',
          payerVpa: 'testpayer@bank',
          payeeVpa: 'fail@testbank',
          purposeCode: 'PERS',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.ipsResult).toBe('FAILURE');
      expect(data.ipsErrorCode).toBe('51');
    });

    test('should handle timeout scenario (simulated)', async ({ adminSupabase }) => {
      const msgId = `${TEST_PREFIX}MSG-TIMEOUT-${Date.now()}`;
      const txnId = `${TEST_PREFIX}TXN-TIMEOUT-${Date.now()}`;
      
      const { data: txn } = await adminSupabase
        .from('ips_transactions')
        .insert({
          msg_id: msgId,
          txn_id: txnId,
          transaction_type: 'REPAYMENT',
          ips_txn_type: 'PAY',
          amount: 100.00,
          currency: 'NAD',
          payer_vpa: 'testpayer@bank',
          payee_vpa: 'timeout@testbank', // VPA with 'timeout' triggers pending
          status: 'initiated',
        })
        .select()
        .single();

      const response = await fetch(`${IPS_ADAPTER_URL}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ipsTransactionId: txn!.id,
          msgId: msgId,
          txnId: txnId,
          amount: 100.00,
          currency: 'NAD',
          payerVpa: 'testpayer@bank',
          payeeVpa: 'timeout@testbank',
          purposeCode: 'PERS',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.ipsResult).toBe('PENDING');
      expect(data.ipsErrorCode).toBe('XP');
    });

    test('should reject amount exceeding limit', async ({ adminSupabase }) => {
      const msgId = `${TEST_PREFIX}MSG-LIMIT-${Date.now()}`;
      const txnId = `${TEST_PREFIX}TXN-LIMIT-${Date.now()}`;
      
      const { data: txn } = await adminSupabase
        .from('ips_transactions')
        .insert({
          msg_id: msgId,
          txn_id: txnId,
          transaction_type: 'REPAYMENT',
          ips_txn_type: 'PAY',
          amount: 100000.00, // Exceeds 50000 limit in mock
          currency: 'NAD',
          payer_vpa: 'testpayer@bank',
          payee_vpa: 'collections@namlend',
          status: 'initiated',
        })
        .select()
        .single();

      const response = await fetch(`${IPS_ADAPTER_URL}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ipsTransactionId: txn!.id,
          msgId: msgId,
          txnId: txnId,
          amount: 100000.00,
          currency: 'NAD',
          payerVpa: 'testpayer@bank',
          payeeVpa: 'collections@namlend',
          purposeCode: 'PERS',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(false);
      expect(data.ipsResult).toBe('FAILURE');
      expect(data.ipsErrorCode).toBe('61'); // Exceeds limit
    });
  });

  test.describe('POST /check-status', () => {
    test('should return status for a transaction', async ({ adminSupabase }) => {
      const msgId = `${TEST_PREFIX}MSG-STATUS-${Date.now()}`;
      const txnId = `${TEST_PREFIX}TXN-STATUS-${Date.now()}`;
      
      const { data: txn } = await adminSupabase
        .from('ips_transactions')
        .insert({
          msg_id: msgId,
          txn_id: txnId,
          transaction_type: 'REPAYMENT',
          ips_txn_type: 'PAY',
          amount: 100.00,
          currency: 'NAD',
          payer_vpa: 'testpayer@bank',
          payee_vpa: 'collections@namlend',
          status: 'pending',
        })
        .select()
        .single();

      const response = await fetch(`${IPS_ADAPTER_URL}/check-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ipsTransactionId: txn!.id,
          orgMsgId: msgId,
          orgTxnId: txnId,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.ipsResult).toBeDefined();
      // In mock mode, status check returns SUCCESS
      expect(data.ipsResult).toBe('SUCCESS');
    });
  });

  test.describe('Error Handling', () => {
    test('should return 401 for unknown endpoint', async () => {
      const response = await fetch(`${IPS_ADAPTER_URL}/unknown-endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('UNAUTHORIZED');
      expect(data.errorMessage).toBe('Unknown endpoint');
    });

    test('should return 405 for non-POST methods', async () => {
      const response = await fetch(`${IPS_ADAPTER_URL}/validate-vpa`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(405);
    });

    test('should handle malformed JSON', async () => {
      const response = await fetch(`${IPS_ADAPTER_URL}/validate-vpa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: 'not valid json',
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });

  test.describe('API Logging', () => {
    test('should log API calls to ips_api_logs', async ({ adminSupabase }) => {
      const msgId = `${TEST_PREFIX}MSG-LOG-${Date.now()}`;
      const txnId = `${TEST_PREFIX}TXN-LOG-${Date.now()}`;
      
      const { data: txn } = await adminSupabase
        .from('ips_transactions')
        .insert({
          msg_id: msgId,
          txn_id: txnId,
          transaction_type: 'REPAYMENT',
          ips_txn_type: 'PAY',
          amount: 50.00,
          currency: 'NAD',
          payer_vpa: 'testpayer@bank',
          payee_vpa: 'collections@namlend',
          status: 'initiated',
        })
        .select()
        .single();

      // Make a payment request
      await fetch(`${IPS_ADAPTER_URL}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ipsTransactionId: txn!.id,
          msgId: msgId,
          txnId: txnId,
          amount: 50.00,
          currency: 'NAD',
          payerVpa: 'testpayer@bank',
          payeeVpa: 'collections@namlend',
          purposeCode: 'PERS',
        }),
      });

      // Wait a bit for async logging
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check that log was created
      const { data: logs } = await adminSupabase
        .from('ips_api_logs')
        .select('*')
        .eq('ips_transaction_id', txn!.id)
        .order('created_at', { ascending: false });

      expect(logs).toBeDefined();
      expect(logs!.length).toBeGreaterThan(0);
      expect(logs![0].api_name).toBe('ReqPay');
      expect(logs![0].direction).toBe('OUTBOUND');
    });
  });
});

test.describe('IPS Transaction State Machine', () => {
  test('complete_ips_transaction - should update transaction and linked entities', async ({ adminSupabase }) => {
    // Create a test transaction
    const msgId = `${TEST_PREFIX}MSG-COMPLETE-${Date.now()}`;
    const txnId = `${TEST_PREFIX}TXN-COMPLETE-${Date.now()}`;
    
    const { data: txn } = await adminSupabase
      .from('ips_transactions')
      .insert({
        msg_id: msgId,
        txn_id: txnId,
        transaction_type: 'REPAYMENT',
        ips_txn_type: 'PAY',
        amount: 100.00,
        currency: 'NAD',
        payer_vpa: 'testpayer@bank',
        payee_vpa: 'collections@namlend',
        status: 'pending',
      })
      .select()
      .single();

    // Complete the transaction
    const { data, error } = await adminSupabase.rpc('complete_ips_transaction', {
      p_ips_txn_id: txn!.id,
      p_ips_result: 'SUCCESS',
      p_ips_error_code: '00',
      p_ips_txn_id_response: 'IPS123456',
      p_ips_rrn: 'RRN789012',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.status).toBe('success');

    // Verify transaction was updated
    const { data: updatedTxn } = await adminSupabase
      .from('ips_transactions')
      .select('*')
      .eq('id', txn!.id)
      .single();

    expect(updatedTxn!.status).toBe('success');
    expect(updatedTxn!.ips_result).toBe('SUCCESS');
    expect(updatedTxn!.ips_txn_id).toBe('IPS123456');
    expect(updatedTxn!.ips_rrn).toBe('RRN789012');
    expect(updatedTxn!.completed_at).toBeDefined();
  });

  test('complete_ips_transaction - should not update already completed transaction', async ({ adminSupabase }) => {
    const msgId = `${TEST_PREFIX}MSG-ALREADY-${Date.now()}`;
    const txnId = `${TEST_PREFIX}TXN-ALREADY-${Date.now()}`;
    
    const { data: txn } = await adminSupabase
      .from('ips_transactions')
      .insert({
        msg_id: msgId,
        txn_id: txnId,
        transaction_type: 'REPAYMENT',
        ips_txn_type: 'PAY',
        amount: 100.00,
        currency: 'NAD',
        payer_vpa: 'testpayer@bank',
        payee_vpa: 'collections@namlend',
        status: 'success', // Already completed
        ips_result: 'SUCCESS',
      })
      .select()
      .single();

    // Try to complete again
    const { data, error } = await adminSupabase.rpc('complete_ips_transaction', {
      p_ips_txn_id: txn!.id,
      p_ips_result: 'FAILURE',
      p_ips_error_code: '51',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(false);
    expect(data.error).toBe('ALREADY_COMPLETED');
  });

  test('complete_ips_transaction - should handle DEEMED status', async ({ adminSupabase }) => {
    const msgId = `${TEST_PREFIX}MSG-DEEMED-${Date.now()}`;
    const txnId = `${TEST_PREFIX}TXN-DEEMED-${Date.now()}`;
    
    const { data: txn } = await adminSupabase
      .from('ips_transactions')
      .insert({
        msg_id: msgId,
        txn_id: txnId,
        transaction_type: 'REPAYMENT',
        ips_txn_type: 'PAY',
        amount: 100.00,
        currency: 'NAD',
        payer_vpa: 'testpayer@bank',
        payee_vpa: 'collections@namlend',
        status: 'timeout',
      })
      .select()
      .single();

    const { data, error } = await adminSupabase.rpc('complete_ips_transaction', {
      p_ips_txn_id: txn!.id,
      p_ips_result: 'DEEMED',
      p_ips_error_code: 'ZA',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.success).toBe(true);
    expect(data.status).toBe('deemed');
  });
});
