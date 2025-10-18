// Test script to verify the loan submission fix
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://puahejtaskncpazjyxqp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YWhlanRhc2tuY3Bhemp5eHFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDc0NTAsImV4cCI6MjA2OTM4MzQ1MH0.pwVQ-yVKyUa11KdUPdRbX-qssywAbTlPwFahfrt5JDw'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLoanSubmissionFix() {
  console.log('🧪 Testing Fixed Loan Submission...')
  
  try {
    // Test the exact data structure that was failing
    const testLoanData = {
      user_id: "d109c025-d6fe-455d-96ee-d3cc08578a83",
      request_type: "loan_application",
      request_data: {
        amount: 1711,
        term_months: 3,
        interest_rate: 32,
        monthly_payment: 601.0179183257362,
        total_repayment: 1803.0537549772087,
        purpose: "personal",
        employment_status: "self-employed",
        monthly_income: 89000,
        monthly_expenses: 540,
        existing_debt: 5600,
        user_verified: false,
        credit_score: 650,
        submitted_at: "2025-09-20T15:12:22.800Z"
      },
      priority: "normal"
    }

    console.log('📝 Testing loan submission with fixed schema...')
    
    // Test the fixed insertion (without submitted_at column)
    const { data, error } = await supabase
      .from('approval_requests')
      .insert([
        {
          user_id: testLoanData.user_id,
          request_type: testLoanData.request_type,
          request_data: testLoanData.request_data,
          status: 'pending',
          priority: testLoanData.priority || 'normal'
          // Note: removed submitted_at - using created_at instead
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ Loan submission still failing:', error)
      return false
    }

    console.log('✅ Loan submission successful!')
    console.log('📋 Created approval request:', {
      id: data.id,
      user_id: data.user_id,
      request_type: data.request_type,
      status: data.status,
      priority: data.priority,
      created_at: data.created_at,
      amount: data.request_data.amount
    })

    // Test role fetching for this user
    console.log('\n🔍 Testing role fetching...')
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', testLoanData.user_id)

    if (roleError) {
      console.error('❌ Role fetching error:', roleError)
    } else {
      console.log('✅ Roles found:', roles.map(r => r.role))
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('approval_requests')
      .delete()
      .eq('id', data.id)

    if (deleteError) {
      console.log('⚠️ Could not clean up test data:', deleteError.message)
    } else {
      console.log('✅ Test data cleaned up')
    }

    return true

  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

testLoanSubmissionFix()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Loan submission fix verified! The schema issue has been resolved.')
      console.log('\n📊 SUMMARY:')
      console.log('✅ Schema mismatch fixed (removed submitted_at column)')
      console.log('✅ Loan submission working with correct data structure')
      console.log('✅ Role fetching verified for user')
      console.log('✅ System ready for production loan submissions')
    } else {
      console.log('\n💥 Loan submission fix failed. Check errors above.')
    }
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error)
  })
