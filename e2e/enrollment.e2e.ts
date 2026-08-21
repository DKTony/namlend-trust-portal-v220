/**
 * Enrollment + Google sign-in E2E.
 *
 * Covers the three things that were broken or missing before:
 *  1. sign-up silently dropped fullName/phone and never wrote idNumber at all
 *  2. `?next=` was passed to navigate() unvalidated (open redirect)
 *  3. the Google button must be absent unless the deployment has credentials
 *
 * What CANNOT be asserted here: the real Google consent screen. Google bot-blocks
 * automated sign-in, so the handshake is covered up to the authorize redirect only
 * (see `e2e/README` note in the PR description) — the rest is manual.
 */
import { expect, test } from '@playwright/test';
import { createConvexTestClient } from './fixtures';
import { baseURL, login, waitForAppShell } from './helpers/auth';

const PASSWORD = 'Test1234!';

function uniqueEmail(tag: string): string {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
}

/** Read a profile back through the real auth path, as the app itself would. */
async function fetchProfile(email: string) {
  const anon = createConvexTestClient();
  const res = (await anon.action(
    'auth:signIn' as never,
    {
      provider: 'password',
      params: { email, password: PASSWORD, flow: 'signIn' },
    } as never
  )) as { tokens?: { token: string } };
  const token = res?.tokens?.token;
  if (!token) throw new Error(`could not sign in as ${email}`);
  const authed = createConvexTestClient();
  authed.setAuth(token);
  return (await authed.query('users:getMyProfile' as never, {} as never)) as Record<
    string,
    unknown
  > | null;
}

async function signUp(
  page: import('@playwright/test').Page,
  data: { email: string; first: string; last: string; phone: string; idNumber: string },
  next = '/kyc'
) {
  await page.goto(`${baseURL}/auth?next=${encodeURIComponent(next)}`);
  await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('auth-switch-to-signup').click();

  await page.getByTestId('signup-first-name-input').fill(data.first);
  await page.getByTestId('signup-last-name-input').fill(data.last);
  await page.getByTestId('signup-email-input').fill(data.email);
  await page.getByTestId('signup-phone-input').fill(data.phone);
  await page.getByTestId('signup-id-number-input').fill(data.idNumber);
  await page.getByTestId('signup-password-input').fill(PASSWORD);
  await page.getByTestId('signup-confirm-password-input').fill(PASSWORD);
  await page.getByTestId('signup-submit-button').click();
}

test.describe('Sign-up enrollment', () => {
  test('creates an account and persists name, phone and ID number', async ({ page }) => {
    const email = uniqueEmail('enroll');
    await signUp(page, {
      email,
      first: 'Enroll',
      last: 'Tester',
      phone: '+264811230000',
      idNumber: '90010100999',
    });

    // Honours ?next=
    await page.waitForURL(/\/kyc/, { timeout: 30000 });
    await waitForAppShell(page, 20000);

    const profile = await fetchProfile(email);
    expect(profile).toBeTruthy();
    // These three are the regression: all were undefined before enrollUser existed.
    expect(profile!.fullName).toBe('Enroll Tester');
    expect(profile!.phone).toBe('+264811230000');
    expect(profile!.idNumber).toBe('90010100999');
    expect(profile!.signupSource).toBe('password');
    // Password sign-ups arrive complete, so the completion gate must not fire.
    expect(profile!.onboardingCompletedAt).toEqual(expect.any(Number));
    await expect(page.getByTestId('profile-completion-gate')).toHaveCount(0);
  });

  test('a signed-in user is not asked to complete their profile again', async ({ page }) => {
    await login(page, false);
    await page.goto(`${baseURL}/dashboard`);
    await waitForAppShell(page, 20000);
    // ANTI-TRAP: the seeded client has no phone and no idNumber. Gating on blank
    // fields instead of an explicit signupSource marker would trap them here.
    await expect(page.getByTestId('profile-completion-gate')).toHaveCount(0);
  });
});

test.describe('next= redirect safety', () => {
  test('a protocol-relative next cannot send the user off-origin', async ({ page }) => {
    await page.goto(`${baseURL}/auth?next=${encodeURIComponent('//evil.com')}`);
    await page.getByTestId('email-input').fill('client1@test.namlend.com');
    await page.getByTestId('password-input').fill(PASSWORD);
    await page.getByTestId('login-button').click();

    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30000 });
    expect(new URL(page.url()).origin).toBe(new URL(baseURL).origin);
  });

  test('a legitimate next is still honoured', async ({ page }) => {
    await page.goto(`${baseURL}/auth?next=${encodeURIComponent('/kyc')}`);
    await page.getByTestId('email-input').fill('client1@test.namlend.com');
    await page.getByTestId('password-input').fill(PASSWORD);
    await page.getByTestId('login-button').click();

    await page.waitForURL(/\/kyc/, { timeout: 30000 });
  });
});

test.describe('Google sign-in button', () => {
  test('is hidden on both login and signup while the deployment has no credentials', async ({
    page,
  }) => {
    // Mirrors the rollout state: AUTH_GOOGLE_ID unset ⇒ authProviders.listEnabled
    // reports google:false ⇒ the button must not render anywhere.
    await page.goto(`${baseURL}/auth`);
    await page.getByTestId('email-input').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.getByTestId('google-signin-button')).toHaveCount(0);

    await page.getByRole('button', { name: /create one/i }).click();
    await page.getByPlaceholder('ID Number').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByTestId('google-signin-button')).toHaveCount(0);
  });
});
