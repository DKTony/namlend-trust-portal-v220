/**
 * E2E RLS Tests for Disbursements Table
 * 
 * Verifies Row-Level Security policies for disbursements:
 * - Clients can only read their own disbursements
 * - Clients cannot create disbursements
 * - Admins and loan officers can create and read all disbursements
 * - Proper role-based access control
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test users
const CLIENT_EMAIL = 'client1@test.namlend.com';
const CLIENT_PASSWORD = 'test123';
const ADMIN_EMAIL = 'admin@test.namlend.com';
const ADMIN_PASSWORD = 'test123';
const LOAN_OFFICER_EMAIL = 'loan_officer@test.namlend.com';
const LOAN_OFFICER_PASSWORD = 'test123';

test.describe('Disbursements Table RLS', () => {
  let clientSupabase: ReturnType<typeof createClient>;
  let adminSupabase: ReturnType<typeof createClient>;
  let loanOfficerSupabase: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    loanOfficerSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Sign in users
    await clientSupabase.auth.signInWithPassword({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    });

    await adminSupabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    await loanOfficerSupabase.auth.signInWithPassword({
      email: LOAN_OFFICER_EMAIL,
      password: LOAN_OFFICER_PASSWORD,
    });
  });

  test.afterAll(async () => {
    await clientSupabase.auth.signOut();
    await adminSupabase.auth.signOut();
    await loanOfficerSupabase.auth.signOut();
  });

  test('Client can read their own disbursements', async () => {
    const { data: { user } } = await clientSupabase.auth.getUser();
    expect(user).toBeTruthy();

    // Query disbursements
    const { data, error } = await clientSupabase
      .from('disbursements')
      .select('*');

    expect(error).toBeNull();
    
    // All returned disbursements should belong to the current user
    if (data && data.length > 0) {
      data.forEach(disbursement => {
        expect(disbursement.user_id).toBe(user!.id);
      });
    }
  });

  test('Client cannot read other user disbursements', async () => {
    const { data: { user } } = await clientSupabase.auth.getUser();
    expect(user).toBeTruthy();

    // Try to query with a different user_id filter
    // This should return empty due to RLS
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await clientSupabase
      .from('disbursements')
      .select('*')
      .eq('user_id', fakeUserId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('Client cannot create disbursement directly', async () => {
    const { data: { user } } = await clientSupabase.auth.getUser();
    expect(user).toBeTruthy();

    // Try to insert a disbursement record
    const { data, error } = await clientSupabase
      .from('disbursements')
      .insert({
        user_id: user!.id,
        loan_id: '00000000-0000-0000-0000-000000000001',
        amount: 5000,
        method: 'bank_transfer',
        status: 'pending',
      });

    // Should fail due to RLS policy
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/policy|permission|denied/i);
  });

  test('Client cannot update disbursement', async () => {
    // First, get a disbursement ID (if any exist)
    const { data: disbursements } = await clientSupabase
      .from('disbursements')
      .select('id')
      .limit(1);

    if (disbursements && disbursements.length > 0) {
      const disbursementId = disbursements[0].id;

      // Try to update it
      const { data, error } = await clientSupabase
        .from('disbursements')
        .update({ status: 'completed' })
        .eq('id', disbursementId);

      // Should fail due to RLS policy
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/policy|permission|denied/i);
    }
  });

  test('Client cannot delete disbursement', async () => {
    const { data: disbursements } = await clientSupabase
      .from('disbursements')
      .select('id')
      .limit(1);

    if (disbursements && disbursements.length > 0) {
      const disbursementId = disbursements[0].id;

      // Try to delete it
      const { data, error } = await clientSupabase
        .from('disbursements')
        .delete()
        .eq('id', disbursementId);

      // Should fail due to RLS policy
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/policy|permission|denied/i);
    }
  });

  test('Admin can read all disbursements', async () => {
    const { data, error } = await adminSupabase
      .from('disbursements')
      .select('*')
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    
    // Admin should see disbursements from multiple users
    // (assuming test data exists)
  });

  test('Admin can create disbursement', async () => {
    const { data: { user: adminUser } } = await adminSupabase.auth.getUser();
    expect(adminUser).toBeTruthy();

    // Get a test loan to disburse
    const { data: loans } = await adminSupabase
      .from('loans')
      .select('id, user_id, amount')
      .eq('status', 'approved')
      .is('disbursed_at', null)
      .limit(1);

    if (loans && loans.length > 0) {
      const loan = loans[0];

      // Create disbursement
      const { data, error } = await adminSupabase
        .from('disbursements')
        .insert({
          user_id: loan.user_id,
          loan_id: loan.id,
          amount: loan.amount,
          method: 'bank_transfer',
          status: 'pending',
          processed_by: adminUser!.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.user_id).toBe(loan.user_id);

      // Cleanup
      if (data) {
        await adminSupabase
          .from('disbursements')
          .delete()
          .eq('id', data.id);
      }
    }
  });

  test('Admin can update disbursement status', async () => {
    const { data: { user: adminUser } } = await adminSupabase.auth.getUser();
    expect(adminUser).toBeTruthy();

    // Get a test loan
    const { data: loans } = await adminSupabase
      .from('loans')
      .select('id, user_id, amount')
      .eq('status', 'approved')
      .is('disbursed_at', null)
      .limit(1);

    if (loans && loans.length > 0) {
      const loan = loans[0];

      // Create disbursement
      const { data: disbursement } = await adminSupabase
        .from('disbursements')
        .insert({
          user_id: loan.user_id,
          loan_id: loan.id,
          amount: loan.amount,
          method: 'mobile_money',
          status: 'pending',
          processed_by: adminUser!.id,
        })
        .select()
        .single();

      expect(disbursement).toBeTruthy();

      // Update status
      const { data, error } = await adminSupabase
        .from('disbursements')
        .update({ 
          status: 'completed',
          payment_reference: 'TEST-REF-' + Date.now()
        })
        .eq('id', disbursement!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('completed');

      // Cleanup
      await adminSupabase
        .from('disbursements')
        .delete()
        .eq('id', disbursement!.id);
    }
  });

  test('Loan Officer can read all disbursements', async () => {
    const { data, error } = await loanOfficerSupabase
      .from('disbursements')
      .select('*')
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  test('Loan Officer can create disbursement', async () => {
    const { data: { user: loanOfficerUser } } = await loanOfficerSupabase.auth.getUser();
    expect(loanOfficerUser).toBeTruthy();

    // Get a test loan
    const { data: loans } = await loanOfficerSupabase
      .from('loans')
      .select('id, user_id, amount')
      .eq('status', 'approved')
      .is('disbursed_at', null)
      .limit(1);

    if (loans && loans.length > 0) {
      const loan = loans[0];

      // Create disbursement
      const { data, error } = await loanOfficerSupabase
        .from('disbursements')
        .insert({
          user_id: loan.user_id,
          loan_id: loan.id,
          amount: loan.amount,
          method: 'cash',
          status: 'pending',
          processed_by: loanOfficerUser!.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Cleanup
      if (data) {
        await loanOfficerSupabase
          .from('disbursements')
          .delete()
          .eq('id', data.id);
      }
    }
  });

  test('Disbursement with invalid method is rejected', async () => {
    const { data: { user: adminUser } } = await adminSupabase.auth.getUser();
    expect(adminUser).toBeTruthy();

    const { data: loans } = await adminSupabase
      .from('loans')
      .select('id, user_id, amount')
      .eq('status', 'approved')
      .is('disbursed_at', null)
      .limit(1);

    if (loans && loans.length > 0) {
      const loan = loans[0];

      // Try to create with invalid method
      const { data, error } = await adminSupabase
        .from('disbursements')
        .insert({
          user_id: loan.user_id,
          loan_id: loan.id,
          amount: loan.amount,
          method: 'invalid_method', // Invalid
          status: 'pending',
          processed_by: adminUser!.id,
        });

      // Should fail due to CHECK constraint
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/check|constraint|method/i);
    }
  });

  test('Disbursement query includes loan details via join', async () => {
    const { data, error } = await adminSupabase
      .from('disbursements')
      .select(`
        *,
        loan:loans(id, amount, status, term_months)
      `)
      .limit(5);

    expect(error).toBeNull();
    
    if (data && data.length > 0) {
      data.forEach(disbursement => {
        expect(disbursement.loan).toBeTruthy();
        expect(disbursement.loan).toHaveProperty('id');
        expect(disbursement.loan).toHaveProperty('amount');
      });
    }
  });

  test('Disbursement query includes user profile via join', async () => {
    const { data, error } = await adminSupabase
      .from('disbursements')
      .select(`
        *,
        profile:profiles(first_name, last_name, phone_number)
      `)
      .limit(5);

    expect(error).toBeNull();
    
    if (data && data.length > 0) {
      data.forEach(disbursement => {
        expect(disbursement.profile).toBeTruthy();
      });
    }
  });
});

test.describe('Disbursements RLS - Unauthenticated Access', () => {
  let anonSupabase: ReturnType<typeof createClient>;

  test.beforeAll(() => {
    anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  test('Unauthenticated user cannot read disbursements', async () => {
    const { data, error } = await anonSupabase
      .from('disbursements')
      .select('*');

    // Should return empty or error
    if (!error) {
      expect(data).toEqual([]);
    } else {
      expect(error.message).toMatch(/JWT|auth|policy/i);
    }
  });

  test('Unauthenticated user cannot create disbursement', async () => {
    const { data, error } = await anonSupabase
      .from('disbursements')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        loan_id: '00000000-0000-0000-0000-000000000001',
        amount: 1000,
        method: 'bank_transfer',
        status: 'pending',
      });

    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/JWT|auth|policy/i);
  });
});

test.describe('Disbursements RLS - Complete Disbursement RPC', () => {
  let adminSupabase: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await adminSupabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  });

  test.afterAll(async () => {
    await adminSupabase.auth.signOut();
  });

  test('Admin can complete disbursement via RPC', async () => {
    // Get a pending disbursement
    const { data: disbursements } = await adminSupabase
      .from('disbursements')
      .select('id, loan_id')
      .eq('status', 'pending')
      .limit(1);

    if (disbursements && disbursements.length > 0) {
      const disbursement = disbursements[0];

      // Complete it via RPC
      const { data, error } = await adminSupabase.rpc('complete_disbursement', {
        p_disbursement_id: disbursement.id,
        p_payment_method: 'bank_transfer',
        p_payment_reference: 'RPC-TEST-' + Date.now(),
        p_notes: 'E2E RLS test completion'
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Verify disbursement was updated
      const { data: updated } = await adminSupabase
        .from('disbursements')
        .select('status, payment_reference')
        .eq('id', disbursement.id)
        .single();

      expect(updated?.status).toBe('completed');
      expect(updated?.payment_reference).toContain('RPC-TEST-');

      // Verify loan was updated
      const { data: loan } = await adminSupabase
        .from('loans')
        .select('status, disbursed_at')
        .eq('id', disbursement.loan_id)
        .single();

      expect(loan?.status).toBe('disbursed');
      expect(loan?.disbursed_at).toBeTruthy();
    }
  });

  test('Client cannot complete disbursement via RPC', async () => {
    const clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await clientSupabase.auth.signInWithPassword({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    });

    // Try to complete a disbursement as client
    const { data, error } = await clientSupabase.rpc('complete_disbursement', {
      p_disbursement_id: '00000000-0000-0000-0000-000000000000',
      p_payment_method: 'bank_transfer',
      p_payment_reference: 'UNAUTHORIZED',
      p_notes: 'Should fail'
    });

    // Should fail due to role check in RPC
    expect(error).toBeTruthy();
    expect(error?.message).toMatch(/permission|role|unauthorized/i);

    await clientSupabase.auth.signOut();
  });
});
