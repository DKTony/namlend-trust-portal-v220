/**
 * Budget Tracker E2E Tests
 *
 * Validates Add Funds dialog, Create Goal dialog, Export CSV, and Filter popover
 * on the BudgetTracker page. Uses mock data from financeService (no Supabase).
 *
 * Known mock data:
 * - 3 savings goals: Holiday Fund (8500/15000), New Laptop (4200/12000), Emergency Fund (32000/50000)
 * - 5 transactions: Salary (in), Groceries (out), Transport (out), Utilities (out), Loan (out)
 */

import 'dotenv/config';
import * as fs from 'fs';
import { test, expect, TEST_USERS } from './fixtures';
import { baseURL } from './helpers/auth';

const SUPABASE_STORAGE_KEY = 'namlend-auth';

async function waitForShell(page: import('@playwright/test').Page) {
  await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 20000 });
}

async function loginAsClient(page: import('@playwright/test').Page) {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
  await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL(/\/(dashboard|loans)/);
  await waitForShell(page);

  await page
    .waitForFunction(
      (key) => {
        const stored = window.localStorage.getItem(key);
        return stored && stored.includes('access_token');
      },
      SUPABASE_STORAGE_KEY,
      { timeout: 5000 }
    )
    .catch(() => {});
}

async function gotoWithAuth(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForTimeout(2000);

  if (page.url().includes('/auth')) {
    await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/(dashboard|admin|loans|payment|budget)/, { timeout: 20000 });
    await waitForShell(page);

    if (!page.url().includes(path.replace(/^\//, ''))) {
      await page.goto(path);
      await page.waitForTimeout(2000);
    }
  }

  try {
    await waitForShell(page);
  } catch {
    if (page.url().includes('/auth')) {
      await page.fill('[data-testid="email-input"]', TEST_USERS.client1.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.client1.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/(dashboard|admin|loans|payment|budget)/, { timeout: 20000 });
    }
  }
}

async function navigateToBudget(page: import('@playwright/test').Page) {
  await loginAsClient(page);
  await gotoWithAuth(page, '/budget');
  await page.getByTestId('budget-tracker-page').waitFor({ state: 'visible', timeout: 15000 });
}

// ─── ADD FUNDS DIALOG ────────────────────────────────

test.describe('BudgetTracker - Add Funds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Add Funds button opens dialog for the correct goal', async ({ page }) => {
    await navigateToBudget(page);

    // Click Add Funds on the first savings goal (Holiday Fund)
    await page.getByTestId('add-funds-btn-0').click();

    // Dialog should open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Dialog should reference the goal name
    await expect(modal).toContainText('Holiday Fund');

    // Amount input should be visible
    await expect(page.getByTestId('add-funds-amount-input')).toBeVisible();

    // Confirm button should be visible
    await expect(page.getByTestId('add-funds-confirm-btn')).toBeVisible();
  });

  test('Confirm button is disabled until valid amount is entered', async ({ page }) => {
    await navigateToBudget(page);
    await page.getByTestId('add-funds-btn-0').click();

    const confirmBtn = page.getByTestId('add-funds-confirm-btn');

    // Disabled with empty input
    await expect(confirmBtn).toBeDisabled();

    // Still disabled with zero
    await page.getByTestId('add-funds-amount-input').fill('0');
    await expect(confirmBtn).toBeDisabled();

    // Enabled with valid amount
    await page.getByTestId('add-funds-amount-input').fill('500');
    await expect(confirmBtn).toBeEnabled();
  });

  test('Adding funds closes dialog and updates the goal display', async ({ page }) => {
    await navigateToBudget(page);

    // Verify initial amount
    const goalCard = page.getByTestId('savings-goal-0');
    await expect(goalCard).toContainText('8,500');

    // Open Add Funds and submit
    await page.getByTestId('add-funds-btn-0').click();
    await page.getByTestId('add-funds-amount-input').fill('500');
    await page.getByTestId('add-funds-confirm-btn').click();

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Goal should show updated amount
    await expect(goalCard).toContainText('9,000');
  });

  test('Canceling Add Funds dialog preserves original state', async ({ page }) => {
    await navigateToBudget(page);

    await page.getByTestId('add-funds-btn-1').click();
    await page.getByTestId('add-funds-amount-input').fill('1000');

    // Click Cancel
    await page.locator('[role="dialog"] button:has-text("Cancel")').click();

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Goal 1 (New Laptop) should still show original amount
    const goalCard = page.getByTestId('savings-goal-1');
    await expect(goalCard).toContainText('4,200');
  });
});

// ─── CREATE SAVINGS GOAL DIALOG ──────────────────────

test.describe('BudgetTracker - Create Goal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('New Goal button opens create goal dialog', async ({ page }) => {
    await navigateToBudget(page);

    await page.getByTestId('add-savings-goal').click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toContainText('Create Savings Goal');

    // Form fields should be visible
    await expect(page.getByTestId('new-goal-name-input')).toBeVisible();
    await expect(page.getByTestId('new-goal-target-input')).toBeVisible();
    await expect(page.getByTestId('new-goal-deadline-input')).toBeVisible();

    // Icon selector should have 4 options
    await expect(page.getByTestId('goal-icon-plane')).toBeVisible();
    await expect(page.getByTestId('goal-icon-laptop')).toBeVisible();
    await expect(page.getByTestId('goal-icon-home')).toBeVisible();
    await expect(page.getByTestId('goal-icon-target')).toBeVisible();
  });

  test('Create Goal confirm enables when name and target are provided', async ({ page }) => {
    await navigateToBudget(page);
    await page.getByTestId('add-savings-goal').click();

    const confirmBtn = page.getByTestId('create-goal-confirm-btn');

    // Disabled initially
    await expect(confirmBtn).toBeDisabled();

    // Fill only name — still disabled
    await page.getByTestId('new-goal-name-input').fill('Beach House');
    await expect(confirmBtn).toBeDisabled();

    // Fill target — now enabled
    await page.getByTestId('new-goal-target-input').fill('200000');
    await expect(confirmBtn).toBeEnabled();
  });

  test('Creating a goal closes dialog and adds a new goal card', async ({ page }) => {
    await navigateToBudget(page);
    await page.getByTestId('add-savings-goal').click();

    // Fill the form
    await page.getByTestId('new-goal-name-input').fill('E2E Test Goal');
    await page.getByTestId('new-goal-target-input').fill('10000');
    await page.getByTestId('new-goal-deadline-input').fill('Mar 2027');
    await page.getByTestId('goal-icon-plane').click();

    // Submit
    await page.getByTestId('create-goal-confirm-btn').click();

    // Dialog should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // A new savings goal card should appear (4th card at index 3)
    const newGoal = page.getByTestId('savings-goal-3');
    await expect(newGoal).toBeVisible({ timeout: 5000 });
    await expect(newGoal).toContainText('E2E Test Goal');
  });

  test('Default icon selection is "target"', async ({ page }) => {
    await navigateToBudget(page);
    await page.getByTestId('add-savings-goal').click();

    // The target icon should have the active/selected styling
    const targetIcon = page.getByTestId('goal-icon-target');
    await expect(targetIcon).toHaveClass(/border-primary/);
  });
});

// ─── EXPORT TRANSACTIONS ─────────────────────────────

test.describe('BudgetTracker - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Export button triggers CSV download with correct filename', async ({ page }) => {
    await navigateToBudget(page);

    // Verify transactions table has data
    await expect(page.getByTestId('transactions-table')).toBeVisible();

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-transactions-btn').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^namlend-transactions-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('Exported CSV has correct headers and data rows', async ({ page }) => {
    await navigateToBudget(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-transactions-btn').click();

    const download = await downloadPromise;
    const filePath = await download.path();
    const content = fs.readFileSync(filePath!, 'utf8');
    const lines = content.trim().split('\n');

    // First line should be headers
    expect(lines[0]).toBe('Date,Description,Category,Source,Amount');

    // Should have header + data rows (at least 5 mock transactions)
    expect(lines.length).toBeGreaterThanOrEqual(6);
  });

  test('Expenses have negative amounts in CSV export', async ({ page }) => {
    await navigateToBudget(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-transactions-btn').click();

    const download = await downloadPromise;
    const filePath = await download.path();
    const content = fs.readFileSync(filePath!, 'utf8');
    const lines = content.trim().split('\n');

    // Find the Salary line (income) - should be positive
    const salaryLine = lines.find((l) => l.includes('Salary Deposit'));
    expect(salaryLine).toBeDefined();
    expect(salaryLine).toMatch(/25000\.00$/);

    // Find a Groceries line (expense) - should be negative
    const groceryLine = lines.find((l) => l.includes('Pick n Pay'));
    expect(groceryLine).toBeDefined();
    expect(groceryLine).toMatch(/-1250\.50$/);
  });
});

// ─── FILTER TRANSACTIONS ─────────────────────────────

test.describe('BudgetTracker - Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Filter button opens filter popover', async ({ page }) => {
    await navigateToBudget(page);

    await page.getByTestId('filter-transactions-btn').click();

    // Popover heading should be visible
    await expect(page.locator('text="Filter Transactions"')).toBeVisible({ timeout: 5000 });
  });

  test('Filtering by category shows only matching transactions', async ({ page }) => {
    await navigateToBudget(page);

    // Open filter popover
    await page.getByTestId('filter-transactions-btn').click();
    await page.locator('text="Filter Transactions"').waitFor({ state: 'visible', timeout: 5000 });

    // Click the Category select trigger (first select inside popover)
    const categorySelect = page
      .locator('text="Filter Transactions"')
      .locator('..')
      .locator('[role="combobox"]')
      .first();
    await categorySelect.click();

    // Select "Groceries"
    await page.getByRole('option', { name: /Groceries/i }).click();
    await page.waitForTimeout(500);

    // Close the popover by clicking elsewhere
    await page.getByTestId('budget-tracker-page').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Table should show only 1 row (Pick n Pay Groceries)
    const rows = page.getByTestId('transactions-table').locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Pick n Pay');
  });

  test('Filtering by type "Income" shows only income transactions', async ({ page }) => {
    await navigateToBudget(page);

    await page.getByTestId('filter-transactions-btn').click();
    await page.locator('text="Filter Transactions"').waitFor({ state: 'visible', timeout: 5000 });

    // Click the Type select (second select in popover)
    const typeSelect = page
      .locator('text="Filter Transactions"')
      .locator('..')
      .locator('[role="combobox"]')
      .last();
    await typeSelect.click();

    await page.getByRole('option', { name: /Income/i }).click();
    await page.waitForTimeout(500);

    await page.getByTestId('budget-tracker-page').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Table should show only 1 row (Salary Deposit)
    const rows = page.getByTestId('transactions-table').locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Salary');
  });

  test('Blue dot indicator shows when filters are active', async ({ page }) => {
    await navigateToBudget(page);

    // Before filtering — no blue dot
    const filterBtn = page.getByTestId('filter-transactions-btn');
    const blueDot = filterBtn.locator('span.rounded-full');
    await expect(blueDot).not.toBeVisible();

    // Apply a filter
    await filterBtn.click();
    await page.locator('text="Filter Transactions"').waitFor({ state: 'visible', timeout: 5000 });

    const categorySelect = page
      .locator('text="Filter Transactions"')
      .locator('..')
      .locator('[role="combobox"]')
      .first();
    await categorySelect.click();
    await page.getByRole('option', { name: /Transport/i }).click();
    await page.waitForTimeout(500);

    await page.getByTestId('budget-tracker-page').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Blue dot should now be visible
    await expect(filterBtn.locator('span.rounded-full')).toBeVisible();
  });

  test('Clear Filters resets to show all transactions', async ({ page }) => {
    await navigateToBudget(page);

    // Apply a category filter
    await page.getByTestId('filter-transactions-btn').click();
    await page.locator('text="Filter Transactions"').waitFor({ state: 'visible', timeout: 5000 });

    const categorySelect = page
      .locator('text="Filter Transactions"')
      .locator('..')
      .locator('[role="combobox"]')
      .first();
    await categorySelect.click();
    await page.getByRole('option', { name: /Transport/i }).click();
    await page.waitForTimeout(500);

    // Click Clear Filters
    await page.locator('button:has-text("Clear Filters")').click();
    await page.waitForTimeout(300);

    await page.getByTestId('budget-tracker-page').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // All 5 transactions should be visible
    const rows = page.getByTestId('transactions-table').locator('tbody tr');
    await expect(rows).toHaveCount(5);

    // Blue dot should be gone
    const filterBtn = page.getByTestId('filter-transactions-btn');
    await expect(filterBtn.locator('span.rounded-full')).not.toBeVisible();
  });

  test('Empty state shows when no transactions match filters', async ({ page }) => {
    await navigateToBudget(page);

    // Apply Category=Groceries
    await page.getByTestId('filter-transactions-btn').click();
    await page.locator('text="Filter Transactions"').waitFor({ state: 'visible', timeout: 5000 });

    const categorySelect = page
      .locator('text="Filter Transactions"')
      .locator('..')
      .locator('[role="combobox"]')
      .first();
    await categorySelect.click();
    await page.getByRole('option', { name: /Groceries/i }).click();
    await page.waitForTimeout(500);

    // Apply Type=Income (no transaction is both Groceries and Income)
    const typeSelect = page
      .locator('text="Filter Transactions"')
      .locator('..')
      .locator('[role="combobox"]')
      .last();
    await typeSelect.click();
    await page.getByRole('option', { name: /Income/i }).click();
    await page.waitForTimeout(500);

    await page.getByTestId('budget-tracker-page').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Table should be empty and show contextual message
    await expect(page.locator('text="No transactions match your filters."')).toBeVisible();
  });
});
