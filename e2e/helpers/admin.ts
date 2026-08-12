import { Page } from '@playwright/test';
import { waitForAppShell } from './auth';

export async function ensureAdminReady(page: Page): Promise<void> {
  await page.waitForURL(/\/admin/, { timeout: 30000 });
  await waitForAppShell(page, 30000);
}

/**
 * Map from nav item IDs to their route paths.
 * Used to verify URL change after navigation.
 */
const NAV_ROUTES: Record<string, string> = {
  overview: '/admin/overview',
  'tenant-info': '/admin/tenant-info',
  loans: '/admin/loans',
  clients: '/admin/clients',
  payments: '/admin/payments',
  approvals: '/admin/approvals',
  collections: '/admin/collections',
  'ipp-onboarding': '/admin/ipp-onboarding',
  batch: '/admin/batch',
  users: '/admin/users',
  analytics: '/admin/analytics',
  ledger: '/admin/ledger',
  reconciliation: '/admin/reconciliation',
  institutions: '/admin/institutions',
  products: '/admin/products',
  'payment-rails': '/admin/payment-rails',
  'business-rules': '/admin/business-rules',
  workflows: '/admin/workflows',
  mandates: '/admin/mandates',
  consent: '/admin/consent',
  'credit-policy': '/admin/settings/credit-policy',
  'tigerbeetle-config': '/admin/settings/tigerbeetle',
  'settlement-config': '/admin/settings/settlement',
  branding: '/admin/settings/branding',
};

export async function openAdminTab(page: Page, tabId: string): Promise<void> {
  await ensureAdminReady(page);

  const nav = page.getByTestId(`sidebar-nav-${tabId}`);
  if (
    !(await nav
      .first()
      .isVisible({ timeout: 1500 })
      .catch(() => false))
  ) {
    // Compact layout keeps navigation inside the drawer.
    const sidebarTrigger = page.getByTestId('sidebar-trigger');
    await sidebarTrigger.click();
  }

  await nav.waitFor({ state: 'visible', timeout: 20000 });
  await nav.scrollIntoViewIfNeeded();

  // Some themed transforms can make Playwright consider the element outside viewport.
  // Fallback to DOM click for stability in E2E.
  try {
    await nav.click({ timeout: 10000 });
  } catch {
    await nav.evaluate((el: HTMLElement) => el.click());
  }

  // Wait for route change if we know the expected path
  const expectedPath = NAV_ROUTES[tabId];
  if (expectedPath) {
    await page
      .waitForURL(new RegExp(expectedPath.replace(/\//g, '\\/')), { timeout: 10000 })
      .catch(() => {});
  }

  // Wait for drawer overlay to close before interacting with page content.
  const backdrop = page.getByTestId('sidebar-backdrop');
  await backdrop.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}
