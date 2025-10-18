import { supabase } from '@/integrations/supabase/client';
import { safeExposeWindow, debugLog } from './devToolsHelper';

export const setupAdminRole = async () => {
  try {
    debugLog('🔧 Setting up admin role...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return false;
    }
    
    debugLog('👤 Current user ID:', user.id);
    
    // Check if user role already exists - handle multiple roles properly
    const { data: existingRoles, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);
    
    if (checkError) {
      console.error('❌ Error checking user roles:', checkError);
      return false;
    }
    
    if (existingRoles && existingRoles.length > 0) {
      // User has roles - check if admin exists
      const hasAdmin = existingRoles.some(r => r.role === 'admin');
      if (hasAdmin) {
        console.log('✅ User already has admin role');
        return true;
      }
      console.log('ℹ️ User has roles but not admin:', existingRoles.map(r => r.role));
    }
    
    // Create admin role for user
    const { data: newRole, error: createError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating admin role:', createError);
      return false;
    }
    
    debugLog('✅ Admin role created successfully:', newRole);
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error setting up admin role:', error);
    return false;
  }
};

// Reactive refresh function that works with useAuth context
export const refreshAuthState = () => {
  debugLog('🔄 Auth state will refresh automatically via useAuth context');
  debugLog('💡 If role doesn\'t appear immediately, try signing out and back in');
};

// Auto-run setup if in development
if (import.meta.env.DEV) {
  debugLog('🚀 Auto-running admin role setup...');
  setupAdminRole().then(success => {
    if (success) {
      debugLog('✅ Admin role setup completed successfully');
      // Use reactive refresh instead of hard reload
      refreshAuthState();
    } else {
      debugLog('❌ Admin role setup failed');
    }
  });
}

// Expose for manual testing
safeExposeWindow('setupAdminRole', setupAdminRole, '🔧 Admin role setup available at: window.setupAdminRole()');
