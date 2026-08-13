/**
 * Global Setup for E2E Tests
 *
 * Architecture: Convex backend (active) + Supabase (legacy, retained for reference).
 *
 * UI tests authenticate via the Convex Auth login form (signInViaUI in fixtures.ts).
 * Legacy Supabase RLS/RPC tests are quarantined and skipped when Supabase creds are absent.
 *
 * Supabase seeding is OPTIONAL - if creds are missing the setup completes without error
 * and legacy Supabase tests self-skip via their own `test.skip(!supabaseUrl, ...)` guards.
 */

import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { requireSafeConvexUrl, shouldSeedConvex } from './setupSafety';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Admin credentials for authentication
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Test1234!';

// Test user IDs (Supabase legacy - Convex uses opaque _id strings)
const TEST_USERS = {
  admin: 'fbf720fd-7de2-4142-974f-6d6809f4f8c6',
  client1: '11111111-0000-0000-0000-000000000001',
  client2: '22222222-0000-0000-0000-000000000002',
  loanOfficer: '44444444-0000-0000-0000-000000000004',
};

function deploymentNameFromConvexUrl(convexUrl: string): string {
  const host = new URL(convexUrl).host;
  const deploymentName = host.split('.')[0];
  if (!deploymentName) {
    throw new Error(`Could not resolve Convex deployment name from VITE_CONVEX_URL=${convexUrl}`);
  }
  return deploymentName;
}

async function globalSetup() {
  const convexUrl = requireSafeConvexUrl(process.env);
  const convexDeploymentName = deploymentNameFromConvexUrl(convexUrl);

  console.log('🌱 Global Setup: Starting E2E environment check...');
  console.log(`  Convex URL: ${convexUrl}`);
  console.log(`  Convex deployment: ${convexDeploymentName}`);

  // -------------------------------------------------------------------------
  // Convex-first: UI tests use signInViaUI() from fixtures.ts.
  // Seed test users + deterministic IPP aliases so browser flows do not depend
  // on live external callback availability.
  // -------------------------------------------------------------------------
  if (process.env.E2E_ALLOW_MUTATING_SEED !== 'true') {
    throw new Error('E2E_ALLOW_MUTATING_SEED=true is required for the mutating global setup.');
  }

  if (!shouldSeedConvex(process.env)) {
    if (process.env.E2E_PRESEEDED_CONVEX_PREVIEW === 'true') {
      console.log('  Convex preview was seeded atomically during deployment');
    } else {
      throw new Error(
        'E2E_ALLOW_MUTATING_SEED=true is required to seed Convex. Confirm the disposable preview target first.'
      );
    }
  }

  if (shouldSeedConvex(process.env)) {
    try {
      console.log('  Seeding Convex test users and IPP aliases...');
      const seedArgs = [
        'convex',
        'run',
        'seed:seedTestUsers',
        '--push',
        '--typecheck',
        'disable',
        '--codegen',
        'disable',
      ];
      // In CI, CONVEX_DEPLOY_KEY authenticates AND pins the deployment; the
      // --deployment flag would make the CLI resolve it via the dashboard API,
      // which needs a user access token and fails with "AccessTokenInvalid".
      // Locally (logged-in CLI, no deploy key) the flag selects the deployment.
      if (!process.env.CONVEX_DEPLOY_KEY) {
        seedArgs.push('--deployment', convexDeploymentName);
      }
      execFileSync('npx', seedArgs, {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: process.env,
      });
      console.log('  ✅ Convex test users and IPP aliases seeded');
    } catch (error) {
      throw new Error('Convex E2E seeding failed; refusing to continue with partial test data.', {
        cause: error,
      });
    }
  }

  console.log('  ✅ Convex backend configured - UI tests will authenticate via login form');

  // -------------------------------------------------------------------------
  // Legacy Supabase seeding (OPTIONAL - skipped gracefully when creds absent)
  // Required only for: disbursements-rls, documents-rls, disbursement,
  //   admin-rpc, disbursements-ledger*, tigerbeetle-balance, approval-rpc-race-condition
  // -------------------------------------------------------------------------
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('  ⚠️  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set.');
    console.log('      Legacy Supabase tests will self-skip via their own guards.');
    console.log('🌱 Global Setup: Complete (Convex-only mode)');
    return;
  }

  console.log('  Supabase creds found - seeding legacy test data...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Authenticate as admin to bypass RLS for data creation
  console.log('  Authenticating as admin (Supabase)...');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authError) {
    console.warn('  ⚠️  Supabase admin auth failed:', authError.message);
    console.warn('      Legacy Supabase tests may fail. UI tests are unaffected.');
    console.log('🌱 Global Setup: Complete (Supabase seeding skipped - auth failed)');
    return;
  }
  console.log('  ✅ Supabase admin authenticated');

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
      // Disbursed loan for client1 with outstanding balance (for IPS payment testing)
      {
        id: 'a1a1a1a1-0005-0000-0000-000000000005',
        user_id: TEST_USERS.client1,
        amount: 80000,
        term_months: 12,
        interest_rate: 32,
        monthly_payment: 8800,
        total_repayment: 105600,
        total_paid: 8800,
        outstanding_balance: 96800,
        purpose: 'UI Test - Active Loan for IPS',
        status: 'disbursed',
        approved_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.admin,
        disbursed_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Active loan for client1 with outstanding balance
      {
        id: 'a1a1a1a1-0006-0000-0000-000000000006',
        user_id: TEST_USERS.client1,
        amount: 40000,
        term_months: 6,
        interest_rate: 32,
        monthly_payment: 7600,
        total_repayment: 45600,
        total_paid: 15200,
        outstanding_balance: 30400,
        purpose: 'UI Test - Active Loan 2',
        status: 'active',
        approved_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.loanOfficer,
        disbursed_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Disbursed loan for client2 with outstanding balance
      {
        id: 'a1a1a1a1-0007-0000-0000-000000000007',
        user_id: TEST_USERS.client2,
        amount: 55000,
        term_months: 9,
        interest_rate: 32,
        monthly_payment: 7500,
        total_repayment: 67500,
        total_paid: 7500,
        outstanding_balance: 60000,
        purpose: 'UI Test - Client2 Active Loan',
        status: 'disbursed',
        approved_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.admin,
        disbursed_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Active loan for client2
      {
        id: 'a1a1a1a1-0008-0000-0000-000000000008',
        user_id: TEST_USERS.client2,
        amount: 30000,
        term_months: 6,
        interest_rate: 32,
        monthly_payment: 5700,
        total_repayment: 34200,
        total_paid: 11400,
        outstanding_balance: 22800,
        purpose: 'UI Test - Client2 Active Loan 2',
        status: 'active',
        approved_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        approved_by: TEST_USERS.loanOfficer,
        disbursed_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
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
      const { error } = await supabase
        .from('disbursements')
        .upsert(disbursement, { onConflict: 'id' });
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
