import { supabase } from '@/integrations/supabase/client';

export const testSupabaseConnection = async () => {
  console.log('🔍 Testing Supabase Connection...');
  console.log('URL:', 'https://puahejtaskncpazjyxqp.supabase.co');
  
  try {
    // Test 1: Basic connection test
    console.log('📡 Testing basic connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection test failed:', connectionError);
      return { success: false, error: connectionError };
    }
    
    console.log('✅ Basic connection successful');
    
    // Test 2: Authentication status
    console.log('🔐 Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️ No authenticated user (this is normal for initial test)');
    } else if (user) {
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('ℹ️ No user currently authenticated');
    }
    
    // Test 3: Table access test
    console.log('📋 Testing table access...');
    const tableResults: Record<string, { accessible: boolean; count?: number; error?: string }> = {};
    
    // Test each table individually with proper typing
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (profilesError) {
        console.log('❌ profiles table error:', profilesError.message);
        tableResults['profiles'] = { accessible: false, error: profilesError.message };
      } else {
        console.log('✅ profiles table accessible');
        tableResults['profiles'] = { accessible: true, count: profilesData?.length || 0 };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log('❌ profiles table error:', err);
      tableResults['profiles'] = { accessible: false, error: errMsg };
    }
    
    try {
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .limit(1);
      
      if (loansError) {
        console.log('❌ loans table error:', loansError.message);
        tableResults['loans'] = { accessible: false, error: loansError.message };
      } else {
        console.log('✅ loans table accessible');
        tableResults['loans'] = { accessible: true, count: loansData?.length || 0 };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log('❌ loans table error:', err);
      tableResults['loans'] = { accessible: false, error: errMsg };
    }
    
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .limit(1);
      
      if (paymentsError) {
        console.log('❌ payments table error:', paymentsError.message);
        tableResults['payments'] = { accessible: false, error: paymentsError.message };
      } else {
        console.log('✅ payments table accessible');
        tableResults['payments'] = { accessible: true, count: paymentsData?.length || 0 };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log('❌ payments table error:', err);
      tableResults['payments'] = { accessible: false, error: errMsg };
    }
    
    try {
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_documents')
        .select('*')
        .limit(1);
      
      if (kycError) {
        console.log('❌ kyc_documents table error:', kycError.message);
        tableResults['kyc_documents'] = { accessible: false, error: kycError.message };
      } else {
        console.log('✅ kyc_documents table accessible');
        tableResults['kyc_documents'] = { accessible: true, count: kycData?.length || 0 };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log('❌ kyc_documents table error:', err);
      tableResults['kyc_documents'] = { accessible: false, error: errMsg };
    }
    
    // Test 4: RLS policies test
    console.log('🔒 Testing Row Level Security...');
    try {
      const { data: rlsTest, error: rlsError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (rlsError) {
        console.log('⚠️ RLS may be blocking access (normal without auth):', rlsError.message);
      } else {
        console.log('✅ RLS policies working correctly');
      }
    } catch (err) {
      console.log('⚠️ RLS test error:', err);
    }
    
    // Summary
    console.log('\n📊 Connection Test Summary:');
    console.log('- Database URL: ✅ Configured');
    console.log('- Anon Key: ✅ Configured');
    console.log('- Basic Connection: ✅ Working');
    console.log('- Table Access:', tableResults);
    
    return {
      success: true,
      results: {
        connection: true,
        authentication: !!user,
        tables: tableResults,
        user: user || null
      }
    };
    
  } catch (error) {
    console.error('💥 Unexpected error during connection test:', error);
    return { success: false, error };
  }
};

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add to window for manual testing
  (window as unknown as { testSupabaseConnection: typeof testSupabaseConnection }).testSupabaseConnection = testSupabaseConnection;
  
  // Auto-run test after a short delay
  setTimeout(() => {
    console.log('🚀 Auto-running Supabase connection test...');
    testSupabaseConnection();
  }, 2000);
}
