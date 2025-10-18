import { Page, expect } from '@playwright/test';

export const baseURL = process.env.BASE_URL || 'http://localhost:8080';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'anthnydklrk@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '123abc';
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client@namlend.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || '123abc';

export async function login(page: Page, preferAdmin: boolean = true): Promise<'admin'|'client'> {
  await page.goto(`${baseURL}/auth`);
  // Ensure Sign In tab is active
  try { await page.getByRole('tab', { name: /Sign In/i }).click(); } catch {}

  const candidates = preferAdmin 
    ? [{ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const }, { email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const }]
    : [{ email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const }];

  for (const c of candidates) {
    // Fill email
    try {
      await page.getByLabel('Email').fill(c.email);
    } catch {
      const emailLocator = page.locator('input[type="email"], input[name*="email" i]');
      await emailLocator.first().fill(c.email);
    }
    // Fill password
    try {
      await page.getByLabel('Password').fill(c.password);
    } catch {
      const pwLocator = page.locator('input[type="password"], input[name*="password" i]');
      await pwLocator.first().fill(c.password);
    }

    await page.getByRole('button', { name: /Sign In|Sign in|Log In|Log in/ }).click();

    // Wait for navigation to dashboard or admin, or detect auth error
    const outcome = await Promise.race<"success"|"error"|"timeout">([
      page.waitForURL(/\/(admin|dashboard)/, { timeout: 15000 }).then(() => 'success').catch(() => 'timeout'),
      page.getByText(/invalid credentials|invalid_email|login failed/i).first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error').catch(() => 'none' as any)
    ]);

    if (outcome === 'success') {
      return c.role;
    }

    // If error or timeout, try next candidate by reloading auth page
    await page.goto(`${baseURL}/auth`);
    try { await page.getByRole('tab', { name: /Sign In/i }).click(); } catch {}
  }

  const currentUrl = page.url();
  throw new Error(`E2E login failed for admin and client. Current URL: ${currentUrl}. Ensure credentials exist in Supabase and environment is configured.`);
}
