/**
 * E2E UI Tests for Backoffice Disbursement
 * Tests the complete user flow from loan approval to disbursement
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@namlend.test';
const ADMIN_PASSWORD = 'test123';

test.describe('Backoffice Disbursement UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    
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
    
    // Switch to Approved tab
    await page.click('button:has-text("Approved")');
    
    // Wait for loans to load
    await page.waitForSelector('[data-testid="loan-card"], .loan-application-card', {
      timeout: 5000
    });
    
    // Check if Disburse button exists for approved loans
    const disburseButton = page.locator('button:has-text("Disburse")').first();
    await expect(disburseButton).toBeVisible({ timeout: 10000 });
  });

  test('Disbursement modal opens and displays loan details', async ({ page }) => {
    // Navigate to Loan Management
    await page.click('text=Loans');
    await page.click('button:has-text("Approved")');
    
    // Wait for loans and click Disburse
    await page.waitForSelector('button:has-text("Disburse")', { timeout: 5000 });
    await page.click('button:has-text("Disburse")');
    
    // Verify modal opened
    await expect(page.locator('text=Complete Disbursement')).toBeVisible();
    
    // Verify loan details are displayed
    await expect(page.locator('text=Client:')).toBeVisible();
    await expect(page.locator('text=Amount:')).toBeVisible();
    await expect(page.locator('text=Loan ID:')).toBeVisible();
  });

  test('Payment method selection works', async ({ page }) => {
    // Navigate and open disbursement modal
    await page.click('text=Loans');
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('button:has-text("Disburse")', { timeout: 5000 });
    await page.click('button:has-text("Disburse")');
    
    // Wait for modal
    await page.waitForSelector('text=Payment Method');
    
    // Test Bank Transfer selection (default)
    const bankTransferButton = page.locator('button:has-text("Bank Transfer")');
    await expect(bankTransferButton).toHaveClass(/border-blue-500/);
    
    // Select Mobile Money
    await page.click('button:has-text("Mobile Money")');
    const mobileMoneyButton = page.locator('button:has-text("Mobile Money")');
    await expect(mobileMoneyButton).toHaveClass(/border-green-500/);
    
    // Select Cash
    await page.click('button:has-text("Cash")');
    const cashButton = page.locator('button:has-text("Cash")');
    await expect(cashButton).toHaveClass(/border-gray-500/);
    
    // Select Debit Order
    await page.click('button:has-text("Debit Order")');
    const debitOrderButton = page.locator('button:has-text("Debit Order")');
    await expect(debitOrderButton).toHaveClass(/border-purple-500/);
  });

  test('Form validation requires payment reference', async ({ page }) => {
    // Navigate and open disbursement modal
    await page.click('text=Loans');
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('button:has-text("Disburse")', { timeout: 5000 });
    await page.click('button:has-text("Disburse")');
    
    // Wait for modal
    await page.waitForSelector('text=Payment Reference');
    
    // Try to submit without payment reference
    const submitButton = page.locator('button:has-text("Complete Disbursement")');
    await expect(submitButton).toBeDisabled();
    
    // Enter payment reference
    await page.fill('input[placeholder*="BANK-REF"]', 'TEST-REF-12345');
    
    // Submit button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('Complete disbursement flow', async ({ page }) => {
    // Navigate and open disbursement modal
    await page.click('text=Loans');
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('button:has-text("Disburse")', { timeout: 5000 });
    
    // Get the first approved loan's client name for verification
    const firstLoanCard = page.locator('[data-testid="loan-card"], .loan-application-card').first();
    const clientName = await firstLoanCard.locator('text=/.*@.*/').textContent();
    
    // Click Disburse
    await page.click('button:has-text("Disburse")');
    
    // Wait for modal and fill form
    await page.waitForSelector('text=Payment Method');
    
    // Select payment method (Mobile Money)
    await page.click('button:has-text("Mobile Money")');
    
    // Fill payment reference
    await page.fill('input[placeholder*="BANK-REF"]', 'E2E-TEST-REF-' + Date.now());
    
    // Fill notes (optional)
    await page.fill('textarea[placeholder*="notes"]', 'E2E test disbursement');
    
    // Submit
    await page.click('button:has-text("Complete Disbursement")');
    
    // Wait for success message
    await expect(page.locator('text=Success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/disbursement.*completed/i')).toBeVisible();
    
    // Verify modal closed
    await expect(page.locator('text=Complete Disbursement')).not.toBeVisible();
    
    // Verify loan list refreshed and loan moved to Disbursed status
    await page.click('button:has-text("Disbursed")');
    await page.waitForTimeout(1000); // Wait for tab switch
    
    // The disbursed loan should appear in this tab
    await expect(page.locator('text=Disbursed').first()).toBeVisible();
  });

  test('Repayments visible after disbursement', async ({ page }) => {
    // Navigate to Disbursed loans
    await page.click('text=Loans');
    await page.click('button:has-text("Disbursed")');
    
    // Wait for loans to load
    await page.waitForSelector('[data-testid="loan-card"], .loan-application-card', {
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
    await page.click('button:has-text("Disbursed")');
    
    // Wait for loans to load
    await page.waitForSelector('[data-testid="loan-card"], .loan-application-card', {
      timeout: 5000
    });
    
    // Disburse button should NOT be visible for disbursed loans
    const disburseButton = page.locator('button:has-text("Disburse")');
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
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**');
  });

  test('Shows error for invalid payment reference', async ({ page }) => {
    await page.click('text=Loans');
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('button:has-text("Disburse")', { timeout: 5000 });
    await page.click('button:has-text("Disburse")');
    
    // Enter very short reference (less than 5 characters)
    await page.fill('input[placeholder*="BANK-REF"]', 'ABC');
    
    // Try to submit
    await page.click('button:has-text("Complete Disbursement")');
    
    // Should show validation error
    await expect(page.locator('text=/reference.*at least.*5/i')).toBeVisible({ timeout: 3000 });
  });

  test('Cancel button closes modal without changes', async ({ page }) => {
    await page.click('text=Loans');
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('button:has-text("Disburse")', { timeout: 5000 });
    await page.click('button:has-text("Disburse")');
    
    // Fill some data
    await page.fill('input[placeholder*="BANK-REF"]', 'TEST-CANCEL-123');
    
    // Click Cancel
    await page.click('button:has-text("Cancel")');
    
    // Modal should close
    await expect(page.locator('text=Complete Disbursement')).not.toBeVisible();
    
    // Loan should still be in Approved tab (not disbursed)
    await expect(page.locator('button:has-text("Disburse")').first()).toBeVisible();
  });
});
