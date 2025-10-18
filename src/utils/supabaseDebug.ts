import { supabase } from '@/integrations/supabase/client';
import { safeExposeWindow, debugLog, isDebugEnabled } from './devToolsHelper';

// Debug utilities
const debugUtils = {
  // Core Supabase client
  supabase,
  
  // Auth helpers
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) console.error('Error getting user:', error);
    return { user, error };
  },
  
  // Role management
  async getUserRole(userId?: string) {
    const { user, error: userError } = await this.getCurrentUser();
    if (userError) return { error: userError };
    
    const targetUserId = userId || user?.id;
    if (!targetUserId) return { error: 'No user ID available' };
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .maybeSingle();
      
    if (error) {
      console.error('Error getting user role:', error);
      return { error };
    }
    
    return { role: data?.role || null };
  },
  
  async makeAdmin(userId?: string) {
    const { user, error: userError } = await this.getCurrentUser();
    if (userError) return { error: userError };
    
    const targetUserId = userId || user?.id;
    if (!targetUserId) return { error: 'No user ID provided' };
    
    try {
      // First try to update if exists
      const { data: updateData, error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', targetUserId)
        .select()
        .single();

      if (!updateError) {
        debugLog('Successfully updated to admin:', updateData);
        return { data: updateData };
      }

      // If update fails, try insert
      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: targetUserId,
          role: 'admin',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error making user admin:', insertError);
        return { error: insertError };
      }

      debugLog('Successfully made admin:', insertData);
      return { data: insertData };
    } catch (error) {
      console.error('Unexpected error in makeAdmin:', error);
      return { error };
    }
  },
  
  // Debugging helpers
  async checkAuthState() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },
  
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    // Remove hard reload - let useAuth context handle state updates reactively
    debugLog('🔄 Sign out completed, auth state will update automatically');
    return { error };
  }
};

// Only expose in development with explicit debug flag
if (isDebugEnabled()) {
  safeExposeWindow('__SUPABASE_DEBUG__', debugUtils);
  safeExposeWindow('supabase', supabase);
  
  console.log('%cSupabase Debug Tools', 'color: #3ECF8E; font-weight: bold; font-size: 16px');
  console.log('Debug utilities available at:', 'window.__SUPABASE_DEBUG__');
  console.log('Try these commands:', '%cawait __SUPABASE_DEBUG__.getCurrentUser()', 'font-family: monospace;');
}

export default debugUtils;
 