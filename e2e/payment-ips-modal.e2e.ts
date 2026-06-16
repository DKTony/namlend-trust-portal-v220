/**
 * Payment IPS Modal E2E Tests
 *
 * Validates that the IPS payment method correctly opens the IPSPaymentModal
 * while non-IPS methods use the generic payment flow.
 */

import 'dotenv/config';
import { test, expect, TEST_USERS } from './fixtures';
import { waitForAppShell } from './helpers/auth';

const SUPABASE_STORAGE_KEY = 'namlend-auth';

async function waitForShell(page: import('@playwright/test').Page) {
  await waitForAppShell(page, 20000);
}

async function loginAsClient(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
  await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/(dashboard|loans)/);
  await waitForShell(page);

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

async function gotoWithAuth(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForTimeout(2000);

  if (page.url().includes('/auth')) {
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|admin|loans|payment|budget)/, { timeout: 20000 });
    await waitForShell(page);

    if (!page.url().includes(path.replace(/^\//, ''))) {
      await page.goto(path);
      await page.waitForTimeout(2000);
    }
  }

  try {
    await waitForShell(page);
  } catch {
    if (page.url().includes('/auth')) {
      await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/(dashboard|admin|loans|payment|budget)/, { timeout: 20000 });
    }
  }
}

async function openPaymentPageOrSkip(page: import('@playwright/test').Page) {
  await loginAsClient(page);
  await gotoWithAuth(page, '/payment');

  const noActiveLoans = page.getByText(/No Active Loans/i).first();
  if (await noActiveLoans.isVisible({ timeout: 2000 }).catch(() => false)) {
    test.skip(
      true,
      'No active loans are available in E2E seed data for generic payment modal tests.'
    );
    return false;
  }

  await page.locator('h1:has-text("Make a Payment")').waitFor({ state: 'visible', timeout: 15000 });
  return true;
}

test.describe('Payment Page - IPS Modal Trigger', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Payment page loads with payment form when client has active loans', async ({ page }) => {
    if (!(await openPaymentPageOrSkip(page))) return;

    // Verify the payment form renders (client1 has active/disbursed loans from global setup)
    const heading = page.locator('h1:has-text("Make a Payment")');
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Verify IPS tab is available
    const ipsTab = page.getByRole('tab', { name: /IPS/i });
    await expect(ipsTab).toBeVisible();

    // Verify Pay button is present
    const payButton = page.locator('button.w-full:has-text("Pay")');
    await expect(payButton).toBeVisible();
  });

  test('Selecting IPS tab and clicking Pay opens IPS Payment Modal', async ({ page }) => {
    if (!(await openPaymentPageOrSkip(page))) return;

    // Must explicitly click IPS tab to set paymentMethod state
    const ipsTab = page.getByRole('tab', { name: /IPS/i });
    await ipsTab.click();
    await page.waitForTimeout(500);

    // Click the Pay button
    const payButton = page.locator('button.w-full:has-text("Pay")');
    await payButton.click();

    // IPS modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal should show IPS-specific content
    await expect(modal.locator('text=/Outstanding Balance/i')).toBeVisible({ timeout: 5000 });
  });

  test('Selecting Card tab and clicking Pay does NOT open IPS modal', async ({ page }) => {
    if (!(await openPaymentPageOrSkip(page))) return;

    // Select the Card tab
    const cardTab = page.getByRole('tab', { name: /Card/i });
    await cardTab.click();
    await page.waitForTimeout(500);

    // Click the Pay button — this calls handlePayment() (generic flow)
    const payButton = page.locator('button.w-full:has-text("Pay")');
    await payButton.click();

    // Wait a moment and verify IPS modal did NOT open
    await page.waitForTimeout(2000);
    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible();
  });

  test('Switching from Card back to IPS and clicking Pay opens IPS modal', async ({ page }) => {
    if (!(await openPaymentPageOrSkip(page))) return;

    // First select Card
    const cardTab = page.getByRole('tab', { name: /Card/i });
    await cardTab.click();
    await page.waitForTimeout(300);

    // Then switch back to IPS
    const ipsTab = page.getByRole('tab', { name: /IPS/i });
    await ipsTab.click();
    await page.waitForTimeout(300);

    // Click Pay
    const payButton = page.locator('button.w-full:has-text("Pay")');
    await payButton.click();

    // IPS modal should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('IPS payment method shows zero processing fee', async ({ page }) => {
    if (!(await openPaymentPageOrSkip(page))) return;

    // Select IPS tab
    const ipsTab = page.getByRole('tab', { name: /IPS/i });
    await ipsTab.click();
    await page.waitForTimeout(500);

    // Verify processing fee is N$0.00 in the Payment Summary card
    const summaryCard = page.locator('text="Processing Fee"').locator('..');
    await expect(summaryCard).toContainText('N$0.00');
  });
});
