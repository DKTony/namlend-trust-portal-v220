// Debug script to check user role for the failing user
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://puahejtaskncpazjyxqp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YWhlanRhc2tuY3Bhemp5eHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgwNzQ1MCwiZXhwIjoyMDY5MzgzNDUwfQ.JV3gC1iTeIRnFehfiD0tcZZmRtpYQdRuwvtwEKyOkuc'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugUserRole() {
  const failingUserId = 'd109c025-d6fe-455d-96ee-d3cc08578a83'
  
  console.log('🔍 Debugging user role for:', failingUserId)
  
  try {
    // Check if user exists in auth.users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
      console.error('❌ Error fetching users:', userError)
      return
    }
    
    const user = users.users.find(u => u.id === failingUserId)
    if (!user) {
      console.log('❌ User not found in auth.users')
      return
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    })
    
    // Check user_roles table
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', failingUserId)
    
    if (roleError) {
      console.error('❌ Error fetching user roles:', roleError)
    } else {
      console.log('📋 User roles:', roles)
      if (roles.length === 0) {
        console.log('⚠️ No roles found for user - this explains the role fetching error!')
        
        // Create a client role for this user
        console.log('🔧 Creating client role for user...')
        const { data: newRole, error: createError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: failingUserId,
            role: 'client'
          }])
          .select()
        
        if (createError) {
          console.error('❌ Error creating role:', createError)
        } else {
          console.log('✅ Client role created:', newRole)
        }
      }
    }
    
    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', failingUserId)
      .single()
    
    if (profileError) {
      console.log('⚠️ No profile found for user:', profileError.message)
      
      // Create a basic profile
      console.log('🔧 Creating basic profile for user...')
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: failingUserId,
          first_name: 'User',
          last_name: 'Client',
          verified: false
        }])
        .select()
      
      if (createProfileError) {
        console.error('❌ Error creating profile:', createProfileError)
      } else {
        console.log('✅ Basic profile created:', newProfile)
      }
    } else {
      console.log('✅ Profile found:', profile)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugUserRole()
  .then(() => console.log('🎉 User role debug completed'))
  .catch(error => console.error('💥 Debug script failed:', error))
