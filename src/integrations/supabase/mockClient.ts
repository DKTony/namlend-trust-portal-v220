/**
 * Mock Supabase client for development when real Supabase instance is unavailable
 * This allows frontend testing without backend dependencies
 */

import type { Database } from './types';

// Mock user data for testing
const mockUsers = [
  {
    id: 'mock-user-1',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-admin-1', 
    email: 'admin@example.com',
    user_metadata: { full_name: 'Admin User' },
    created_at: new Date().toISOString()
  }
];

// Mock session storage
let currentSession: any = null;

const createMockSupabaseClient = () => {
  return {
    auth: {
      signUp: async ({ email, password }: { email: string; password: string }) => {
        console.log('🔧 Mock signup:', email);
        const user = {
          id: `mock-user-${Date.now()}`,
          email,
          user_metadata: { full_name: email.split('@')[0] },
          created_at: new Date().toISOString()
        };
        
        currentSession = {
          user,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        };
        
        return { 
          data: { user, session: currentSession }, 
          error: null 
        };
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        console.log('🔧 Mock signin:', email);
        
        // Simulate authentication
        const user = mockUsers.find(u => u.email === email) || mockUsers[0];
        
        currentSession = {
          user,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        };
        
        // Trigger auth state change callback if it exists
        setTimeout(() => {
          if ((window as any).__mockAuthCallback) {
            (window as any).__mockAuthCallback('SIGNED_IN', currentSession);
          }
        }, 100);
        
        return { 
          data: { user, session: currentSession }, 
          error: null 
        };
      },

      signOut: async () => {
        console.log('🔧 Mock signout');
        currentSession = null;
        
        // Trigger auth state change callback if it exists
        setTimeout(() => {
          if ((window as any).__mockAuthCallback) {
            (window as any).__mockAuthCallback('SIGNED_OUT', null);
          }
        }, 100);
        
        return { error: null };
      },

      getSession: async () => {
        return { 
          data: { session: currentSession }, 
          error: null 
        };
      },

      getUser: async () => {
        return { 
          data: { user: currentSession?.user || null }, 
          error: null 
        };
      },

      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Mock auth state change listener
        // Store callback for later use
        (window as any).__mockAuthCallback = callback;
        return {
          data: { subscription: { unsubscribe: () => {} } }
        };
      }
    },

    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          maybeSingle: async () => {
            console.log(`🔧 Mock query: ${table}.${column} = ${value}`);
            
            // Mock user roles
            if (table === 'user_roles') {
              const isAdmin = currentSession?.user?.email?.includes('admin');
              return {
                data: isAdmin ? { role: 'admin' } : { role: 'client' },
                error: null
              };
            }
            
            return { data: null, error: null };
          },
          single: async () => {
            console.log(`🔧 Mock query: ${table}.${column} = ${value}`);
            return { data: { role: 'client' }, error: null };
          }
        })
      }),

      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            console.log(`🔧 Mock insert: ${table}`, data);
            return { 
              data: { id: `mock-${Date.now()}`, ...data }, 
              error: null 
            };
          }
        })
      }),

      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: async () => {
              console.log(`🔧 Mock update: ${table}`, data);
              return { 
                data: { id: value, ...data }, 
                error: null 
              };
            }
          })
        })
      })
    })
  };
};

export const mockSupabase = createMockSupabaseClient();
