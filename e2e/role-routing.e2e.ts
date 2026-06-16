import { test, expect } from '@playwright/test';
import { login, baseURL, waitForAppShell } from './helpers/auth';

test.describe('Role-based routing', () => {
  test('Client is blocked from /admin', async ({ page }) => {
    const role = await login(page, false); // prefer client
    expect(role).toBe('client');
    await page.goto(`${baseURL}/admin`);
    // Wait for either Access Denied or (unexpected) admin nav
    const accessDenied = page.getByText('Access Denied');
    const adminNav = page.locator(
      '[data-testid="admin-sidebar-desktop"], [data-testid="admin-sidebar-rail"], [data-testid="sidebar-trigger"]'
    );
    await expect(accessDenied).toBeVisible({ timeout: 15000 });
    await expect(adminNav).toHaveCount(0);
    await expect(page.getByText("You don't have permission to access this page.")).toBeVisible();
  });

  test('Admin can access /admin', async ({ page }) => {
    const role = await login(page, true);
    expect(role).toBe('admin');
    await page.goto(`${baseURL}/admin`);
    // Wait for either admin UI or unexpected access denied
    const accessDenied = page.getByText('Access Denied');
    await waitForAppShell(page, 20000);
    await expect(accessDenied).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  });
});
