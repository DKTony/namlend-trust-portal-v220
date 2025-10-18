import { supabase } from '@/integrations/supabase/client';

// Direct role assignment using browser-based Supabase client
export const assignRoleDirectly = async (userId: string, role: 'admin' | 'loan_officer' | 'client') => {
  console.log(`🎭 Assigning role "${role}" to user ${userId} via browser client...`);
  
  try {
    // First check if user already has a role
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking existing role:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingRole) {
      // Update existing role
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Error updating role:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Updated user ${userId} role to: ${role}`);
    } else {
      // Insert new role - only include columns that exist in the table
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role
        });

      if (insertError) {
        console.error('❌ Error inserting role:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ Assigned new role "${role}" to user ${userId}`);
    }

    // Verify the assignment
    const { data: verifyRole, error: verifyError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying role assignment:', verifyError);
      return { success: false, error: verifyError.message };
    }

    console.log('✅ Role assignment verified:', verifyRole);
    return { success: true, role: verifyRole };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Assign specific user as client (frontend user)
export const makeUserFrontendClient = async () => {
  const userId = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1';
  console.log(`🎯 Making user ${userId} a frontend client...`);
  
  return await assignRoleDirectly(userId, 'client');
};

// Make functions available globally for console use
if (typeof window !== 'undefined') {
  (window as any).assignRoleDirectly = assignRoleDirectly;
  (window as any).makeUserFrontendClient = makeUserFrontendClient;
  
  console.log('🎭 Role assignment tools available:');
  console.log('   window.assignRoleDirectly(userId, role) - Assign any role to any user');
  console.log('   window.makeUserFrontendClient() - Make d0825c06-82ce-4b37-b6ea-fc4a160601b1 a client');
}

export default { assignRoleDirectly, makeUserFrontendClient };
