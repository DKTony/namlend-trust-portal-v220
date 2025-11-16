/**
 * E2E Tests for Backoffice Disbursement Functionality
 * Tests the complete disbursement flow including RPC, RLS, and audit trail
 */

import { test, expect } from '../fixtures';

test.describe('Disbursement API Tests', () => {

  test('admin can disburse approved loan', async ({ adminSupabase, client1Supabase }) => {
    // Create a test loan in 'approved' status
    const { data: loanData } = await adminSupabase
      .from('loans')
      .insert({
        user_id: (await client1Supabase.auth.getUser()).data.user?.id,
        amount: 5000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 550,
        total_repayment: 6600,
        purpose: 'Test disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminSupabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const testLoanId = loanData!.id;

    // First create a disbursement for the approved loan
    const { data: disbursementData } = await adminSupabase.rpc('create_disbursement_on_approval', {
      p_loan_id: testLoanId
    });
    expect(disbursementData.success).toBe(true);
    const disbursementId = disbursementData.disbursement_id;

    const { data, error } = await adminSupabase.rpc('complete_disbursement', {
      p_disbursement_id: disbursementId,
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
    const { data: loan, error: loanError } = await adminSupabase
      .from('loans')
      .select('status, disbursed_at')
      .eq('id', testLoanId)
      .single();

    expect(loanError).toBeNull();
    expect(loan?.status).toBe('disbursed');
    expect(loan?.disbursed_at).toBeTruthy();

    // Cleanup
    await adminSupabase.from('loans').delete().eq('id', testLoanId);
  });

  test('loan_officer can disburse approved loan', async ({ loanOfficerSupabase, adminSupabase, client1Supabase }) => {
    // Create another test loan
    const { data: newLoan } = await adminSupabase
      .from('loans')
      .insert({
        user_id: (await client1Supabase.auth.getUser()).data.user?.id,
        amount: 3000,
        term_months: 6,
        interest_rate: 32,
        monthly_payment: 660,
        total_repayment: 3960,
        purpose: 'Test loan officer disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminSupabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    // Create disbursement for the loan
    const { data: disbursementData } = await loanOfficerSupabase.rpc('create_disbursement_on_approval', {
      p_loan_id: newLoan!.id
    });
    expect(disbursementData.success).toBe(true);

    const { data, error } = await loanOfficerSupabase.rpc('complete_disbursement', {
      p_disbursement_id: disbursementData.disbursement_id,
      p_payment_method: 'mobile_money',
      p_payment_reference: 'TEST-MOBILE-REF-002',
      p_notes: 'Test disbursement by loan officer'
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.success).toBe(true);

    // Cleanup
    await adminSupabase.from('loans').delete().eq('id', newLoan!.id);
  });

  test('client cannot disburse loan', async ({ client1Supabase, adminSupabase }) => {
    // Create another test loan
    const { data: newLoan } = await adminSupabase
      .from('loans')
      .insert({
        user_id: (await client1Supabase.auth.getUser()).data.user?.id,
        amount: 2000,
        term_months: 3,
        interest_rate: 32,
        monthly_payment: 880,
        total_repayment: 2640,
        purpose: 'Test unauthorized disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminSupabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const { data, error } = await client1Supabase.rpc('complete_disbursement', {
      p_disbursement_id: newLoan!.id,
      p_payment_method: 'cash',
      p_payment_reference: 'TEST-UNAUTHORIZED',
      p_notes: 'Unauthorized attempt'
    });

    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');

    // Verify loan status NOT updated
    const { data: loan } = await adminSupabase
      .from('loans')
      .select('status, disbursed_at')
      .eq('id', newLoan!.id)
      .single();

    expect(loan?.status).toBe('approved');
    expect(loan?.disbursed_at).toBeNull();

    // Cleanup
    await adminSupabase.from('loans').delete().eq('id', newLoan!.id);
  });

  test('cannot disburse already disbursed loan', async ({ adminSupabase, client1Supabase }) => {
    // Create and disburse a loan
    const { data: loanData } = await adminSupabase
      .from('loans')
      .insert({
        user_id: (await client1Supabase.auth.getUser()).data.user?.id,
        amount: 5000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 550,
        total_repayment: 6600,
        purpose: 'Test duplicate disbursement',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminSupabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const testLoanId = loanData!.id;

    // Create and complete disbursement
    const { data: disbursementData } = await adminSupabase.rpc('create_disbursement_on_approval', {
      p_loan_id: testLoanId
    });
    await adminSupabase.rpc('complete_disbursement', {
      p_disbursement_id: disbursementData.disbursement_id,
      p_payment_method: 'bank_transfer',
      p_payment_reference: 'TEST-FIRST',
      p_notes: 'First disbursement'
    });

    // Try to disburse the same loan again
    const { data, error } = await adminSupabase.rpc('complete_disbursement', {
      p_disbursement_id: disbursementData.disbursement_id,
      p_payment_method: 'bank_transfer',
      p_payment_reference: 'TEST-DUPLICATE',
      p_notes: 'Duplicate attempt'
    });

    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.error).toContain('already');

    // Cleanup
    await adminSupabase.from('loans').delete().eq('id', testLoanId);
  });

  test('disbursement creates audit trail', async ({ adminSupabase, client1Supabase }) => {
    // Create another test loan
    const { data: newLoan } = await adminSupabase
      .from('loans')
      .insert({
        user_id: (await client1Supabase.auth.getUser()).data.user?.id,
        amount: 4000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 440,
        total_repayment: 5280,
        purpose: 'Test audit trail',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminSupabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    // Create disbursement for the loan
    const { data: disbursementData } = await adminSupabase.rpc('create_disbursement_on_approval', {
      p_loan_id: newLoan!.id
    });
    expect(disbursementData.success).toBe(true);

    // Disburse
    await adminSupabase.rpc('complete_disbursement', {
      p_disbursement_id: disbursementData.disbursement_id,
      p_payment_method: 'debit_order',
      p_payment_reference: 'TEST-AUDIT-REF-003',
      p_notes: 'Test audit trail creation'
    });

    // Check audit log (audit_logs schema: table_name, record_id, new_values)
    const { data: auditLogs, error: auditError } = await adminSupabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'complete_disbursement')
      .eq('table_name', 'disbursements')
      .eq('record_id', disbursementData.disbursement_id)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(auditError).toBeNull();
    expect(auditLogs).toBeTruthy();
    expect(auditLogs!.length).toBeGreaterThan(0);
    
    const auditLog = auditLogs![0];
    expect(auditLog.table_name).toBe('disbursements');
    expect(auditLog.new_values).toBeTruthy();
    expect(auditLog.new_values.payment_method).toBe('debit_order');
    expect(auditLog.new_values.payment_reference).toBe('TEST-AUDIT-REF-003');

    // Cleanup
    await adminSupabase.from('loans').delete().eq('id', newLoan!.id);
  });

  test('validates payment method', async ({ adminSupabase, client1Supabase }) => {
    // Create another test loan
    const { data: newLoan } = await adminSupabase
      .from('loans')
      .insert({
        user_id: (await client1Supabase.auth.getUser()).data.user?.id,
        amount: 1000,
        term_months: 3,
        interest_rate: 32,
        monthly_payment: 440,
        total_repayment: 1320,
        purpose: 'Test invalid payment method',
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: (await adminSupabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    const { data, error } = await adminSupabase.rpc('complete_disbursement', {
      p_disbursement_id: newLoan!.id,
      p_payment_method: 'invalid_method',
      p_payment_reference: 'TEST-INVALID-METHOD',
      p_notes: 'Test invalid method'
    });

    expect(data).toBeTruthy();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid payment method');

    // Cleanup
    await adminSupabase.from('loans').delete().eq('id', newLoan!.id);
  });
});
