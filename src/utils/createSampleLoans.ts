import { supabase } from '@/integrations/supabase/client';
import { debugLog } from './devToolsHelper';

export const createSampleLoans = async () => {
  debugLog('🔧 Creating sample loans...');
  
  try {
    // Check for valid session (not just cached user) - session is required for RLS
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      debugLog('⚠️ No valid session found (required for RLS), skipping sample loan creation');
      return;
    }
    
    const user = session.user;
    if (!user) {
      debugLog('⚠️ No authenticated user in session, skipping sample loan creation');
      return;
    }
    
    console.log('✅ Authenticated user found:', user.id);
    
    // Check if we already have loans for this user
    const { data: existingLoans, error: checkError } = await supabase
      .from('loans')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing loans:', checkError);
      return;
    }
    
    if (existingLoans && existingLoans.length > 0) {
      console.log('✅ Sample loans already exist for this user, skipping creation');
      return;
    }
    
    // Ensure user has a profile first
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!existingProfile) {
      console.log('Creating profile for authenticated user...');
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: 'Admin',
          last_name: 'User',
          phone_number: '+264 81 123 4567',
          id_number: '12345678901'
        }, { onConflict: 'user_id' });
    }
    
    // Create sample loan applications for the authenticated user
    const sampleLoans = [
      {
        user_id: user.id,
        amount: 5000,
        purpose: 'Business expansion',
        status: 'pending',
        term_months: 12,
        interest_rate: 15.5,
        monthly_payment: 450.25,
        total_repayment: 5403.00,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: user.id,
        amount: 3000,
        purpose: 'Home improvement',
        status: 'pending',
        term_months: 6,
        interest_rate: 12.0,
        monthly_payment: 525.50,
        total_repayment: 3153.00,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: user.id,
        amount: 2500,
        purpose: 'Emergency medical expenses',
        status: 'pending',
        term_months: 3,
        interest_rate: 10.0,
        monthly_payment: 870.15,
        total_repayment: 2610.45,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];
    
    // Insert loan applications
    const { data, error } = await supabase
      .from('loans')
      .insert(sampleLoans);
    
    if (error) {
      console.error('❌ Error creating sample loans:', error);
      return;
    }
    
    console.log(`✅ Successfully created ${sampleLoans.length} sample loan applications`);
    console.log('📋 Sample loans created:');
    sampleLoans.forEach((loan, index) => {
      console.log(`   ${index + 1}. ${loan.purpose} - N$${loan.amount.toLocaleString()} (${loan.status})`);
    });
    
    return sampleLoans;
    
  } catch (error) {
    console.error('❌ Failed to create sample loans:', error);
  }
};

// DISABLED: Auto-run causes RLS violations because it runs before auth is established.
// These scripts should be run manually AFTER logging in via the browser console.
// 
// To run manually after logging in:
//   window.createSampleLoans()
//
// if (import.meta.env.DEV && import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true') {
//   createSampleLoans();
// }

// Expose for manual invocation after auth is established
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).createSampleLoans = createSampleLoans;
  console.log('🔧 Debug utility available at: window.createSampleLoans()');
}
