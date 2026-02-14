import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { ensureAdminReady, openAdminTab } from './helpers/admin';

test.describe('Admin Approvals actions (non-mutating)', () => {
  test('Action controls visible and no write requests triggered', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping approvals actions test');

    await page.setViewportSize({ width: 1366, height: 900 });
    await ensureAdminReady(page);

    // Navigate to Approvals tab
    await openAdminTab(page, 'approvals');

    // Determine if there are any requests
    const requests = page.locator('[data-testid^="approvals-request-"]');
    const emptyState = page.getByText(/No approval requests found/i);
    const hasRequest = await Promise.race([
      requests.first().waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false),
      emptyState.waitFor({ state: 'visible', timeout: 15000 }).then(() => false).catch(() => false),
    ]);

    if (!hasRequest) {
      await expect(emptyState).toBeVisible();
      return; // nothing to validate further
    }

    // Monitor for any write operations
    const writeMethods = new Set<string>();
    page.on('request', (req) => {
      const method = req.method();
      if (method !== 'GET' && method !== 'OPTIONS' && method !== 'HEAD') {
        writeMethods.add(method);
      }
    });

    // Open first request details
    await requests.first().click();

    // Check for either action buttons (pending) or processed state (approved/rejected)
    const approveBtn = page.getByTestId('approvals-approve-btn');
    const processedState = page.getByTestId('approvals-processed-state');

    const isPending = await Promise.race([
      approveBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
      processedState.waitFor({ state: 'visible', timeout: 5000 }).then(() => false).catch(() => false),
    ]);

    if (isPending) {
      // Expect action buttons to be visible for pending requests
      await expect(approveBtn).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('approvals-reject-btn')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('approvals-requestinfo-btn')).toBeVisible({ timeout: 5000 });
    } else {
      // Processed request - verify processed state is shown
      await expect(processedState).toBeVisible({ timeout: 5000 });
    }

    // Assert no write calls happened during the above interactions
    expect(Array.from(writeMethods)).toEqual([]);
  });
});
