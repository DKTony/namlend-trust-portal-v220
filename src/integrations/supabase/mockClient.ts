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

/**
 * Creates a chainable query builder that supports all common Supabase methods.
 * Terminal methods (those that return data) are async and resolve with mock data.
 */
const createQueryBuilder = (table: string, operation: string, payload?: any) => {
  const builder: any = {
    select: (columns?: string) => builder,
    eq: (column: string, value: any) => builder,
    neq: (column: string, value: any) => builder,
    in: (column: string, values: any[]) => builder,
    gt: (column: string, value: any) => builder,
    lt: (column: string, value: any) => builder,
    gte: (column: string, value: any) => builder,
    lte: (column: string, value: any) => builder,
    like: (column: string, value: string) => builder,
    ilike: (column: string, value: string) => builder,
    is: (column: string, value: any) => builder,
    order: (column: string, opts?: any) => builder,
    limit: (count: number) => builder,
    range: (from: number, to: number) => builder,
    insert: (data: any) => {
      console.log(`🔧 Mock insert: ${table}`, data);
      return createQueryBuilder(table, 'insert', data);
    },
    update: (data: any) => {
      console.log(`🔧 Mock update: ${table}`, data);
      return createQueryBuilder(table, 'update', data);
    },
    upsert: (data: any) => {
      console.log(`🔧 Mock upsert: ${table}`, data);
      return createQueryBuilder(table, 'upsert', data);
    },
    delete: () => createQueryBuilder(table, 'delete'),
    single: async () => {
      if (table === 'user_roles') {
        const isAdmin = currentSession?.user?.email?.includes('admin');
        return { data: isAdmin ? { role: 'admin' } : { role: 'client' }, error: null };
      }
      if (operation === 'insert' || operation === 'upsert') {
        return { data: { id: `mock-${Date.now()}`, ...payload }, error: null };
      }
      if (operation === 'update') {
        return { data: { ...payload }, error: null };
      }
      return { data: null, error: null };
    },
    maybeSingle: async () => {
      if (table === 'user_roles') {
        const isAdmin = currentSession?.user?.email?.includes('admin');
        return { data: isAdmin ? { role: 'admin' } : { role: 'client' }, error: null };
      }
      return { data: null, error: null };
    },
    // Make the builder itself thenable so await resolves it as a terminal query
    then: (resolve: (val: any) => void, reject?: (err: any) => void) => {
      const result = { data: [], error: null };
      if (operation === 'insert' || operation === 'upsert') {
        result.data = [{ id: `mock-${Date.now()}`, ...payload }] as any;
      }
      resolve(result);
    },
  };
  return builder;
};

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
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            if ((window as any).__mockAuthCallback) {
              (window as any).__mockAuthCallback('SIGNED_IN', currentSession);
            }
          }, 100);
        }

        return {
          data: { user, session: currentSession },
          error: null
        };
      },

      signOut: async () => {
        console.log('🔧 Mock signout');
        currentSession = null;

        if (typeof window !== 'undefined') {
          setTimeout(() => {
            if ((window as any).__mockAuthCallback) {
              (window as any).__mockAuthCallback('SIGNED_OUT', null);
            }
          }, 100);
        }

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

      setSession: async ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
        console.log('🔧 Mock setSession');
        return {
          data: { session: currentSession },
          error: null
        };
      },

      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Mock auth state change listener
        if (typeof window !== 'undefined') {
          (window as any).__mockAuthCallback = callback;
        }
        return {
          data: { subscription: { unsubscribe: () => {} } }
        };
      }
    },

    from: (table: string) => createQueryBuilder(table, 'select'),

    rpc: async (fnName: string, params?: any) => {
      console.log(`🔧 Mock RPC: ${fnName}`, params);
      return { data: null, error: null };
    }
  };
};

export const mockSupabase = createMockSupabaseClient();
