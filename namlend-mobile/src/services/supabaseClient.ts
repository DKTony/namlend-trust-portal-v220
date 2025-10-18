/**
 * Supabase Client Configuration for Mobile
 * Version: v2.4.2
 * 
 * Configured with:
 * - AsyncStorage for session persistence
 * - Auto-refresh tokens
 * - Secure storage for sensitive data
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Check .env file.');
}

const g: any = globalThis as any;
export const supabase = g.__namlend_supabase || createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Mobile doesn't use URL-based auth
  },
  global: {
    headers: {
      'X-Client-Info': 'namlend-mobile',
    },
  },
});
g.__namlend_supabase = supabase;

/**
 * Session timeout configuration (15 minutes)
 */
export const SESSION_TIMEOUT_MS = 
  parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES || '15', 10) * 60 * 1000;

/**
 * API timeout configuration
 */
export const API_TIMEOUT_MS = 
  parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10);
