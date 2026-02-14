import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// IMPORTANT SECURITY NOTE
// Do NOT expose the service role key in the browser. This module now guards
// access behind an explicit flag and removes hardcoded fallbacks.
// Only enable locally and intentionally for specific debugging.

const isLocalAdminAllowed = import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true';

// Provide a throwing stub by default so accidental usage fails fast.
// Uses a recursive proxy to handle deep property access chains like supabaseAdmin.auth.admin.getUserById()
function createThrowingStub() {
  const errorMessage =
    'Supabase admin client is disabled. Set VITE_ALLOW_LOCAL_ADMIN="true" in local dev only to enable. Never enable or bundle this in production.';
  
  const createNestedProxy = (): unknown => {
    return new Proxy(() => {
      throw new Error(errorMessage);
    }, {
      get: (_target, prop) => {
        // Allow 'then' to return undefined so await doesn't hang
        if (prop === 'then') return undefined;
        // Return another nested proxy for any property access
        return createNestedProxy();
      },
      apply: () => {
        throw new Error(errorMessage);
      },
    });
  };
  
  return createNestedProxy() as ReturnType<typeof createClient<Database>>;
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

// SECURITY: Never expose admin client to window object - removed for security
