import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string | undefined;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'anthnydklrk@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '123abc';

// Inserts a tiny disbursement for an existing loan and marks it completed
// Verifies that the loan status is set to 'disbursed' by the trigger.

test.describe('Disbursements Ledger - Admin Insert/Complete', () => {
  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL and SUPABASE_ANON_KEY must be provided');

  test('insert and complete disbursement propagates loan status', async () => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(signInError).toBeNull();

    // Grab any loan id
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id,status')
      .order('created_at', { ascending: false })
      .limit(1);
    expect(loansError).toBeNull();
    if (!loans || loans.length === 0) {
      test.skip(true, 'No loans available to test disbursements');
    }

    const loan = loans![0];

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
  });
});
