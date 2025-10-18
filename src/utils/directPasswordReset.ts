// Direct password reset test without auto-execution to avoid recursion
import { supabaseAdmin } from '@/integrations/supabase/adminClient';

export const directPasswordReset = async () => {
  const targetUserId = '98812e7a-784d-4379-b3aa-e8327d214095';
  const newPassword = '123abc';
  
  console.log('🔧 Direct Password Reset Test');
  console.log('============================');
  console.log(`Target User: ${targetUserId}`);
  console.log(`New Password: ${newPassword}`);
  
  try {
    // Step 1: Test admin client access
    console.log('\n1. Testing admin client access...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Admin access failed:', listError.message);
      return { success: false, step: 'admin_access', error: listError.message };
    }
    
    console.log(`✅ Admin access successful - ${users?.length || 0} users found`);
    
    // Step 2: Find target user
    console.log('\n2. Finding target user...');
    const targetUser = users?.find((u: any) => u.id === targetUserId);
    
    if (!targetUser) {
      console.error('❌ Target user not found');
      console.log('Available users:');
      users?.slice(0, 3).forEach((u: any, i: number) => {
        console.log(`   ${i + 1}. ${u.email} (${u.id.substring(0, 8)}...)`);
      });
      return { success: false, step: 'find_user', error: 'User not found' };
    }
    
    console.log(`✅ Target user found: ${targetUser.email}`);
    
    // Step 3: Reset password
    console.log('\n3. Resetting password...');
    const { data, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword
    });
    
    if (resetError) {
      console.error('❌ Password reset failed:', resetError.message);
      return { success: false, step: 'password_reset', error: resetError.message };
    }
    
    console.log('✅ Password reset successful!');
    console.log('\n🎉 RESET COMPLETE!');
    console.log('==================');
    console.log(`Email: ${targetUser.email}`);
    console.log(`Password: ${newPassword}`);
    console.log('\nYou can now log in to NamLend with these credentials.');
    
    return { 
      success: true, 
      user: targetUser, 
      newPassword,
      message: 'Password reset completed successfully'
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, step: 'unexpected', error: String(error) };
  }
};

// Only expose to window, don't auto-run
if (import.meta.env.DEV) {
  (window as any).directPasswordReset = directPasswordReset;
  console.log('🔧 Direct password reset available at: window.directPasswordReset()');
}
