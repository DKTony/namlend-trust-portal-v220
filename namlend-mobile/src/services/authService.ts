/**
 * Authentication Service
 * Version: v2.4.2
 * 
 * Handles authentication with Supabase and biometric support
 */

import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

export class AuthService {
  /**
   * Check if biometric authentication is available
   */
  static async isBiometricAvailable(): Promise<boolean> {
    // Biometric auth not available on web
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Biometric check error:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometrics
   */
  static async authenticateWithBiometric(): Promise<boolean> {
    // Biometric auth not available on web
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access NamLend',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<{
    user: User | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'No user data returned' };
      }

      // Fetch user role
      const role = await this.getUserRole(data.user.id);

      // Fetch user profile
      const profile = await this.getUserProfile(data.user.id);

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        role,
        profile,
      };

      return { user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current session
   */
  static async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Get session error:', error);
        return null;
      }

      return data.session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Get user role from database
   */
  static async getUserRole(userId: string): Promise<UserRole> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error || !data || data.length === 0) {
        return 'client'; // Default role
      }

      // Priority: admin > loan_officer > client
      const roles = data.map(r => r.role);
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('loan_officer')) return 'loan_officer';
      return 'client';
    } catch (error) {
      console.error('Get user role error:', error);
      return 'client';
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Get profile error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  /**
   * Refresh user data
   */
  static async refreshUser(): Promise<User | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        return null;
      }

      const role = await this.getUserRole(authUser.id);
      const profile = await this.getUserProfile(authUser.id);

      return {
        id: authUser.id,
        email: authUser.email || '',
        role,
        profile,
      };
    } catch (error) {
      console.error('Refresh user error:', error);
      return null;
    }
  }
}
