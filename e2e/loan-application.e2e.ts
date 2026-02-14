import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

// Non-mutating: does NOT press Submit. Only verifies form flow enables submission.
test.describe('Client Loan Application Form', () => {
  test('Form flow enables submission after valid inputs', async ({ page }) => {
    const role = await login(page, false); // prefer client
    expect(role).toBe('client');

    // Navigate to loan application - session may be lost on page.goto()
    await page.goto(`${baseURL}/loan-application`);
    await page.waitForTimeout(2000);
    
    // If redirected to auth, re-login and use SPA navigation
    if (page.url().includes('/auth')) {
      console.log('Session lost after navigation, re-logging in...');
      await page.fill('[data-testid="email-input"]', 'client1@test.namlend.com');
      await page.fill('[data-testid="password-input"]', 'test123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/(dashboard|loans|loan-application)/, { timeout: 20000 });
      await page.getByTestId('sidebar-trigger').waitFor({ state: 'visible', timeout: 10000 });
      console.log('After re-login, URL:', page.url());
      
      // If we landed on dashboard, navigate to loan application
      if (!page.url().includes('loan-application')) {
        // Try clicking sidebar to expand it first
        await page.getByTestId('sidebar-trigger').click();
        await page.waitForTimeout(500);
        
        // Look for loan application link with various patterns
        const loanAppLink = page.locator('a[href*="loan-application"]');
        if (await loanAppLink.count() > 0) {
          console.log('Found loan-application link, clicking...');
          await loanAppLink.first().click();
          await page.waitForURL(/loan-application/, { timeout: 10000 });
        } else {
          // Navigate directly via URL but use history.pushState to avoid full reload
          console.log('No link found, navigating directly...');
          await page.evaluate(() => {
            window.history.pushState({}, '', '/loan-application');
            window.dispatchEvent(new PopStateEvent('popstate'));
          });
          await page.waitForTimeout(1000);
          // If that doesn't work, reload at the new URL
          if (!page.url().includes('loan-application')) {
            await page.goto(`${baseURL}/loan-application`);
            await page.waitForTimeout(2000);
          }
        }
      }
    }
    
    console.log('Final URL:', page.url());

    // Check if KYC eligibility gate is blocking the form
    const kycGate = page.locator('text=Document Verification Required');
    const isKycBlocked = await kycGate.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isKycBlocked) {
      console.log('KYC verification required - test user has not completed KYC. Skipping form test.');
      test.skip(true, 'Test user has not completed KYC verification. Form is blocked by eligibility gate.');
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
    await page.getByRole('option', { name: /Employed/i }).first().click();
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
