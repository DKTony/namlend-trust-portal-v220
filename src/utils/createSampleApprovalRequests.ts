import { supabase } from '@/integrations/supabase/client';
import { debugLog } from './devToolsHelper';
import { submitApprovalRequest } from '@/services/approvalWorkflow';

export const createSampleApprovalRequests = async () => {
  debugLog('🔧 Creating sample approval requests...');
  
  try {
    // Check for valid session (not just cached user) - session is required for RLS
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      debugLog('⚠️ No valid session found (required for RLS), skipping sample approval request creation');
      return;
    }
    
    const user = session.user;
    if (!user) {
      debugLog('⚠️ No authenticated user in session, skipping sample approval request creation');
      return;
    }
    
    console.log('✅ Authenticated user found:', user.id);
    
    // Check if we already have approval requests
    const { data: existingRequests, error: checkError } = await supabase
      .from('approval_requests')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing approval requests:', checkError);
      return;
    }
    
    if (existingRequests && existingRequests.length > 0) {
      console.log('✅ Sample approval requests already exist, skipping creation');
      return;
    }
    
    // Create sample approval requests
    const sampleRequests = [
      {
        requestType: 'loan_application' as const,
        requestData: {
          amount: 15000,
          term_months: 24,
          interest_rate: 18.5,
          monthly_payment: 750.25,
          total_repayment: 18006.00,
          purpose: 'Small business expansion',
          employment_status: 'employed',
          monthly_income: 8500,
          existing_debt: 2500
        }
      },
      {
        requestType: 'kyc_document' as const,
        requestData: {
          document_type: 'id_card',
          document_url: 'https://example.com/id-card.pdf',
          document_number: 'ID123456789',
          expiry_date: '2030-12-31'
        }
      },
      {
        requestType: 'loan_application' as const,
        requestData: {
          amount: 8500,
          term_months: 12,
          interest_rate: 16.0,
          monthly_payment: 780.50,
          total_repayment: 9366.00,
          purpose: 'Vehicle purchase',
          employment_status: 'self_employed',
          monthly_income: 12000,
          existing_debt: 1200
        }
      },
      {
        requestType: 'kyc_document' as const,
        requestData: {
          document_type: 'proof_income',
          document_url: 'https://example.com/payslip.pdf',
          document_number: 'PAY202409001',
          issue_date: '2024-09-01'
        }
      },
      {
        requestType: 'profile_update' as const,
        requestData: {
          field: 'phone_number',
          old_value: '+264 81 123 4567',
          new_value: '+264 81 987 6543',
          reason: 'Changed mobile number'
        }
      }
    ];
    
    console.log(`📋 Creating ${sampleRequests.length} sample approval requests...`);
    
    // Submit each request with proper ApprovalRequestInput signature
    for (const request of sampleRequests) {
      const result = await submitApprovalRequest({
        user_id: user.id,
        request_type: request.requestType,
        request_data: request.requestData,
        priority: 'normal'
      });
      
      if (result.success) {
        console.log(`✅ Created ${request.requestType} approval request: ${result.requestId}`);
      } else {
        console.error(`❌ Failed to create ${request.requestType} request:`, result.error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Sample approval requests creation completed!');
    
    return sampleRequests;
    
  } catch (error) {
    console.error('❌ Failed to create sample approval requests:', error);
  }
};

// DISABLED: Auto-run causes RLS violations because it runs before auth is established.
// These scripts should be run manually AFTER logging in via the browser console.
// 
// To run manually after logging in:
//   window.createSampleApprovalRequests()
//
// if (import.meta.env.DEV && import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true') {
//   createSampleApprovalRequests();
// }

// Expose for manual invocation after auth is established
if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).createSampleApprovalRequests = createSampleApprovalRequests;
  console.log('🔧 Debug utility available at: window.createSampleApprovalRequests()');
}
