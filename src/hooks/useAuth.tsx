/**
 * Authentication hook — Convex Auth replacement for Supabase Auth.
 *
 * Exported context shape is IDENTICAL to the Supabase version so that zero
 * consumer components need updating. The `User` and `Session` shapes are
 * narrowed to a compatible local interface that covers all fields consumers
 * actually use (id, email, user_metadata).
 *
 * Migration from Supabase Auth:
 *   supabase.auth.signInWithPassword → useAuthActions().signIn({ provider: "password", ... })
 *   supabase.auth.signOut            → useAuthActions().signOut()
 *   supabase.auth.onAuthStateChange  → useConvexAuth() (reactive, managed by Convex)
 *   5-strategy session restore       → eliminated (Convex Auth handles natively)
 *   user_roles RPC                   → useQuery(api.users.getMyRole)
 */

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/integrations/convex/api';

// ---------------------------------------------------------------------------
// Compatible User/Session types (replaces Supabase types)
// Fields match what consumers actually access in this codebase.
// ---------------------------------------------------------------------------

export interface ConvexUser {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
    phone?: string;
    [key: string]: unknown;
  };
  app_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
}

export interface ConvexSession {
  access_token: string;
  user: ConvexUser;
}

// Use type aliases that match the shape consumers expect
type User = ConvexUser;
type Session = ConvexSession;
type AuthError = Error & { status?: number };

interface UserMetadata {
  full_name?: string;
  phone?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  userRole: string | null;
  isAdmin: boolean;
  isLoanOfficer: boolean;
  refreshUser: () => Promise<User | null>;
  signUp: (
    email: string,
    password: string,
    userData?: UserMetadata
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: AuthError | null;
    data?: { session: Session | null; user: User | null };
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authActions = useAuthActions();

  // Fetch role and profile from Convex once authenticated
  const roleData = useQuery(api.users.getMyRole, isAuthenticated ? {} : 'skip');
  const profileData = useQuery(api.users.getMyProfile, isAuthenticated ? {} : 'skip');

  const userRole = typeof roleData === 'string' ? roleData : null;
  const roleLoading = isAuthenticated && roleData === undefined;

  // Build a User-shaped object from Convex profile data
  const user: User | null =
    isAuthenticated && profileData
      ? {
          id: profileData.userId ?? '',
          email: profileData.email ?? undefined,
          user_metadata: {
            full_name: profileData.fullName ?? undefined,
            phone: profileData.phone ?? undefined,
          },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date(profileData.createdAt ?? Date.now()).toISOString(),
        }
      : null;

  // Session is a lightweight wrapper (consumers rarely use session directly)
  const session: Session | null = user ? { access_token: 'convex-managed', user } : null;

  // `tenant_admin` is the multi-tenant successor to `admin`; both are treated as admin
  // during the additive Phase-0 transition (matches the widened backend guards).
  const isAdmin = userRole === 'admin' || userRole === 'tenant_admin';
  const isLoanOfficer =
    userRole === 'loan_officer' || userRole === 'admin' || userRole === 'tenant_admin';

  // ---------------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------------

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        await authActions.signIn('password', { email, password, flow: 'signIn' });
        return { error: null, data: { session: null, user: null } };
      } catch (err) {
        const raw = err instanceof Error ? err : new Error('Sign in failed');
        // Map Convex Auth errors to user-friendly messages
        const msg = raw.message || '';
        let error: Error;
        if (msg.includes('InvalidAccountId')) {
          error = new Error('No account found with this email. Please sign up first.');
        } else if (msg.includes('InvalidSecret')) {
          error = new Error('Incorrect password. Please try again.');
        } else {
          error = raw;
        }
        return { error: error as AuthError, data: undefined };
      }
    },
    [authActions]
  );

  const signUp = useCallback(
    async (email: string, password: string, userData?: UserMetadata) => {
      try {
        await authActions.signIn('password', {
          email,
          password,
          flow: 'signUp',
          name: userData?.full_name as string | undefined,
          phone: userData?.phone as string | undefined,
        });
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign up failed');
        return { error: error as AuthError };
      }
    },
    [authActions]
  );

  const signOut = useCallback(async () => {
    try {
      await authActions.signOut();
    } catch (err) {
      console.error('Sign out error (non-fatal):', err);
    }
  }, [authActions]);

  const resetPassword = useCallback(
    async (email: string) => {
      // Convex Auth Password provider supports password reset via signIn flow
      try {
        await authActions.signIn('password', { email, flow: 'reset' });
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Reset failed');
        return { error: error as AuthError };
      }
    },
    [authActions]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      try {
        await authActions.signIn('password', {
          flow: 'reset-verification',
          newPassword,
        });
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Update failed');
        return { error: error as AuthError };
      }
    },
    [authActions]
  );

  const refreshUser = useCallback(async (): Promise<User | null> => {
    // With Convex Auth, the session is always up to date via useConvexAuth().
    // This is a no-op that returns the current user.
    return user;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: isLoading,
        roleLoading,
        userRole,
        isAdmin,
        isLoanOfficer,
        refreshUser,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
