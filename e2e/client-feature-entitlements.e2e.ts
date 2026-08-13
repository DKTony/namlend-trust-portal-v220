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

test.describe('Client feature dispatch', () => {
  test.skip(
    process.env.E2E_MUTATE_ENTITLEMENTS !== 'true',
    'Set E2E_MUTATE_ENTITLEMENTS=true only for a disposable enforcement-enabled environment.'
  );

  test('owner disabling Banking removes desktop/mobile/deep-state/IPP surfaces and restores them', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginAsPlatformOwner(page);
    await openEntitlements(page);
    await expect(page.getByText('On', { exact: true })).toBeVisible();

    const bankingSwitch = page.getByRole('switch', { name: 'Toggle Banking' });
    await expect(bankingSwitch).toBeChecked();
    await bankingSwitch.click();
    await expect(bankingSwitch).not.toBeChecked();

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
      if (!/\/platform/.test(page.url())) {
        if (!/\/auth/.test(page.url())) await signOutViaUI(page);
        await page.setViewportSize({ width: 1280, height: 900 });
        await loginAsPlatformOwner(page);
      }
      await openEntitlements(page);
      const restore = page.getByRole('switch', { name: 'Toggle Banking' });
      if (!(await restore.isChecked())) await restore.click();
      await expect(restore).toBeChecked();
    }
  });
});
