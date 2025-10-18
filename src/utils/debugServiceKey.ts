// Debug utility to check service role key configuration
import { supabaseAdmin } from '@/integrations/supabase/adminClient';

export const debugServiceKey = () => {
  console.log('🔍 Service Role Key Debug');
  console.log('========================');
  
  // Check environment variables
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const url = import.meta.env.VITE_SUPABASE_URL;
  
  console.log('URL:', url);
  console.log('Service key length:', serviceKey?.length || 'undefined');
  console.log('Service key starts with eyJ:', serviceKey?.startsWith('eyJ') || false);
  
  if (serviceKey) {
    console.log('First 50 chars:', serviceKey.substring(0, 50));
    console.log('Last 20 chars:', serviceKey.substring(serviceKey.length - 20));
  }
  
  // Test a simple admin operation
  console.log('\n🧪 Testing admin operation...');
  return supabaseAdmin.auth.admin.listUsers().then(({ data, error }) => {
    if (error) {
      console.error('❌ Admin test failed:', error.message);
      return { success: false, error: error.message };
    } else {
      console.log('✅ Admin test successful:', data.users?.length, 'users');
      return { success: true, userCount: data.users?.length };
    }
  });
};

// Expose to window
if (import.meta.env.DEV) {
  (window as any).debugServiceKey = debugServiceKey;
}
