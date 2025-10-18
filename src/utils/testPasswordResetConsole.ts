// Console test for password reset functionality
// Run this in browser console: window.testPasswordReset()

import { supabaseAdmin } from '@/integrations/supabase/adminClient';

export const testPasswordReset = async () => {
  const targetUserId = '98812e7a-784d-4379-b3aa-e8327d214095';
  const testPassword = '123abc';
  
  console.log('🔧 Testing Password Reset with Service Role Key');
  console.log('===============================================');
  console.log(`Target User ID: ${targetUserId}`);
  console.log(`New Password: ${testPassword}`);
  console.log('');
  
  try {
    // Step 1: List users to verify admin access
    console.log('1. Testing admin access - listing users...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list users:', listError.message);
      return { success: false, step: 'list_users', error: listError.message };
    }
    
    console.log(`✅ Admin access confirmed - found ${users?.length || 0} users`);
    
    // Step 2: Find target user
    console.log('2. Finding target user...');
    const targetUser = users?.find((u: any) => u.id === targetUserId);
    
    if (!targetUser) {
      console.error('❌ Target user not found');
      console.log('Available users:');
      users?.forEach((u: any, i: number) => {
        console.log(`   ${i + 1}. ${u.email} (${u.id})`);
      });
      return { success: false, step: 'find_user', error: 'User not found' };
    }
    
    console.log(`✅ Target user found: ${targetUser.email}`);
    
    // Step 3: Reset password
    console.log('3. Resetting password...');
    const { data, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: testPassword
    });
    
    if (resetError) {
      console.error('❌ Password reset failed:', resetError.message);
      return { success: false, step: 'reset_password', error: resetError.message };
    }
    
    console.log('✅ Password reset successful!');
    console.log(`   User: ${targetUser.email}`);
    console.log(`   New Password: ${testPassword}`);
    console.log('');
    console.log('🎉 You can now log in to the NamLend app with:');
    console.log(`   Email: ${targetUser.email}`);
    console.log(`   Password: ${testPassword}`);
    console.log('');
    console.log('===============================================');
    
    return { 
      success: true, 
      user: targetUser,
      newPassword: testPassword,
      message: 'Password reset completed successfully'
    };
    
  } catch (error) {
    // Properly serialize error for console output
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack
    } : String(error);
    console.error('❌ Unexpected error during password reset:', errorDetails);
    return { success: false, step: 'unexpected', error: error instanceof Error ? error.message : String(error) };
  }
};

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).testPasswordReset = testPasswordReset;
}

// DISABLED: Auto-execution removed to prevent production contamination
// Development utilities should be explicitly invoked via console:
// window.testPasswordReset()
