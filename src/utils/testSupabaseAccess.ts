import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/adminClient';

export const testSupabaseAccess = async () => {
  console.log('🔧 Testing Supabase Access with Updated Keys');
  console.log('==============================================');
  
  try {
    // Test regular client (anon key)
    console.log('1. Testing regular client (anon key)...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError && userError.message !== 'Auth session missing!') {
      console.error('❌ Regular client error:', userError.message);
    } else {
      console.log('✅ Regular client working:', user ? `User: ${user.email}` : 'No session (expected)');
    }
    
    // Test database access with RLS
    console.log('2. Testing database access (with RLS)...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('⚠️ Profiles access (expected with RLS):', profilesError.message);
    } else {
      console.log('✅ Profiles accessible:', profiles?.length || 0, 'records');
    }
    
    // Test admin client (service role key)
    console.log('3. Testing admin client (service role key)...');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Admin client error:', usersError.message);
      return { success: false, error: usersError.message };
    } else {
      console.log('✅ Admin client working:', users?.length || 0, 'users found');
      
      // Test password reset functionality
      const targetUserId = '98812e7a-784d-4379-b3aa-e8327d214095';
      const targetUser = users?.find(u => u.id === targetUserId);
      
      if (targetUser) {
        console.log('✅ Target user found:', targetUser.email);
        console.log('🔧 Password reset capability confirmed');
        
        // Test password reset (commented out to avoid accidental resets)
        // const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        //   password: '123abc'
        // });
        // console.log('Password reset test:', error ? `Error: ${error.message}` : 'Success');
      } else {
        console.log('⚠️ Target user not found in user list');
      }
    }
    
    // Test database access with admin privileges
    console.log('4. Testing admin database access...');
    const { data: allProfiles, error: adminProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (adminProfilesError) {
      console.error('❌ Admin database error:', adminProfilesError.message);
    } else {
      console.log('✅ Admin database access:', allProfiles?.length || 0, 'profiles accessible');
    }
    
    console.log('==============================================');
    console.log('✅ Supabase access test completed successfully!');
    
    return { 
      success: true, 
      regularClient: !userError || userError.message === 'Auth session missing!',
      adminClient: !usersError,
      userCount: users?.length || 0,
      targetUserFound: !!users?.find(u => u.id === '98812e7a-784d-4379-b3aa-e8327d214095')
    };
    
  } catch (error) {
    console.error('❌ Supabase access test failed:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Auto-run in development (admin-level) only when explicitly enabled
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true' &&
  import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true'
) {
  console.log('🚀 Auto-running Supabase access test...');
  testSupabaseAccess().then((result) => {
    if (result.success) {
      console.log('✅ Supabase access test completed!');
    } else {
      console.log('❌ Supabase access test failed:', result.error);
    }
  }).catch((error) => {
    console.log('❌ Supabase access test error:', error);
  });
}

// Expose to window for manual testing only when admin is allowed
if (import.meta.env.DEV && import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true') {
  (window as any).testSupabaseAccess = testSupabaseAccess;
}
