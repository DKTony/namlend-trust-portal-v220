// Debug script to test authentication state
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.LEGACY_SUPABASE_URL
const supabaseKey = process.env.LEGACY_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) throw new Error('Set legacy Supabase connection variables in the process environment.')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('🔍 Testing Authentication State...')
  
  try {
    // Test 1: Check current session
    console.log('\n1️⃣ Checking current session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
    } else {
      console.log('📊 Session status:', !!session)
      if (session) {
        console.log('👤 User ID:', session.user.id)
        console.log('📧 Email:', session.user.email)
      }
    }

    // Test 2: Try to sign in with test credentials
    console.log('\n2️⃣ Testing sign-in with client credentials...')
    const email = process.env.LEGACY_TEST_EMAIL
    const password = process.env.LEGACY_TEST_PASSWORD
    if (!email || !password) throw new Error('Set legacy test credentials in the process environment.')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      console.error('❌ Sign-in error:', signInError)
    } else {
      console.log('✅ Sign-in successful!')
      console.log('👤 User ID:', signInData.user.id)
      console.log('📧 Email:', signInData.user.email)
      
      // Test 3: Check user role
      console.log('\n3️⃣ Checking user role...')
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', signInData.user.id)
        .maybeSingle()

      if (roleError) {
        console.error('❌ Role fetch error:', roleError)
      } else {
        console.log('🎭 User role:', roleData?.role || 'No role found')
      }

      // Test 4: Check profile
      console.log('\n4️⃣ Checking user profile...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', signInData.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('❌ Profile fetch error:', profileError)
      } else {
        console.log('👤 Profile found:', !!profileData)
        if (profileData) {
          console.log('   - Name:', profileData.first_name, profileData.last_name)
          console.log('   - Phone:', profileData.phone_number)
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAuth()
  .then(() => {
    console.log('\n✅ Authentication debug test completed')
  })
  .catch((error) => {
    console.error('\n❌ Authentication debug test failed:', error)
  })
