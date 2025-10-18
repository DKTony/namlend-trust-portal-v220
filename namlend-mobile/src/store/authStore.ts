/**
 * Authentication State Management with Zustand
 * Version: v2.4.2
 */

import { create } from 'zustand';
import { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  hasInitializedAuth: boolean;
  authListenerBound: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setHasInitializedAuth: (v: boolean) => void;
  setAuthListenerBound: (v: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  biometricEnabled: false,
  hasInitializedAuth: false,
  authListenerBound: false,

  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user 
  }),

  setSession: (session) => set({ session }),

  setLoading: (loading) => set({ isLoading: loading }),

  setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),

  setHasInitializedAuth: (v) => set({ hasInitializedAuth: v }),

  setAuthListenerBound: (v) => set({ authListenerBound: v }),

  signOut: () => set({ 
    user: null, 
    session: null, 
    isAuthenticated: false 
  }),
}));
