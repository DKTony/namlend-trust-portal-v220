import { supabase } from '../integrations/supabase/client';

/**
 * Creates an admin user for testing purposes.
 * SECURITY: Credentials should be provided via environment variables, not hardcoded.
 * This function is disabled by default and requires explicit environment flags.
 */
export const createAdminUser = async (email?: string, password?: string) => {
  // Get credentials from environment or parameters
  const adminEmail = email || import.meta.env.VITE_TEST_ADMIN_EMAIL;
  const adminPassword = password || import.meta.env.VITE_TEST_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ Admin credentials not provided. Set VITE_TEST_ADMIN_EMAIL and VITE_TEST_ADMIN_PASSWORD in .env');
    return {
      success: false,
      error: 'Admin credentials not configured. Set VITE_TEST_ADMIN_EMAIL and VITE_TEST_ADMIN_PASSWORD environment variables.'
    };
  }

  try {
    if (import.meta.env.DEV) {
      console.log('🔐 Creating admin user for testing...');
    }

    // First, check if user already exists
    const { data: existingUser } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (existingUser.user) {
      if (import.meta.env.DEV) {
        console.log('✅ Admin user already exists and can sign in');
      }

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
        if (import.meta.env.DEV) {
          console.log('✅ Admin role assigned to existing user');
        }
      }

      // Sign out after verification
      await supabase.auth.signOut();
      return { success: true, message: 'Admin user ready for testing' };
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.log('ℹ️ Admin user does not exist, creating new one...');
    }
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
      if (import.meta.env.DEV) {
        console.log('✅ Admin user created successfully');
      }

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: 'admin'
        });

      if (roleError) {
        console.error('❌ Failed to assign admin role:', roleError.message);
      } else if (import.meta.env.DEV) {
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
      } else if (import.meta.env.DEV) {
        console.log('✅ Admin profile created successfully');
      }

      // Sign out after creation
      await supabase.auth.signOut();

      return {
        success: true,
        message: 'Admin user created successfully'
        // SECURITY: Never return credentials in response
      };
    }

    return { success: false, error: 'User creation failed' };

  } catch (error: unknown) {
    console.error('❌ Error creating admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

// SECURITY: Only expose to window when ALL dev flags are explicitly enabled
// This should never be true in production builds
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true' &&
  import.meta.env.VITE_ALLOW_LOCAL_ADMIN === 'true' &&
  import.meta.env.VITE_TEST_ADMIN_EMAIL &&
  import.meta.env.VITE_TEST_ADMIN_PASSWORD
) {
  (window as unknown as Record<string, unknown>).createAdminUser = createAdminUser;
  console.log('🔧 createAdminUser available at window.createAdminUser()');
}
