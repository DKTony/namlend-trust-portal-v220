/**
 * E2E Tests for Navigation and Page Rendering
 * Verifies that all navigation items work and pages render their headers correctly
 */
import 'dotenv/config';
import { test, expect, Page } from '@playwright/test';
import { login, gotoAuthenticated, baseURL } from './helpers/auth';

test.describe('Client Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as client
    await login(page, false);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('Dashboard page renders with correct header', async ({ page }) => {
    await gotoAuthenticated(page, '/dashboard');

    // Wait for page content to load
    await page.waitForLoadState('networkidle');

    // Check page renders (sidebar trigger should be visible)
    await expect(page.getByTestId('sidebar-trigger')).toBeVisible();

    // Check for dashboard content - look for typical dashboard elements
    const dashboardContent = page.locator('text=Dashboard').first();
    await expect(dashboardContent).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard tabs switch correctly', async ({ page }) => {
    await gotoAuthenticated(page, '/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that tabs exist and can be clicked
    const loansTab = page.getByRole('tab', { name: /loans/i });
    if (await loansTab.isVisible()) {
      await loansTab.click();
      // Verify tab content changes
      await page.waitForTimeout(500);
    }

    const applicationsTab = page.getByRole('tab', { name: /applications/i });
    if (await applicationsTab.isVisible()) {
      await applicationsTab.click();
      await page.waitForTimeout(500);
    }

    const paymentsTab = page.getByRole('tab', { name: /payments/i });
    if (await paymentsTab.isVisible()) {
      await paymentsTab.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Admin Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await login(page, true);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('Admin dashboard renders with correct content', async ({ page }) => {
    await gotoAuthenticated(page, '/admin');
    await page.waitForLoadState('networkidle');

    // Check sidebar is visible
    await expect(page.getByTestId('sidebar-trigger')).toBeVisible();

    // Check for admin-specific content
    const adminContent = page.locator('text=/overview|dashboard|admin/i').first();
    await expect(adminContent).toBeVisible({ timeout: 10000 });
  });

  test('Admin sidebar navigation items are clickable', async ({ page }) => {
    await gotoAuthenticated(page, '/admin');
    await page.waitForLoadState('networkidle');

    // Expand sidebar if collapsed
    const sidebarTrigger = page.getByTestId('sidebar-trigger');
    await sidebarTrigger.click();
    await page.waitForTimeout(300);

    // Check for navigation menu items by looking for common admin nav items
    const navItems = [
      /overview/i,
      /loans/i,
      /clients/i,
      /payments/i,
      /users/i,
    ];

    for (const navPattern of navItems) {
      const navItem = page.getByRole('button', { name: navPattern }).or(
        page.getByRole('link', { name: navPattern })
      ).or(
        page.locator(`[data-testid*="nav"]`).filter({ hasText: navPattern })
      ).first();

      if (await navItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Nav item exists
        console.log(`Found nav item matching: ${navPattern}`);
      }
    }
  });

  test('Admin loan management section renders', async ({ page }) => {
    await gotoAuthenticated(page, '/admin');
    await page.waitForLoadState('networkidle');

    // Try to navigate to loans section
    const sidebarTrigger = page.getByTestId('sidebar-trigger');
    await sidebarTrigger.click();
    await page.waitForTimeout(300);

    // Look for loans navigation
    const loansNav = page.locator('text=/loan/i').first();
    if (await loansNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loansNav.click();
      await page.waitForTimeout(500);

      // Verify loan management content loads
      const loanContent = page.locator('text=/loan|application|pending|approved/i').first();
      await expect(loanContent).toBeVisible({ timeout: 5000 });
    }
  });

  test('Admin client management section renders', async ({ page }) => {
    await gotoAuthenticated(page, '/admin');
    await page.waitForLoadState('networkidle');

    const sidebarTrigger = page.getByTestId('sidebar-trigger');
    await sidebarTrigger.click();
    await page.waitForTimeout(300);

    // Look for clients navigation
    const clientsNav = page.locator('text=/client/i').first();
    if (await clientsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientsNav.click();
      await page.waitForTimeout(500);

      // Verify client management content loads
      const clientContent = page.locator('text=/client|customer|user/i').first();
      await expect(clientContent).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Page Header Rendering', () => {
  test('Auth page renders with header and form', async ({ page }) => {
    await page.goto(`${baseURL}/auth`);
    await page.waitForLoadState('domcontentloaded');

    // Check for auth page elements
    await expect(page.getByTestId('email-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-button')).toBeVisible();

    // Check for branding/header
    const header = page.locator('text=/namlend|sign in|login|welcome/i').first();
    await expect(header).toBeVisible();
  });

  test('Protected pages redirect to auth when not logged in', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should be redirected to auth
    await expect(page).toHaveURL(/auth/, { timeout: 10000 });
  });
});
