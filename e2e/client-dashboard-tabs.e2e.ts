/**
 * Client Dashboard Tab Navigation E2E Tests
 *
 * Verifies that every sidebar menu item on the client dashboard
 * renders content (not blank) and produces no console errors.
 */

import 'dotenv/config';
import { test, expect, Page, ConsoleMessage } from '@playwright/test';
import { login, baseURL, waitForAppShell } from './helpers/auth';

/** Open the drawer sidebar and click a nav item by its test-id suffix. */
async function clickSidebarItem(page: Page, itemId: string) {
  const navItem = page.getByTestId(`sidebar-nav-${itemId}`);
  if (!(await navItem.isVisible({ timeout: 1000 }).catch(() => false))) {
    // Compact layout keeps navigation inside the drawer.
    const trigger = page.getByTestId('sidebar-trigger');
    await trigger.waitFor({ state: 'visible', timeout: 10000 });
    await trigger.click();
  }

  await navItem.waitFor({ state: 'visible', timeout: 5000 });
  await navItem.click();

  // Wait for drawer to close (content area is visible)
  await page.waitForTimeout(500);
}

test.describe('Client Dashboard — Tab Navigation', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('all sidebar tabs render content without errors', async ({ page }) => {
    // Login as client
    const role = await login(page, false);
    expect(role).toBe('client');

    // Navigate to dashboard
    await page.goto(`${baseURL}/dashboard`);
    await waitForAppShell(page, 20000);

    // Wait for dashboard content to load (overview is the default tab)
    await expect(page.locator('main')).not.toBeEmpty({ timeout: 15000 });

    // --- Tab: Overview (default) ---
    const mainContent = page.locator('main');
    await expect(mainContent.getByText(/hello|total balance|financial/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: My Loans ---
    await clickSidebarItem(page, 'loans');
    await expect(mainContent.getByText(/your loans|no loans|loan/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: Applications ---
    await clickSidebarItem(page, 'applications');
    await expect(mainContent.getByText(/application/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: Payments ---
    await clickSidebarItem(page, 'payments');
    await expect(mainContent.getByText(/payment/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: Banking ---
    await clickSidebarItem(page, 'banking');
    await expect(mainContent.getByText(/banking|ipp|accounts/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: Self Service ---
    await clickSidebarItem(page, 'self-service');
    await expect(mainContent.getByText(/self-service|statements|receipts/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: Profile ---
    await clickSidebarItem(page, 'profile');
    await expect(mainContent.getByText(/profile|personal|documents/i).first()).toBeVisible({
      timeout: 10000,
    });

    // --- Tab: Budget & Finance (navigates to /budget) ---
    await clickSidebarItem(page, 'budget');
    await page.waitForURL(/\/budget/, { timeout: 10000 });
    expect(page.url()).toContain('/budget');

    // Navigate back to dashboard for Documents test
    await page.goto(`${baseURL}/dashboard`);
    await waitForAppShell(page, 20000);

    // --- Tab: Documents (navigates to /kyc) ---
    await clickSidebarItem(page, 'documents');
    await page.waitForURL(/\/kyc/, { timeout: 10000 });
    expect(page.url()).toContain('/kyc');

    // Verify no console errors were logged during the entire navigation
    const realErrors = consoleErrors.filter(
      (e) => !e.includes('React DevTools') && !e.includes('favicon')
    );
    expect(realErrors).toEqual([]);
  });
});
