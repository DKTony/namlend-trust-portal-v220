import { test, expect } from '@playwright/test';
import { gotoAuthenticated, login } from './helpers/auth';

// This test requires an admin account. It will be skipped if credentials are not set.
test.describe('Assign Role Modal', () => {
  test('opens and renders assign modal', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') {
      test.skip(true, 'Admin credentials not available; skipping role modal test');
      return;
    }

    await gotoAuthenticated(page, '/admin/users');
    await page.getByRole('tab', { name: /^Roles$/i }).click();
    await expect(page.getByRole('heading', { name: 'Role Management' })).toBeVisible();

    // Click first assign button by title
    const assignBtn = page.locator('[title="Assign this role to a user"]').first();
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // Expect modal dialog open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Assign');

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
