/**
 * E2E Test: Loan Application Flow
 * Version: v2.6.0
 * 
 * Tests complete loan application submission flow
 */

describe('Loan Application Flow', () => {
  beforeAll(async () => {
    // Setup: Launch app and sign in
    await device.launchApp();
    // TODO: Add sign-in helper
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete loan application successfully', async () => {
    // Navigate to Loans tab
    await element(by.text('Loans')).tap();

    // Tap "Apply for Loan" button
    await element(by.text('Apply for Loan')).tap();

    // Verify eligibility screen
    await expect(element(by.text('Apply for a Loan'))).toBeVisible();

    // Agree to terms
    await element(by.text('I have read and agree')).tap();

    // Continue to form
    await element(by.text('Continue to Application')).tap();

    // Step 1: Enter loan details
    await element(by.id('amount-input')).typeText('10000');
    await element(by.id('term-input')).typeText('12');
    await element(by.id('purpose-input')).typeText('Home improvement');

    // Verify APR message displayed
    await expect(element(by.text(/Representative APR: up to 32% p.a./))).toBeVisible();

    // Next step
    await element(by.text('Next')).tap();

    // Step 2: Enter financial information
    await element(by.text('Select employment status')).tap();
    await element(by.text('Employed Full-time')).tap();
    await element(by.id('income-input')).typeText('5000');
    await element(by.id('expenses-input')).typeText('3000');

    // Next step
    await element(by.text('Next')).tap();

    // Step 3: Review and submit
    await expect(element(by.text('Review & Submit'))).toBeVisible();
    await expect(element(by.text('N$ 10,000.00'))).toBeVisible();

    // Submit application
    await element(by.text('Submit Application')).tap();

    // Verify success message
    await expect(element(by.text('Application Submitted!'))).toBeVisible();
    await element(by.text('OK')).tap();

    // Verify navigation back to dashboard
    await expect(element(by.text('Dashboard'))).toBeVisible();
  });

  it('should validate required fields', async () => {
    // Navigate to application form
    await element(by.text('Loans')).tap();
    await element(by.text('Apply for Loan')).tap();
    await element(by.text('I have read and agree')).tap();
    await element(by.text('Continue to Application')).tap();

    // Try to proceed without filling fields
    await element(by.text('Next')).tap();

    // Verify validation errors
    await expect(element(by.text('Loan amount is required'))).toBeVisible();
  });

  it('should enforce APR limit of 32%', async () => {
    // Navigate to application form
    await element(by.text('Loans')).tap();
    await element(by.text('Apply for Loan')).tap();
    await element(by.text('I have read and agree')).tap();
    await element(by.text('Continue to Application')).tap();

    // Enter loan details
    await element(by.id('amount-input')).typeText('10000');
    await element(by.id('term-input')).typeText('12');

    // Verify calculated APR is within limit
    await expect(element(by.text('32% APR'))).toBeVisible();
  });
});
