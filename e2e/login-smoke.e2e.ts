import { expect, test } from '@playwright/test';
import { login, loginAsPlatformOwner } from './helpers/auth';

/**
 * Fail-fast login proof for the protected disposable preview.
 *
 * The full Chromium suite previously burned the job budget on 95 × 30s timeouts
 * when password sign-in never left /auth. This file must stay a short, dedicated
 * smoke so CI can abort before that.
 *
 * Identities are the seeded `*.test.namlend.com` users (not Notion aromatic logins).
 */
test.describe('Login smoke', () => {
  test('admin lands on /admin', async ({ page }) => {
    const role = await login(page, true);
    expect(role).toBe('admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
  });

  test('client lands on /dashboard', async ({ page }) => {
    const role = await login(page, false);
    expect(role).toBe('client');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  test('platform owner lands on /platform', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await expect(page).toHaveURL(/\/platform/, { timeout: 20000 });
  });
});
