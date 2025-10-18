import { supabase } from '@/integrations/supabase/client';

// Manual user creation function for console use
export const manualCreateTestUser = async () => {
  console.log('🔧 Manually creating testuser@namlend.com user...');
  
  try {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email: 'testuser@namlend.com',
      password: 'test123',
      options: {
        emailRedirectTo: undefined, // Skip email confirmation
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    });

    if (error) {
      console.error('❌ Signup error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ User signup result:', data);
    
    if (data.user) {
      console.log('✅ Test user created with ID:', data.user.id);
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+264 81 555 0123',
          id_number: 'TEST123456789'
        });

      if (profileError) {
        console.error('⚠️ Profile creation error:', profileError);
      } else {
        console.log('✅ Profile created');
      }

      // Assign client role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'client'
        });

      if (roleError) {
        console.error('⚠️ Role assignment error:', roleError);
      } else {
        console.log('✅ Role assigned: client');
      }

      return { success: true, user: data.user };
    }

    return { success: false, error: 'No user returned from signup' };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Alternative: Use existing admin accounts for testing
export const useAdminForTesting = () => {
  console.log('💡 Alternative: Use existing admin accounts for testing:');
  console.log('   Email: namlendadmin@gmail.com');
  console.log('   Password: test123');
  console.log('   → Will route to /admin (backoffice)');
  console.log('');
  console.log('   Email: anthnydklrk@gmail.com');
  console.log('   Password: test123');
  console.log('   → Will route to /admin (backoffice)');
};

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).manualCreateTestUser = manualCreateTestUser;
  (window as any).useAdminForTesting = useAdminForTesting;
  
  console.log('🔧 Manual user creation tools available:');
  console.log('   window.manualCreateTestUser() - Create testuser@namlend.com');
  console.log('   window.useAdminForTesting() - Show admin credentials');
}

export default { manualCreateTestUser, useAdminForTesting };
