import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  restoreSession,
  fetchUserRole as fetchRole,
  clearPersistedAuth,
} from '@/services/authSessionManager';

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
  ) => Promise<{ error: AuthError | null; data?: { session: Session | null; user: User | null } }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  // Track if we've completed the initial session check to avoid race conditions
  const initialCheckComplete = useRef(false);
  const authResolveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = userRole === 'admin';
  const isLoanOfficer = userRole === 'loan_officer' || userRole === 'admin';

  const fetchUserRole = useCallback(async (userId: string) => {
    setRoleLoading(true);
    try {
      const role = await fetchRole(userId);
      setUserRole(role);
      return role;
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole(null);
      return null;
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    // Restore session using the extracted session manager.
    // Uses multiple fallback strategies (getSession → localStorage → retry → getUser).
    const initAuth = async () => {
      try {
        const { session: resolvedSession, user: resolvedUser } = await restoreSession();

        setSession(resolvedSession);
        setUser(resolvedUser);

        if (resolvedUser) {
          void fetchUserRole(resolvedUser.id);
        } else {
          setUserRole(null);
          setRoleLoading(false);
        }

        if (resolvedUser) {
          initialCheckComplete.current = true;
          setLoading(false);
        } else if (!authResolveTimeout.current) {
          authResolveTimeout.current = setTimeout(() => {
            if (!initialCheckComplete.current) {
              initialCheckComplete.current = true;
              setLoading(false);
            }
            authResolveTimeout.current = null;
          }, 1200);
        }
      } catch (error) {
        console.error('Error in initAuth:', error);
        initialCheckComplete.current = true;
        setLoading(false);
      }
    };

    initAuth();

    // Set up auth state listener for subsequent changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION events - we handle initial state via getSession()
      // This prevents the race condition where INITIAL_SESSION fires with null
      // before the persisted session is restored
      if (event === 'INITIAL_SESSION' && !session?.user) {
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        void fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }

      if (authResolveTimeout.current) {
        clearTimeout(authResolveTimeout.current);
        authResolveTimeout.current = null;
      }

      // Only set loading false if initial check hasn't happened yet
      if (!initialCheckComplete.current) {
        initialCheckComplete.current = true;
        setLoading(false);
      }
    });

    return () => {
      if (authResolveTimeout.current) {
        clearTimeout(authResolveTimeout.current);
        authResolveTimeout.current = null;
      }
      subscription?.unsubscribe();
    };
  }, [fetchUserRole]);

  const signUp = async (email: string, password: string, userData?: UserMetadata) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error, data: { session: data?.session ?? null, user: data?.user ?? null } };
  };

  const signOut = async () => {
    try {
      // Attempt to sign out of Supabase globally (client + server refresh tokens)
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      // Even if Supabase signOut throws, proceed with local cleanup to enforce sign-out UX
      console.error('Sign out error (non-fatal):', error);
    } finally {
      // Clear local auth state so UI updates immediately without hard reload
      setUser(null);
      setSession(null);
      setUserRole(null);
      setRoleLoading(false);

      // Best-effort clean-up of persisted session keys
      clearPersistedAuth();
    }
  };

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return null;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        void fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }

      return session?.user ?? null;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return null;
    }
  }, [fetchUserRole]);

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
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
