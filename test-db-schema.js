const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://puahejtaskncpazjyxqp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YWhlanRhc2tuY3Bhemp5eHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgwNzQ1MCwiZXhwIjoyMDY5MzgzNDUwfQ.JV3gC1iTeIRnFehfiD0tcZZmRtpYQdRuwvtwEKyOkuc'
);

async function testDatabase() {
  console.log('=== SUPABASE DATABASE SCHEMA TEST ===\n');
  
  // Test 1: approval_requests table
  console.log('1. Testing approval_requests table...');
  try {
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('   ❌ Error:', error.message);
    } else {
      console.log('   ✅ Table exists');
      if (data.length > 0) {
        console.log('   📊 Sample columns:', Object.keys(data[0]).join(', '));
      }
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }
  
  // Test 2: submit_approval_request RPC function
  console.log('\n2. Testing submit_approval_request RPC function...');
  try {
    const { data, error } = await supabase.rpc('submit_approval_request', {
      p_request_type: 'test',
      p_request_data: { test: true, amount: 1000 }
    });
    
    if (error) {
      console.log('   ❌ RPC Error:', error.message);
    } else {
      console.log('   ✅ RPC function works');
      console.log('   📋 Returned ID:', data);
    }
  } catch (err) {
    console.log('   ❌ RPC Exception:', err.message);
  }
  
  // Test 3: Check existing data
  console.log('\n3. Checking existing approval requests...');
  try {
    const { data, error } = await supabase
      .from('approval_requests')
      .select('id, user_id, request_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('   ❌ Error:', error.message);
    } else {
      console.log('   📊 Found', data.length, 'approval requests');
      data.forEach((req, i) => {
        console.log(`   ${i+1}. ${req.request_type} - ${req.status} (${req.created_at})`);
      });
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }
  
  // Test 4: Check client user
  console.log('\n4. Checking client user...');
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const client = users?.users?.find(u => u.email === 'client@namlend.com');
    
    if (client) {
      console.log('   ✅ Client user found:', client.id);
      
      // Check client's approval requests
      const { data: clientRequests } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('user_id', client.id);
      
      console.log('   📊 Client has', clientRequests?.length || 0, 'approval requests');
    } else {
      console.log('   ❌ Client user not found');
    }
  } catch (err) {
    console.log('   ❌ Exception:', err.message);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

testDatabase().catch(console.error);
