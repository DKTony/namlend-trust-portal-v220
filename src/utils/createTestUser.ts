import { supabase } from '@/integrations/supabase/client';
import { debugLog } from './devToolsHelper';

export const createTestUser = async () => {
  debugLog('🔧 Creating test user account...');
  
  try {
    // Create testuser@namlend.com user account
    const { data, error } = await supabase.auth.signUp({
      email: 'testuser@namlend.com',
      password: 'test123',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    });

    if (error) {
      console.error('❌ Error creating test user:', error);
      return { success: false, error: error.message };
    }

    if (data.user) {
      console.log('✅ Test user created successfully:', data.user.id);
      
      // Create profile for the test user
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: data.user.id,
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+264 81 555 0123',
          id_number: 'TEST123456789'
        }, { onConflict: 'user_id' });

      if (profileError) {
        console.error('⚠️ Warning: Could not create profile:', profileError);
      } else {
        console.log('✅ Test user profile created');
      }

      // Assign client role (default)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: data.user.id,
          role: 'client'
        }, { onConflict: 'user_id' });

      if (roleError) {
        console.error('⚠️ Warning: Could not assign role:', roleError);
      } else {
        console.log('✅ Test user role assigned: client');
      }

      return { success: true, userId: data.user.id };
    }

    return { success: false, error: 'No user data returned' };
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Make available globally for console testing
if (import.meta.env.DEV) {
  (window as any).createTestUser = createTestUser;
  console.log('🔧 createTestUser available at window.createTestUser()');
}

// DISABLED: Auto-execution removed to prevent production contamination
// Use window.createTestUser() in console for manual testing only
