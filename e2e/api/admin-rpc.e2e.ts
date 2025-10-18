import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string | undefined;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'anthnydklrk@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '123abc';

// This test verifies the new admin RPC using a real authenticated session.
// It runs as an API test (no browser interaction needed).
test.describe('Admin Metrics RPC', () => {
  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL and SUPABASE_ANON_KEY must be provided');

  test('get_admin_dashboard_summary returns numeric metrics for admin', async () => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(signInError).toBeNull();
    expect(auth?.user).toBeTruthy();

    const { data, error } = await supabase.rpc('get_admin_dashboard_summary');
    expect(error).toBeNull();
    expect(data).toBeTruthy();

    const row = Array.isArray(data) ? data[0] : data;
    expect(typeof row.total_clients).toBe('number');
    expect(typeof row.total_loans).toBe('number');
    expect(typeof row.total_disbursed).toBe('number');
    expect(typeof row.total_repayments).toBe('number');
    expect(typeof row.overdue_payments).toBe('number');
    expect(typeof row.pending_amount).toBe('number');
    expect(typeof row.rejected_amount).toBe('number');
  });
});
