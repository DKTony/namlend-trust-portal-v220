/**
 * E2E Tests for Backoffice Disbursement Functionality
 * Tests the complete disbursement flow including RPC, RLS, and audit trail
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

// Test users (these should exist in your test database)
const ADMIN_EMAIL = 'admin@namlend.test';
const ADMIN_PASSWORD = 'test123';
const LOAN_OFFICER_EMAIL = 'officer@namlend.test';
const LOAN_OFFICER_PASSWORD = 'test123';
const CLIENT_EMAIL = 'client@namlend.test';
const CLIENT_PASSWORD = 'test123';

test.describe('Disbursement API Tests', () => {
  let adminClient: ReturnType<typeof createClient>;
  let loanOfficerClient: ReturnType<typeof createClient>;
  let clientClient: ReturnType<typeof createClient>;
  let testLoanId: string;

  test.beforeAll(async () => {
    // Initialize Supabase clients
    adminClient = createClient(supabaseUrl, supabaseAnonKey);
    loanOfficerClient = createClient(supabaseUrl, supabaseAnonKey);
    clientClient = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in as admin
    const { error: adminError } = await adminClient.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    expect(adminError).toBeNull();

    // Sign in as loan officer
    const { error: officerError } = await loanOfficerClient.auth.signInWithPassword({
      email: LOAN_OFFICER_EMAIL,
      password: LOAN_OFFICER_PASSWORD
    });
    expect(officerError).toBeNull();

    // Sign in as client
    const { error: clientError } = await clientClient.auth.signInWithPassword({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD
    });
    expect(clientError).toBeNull();

    // Create a test loan in 'approved' status
    const { data: loanData, error: loanError } = await adminClient
      .from('loans')
      .insert({
        user_id: (await clientClient.auth.getUser()).data.user?.id,
        amount: 5000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 550,
        total_repayment: 6600,
        purpose: 'Test disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    expect(loanError).toBeNull();
    expect(loanData).toBeTruthy();
    testLoanId = loanData!.id;
  });

  test.afterAll(async () => {
    // Cleanup: Delete test loan
    if (testLoanId) {
      await adminClient.from('loans').delete().eq('id', testLoanId);
    }

    // Sign out all clients
    await adminClient.auth.signOut();
    await loanOfficerClient.auth.signOut();
    await clientClient.auth.signOut();
  });

  test('admin can disburse approved loan', async () => {
    const { data, error } = await adminClient.rpc('complete_disbursement', {
      p_disbursement_id: testLoanId,
      p_payment_method: 'bank_transfer',
      p_payment_reference: 'TEST-BANK-REF-001',
      p_notes: 'Test disbursement by admin'
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.success).toBe(true);
    expect(data.payment_method).toBe('bank_transfer');
    expect(data.payment_reference).toBe('TEST-BANK-REF-001');

    // Verify loan status updated
    const { data: loan, error: loanError } = await adminClient
      .from('loans')
      .select('status, disbursed_at')
      .eq('id', testLoanId)
      .single();

    expect(loanError).toBeNull();
    expect(loan?.status).toBe('disbursed');
    expect(loan?.disbursed_at).toBeTruthy();
  });

  test('loan_officer can disburse approved loan', async () => {
    // Create another test loan
    const { data: newLoan } = await adminClient
      .from('loans')
      .insert({
        user_id: (await clientClient.auth.getUser()).data.user?.id,
        amount: 3000,
        term_months: 6,
        interest_rate: 32,
        monthly_payment: 660,
        total_repayment: 3960,
        purpose: 'Test loan officer disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const { data, error } = await loanOfficerClient.rpc('complete_disbursement', {
      p_disbursement_id: newLoan!.id,
      p_payment_method: 'mobile_money',
      p_payment_reference: 'TEST-MOBILE-REF-002',
      p_notes: 'Test disbursement by loan officer'
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.success).toBe(true);

    // Cleanup
    await adminClient.from('loans').delete().eq('id', newLoan!.id);
  });

  test('client cannot disburse loan', async () => {
    // Create another test loan
    const { data: newLoan } = await adminClient
      .from('loans')
      .insert({
        user_id: (await clientClient.auth.getUser()).data.user?.id,
        amount: 2000,
        term_months: 3,
        interest_rate: 32,
        monthly_payment: 880,
        total_repayment: 2640,
        purpose: 'Test unauthorized disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const { data, error } = await clientClient.rpc('complete_disbursement', {
      p_disbursement_id: newLoan!.id,
      p_payment_method: 'cash',
      p_payment_reference: 'TEST-UNAUTHORIZED',
      p_notes: 'Unauthorized attempt'
    });

    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');

    // Verify loan status NOT updated
    const { data: loan } = await adminClient
      .from('loans')
      .select('status, disbursed_at')
      .eq('id', newLoan!.id)
      .single();

    expect(loan?.status).toBe('approved');
    expect(loan?.disbursed_at).toBeNull();

    // Cleanup
    await adminClient.from('loans').delete().eq('id', newLoan!.id);
  });

  test('cannot disburse already disbursed loan', async () => {
    // Try to disburse the same loan again
    const { data, error } = await adminClient.rpc('complete_disbursement', {
      p_disbursement_id: testLoanId,
      p_payment_method: 'bank_transfer',
      p_payment_reference: 'TEST-DUPLICATE',
      p_notes: 'Duplicate attempt'
    });

    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.error).toContain('already');
  });

  test('disbursement creates audit trail', async () => {
    // Create another test loan
    const { data: newLoan } = await adminClient
      .from('loans')
      .insert({
        user_id: (await clientClient.auth.getUser()).data.user?.id,
        amount: 4000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 440,
        total_repayment: 5280,
        purpose: 'Test audit trail',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    // Disburse
    await adminClient.rpc('complete_disbursement', {
      p_disbursement_id: newLoan!.id,
      p_payment_method: 'debit_order',
      p_payment_reference: 'TEST-AUDIT-REF-003',
      p_notes: 'Test audit trail creation'
    });

    // Check audit log
    const { data: auditLogs, error: auditError } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('action', 'complete_disbursement')
      .eq('entity_id', newLoan!.id)
      .order('timestamp', { ascending: false })
      .limit(1);

    expect(auditError).toBeNull();
    expect(auditLogs).toBeTruthy();
    expect(auditLogs!.length).toBeGreaterThan(0);
    
    const auditLog = auditLogs![0];
    expect(auditLog.entity_type).toBe('disbursement');
    expect(auditLog.metadata).toBeTruthy();
    expect(auditLog.metadata.payment_method).toBe('debit_order');
    expect(auditLog.metadata.payment_reference).toBe('TEST-AUDIT-REF-003');

    // Cleanup
    await adminClient.from('loans').delete().eq('id', newLoan!.id);
  });

  test('validates payment method', async () => {
    // Create another test loan
    const { data: newLoan } = await adminClient
      .from('loans')
      .insert({
        user_id: (await clientClient.auth.getUser()).data.user?.id,
        amount: 1000,
        term_months: 3,
        interest_rate: 32,
        monthly_payment: 440,
        total_repayment: 1320,
        purpose: 'Test invalid payment method',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const { data, error } = await adminClient.rpc('complete_disbursement', {
      p_disbursement_id: newLoan!.id,
      p_payment_method: 'invalid_method',
      p_payment_reference: 'TEST-INVALID-METHOD',
      p_notes: 'Test invalid method'
    });

    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid payment method');

    // Cleanup
    await adminClient.from('loans').delete().eq('id', newLoan!.id);
  });
});
