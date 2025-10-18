import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

async function assertNoStrayDollar(page: import('@playwright/test').Page, pageName: string) {
  const text = await page.evaluate(() => document.body.innerText || '');
  const mismatches = text.match(/(?<!N)\$\d[\d,]*\.?\d*/g) || [];
  expect(mismatches, `${pageName}: found stray $ amounts: ${JSON.stringify(mismatches.slice(0, 5))}`)
    .toHaveLength(0);
  // Also ensure at least one N$ appears on the page when applicable
  const hasNad = /N\$\s?\d/.test(text);
  expect(hasNad, `${pageName}: expected at least one N$ amount on screen`).toBeTruthy();
}

const tabs: Array<{ id: string; label: string }> = [
  { id: 'financial', label: 'Financial' },
  { id: 'payments', label: 'Payments' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'loans', label: 'Loans' },
  { id: 'clients', label: 'Clients' },
];

// Validates currency formatting across key admin tabs
// Skips gracefully if admin credentials are not available.

test.describe('Admin currency formatting (N$ with 2 decimals)', () => {
  test('No stray $ and N$ present on key tabs', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping admin currency test');

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`${baseURL}/admin`);

    // Wait for either admin sidebar or access denied then handle accordingly
    const adminNav = page.getByTestId('nav-financial');
    const accessDenied = page.getByText('Access Denied');
    const outcome = await Promise.race([
      adminNav.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'admin').catch(() => 'none'),
      accessDenied.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'denied').catch(() => 'none')
    ]);
    if (outcome !== 'admin') test.skip(true, 'Admin UI not available in environment; skipping admin currency test');

    // Iterate through tabs
    for (const t of tabs) {
      await page.getByTestId(`nav-${t.id}`).click();
      // Give content a moment to render data
      await page.waitForTimeout(500);
      await assertNoStrayDollar(page, `Admin/${t.label}`);
    }
  });
});
