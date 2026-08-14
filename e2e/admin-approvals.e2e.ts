import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { ensureAdminReady, openAdminTab } from './helpers/admin';

test.describe('Admin Approvals (visibility & filters)', () => {
  test('Filters are visible and first request can be selected (if present)', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin')
      test.skip(true, 'Admin credentials not available; skipping approvals test');
    await page.setViewportSize({ width: 1280, height: 900 });
    await ensureAdminReady(page);

    // Navigate to Approvals tab
    await openAdminTab(page, 'approvals');

    // Filters visible
    await expect(page.getByTestId('approvals-filter-status')).toBeVisible();
    await expect(page.getByTestId('approvals-filter-type')).toBeVisible();
    await expect(page.getByTestId('approvals-filter-priority')).toBeVisible();
    await expect(page.getByTestId('approvals-search-input')).toBeVisible();

    // Optional: filter by type = loan_application
    await page.getByTestId('approvals-filter-type').click();
    await page.getByRole('option', { name: /Loan Applications/i }).click();

    // Either select the first request card or assert empty state
    const requests = page.locator('[data-testid^="approvals-request-"]');
    const emptyState = page.getByText(/No approval requests found/i);
    const hasRequest = await Promise.race([
      requests
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false),
      emptyState
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => false)
        .catch(() => false),
    ]);

    if (hasRequest) {
      await requests.first().click();
      await expect(page.getByTestId('approvals-review-dialog')).toBeVisible({ timeout: 10_000 });

      // Check for either action buttons (pending) or processed state (approved/rejected)
      const approveBtn = page.getByTestId('approvals-approve-btn');
      const processedState = page.getByTestId('approvals-processed-state');

      const isPending = await Promise.race([
        approveBtn
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => true)
          .catch(() => false),
        processedState
          .waitFor({ state: 'visible', timeout: 5000 })
          .then(() => false)
          .catch(() => false),
      ]);

      if (isPending) {
        // Pending request - buttons should be visible
        await expect(approveBtn).toBeVisible();
        await expect(page.getByTestId('approvals-reject-btn')).toBeVisible();
        await expect(page.getByTestId('approvals-requestinfo-btn')).toBeVisible();
      } else {
        // Already processed - should show processed state
        await expect(processedState).toBeVisible();
      }
    } else {
      await expect(emptyState).toBeVisible();
    }
  });
});
