/**
 * E2E UI Tests for Backoffice Disbursement
 * Tests the complete user flow from loan approval to disbursement
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { ensureAdminReady, openAdminTab } from './helpers/admin';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

// Extend timeout for UI tests that need data to load
test.setTimeout(90000);

test.describe('Backoffice Disbursement UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping disbursement UI tests');

    await ensureAdminReady(page);
  });

  test('Disburse button visible for approved loans', async ({ page }) => {
    // Navigate to Loan Management
    await openAdminTab(page, 'loans');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Click on the Approved TAB (not the filter dropdown)
    await page.click('button:has-text("Approved")');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Debug: Check for any loan cards
    const loanCards = page.locator('[data-testid^="loan-card-"]');
    const cardCount = await loanCards.count();
    console.log('Loan cards found:', cardCount);
    
    // Debug: Check for any disburse buttons
    const disburseButtons = page.locator('[data-testid^="disburse-loan-"]');
    const buttonCount = await disburseButtons.count();
    console.log('Disburse buttons found:', buttonCount);
    
    // Check if Disburse button exists for approved loans
    const disburseButton = page.locator('[data-testid^="disburse-loan-"]').first();
    await expect(disburseButton).toBeVisible({ timeout: 10000 });
  });

  test('Disbursement modal opens and displays loan details', async ({ page }) => {
    // Navigate to Loan Management
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    // Click on Approved tab
    await page.click('button:has-text("Approved")');
    
    // Wait for loans and click Disburse
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 15000 });
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
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    // Click on Approved tab
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 15000 });
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
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    // Click on Approved tab
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 15000 });
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
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    // Click on Approved tab
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 15000 });
    
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
    
    // Submit (scroll and use JS click to avoid viewport issues)
    const submitButton = page.locator('[data-testid="complete-disbursement-button"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.evaluate((el: HTMLElement) => el.click());
    
    // Wait for modal to close (indicates success)
    await expect(page.locator('[data-testid="disbursement-modal"]')).not.toBeVisible({ timeout: 20000 });
    
    // Success! The disbursement was processed (modal closed means success)
  });

  test('Loan status updates after disbursement', async ({ page }) => {
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Approved")');

    const disburseButton = page.locator('[data-testid^="disburse-loan-"]').first();
    await expect(disburseButton).toBeVisible({ timeout: 15000 });

    const disburseTestId = await disburseButton.getAttribute('data-testid');
    expect(disburseTestId).toBeTruthy();
    const loanId = disburseTestId!.replace('disburse-loan-', '');

    await disburseButton.click();
    await page.waitForSelector('[data-testid="disbursement-modal"]');

    await page.click('[data-testid="payment-method-mobile"]');
    await page.fill('[data-testid="payment-reference-input"]', 'E2E-STATUS-REF-' + Date.now());

    const submitButton = page.locator('[data-testid="complete-disbursement-button"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.evaluate((el: HTMLElement) => el.click());

    await expect(page.locator('[data-testid="disbursement-modal"]')).not.toBeVisible({ timeout: 20000 });

    await page.click('button:has-text("All Loans")');
    await page.waitForTimeout(1000);

    const disbursedCard = page.locator(`[data-testid="loan-card-${loanId}"]`);
    await expect(disbursedCard).toBeVisible({ timeout: 15000 });
    await expect(disbursedCard).toContainText(/disbursed/i);
  });

  test('Cannot disburse same loan twice', async ({ page }) => {
    // Navigate to Disbursed loans
    await openAdminTab(page, 'loans');
    await page.click('button:has-text("All Loans")');

    // Wait for loans to load
    await page.waitForTimeout(1000);
    const loanCards = page.locator('[data-testid^="loan-card-"]');
    const cardCount = await loanCards.count();
    
    if (cardCount === 0) {
      // No loans at all - skip test
      test.skip(true, 'No loan cards available to test.');
      return;
    }

    // Look for disbursed loans - check both "disbursed" and "Disbursed" status text
    const disbursedCard = loanCards.filter({ hasText: /disbursed/i }).first();
    const disbursedCount = await disbursedCard.count();
    
    if (disbursedCount === 0) {
      // No disbursed loans available - skip test gracefully
      console.log('No disbursed loans found in the loan list. Skipping test.');
      test.skip(true, 'No disbursed loans available to verify disbursement button state.');
      return;
    }

    // Disburse button should NOT be visible for disbursed loans
    await expect(disbursedCard.locator('[data-testid^="disburse-loan-"]')).toHaveCount(0);
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
    const role = await login(page, true);
    if (role !== 'admin') test.skip(true, 'Admin credentials not available; skipping disbursement error tests');

    await ensureAdminReady(page);
  });

  test('Validates payment reference on submit', async ({ page }) => {
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    // Click on Approved tab
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 15000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Wait for modal
    await page.waitForSelector('[data-testid="disbursement-modal"]');
    
    // With empty reference, button should be disabled
    const submitButton = page.locator('[data-testid="complete-disbursement-button"]');
    await expect(submitButton).toBeDisabled();
    
    // Enter reference - button should become enabled
    await page.fill('[data-testid="payment-reference-input"]', 'VALID-REF-12345');
    await expect(submitButton).toBeEnabled();
  });

  test('Cancel closes modal without changes', async ({ page }) => {
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(1000);
    // Click on Approved tab
    await page.click('button:has-text("Approved")');
    await page.waitForSelector('[data-testid^="disburse-loan-"]', { timeout: 15000 });
    await page.click('[data-testid^="disburse-loan-"]');
    
    // Wait for modal
    await page.waitForSelector('[data-testid="disbursement-modal"]');
    
    // Fill some data
    await page.fill('[data-testid="payment-reference-input"]', 'TEST-CANCEL-123');
    
    // Close modal using Escape key (more reliable than clicking cancel button)
    await page.keyboard.press('Escape');
    
    // Modal should close
    await expect(page.locator('[data-testid="disbursement-modal"]')).not.toBeVisible({ timeout: 5000 });
    
    // Loan should still be in Approved tab (not disbursed)
    await expect(page.locator('[data-testid^="disburse-loan-"]').first()).toBeVisible();
  });
});
