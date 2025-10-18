import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

test.describe('Admin Approvals actions (non-mutating)', () => {
  test('Action controls visible and no write requests triggered', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping approvals actions test');

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`${baseURL}/admin`);

    // Wait for either admin sidebar or access denied then handle accordingly
    const adminNav = page.getByTestId('nav-financial');
    const accessDenied = page.getByText('Access Denied');
    const outcome = await Promise.race([
      adminNav.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'admin').catch(() => 'none'),
      accessDenied.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'denied').catch(() => 'none')
    ]);
    if (outcome !== 'admin') test.skip(true, 'Admin UI not available in environment; skipping approvals actions test');

    // Navigate to Approvals tab
    await page.getByTestId('nav-approvals').click();

    // Determine if there are any requests
    const firstRequest = page.locator('[data-testid^="approvals-request-"]').first();
    const hasRequest = await firstRequest.count().then(c => c > 0);

    if (!hasRequest) {
      await expect(page.getByText(/No approval requests found/i)).toBeVisible();
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
    await firstRequest.click();

    // Expect action buttons to be visible, but do not click approve/reject
    await expect(page.getByTestId('approvals-approve-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('approvals-reject-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('approvals-requestinfo-btn')).toBeVisible({ timeout: 10000 });

    // Optionally open request info panel (should be non-mutating open)
    // We avoid submitting any forms.
    try {
      await page.getByTestId('approvals-requestinfo-btn').click();
      // Wait briefly for a modal/panel, then close if a close button exists
      await page.waitForTimeout(300);
      const closeBtn = page.getByRole('button', { name: /Close|Cancel|Dismiss/i });
      if (await closeBtn.count()) {
        await closeBtn.first().click();
      }
    } catch {
      // If there is no modal or click is a no-op in this environment, continue
    }

    // Assert no write calls happened during the above interactions
    expect(Array.from(writeMethods)).toEqual([]);
  });
});
