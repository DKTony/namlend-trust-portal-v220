import { Page, expect, BrowserContext } from '@playwright/test';

export const baseURL = process.env.BASE_URL || 'http://localhost:8080';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Test1234!';
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client1@test.namlend.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'Test1234!';

async function waitForLoginForm(page: Page): Promise<void> {
  const emailInput = page.getByTestId('email-input');
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    return;
  } catch {}

  const backToSignIn = page.getByRole('button', { name: /back to sign in/i });
  if (await backToSignIn.count()) {
    await backToSignIn.first().click({ timeout: 2000 });
  }

  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
}

export async function login(page: Page, preferAdmin: boolean = true): Promise<'admin' | 'client'> {
  await page.goto(`${baseURL}/auth`);
  await page.waitForLoadState('domcontentloaded');

  await waitForLoginForm(page);

  const candidates = preferAdmin
    ? [
        { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const },
        { email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const },
      ]
    : [
        { email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const },
        { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const },
      ];

  for (const c of candidates) {
    await waitForLoginForm(page);
    const emailInput = page.getByTestId('email-input');
    await emailInput.fill(c.email);

    const passwordInput = page.getByTestId('password-input');
    await passwordInput.fill(c.password);

    await page.getByTestId('login-button').click();

    // Wait for navigation to dashboard or admin, or detect auth error
    const outcome = await Promise.race<'success' | 'error' | 'timeout'>([
      page
        .waitForURL(/\/(admin|dashboard)/, { timeout: 30000 })
        .then(() => 'success')
        .catch(() => 'timeout'),
      page
        .getByText(
          /invalid credentials|invalid_email|login failed|login error|session timeout|no account found|incorrect password/i
        )
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'error')
        .catch(() => 'none' as any),
    ]);

    if (outcome === 'success') {
      // Wait for app shell to render (sidebar visible = authenticated)
      await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 20000 });
      return c.role;
    }

    // If error or timeout, try next candidate
    await page.goto(`${baseURL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await waitForLoginForm(page);
  }

  const currentUrl = page.url();
  throw new Error(
    `E2E login failed for admin and client. Current URL: ${currentUrl}. Ensure test users are seeded in Convex (npx convex run seed:seedTestUsers).`
  );
}

/**
 * Navigate to a protected route.
 * Convex Auth manages session via the ConvexReactClient — cookies/tokens
 * persist within the browser context, so no manual session injection needed.
 */
export async function gotoAuthenticated(
  page: Page,
  path: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 20000;

  await page.goto(`${baseURL}${path}`);
  await page.waitForLoadState('domcontentloaded');

  const waitStart = Date.now();
  while (Date.now() - waitStart < timeout) {
    const currentUrl = page.url();

    // If we're on the target path, check for app shell
    if (currentUrl.includes(path.replace(/^\//, ''))) {
      const sidebar = page.getByTestId('sidebar-trigger');
      try {
        await sidebar.waitFor({ state: 'visible', timeout: 3000 });
        return;
      } catch {
        await page.waitForTimeout(200);
      }
    }

    // If redirected to /auth, session expired — need to re-login
    if (currentUrl.includes('/auth')) {
      throw new Error(
        `Session expired — redirected to /auth after navigation to ${path}. Re-login required.`
      );
    }

    await page.waitForTimeout(200);
  }

  throw new Error(`Timeout waiting for authenticated page ${path}`);
}
