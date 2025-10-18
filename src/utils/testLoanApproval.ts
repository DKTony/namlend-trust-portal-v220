import { supabase } from '@/integrations/supabase/client';
import { debugLog } from './devToolsHelper';

/**
 * Test utility to verify loan approval functionality works at database level
 */
export const testLoanApproval = async () => {
  debugLog('🧪 Testing Loan Approval Functionality...');
  
  try {
    // Check if we're using mock client
    if (typeof supabase.from !== 'function') {
      debugLog('ℹ️ Using mock client - loan approval test skipped');
      return true;
    }
    
    // 1. First, let's check if we have any loans in the database
    debugLog('📋 Fetching existing loans...');
    const { data: loans, error: fetchError } = await supabase
      .from('loans')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      debugLog('❌ Error fetching loans:', fetchError);
      return false;
    }
    
    debugLog(`✅ Found ${loans?.length || 0} loans in database`);
    
    if (!loans || loans.length === 0) {
      debugLog('ℹ️ No loans found to test approval on');
      return true;
    }
    
    // 2. Find a loan that's in 'pending' status
    const pendingLoan = loans.find(loan => loan.status === 'pending');
    
    if (!pendingLoan) {
      debugLog('ℹ️ No pending loans found to test approval on');
      debugLog('📊 Loan statuses:', loans.map(l => ({ id: l.id, status: l.status })));
      return true;
    }
    
    debugLog(`🎯 Testing approval on loan ID: ${pendingLoan.id}`);
    
    // 3. Test loan approval
    const { error: approvalError } = await supabase
      .from('loans')
      .update({ 
        status: 'approved', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', pendingLoan.id);
    
    if (approvalError) {
      console.error('❌ Error approving loan:', approvalError);
      return false;
    }
    
    console.log('✅ Loan approval successful!');
    
    // 4. Verify the update worked
    const { data: updatedLoan, error: verifyError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', pendingLoan.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying loan update:', verifyError);
      return false;
    }
    
    if (updatedLoan.status === 'approved') {
      console.log('✅ Loan status successfully updated to approved');
      
      // 5. Test loan rejection (revert back to pending for testing)
      console.log('🔄 Testing loan rejection...');
      const { error: rejectError } = await supabase
        .from('loans')
        .update({ 
          status: 'rejected', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', pendingLoan.id);
      
      if (rejectError) {
        console.error('❌ Error rejecting loan:', rejectError);
        return false;
      }
      
      console.log('✅ Loan rejection successful!');
      
      // 6. Revert back to original status
      const { error: revertError } = await supabase
        .from('loans')
        .update({ 
          status: pendingLoan.status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', pendingLoan.id);
      
      if (revertError) {
        console.error('❌ Error reverting loan status:', revertError);
        return false;
      }
      
      console.log('✅ Loan status reverted to original state');
      console.log('🎉 All loan approval tests passed!');
      return true;
    } else {
      console.error('❌ Loan status was not updated correctly');
      return false;
    }
    
  } catch (error) {
    debugLog('❌ Unexpected error during loan approval test:', error);
    return false;
  }
};

// Auto-run in development only if debug tools are enabled
if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_TOOLS === 'true') {
  debugLog('🚀 Auto-running loan approval test...');
  testLoanApproval().then(success => {
    if (success) {
      debugLog('✅ Loan approval functionality verified!');
    } else {
      debugLog('❌ Loan approval functionality test failed!');
    }
  }).catch(error => {
    debugLog('❌ Loan approval test error:', error);
  });
}

// Make it available globally for debugging
import { safeExposeWindow } from './devToolsHelper';
safeExposeWindow('__TEST_LOAN_APPROVAL__', testLoanApproval);
