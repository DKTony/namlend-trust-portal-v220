/**
 * Opt-in destructive E2E for entitlement dispatch. It only runs against a disposable seeded
 * environment (enableDisposableE2EEnforcement / E2E_MUTATE_ENTITLEMENTS) and restores toggles
 * in `finally`. It does not flip live TENANCY_ENFORCEMENT or ENTITLEMENT_ENFORCEMENT.
 */
import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import {
  baseURL,
  login,
  loginAsPlatformOwner,
  signOutViaUI,
  waitForAppShell,
} from './helpers/auth';

async function openEntitlements(page: Page) {
  await page.goto(`${baseURL}/platform/entitlements`);
  await waitForAppShell(page, 20_000);
  await expect(page.getByTestId('platform-entitlements')).toBeVisible();
}

async function selectOgTenant(page: Page) {
  const select = page.getByTestId('entitlements-tenant-select');
  await expect(select).toBeVisible({ timeout: 20_000 });
  const ogOption = select.locator('option').filter({ hasText: /OGFS|OG Financial/i });
  if ((await ogOption.count()) > 0) {
    const value = await ogOption.first().getAttribute('value');
    if (value) await select.selectOption(value);
  }
}

async function waitForCatalog(page: Page) {
  await selectOgTenant(page);
  await expect(page.getByText('all_features')).toBeVisible({ timeout: 20_000 });
}

async function entitlementSwitch(page: Page, featureKey: string) {
  return page.getByTestId(`entitlement-switch-${featureKey}`);
}

async function setEntitlement(page: Page, featureKey: string, enabled: boolean) {
  const toggle = await entitlementSwitch(page, featureKey);
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  if ((await toggle.isChecked()) === enabled) return;
  await toggle.click({ force: true });
  if (enabled) {
    await expect(toggle).toBeChecked({ timeout: 20_000 });
  } else {
    await expect(toggle).not.toBeChecked({ timeout: 20_000 });
  }
}

async function restoreEntitlements(page: Page, keys: Record<string, boolean>) {
  if (!/\/auth(\?|$)/.test(page.url())) {
    try {
      await signOutViaUI(page);
    } catch {
      await page.goto(`${baseURL}/auth`);
    }
  }
  await loginAsPlatformOwner(page);
  await openEntitlements(page);
  await waitForCatalog(page);
  for (const [featureKey, enabled] of Object.entries(keys)) {
    await setEntitlement(page, featureKey, enabled);
  }
}

function requireMutablePreview() {
  if (process.env.E2E_MUTATE_ENTITLEMENTS !== 'true') {
    throw new Error(
      'E2E_MUTATE_ENTITLEMENTS=true is required for the disposable enforcement preview.'
    );
  }
}

test.describe('Client feature dispatch', () => {
  test('owner disabling Banking removes desktop/mobile/deep-state/IPP surfaces and restores them', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    requireMutablePreview();
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsPlatformOwner(page);
    await openEntitlements(page);
    await expect(page.getByText('On', { exact: true })).toBeVisible();

    await waitForCatalog(page);
    await setEntitlement(page, 'clientBanking', false);

    try {
      await signOutViaUI(page);
      const role = await login(page, false);
      expect(role).toBe('client');
      await page.goto(`${baseURL}/dashboard`);
      await waitForAppShell(page, 20_000);
      await expect(page.getByTestId('sidebar-nav-banking')).toHaveCount(0);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByTestId('sidebar-trigger').click();
      await expect(page.getByTestId('sidebar-nav-banking')).toHaveCount(0);

      await page.goto(`${baseURL}/payment`);
      await expect(page.getByRole('tab', { name: /IPP/i })).toHaveCount(0);

      await page.goto(`${baseURL}/dashboard`);
      await page.evaluate(() => {
        window.history.replaceState(
          { usr: { tab: 'banking' }, key: 'e2e', idx: 0 },
          '',
          '/dashboard'
        );
      });
      await page.reload();
      await expect(page.getByText(/banking|IPP accounts/i)).toHaveCount(0);
    } finally {
      await page.setViewportSize({ width: 1280, height: 900 });
      await restoreEntitlements(page, { clientBanking: true });
    }
  });

  test('budget and self-service hide independently while Overview and Loans stay', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    requireMutablePreview();
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsPlatformOwner(page);
    await openEntitlements(page);
    await waitForCatalog(page);
    await setEntitlement(page, 'clientBudget', false);
    await setEntitlement(page, 'clientSelfService', false);

    try {
      await signOutViaUI(page);
      expect(await login(page, false)).toBe('client');
      await page.goto(`${baseURL}/dashboard`);
      await waitForAppShell(page, 20_000);
      await expect(page.getByTestId('sidebar-nav-budget')).toHaveCount(0);
      await expect(page.getByTestId('sidebar-nav-self-service')).toHaveCount(0);
      await expect(page.getByTestId('sidebar-nav-overview')).toBeVisible();
      await expect(page.getByTestId('sidebar-nav-loans')).toBeVisible();

      await page.goto(`${baseURL}/budget`);
      await expect(page).not.toHaveURL(/\/budget$/);
    } finally {
      await restoreEntitlements(page, { clientBudget: true, clientSelfService: true });
    }
  });

  test('banking off leaves cash repayment on /payment', async ({ page }) => {
    test.setTimeout(120_000);
    requireMutablePreview();
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsPlatformOwner(page);
    await openEntitlements(page);
    await waitForCatalog(page);
    await setEntitlement(page, 'clientBanking', false);

    try {
      await signOutViaUI(page);
      expect(await login(page, false)).toBe('client');
      await page.goto(`${baseURL}/payment`);
      await waitForAppShell(page, 20_000);
      await expect(page.getByTestId('sidebar-nav-banking')).toHaveCount(0);
      await expect(page.getByRole('tab', { name: /IPP/i })).toHaveCount(0);
      await expect(page.getByRole('tab', { name: /card|debit|mobile/i }).first()).toBeVisible();
    } finally {
      await restoreEntitlements(page, { clientBanking: true });
    }
  });

  test('collections off hides Payments hub Collections and Reschedules tabs', async ({ page }) => {
    test.setTimeout(120_000);
    requireMutablePreview();
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsPlatformOwner(page);
    await openEntitlements(page);
    await waitForCatalog(page);
    await setEntitlement(page, 'collections', false);

    try {
      await signOutViaUI(page);
      expect(await login(page, true)).toBe('admin');
      await page.goto(`${baseURL}/admin/payments`);
      await waitForAppShell(page, 20_000);
      await expect(page.getByRole('tab', { name: /Collections/i })).toHaveCount(0);
      await expect(page.getByRole('tab', { name: /Reschedules/i })).toHaveCount(0);
      await expect(page.getByRole('tab', { name: /Payments/i }).first()).toBeVisible();
    } finally {
      await restoreEntitlements(page, { collections: true });
    }
  });
});
