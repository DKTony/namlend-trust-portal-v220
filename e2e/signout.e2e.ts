import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';
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
  test('Header sign out (desktop)', async ({ page }) => {
    await login(page, true);
    // Open header menu is not needed on desktop; ensure viewport wide
    await page.setViewportSize({ width: 1200, height: 800 });
    // Navigate to landing page where Header is present
    await page.goto(baseURL);
    // Click Sign Out button in header
    await page.getByTestId('signout-button-header').click();
    await assertSignedOut(page);
  });

  test('Header sign out (mobile menu)', async ({ page }) => {
    await login(page, true);
    await page.setViewportSize({ width: 375, height: 812 });
    // Navigate to landing page where Header is present
    await page.goto(baseURL);
    // Open mobile menu
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await page.getByTestId('signout-button-mobile').click();
    await assertSignedOut(page);
  });

  test('Admin sidebar sign out', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin')
      test.skip(true, 'Admin credentials not available; skipping admin sign-out');
    await page.setViewportSize({ width: 1200, height: 800 });
    await ensureAdminReady(page);
    await page.getByTestId('sidebar-trigger').click();
    const drawer = page.getByTestId('sidebar-drawer');
    await drawer.getByRole('button', { name: /Sign Out/i }).click();
    await assertSignedOut(page);
  });
});
