import { supabase } from '@/integrations/supabase/client';
import { debugLog } from './devToolsHelper';
import { submitApprovalRequest } from '@/services/approvalWorkflow';

export const createSampleApprovalRequests = async () => {
  debugLog('🔧 Creating sample approval requests...');
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      debugLog('⚠️ No authenticated user found, skipping sample approval request creation');
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
    
    // Submit each request
    for (const request of sampleRequests) {
      const result = await submitApprovalRequest(
        request.requestType,
        request.requestData
      );
      
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

// Auto-run in development when explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_RUN_DEV_SCRIPTS === 'true') {
  console.log('🚀 Auto-running sample approval request creation (VITE_RUN_DEV_SCRIPTS=true)...');
  createSampleApprovalRequests().then(() => {
    console.log('✅ Sample approval request creation completed!');
  }).catch((error) => {
    console.log('❌ Sample approval request creation failed:', error);
  });
}
