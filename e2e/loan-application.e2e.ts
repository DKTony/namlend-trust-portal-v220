import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

// Non-mutating: does NOT press Submit. Only verifies form flow enables submission.
test.describe('Client Loan Application Form', () => {
  test('Form flow enables submission after valid inputs', async ({ page }) => {
    const role = await login(page, false); // prefer client
    expect(role).toBe('client');

    // Navigate to loan application via dashboard "Apply Now" button
    console.log('Navigating to loan application from dashboard...');

    // Wait for dashboard to load
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Wait for Convex queries to populate (KYC documents should be loaded)
    // This ensures the KYC eligibility check has the correct data
    await page.waitForTimeout(3000);

    // Look for "Apply Now" or "Apply for Loan" button
    const applyButton = page.getByRole('button', { name: /apply now|apply for loan/i }).first();
    await applyButton.waitFor({ state: 'visible', timeout: 10000 });
    await applyButton.click();

    // Wait for navigation to loan application
    await page.waitForURL(/loan-application/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('Final URL:', page.url());

    // Check if KYC eligibility gate is blocking the form
    const kycGate = page.locator('text=Document Verification Required');
    const isKycBlocked = await kycGate.isVisible({ timeout: 3000 }).catch(() => false);

    if (isKycBlocked) {
      console.log(
        'KYC verification required - test user has not completed KYC. Skipping form test.'
      );
      test.skip(
        true,
        'Test user has not completed KYC verification. Form is blocked by eligibility gate.'
      );
      return;
    }

    // Wait for form to be visible
    const amountInput = page.getByTestId('loan-amount-input');
    await expect(amountInput).toBeVisible({ timeout: 15000 });

    // Step 1: Fill basic loan details
    await amountInput.fill('5000');

    // Select term
    await page.getByTestId('loan-term-select').click();
    await page.getByRole('option', { name: /3 months/i }).click();
    await page.waitForTimeout(500);

    // Select purpose
    await page.getByTestId('loan-purpose-select').click();
    await page.getByRole('option', { name: /Personal Expenses/i }).click();
    await page.waitForTimeout(500);

    // Debug: Check if Next button exists
    const nextButtonExists = await page.getByTestId('loan-next-button').count();
    console.log('Next button count:', nextButtonExists);

    if (nextButtonExists === 0) {
      await page.screenshot({ path: 'test-results/no-next-button-debug.png' });
      throw new Error('Next button not found after filling form. Check no-next-button-debug.png');
    }

    // Click Next to go to step 2
    await page.getByTestId('loan-next-button').click();
    await page.waitForTimeout(500);

    // Step 2: Employment details
    await page.getByTestId('employment-select').click();
    await page
      .getByRole('option', { name: /Employed/i })
      .first()
      .click();
    await page.waitForTimeout(300);

    await page.getByTestId('income-input').fill('10000');
    await page.getByTestId('expenses-input').fill('3000');
    await page.waitForTimeout(300);

    // Click Next to go to step 3
    await page.getByTestId('loan-next-button').click();
    await page.waitForTimeout(500);

    // Step 3: Verify review page shows APR and submit is enabled
    await expect(page.getByText(/32%.*APR|APR.*32%/i).first()).toBeVisible({ timeout: 10000 });
    const submitBtn = page.getByTestId('loan-submit-button');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
