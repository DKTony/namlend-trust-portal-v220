/**
 * E2E Test: Loan Application Flow
 * Version: v2.6.0
 * 
 * Tests complete loan application submission flow
 */

/// <reference types="detox" />

declare const expect: Detox.Expect<Detox.Expect<Promise<void>>>;

describe('Loan Application Flow', () => {
  beforeAll(async () => {
    // Setup: Launch app and sign in
    await device.launchApp({ newInstance: true });
    // TODO: Add sign-in helper
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete loan application successfully', async () => {
    // Navigate to Loans tab
    await element(by.text('Loans')).tap();

    // Tap "Apply for New Loan" button
    await element(by.id('apply-loan-button')).tap();

    // Verify eligibility screen
    await expect(element(by.text('Apply for a Loan'))).toBeVisible();

    // Agree to terms
    await element(by.id('terms-agreement-checkbox')).tap();

    // Continue to form
    await element(by.text('Continue to Application')).tap();

    // Step 1: Enter loan details
    await element(by.id('amount-input')).typeText('5000');
    // Select Term (using 3 months as it is a valid option in the UI)
    // Assuming the term buttons have accessible text or we add testID. 
    // In LoanApplicationFormScreen, we didn't explicitly add unique testIDs for each term button except handling in map.
    // Let's rely on text for now or update component. 
    // The previous edit added `testID={termValue === 1 ? 'term-input' : undefined}`. 
    // But 1 month might not be enough for '12' in the test. Let's use 1 month for simplicity or tap by text.
    await element(by.text('3 Months')).tap();
    
    await element(by.id('purpose-input')).typeText('Home improvement project');
    // Dismiss keyboard if needed
    await element(by.id('purpose-input')).tapReturnKey();

    // Verify APR message displayed
    await expect(element(by.text('Representative APR: up to 32% p.a.'))).toBeVisible();

    // Next step
    await element(by.text('Next Step')).tap();

    // Step 2: Enter financial information
    // Employment status is now direct selection buttons
    await element(by.text('Full-time')).tap();
    
    await element(by.id('income-input')).typeText('15000');
    await element(by.id('expenses-input')).typeText('5000');
    // Dismiss keyboard
    await element(by.id('expenses-input')).tapReturnKey();

    // Next step
    await element(by.text('Next Step')).tap();

    // Step 3: Review and submit
    await expect(element(by.text('Review'))).toBeVisible();
    await expect(element(by.text('N$ 5,000.00'))).toBeVisible();

    // Submit application
    await element(by.text('Submit Application')).tap();

    // Verify success message
    await expect(element(by.text('Application Submitted!'))).toBeVisible();
    await element(by.text('OK')).tap();

    // Verify navigation back to dashboard
    await expect(element(by.text('My Loans'))).toBeVisible();
  });

  it('should validate required fields', async () => {
    // Navigate to application form
    await element(by.text('Loans')).tap();
    await element(by.id('apply-loan-button')).tap();
    await element(by.id('terms-agreement-checkbox')).tap();
    await element(by.text('Continue to Application')).tap();

    // Try to proceed without filling fields
    await element(by.text('Next Step')).tap();

    // Verify validation errors
    await expect(element(by.text('Loan amount is required'))).toBeVisible();
  });

  it('should enforce APR limit of 32%', async () => {
    // Navigate to application form
    await element(by.text('Loans')).tap();
    await element(by.id('apply-loan-button')).tap();
    await element(by.id('terms-agreement-checkbox')).tap();
    await element(by.text('Continue to Application')).tap();

    // Enter loan details
    await element(by.id('amount-input')).typeText('10000');
    // Select a term
    await element(by.text('5 Months')).tap();

    // Verify calculated APR is within limit
    await expect(element(by.text('32% APR'))).toBeVisible();
  });
});
