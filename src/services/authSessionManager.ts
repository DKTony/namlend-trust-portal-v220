/**
 * Auth Session Manager
 * Extracted from useAuth hook to isolate session restoration,
 * role fetching, and local storage persistence logic.
 */

import { Session, User, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'namlend-auth';
const ROLE_FETCH_TIMEOUT_MS = 8000;
const SESSION_RETRY_DELAYS = [100, 300, 600];

// ─── Session Restoration ───────────────────────────────────────────────

export interface RestoredAuth {
  session: Session | null;
  user: User | null;
}

/**
 * Restore the current auth session using multiple fallback strategies:
 * 1. supabase.auth.getSession()
 * 2. Manual restore from localStorage
 * 3. Retry getSession() with exponential delays
 * 4. supabase.auth.getUser() as final fallback
 */
export async function restoreSession(): Promise<RestoredAuth> {
  let resolvedSession: Session | null = null;

  // Strategy 1: Direct getSession
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
    }
    resolvedSession = session;
  } catch (e) {
    console.error('Error in getSession:', e);
  }

  // Strategy 2: Manual restore from localStorage
  if (!resolvedSession) {
    const storedSession = readStoredSession();
    if (storedSession?.access_token) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token || '',
        });
        if (!error && data.session) {
          resolvedSession = data.session;
        }
      } catch (e) {
        console.warn('Failed to restore session from storage:', e);
      }
    }
  }

  // Strategy 3: Retry getSession with delays
  if (!resolvedSession) {
    for (const delay of SESSION_RETRY_DELAYS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const retry = await supabase.auth.getSession();
        if (retry.data.session) {
          resolvedSession = retry.data.session;
          break;
        }
      } catch {
        // continue to next retry
      }
    }
  }

  // Strategy 4: getUser fallback
  let resolvedUser = resolvedSession?.user ?? null;
  if (!resolvedUser) {
    try {
      const {
        data: { user: fallbackUser },
      } = await supabase.auth.getUser();
      resolvedUser = fallbackUser ?? null;
    } catch {
      // ignore
    }
  }

  // Strategy 5: Parse user from stored session
  if (!resolvedUser) {
    const storedSession = readStoredSession();
    if (storedSession) {
      if (!resolvedSession && storedSession.user) {
        resolvedSession = storedSession;
      }
      if (storedSession.user) {
        resolvedUser = storedSession.user;
      }
    }
  }

  return { session: resolvedSession, user: resolvedUser };
}

// ─── Role Fetching ─────────────────────────────────────────────────────

/**
 * Fetch user role with backoffice precedence: admin > loan_officer > client.
 * Times out after ROLE_FETCH_TIMEOUT_MS to avoid blocking the UI.
 */
export async function fetchUserRole(userId: string): Promise<string | null> {
  try {
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ROLE_FETCH_TIMEOUT_MS);
    });

    const roleResult = await Promise.race([
      supabase.from('user_roles').select('role').eq('user_id', userId),
      timeout,
    ]);

    if (!roleResult) {
      console.warn('Role fetch timed out, continuing without role');
      return null;
    }

    const { data, error } = roleResult as {
      data: { role: string }[] | null;
      error: PostgrestError | null;
    };

    if (error) {
      console.error('Error fetching user role:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const roles = data.map((r) => r.role);

    // Backoffice priority: admin first, then loan_officer, then client
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('loan_officer')) return 'loan_officer';
    if (roles.includes('client')) return 'client';
    return roles[0] ?? null;
  } catch (error) {
    console.error('Error in fetchUserRole:', error);
    return null;
  }
}

// ─── Storage Helpers ───────────────────────────────────────────────────

function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Session;
    }
  } catch (e) {
    console.warn('Failed to parse stored session:', e);
  }
  return null;
}

/**
 * Clear all persisted auth data from browser storage.
 * Best-effort — ignores errors (e.g. Safari private mode).
 */
export function clearPersistedAuth(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage access issues
  }
}
