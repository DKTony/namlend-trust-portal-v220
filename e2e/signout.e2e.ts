import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, waitForAppShell } from './helpers/auth';
import { ensureAdminReady } from './helpers/admin';

/**
 * E2E: verifies Sign Out works from Header (desktop + mobile) and Admin sidebar.
 * Assumptions:
 * - Dev server is running on http://localhost:8080
 * - Using mock Supabase by leaving VITE_SUPABASE_URL/KEY unset in local env
 */

// Using shared helper login()

async function assertSignedOut(page: import('@playwright/test').Page) {
  // After sign out, we should be on /auth
  await page.waitForURL(/\/auth/, { timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(200);
  const token = await page.evaluate(() => window.localStorage.getItem('namlend-auth'));
  expect(token).toBe(null);
}

test.describe('Sign Out flows', () => {
  test('App shell sign out (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await login(page, false);
    await waitForAppShell(page, 20000);
    await page.getByTestId('sidebar-signout').click();
    await assertSignedOut(page);
  });

  test('App shell sign out (mobile menu)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, false);
    await page.getByTestId('sidebar-trigger').click();
    const drawer = page.getByTestId('sidebar-drawer');
    await drawer.getByTestId('sidebar-signout').click();
    await assertSignedOut(page);
  });

  test('Admin sidebar sign out', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin')
      test.skip(true, 'Admin credentials not available; skipping admin sign-out');
    await page.setViewportSize({ width: 1200, height: 800 });
    await ensureAdminReady(page);
    await page.getByTestId('sidebar-signout').click();
    await assertSignedOut(page);
  });
});
