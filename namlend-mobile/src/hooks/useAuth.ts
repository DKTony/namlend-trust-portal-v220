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
    setUser, 
    setSession, 
    setLoading,
    setBiometricEnabled,
    signOut: storeSignOut 
  } = useAuthStore();

  useEffect(() => {
    const g: any = globalThis as any;
    // Initialize only once per app runtime using a global guard
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
      }
    };

    if (!g.__namlend_auth_init_done) {
      g.__namlend_auth_init_done = true;
      initializeAuth();
    }

    // Bind a single global auth listener
    if (!g.__namlend_auth_listener_bound) {
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
      g.__namlend_auth_listener_bound = true;
      g.__namlend_auth_listener = authListener;
    }
  }, []);

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
