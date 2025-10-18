import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { debugLog } from './devToolsHelper';

/**
 * Reset a user's password using the admin client
 * This is a development utility for testing password reset functionality
 */
export const resetUserPassword = async (userId: string, newPassword: string) => {
  debugLog(`🔄 Attempting to reset password for user: ${userId}`);
  
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

// Auto-run for the specific user if in development
if (import.meta.env.DEV && import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true') {
  const targetUserId = '98812e7a-784d-4379-b3aa-e8327d214095';
  const newPassword = '123abc';
  
  console.log('🚀 Auto-running password reset...');
  resetUserPassword(targetUserId, newPassword).then((result) => {
    if (result.success) {
      console.log('✅ Password reset completed!', result.message);
    } else {
      console.log('❌ Password reset failed:', result.error);
    }
  }).catch((error) => {
    console.log('❌ Password reset error:', error);
  });
}

// Expose to window for manual testing
if (import.meta.env.DEV) {
  (window as any).resetUserPassword = resetUserPassword;
}
