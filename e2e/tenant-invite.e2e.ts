/**
 * Tenant-admin email invite + redeem.
 *
 * Relies on seed:seedTestUsers flipping TENANT_INVITES=true on this deployment only.
 */
import { expect, test } from '@playwright/test';
import { baseURL, login, signOutViaUI, waitForAppShell, waitForLoginForm } from './helpers/auth';

const PASSWORD = 'Test1234!';
const OFFICER_EMAIL = 'loan_officer@test.namlend.com';

function uniqueEmail(tag: string): string {
  return `e2e-invite-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
}

async function signUpOnInvitePage(
  page: import('@playwright/test').Page,
  data: { email: string; first: string; last: string; phone: string; idNumber: string }
) {
  await waitForLoginForm(page);
  await page.getByRole('button', { name: /create one/i }).click();
  await page.getByPlaceholder('John').fill(data.first);
  await page.getByPlaceholder('Doe').fill(data.last);
  await page.getByPlaceholder('name@example.com').fill(data.email);
  await page.getByPlaceholder('+264 81...').fill(data.phone);
  await page.getByPlaceholder('ID Number').fill(data.idNumber);
  await page.getByPlaceholder('Create password').fill(PASSWORD);
  await page.getByPlaceholder('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: /create account/i }).click();
}

async function loginAsOfficer(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`${baseURL}/auth`);
  await page.waitForLoadState('domcontentloaded');
  await waitForLoginForm(page);
  await page.getByTestId('email-input').fill(OFFICER_EMAIL);
  await page.getByTestId('password-input').fill(PASSWORD);
  await page.getByTestId('login-button').click();
  await page.waitForURL(/\/admin/, { timeout: 30000 });
  await waitForAppShell(page, 20000);
}

test.describe('Tenant invites', () => {
  test.describe.configure({ timeout: 120_000 });

  test('loan officer cannot send client invites', async ({ page }) => {
    await loginAsOfficer(page);
    await page.goto(`${baseURL}/admin/clients`);
    await waitForAppShell(page, 20000);
    const addClient = page.getByTestId('add-client-button');
    await expect(addClient).toBeVisible();
    await expect(addClient).toBeDisabled();
  });

  test('admin invites a loan officer who lands on /admin, not /dashboard', async ({ page }) => {
    const role = await login(page, true);
    expect(role).toBe('admin');
    await page.goto(`${baseURL}/admin/users`);
    await waitForAppShell(page, 20000);
    await expect(page.getByRole('tab', { name: /invites/i })).toBeVisible({ timeout: 15000 });

    await page.getByTestId('add-user-button').click();
    const dialog = page.getByTestId('invite-user-dialog');
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const email = uniqueEmail('officer');
    await page.getByTestId('invite-email').fill(email);
    await page.getByTestId('invite-submit').click();
    const copyLink = page.getByTestId('invite-copy-link');
    await expect(copyLink).toBeVisible({ timeout: 15000 });
    const href = await copyLink.inputValue();
    expect(href).toContain('/auth?invite=');
    expect(href).not.toContain('next=');

    await page.getByRole('button', { name: /done/i }).click();
    await signOutViaUI(page);

    await page.goto(href);
    await signUpOnInvitePage(page, {
      email,
      first: 'Invite',
      last: 'Officer',
      phone: '+264811230010',
      idNumber: '90010100991',
    });

    await page.waitForURL(/\/admin/, { timeout: 30000 });
    await waitForAppShell(page, 20000);
    await expect(page.getByText('Access Denied')).toHaveCount(0);

    await page.goto(`${baseURL}/dashboard`);
    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 15000 });
  });

  test('admin invites a client who lands on /dashboard, not /admin', async ({ page }) => {
    const role = await login(page, true);
    expect(role).toBe('admin');
    await page.goto(`${baseURL}/admin/clients`);
    await waitForAppShell(page, 20000);

    const addClient = page.getByTestId('add-client-button');
    await expect(addClient).toBeEnabled({ timeout: 15000 });
    await addClient.click();
    await expect(page.getByTestId('invite-user-dialog')).toBeVisible();

    const email = uniqueEmail('client');
    await page.getByTestId('invite-email').fill(email);
    await page.getByTestId('invite-submit').click();
    const copyLink = page.getByTestId('invite-copy-link');
    await expect(copyLink).toBeVisible({ timeout: 15000 });
    const href = await copyLink.inputValue();

    await page.getByRole('button', { name: /done/i }).click();
    await signOutViaUI(page);

    await page.goto(href);
    await signUpOnInvitePage(page, {
      email,
      first: 'Invite',
      last: 'Client',
      phone: '+264811230011',
      idNumber: '90010100992',
    });

    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await waitForAppShell(page, 20000);

    await page.goto(`${baseURL}/admin`);
    await expect(page.getByText('Access Denied')).toBeVisible({ timeout: 15000 });
  });
});
