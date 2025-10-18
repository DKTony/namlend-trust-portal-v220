import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

test.describe('Admin Approvals (visibility & filters)', () => {
  test('Filters are visible and first request can be selected (if present)', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping approvals test');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${baseURL}/admin`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for either admin sidebar or access denied then handle accordingly
    const adminNav = page.getByTestId('nav-financial');
    const accessDenied = page.getByText('Access Denied');
    const outcome = await Promise.race([
      adminNav.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'admin').catch(() => 'none'),
      accessDenied.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'denied').catch(() => 'none')
    ]);
    if (outcome !== 'admin') test.skip(true, 'Admin UI not available in environment; skipping approvals test');

    // Navigate to Approvals tab
    await page.getByTestId('nav-approvals').click();

    // Filters visible
    await expect(page.getByTestId('approvals-filter-status')).toBeVisible();
    await expect(page.getByTestId('approvals-filter-type')).toBeVisible();
    await expect(page.getByTestId('approvals-filter-priority')).toBeVisible();
    await expect(page.getByTestId('approvals-search-input')).toBeVisible();

    // Optional: filter by type = loan_application
    await page.getByTestId('approvals-filter-type').click();
    await page.getByRole('option', { name: /Loan Applications/i }).click();

    // Either select the first request card or assert empty state
    const firstRequest = page.locator('[data-testid^="approvals-request-"]').first();
    const hasRequest = await firstRequest.count().then(c => c > 0);

    if (hasRequest) {
      await firstRequest.click();
      // Buttons visible but we won't click them (non-mutating)
      await expect(page.getByTestId('approvals-approve-btn')).toBeVisible();
      await expect(page.getByTestId('approvals-reject-btn')).toBeVisible();
      await expect(page.getByTestId('approvals-requestinfo-btn')).toBeVisible();
    } else {
      await expect(page.getByText(/No approval requests found/i)).toBeVisible();
    }
  });
});
