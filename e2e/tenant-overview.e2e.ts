import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import { baseURL, login, loginAsPlatformOwner, waitForAppShell } from './helpers/auth';

const PLATFORM_GATE_TEXT = 'Platform staff privileges required';

async function loginAsLoanOfficer(page: Page) {
  await page.goto(`${baseURL}/auth`);
  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByTestId('email-input').fill('loan_officer@test.namlend.com');
  await page.getByTestId('password-input').fill('Test1234!');
  await page.getByTestId('login-button').click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
  await waitForAppShell(page, 30_000);
}

async function expectOverviewPage(page: Page) {
  await expect(page).toHaveURL(/\/platform\/tenants\/[^/]+$/);
  await expect(page.getByTestId('platform-tenant-overview')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('tenant-overview-clients')).toBeVisible();
  await expect(page.getByTestId('tenant-overview-staff')).toBeVisible();
  await expect(page.getByTestId('tenant-overview-loans-issued')).toBeVisible();
  await expect(page.getByTestId('tenant-overview-loaned-out')).toBeVisible();
  await expect(page.getByTestId('tenant-overview-repaid')).toBeVisible();
  await expect(page.getByTestId('tenant-overview-book-value')).toBeVisible();
  await expect(page.getByText('Clients', { exact: true })).toBeVisible();
  await expect(page.getByText('Staff', { exact: true })).toBeVisible();
  await expect(page.getByText('Loans issued')).toBeVisible();
  await expect(page.getByText('Loaned out')).toBeVisible();
  await expect(page.getByText('Repaid', { exact: true })).toBeVisible();
  await expect(page.getByText('Book value')).toBeVisible();
  await expect(page.getByText(/N\$/).first()).toBeVisible();
}

test.describe('Tenant overview', () => {
  test('platform owner opens Overview from the registry action', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await page.goto(`${baseURL}/platform/tenants`);
    await waitForAppShell(page, 20_000);
    await page.getByTestId('platform-tenant-overview-OGFS').click();
    await expectOverviewPage(page);
  });

  test('platform owner opens Overview by clicking the tenant name', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await page.goto(`${baseURL}/platform/tenants`);
    await waitForAppShell(page, 20_000);
    await page.getByTestId('platform-tenant-name-OGFS').click();
    await expectOverviewPage(page);
  });

  test('Tenant Info still opens from the registry', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await page.goto(`${baseURL}/platform/tenants`);
    await waitForAppShell(page, 20_000);
    await page.getByTestId('platform-tenant-info-OGFS').click();
    await expect(page).toHaveURL(/\/platform\/tenants\/[^/]+\/info/);
    await expect(page.getByTestId('tenant-info-page')).toBeVisible({ timeout: 20_000 });
  });

  test('Entitlements action does not navigate to overview', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await page.goto(`${baseURL}/platform/tenants`);
    await waitForAppShell(page, 20_000);
    await page.getByTestId('platform-tenant-entitlements-OGFS').click();
    await expect(page).toHaveURL(/\/platform\/entitlements\?tenant=/);
    await expect(page).not.toHaveURL(/\/platform\/tenants\/[^/]+$/);
  });

  test('client is denied the platform tenant overview', async ({ page }) => {
    const role = await login(page, false);
    expect(role).toBe('client');
    await page.goto(`${baseURL}/platform/tenants`);
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(PLATFORM_GATE_TEXT)).toBeVisible();
  });

  test('loan officer is denied the platform tenant overview', async ({ page }) => {
    await loginAsLoanOfficer(page);
    await page.goto(`${baseURL}/platform/tenants`);
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(PLATFORM_GATE_TEXT)).toBeVisible();
  });
});
