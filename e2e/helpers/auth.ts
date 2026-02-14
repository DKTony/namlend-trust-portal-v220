import { Page, expect, BrowserContext } from '@playwright/test';

export const baseURL = process.env.BASE_URL || 'http://localhost:8080';

// Supabase storage key must match the app's client configuration
const SUPABASE_STORAGE_KEY = 'namlend-auth';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'test123';
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client1@test.namlend.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'test123';

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

export async function login(page: Page, preferAdmin: boolean = true): Promise<'admin'|'client'> {
  await page.goto(`${baseURL}/auth`);
  // Wait for DOM to be ready (avoid networkidle which can hang on websockets)
  await page.waitForLoadState('domcontentloaded');
  
  // Ensure the login form is visible; auth page does not use tabs.
  await waitForLoginForm(page);

  const candidates = preferAdmin 
    ? [{ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const }, { email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const }]
    : [{ email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const }];

  for (const c of candidates) {
    await waitForLoginForm(page);
    const emailInput = page.getByTestId('email-input');
    await emailInput.fill(c.email);
    
    // Fill password
    const passwordInput = page.getByTestId('password-input');
    await passwordInput.fill(c.password);

    // Click sign in button
    await page.getByTestId('login-button').click();

    // Wait for navigation to dashboard or admin, or detect auth error
    const outcome = await Promise.race<"success"|"error"|"timeout">([
      page.waitForURL(/\/(admin|dashboard)/, { timeout: 30000 }).then(() => 'success').catch(() => 'timeout'),
      page.getByText(/invalid credentials|invalid_email|login failed|login error|session timeout/i)
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'error')
        .catch(() => 'none' as any)
    ]);

    if (outcome === 'success') {
      await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 20000 });
      
      // Wait for session to be persisted to localStorage before returning
      // This ensures subsequent page.goto() calls will have the session available
      await page.waitForFunction(
        (key) => {
          const stored = window.localStorage.getItem(key);
          return stored && stored.includes('access_token');
        },
        SUPABASE_STORAGE_KEY,
        { timeout: 5000 }
      ).catch(() => {
        console.warn('Session may not be persisted to localStorage');
      });
      
      return c.role;
    }

    // If error or timeout, try next candidate by reloading auth page
    await page.goto(`${baseURL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    await waitForLoginForm(page);
  }

  const currentUrl = page.url();
  throw new Error(`E2E login failed for admin and client. Current URL: ${currentUrl}. Ensure credentials exist in Supabase and environment is configured.`);
}

/**
 * Navigate to a protected route with session injection.
 * Captures the current session and re-injects it before navigation to prevent session loss.
 */
export async function gotoAuthenticated(page: Page, path: string, options?: { timeout?: number }): Promise<void> {
  const timeout = options?.timeout ?? 20000;
  
  // Capture the current session from localStorage before navigation
  const sessionData = await page.evaluate((key) => {
    return window.localStorage.getItem(key);
  }, SUPABASE_STORAGE_KEY);
  
  if (!sessionData) {
    throw new Error('No session found in localStorage before navigation');
  }
  
  // Add init script to inject session BEFORE the app loads
  await page.addInitScript((args) => {
    const { key, data } = args;
    window.localStorage.setItem(key, data);
  }, { key: SUPABASE_STORAGE_KEY, data: sessionData });
  
  // Now navigate - the session will be available immediately
  await page.goto(`${baseURL}${path}`);
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for page to stabilize
  const waitStart = Date.now();
  while (Date.now() - waitStart < timeout) {
    const currentUrl = page.url();
    
    // If we're on the target path, check for app shell
    if (currentUrl.includes(path.replace(/^\//, ''))) {
      const sidebar = page.getByTestId('sidebar-trigger');
      try {
        await sidebar.waitFor({ state: 'visible', timeout: 3000 });
        return; // Success
      } catch {
        await page.waitForTimeout(200);
      }
    }
    
    // If redirected to /auth, session injection failed
    if (currentUrl.includes('/auth')) {
      throw new Error(`Session injection failed - redirected to /auth after navigation to ${path}`);
    }
    
    await page.waitForTimeout(200);
  }
  
  throw new Error(`Timeout waiting for authenticated page ${path}`);
}
