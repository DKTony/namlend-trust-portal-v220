import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string | undefined;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'anthnydklrk@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '123abc';

// Minimal validation of disbursements ledger read access for admin
// Does not require any existing data; only asserts successful query
// Skips automatically if env is not configured.

test.describe('Disbursements Ledger - Admin Read', () => {
  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'SUPABASE_URL and SUPABASE_ANON_KEY must be provided');

  test('admin can query disbursements table (may be empty)', async () => {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { data, error } = await supabase.from('disbursements').select('*').limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
