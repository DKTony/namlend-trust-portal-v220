import { test, expect } from '@playwright/test';
import { login, loginAsPlatformOwner, baseURL, waitForAppShell } from './helpers/auth';

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

  test('Access Denied offers a way back to the user own console', async ({ page }) => {
    const role = await login(page, false);
    test.skip(role !== 'client', 'Client credentials not available in this environment');

    await page.goto(`${baseURL}/admin`);
    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('access-denied-home').click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });
});

/**
 * Post-login landing. The redirect must wait for BOTH identity queries (tenant role and platform
 * role) before choosing a console — reading them early made every role land on /dashboard.
 */
test.describe('Post-login landing', () => {
  test('a client lands on /dashboard', async ({ page }) => {
    const role = await login(page, false);
    test.skip(role !== 'client', 'Client credentials not available in this environment');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  test('tenant staff land on /admin, not /dashboard', async ({ page }) => {
    const role = await login(page, true);
    test.skip(role !== 'admin', 'Admin credentials not available in this environment');
    await expect(page).toHaveURL(/\/admin/, { timeout: 20000 });
  });

  test('a pure platform owner lands on /platform, not /dashboard', async ({ page }) => {
    // Tenant role is `client`; the platform plane must win.
    await loginAsPlatformOwner(page);
    await expect(page).toHaveURL(/\/platform/, { timeout: 20000 });
  });
});

test.describe('Deep-link redirect (?next=)', () => {
  test('a deep link survives login and lands on the requested page', async ({ page }) => {
    const role = await login(page, true, '/admin/approvals');
    test.skip(role !== 'admin', 'Admin credentials not available in this environment');

    await expect(page).toHaveURL(/\/admin\/approvals/, { timeout: 20000 });
    await expect(page.getByText('Access Denied')).toHaveCount(0);
  });

  test('a deep link keeps its query string across login', async ({ page }) => {
    // The guard used to build `next` from pathname only, silently dropping the filter.
    const role = await login(page, true, '/admin/loans?status=pending');
    test.skip(role !== 'admin', 'Admin credentials not available in this environment');

    await expect(page).toHaveURL(/\/admin\/loans\?status=pending/, { timeout: 20000 });
  });

  test('a hard reload of a protected route never bounces through /auth', async ({ page }) => {
    const role = await login(page, true);
    test.skip(role !== 'admin', 'Admin credentials not available in this environment');

    // The guard used to treat "session live, profile query still in flight" as signed out,
    // so every reload detoured through /auth?next=… before coming back.
    const visitedAuth: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return;
      // about:blank and other non-URL navigations would throw in the URL parser and fail
      // the test for the wrong reason.
      let pathname: string;
      try {
        pathname = new URL(frame.url()).pathname;
      } catch {
        return;
      }
      if (pathname === '/auth') visitedAuth.push(frame.url());
    });

    await page.goto(`${baseURL}/admin/loans?status=pending`);
    await waitForAppShell(page, 20000);

    await expect(page).toHaveURL(/\/admin\/loans\?status=pending/);
    expect(visitedAuth).toEqual([]);
  });

  test('a next the user cannot open falls back to their own console', async ({ page }) => {
    // A client bounced off /admin/approvals must not be sent straight back into Access Denied.
    const role = await login(page, false, '/admin/approvals');
    test.skip(role !== 'client', 'Client credentials not available in this environment');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByText('Access Denied')).toHaveCount(0);
  });

  test('an external next is rejected instead of followed', async ({ page }) => {
    const role = await login(page, false, 'https://example.com/pwned');
    test.skip(role !== 'client', 'Client credentials not available in this environment');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    expect(new URL(page.url()).origin).toBe(new URL(baseURL).origin);
  });
});
