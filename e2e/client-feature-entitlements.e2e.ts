/**
 * Opt-in destructive E2E for entitlement dispatch. It only runs against a disposable seeded
 * environment and always restores Banking in `finally`.
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

async function bankingSwitch(page: Page) {
  return page.getByTestId('entitlement-switch-clientBanking');
}

async function waitForBankingSwitch(page: Page) {
  await selectOgTenant(page);
  await expect(page.getByText('all_features')).toBeVisible({ timeout: 20_000 });
  const toggle = await bankingSwitch(page);
  await expect(toggle).toBeVisible({ timeout: 20_000 });
  return toggle;
}

async function restoreBanking(page: Page) {
  if (!/\/auth(\?|$)/.test(page.url())) {
    try {
      await signOutViaUI(page);
    } catch {
      await page.goto(`${baseURL}/auth`);
    }
  }
  await loginAsPlatformOwner(page);
  await openEntitlements(page);
  const restore = await waitForBankingSwitch(page);
  if (!(await restore.isChecked())) {
    await restore.click({ force: true });
  }
  await expect(restore).toBeChecked({ timeout: 20_000 });
}

test.describe('Client feature dispatch', () => {
  test('owner disabling Banking removes desktop/mobile/deep-state/IPP surfaces and restores them', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    if (process.env.E2E_MUTATE_ENTITLEMENTS !== 'true') {
      throw new Error(
        'E2E_MUTATE_ENTITLEMENTS=true is required for the disposable enforcement preview.'
      );
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsPlatformOwner(page);
    await openEntitlements(page);
    await expect(page.getByText('On', { exact: true })).toBeVisible();

    const toggle = await waitForBankingSwitch(page);
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();

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
      await restoreBanking(page);
    }
  });
});
