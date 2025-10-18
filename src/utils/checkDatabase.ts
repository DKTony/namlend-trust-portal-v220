import { supabase } from '@/integrations/supabase/client';

// Check database for users and their roles
export const checkDatabaseUsers = async () => {
  console.log('🔍 Checking database for users...');
  
  try {
    // Get all users from auth.users (requires service role)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return { success: false, error: profilesError.message };
    }

    console.log('👥 Found profiles:', profiles);

    // Get user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError);
      return { success: false, error: rolesError.message };
    }

    console.log('🎭 Found user roles:', userRoles);

    // Combine data for easier viewing
    const usersWithRoles = profiles?.map(profile => {
      const role = userRoles?.find(r => r.user_id === profile.user_id);
      return {
        ...profile,
        role: role?.role || 'no_role'
      };
    });

    console.log('📊 Users with roles:', usersWithRoles);

    return { 
      success: true, 
      profiles, 
      userRoles, 
      usersWithRoles 
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Assign role to a specific user
export const assignUserRole = async (userId: string, role: 'admin' | 'loan_officer' | 'client') => {
  console.log(`🎭 Assigning role "${role}" to user ${userId}...`);
  
  try {
    // Check if user already has a role
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

      console.log(`✅ Updated user role to: ${role}`);
    } else {
      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (insertError) {
        console.error('❌ Error inserting role:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`✅ Assigned new role: ${role}`);
    }

    return { success: true, role };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Get current authenticated user info
export const getCurrentUserInfo = async () => {
  console.log('👤 Getting current user info...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Error getting user:', error);
      return { success: false, error: error.message };
    }

    if (!user) {
      console.log('ℹ️ No authenticated user');
      return { success: false, error: 'No authenticated user' };
    }

    console.log('👤 Current user:', user);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error getting profile:', profileError);
    } else {
      console.log('📋 User profile:', profile);
    }

    // Get user role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('❌ Error getting role:', roleError);
    } else {
      console.log('🎭 User role:', userRole);
    }

    return { 
      success: true, 
      user, 
      profile, 
      role: userRole?.role || 'no_role' 
    };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Make functions available globally for console use
if (typeof window !== 'undefined') {
  (window as any).checkDatabaseUsers = checkDatabaseUsers;
  (window as any).assignUserRole = assignUserRole;
  (window as any).getCurrentUserInfo = getCurrentUserInfo;
  
  console.log('🔧 Database management tools available:');
  console.log('   window.checkDatabaseUsers() - View all users and roles');
  console.log('   window.assignUserRole(userId, role) - Assign role to user');
  console.log('   window.getCurrentUserInfo() - Get current user info');
}

export default { checkDatabaseUsers, assignUserRole, getCurrentUserInfo };
