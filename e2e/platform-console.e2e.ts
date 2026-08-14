/**
 * Platform Console (`/platform/*`) E2E — the application-owner commercial surface.
 *
 * Signs in as a DEDICATED, pure platform_owner (`platformowner@test.namlend.com`, tenant role =
 * client) seeded deterministically by `convex/seed.ts::seedPlatformOwnerForE2E`. The seed grants
 * platform_owner **authAccounts-first** (by the exact login identity), so this test cannot flake on
 * the duplicate/divergent-identity bug that blocked the earlier manual smoke. Because the owner has
 * a non-staff tenant role, reaching `/platform/guardrails` + the infrastructure pages genuinely
 * exercises the P1 guard-widening (assertAdminOrPlatformOwner / assertStaffOrPlatformSupport).
 */

import 'dotenv/config';
import { test, expect, type Page } from '@playwright/test';
import { baseURL, login, loginAsPlatformOwner, waitForAppShell } from './helpers/auth';

const PLATFORM_GATE_TEXT = 'Platform staff privileges required';

// Every /platform section a platform_owner must be able to open. The first five are platform-only
// pages (own container testid); the rest are backoffice dashboards reused under /platform behind
// the widened guards — reaching them as a pure owner is the guard-widening proof.
const OWNER_SECTIONS: Array<{ path: string; testid?: string }> = [
  { path: '/platform/overview', testid: 'platform-overview' },
  { path: '/platform/tenants', testid: 'platform-tenants' },
  { path: '/platform/plans', testid: 'platform-plans' },
  { path: '/platform/entitlements', testid: 'platform-entitlements' },
  { path: '/platform/support', testid: 'platform-support' },
  { path: '/platform/guardrails' },
  { path: '/platform/ledger' },
  { path: '/platform/tigerbeetle' },
  { path: '/platform/settlement' },
  { path: '/platform/payment-rails' },
];

/**
 * Navigate to a /platform section and prove the route guard admitted us: the PlatformLayout shell
 * (data-testid="platform-console-shell") only mounts once platform access is granted, so waiting
 * for it absorbs any transient load state; the Access-Denied gate is then asserted absent.
 */
async function openSection(page: Page, path: string): Promise<void> {
  await page.goto(`${baseURL}${path}`);
  await waitForAppShell(page, 20000);
  await expect(page.getByText(PLATFORM_GATE_TEXT)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  // Wide enough for the full (non-rail) sidebar so sidebar-signout is reachable.
  await page.setViewportSize({ width: 1280, height: 900 });
});

test.describe('Platform Console — access control', () => {
  test('a non-platform client is blocked from /platform', async ({ page }) => {
    const role = await login(page, false);
    test.skip(role !== 'client', 'Client credentials not available in this environment');

    await page.goto(`${baseURL}/platform`);
    await expect(page.getByText(PLATFORM_GATE_TEXT)).toBeVisible({ timeout: 15000 });
  });

  test('a platform owner reaches the console', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await openSection(page, '/platform/overview');

    await expect(page.getByRole('heading', { name: 'Platform Console' })).toBeVisible();
    await expect(page.getByText('Application owner')).toBeVisible();
    await expect(page.getByTestId('platform-overview')).toBeVisible();
  });
});

test.describe('Platform Console — sections render for the owner (guard widening)', () => {
  test('every /platform section opens without Access Denied', async ({ page }) => {
    await loginAsPlatformOwner(page);

    for (const section of OWNER_SECTIONS) {
      await openSection(page, section.path);
      await expect(page, `${section.path} should keep the /platform URL`).toHaveURL(
        (url) => url.pathname === section.path
      );
      if (section.testid) {
        await expect(
          page.getByTestId(section.testid),
          `${section.path} container should render`
        ).toBeVisible({ timeout: 15000 });
      }
    }
  });
});

test.describe('Platform Console — entitlements catalog', () => {
  test('client payment and self-service switches render', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await openSection(page, '/platform/entitlements');
    await expect(page.getByTestId('platform-entitlements')).toBeVisible();
    await expect(page.getByTestId('entitlement-switch-clientPayments')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId('entitlement-switch-clientSelfService')).toBeVisible();
  });
});

test.describe('Platform Console — owner write flow', () => {
  test('owner can provision a tenant', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await openSection(page, '/platform/tenants');
    await expect(page.getByTestId('platform-tenants')).toBeVisible();

    // Unique short code per run — provisionTenant rejects duplicates; the component upper-cases it.
    const code = `E2E${Date.now().toString(36).slice(-5).toUpperCase()}`;
    const name = `E2E Tenant ${code}`;

    await page.getByTestId('platform-tenants-provision').click();
    await page.getByTestId('tenant-name-input').fill(name);
    await page.getByTestId('tenant-code-input').fill(code);
    await page.getByTestId('tenant-submit').click();

    // Convex queries are reactive — the new tenant row appears (dialog closes on success).
    await expect(page.getByTestId(`platform-tenant-row-${code}`)).toBeVisible({ timeout: 20000 });
  });
});

test.describe('Platform Console — sign out', () => {
  test('signing out of the console returns to /auth', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await openSection(page, '/platform/overview');

    await page.getByTestId('sidebar-signout').click();
    await page.waitForURL(/\/auth/, { timeout: 20000 });
  });
});
