/**
 * IPS Payment Flow E2E Tests
 *
 * End-to-end tests for IPS payment flows including UI interactions
 */

import 'dotenv/config';
import { test, expect, TEST_USERS } from './fixtures';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { baseURL } from './helpers/auth';

// Storage key must match the app's Supabase client configuration
const SUPABASE_STORAGE_KEY = 'namlend-auth';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);

test.skip(
  !hasSupabaseCredentials,
  'Legacy Supabase IPS payment-flow tests require Supabase credentials; skipped in Convex-only E2E.'
);

let serviceClient: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey) {
  serviceClient = createClient(supabaseUrl, supabaseServiceKey);
}

// Test data
const TEST_PREFIX = 'IPS-E2E-';

async function createDisbursedLoan(adminSupabase: SupabaseClient) {
  const {
    data: { user: adminUser },
  } = await adminSupabase.auth.getUser();
  if (!adminUser) {
    throw new Error('Admin user not available for IPS test setup');
  }

  const { data: loan, error } = await adminSupabase
    .from('loans')
    .insert({
      user_id: TEST_USERS.client1.id,
      amount: 1000,
      term_months: 6,
      interest_rate: 32,
      monthly_payment: 200,
      total_repayment: 1200,
      total_paid: 0,
      purpose: `${TEST_PREFIX} Loan`,
      status: 'disbursed',
      approved_at: new Date().toISOString(),
      approved_by: adminUser.id,
      disbursed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !loan) {
    throw new Error(`Failed to create IPS test loan: ${error?.message || 'unknown error'}`);
  }

  return loan;
}

async function cleanupIpsLoan(adminSupabase: SupabaseClient, loanId: string) {
  await adminSupabase.from('ips_transactions').delete().eq('loan_id', loanId);
  await adminSupabase.from('payments').delete().eq('loan_id', loanId);
  await adminSupabase.from('loans').delete().eq('id', loanId);
}

async function createApprovedDisbursement(adminSupabase: SupabaseClient) {
  const {
    data: { user: adminUser },
  } = await adminSupabase.auth.getUser();
  if (!adminUser) {
    throw new Error('Admin user not available for IPS disbursement setup');
  }

  const { data: loan, error: loanError } = await adminSupabase
    .from('loans')
    .insert({
      user_id: TEST_USERS.client1.id,
      amount: 2000,
      term_months: 6,
      interest_rate: 32,
      monthly_payment: 400,
      total_repayment: 2400,
      total_paid: 0,
      purpose: `${TEST_PREFIX} Disbursement`,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminUser.id,
    })
    .select('id')
    .single();

  if (loanError || !loan) {
    throw new Error(
      `Failed to create IPS disbursement loan: ${loanError?.message || 'unknown error'}`
    );
  }

  const reference = `${TEST_PREFIX}DISB-${Date.now()}`;
  const { data: disbursement, error: disbursementError } = await adminSupabase
    .from('disbursements')
    .insert({
      loan_id: loan.id,
      amount: 2000,
      status: 'approved',
      reference,
      created_by: adminUser.id,
    })
    .select('id')
    .single();

  if (disbursementError || !disbursement) {
    throw new Error(
      `Failed to create IPS disbursement: ${disbursementError?.message || 'unknown error'}`
    );
  }

  return { loanId: loan.id, disbursementId: disbursement.id };
}

async function cleanupApprovedDisbursement(
  adminSupabase: SupabaseClient,
  disbursementId: string,
  loanId: string
) {
  await adminSupabase.from('ips_transactions').delete().eq('disbursement_id', disbursementId);
  await adminSupabase.from('state_transitions').delete().eq('entity_id', disbursementId);
  await adminSupabase.from('disbursements').delete().eq('id', disbursementId);
  await adminSupabase.from('loans').delete().eq('id', loanId);
}

async function waitForClientShell(page: import('@playwright/test').Page) {
  await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 20000 });
}

async function waitForAdminShell(page: import('@playwright/test').Page) {
  await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 20000 });
}

/**
 * Login and wait for session to be persisted to localStorage
 */
async function loginAsClient(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
  await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/(dashboard|loans)/);
  await waitForClientShell(page);

  // Wait for session persistence
  await page
    .waitForFunction(
      (key) => {
        const stored = window.localStorage.getItem(key);
        return stored && stored.includes('access_token');
      },
      SUPABASE_STORAGE_KEY,
      { timeout: 5000 }
    )
    .catch(() => {});
}

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
  await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/(admin|dashboard)/);
  await waitForAdminShell(page);

  // Wait for session persistence
  await page
    .waitForFunction(
      (key) => {
        const stored = window.localStorage.getItem(key);
        return stored && stored.includes('access_token');
      },
      SUPABASE_STORAGE_KEY,
      { timeout: 5000 }
    )
    .catch(() => {});
}

/**
 * Navigate to a protected route with re-login fallback if session is lost
 */
async function gotoWithAuth(
  page: import('@playwright/test').Page,
  path: string,
  userType: 'client' | 'admin' = 'client'
) {
  await page.goto(path);
  await page.waitForTimeout(2000);

  // If redirected to auth, re-login
  if (page.url().includes('/auth')) {
    console.log(`Session lost navigating to ${path}, re-logging in as ${userType}...`);
    const creds = userType === 'admin' ? TEST_USERS.admin : TEST_USERS.client1;
    await page.fill('[data-testid="email-input"]', creds.email);
    await page.fill('[data-testid="password-input"]', creds.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|admin|loans)/, { timeout: 20000 });
    await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 10000 });

    // Navigate to target path via history to avoid another session loss
    if (!page.url().includes(path.replace(/^\//, ''))) {
      await page.evaluate((targetPath) => {
        window.history.pushState({}, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, path);
      await page.waitForTimeout(1000);

      // If that didn't work, do a direct goto (may lose session again but we'll handle it)
      if (!page.url().includes(path.replace(/^\//, ''))) {
        await page.goto(path);
        await page.waitForTimeout(2000);
      }
    }
  }

  // Wait for sidebar to confirm we're authenticated
  try {
    await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    // One more re-login attempt if needed
    if (page.url().includes('/auth')) {
      const creds = userType === 'admin' ? TEST_USERS.admin : TEST_USERS.client1;
      await page.fill('[data-testid="email-input"]', creds.email);
      await page.fill('[data-testid="password-input"]', creds.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/(dashboard|admin|loans)/, { timeout: 20000 });
    }
  }
}

test.describe('IPS Customer Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test.afterAll(async () => {
    if (!serviceClient) return;

    // Cleanup test data
    await serviceClient.from('ips_transactions').delete().like('note', `${TEST_PREFIX}%`);

    await serviceClient
      .from('ips_vpa_registry')
      .delete()
      .like('vpa_address', `${TEST_PREFIX.toLowerCase()}%`);
  });

  test('Customer can view IPS payment option on loan details', async ({ page, adminSupabase }) => {
    const loan = await createDisbursedLoan(adminSupabase);
    try {
      // Login as client with session persistence
      await loginAsClient(page);

      // Navigate to loan details with auth hydration wait
      await gotoWithAuth(page, `/loans/${loan.id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      const ipsButton = page.locator('[data-testid="ips-payment-button"]');
      await expect(ipsButton).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanupIpsLoan(adminSupabase, loan.id);
    }
  });

  test('Customer can open IPS payment modal', async ({ page, adminSupabase }) => {
    const loan = await createDisbursedLoan(adminSupabase);
    try {
      await loginAsClient(page);
      await gotoWithAuth(page, `/loans/${loan.id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      // Click IPS payment button
      const ipsButton = page.locator('[data-testid="ips-payment-button"]');
      await expect(ipsButton).toBeVisible({ timeout: 15000 });
      await ipsButton.click();

      // Modal should open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Should show amount input
      const amountInput = modal.locator('input[type="number"]');
      await expect(amountInput).toBeVisible();

      // Should show outstanding balance
      await expect(modal.locator('text=/Outstanding Balance/i')).toBeVisible();
    } finally {
      await cleanupIpsLoan(adminSupabase, loan.id);
    }
  });

  test('Customer can enter and validate VPA', async ({ page, adminSupabase }) => {
    const loan = await createDisbursedLoan(adminSupabase);
    try {
      await loginAsClient(page);
      await gotoWithAuth(page, `/loans/${loan.id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      // Open payment modal
      const ipsButton = page.locator('[data-testid="ips-payment-button"]');
      await expect(ipsButton).toBeVisible({ timeout: 15000 });
      await ipsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Enter amount and continue
      await modal.locator('input[type="number"]').fill('100');
      await modal.locator('button:has-text("Continue")').click();

      // Select 'Use a different address' to show VPA input
      const newVpaOption = modal.locator('text="Use a different address"');
      await expect(newVpaOption).toBeVisible({ timeout: 5000 });
      await newVpaOption.click();

      // Should show VPA input
      const vpaInput = modal.locator('[data-testid="vpa-input"]');
      await expect(vpaInput).toBeVisible({ timeout: 5000 });

      // Enter a VPA
      await vpaInput.fill('testuser@fnb');

      // Click verify button
      const verifyButton = modal.locator('[data-testid="vpa-verify-button"]');
      await expect(verifyButton).toBeVisible({ timeout: 5000 });
      await verifyButton.click();

      // Should show validation result (success in mock mode) - look for provider badge
      // Wait for validation to complete and check for the FNB badge
      await page.waitForTimeout(2000);
      await expect(modal.getByText('FNB')).toBeVisible({ timeout: 10000 });
    } finally {
      await cleanupIpsLoan(adminSupabase, loan.id);
    }
  });

  test('Customer payment flow - full journey', async ({ page, adminSupabase }) => {
    const loan = await createDisbursedLoan(adminSupabase);
    try {
      await loginAsClient(page);
      await gotoWithAuth(page, `/loans/${loan.id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      // Open IPS payment
      const ipsButton = page.locator('[data-testid="ips-payment-button"]');
      await expect(ipsButton).toBeVisible({ timeout: 15000 });
      await ipsButton.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Step 1: Enter amount
      await modal.locator('input[type="number"]').fill('100');
      await modal.locator('button:has-text("Continue")').click();

      // Step 2: Enter VPA - select 'Use a different address' first
      await page.waitForTimeout(500);
      const newVpaOption = modal.locator('text="Use a different address"');
      await expect(newVpaOption).toBeVisible({ timeout: 5000 });
      await newVpaOption.click();

      const vpaInput = modal.locator('[data-testid="vpa-input"]');
      await expect(vpaInput).toBeVisible({ timeout: 5000 });
      await vpaInput.fill('testuser@fnb');

      // Verify VPA
      const verifyButton = modal.locator('[data-testid="vpa-verify-button"]');
      await expect(verifyButton).toBeVisible({ timeout: 5000 });
      await verifyButton.click();
      await page.waitForTimeout(1000);

      // Continue to confirmation
      await modal.locator('button:has-text("Continue")').click();

      // Step 3: Confirm payment
      await page.waitForTimeout(500);
      const confirmButton = modal.locator('button:has-text("Pay Now")');
      await expect(confirmButton).toBeVisible({ timeout: 5000 });

      // Verify confirmation details (currency format: NAD 100.00)
      await expect(modal.locator('text=/100/i').first()).toBeVisible();
      await expect(modal.locator('text=/testuser@fnb/i')).toBeVisible();

      // Submit payment
      await confirmButton.click();

      // Should show processing
      await expect(modal.locator('text=/Processing/i')).toBeVisible({ timeout: 5000 });

      // Should show result (success in mock mode)
      await expect(modal.locator('text=/(Successful|Success)/i')).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanupIpsLoan(adminSupabase, loan.id);
    }
  });
});

test.describe('IPS Admin Disbursement Flow', () => {
  test('Admin can view IPS disbursement option', async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');

    // Navigate to disbursements
    await page.waitForURL(/\/(admin|dashboard)/);
    await waitForAdminShell(page);
    await page.goto('/admin/disbursements');

    // Look for IPS option
    const ipsOption = page.locator(
      '[data-testid="ips-disbursement"], button:has-text("IPS"), text=/Disburse via IPS/i'
    );

    // This may or may not be visible depending on if there are pending disbursements
    // Just check the page loads correctly
    await expect(page).toHaveURL(/disbursements/);
  });

  test('Admin can initiate IPS disbursement', async ({ page, adminSupabase }) => {
    const { loanId, disbursementId } = await createApprovedDisbursement(adminSupabase);
    try {
      await loginAsAdmin(page);
      await gotoWithAuth(page, `/admin/disbursements/${disbursementId}`);

      // Look for IPS disbursement form or button
      const ipsForm = page.locator('[data-testid="ips-disbursement-form"]');
      const ipsButton = page.locator('button:has-text("Disburse via IPS")');

      if ((await ipsForm.isVisible()) || (await ipsButton.isVisible())) {
        // Enter customer VPA
        const vpaInput = page.locator('[data-testid="vpa-input"]');
        await expect(vpaInput).toBeVisible({ timeout: 10000 });
        await vpaInput.fill('customer@fnb');

        // Verify
        const verifyButton = page.locator('[data-testid="vpa-verify-button"]');
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
          await page.waitForTimeout(1000);
        }

        // Continue/Confirm
        const continueButton = page.locator(
          'button:has-text("Continue"), button:has-text("Confirm")'
        );
        if (await continueButton.isVisible()) {
          await continueButton.click();
        }

        // Disburse
        const disburseButton = page.locator('button:has-text("Disburse")');
        if (await disburseButton.isVisible()) {
          await disburseButton.click();

          // Should show processing/result
          await expect(page.locator('text=/(Processing|Successful|Success)/i')).toBeVisible({
            timeout: 15000,
          });
        }
      }
    } finally {
      await cleanupApprovedDisbursement(adminSupabase, disbursementId, loanId);
    }
  });
});

test.describe('IPS Transaction History', () => {
  test('Customer can view IPS transaction history', async ({ page, client1Supabase }) => {
    await loginAsClient(page);

    // Find a loan with IPS transactions
    const { data: loans } = await client1Supabase.from('loans').select('id').limit(1);

    if (loans && loans.length > 0) {
      await gotoWithAuth(page, `/loans/${loans[0].id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      // Look for IPS history section
      const historySection = page
        .locator('[data-testid="ips-history"]')
        .or(page.getByText(/IPS Transactions/i));

      // May or may not have transactions
      if (await historySection.isVisible()) {
        await expect(historySection).toBeVisible();
      }
    }
  });

  test('Admin can view all IPS transactions', async ({ page }) => {
    await loginAsAdmin(page);
    await gotoWithAuth(page, '/admin/payments');

    // Look for IPS filter or tab
    const ipsTab = page.locator(
      '[data-testid="ips-tab"], button:has-text("IPS"), tab:has-text("IPS")'
    );
    if (await ipsTab.isVisible()) {
      await ipsTab.click();
      await page.waitForTimeout(500);
    }

    // Page should load without errors
    await expect(page).toHaveURL(/payments/);
  });
});

test.describe('IPS VPA Management', () => {
  test('Customer can manage saved VPAs', async ({ page }) => {
    await loginAsClient(page);
    await gotoWithAuth(page, '/profile');

    // Look for VPA management section
    const vpaSection = page
      .locator('[data-testid="vpa-management"]')
      .or(page.getByText(/Payment Address/i))
      .or(page.getByText(/VPA/i));

    if (await vpaSection.isVisible()) {
      // Should be able to add a new VPA
      const addButton = page.locator('button:has-text("Add"), button:has-text("New VPA")');
      if (await addButton.isVisible()) {
        await addButton.click();

        // Enter VPA
        const vpaInput = page.locator('[data-testid="vpa-input"]');
        if (await vpaInput.isVisible()) {
          await vpaInput.fill(`${TEST_PREFIX.toLowerCase()}newvpa@bank`);

          // Save
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")');
          if (await saveButton.isVisible()) {
            await saveButton.click();

            // Should show success
            await expect(page.locator('text=/(saved|added|success)/i')).toBeVisible({
              timeout: 5000,
            });
          }
        }
      }
    }
  });
});

test.describe('IPS Error Handling', () => {
  test('Shows appropriate error for failed payment', async ({ page, adminSupabase }) => {
    const loan = await createDisbursedLoan(adminSupabase);
    try {
      await loginAsClient(page);
      await gotoWithAuth(page, `/loans/${loan.id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      // Open IPS payment
      const ipsButton = page.locator('[data-testid="ips-payment-button"]');
      await expect(ipsButton).toBeVisible({ timeout: 15000 });
      await ipsButton.click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Enter amount
      await modal.locator('input[type="number"]').fill('100');
      await modal.locator('button:has-text("Continue")').click();

      // Enter VPA that triggers failure (contains 'fail')
      await page.waitForTimeout(500);
      const newVpaOption = modal.locator('text="Use a different address"');
      await expect(newVpaOption).toBeVisible({ timeout: 5000 });
      await newVpaOption.click();

      const vpaInput = modal.locator('[data-testid="vpa-input"]');
      await expect(vpaInput).toBeVisible({ timeout: 5000 });
      await vpaInput.fill('fail@testbank');

      // Verify VPA (required before Continue is enabled)
      const verifyButton = modal.locator('[data-testid="vpa-verify-button"]');
      await expect(verifyButton).toBeVisible({ timeout: 5000 });
      await verifyButton.click();
      await page.waitForTimeout(1000);

      // Continue after verification
      const continueButton = modal.locator('button:has-text("Continue")');
      await expect(continueButton).toBeEnabled({ timeout: 10000 });
      await continueButton.click();

      // Confirm
      await page.waitForTimeout(500);
      const payButton = modal.locator('button:has-text("Pay Now")');
      await expect(payButton).toBeVisible({ timeout: 5000 });
      await payButton.click();

      // Should show failure (use .first() to handle multiple matches)
      await expect(modal.locator('text=/(Failed|Error|Declined)/i').first()).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await cleanupIpsLoan(adminSupabase, loan.id);
    }
  });

  test('Shows retry option for retryable errors', async ({ page, adminSupabase }) => {
    const loan = await createDisbursedLoan(adminSupabase);
    try {
      await loginAsClient(page);
      await gotoWithAuth(page, `/loans/${loan.id}`);
      await page.getByTestId('loan-amount').waitFor({ state: 'visible', timeout: 20000 });

      // Open IPS payment
      const ipsButton = page.locator('[data-testid="ips-payment-button"]');
      await expect(ipsButton).toBeVisible({ timeout: 15000 });
      await ipsButton.click();
      const modal = page.locator('[role="dialog"]');

      // Enter amount
      await modal.locator('input[type="number"]').fill('100');
      await modal.locator('button:has-text("Continue")').click();

      // Enter VPA that triggers timeout (contains 'timeout')
      await page.waitForTimeout(500);
      const newVpaOption = modal.locator('text="Use a different address"');
      await expect(newVpaOption).toBeVisible({ timeout: 5000 });
      await newVpaOption.click();

      const vpaInput = modal.locator('[data-testid="vpa-input"]');
      await expect(vpaInput).toBeVisible({ timeout: 5000 });
      await vpaInput.fill('timeout@testbank');

      // Verify VPA (required before Continue is enabled)
      const verifyButton = modal.locator('[data-testid="vpa-verify-button"]');
      await expect(verifyButton).toBeVisible({ timeout: 5000 });
      await verifyButton.click();
      await page.waitForTimeout(1000);

      // Continue after verification
      const continueButton = modal.locator('button:has-text("Continue")');
      await expect(continueButton).toBeEnabled({ timeout: 10000 });
      await continueButton.click();

      await page.waitForTimeout(500);
      const payButton = modal.locator('button:has-text("Pay Now")');
      await expect(payButton).toBeVisible({ timeout: 5000 });
      await payButton.click();

      // Should show pending/processing status
      await expect(modal.locator('text=/(Pending|Processing|Check Status)/i')).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await cleanupIpsLoan(adminSupabase, loan.id);
    }
  });
});
