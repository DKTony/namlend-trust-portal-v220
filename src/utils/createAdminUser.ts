import { supabase } from '../integrations/supabase/client';

export const createAdminUser = async () => {
  // Admin credentials for testing
  const adminEmail = 'testadmin2025@gmail.com';
  const adminPassword = 'Admin123!';
  
  try {
    console.log('🔐 Creating admin user for testing...');
    
    // First, check if user already exists
    const { data: existingUser } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    
    if (existingUser.user) {
      console.log('✅ Admin user already exists and can sign in');
      
      // Ensure they have admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.user.id)
        .single();
      
      if (!existingRole || existingRole.role !== 'admin') {
        await supabase
          .from('user_roles')
          .upsert({
            user_id: existingUser.user.id,
            role: 'admin'
          });
        console.log('✅ Admin role assigned to existing user');
      }
      
      // Sign out after verification
      await supabase.auth.signOut();
      return { success: true, message: 'Admin user ready for testing' };
    }
  } catch (error) {
    console.log('ℹ️ Admin user does not exist, creating new one...');
  }
  
  try {
    // Create new admin user
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          first_name: 'Admin',
          last_name: 'User',
          phone: '+264 81 000 0000',
          id_number: 'ADMIN001'
        }
      }
    });
    
    if (error) {
      console.error('❌ Failed to create admin user:', error.message);
      return { success: false, error: error.message };
    }
    
    if (data.user) {
      console.log('✅ Admin user created successfully');
      
      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'admin'
        });
      
      if (roleError) {
        console.error('❌ Failed to assign admin role:', roleError.message);
      } else {
        console.log('✅ Admin role assigned successfully');
      }
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          first_name: 'Admin',
          last_name: 'User',
          phone_number: '+264 81 000 0000',
          id_number: 'ADMIN001'
        });
      
      if (profileError) {
        console.error('❌ Failed to create admin profile:', profileError.message);
      } else {
        console.log('✅ Admin profile created successfully');
      }
      
      // Sign out after creation
      await supabase.auth.signOut();
      
      return { 
        success: true, 
        message: 'Admin user created successfully',
        credentials: { email: adminEmail, password: adminPassword }
      };
    }
    
    return { success: false, error: 'User creation failed' };
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return { success: false, error: error.message };
  }
};

// Expose to window for manual testing when explicitly enabled
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true' &&
  import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true'
) {
  (window as any).createAdminUser = createAdminUser;
  console.log('🔧 createAdminUser available at window.createAdminUser()');
}
