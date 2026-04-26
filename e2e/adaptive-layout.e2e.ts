import 'dotenv/config';
import { test, expect, Page } from '@playwright/test';
import { baseURL, gotoAuthenticated, login, waitForAppShell } from './helpers/auth';
import { ensureAdminReady } from './helpers/admin';

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 900 },
  { width: 1536, height: 864 },
];

async function expectNoHorizontalOverflow(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.clientWidth;
    const bodyScroll = document.body.scrollWidth;
    const rootScroll = document.documentElement.scrollWidth;
    return Math.max(bodyScroll, rootScroll) - documentWidth;
  });
  expect(overflow).toBeLessThanOrEqual(4);
}

async function expectInteractiveShellReachable(page: Page) {
  await waitForAppShell(page);
  const nav = page
    .locator(
      [
        '[data-testid="sidebar-trigger"]',
        '[data-testid="sidebar-desktop"]',
        '[data-testid="sidebar-rail"]',
        '[data-testid="admin-sidebar-desktop"]',
        '[data-testid="admin-sidebar-rail"]',
      ].join(', ')
    )
    .first();
  await expect(nav).toBeVisible();
}

test.describe('Adaptive layout regression', () => {
  test('public routes reflow without horizontal overflow', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of ['/', '/auth']) {
        await page.goto(`${baseURL}${route}`);
        await expectNoHorizontalOverflow(page);

        if (route === '/' && viewport.width < 768) {
          const trigger = page.getByTestId('landing-mobile-menu-trigger');
          await expect(trigger).toBeVisible();
          await trigger.click();
          await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
          await expectNoHorizontalOverflow(page);
        }
      }
    }
  });

  test('client routes keep navigation and actions reachable at required breakpoints', async ({
    page,
  }) => {
    test.setTimeout(180000);

    const role = await login(page, false);
    if (role !== 'client') test.skip(true, 'Client credentials not available');

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of ['/dashboard', '/loan-application', '/kyc', '/budget']) {
        await gotoAuthenticated(page, route);
        await expectInteractiveShellReachable(page);
        await expectNoHorizontalOverflow(page);
      }
    }
  });

  test('admin routes keep dense operational pages usable at required breakpoints', async ({
    page,
  }) => {
    test.setTimeout(180000);

    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      for (const route of [
        '/admin/overview',
        '/admin/loans',
        '/admin/clients',
        '/admin/payments',
        '/admin/users',
        '/admin/reconciliation',
      ]) {
        await page.goto(`${baseURL}${route}`);
        await ensureAdminReady(page);
        await expectNoHorizontalOverflow(page);
      }
    }
  });
});
