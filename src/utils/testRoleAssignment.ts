import { supabase } from '../integrations/supabase/client';
import { assignRoleWithServiceRole } from './serviceRoleAssignment';

// Test function to verify role assignment works
export async function testRoleAssignment() {
  const userId = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1';
  const role = 'client';

  console.log('🧪 Testing role assignment...');
  console.log(`User ID: ${userId}`);
  console.log(`Target Role: ${role}`);

  try {
    // First, check if user exists
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('❌ User lookup failed:', userError);
      return;
    }

    console.log('✅ User found:', user.user?.email);

    // Test the service role assignment
    const result = await assignRoleWithServiceRole(userId, role);
    
    if (result.success) {
      console.log('✅ Role assignment successful!');
      
      // Verify the role was assigned
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (roleError) {
        console.error('❌ Error verifying role:', roleError);
      } else {
        console.log('✅ Current user roles:', roleData);
      }
    } else {
      console.error('❌ Role assignment failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
}

// Test the secure function approach
export async function testSecureFunction() {
  const userId = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1';
  const role = 'client';

  console.log('🧪 Testing secure function approach...');

  try {
    // Test if the function exists by calling it
    const { data, error } = await supabase.rpc('assign_user_role', {
      target_user_id: userId,
      target_role: role
    });

    if (error) {
      console.error('❌ Secure function error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', error.details);
    } else {
      console.log('✅ Secure function call successful:', data);
    }

  } catch (error) {
    console.error('❌ Exception calling secure function:', error);
  }
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testRoleAssignment = testRoleAssignment;
  (window as any).testSecureFunction = testSecureFunction;
}
