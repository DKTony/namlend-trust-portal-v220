import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TEST_USERS } from '../fixtures';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as
  | string
  | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'test123';

async function signInWithRetry(
  supabase: {
    auth: { signInWithPassword: (creds: { email: string; password: string }) => Promise<any> };
  },
  email: string,
  password: string,
  maxRetries = 5
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { data, error: null };
    if (attempt < maxRetries && error.message?.includes('rate')) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Auth rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    } else {
      return { data, error };
    }
  }
  return { data: null, error: new Error('Max auth retries exceeded') as any };
}

// Inserts a tiny disbursement for an existing loan and marks it completed
// Verifies that the loan status is set to 'disbursed' by the trigger.

test.describe('Disbursements Ledger - Admin Insert/Complete', () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'SUPABASE_URL and SUPABASE_ANON_KEY must be provided'
  );

  test('insert and complete disbursement propagates loan status', async () => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    const { error: signInError } = await signInWithRetry(supabase, ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(signInError).toBeNull();

    // Grab any loan id
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id,status')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(loansError).toBeNull();
    let loan = loans?.[0];
    let createdLoanId: string | null = null;
    if (!loan) {
      const { data: adminSession } = await supabase.auth.getUser();
      const adminId = adminSession.user?.id;
      const { data: createdLoan, error: createLoanError } = await supabase
        .from('loans')
        .insert({
          user_id: TEST_USERS.client1.id,
          amount: 1000,
          term_months: 3,
          interest_rate: 32,
          monthly_payment: 440,
          total_repayment: 1320,
          total_paid: 0,
          purpose: 'E2E Ledger Loan',
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminId,
        })
        .select('id,status')
        .single();
      expect(createLoanError).toBeNull();
      loan = createdLoan || undefined;
      createdLoanId = createdLoan?.id || null;
    }
    expect(loan).toBeTruthy();

    const reference = `E2E-${Date.now()}`;
    const { data: inserted, error: insertError } = await supabase
      .from('disbursements')
      .insert({ loan_id: loan.id, amount: 0.01, status: 'pending', method: 'EFT', reference })
      .select('id')
      .single();
    expect(insertError).toBeNull();
    expect(inserted?.id).toBeTruthy();

    const { error: updateError } = await supabase
      .from('disbursements')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', inserted!.id);
    expect(updateError).toBeNull();

    // Check loan status (may already be disbursed; should at least be disbursed now)
    const { data: updatedLoans, error: loanFetchError } = await supabase
      .from('loans')
      .select('status, disbursed_at')
      .eq('id', loan.id)
      .single();
    expect(loanFetchError).toBeNull();
    expect(updatedLoans?.status).toBe('disbursed');

    if (createdLoanId) {
      await supabase.from('loans').delete().eq('id', createdLoanId);
    }
  });
});
