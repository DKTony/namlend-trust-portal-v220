/**
 * Admin Portal E2E Tests
 * Tests the new route-based admin portal with grouped sidebar navigation.
 * Covers: routing, navigation, deep-linking, role gating, and all feature pages.
 */

import 'dotenv/config';
import { test, expect, Page } from '@playwright/test';
import { login, waitForAppShell } from './helpers/auth';
import { ensureAdminReady, openAdminTab } from './helpers/admin';

const VIEWPORT = { width: 1280, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

// ─── Helper: verify a page loaded by checking for visible content ───
async function expectPageContent(page: Page) {
  // Wait for lazy-loaded content (the Suspense spinner should disappear)
  const spinner = page.locator('.animate-spin');
  await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  // Content area should have something visible
  const main = page.locator('main');
  await expect(main).toBeVisible({ timeout: 10000 });
}

// ─────────────────────────────────────────────────────
// 1. Routing & Navigation
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Routing', () => {
  test('/ admin redirects to /admin/overview', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);

    await ensureAdminReady(page);
    await expect(page).toHaveURL(/\/admin\/overview/);
  });

  test('Browser back/forward works between admin pages', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    // Navigate: overview → loans → clients
    await openAdminTab(page, 'loans');
    await expect(page).toHaveURL(/\/admin\/loans/);

    await openAdminTab(page, 'clients');
    await expect(page).toHaveURL(/\/admin\/clients/);

    // Go back → should be loans
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/loans/);

    // Go forward → should be clients
    await page.goForward();
    await expect(page).toHaveURL(/\/admin\/clients/);
  });

  test('Deep link to /admin/payments loads correctly', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);

    await page.goto('/admin/payments');
    await ensureAdminReady(page);
    await expect(page).toHaveURL(/\/admin\/payments/);
    await expectPageContent(page);
  });

  test('Deep link to /admin/settings/credit-policy loads correctly', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);

    await page.goto('/admin/settings/credit-policy');
    await ensureAdminReady(page);
    await expect(page).toHaveURL(/\/admin\/settings\/credit-policy/);
    await expectPageContent(page);
  });
});

// ─────────────────────────────────────────────────────
// 2. Sidebar Navigation & Groups
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Sidebar', () => {
  test('Desktop sidebar shows grouped navigation for admin', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await expect(page.getByTestId('admin-sidebar-desktop')).toBeVisible();

    // Check key nav items exist from different groups
    await expect(page.getByTestId('sidebar-nav-overview')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-loans')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-users')).toBeVisible();
    // Tenant admin items
    await expect(page.getByTestId('sidebar-nav-analytics')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-mandates')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-consent')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-credit-policy')).toBeVisible();
  });

  test('Sidebar closes after navigation', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(MOBILE_VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'loans');
    // Backdrop uses opacity-0 + pointer-events-none when closed (CSS transition).
    // Check that it's not interactive rather than DOM hidden.
    await expect(page.getByTestId('sidebar-backdrop')).toHaveCSS('pointer-events', 'none');
  });
});

// ─────────────────────────────────────────────────────
// 3. Role Gating — Loan Officer
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Loan Officer Role', () => {
  test('Loan officer cannot see admin-only sidebar items', async ({ page }) => {
    // Login as loan officer
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.getByTestId('email-input');
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });
    await emailInput.fill('loan_officer@test.namlend.com');
    await page.getByTestId('password-input').fill('Test1234!');
    await page.getByTestId('login-button').click();

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForURL(/\/admin/, { timeout: 30000 });
    await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 30000 });

    // Open sidebar
    await page.getByTestId('sidebar-trigger').click();
    await page.getByTestId('sidebar-drawer').waitFor({ state: 'visible', timeout: 5000 });

    // Operations items should be visible
    await expect(page.getByTestId('sidebar-nav-loans')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav-payments')).toBeVisible();

    // Admin-only items should NOT be visible
    await expect(page.getByTestId('sidebar-nav-users')).toBeHidden();
    await expect(page.getByTestId('sidebar-nav-batch')).toBeHidden();
    await expect(page.getByTestId('sidebar-nav-analytics')).toBeHidden();
    await expect(page.getByTestId('sidebar-nav-institutions')).toBeHidden();
    await expect(page.getByTestId('sidebar-nav-mandates')).toBeHidden();
    await expect(page.getByTestId('sidebar-nav-credit-policy')).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────
// 4. Operations Pages (loan_officer+ access)
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Operations Pages', () => {
  test('Overview page shows financial summary', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'overview');
    await expect(page).toHaveURL(/\/admin\/overview/);
    await expectPageContent(page);
  });

  test('Loans page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'loans');
    await expect(page).toHaveURL(/\/admin\/loans/);
    await expectPageContent(page);
  });

  test('Clients page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'clients');
    await expect(page).toHaveURL(/\/admin\/clients/);
    await expectPageContent(page);
  });

  test('Payments page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'payments');
    await expect(page).toHaveURL(/\/admin\/payments/);
    await expectPageContent(page);
  });

  test('Approvals page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'approvals');
    await expect(page).toHaveURL(/\/admin\/approvals/);
    await expectPageContent(page);
  });

  test('Collections page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'collections');
    await expect(page).toHaveURL(/\/admin\/collections/);
    await expectPageContent(page);
  });

  test('IPP Onboarding page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'ipp-onboarding');
    await expect(page).toHaveURL(/\/admin\/ipp-onboarding/);
    await expectPageContent(page);
  });

  test('Batch Operations page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'batch');
    await expect(page).toHaveURL(/\/admin\/batch/);
    await expectPageContent(page);
  });

  test('User Management page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expectPageContent(page);
  });
});

// ─────────────────────────────────────────────────────
// 5. Finance & Ledger Pages (admin only)
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Finance & Ledger', () => {
  test('Analytics page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'analytics');
    await expect(page).toHaveURL(/\/admin\/analytics/);
    await expectPageContent(page);
  });

  test('TigerBeetle Ledger page loads', async ({ page }) => {
    test.skip(true, 'TigerBeetle Ledger is platform/control-plane UI, not tenant /admin UI');
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'ledger');
    await expect(page).toHaveURL(/\/admin\/ledger/);
    await expectPageContent(page);
  });

  test('Reconciliation page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'reconciliation');
    await expect(page).toHaveURL(/\/admin\/reconciliation/);
    await expectPageContent(page);
  });
});

// ─────────────────────────────────────────────────────
// 6. Platform / Ontology Pages (admin only)
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Platform / Ontology', () => {
  test('Institutions page loads', async ({ page }) => {
    test.skip(true, 'Institutions moved to the Platform Console');
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'institutions');
    await expect(page).toHaveURL(/\/admin\/institutions/);
    await expectPageContent(page);
  });

  test('Products page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'products');
    await expect(page).toHaveURL(/\/admin\/products/);
    await expectPageContent(page);
  });

  test('Payment Rails page loads', async ({ page }) => {
    test.skip(true, 'Payment Rails moved to the Platform Console');
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'payment-rails');
    await expect(page).toHaveURL(/\/admin\/payment-rails/);
    await expectPageContent(page);
  });

  test('Business Rules page loads', async ({ page }) => {
    test.skip(true, 'Business Rules guardrails moved to the Platform Console');
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'business-rules');
    await expect(page).toHaveURL(/\/admin\/business-rules/);
    await expectPageContent(page);
  });

  test('Workflows page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'workflows');
    await expect(page).toHaveURL(/\/admin\/workflows/);
    await expectPageContent(page);
  });

  test('Mandates page loads with table or empty state', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'mandates');
    await expect(page).toHaveURL(/\/admin\/mandates/);
    await expectPageContent(page);

    // Should show either a table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/No mandates found/i);
    const hasContent = await Promise.race([
      table
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false),
      emptyState
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBe(true);
  });

  test('POPIA Consent page loads with table or empty state', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'consent');
    await expect(page).toHaveURL(/\/admin\/consent/);
    await expectPageContent(page);

    // Should show either a table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/No consent records found/i);
    const hasContent = await Promise.race([
      table
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false),
      emptyState
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => true)
        .catch(() => false),
    ]);
    expect(hasContent).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// 7. Settings Pages (admin only)
// ─────────────────────────────────────────────────────

test.describe('Admin Portal — Settings', () => {
  test('Credit Policy settings page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'credit-policy');
    await expect(page).toHaveURL(/\/admin\/settings\/credit-policy/);
    await expectPageContent(page);
  });

  test('TigerBeetle Config page loads', async ({ page }) => {
    test.skip(true, 'TigerBeetle Config moved to the Platform Console');
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'tigerbeetle-config');
    await expect(page).toHaveURL(/\/admin\/settings\/tigerbeetle/);
    await expectPageContent(page);
  });

  test('Settlement Config page loads', async ({ page }) => {
    test.skip(true, 'Settlement Config moved to the Platform Console');
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'settlement-config');
    await expect(page).toHaveURL(/\/admin\/settings\/settlement/);
    await expectPageContent(page);
  });

  test('Branding Config page loads', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available');
    await page.setViewportSize(VIEWPORT);
    await ensureAdminReady(page);

    await openAdminTab(page, 'branding');
    await expect(page).toHaveURL(/\/admin\/settings\/branding/);
    await expectPageContent(page);
  });
});

// ─────────────────────────────────────────────────────
// 8. Client Dashboard Unaffected
// ─────────────────────────────────────────────────────

test.describe('Client Dashboard — Unaffected', () => {
  test('Client dashboard still works at /dashboard', async ({ page }) => {
    const role = await login(page, false);
    if (role !== 'client') test.skip(true, 'Client credentials not available');
    await page.setViewportSize(VIEWPORT);

    await expect(page).toHaveURL(/\/dashboard/);
    await waitForAppShell(page, 20000);

    // Client should NOT see admin nav items
    await expect(page.getByTestId('sidebar-nav-analytics')).toHaveCount(0);
    await expect(page.getByTestId('sidebar-nav-institutions')).toHaveCount(0);
  });
});
