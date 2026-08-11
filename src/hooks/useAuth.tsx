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
 *
 * THREE INDEPENDENT SUBSCRIPTIONS
 * -------------------------------
 * Identity is assembled from the Convex session plus three separate reactive
 * queries (profile, tenant role, platform role) that settle at different times.
 * Anything that has to *choose* based on identity — the post-login redirect above
 * all — must wait for `authReady`, or it decides against half-loaded flags and
 * lands tenant staff on the client dashboard.
 */

import { api } from '@/integrations/convex/api';
import { markDeliberateSignOut } from '@/lib/routing';
import { buildOAuthRedirect } from '@/utils/safeRedirect';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef } from 'react';

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
  /** Raw Convex session state — true even while the profile query is still in flight. */
  isAuthenticated: boolean;
  /**
   * Every identity query has settled. The post-login redirect must gate on this:
   * role flags read `false` until their queries resolve, so deciding earlier sends
   * staff to `/dashboard`.
   */
  authReady: boolean;
  /**
   * The profile query RESOLVED and there is no row (not "still loading"). Means
   * enrollment was missed; the guard shows a recovery screen instead of bouncing to
   * `/auth`, which would loop forever because the redirect keys on `user`.
   */
  profileMissing: boolean;
  /** OAuth sign-up that still owes us the phone + ID number password sign-up collects. */
  needsProfileCompletion: boolean;
  roleLoading: boolean;
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
  /** Start the Google OAuth handshake. Navigates away; does not resolve in-page. */
  signInWithGoogle: (next?: string | null) => Promise<{ error: AuthError | null }>;
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

  // `undefined` = query in flight. `null` = query resolved, no profile row exists.
  // The two must not be conflated: the first is normal, the second means enrollment
  // was missed and the user is stranded (useAuth().user would stay null forever).
  const profileLoading = isAuthenticated && profileData === undefined;
  const profileMissing = isAuthenticated && profileData === null;

  // Self-heal: a session with no profile row can't use the app at all, so repair it
  // rather than stranding the user. `enrollUser` on the server is idempotent, and the
  // ref keeps this to one attempt per mount so a persistent failure can't spin.
  const enrollMe = useMutation(api.users.completeEnrollment);
  const healAttempted = useRef(false);
  useEffect(() => {
    if (isAuthenticated && profileData === null && !healAttempted.current) {
      healAttempted.current = true;
      enrollMe({}).catch((err) => console.error('[auth] self-heal enrollment failed:', err));
    }
  }, [isAuthenticated, profileData, enrollMe]);

  // Gate only accounts explicitly marked as OAuth sign-ups. Inferring "incomplete"
  // from blank phone/ID would trap the entire existing user base, none of whom have
  // a `signupSource`.
  const needsProfileCompletion =
    profileData?.signupSource === 'google' && profileData?.onboardingCompletedAt == null;

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

  // `loading` covers the profile query too: reporting "not loading" while `user` is
  // still null is what made every hard load of a protected route detour via /auth.
  const loading = isLoading || profileLoading;
  const authReady = !isLoading && !profileLoading && !roleLoading && !platformRoleLoading;

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

  const signInWithGoogle = useCallback(
    async (next?: string | null) => {
      try {
        // Anchor to the origin the user is actually on — one Convex deployment serves
        // both the Netlify site and localhost, and SITE_URL can only name one of them.
        // The backend allowlist (lib/authRedirect.ts) vets whatever we send.
        await authActions.signIn('google', {
          redirectTo: buildOAuthRedirect(window.location.origin, next),
        });
        // Unreachable in practice: signIn sets window.location.href before resolving.
        return { error: null };
      } catch (err) {
        const raw = err instanceof Error ? err : new Error('Google sign-in failed');
        return { error: raw as AuthError };
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
          idNumber?: string;
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
        // Rides the auth profile rather than a follow-up mutation: the client's auth
        // handshake completes asynchronously after signIn() resolves, so a separate
        // call races it and fails UNAUTHENTICATED. convex/auth.ts routes this to the
        // `profiles` row (it is not a `users` column).
        if (typeof userData?.id_number === 'string' && userData.id_number.trim()) {
          signUpArgs.idNumber = userData.id_number.trim();
        }
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
    // Mark this as a DELIBERATE sign-out before the session drops.
    //
    // The guard reacts to the lost session by redirecting to `/auth?next=<current page>`.
    // That parameter means "we interrupted you, resume afterwards" — true for an expired
    // session or a deep link, false for someone who chose to leave. Worse, it is applied
    // to whoever signs in NEXT: on a shared device an admin signing in after a client was
    // sent to the client's last page instead of /admin, and the previous user's route sat
    // in the next user's URL bar.
    //
    // A flag rather than navigating from here: AuthProvider is mounted ABOVE <Router> in
    // App.tsx so there is no useNavigate, and a hard `location.replace` would race any
    // navigation the caller does next. `consumeDeliberateSignOut()` clears it on read.
    markDeliberateSignOut();
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
        loading,
        isAuthenticated,
        authReady,
        profileMissing,
        needsProfileCompletion,
        roleLoading,
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
        signInWithGoogle,
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
