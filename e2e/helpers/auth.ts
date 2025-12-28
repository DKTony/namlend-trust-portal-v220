import { Page, expect } from '@playwright/test';

export const baseURL = process.env.BASE_URL || 'http://localhost:8080';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.namlend.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'test123';
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL || 'client1@test.namlend.com';
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD || 'test123';

export async function login(page: Page, preferAdmin: boolean = true): Promise<'admin'|'client'> {
  await page.goto(`${baseURL}/auth`);
  // Wait for DOM to be ready (avoid networkidle which can hang on websockets)
  await page.waitForLoadState('domcontentloaded');
  
  // Ensure Sign In tab is active
  try { await page.getByRole('tab', { name: /Sign In/i }).click(); } catch {}

  const candidates = preferAdmin 
    ? [{ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const }, { email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const }]
    : [{ email: CLIENT_EMAIL, password: CLIENT_PASSWORD, role: 'client' as const }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' as const }];

  for (const c of candidates) {
    // Wait for email input to be visible
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill(c.email);
    
    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(c.password);

    // Click sign in button
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Wait for navigation to dashboard or admin, or detect auth error
    const outcome = await Promise.race<"success"|"error"|"timeout">([
      page.waitForURL(/\/(admin|dashboard)/, { timeout: 20000 }).then(() => 'success').catch(() => 'timeout'),
      page.getByText(/invalid credentials|invalid_email|login failed/i).first().waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error').catch(() => 'none' as any)
    ]);

    if (outcome === 'success') {
      return c.role;
    }

    // If error or timeout, try next candidate by reloading auth page
    await page.goto(`${baseURL}/auth`);
    await page.waitForLoadState('domcontentloaded');
    try { await page.getByRole('tab', { name: /Sign In/i }).click(); } catch {}
  }

  const currentUrl = page.url();
  throw new Error(`E2E login failed for admin and client. Current URL: ${currentUrl}. Ensure credentials exist in Supabase and environment is configured.`);
}
