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

import { api } from '@/integrations/convex/api';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { createContext, ReactNode, useCallback, useContext } from 'react';

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
  /**
   * True while the session OR the profile behind `user` is still resolving. Consumers that
   * branch on `!user` MUST check this first — otherwise they treat "profile in flight" as
   * "signed out" and bounce an authenticated user to /auth.
   */
  loading: boolean;
  roleLoading: boolean;
  /** The `getMyProfile` query has not resolved yet. Folded into `loading`; exposed for guards. */
  profileLoading: boolean;
  /** Authenticated, but no `profiles` row exists — a broken account, not a signed-out one. */
  profileMissing: boolean;
  /**
   * Every identity query has settled, so role-dependent decisions (notably the post-login
   * landing route) are safe to make. Gating on `user` alone races the role queries.
   */
  authReady: boolean;
  userRole: string | null;
  isAdmin: boolean;
  isLoanOfficer: boolean;
  // Platform (control-plane) identity — orthogonal to the tenant role above.
  // Sourced from `platformAdmins`, NOT `userRoles`, so a tenant_admin can never
  // self-escalate into platform scope.
  platformRole: 'platform_owner' | 'platform_support' | null;
  isPlatformOwner: boolean;
  isPlatformSupport: boolean;
  isPlatformStaff: boolean;
  platformRoleLoading: boolean;
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
  // Platform role — a cheap indexed `platformAdmins.by_userId` lookup that returns null
  // for every non-platform user (i.e. everyone, until the owner runs the Phase-0 seed).
  const platformRoleData = useQuery(
    api.platform.admins.getMyPlatformRole,
    isAuthenticated ? {} : 'skip'
  );

  const userRole = typeof roleData === 'string' ? roleData : null;
  const roleLoading = isAuthenticated && roleData === undefined;

  // `undefined` means the query is in flight; `null` means it resolved to "no profile row".
  // Only the first is a loading state — conflating them is what made the guard redirect an
  // authenticated user to /auth on every hard page load.
  const profileLoading = isAuthenticated && profileData === undefined;
  const profileMissing = isAuthenticated && profileData === null;

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

  // Platform identity (control plane). `getMyPlatformRole` already filters to active staff,
  // returning null otherwise, so the booleans are a direct read.
  const platformRole =
    platformRoleData === 'platform_owner' || platformRoleData === 'platform_support'
      ? platformRoleData
      : null;
  const platformRoleLoading = isAuthenticated && platformRoleData === undefined;
  const isPlatformOwner = platformRole === 'platform_owner';
  const isPlatformSupport = platformRole === 'platform_support';
  const isPlatformStaff = platformRole !== null;

  // Both planes have answered, so `isAdmin`/`isLoanOfficer`/`isPlatformStaff` are final rather
  // than "false, so far". The landing redirect must wait for this or it lands an admin on
  // /dashboard whenever the profile query happens to resolve before the role query.
  const authReady = !isLoading && !roleLoading && !platformRoleLoading && !profileLoading;

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
        const signUpArgs: {
          email: string;
          flow: 'signUp';
          name?: string;
          password: string;
          phone?: string;
        } = {
          email,
          password,
          flow: 'signUp',
        };
        if (userData?.full_name) signUpArgs.name = userData.full_name;
        if (userData?.phone) signUpArgs.phone = userData.phone;
        await authActions.signIn('password', signUpArgs);
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
        loading: isLoading || profileLoading,
        roleLoading,
        profileLoading,
        profileMissing,
        authReady,
        userRole,
        isAdmin,
        isLoanOfficer,
        platformRole,
        isPlatformOwner,
        isPlatformSupport,
        isPlatformStaff,
        platformRoleLoading,
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
