/**
 * Global Setup for E2E Tests
 * 
 * Seeds necessary test data before UI tests run.
 * This ensures approved loans exist for disbursement testing.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Admin credentials for authentication
const ADMIN_EMAIL = 'admin@test.namlend.com';
const ADMIN_PASSWORD = 'test123';

// Test user IDs
const TEST_USERS = {
  admin: 'fbf720fd-7de2-4142-974f-6d6809f4f8c6',
  client1: '11111111-0000-0000-0000-000000000001',
  client2: '22222222-0000-0000-0000-000000000002',
  loanOfficer: '44444444-0000-0000-0000-000000000004',
};

async function globalSetup() {
  console.log('🌱 Global Setup: Seeding UI test data...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Authenticate as admin to bypass RLS for data creation
  console.log('  Authenticating as admin...');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  
  if (authError) {
    console.error('  ❌ Admin authentication failed:', authError.message);
    console.log('  ⚠️ UI tests may fail due to missing test data');
    return;
  }
  console.log('  ✅ Admin authenticated');

  try {
    // Clean up existing UI test data
    console.log('  Cleaning up existing test data...');
    await supabase.from('disbursements').delete().like('reference', 'UI-TEST-%');
    await supabase.from('loans').delete().like('purpose', 'UI Test%');

    // Create approved loans for disbursement testing
    console.log('  Creating approved loans...');
    
    const loansToCreate = [
      {
        id: 'a1a1a1a1-0001-0000-0000-000000000001',
        user_id: TEST_USERS.client1,
        amount: 50000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 5500,
        total_repayment: 66000,
        purpose: 'UI Test - Approved Loan 1',
        status: 'approved',
        approved_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.admin,
      },
      {
        id: 'a1a1a1a1-0002-0000-0000-000000000002',
        user_id: TEST_USERS.client2,
        amount: 75000,
        term_months: 18,
        interest_rate: 32,
        monthly_payment: 6000,
        total_repayment: 108000,
        purpose: 'UI Test - Approved Loan 2',
        status: 'approved',
        approved_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.loanOfficer,
      },
      {
        id: 'a1a1a1a1-0003-0000-0000-000000000003',
        user_id: TEST_USERS.client1,
        amount: 100000,
        term_months: 24,
        interest_rate: 32,
        monthly_payment: 6500,
        total_repayment: 156000,
        purpose: 'UI Test - Approved Loan 3',
        status: 'approved',
        approved_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.admin,
      },
      // Already disbursed loan for "cannot disburse twice" test
      {
        id: 'a1a1a1a1-0004-0000-0000-000000000004',
        user_id: TEST_USERS.client2,
        amount: 60000,
        term_months: 15,
        interest_rate: 32,
        monthly_payment: 5800,
        total_repayment: 87000,
        purpose: 'UI Test - Already Disbursed Loan',
        status: 'disbursed',
        approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.admin,
        disbursed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const loan of loansToCreate) {
      const { error } = await supabase.from('loans').upsert(loan, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ Failed to create loan ${loan.id}:`, error.message);
      }
    }

    // Create pending disbursements for the approved loans
    console.log('  Creating pending disbursements...');
    
    const disbursementsToCreate = [
      {
        id: 'd1d1d1d1-0001-0000-0000-000000000001',
        loan_id: 'a1a1a1a1-0001-0000-0000-000000000001',
        amount: 50000,
        status: 'pending',
        reference: 'UI-TEST-DISB-001',
        scheduled_at: new Date().toISOString(),
        created_by: TEST_USERS.admin,
      },
      {
        id: 'd1d1d1d1-0002-0000-0000-000000000002',
        loan_id: 'a1a1a1a1-0002-0000-0000-000000000002',
        amount: 75000,
        status: 'pending',
        reference: 'UI-TEST-DISB-002',
        scheduled_at: new Date().toISOString(),
        created_by: TEST_USERS.loanOfficer,
      },
      {
        id: 'd1d1d1d1-0003-0000-0000-000000000003',
        loan_id: 'a1a1a1a1-0003-0000-0000-000000000003',
        amount: 100000,
        status: 'pending',
        reference: 'UI-TEST-DISB-003',
        scheduled_at: new Date().toISOString(),
        created_by: TEST_USERS.admin,
      },
      // Completed disbursement
      {
        id: 'd1d1d1d1-0004-0000-0000-000000000004',
        loan_id: 'a1a1a1a1-0004-0000-0000-000000000004',
        amount: 60000,
        status: 'completed',
        method: 'bank_transfer',
        reference: 'UI-TEST-DISB-004',
        payment_reference: 'BANK-REF-UI-TEST-001',
        scheduled_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        processed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        created_by: TEST_USERS.admin,
      },
    ];

    for (const disbursement of disbursementsToCreate) {
      const { error } = await supabase.from('disbursements').upsert(disbursement, { onConflict: 'id' });
      if (error) {
        console.error(`  ❌ Failed to create disbursement ${disbursement.id}:`, error.message);
      }
    }

    // Verify data was created
    const { data: loans } = await supabase
      .from('loans')
      .select('id, status, purpose')
      .like('purpose', 'UI Test%');
    
    const { data: disbursements } = await supabase
      .from('disbursements')
      .select('id, status, reference')
      .like('reference', 'UI-TEST-%');

    console.log(`  ✅ Created ${loans?.length || 0} test loans`);
    console.log(`  ✅ Created ${disbursements?.length || 0} test disbursements`);
    console.log('🌱 Global Setup: Complete');
    
  } catch (error) {
    console.error('❌ Global Setup failed:', error);
    // Don't throw - allow tests to continue, they'll fail with meaningful errors
  }
}

export default globalSetup;
