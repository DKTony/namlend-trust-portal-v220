import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

// This test requires an admin account. It will be skipped if credentials are not set.
test.describe('Assign Role Modal', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are not set');

  test('opens and renders assign modal', async ({ page }) => {
    // Sign in
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', ADMIN_EMAIL!);
    await page.fill('input[type="password"]', ADMIN_PASSWORD!);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button:has-text("Sign")'), // matches Sign In / Sign in
    ]);

    // Navigate to admin dashboard role management
    await page.goto(`${BASE_URL}/admin`);
    await expect(page.getByText('Role Management')).toBeVisible();

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
