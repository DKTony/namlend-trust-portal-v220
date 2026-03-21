import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as
  | string
  | undefined;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Test1234!';

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

// QUARANTINE: Legacy Supabase RPC test — calls get_admin_dashboard_summary Postgres RPC.
// Convex equivalent: api.analytics.getAdminDashboardSummary (not yet wired in this test).
// Status: fail (legacy Supabase dependency) — tracked in plan N4 triage.
// Self-skips when SUPABASE_URL / SUPABASE_ANON_KEY are absent.
test.describe('Admin Metrics RPC', () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'QUARANTINE [legacy-supabase]: SUPABASE_URL and SUPABASE_ANON_KEY must be provided. Migrate to Convex api.analytics in N2 batch.'
  );

  test('get_admin_dashboard_summary returns numeric metrics for admin', async () => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    const { data: auth, error: signInError } = await signInWithRetry(
      supabase,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );
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
