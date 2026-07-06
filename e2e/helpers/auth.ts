import { Page, expect, BrowserContext } from '@playwright/test';

export const baseURL = process.env.BASE_URL || 'http://localhost:8080';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Test1234!';
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client1@test.namlend.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'Test1234!';
// Dedicated pure platform_owner (tenant role = client) seeded by seedPlatformOwnerForE2E.
const PLATFORM_OWNER_EMAIL =
  process.env.E2E_PLATFORM_OWNER_EMAIL || 'platformowner@test.namlend.com';
const PLATFORM_OWNER_PASSWORD = process.env.E2E_PLATFORM_OWNER_PASSWORD || 'Test1234!';

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

export async function waitForAppShell(page: Page, timeout = 20000): Promise<void> {
  const shellSelectors = [
    '[data-testid="sidebar-trigger"]',
    '[data-testid="sidebar-desktop"]',
    '[data-testid="sidebar-rail"]',
    '[data-testid="admin-sidebar-desktop"]',
    '[data-testid="admin-sidebar-rail"]',
    '[data-testid="platform-console-shell"]',
  ];
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    for (const selector of shellSelectors) {
      const shell = page.locator(selector).first();
      if (await shell.isVisible({ timeout: 300 }).catch(() => false)) {
        return;
      }
    }
    await page.waitForTimeout(100);
  }

  throw new Error(`Timed out waiting for adaptive app shell at ${page.url()}`);
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
      // Wait for app shell to render (drawer trigger, rail, or permanent sidebar).
      await waitForAppShell(page, 20000);
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
 * Log in as the dedicated platform owner (pure platform_owner; tenant role = client), seeded by
 * convex/seed.ts::seedPlatformOwnerForE2E. A client-role identity lands on /dashboard after login;
 * the caller then navigates to /platform and waits for the platform console shell.
 */
export async function loginAsPlatformOwner(page: Page): Promise<void> {
  await page.goto(`${baseURL}/auth`);
  await page.waitForLoadState('domcontentloaded');
  await waitForLoginForm(page);

  await page.getByTestId('email-input').fill(PLATFORM_OWNER_EMAIL);
  await page.getByTestId('password-input').fill(PLATFORM_OWNER_PASSWORD);
  await page.getByTestId('login-button').click();

  const outcome = await Promise.race<'success' | 'error'>([
    page
      .waitForURL(/\/(admin|dashboard)/, { timeout: 30000 })
      .then(() => 'success' as const)
      .catch(() => 'error' as const),
    page
      .getByText(
        /invalid credentials|invalid_email|login failed|login error|session timeout|no account found|incorrect password/i
      )
      .first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => 'error' as const)
      .catch(() => 'error' as const),
  ]);

  if (outcome !== 'success') {
    throw new Error(
      `Platform owner login failed for ${PLATFORM_OWNER_EMAIL}. Current URL: ${page.url()}. ` +
        `Ensure the platform owner is seeded (npx convex run seed:seedTestUsers).`
    );
  }
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
  const targetPath = path.split('?')[0];

  const waitStart = Date.now();
  let authSeenAt: number | null = null;
  while (Date.now() - waitStart < timeout) {
    const currentUrl = new URL(page.url());
    const currentPath = currentUrl.pathname;

    // If redirected to /auth, the session may be expired — but the app also
    // bounces through /auth transiently while the Convex session hydrates.
    // Only treat it as expired when we STAY on /auth. Check the pathname
    // instead of the full URL so /auth?redirect=/dashboard is not treated as
    // /dashboard.
    if (currentPath === '/auth') {
      authSeenAt ??= Date.now();
      if (Date.now() - authSeenAt > 8000) {
        throw new Error(
          `Session expired — redirected to /auth after navigation to ${path}. Re-login required.`
        );
      }
      await page.waitForTimeout(200);
      continue;
    }
    authSeenAt = null;

    // If we're on the target path, check for app shell
    if (currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)) {
      try {
        await waitForAppShell(page, 3000);
        return;
      } catch {
        await page.waitForTimeout(200);
      }
    }

    await page.waitForTimeout(200);
  }

  throw new Error(`Timeout waiting for authenticated page ${path}`);
}
