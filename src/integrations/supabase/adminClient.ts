import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// IMPORTANT SECURITY NOTE
// Do NOT expose the service role key in the browser. This module now guards
// access behind an explicit flag and removes hardcoded fallbacks.
// Only enable locally and intentionally for specific debugging.

const isLocalAdminAllowed = import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true';

// Provide a throwing stub by default so accidental usage fails fast.
function createThrowingStub() {
  const err = () => {
    throw new Error(
      'Supabase admin client is disabled. Set VITE_ALLOW_LOCAL_ADMIN="true" in local dev only to enable. Never enable or bundle this in production.'
    );
  };
  return new Proxy({}, {
    get: () => err,
    apply: () => err,
  }) as any;
}

let client: ReturnType<typeof createClient<Database>> | null = null;
if (isLocalAdminAllowed) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY for local admin client.');
  }
  client = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = client ?? createThrowingStub();

// Expose to window only when explicitly allowed in local dev
if (isLocalAdminAllowed) {
  (window as any).supabaseAdmin = supabaseAdmin;
  console.log('🔧 Admin Supabase client enabled locally at window.supabaseAdmin');
}
