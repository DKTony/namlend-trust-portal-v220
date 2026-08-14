import 'dotenv/config';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ensureAdminReady, openAdminTab } from './helpers/admin';
import { baseURL, gotoAuthenticated, login, signOutViaUI } from './helpers/auth';

const mutationJourneyEnabled = process.env.E2E_ENABLE_DOCUMENT_MUTATIONS === 'true';

for (const viewport of [
  { name: 'compact', width: 390, height: 844 },
  { name: 'desktop', width: 1366, height: 900 },
]) {
  test(`KYC workflow remains actionable at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const role = await login(page, false);
    expect(role).toBe('client');
    await gotoAuthenticated(page, '/kyc');

    // Scoped to main: the app shell header renders the same title, so an unscoped
    // heading lookup is a strict-mode violation rather than a real assertion.
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'KYC Documents' })
    ).toBeVisible();
    await expect(page.getByTestId('kyc-card-id_card')).toBeVisible();
    await expect(page.getByTestId('kyc-card-proof_income')).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: /submit for review|resubmit for review|done \/ back to dashboard|continue to loan application/i,
      })
    ).toBeVisible();
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.locator('body').evaluate((body) => body.clientWidth)
    );
  });
}

test.describe.serial('KYC document lifecycle mutation journey', () => {
  test.skip(
    !mutationJourneyEnabled,
    'Set E2E_ENABLE_DOCUMENT_MUTATIONS=true against an isolated Convex test deployment.'
  );

  test('client upload → refresh → preview → submit, then staff review and reactive verification', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await login(page, false)).toBe('client');
    await gotoAuthenticated(page, '/kyc');

    const files = [
      {
        input: 'upload-id_card',
        file: path.resolve(process.cwd(), 'src/assets/security-icon.png'),
        fileName: 'security-icon.png',
      },
      {
        input: 'upload-proof_income',
        file: path.resolve(process.cwd(), 'src/assets/speed-icon.png'),
        fileName: 'speed-icon.png',
      },
    ];

    for (const fixture of files) {
      await page.getByTestId(fixture.input).setInputFiles(fixture.file);
      // KYC.tsx asks for confirmation whenever a current document already exists, so on
      // any deployment that has run this journey before, the dialog ALWAYS appears.
      // The old 1s probe raced it: when it lost, the upload was silently abandoned —
      // and the assertion below still passed, because the previous run's file has the
      // same fixture name and was still on screen. Wait properly instead.
      const confirmReplace = page.getByRole('button', { name: /upload replacement/i });
      if (await confirmReplace.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await confirmReplace.click();
      }
      await expect(page.getByText(fixture.fileName).first()).toBeVisible({ timeout: 20_000 });
    }

    // Proof the uploads actually landed, independent of filenames: recording a document
    // reopens KYC server-side (kycDocuments.recordDocument), which is precisely what
    // makes submission available again. Without this the next step fails 60s later with
    // an opaque "button not found" instead of "the upload never happened".
    await expect(page.getByTestId('submit-kyc-button')).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.getByText('security-icon.png').first()).toBeVisible();
    await expect(page.getByText('speed-icon.png').first()).toBeVisible();
    await page.getByTestId('preview-id_card').click();
    await expect(page.getByRole('dialog')).toContainText('security-icon.png');
    await expect(page.getByAltText('Preview of security-icon.png')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByTestId('submit-kyc-button').click();
    await page.getByRole('button', { name: /confirm and submit/i }).click();
    await expect(page.getByText('Submitted for review')).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByRole('button', { name: /done \/ back to dashboard/i })).toBeVisible();

    await signOutViaUI(page);
    expect(await login(page, true)).toBe('admin');
    await ensureAdminReady(page);
    await openAdminTab(page, 'approvals');
    await page.getByTestId('approvals-filter-status').click();
    await page.getByRole('option', { name: 'Pending' }).click();
    await page.getByTestId('approvals-filter-type').click();
    await page.getByRole('option', { name: 'KYC Packages' }).click();
    await page.locator('[data-testid^="approvals-request-"]').first().click();
    await expect(page.getByTestId('approvals-review-dialog')).toBeVisible({ timeout: 10_000 });

    const approveButton = page.getByRole('button', { name: /^Approve$/ });
    // Wait for the document rows before counting. `locator.count()` is one of the few
    // non-retrying APIs — it answers immediately — and the panel renders its shell
    // (including "Complete package review") before the document query resolves. Counting
    // straight after the row click therefore saw 0, skipped the loop entirely, and failed
    // later on the disabled complete button instead of here.
    await expect(approveButton.first()).toBeVisible({ timeout: 20_000 });

    // Index-based is correct: approving does NOT remove the button (staff can revise a
    // decision), so the set is stable. No sleep between clicks — the panel disables every
    // Approve while a decision is in flight and Playwright's click auto-waits for the
    // next one to become enabled again.
    const decisionCount = await approveButton.count();
    for (let index = 0; index < decisionCount; index += 1) {
      await approveButton.nth(index).click();
    }
    await expect(page.getByTestId('kyc-complete-review')).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId('kyc-complete-review').click();
    await page.getByRole('button', { name: /confirm completion/i }).click();

    await signOutViaUI(page);
    expect(await login(page, false)).toBe('client');
    await page.goto(`${baseURL}/kyc`);
    await expect(page.getByRole('button', { name: /continue to loan application/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('loan-supporting file is retrievable from client Loan Details and active staff review', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    expect(await login(page, false)).toBe('client');
    await gotoAuthenticated(page, '/dashboard');
    await page.getByTestId('sidebar-nav-loans').click();

    const detailButtons = page.locator('[data-testid^="view-loan-"]');
    // `count()` does not retry — size the list only once it has actually rendered,
    // otherwise a slow first paint yields 0 and the whole search is skipped.
    await expect(detailButtons.first()).toBeVisible({ timeout: 20_000 });
    // Bounded: `seedReviewableLoanForE2E` puts a `submitted` loan at the head of the list,
    // and only draft/submitted/under_review loans accept uploads. Walking all 70+ loans the
    // test client accumulates cannot finish inside the test timeout, so search the first
    // few and skip loudly if the seed did not run.
    const searchLimit = Math.min(await detailButtons.count(), 5);
    let editableLoanId: string | null = null;
    for (let index = 0; index < searchLimit; index += 1) {
      // Return via an explicit navigation, not goBack(): history here includes the auth
      // page and post-login redirects, so going back did not reliably restore the loans
      // list — the sidebar was simply absent on the next pass.
      if (index > 0) {
        await gotoAuthenticated(page, '/dashboard');
        await page.getByTestId('sidebar-nav-loans').click();
      }
      await expect(detailButtons.first()).toBeVisible({ timeout: 20_000 });
      const testId = await detailButtons.nth(index).getAttribute('data-testid');
      await detailButtons.nth(index).click();
      await page.getByTestId('loan-documents-tab').click();
      if (
        await page
          .getByTestId('loan-document-upload')
          .isVisible({ timeout: 5_000 })
          .catch(() => false)
      ) {
        editableLoanId = testId?.replace('view-loan-', '') ?? null;
        break;
      }
    }
    test.skip(!editableLoanId, 'The seeded client has no loan in draft/submitted/under_review.');

    await page
      .getByTestId('loan-document-input')
      .setInputFiles(path.resolve(process.cwd(), 'src/assets/security-icon.png'));
    // Same 1s race as the KYC uploads above: on a re-run the document already exists, the
    // confirmation always appears, and losing the race abandons the upload while the
    // previous run's identically-named file keeps the assertion below green.
    const confirmReplace = page.getByRole('button', { name: /upload replacement/i });
    if (await confirmReplace.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await confirmReplace.click();
    }
    await expect(page.getByText('security-icon.png').first()).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await page.getByTestId('loan-documents-tab').click();
    await page.locator('[data-testid^="loan-document-preview-"]').first().click();
    await expect(page.getByRole('dialog')).toContainText('security-icon.png');
    await page.getByRole('button', { name: 'Close' }).click();

    await signOutViaUI(page);
    expect(await login(page, true)).toBe('admin');
    await ensureAdminReady(page);
    await openAdminTab(page, 'loans');
    const loanCard = page.getByTestId(`loan-card-${editableLoanId}`);
    await loanCard.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByText('Supporting documents')).toBeVisible();
    await expect(page.getByText('security-icon.png').first()).toBeVisible();
    await page.locator('[data-testid^="loan-document-preview-"]').first().click();
    await expect(page.getByRole('dialog').last()).toContainText('security-icon.png');
  });
});
