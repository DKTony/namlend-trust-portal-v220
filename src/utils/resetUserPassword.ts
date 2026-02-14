import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { debugLog } from './devToolsHelper';

// Check if admin client is available (only when VITE_ALLOW_LOCAL_ADMIN=true)
const isAdminAvailable = import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true';

/**
 * Reset a user's password using the admin client
 * This is a development utility for testing password reset functionality
 * Requires VITE_ALLOW_LOCAL_ADMIN=true to function
 */
export const resetUserPassword = async (userId: string, newPassword: string) => {
  debugLog(`🔄 Attempting to reset password for user: ${userId}`);
  
  // Guard: Check if admin client is available
  if (!isAdminAvailable) {
    debugLog('⚠️ Admin client is disabled. Set VITE_ALLOW_LOCAL_ADMIN="true" to enable password reset.');
    debugLog('💡 To reset password manually:');
    debugLog('   1. Go to Supabase Dashboard → Authentication → Users');
    debugLog(`   2. Find user with ID: ${userId}`);
    debugLog('   3. Click "Reset Password"');
    return { success: false, error: 'Admin client disabled - use Supabase Dashboard' };
  }
  
  try {
    // First, let's check if the user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return { success: false, error: userError.message };
    }
    
    if (!userData.user) {
      console.error('❌ User not found');
      return { success: false, error: 'User not found' };
    }
    
    console.log('✅ User found:', userData.user.email);
    
    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (error) {
      console.error('❌ Error updating password:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Password updated successfully for user:', userData.user.email);
    return { 
      success: true, 
      user: data.user,
      message: `Password reset successfully for ${userData.user.email}` 
    };
    
  } catch (error) {
    debugLog('❌ Failed to reset password:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// DISABLED: Auto-run requires admin client which is disabled by default for security.
// Run manually via console: window.resetUserPassword('user-id', 'new-password')
//
// if (import.meta.env.DEV && import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true') {
//   resetUserPassword('user-id', 'password');
// }

// Expose to window for manual testing
if (import.meta.env.DEV) {
  (window as any).resetUserPassword = resetUserPassword;
}
