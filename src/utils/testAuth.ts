import { supabase } from '@/integrations/supabase/client';

export const testAdminAuth = async (email: string, password: string) => {
  console.log('🔐 Testing admin authentication...');
  
  try {
    // First, sign out any existing session
    await supabase.auth.signOut();
    
    // Attempt to sign in
    console.log(`🔑 Attempting to sign in as ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error.message);
      return { success: false, error: error.message };
    }
    
    if (data?.user) {
      console.log('✅ Successfully authenticated:', data.user.email);
      
      // Check if the user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();
      
      if (roleError || !roleData) {
        console.error('❌ Failed to fetch user role:', roleError?.message || 'No role found');
        return { 
          success: false, 
          error: roleError?.message || 'No role found for user',
          user: data.user
        };
      }
      
      console.log(`👤 User role: ${roleData.role}`);
      
      // Sign out after testing
      await supabase.auth.signOut();
      
      return { 
        success: true, 
        role: roleData.role,
        user: data.user 
      };
    }
    
    return { success: false, error: 'No user data returned' };
    
  } catch (error) {
    console.error('❌ Error during authentication test:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Auto-run in development when this module is imported directly
if (import.meta.env.DEV && import.meta.hot) {
  console.log('🛠️ Auth test module loaded in development mode');
  // Add to window for manual testing
  (window as any).testAdminAuth = testAdminAuth;
}
