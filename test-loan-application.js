// Test script to demonstrate loan application functionality
// This simulates the loan application process that would normally happen through the UI

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://puahejtaskncpazjyxqp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YWhlanRhc2tuY3Bhemp5eHFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgwNzQ1MCwiZXhwIjoyMDY5MzgzNDUwfQ.JV3gC1iTeIRnFehfiD0tcZZmRtpYQdRuwvtwEKyOkuc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLoanApplication() {
  console.log('🚀 Testing Loan Application Process...')
  
  try {
    // Test loan application data
    const loanApplicationData = {
      amount: 10000,
      term_months: 12,
      purpose: 'Business expansion',
      interest_rate: 32, // 32% APR as per Namibian regulations
      monthly_payment: 1067.50,
      employment_status: 'employed',
      monthly_income: 5000,
      monthly_expenses: 2000,
      existing_debt: 500,
      user_verified: false,
      credit_score: 650,
      submitted_at: new Date().toISOString()
    }

    // Get the test user (client@namlend.com)
    const testUserId = 'd109c025-d6fe-455d-96ee-d3cc08578a83'
    
    console.log('📋 Creating loan application for user:', testUserId)
    console.log('💰 Loan Details:', {
      amount: `N$${loanApplicationData.amount.toLocaleString()}`,
      term: `${loanApplicationData.term_months} months`,
      purpose: loanApplicationData.purpose,
      monthlyPayment: `N$${loanApplicationData.monthly_payment}`
    })

    // Submit to approval workflow (this is what the UI would do)
    const approvalRequest = {
      user_id: testUserId,
      request_type: 'loan_application',
      request_data: loanApplicationData,
      priority: 'normal',
      status: 'pending',
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('approval_requests')
      .insert([approvalRequest])
      .select()

    if (error) {
      console.error('❌ Error submitting loan application:', error)
      return
    }

    console.log('✅ Loan application submitted successfully!')
    console.log('📄 Application ID:', data[0].id)
    console.log('📊 Status:', data[0].status)
    console.log('⏰ Submitted at:', new Date(data[0].created_at).toLocaleString())
    
    // Verify the application was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('user_id', testUserId)
      .eq('request_type', 'loan_application')
      .order('created_at', { ascending: false })
      .limit(1)

    if (verifyError) {
      console.error('❌ Error verifying application:', verifyError)
      return
    }

    if (verifyData && verifyData.length > 0) {
      console.log('✅ Verification successful - Application found in database')
      console.log('📋 Application Details:')
      console.log('   - Amount:', `N$${verifyData[0].request_data.amount.toLocaleString()}`)
      console.log('   - Purpose:', verifyData[0].request_data.purpose)
      console.log('   - Status:', verifyData[0].status)
      console.log('   - Priority:', verifyData[0].priority)
    }

    return data[0]

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testLoanApplication()
  .then((result) => {
    if (result) {
      console.log('\n🎉 Loan Application Test PASSED!')
      console.log('✅ The loan application workflow is working correctly')
      console.log('📝 Application submitted through approval_requests table')
      console.log('🔄 Ready for admin review and processing')
    }
  })
  .catch((error) => {
    console.error('\n❌ Loan Application Test FAILED:', error)
  })
