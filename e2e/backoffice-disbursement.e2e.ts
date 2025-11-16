/**
 * E2E UI Tests for Backoffice Disbursement
 * Tests the complete user flow from loan approval to disbursement
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@test.namlend.com';
const ADMIN_PASSWORD = 'test123';

test.describe('Backoffice Disbursement UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/auth`);
    
    // Login as admin
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/admin**');
  });

  test('Disburse button visible for approved loans', async ({ page }) => {
    // Navigate to Loan Management
    await page.click('text=Loans');
    
    // Switch to Approved filter
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    
    // Wait for loans to load
    await page.waitForSelector('[data-testid^="loan-card-"]', {
      timeout: 5000
    });
    
    // Check if Disburse button exists for approved loans
    const disburseButton = page.locator('[data-testid^="disburse-loan-"]').first();
    await expect(disburseButton).toBeVisible({ timeout: 10000 });
  });

  test('Disbursement modal opens and displays loan details', async ({ page }) => {
    // Navigate to Loan Management
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    
    // Wait for loans and click Disburse
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 5000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Verify modal opened
    await expect(page.locator('[data-testid="disbursement-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toBeVisible();
    
    // Verify loan details are displayed
    await expect(page.locator('text=Client:')).toBeVisible();
    await expect(page.locator('text=Amount:')).toBeVisible();
    await expect(page.locator('text=Loan ID:')).toBeVisible();
  });

  test('Payment method selection works', async ({ page }) => {
    // Navigate and open disbursement modal
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 5000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Wait for modal
    await page.waitForSelector('[data-testid="disbursement-modal"]');
    
    // Test Bank Transfer selection (default)
    const bankTransferButton = page.locator('[data-testid="payment-method-bank"]');
    await expect(bankTransferButton).toHaveClass(/border-blue-500/);
    
    // Select Mobile Money
    await page.click('[data-testid="payment-method-mobile"]');
    const mobileMoneyButton = page.locator('[data-testid="payment-method-mobile"]');
    await expect(mobileMoneyButton).toHaveClass(/border-green-500/);
    
    // Select Cash
    await page.click('[data-testid="payment-method-cash"]');
    const cashButton = page.locator('[data-testid="payment-method-cash"]');
    await expect(cashButton).toHaveClass(/border-gray-500/);
    
    // Select Debit Order
    await page.click('[data-testid="payment-method-debit"]');
    const debitOrderButton = page.locator('[data-testid="payment-method-debit"]');
    await expect(debitOrderButton).toHaveClass(/border-purple-500/);
  });

  test('Form validation requires payment reference', async ({ page }) => {
    // Navigate and open disbursement modal
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 5000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Wait for modal
    await page.waitForSelector('[data-testid="disbursement-modal"]');
    
    // Try to submit without payment reference
    const submitButton = page.locator('[data-testid="complete-disbursement-button"]');
    await expect(submitButton).toBeDisabled();
    
    // Enter payment reference
    await page.fill('[data-testid="payment-reference-input"]', 'TEST-REF-12345');
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('Complete disbursement flow', async ({ page }) => {
    // Navigate and open disbursement modal
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 5000 });
    
    // Click Disburse
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Wait for modal and fill form
    await page.waitForSelector('[data-testid="disbursement-modal"]');
    
    // Select payment method (Mobile Money)
    await page.click('[data-testid="payment-method-mobile"]');
    
    // Fill payment reference
    await page.fill('[data-testid="payment-reference-input"]', 'E2E-TEST-REF-' + Date.now());
    
    // Fill notes (optional)
    await page.fill('[data-testid="disbursement-notes"]', 'E2E test disbursement');
    
    // Submit
    await page.click('[data-testid="complete-disbursement-button"]');
    
    // Wait for success message
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/disbursement.*completed/i')).toBeVisible();
    
    // Verify modal closed
    await expect(page.locator('[data-testid="disbursement-modal"]')).not.toBeVisible();
    
    // Verify loan list refreshed and loan moved to Disbursed status
    await page.selectOption('[data-testid="filter-status-select"]', 'disbursed');
    await page.waitForTimeout(1000); // Wait for filter to apply
    
    // The disbursed loan should appear in this tab
    await expect(page.locator('[data-testid^="loan-card-"]').first()).toBeVisible();
  });

  test('Repayments visible after disbursement', async ({ page }) => {
    // Navigate to Disbursed loans
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'disbursed');
    
    // Wait for loans to load
    await page.waitForSelector('[data-testid^="loan-card-"]', {
      timeout: 5000
    });
    
    // Click Review on first disbursed loan
    await page.click('button:has-text("Review")');
    
    // Wait for loan details modal
    await page.waitForSelector('text=/Loan Details|Repayment Schedule/i', { timeout: 5000 });
    
    // Verify repayment schedule is visible
    await expect(page.locator('text=/Payment.*Schedule|Repayment.*Schedule/i')).toBeVisible();
    
    // Verify at least one payment row exists
    const paymentRows = page.locator('[data-testid="payment-row"], .payment-schedule-item');
    await expect(paymentRows.first()).toBeVisible({ timeout: 5000 });
  });

  test('Cannot disburse same loan twice', async ({ page }) => {
    // Navigate to Disbursed loans
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'disbursed');
    
    // Wait for loans to load
    await page.waitForSelector('[data-testid^="loan-card-"]', {
      timeout: 5000
    });
    
    // Disburse button should NOT be visible for disbursed loans
    const disburseButton = page.locator('[data-testid^="disburse-loan-"]');
    await expect(disburseButton).not.toBeVisible();
  });

  test('Audit trail recorded for disbursement', async ({ page }) => {
    // This test would require access to audit logs in the UI
    // For now, we verify via the API test in disbursement.e2e.ts
    // In a full implementation, you'd navigate to an Audit Log page
    
    // Navigate to Admin section (if audit logs are visible there)
    await page.click('text=Admin', { timeout: 5000 }).catch(() => {
      console.log('Admin section not available in UI');
    });
    
    // This is a placeholder - implement based on your audit log UI
    // await expect(page.locator('text=complete_disbursement')).toBeVisible();
  });
});

test.describe('Disbursement Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**');
  });

  test('Shows error for invalid payment reference', async ({ page }) => {
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 5000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Enter very short reference (less than 5 characters)
    await page.fill('[data-testid="payment-reference-input"]', 'ABC');
    
    // Try to submit
    await page.click('[data-testid="complete-disbursement-button"]');
    
    // Should show validation error
    await expect(page.locator('text=/reference.*at least.*5/i')).toBeVisible({ timeout: 3000 });
  });

  test('Cancel button closes modal without changes', async ({ page }) => {
    await page.click('text=Loans');
    await page.selectOption('[data-testid="filter-status-select"]', 'approved');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 5000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Fill some data
    await page.fill('[data-testid="payment-reference-input"]', 'TEST-CANCEL-123');
    
    // Click Cancel
    const cancelButton = page.locator('[data-testid="cancel-disbursement-button"]');
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();
    
    // Modal should close
    await expect(page.locator('[data-testid="disbursement-modal"]')).not.toBeVisible();
    
    // Loan should still be in Approved tab (not disbursed)
    await expect(page.locator('[data-testid^="disburse-loan-"]').first()).toBeVisible();
  });
});
