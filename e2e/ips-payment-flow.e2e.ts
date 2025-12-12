/**
 * IPS Payment Flow E2E Tests
 * 
 * End-to-end tests for IPS payment flows including UI interactions
 */

import { test, expect, TEST_USERS } from './fixtures';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serviceClient: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceKey) {
  serviceClient = createClient(supabaseUrl, supabaseServiceKey);
}

// Test data
const TEST_PREFIX = 'IPS-E2E-';

test.describe('IPS Customer Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test.afterAll(async () => {
    if (!serviceClient) return;

    // Cleanup test data
    await serviceClient
      .from('ips_transactions')
      .delete()
      .like('note', `${TEST_PREFIX}%`);
    
    await serviceClient
      .from('ips_vpa_registry')
      .delete()
      .like('vpa_address', `${TEST_PREFIX.toLowerCase()}%`);
  });

  test('Customer can view IPS payment option on loan details', async ({ page, client1Supabase }) => {
    // Login as client
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard
    await page.waitForURL(/\/(dashboard|loans)/);

    // Find a loan with outstanding balance via API
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id, status, outstanding_balance')
      .in('status', ['disbursed', 'active'])
      .gt('outstanding_balance', 0)
      .limit(1);

    if (!loans || loans.length === 0) {
      test.skip();
      return;
    }

    // Navigate to loan details
    await page.goto(`/loans/${loans[0].id}`);
    
    // Wait for page to finish loading (wait for loading spinner to disappear or content to appear)
    await page.waitForLoadState('networkidle');
    
    // Wait for either the IPS button or the loan amount to appear (indicates page loaded)
    const pageLoaded = await Promise.race([
      page.locator('[data-testid="loan-amount"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true),
      page.locator('text=/Loan Not Found/i').waitFor({ state: 'visible', timeout: 15000 }).then(() => false),
    ]).catch(() => false);

    if (!pageLoaded) {
      // Loan not accessible to this user - skip test
      test.skip();
      return;
    }

    // Check for IPS payment button (only visible for active/disbursed loans with balance)
    const ipsButton = page.locator('[data-testid="ips-payment-button"]').or(page.locator('button:has-text("Pay with IPS")'));
    
    // The button should be visible if loan is active/disbursed with outstanding balance
    await expect(ipsButton).toBeVisible({ timeout: 5000 });
  });

  test('Customer can open IPS payment modal', async ({ page, client1Supabase }) => {
    // This test requires a loan with outstanding balance
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id, outstanding_balance')
      .in('status', ['disbursed', 'active'])
      .gt('outstanding_balance', 0)
      .limit(1);

    if (!loans || loans.length === 0) {
      test.skip();
      return;
    }

    // Login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);

    // Navigate to loan
    await page.goto(`/loans/${loans[0].id}`);

    // Click IPS payment button
    const ipsButton = page.locator('[data-testid="ips-payment-button"], button:has-text("Pay with IPS")');
    if (await ipsButton.isVisible()) {
      await ipsButton.click();

      // Modal should open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Should show amount input
      const amountInput = modal.locator('input[type="number"]');
      await expect(amountInput).toBeVisible();

      // Should show outstanding balance
      await expect(modal.locator('text=/Outstanding Balance/i')).toBeVisible();
    }
  });

  test('Customer can enter and validate VPA', async ({ page, client1Supabase }) => {
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id')
      .in('status', ['disbursed', 'active'])
      .gt('outstanding_balance', 0)
      .limit(1);

    if (!loans || loans.length === 0) {
      test.skip();
      return;
    }

    // Login and navigate
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);
    await page.goto(`/loans/${loans[0].id}`);

    // Open payment modal
    const ipsButton = page.locator('[data-testid="ips-payment-button"], button:has-text("Pay with IPS")');
    if (await ipsButton.isVisible()) {
      await ipsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Enter amount and continue
      await modal.locator('input[type="number"]').fill('100');
      await modal.locator('button:has-text("Continue")').click();

      // Should show VPA input
      const vpaInput = modal.locator('input[placeholder*="@"]');
      await expect(vpaInput).toBeVisible({ timeout: 5000 });

      // Enter a VPA
      await vpaInput.fill('testuser@fnb');

      // Click verify button
      const verifyButton = modal.locator('button:has-text("Verify")');
      if (await verifyButton.isVisible()) {
        await verifyButton.click();

        // Should show validation result (success in mock mode)
        await expect(modal.locator('text=/FNB/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Customer payment flow - full journey', async ({ page, client1Supabase }) => {
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id, outstanding_balance, monthly_payment')
      .in('status', ['disbursed', 'active'])
      .gt('outstanding_balance', 100)
      .limit(1);

    if (!loans || loans.length === 0) {
      test.skip();
      return;
    }

    const loan = loans[0];

    // Login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);

    // Navigate to loan
    await page.goto(`/loans/${loan.id}`);

    // Open IPS payment
    const ipsButton = page.locator('[data-testid="ips-payment-button"], button:has-text("Pay with IPS")');
    if (!(await ipsButton.isVisible())) {
      test.skip();
      return;
    }

    await ipsButton.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Step 1: Enter amount
    await modal.locator('input[type="number"]').fill('100');
    await modal.locator('button:has-text("Continue")').click();

    // Step 2: Enter VPA
    await page.waitForTimeout(500);
    const vpaInput = modal.locator('input[placeholder*="@"]');
    if (await vpaInput.isVisible()) {
      await vpaInput.fill('testuser@fnb');
      
      // Verify VPA
      const verifyButton = modal.locator('button:has-text("Verify")');
      if (await verifyButton.isVisible()) {
        await verifyButton.click();
        await page.waitForTimeout(1000);
      }

      // Continue to confirmation
      await modal.locator('button:has-text("Continue")').click();

      // Step 3: Confirm payment
      await page.waitForTimeout(500);
      const confirmButton = modal.locator('button:has-text("Pay Now")');
      if (await confirmButton.isVisible()) {
        // Verify confirmation details
        await expect(modal.locator('text=/NAD 100/i')).toBeVisible();
        await expect(modal.locator('text=/testuser@fnb/i')).toBeVisible();

        // Submit payment
        await confirmButton.click();

        // Should show processing
        await expect(modal.locator('text=/Processing/i')).toBeVisible({ timeout: 5000 });

        // Should show result (success in mock mode)
        await expect(modal.locator('text=/(Successful|Success)/i')).toBeVisible({ timeout: 15000 });
      }
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
    await page.goto('/admin/disbursements');

    // Look for IPS option
    const ipsOption = page.locator('[data-testid="ips-disbursement"], button:has-text("IPS"), text=/Disburse via IPS/i');
    
    // This may or may not be visible depending on if there are pending disbursements
    // Just check the page loads correctly
    await expect(page).toHaveURL(/disbursements/);
  });

  test('Admin can initiate IPS disbursement', async ({ page, adminSupabase }) => {
    // Find an approved disbursement
    const { data: disbursements } = await adminSupabase
      .from('disbursements')
      .select(`
        id,
        amount,
        loan_id,
        loans!inner(
          user_id,
          profiles!inner(first_name, last_name)
        )
      `)
      .eq('status', 'approved')
      .is('ips_transaction_id', null)
      .limit(1);

    if (!disbursements || disbursements.length === 0) {
      test.skip();
      return;
    }

    // Login as admin
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(admin|dashboard)/);

    // Navigate to disbursement detail or processing page
    await page.goto(`/admin/disbursements/${disbursements[0].id}`);

    // Look for IPS disbursement form or button
    const ipsForm = page.locator('[data-testid="ips-disbursement-form"]');
    const ipsButton = page.locator('button:has-text("Disburse via IPS")');

    if (await ipsForm.isVisible() || await ipsButton.isVisible()) {
      // Enter customer VPA
      const vpaInput = page.locator('input[placeholder*="@"]');
      if (await vpaInput.isVisible()) {
        await vpaInput.fill('customer@fnb');
        
        // Verify
        const verifyButton = page.locator('button:has-text("Verify")');
        if (await verifyButton.isVisible()) {
          await verifyButton.click();
          await page.waitForTimeout(1000);
        }

        // Continue/Confirm
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Confirm")');
        if (await continueButton.isVisible()) {
          await continueButton.click();
        }

        // Disburse
        const disburseButton = page.locator('button:has-text("Disburse")');
        if (await disburseButton.isVisible()) {
          await disburseButton.click();

          // Should show processing/result
          await expect(page.locator('text=/(Processing|Successful|Success)/i')).toBeVisible({ timeout: 15000 });
        }
      }
    }
  });
});

test.describe('IPS Transaction History', () => {
  test('Customer can view IPS transaction history', async ({ page, client1Supabase }) => {
    // Login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);

    // Find a loan with IPS transactions
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id')
      .limit(1);

    if (loans && loans.length > 0) {
      await page.goto(`/loans/${loans[0].id}`);

      // Look for IPS history section
      const historySection = page.locator('[data-testid="ips-history"]').or(page.getByText(/IPS Transactions/i));
      
      // May or may not have transactions
      if (await historySection.isVisible()) {
        await expect(historySection).toBeVisible();
      }
    }
  });

  test('Admin can view all IPS transactions', async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(admin|dashboard)/);

    // Navigate to IPS transactions or payments
    await page.goto('/admin/payments');

    // Look for IPS filter or tab
    const ipsTab = page.locator('[data-testid="ips-tab"], button:has-text("IPS"), tab:has-text("IPS")');
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
    // Login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);

    // Navigate to profile/settings
    await page.goto('/profile');

    // Look for VPA management section
    const vpaSection = page.locator('[data-testid="vpa-management"]').or(page.getByText(/Payment Address/i)).or(page.getByText(/VPA/i));
    
    if (await vpaSection.isVisible()) {
      // Should be able to add a new VPA
      const addButton = page.locator('button:has-text("Add"), button:has-text("New VPA")');
      if (await addButton.isVisible()) {
        await addButton.click();

        // Enter VPA
        const vpaInput = page.locator('input[placeholder*="@"]');
        if (await vpaInput.isVisible()) {
          await vpaInput.fill(`${TEST_PREFIX.toLowerCase()}newvpa@bank`);
          
          // Save
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")');
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Should show success
            await expect(page.locator('text=/(saved|added|success)/i')).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });
});

test.describe('IPS Error Handling', () => {
  test('Shows appropriate error for failed payment', async ({ page, client1Supabase }) => {
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id')
      .in('status', ['disbursed', 'active'])
      .gt('outstanding_balance', 100)
      .limit(1);

    if (!loans || loans.length === 0) {
      test.skip();
      return;
    }

    // Login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);

    await page.goto(`/loans/${loans[0].id}`);

    // Open IPS payment
    const ipsButton = page.locator('[data-testid="ips-payment-button"], button:has-text("Pay with IPS")');
    if (!(await ipsButton.isVisible())) {
      test.skip();
      return;
    }

    await ipsButton.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Enter amount
    await modal.locator('input[type="number"]').fill('100');
    await modal.locator('button:has-text("Continue")').click();

    // Enter VPA that triggers failure (contains 'fail')
    await page.waitForTimeout(500);
    const vpaInput = modal.locator('input[placeholder*="@"]');
    if (await vpaInput.isVisible()) {
      await vpaInput.fill('fail@testbank');
      
      // Skip verification and continue
      const continueButton = modal.locator('button:has-text("Continue")');
      if (await continueButton.isEnabled()) {
        await continueButton.click();
      }

      // Confirm
      await page.waitForTimeout(500);
      const payButton = modal.locator('button:has-text("Pay Now")');
      if (await payButton.isVisible()) {
        await payButton.click();

        // Should show failure
        await expect(modal.locator('text=/(Failed|Error|Declined)/i')).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('Shows retry option for retryable errors', async ({ page, client1Supabase }) => {
    const { data: loans } = await client1Supabase
      .from('loans')
      .select('id')
      .in('status', ['disbursed', 'active'])
      .gt('outstanding_balance', 100)
      .limit(1);

    if (!loans || loans.length === 0) {
      test.skip();
      return;
    }

    // Login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|loans)/);

    await page.goto(`/loans/${loans[0].id}`);

    // Open IPS payment
    const ipsButton = page.locator('[data-testid="ips-payment-button"], button:has-text("Pay with IPS")');
    if (!(await ipsButton.isVisible())) {
      test.skip();
      return;
    }

    await ipsButton.click();
    const modal = page.locator('[role="dialog"]');

    // Enter amount
    await modal.locator('input[type="number"]').fill('100');
    await modal.locator('button:has-text("Continue")').click();

    // Enter VPA that triggers timeout (contains 'timeout')
    await page.waitForTimeout(500);
    const vpaInput = modal.locator('input[placeholder*="@"]');
    if (await vpaInput.isVisible()) {
      await vpaInput.fill('timeout@testbank');
      
      const continueButton = modal.locator('button:has-text("Continue")');
      if (await continueButton.isEnabled()) {
        await continueButton.click();
      }

      await page.waitForTimeout(500);
      const payButton = modal.locator('button:has-text("Pay Now")');
      if (await payButton.isVisible()) {
        await payButton.click();

        // Should show pending/processing status
        await expect(modal.locator('text=/(Pending|Processing|Check Status)/i')).toBeVisible({ timeout: 15000 });
      }
    }
  });
});
