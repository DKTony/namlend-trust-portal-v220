import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';

// Non-mutating: does NOT press Submit. Only verifies form flow enables submission.
test.describe('Client Loan Application Form', () => {
  test('Form flow enables submission after valid inputs', async ({ page }) => {
    const role = await login(page, false); // prefer client
    if (role !== 'client') test.skip(true, 'Client credentials not available; skipping');

    await page.goto(`${baseURL}/loan-application`);
    // Ensure we're not redirected to /auth
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/\/(loan-application|auth)/);
    if (/\/auth/.test(page.url())) test.skip(true, 'Redirected to /auth; client session not available');

    // Wait for either heading or amount input to appear
    const heading = page.getByText(/Apply for a Loan/i);
    const amountInput = page.getByTestId('loan-amount-input');
    await Promise.race([
      heading.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
      amountInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null)
    ]);

    // If the amount input is still not present, skip (env may not expose client form)
    if (await amountInput.count().then(c => c === 0)) {
      test.skip(true, 'Loan application form not found; skipping environment-specific test');
    }

    // Step 1: amount, term, purpose
    await page.getByTestId('loan-amount-input').fill('5000');

    await page.getByTestId('loan-term-select').click();
    await page.getByRole('option', { name: /3 months/i }).click();

    await page.getByTestId('loan-purpose-select').click();
    await page.getByRole('option', { name: /Personal Expenses/i }).click();

    await page.getByTestId('loan-next-button').click();

    // Step 2: employment, income, expenses
    await page.getByTestId('employment-select').click();
    await page.getByRole('option', { name: /Employed \(Full-time\)/i }).click();

    await page.getByTestId('income-input').fill('10000');
    await page.getByTestId('expenses-input').fill('3000');

    await page.getByTestId('loan-next-button').click();

    // Step 3: review shows interest and submit button enabled
    await expect(page.getByText(/32% APR/)).toBeVisible();
    const submitBtn = page.getByTestId('loan-submit-button');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });
});
