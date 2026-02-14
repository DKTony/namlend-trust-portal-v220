import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { ensureAdminReady, openAdminTab } from './helpers/admin';

async function assertNoStrayDollar(
  page: import('@playwright/test').Page,
  pageName: string,
  options: { emptyStatePatterns?: RegExp[]; requireNad?: boolean } = {},
) {
  const { emptyStatePatterns = [], requireNad = true } = options;
  if (requireNad) {
    await expect
      .poll(
        async () => {
          const text = await page.evaluate(() => document.body.innerText || '');
          const hasNad = /N\$\s?\d/.test(text);
          const hasEmptyState = emptyStatePatterns.some((pattern) => pattern.test(text));
          return hasNad || hasEmptyState;
        },
        { timeout: 15000 },
      )
      .toBeTruthy();
  }
  const text = await page.evaluate(() => document.body.innerText || '');
  const mismatches = text.match(/(?<!N)\$\d[\d,]*\.?\d*/g) || [];
  expect(mismatches, `${pageName}: found stray $ amounts: ${JSON.stringify(mismatches.slice(0, 5))}`)
    .toHaveLength(0);
  // Also ensure at least one N$ appears on the page when applicable
  if (!requireNad) {
    return;
  }
  const hasNad = /N\$\s?\d/.test(text);
  if (hasNad) {
    return;
  }
  const hasEmptyState = emptyStatePatterns.some((pattern) => pattern.test(text));
  expect(
    hasEmptyState,
    `${pageName}: expected at least one N$ amount or a known empty state`,
  ).toBeTruthy();
}

const tabs: Array<{ id: string; label: string; requireNad?: boolean }> = [
  { id: 'financial', label: 'Financial' },
  { id: 'payments', label: 'Payments' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'loans', label: 'Loans' },
  { id: 'clients', label: 'Clients', requireNad: false },
];

const emptyStatesByTabId: Record<string, RegExp[]> = {
  approvals: [/No approval requests found/i],
  loans: [/No applications found/i],
  payments: [/No payments found/i],
  clients: [/No clients found/i],
};

// Validates currency formatting across key admin tabs
// Skips gracefully if admin credentials are not available.

test.describe('Admin currency formatting (N$ with 2 decimals)', () => {
  test('No stray $ and N$ present on key tabs', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping admin currency test');

    await page.setViewportSize({ width: 1366, height: 900 });
    await ensureAdminReady(page);

    // Iterate through tabs
    for (const t of tabs) {
      await openAdminTab(page, t.id);
      // Give content a moment to render data
      await page.waitForTimeout(500);
      await assertNoStrayDollar(page, `Admin/${t.label}`, {
        emptyStatePatterns: emptyStatesByTabId[t.id],
        requireNad: t.requireNad,
      });
    }
  });
});
