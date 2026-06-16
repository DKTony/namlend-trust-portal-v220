/**
 * IPP Full Lifecycle E2E Test
 *
 * Tests the complete loan lifecycle using the IPP (Instant Payment Platform) rail:
 *   Phase 1: Client submits a loan application
 *   Phase 2: Admin approves the loan
 *   Phase 3: Admin disburses funds via IPS rail
 *   Phase 4: Client makes full payment via IPS
 *   Phase 5: Admin verifies payment completion
 *   Phase 6: Admin verifies settlement/reconciliation evidence
 *
 * This is a serial test — each phase depends on the previous one.
 */

import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { login, baseURL } from './helpers/auth';
import { ensureAdminReady, openAdminTab } from './helpers/admin';

// Unique prefix to identify test artifacts for cleanup
const TEST_RUN_ID = `IPP-E2E-${Date.now()}`;
const LOAN_AMOUNT = '1350';
const VPA_ADDRESS = 'client1@fnb';

// Shared state across serial tests
let createdLoanId: string | null = null;

test.describe('IPP Full Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  // =========================================================================
  // Phase 1: Client submits loan application
  // =========================================================================
  test('Phase 1: Client submits loan application', async ({ page }) => {
    // Login as client
    const role = await login(page, false);
    expect(role).toBe('client');

    // Wait for dashboard to fully load (Convex queries)
    await page.waitForURL(/dashboard/, { timeout: 15_000 });
    await page.waitForTimeout(3000);

    // Check for KYC gate — if KYC is required, skip gracefully
    const applyButton = page.getByRole('button', { name: /apply now|apply for loan/i }).first();
    const applyVisible = await applyButton.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!applyVisible) {
      // Try navigating directly to loan application
      await page.goto(`${baseURL}/loan-application`);
      await page.waitForTimeout(2000);
    } else {
      await applyButton.click();
      await page.waitForURL(/loan-application/, { timeout: 10_000 });
    }

    await page.waitForTimeout(2000);

    // Check if KYC eligibility gate is blocking
    const kycGate = page.locator('text=Document Verification Required');
    const isKycBlocked = await kycGate.isVisible({ timeout: 3000 }).catch(() => false);
    if (isKycBlocked) {
      test.skip(true, 'Test user has not completed KYC. Form blocked by eligibility gate.');
      return;
    }

    // Step 1: Loan Details
    const amountInput = page.getByTestId('loan-amount-input');
    await expect(amountInput).toBeVisible({ timeout: 15_000 });
    await amountInput.fill(LOAN_AMOUNT);

    // Select term: 3 months
    await page.getByTestId('loan-term-select').click();
    await page.getByRole('option', { name: /3 months/i }).click();
    await page.waitForTimeout(500);

    // Select purpose: Personal Expenses
    await page.getByTestId('loan-purpose-select').click();
    await page.getByRole('option', { name: /Personal Expenses/i }).click();
    await page.waitForTimeout(500);

    // Click Next → Step 2
    await page.getByTestId('loan-next-button').click();
    await page.waitForTimeout(1000);

    // Step 2: Financial Information
    await page.getByTestId('employment-select').click();
    await page
      .getByRole('option', { name: /Employed/i })
      .first()
      .click();
    await page.waitForTimeout(300);

    await page.getByTestId('income-input').fill('15000');
    await page.getByTestId('expenses-input').fill('4000');
    await page.waitForTimeout(300);

    // Click Next → Step 3
    await page.getByTestId('loan-next-button').click();
    await page.waitForTimeout(1000);

    // Step 3: Review & Submit
    // Verify APR is shown (32%)
    await expect(page.getByText(/32%.*APR|APR.*32%/i).first()).toBeVisible({ timeout: 10_000 });

    const submitBtn = page.getByTestId('loan-submit-button');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Submit the application
    await submitBtn.click();

    // Wait for success — either toast, redirect, or confirmation text
    const submitted = await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 20_000 }).then(() => 'redirected'),
      page
        .getByText(/submitted|success|received/i)
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => 'toast'),
    ]).catch(() => 'unknown');

    console.log(`Phase 1: Loan application submission result: ${submitted}`);
    expect(['redirected', 'toast']).toContain(submitted);
  });

  // =========================================================================
  // Phase 2: Admin approves the loan via Approvals workflow
  // =========================================================================
  test('Phase 2: Admin approves loan', async ({ page }) => {
    // Login as admin
    const role = await login(page, true);
    if (role !== 'admin') {
      test.skip(true, 'Admin credentials not available');
      return;
    }

    await page.setViewportSize({ width: 1366, height: 900 });
    await ensureAdminReady(page);

    // -----------------------------------------------------------------------
    // Strategy A: Try Approvals tab (approval request created by processLoanApplication)
    // -----------------------------------------------------------------------
    await openAdminTab(page, 'approvals');
    await page.waitForTimeout(3000);

    // Look for a pending approval request
    const approvalRequests = page.locator('[data-testid^="approvals-request-"]');
    const hasRequests = await approvalRequests
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (hasRequests) {
      console.log('Phase 2: Found approval requests in Approvals tab');

      // Click the first pending request to select it
      await approvalRequests.first().click();
      await page.waitForTimeout(1000);

      // Look for the Approve button in the request detail panel
      const approvalsApproveBtn = page.getByTestId('approvals-approve-btn');
      const canApprove = await approvalsApproveBtn
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      if (canApprove) {
        console.log('Phase 2: Approving via Approvals tab...');
        await approvalsApproveBtn.click();

        // Wait for success toast / status change
        await page.waitForTimeout(3000);
        const toastText = page.getByText(/approved|success|status updated/i).first();
        await toastText.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
        console.log('Phase 2: Approval request processed');
      } else {
        // Request may already be processed — check for processed state
        const processed = page.getByTestId('approvals-processed-state');
        const isProcessed = await processed.isVisible({ timeout: 5_000 }).catch(() => false);
        if (isProcessed) {
          console.log('Phase 2: Request already processed (approved or rejected)');
        }
      }
    } else {
      console.log('Phase 2: No approval requests found. Checking Loans tab directly...');
    }

    // -----------------------------------------------------------------------
    // Strategy B: Fallback — check Loans > Pending tab for inline Approve
    // (for loans with status 'pending' instead of 'submitted')
    // -----------------------------------------------------------------------
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(3000);

    // First check if there are pending loans with an inline Approve button
    const inlineApproveBtn = page.getByRole('button', { name: /^Approve$/i }).first();
    const hasInlineApprove = await inlineApproveBtn
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (hasInlineApprove) {
      console.log('Phase 2: Found inline Approve button in Loans Pending tab');
      // Get the loan card ID
      const loanCard = inlineApproveBtn.locator(
        'xpath=ancestor::div[contains(@data-testid, "loan-card-")]'
      );
      const cardTestId = await loanCard.getAttribute('data-testid').catch(() => null);
      if (cardTestId) createdLoanId = cardTestId.replace('loan-card-', '');

      await inlineApproveBtn.click();
      await page.waitForTimeout(3000);
    }

    // -----------------------------------------------------------------------
    // Verify: Navigate to Approved tab and confirm a disbursable loan exists
    // -----------------------------------------------------------------------
    const approvedTab = page.getByRole('tab', { name: /Approved/i });
    await approvedTab.click();
    await page.waitForTimeout(3000);

    const disburseBtn = page.locator('[data-testid^="disburse-loan-"]').first();
    await expect(disburseBtn).toBeVisible({ timeout: 20_000 });

    // Capture the loan ID
    const testId = await disburseBtn.getAttribute('data-testid');
    createdLoanId = testId?.replace('disburse-loan-', '') || createdLoanId;

    console.log(`Phase 2: Loan approved and ready for disbursement. ID: ${createdLoanId}`);
  });

  // =========================================================================
  // Phase 3: Admin disburses via IPP rail
  // =========================================================================
  test('Phase 3: Admin disburses via IPP rail', async ({ page }) => {
    // Login as admin
    const role = await login(page, true);
    if (role !== 'admin') {
      test.skip(true, 'Admin credentials not available');
      return;
    }

    await page.setViewportSize({ width: 1366, height: 900 });
    await ensureAdminReady(page);

    // Navigate to Loans → Approved tab
    await openAdminTab(page, 'loans');
    const approvedTab = page.getByRole('tab', { name: /Approved/i });
    await approvedTab.waitFor({ state: 'visible', timeout: 15_000 });
    await approvedTab.click();
    await page.waitForTimeout(2000);

    // Find the Disburse button (use specific loan ID if available)
    let disburseBtn;
    if (createdLoanId) {
      disburseBtn = page.locator(`[data-testid="disburse-loan-${createdLoanId}"]`);
      const specific = await disburseBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!specific) {
        // Fallback to first available
        disburseBtn = page.locator('[data-testid^="disburse-loan-"]').first();
      }
    } else {
      disburseBtn = page.locator('[data-testid^="disburse-loan-"]').first();
    }

    await expect(disburseBtn).toBeVisible({ timeout: 20_000 });

    // Capture the loan ID from disburse button
    const disburseBtnTestId = await disburseBtn.getAttribute('data-testid');
    const loanIdFromBtn = disburseBtnTestId?.replace('disburse-loan-', '');
    if (loanIdFromBtn) createdLoanId = loanIdFromBtn;

    // Click Disburse to open the disbursement modal
    await disburseBtn.click();

    // Wait for disbursement modal to appear
    const modal = page.locator('[data-testid="disbursement-modal"]');
    await expect(modal).toBeVisible({ timeout: 15_000 });

    // Verify loan details are shown
    await expect(modal.locator('text=Client:')).toBeVisible({ timeout: 5_000 });
    await expect(modal.locator('text=Amount:')).toBeVisible({ timeout: 5_000 });

    // Select IPS Instant Payment method
    const ipsMethodBtn = page.locator('[data-testid="payment-method-ips"]');
    await expect(ipsMethodBtn).toBeVisible({ timeout: 5_000 });
    await ipsMethodBtn.click();

    // IPS Disbursement Form should now be visible
    await expect(page.getByText('IPS Disbursement')).toBeVisible({ timeout: 5_000 });

    // Enter the customer's VPA
    const vpaInput = page.getByTestId('vpa-input');
    await expect(vpaInput).toBeVisible({ timeout: 5_000 });
    await vpaInput.fill(VPA_ADDRESS);

    // Verify the VPA
    const verifyBtn = page.getByTestId('vpa-verify-button');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Wait for validation to complete against the seeded local alias
    await page.waitForTimeout(2000);

    const validated = await page
      .locator('text=/client one|firnnanx|namlend/i')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    console.log(`Phase 3: VPA validation result: ${validated ? 'validated' : 'pending/hidden'}`);

    // Click "Continue to Confirm"
    const continueBtn = page.getByRole('button', { name: /Continue to Confirm/i });
    await expect(continueBtn).toBeEnabled({ timeout: 10_000 });
    await continueBtn.click();
    await page.waitForTimeout(1000);

    // Confirm step — verify details shown
    await expect(page.getByText(VPA_ADDRESS)).toBeVisible({ timeout: 5_000 });

    // Click "Disburse Now"
    const disburseNowBtn = page.getByRole('button', { name: /Disburse Now/i });
    await expect(disburseNowBtn).toBeVisible({ timeout: 5_000 });
    await disburseNowBtn.click();

    // Wait for processing and for the parent modal to close on success
    await expect(page.getByText(/Processing Disbursement/i)).toBeVisible({ timeout: 5_000 });
    await expect(modal).toBeHidden({ timeout: 30_000 });

    // The critical path requires actual funding, not only request initiation.
    const allLoansTab = page.getByRole('tab', { name: /All Loans/i });
    if (await allLoansTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await allLoansTab.click();
    }

    if (createdLoanId) {
      const loanCard = page.locator(`[data-testid="loan-card-${createdLoanId}"]`);
      await expect(loanCard).toBeVisible({ timeout: 15_000 });
      await expect
        .poll(async () => (await loanCard.textContent()) ?? '', {
          timeout: 30_000,
          intervals: [1000, 2000, 3000],
          message: 'Loan should move from approved to funded after IPS completion',
        })
        .toMatch(/funded|active/i);
    }

    console.log('Phase 3: IPS disbursement completed and loan is funded');
  });

  // =========================================================================
  // Phase 4: Client makes full payment via IPS
  // =========================================================================
  test('Phase 4: Client makes full payment via IPS', async ({ page }) => {
    // Login as client
    const role = await login(page, false);
    expect(role).toBe('client');

    // Navigate to payment page
    await page.goto(`${baseURL}/payment`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check if we got redirected to auth (session lost)
    if (page.url().includes('/auth')) {
      await page.fill('[data-testid="email-input"]', 'client1@test.namlend.com');
      await page.fill('[data-testid="password-input"]', 'Test1234!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL(/\/(dashboard|payment)/, { timeout: 20_000 });
      await page.goto(`${baseURL}/payment`);
      await page.waitForTimeout(3000);
    }

    // Check for "no active loans" state
    const noLoans = page.getByText(/no active loans|you don't have any active/i).first();
    const hasNoLoans = await noLoans.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(
      hasNoLoans,
      'Client must have an active/funded loan after IPP disbursement; repayment cannot be skipped'
    ).toBe(false);

    // Payment page should show loan selector and payment form.
    // IPS is the default method, but we still assert the tab renders.
    const ipsTab = page.getByRole('tab', { name: /ips/i }).first();
    await expect(ipsTab).toBeVisible({ timeout: 10_000 });

    // If there's a specific loan to select and it's not auto-selected, select it
    if (createdLoanId) {
      const loanSelector = page.locator('select, [role="combobox"]').first();
      const isSelectVisible = await loanSelector.isVisible({ timeout: 3_000 }).catch(() => false);
      if (isSelectVisible) {
        // Try to select the loan by its ID
        const options = page.locator(
          `option[value="${createdLoanId}"], [data-value="${createdLoanId}"]`
        );
        if ((await options.count()) > 0) {
          await loanSelector.selectOption(createdLoanId);
        }
      }
    }

    // Click the Pay button to open IPS modal
    const payButton = page.getByTestId('payment-submit-button');
    await expect(payButton).toBeVisible({ timeout: 10_000 });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    // IPS Payment Modal should open
    const ipsModal = page.locator('[data-testid="ips-payment-modal"]');
    await expect(ipsModal).toBeVisible({ timeout: 10_000 });

    // Step 1: Amount — click "Full Balance" to pay the full outstanding amount
    const fullBalanceBtn = page.getByTestId('ips-full-balance-btn');
    const hasFullBalance = await fullBalanceBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasFullBalance) {
      await fullBalanceBtn.click();
    } else {
      // If no quick-select, enter the amount manually
      const amountInput = page.getByTestId('ips-amount-input');
      await amountInput.fill(LOAN_AMOUNT);
    }

    // Click Continue
    const continueBtn = page.getByTestId('ips-continue-btn');
    await expect(continueBtn).toBeEnabled({ timeout: 5_000 });
    await continueBtn.click();
    await page.waitForTimeout(1000);

    const savedAlias = page.getByText(VPA_ADDRESS).first();
    const hasSavedAlias = await savedAlias.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasSavedAlias) {
      await savedAlias.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback to manual entry if the saved alias does not render for this user.
      const newVpaOption = page.getByText('Use a different address');
      await expect(newVpaOption).toBeVisible({ timeout: 5_000 });
      await newVpaOption.click();

      const vpaInput = page.getByTestId('vpa-input');
      await expect(vpaInput).toBeVisible({ timeout: 5_000 });
      await vpaInput.fill(VPA_ADDRESS);

      const verifyBtn = page.getByTestId('vpa-verify-button');
      await expect(verifyBtn).toBeVisible();
      await verifyBtn.click();
      await page.waitForTimeout(2000);
    }

    // Continue to confirmation
    const continueBtn2 = page.getByTestId('ips-continue-btn');
    await expect(continueBtn2).toBeEnabled({ timeout: 10_000 });
    await continueBtn2.click();
    await page.waitForTimeout(1000);

    // Step 3: Confirmation — verify details
    await expect(page.getByText(VPA_ADDRESS)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/collections@namlend/i)).toBeVisible({ timeout: 5_000 });

    // Click "Pay Now"
    const payNowBtn = page.getByTestId('ips-pay-now-btn');
    await expect(payNowBtn).toBeVisible({ timeout: 5_000 });
    await payNowBtn.click();

    // Wait for processing
    await expect(page.getByText(/Processing Payment/i)).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(/Processing Payment/i)).toBeVisible({ timeout: 5_000 });
    await expect(ipsModal).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(2500);

    console.log(`Phase 4: IPS payment initiated, current URL: ${page.url()}`);
    expect(page.url()).toMatch(/\/(dashboard|payment)/);
  });

  // =========================================================================
  // Phase 5: Admin verifies payment completion
  // =========================================================================
  test('Phase 5: Admin verifies payment completion', async ({ page }) => {
    // Login as admin
    const role = await login(page, true);
    if (role !== 'admin') {
      test.skip(true, 'Admin credentials not available');
      return;
    }

    await page.setViewportSize({ width: 1366, height: 900 });
    await ensureAdminReady(page);

    // Navigate to Payments tab
    await openAdminTab(page, 'payments');
    await page.waitForTimeout(3000);

    // Look for recent payment entries — verify at least one IPS payment exists
    // Check for IPS-related text in the payments dashboard
    const ipsPaymentIndicator = page.getByText(/ips|instant payment/i).first();
    const hasIpsPayment = await ipsPaymentIndicator
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasIpsPayment) {
      console.log('Phase 5: IPS payment found in admin payments dashboard');
    } else {
      console.log(
        'Phase 5: No explicit IPS indicator in payments list (may show as generic payment)'
      );
    }

    // Navigate to Loans tab to check loan status
    await openAdminTab(page, 'loans');
    await page.waitForTimeout(2000);

    // Check All Loans tab for the loan status
    const allLoansTab = page.getByRole('tab', { name: /All Loans/i });
    if (await allLoansTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await allLoansTab.click();
      await page.waitForTimeout(3000);

      // If we have the loan ID, check its card
      if (createdLoanId) {
        const loanCard = page.locator(`[data-testid="loan-card-${createdLoanId}"]`);
        const cardVisible = await loanCard.isVisible({ timeout: 10_000 }).catch(() => false);
        expect(cardVisible, `Loan card ${createdLoanId} should be visible in All Loans`).toBe(true);

        await expect
          .poll(async () => (await loanCard.textContent()) ?? '', {
            timeout: 30_000,
            intervals: [1000, 2000, 3000],
            message: 'Loan should be paid off after the full IPP repayment completes',
          })
          .toMatch(/paid[_\s-]?off/i);

        const statusText = await loanCard.textContent();
        expect(statusText ?? '').not.toMatch(/\bapproved\b/i);
        expect(statusText ?? '').not.toMatch(/\bdisburse\b/i);
        console.log(
          `Phase 5: Loan ${createdLoanId} card text includes: ${statusText?.substring(0, 200)}`
        );
      }
    }

    // Payment rails moved to the Platform Console; tenant backoffice verification
    // stops at paid-off loan state, with settlement evidence covered in Phase 6.

    // Final verification: Take a screenshot for the record
    await page.screenshot({ path: 'test-results/ipp-lifecycle-phase5-admin-verification.png' });

    console.log('Phase 5: Admin verification complete. Full IPP lifecycle test passed.');
  });

  // =========================================================================
  // Phase 6: Admin verifies settlement/reconciliation evidence
  // =========================================================================
  test('Phase 6: Admin verifies IPP settlement and raw-data reports', async ({ page }) => {
    const role = await login(page, true);
    if (role !== 'admin') {
      test.skip(true, 'Admin credentials not available');
      return;
    }

    await page.setViewportSize({ width: 1366, height: 900 });
    await ensureAdminReady(page);

    await openAdminTab(page, 'reconciliation');
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /New Settlement Run/i }).click();
    await expect(page.getByText(/Create New Settlement Run/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Create & Process/i }).click();

    await expect(page.getByText(/Create New Settlement Run/i)).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText(/Settled/i).first()).toBeVisible({ timeout: 60_000 });

    await page.getByRole('tab', { name: /Raw Data/i }).click();
    await expect(page.getByRole('heading', { name: /Raw Data Reports/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/raw_data\.json/i).first()).toBeVisible({ timeout: 30_000 });

    const rawReportRow = page.locator('tr', { hasText: /raw_data\.json/i }).first();
    await rawReportRow.getByRole('button').first().click();
    await expect(page.getByRole('dialog', { name: /Raw Data Report/i })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByPlaceholder(/Search by transaction ID or participant/i).fill(VPA_ADDRESS);
    await expect(page.getByText(VPA_ADDRESS).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/N\$ ?1,350\.00/i).first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'test-results/ipp-lifecycle-phase6-settlement-recon.png' });
    console.log('Phase 6: Settlement run and raw-data reconciliation evidence verified.');
  });
});
