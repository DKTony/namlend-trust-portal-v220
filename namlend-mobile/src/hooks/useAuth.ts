/**
 * Authentication Hook for Mobile
 * Version: v2.4.2
 */

import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const {
    user,
    session,
    isAuthenticated,
    isLoading,
    biometricEnabled,
    hasInitializedAuth,
    authListenerBound,
    setUser,
    setSession,
    setLoading,
    setBiometricEnabled,
    setHasInitializedAuth,
    setAuthListenerBound,
    signOut: storeSignOut,
  } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 Starting auth initialization...');
        setLoading(true);
        const currentSession = await AuthService.getSession();
        console.log('📱 Current session:', currentSession ? 'Found' : 'None');
        if (currentSession) {
          setSession(currentSession);
          const userData = await AuthService.refreshUser();
          console.log('👤 User data:', userData ? 'Loaded' : 'None');
          setUser(userData);
        }
        const biometricAvailable = await AuthService.isBiometricAvailable();
        console.log('🔐 Biometric available:', biometricAvailable);
        setBiometricEnabled(biometricAvailable);
        console.log('✅ Auth initialization complete');
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        console.log('🏁 Setting loading to false');
        setLoading(false);
        setHasInitializedAuth(true);
      }
    };

    if (!hasInitializedAuth) {
      // First load in this app runtime or after store reset
      initializeAuth();
    } else {
      // Ensure UI is not stuck in loading after fast refresh/hot reload
      setLoading(false);
    }

    // Bind a single auth listener using store flag
    if (!authListenerBound) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log('🔔 Auth state changed:', event);
          setSession(session);
          if (event === 'SIGNED_IN' && session) {
            const userData = await AuthService.refreshUser();
            setUser(userData);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            const userData = await AuthService.refreshUser();
            setUser(userData);
          }
        }
      );
      setAuthListenerBound(true);
      // We intentionally do not store unsubscribe globally here; RN/Expo will recreate on cold start
    }
  }, [hasInitializedAuth, authListenerBound, setAuthListenerBound, setHasInitializedAuth, setLoading, setSession, setUser, setBiometricEnabled]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await AuthService.signIn(email, password);
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      setUser(result.user);
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await AuthService.signOut();
      
      if (result.error) {
        return { success: false, error: result.error };
      }

      storeSignOut();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      const success = await AuthService.authenticateWithBiometric();
      return { success };
    } catch (error) {
      console.error('Biometric auth error:', error);
      return { success: false };
    }
  };

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    biometricEnabled,
    signIn,
    signOut,
    authenticateWithBiometric,
  };
};
