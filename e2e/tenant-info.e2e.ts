import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import { ensureAdminReady } from './helpers/admin';
import { baseURL, login, loginAsPlatformOwner, waitForAppShell } from './helpers/auth';

async function loginAsLoanOfficer(page: Page) {
  await page.goto(`${baseURL}/auth`);
  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByTestId('email-input').fill('loan_officer@test.namlend.com');
  await page.getByTestId('password-input').fill('Test1234!');
  await page.getByTestId('login-button').click();
  await page.waitForURL(/\/admin/, { timeout: 30_000 });
  await waitForAppShell(page, 30_000);
}

async function expectTenantDetails(page: Page) {
  await expect(page.getByTestId('tenant-info-page')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('OG Financial Services CC')).toBeVisible();
  await expect(page.getByText('CC/2025/12791')).toBeVisible();
  await expect(page.getByText('25/11/2366')).toBeVisible();
  await expect(page.getByText('NAMFISA-licensed address')).toBeVisible();
  await expect(page.getByText('Contact / office address')).toBeVisible();
  await expect(page.getByTestId('tenant-document-namfisa_registration')).toBeVisible();
  await expect(page.getByTestId('tenant-document-namra_taxpayer_certificate')).toBeVisible();
}

test.describe('Tenant Info', () => {
  test('admin sees tenant document cards and replacement control responsively', async ({
    page,
  }) => {
    const role = await login(page, true);
    expect(role).toBe('admin');

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${baseURL}/admin/tenant-info`);
      await ensureAdminReady(page);
      await expectTenantDetails(page);
      await expect(page.getByTestId('tenant-document-upload')).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(4);
    }

    const previewButton = page
      .getByTestId('tenant-document-namfisa_registration')
      .getByRole('button', { name: 'Preview document' });
    if ((await previewButton.count()) > 0) {
      await previewButton.click();
      await expect(page.locator('iframe[title^="Preview of "]')).toBeVisible({ timeout: 20_000 });
    } else {
      await expect(
        page
          .getByTestId('tenant-document-namfisa_registration')
          .getByText('No current PDF has been uploaded yet.')
      ).toBeVisible();
    }
  });

  test('loan officer has read-only same-tenant access', async ({ page }) => {
    await loginAsLoanOfficer(page);
    await page.goto(`${baseURL}/admin/tenant-info`);
    await ensureAdminReady(page);
    await expectTenantDetails(page);
    await expect(page.getByTestId('tenant-document-upload')).toHaveCount(0);
  });

  test('client is denied the staff Tenant Info route', async ({ page }) => {
    const role = await login(page, false);
    expect(role).toBe('client');
    await page.goto(`${baseURL}/admin/tenant-info`);
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('platform owner opens Tenant Info from the registry', async ({ page }) => {
    await loginAsPlatformOwner(page);
    await page.goto(`${baseURL}/platform/tenants`);
    await waitForAppShell(page, 20_000);
    await page.getByTestId('platform-tenant-info-OGFS').click();
    await expect(page).toHaveURL(/\/platform\/tenants\/[^/]+\/info/);
    await expectTenantDetails(page);
    await expect(page.getByTestId('tenant-document-upload')).toBeVisible();
  });
});
