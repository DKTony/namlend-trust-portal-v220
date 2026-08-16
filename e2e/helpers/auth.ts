import { Page } from '@playwright/test';

export const baseURL = process.env.BASE_URL || 'http://localhost:8080';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Test1234!';
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client1@test.namlend.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'Test1234!';
// Dedicated pure platform_owner (tenant role = client) seeded by seedPlatformOwnerForE2E.
const PLATFORM_OWNER_EMAIL =
  process.env.E2E_PLATFORM_OWNER_EMAIL || 'platformowner@test.namlend.com';
const PLATFORM_OWNER_PASSWORD = process.env.E2E_PLATFORM_OWNER_PASSWORD || 'Test1234!';

export const AUTH_FAILURE_TOAST =
  /login failed|no account found|incorrect password|login error|invalid credentials|invalid_email|session timeout/i;

async function readLoginDiagnostics(page: Page): Promise<{
  url: string;
  toasts: string;
  viteConvexUrl: string;
}> {
  const url = page.url();
  const toasts = (await page.locator('[role="status"], [role="alert"]').allInnerTexts())
    .map((text) => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' || ');
  let viteConvexUrl = 'unavailable';
  try {
    viteConvexUrl = await page.evaluate(() => {
      const fromForm = document
        .querySelector('[data-testid="email-input"]')
        ?.closest('form')
        ?.getAttribute('data-e2e-convex-url');
      return fromForm || 'unset';
    });
  } catch {
    viteConvexUrl = 'evaluate-failed';
  }
  return { url, toasts: toasts || '(none)', viteConvexUrl };
}

function formatLoginFailure(
  kind: 'timeout' | 'toast',
  email: string,
  diag: { url: string; toasts: string; viteConvexUrl: string }
): string {
  return (
    `E2E login ${kind} for ${email}. URL=${diag.url}; ` +
    `VITE_CONVEX_URL=${diag.viteConvexUrl}; toasts=${diag.toasts}`
  );
}

export async function waitForLoginForm(page: Page): Promise<void> {
  const emailInput = page.getByTestId('email-input');
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    return;
  } catch {}

  const backToSignIn = page.getByRole('button', { name: /back to sign in/i });
  if (await backToSignIn.count()) {
    await backToSignIn.first().click({ timeout: 2000 });
  }

  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
}

/**
 * Sign out through the UI and wait until the session is actually gone.
 *
 * Clicking `sidebar-signout` and immediately calling `login()` does not work: sign-out
 * is asynchronous, so the subsequent `goto('/auth')` lands while the old session is
 * still valid and `/auth` bounces the still-authenticated user straight back to their
 * dashboard — the login form never appears. Waiting for the auth page is what makes a
 * user switch deterministic.
 */
export async function signOutViaUI(page: Page): Promise<void> {
  const signOut = page.getByTestId('sidebar-signout');
  try {
    await signOut.click({ timeout: 5_000 });
  } catch {
    await signOut.click({ force: true, timeout: 5_000 });
  }
  await page.waitForURL(/\/auth(\?|$)/, { timeout: 20000 });
  await waitForLoginForm(page);
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

/**
 * Sign in with the seeded admin/client credentials.
 *
 * `next` opts into the deep-link flow: the auth page is opened as `/auth?next=…`, exactly as a
 * route guard would redirect there, so the post-login redirect is exercised end to end.
 */
export async function login(
  page: Page,
  preferAdmin: boolean = true,
  next?: string
): Promise<'admin' | 'client'> {
  const authUrl = next ? `${baseURL}/auth?next=${encodeURIComponent(next)}` : `${baseURL}/auth`;

  await page.goto(authUrl);
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

  const failures: string[] = [];

  for (const c of candidates) {
    await waitForLoginForm(page);
    const emailInput = page.getByTestId('email-input');
    await emailInput.fill(c.email);

    const passwordInput = page.getByTestId('password-input');
    await passwordInput.fill(c.password);

    await page.getByTestId('login-button').click();

    const outcome = await Promise.race<'success' | 'error' | 'timeout'>([
      page
        .waitForURL(/\/(admin|dashboard|platform)/, { timeout: 30000 })
        .then(() => 'success' as const)
        .catch(() => 'timeout' as const),
      page
        .getByText(AUTH_FAILURE_TOAST)
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'error' as const)
        .catch(() => 'none' as unknown as 'timeout'),
    ]);

    if (outcome === 'success') {
      await waitForAppShell(page, 20000);
      return c.role;
    }

    const kind = outcome === 'error' ? 'toast' : 'timeout';
    failures.push(formatLoginFailure(kind, c.email, await readLoginDiagnostics(page)));

    await page.goto(authUrl);
    await page.waitForLoadState('domcontentloaded');
    await waitForLoginForm(page);
  }

  throw new Error(
    `E2E login failed for admin and client. ${failures.join(' | ')}. ` +
      'Ensure test users are seeded in Convex (npx convex run seed:seedTestUsers).'
  );
}

/**
 * Log in as the dedicated platform owner (pure platform_owner; tenant role = client), seeded by
 * convex/seed.ts::seedPlatformOwnerForE2E. The platform plane takes precedence over the tenant
 * role, so this identity lands directly on /platform even though its tenant role is `client`.
 */
export async function loginAsPlatformOwner(page: Page): Promise<void> {
  await page.goto(`${baseURL}/auth`);
  await page.waitForLoadState('domcontentloaded');
  await waitForLoginForm(page);

  await page.getByTestId('email-input').fill(PLATFORM_OWNER_EMAIL);
  await page.getByTestId('password-input').fill(PLATFORM_OWNER_PASSWORD);
  await page.getByTestId('login-button').click();

  const outcome = await Promise.race<'success' | 'error' | 'timeout'>([
    page
      .waitForURL(/\/platform/, { timeout: 30000 })
      .then(() => 'success' as const)
      .catch(() => 'timeout' as const),
    page
      .getByText(AUTH_FAILURE_TOAST)
      .first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => 'error' as const)
      .catch(() => 'none' as unknown as 'timeout'),
  ]);

  if (outcome !== 'success') {
    const kind = outcome === 'error' ? 'toast' : 'timeout';
    throw new Error(
      `Platform owner login failed for ${PLATFORM_OWNER_EMAIL}. ` +
        `${formatLoginFailure(kind, PLATFORM_OWNER_EMAIL, await readLoginDiagnostics(page))}. ` +
        'Ensure the platform owner is seeded (npx convex run seed:seedTestUsers).'
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
