/**
 * Mock Supabase client for development when real Supabase instance is unavailable
 * This allows frontend testing without backend dependencies
 */

import type { Database } from './types';

// Mock user data for testing
const mockUsers = [
  {
    id: 'mock-client-1',
    email: 'client@namlend.com',
    user_metadata: { full_name: 'Client User' },
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-admin-1', 
    email: 'admin@namlend.com',
    user_metadata: { full_name: 'Admin User' },
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-user-1',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-admin-2', 
    email: 'admin@example.com',
    user_metadata: { full_name: 'Admin Example' },
    created_at: new Date().toISOString()
  }
];

// Mock session storage
let currentSession: any = null;

const createMockSupabaseClient = () => {
  return {
    auth: {
      signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
        console.log('🔧 Mock signup:', email);
        const userData = options?.data || {};
        const user = {
          id: `mock-user-${Date.now()}`,
          email,
          user_metadata: { 
            full_name: userData.first_name && userData.last_name 
              ? `${userData.first_name} ${userData.last_name}` 
              : email.split('@')[0],
            ...userData
          },
          created_at: new Date().toISOString()
        };
        
        currentSession = {
          user,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        };
        
        // Trigger auth state change callback
        if ((window as any).__mockAuthCallback) {
          console.log('🔧 Triggering SIGNED_IN callback after signup');
          (window as any).__mockAuthCallback('SIGNED_IN', currentSession);
        }
        
        return { 
          data: { user, session: currentSession }, 
          error: null 
        };
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        console.log('🔧 Mock signin:', email);
        
        // Simulate authentication - find matching user or use first one
        const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || mockUsers[0];
        console.log('🔧 Mock user matched:', user.email, 'id:', user.id);
        
        currentSession = {
          user,
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token'
        };
        
        // Trigger auth state change callback IMMEDIATELY (not delayed)
        // This ensures useAuth context is updated before Auth.tsx navigates
        if ((window as any).__mockAuthCallback) {
          console.log('🔧 Triggering SIGNED_IN callback immediately');
          (window as any).__mockAuthCallback('SIGNED_IN', currentSession);
        }
        
        return { 
          data: { user, session: currentSession }, 
          error: null 
        };
      },

      signOut: async (options?: { scope?: 'global' | 'local' }) => {
        console.log('🔧 Mock signout', options?.scope || 'local');
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
      },

      resetPasswordForEmail: async (email: string, options?: any) => {
        console.log('🔧 Mock resetPasswordForEmail:', email);
        return { data: {}, error: null };
      },

      updateUser: async (attributes: { password?: string; email?: string; data?: any }) => {
        console.log('🔧 Mock updateUser:', attributes);
        if (currentSession?.user) {
          currentSession.user = {
            ...currentSession.user,
            ...attributes.data,
            user_metadata: {
              ...currentSession.user.user_metadata,
              ...attributes.data
            }
          };
        }
        return { data: { user: currentSession?.user }, error: null };
      }
    },

    // Mock realtime channel for notifications
    channel: (channelName: string) => {
      console.log(`🔧 Mock channel: ${channelName}`);
      return {
        on: (event: string, callback: (payload: any) => void) => {
          console.log(`🔧 Mock channel.on: ${event}`);
          return {
            subscribe: () => {
              console.log(`🔧 Mock channel subscribe`);
              return Promise.resolve();
            }
          };
        },
        unsubscribe: () => {
          console.log(`🔧 Mock channel unsubscribe`);
          return Promise.resolve();
        }
      };
    },

    // Mock removeChannel method
    removeChannel: (channel: any) => {
      console.log(`🔧 Mock removeChannel`);
      return Promise.resolve();
    },

    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => {
          // Create a proper Promise-like object that supports both .then() and await
          const getMockData = () => {
            console.log(`🔧 Mock query: ${table}.${column} = ${value}`);
            
            if (table === 'user_roles') {
              const isAdmin = currentSession?.user?.email?.includes('admin');
              const role = isAdmin ? 'admin' : 'client';
              console.log(`🔧 Mock user role resolved: ${role} (email: ${currentSession?.user?.email})`);
              return { data: [{ role }], error: null };
            }
            
            if (table === 'profiles') {
              return {
                data: [{
                  id: currentSession?.user?.id,
                  user_id: currentSession?.user?.id,
                  first_name: currentSession?.user?.user_metadata?.full_name?.split(' ')[0] || 'Test',
                  last_name: currentSession?.user?.user_metadata?.full_name?.split(' ')[1] || 'User',
                  email: currentSession?.user?.email,
                  verified: true
                }],
                error: null
              };
            }
            
            return { data: [], error: null };
          };

          const mockQuery = {
            maybeSingle: async () => {
              const result = getMockData();
              return { 
                data: result.data?.[0] || null, 
                error: result.error 
              };
            },
            single: async () => {
              const result = getMockData();
              return { 
                data: result.data?.[0] || null, 
                error: result.error 
              };
            },
            // Proper Promise-like implementation for await support
            then: (resolve: (value: any) => any, reject?: (reason: any) => any) => {
              const result = getMockData();
              return Promise.resolve(result).then(resolve, reject);
            },
            catch: (reject: (reason: any) => any) => {
              return Promise.resolve(getMockData()).catch(reject);
            },
            order: (orderColumn: string, options?: any) => ({
              limit: (count: number) => ({
                then: (resolve: (value: any) => any, reject?: (reason: any) => any) => {
                  console.log(`🔧 Mock query: ${table}.${column} = ${value} order by ${orderColumn} limit ${count}`);
                  return Promise.resolve({ data: [], error: null }).then(resolve, reject);
                },
                catch: (reject: (reason: any) => any) => Promise.resolve({ data: [], error: null }).catch(reject)
              }),
              then: (resolve: (value: any) => any, reject?: (reason: any) => any) => {
                console.log(`🔧 Mock query: ${table}.${column} = ${value} order by ${orderColumn}`);
                return Promise.resolve({ data: [], error: null }).then(resolve, reject);
              },
              catch: (reject: (reason: any) => any) => Promise.resolve({ data: [], error: null }).catch(reject)
            })
          };
          
          return mockQuery;
        },
        order: (column: string, options?: any) => ({
          limit: (count: number) => ({
            then: (resolve: (value: any) => any, reject?: (reason: any) => any) => {
              console.log(`🔧 Mock query: ${table} order by ${column} limit ${count}`);
              return Promise.resolve({ data: [], error: null }).then(resolve, reject);
            },
            catch: (reject: (reason: any) => any) => Promise.resolve({ data: [], error: null }).catch(reject)
          }),
          then: (resolve: (value: any) => any, reject?: (reason: any) => any) => {
            console.log(`🔧 Mock query: ${table} order by ${column}`);
            return Promise.resolve({ data: [], error: null }).then(resolve, reject);
          },
          catch: (reject: (reason: any) => any) => Promise.resolve({ data: [], error: null }).catch(reject)
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
