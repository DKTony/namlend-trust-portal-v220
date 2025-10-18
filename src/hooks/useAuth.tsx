import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  isAdmin: boolean;
  isLoanOfficer: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = userRole === 'admin';
  const isLoanOfficer = userRole === 'loan_officer' || userRole === 'admin';

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      console.log('Fetching role for user:', userId);
      
      // Query user_roles table - get all roles for prioritization
      // Use select() without .single() to handle multiple roles properly
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      console.log('Role query result:', { data, error });

      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
        return null;
      }
      
      // Handle roles with correct backoffice precedence: admin > loan_officer > client
      let role = null;
      if (data && data.length > 0) {
        const roles = data.map(r => r.role);
        console.log('User has roles:', roles);
        
        // Backoffice priority: admin first, then loan_officer, then client
        if (roles.includes('admin')) {
          role = 'admin';
        } else if (roles.includes('loan_officer')) {
          role = 'loan_officer';
        } else if (roles.includes('client')) {
          role = 'client';
        } else {
          role = roles[0] ?? null; // Fallback to first role if unknown
        }
      }
      
      console.log('Selected user role:', role, 'from available roles:', data?.map(r => r.role));
      setUserRole(role);
      
      return role;
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        
        console.log('Initial session check:', !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in initAuth:', error);
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserRole]);

  const signUp = async (email: string, password: string, userData?: any) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
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

      // Best-effort clean-up of persisted session keys
      try {
        window.localStorage.removeItem('namlend-auth');
        window.sessionStorage.removeItem('namlend-auth');
      } catch (_) {
        // ignore storage access issues (Safari private mode, etc.)
      }
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      userRole,
      isAdmin,
      isLoanOfficer,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword
    }}>
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