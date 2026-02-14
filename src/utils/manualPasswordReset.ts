import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { debugLog } from './devToolsHelper';

// Check if admin client is available (only when VITE_ALLOW_LOCAL_ADMIN=true)
const isAdminAvailable = import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true';

/**
 * Manual password reset utility for development
 * This provides instructions and attempts automated reset
 * Requires VITE_ALLOW_LOCAL_ADMIN=true to function
 */
export const manualPasswordReset = async (targetUserId: string, newPassword: string) => {
  debugLog(`🔄 Manual password reset for user: ${targetUserId}`);
  
  // Guard: Check if admin client is available
  if (!isAdminAvailable) {
    debugLog(`⚠️ Admin client is disabled. To reset password manually:`);
    debugLog('   1. Go to Supabase Dashboard → Authentication → Users');
    debugLog(`   2. Find user with ID: ${targetUserId}`);
    debugLog(`   3. Click "Reset Password" and set to: ${newPassword}`);
    return { success: false, error: 'Admin client disabled - use Supabase Dashboard' };
  }
  
  try {
    debugLog(`⚠️ Note: This requires service role key, not anon key`);
    
    // First try to get user info (now using service role key)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      debugLog('❌ Cannot list users:', listError.message);
      debugLog('💡 To reset password manually:');
      debugLog('1. Go to Supabase Dashboard → Authentication → Users');
      debugLog(`2. Find user with ID: ${targetUserId}`);
      debugLog(`3. Click "Reset Password" and set to: ${newPassword}`);
      return { success: false, error: 'Admin privileges required' };
    }
    
    const targetUser = users?.find(u => u.id === targetUserId);
    if (!targetUser) {
      debugLog('❌ User not found in user list');
      return { success: false, error: 'User not found' };
    }
    
    debugLog('✅ User found:', targetUser.email);
    
    // Try to update password (using service role key)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword
    });
    
    if (error) {
      debugLog('❌ Error updating password:', error.message);
      debugLog('💡 Manual steps required:');
      debugLog('1. Go to Supabase Dashboard → Authentication → Users');
      debugLog(`2. Find user: ${targetUser.email}`);
      debugLog(`3. Click "Reset Password" and set to: ${newPassword}`);
      return { success: false, error: error.message };
    }
    
    debugLog('✅ Password updated successfully!');
    return { success: true, user: data.user };
  } catch (error) {
    debugLog('❌ Failed to reset password:', error);
    return { success: false, error: 'Unexpected error' };
  }
};

// Auto-run if in development and debug tools enabled
if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_TOOLS === 'true') {
  const targetUserId = '98812e7a-784d-4379-b3aa-e8327d214095';
  const newPassword = '123abc';
  
  debugLog('🚀 Auto-running manual password reset...');
  manualPasswordReset(targetUserId, newPassword).then(result => {
    if (result.success) {
      debugLog('✅ Password reset completed successfully!');
    } else {
      debugLog('❌ Password reset failed:', result.error);
    }
  }).catch(error => {
    debugLog('❌ Password reset error:', error);
  });
}

// Make available for debugging
import { safeExposeWindow } from './devToolsHelper';
safeExposeWindow('manualPasswordReset', manualPasswordReset);
