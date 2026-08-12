/**
 * Implementation Review — Validation Tests
 *
 * Validates that the comprehensive plan fixes (Tiers 1-5) are correctly
 * implemented. Tests cover:
 *   - Schema field alignment (Tier 1)
 *   - Hook migration from Supabase to Convex (Tier 2)
 *   - Financial safety patterns (Tier 5)
 *   - Convex backend function structure (audit, auth guards)
 *
 * Run: npm run test:unit
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers — read source files for structural assertions
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '../..');
const readSrc = (relPath: string): string => {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf-8');
};

// ---------------------------------------------------------------------------
// Tier 1: Schema Alignment
// ---------------------------------------------------------------------------

describe('Tier 1 — Schema Alignment', () => {
  const schema = readSrc('convex/schema.ts');

  it('profiles table has status field for deactivateUser', () => {
    // deactivateUser patches profiles.status — schema must define it
    expect(schema).toContain("v.literal('active')");
    expect(schema).toContain("v.literal('deactivated')");
  });

  it('bankTransactions has both transactionType and direction fields', () => {
    // Schema should define both (even if redundant) so no runtime crash
    expect(schema).toMatch(/transactionType.*v\.optional/);
    expect(schema).toMatch(/direction.*v\.optional/);
  });

  it('bankTransactions has matchedPaymentId, matchConfidence, matchedAt fields', () => {
    expect(schema).toContain('matchedPaymentId');
    expect(schema).toContain('matchConfidence');
    expect(schema).toContain('matchedAt');
  });

  it('reconciliationRuns has correct field names', () => {
    expect(schema).toContain('reconciliationRuns');
    expect(schema).toContain('periodStart');
    expect(schema).toContain('periodEnd');
  });

  it('SettledLoansList uses paid_off not settled', () => {
    const settled = readSrc(
      'src/pages/AdminDashboard/components/PaymentManagement/SettledLoansList.tsx'
    );
    expect(settled).toContain("'paid_off'");
    expect(settled).not.toContain("'settled'");
  });

  it('analytics.ts uses l.principal not l.amount', () => {
    const analytics = readSrc('convex/analytics.ts');
    // Should reference .principal for loan size
    expect(analytics).toContain('.principal');
    // Should NOT contain l.amount as loan size (d.amount for disbursements is fine)
    expect(analytics).not.toMatch(/l\.amount/);
  });
});

// ---------------------------------------------------------------------------
// Tier 2: Supabase → Convex Hook Migration
// ---------------------------------------------------------------------------

describe('Tier 2 — Supabase Hook Migration', () => {
  it('useSettlement.ts imports from convex, not supabase', () => {
    const hook = readSrc('src/hooks/useSettlement.ts');
    expect(hook).toContain('convex/react');
    expect(hook).not.toContain('@/integrations/supabase/client');
  });

  it('useWorkflow.ts imports from convex, not supabase', () => {
    const hook = readSrc('src/hooks/useWorkflow.ts');
    expect(hook).toContain('convex/react');
    expect(hook).not.toContain('@/integrations/supabase/client');
  });

  it('keeps the OG brand immutable instead of loading tenant overrides', () => {
    const provider = readSrc('src/context/BrandingContext.tsx');
    expect(provider).toContain('IMMUTABLE_BRANDING_CONTEXT');
    expect(provider).not.toContain('useQuery');
    expect(provider).not.toContain('faviconLink');
    expect(fs.existsSync(path.join(ROOT, 'src/hooks/useBrandingConfig.ts'))).toBe(false);
  });

  it('usePaymentMetrics uses correct status values', () => {
    const hook = readSrc('src/pages/AdminDashboard/hooks/usePaymentMetrics.ts');
    expect(hook).toContain("'paid_off'");
    expect(hook).not.toContain("'settled'");
  });
});

// ---------------------------------------------------------------------------
// Tier 5: Financial Safety & Audit
// ---------------------------------------------------------------------------

describe('Tier 5 — Financial Safety', () => {
  const payments = readSrc('convex/payments.ts');
  const loans = readSrc('convex/loans.ts');
  const disbursements = readSrc('convex/disbursements.ts');
  const mandates = readSrc('convex/ontology/mandates.ts');
  const relationships = readSrc('convex/ontology/relationships.ts');
  const mandateExecutions = readSrc('convex/ontology/mandateExecutions.ts');
  const approvalWorkflow = readSrc('convex/approvalWorkflow.ts');
  const approvalReadiness = readSrc('convex/lib/approvalReadiness.ts');
  const ipsAlerts = readSrc('convex/ips/ipsAlerts.ts');
  const http = readSrc('convex/http.ts');
  const ipsAdapter = readSrc('convex/actions/ipsAdapter.ts');

  it('completePayment has idempotency guard', () => {
    // Must check for already-completed status before proceeding
    expect(payments).toContain("payment.status === 'completed'");
    // Must reject non-pending payments
    expect(payments).toContain("payment.status !== 'pending'");
  });

  it('failPayment validates current status', () => {
    // Must reject payments not in pending status
    expect(payments).toMatch(/failPayment/);
    expect(payments).toMatch(/payment\.status !== ['"]pending['"]/);
  });

  it('recordPayment has idempotency guards for externalTransactionId and referenceNumber', () => {
    expect(payments).toContain('by_externalTransactionId');
    expect(payments).toContain('by_referenceNumber');
  });

  it('recordPayment scopes referenceNumber guard to loanId', () => {
    // The referenceNumber dedup must filter by loanId
    expect(payments).toMatch(/by_referenceNumber.*\n.*filter.*loanId/s);
  });

  it('completePayment, not recordPayment, applies the repayment (ledger posting on completion)', () => {
    const repaymentApplication = readSrc('convex/lib/repaymentApplication.ts');
    const recordPaymentBlock =
      payments.match(/export const recordPayment[\s\S]*?export const completePayment/)?.[0] ?? '';
    const completePaymentBlock =
      payments.match(/export const completePayment[\s\S]*?export const failPayment/)?.[0] ?? '';
    // Ledger posting lives in the shared completion routine, invoked only on completion.
    expect(recordPaymentBlock).not.toContain("eventType: 'REPAYMENT'");
    expect(recordPaymentBlock).not.toContain('applyCompletedRepayment');
    expect(completePaymentBlock).toContain('applyCompletedRepayment');
    expect(repaymentApplication).toContain("eventType: 'REPAYMENT'");
    expect(repaymentApplication).toContain('buildRepaymentOutboxPayloadFromCents');
    // Exactly-once across all completion paths: shared idempotency key.
    expect(repaymentApplication).toContain('repayment:payment:');
  });

  it('loan lifecycle enforces KYC at submission and scoring before approval', () => {
    // KYC is gated at submit (Option B — drafts allowed, not gated at createLoan).
    expect(loans).toContain('assertKycVerifiedForUser');
    // Approval readiness (KYC + scoring + DTI + recommendation) lives in ONE shared
    // helper used by every approval writer — not duplicated inline.
    expect(approvalReadiness).toContain('assertLoanReadyForApproval');
    expect(approvalReadiness).toContain('assertKycVerifiedForUser');
    expect(approvalReadiness).toContain('SCORING_REQUIRED');
    expect(approvalReadiness).toContain('RECOMMENDATION_REJECTED');
  });

  it('both approval paths delegate to the shared approveLoanCore (no bypass)', () => {
    expect(loans).toContain('approveLoanCore');
    expect(approvalWorkflow).toContain('approveLoanCore');
    // The workflow path must NOT patch the loan to approved directly.
    expect(approvalWorkflow).not.toContain("ctx.db.patch(loanId, { status: 'approved'");
  });

  it('disbursement rejects partial amounts and requires KYC', () => {
    expect(disbursements).toContain('Partial disbursement is disabled');
    expect(disbursements).toContain('assertKycVerifiedForUser');
  });

  it('approval request reads resolve loan ownership or require staff', () => {
    expect(approvalWorkflow).toContain('assertOwnerOrStaff');
    expect(approvalWorkflow).toContain("request.entityType === 'loan'");
    expect(approvalWorkflow).toContain('await assertStaff(ctx)');
  });

  it('mandate and relationship probes are not public unauthenticated queries', () => {
    expect(mandates).toContain('hasActiveMandate = internalQuery');
    expect(relationships).toContain('hasRelationship = internalQuery');
    expect(mandates).toContain('assertOwnerOrStaff');
  });

  it('IPS alerts are staff-only and mandate debits never post the ledger at initiation', () => {
    expect(ipsAlerts).toContain('await assertStaff(ctx)');
    // Mandate auto-debit is disabled (cron gated by MANDATE_AUTODEBIT_ENABLED) and
    // executeMandateDebit must not enqueue any ledger entry at initiation — posting
    // is deferred to the future completion lifecycle.
    const mandateExecutor = readSrc('convex/scheduled/mandateExecutor.ts');
    expect(mandateExecutor).toContain('MANDATE_AUTODEBIT_ENABLED');
    expect(mandateExecutions).not.toContain("insert('tigerBeetleOutbox'");
    expect(mandateExecutions).not.toContain('enqueueOutboxIdempotent(');
  });

  it('payment webhooks fail closed and do not log raw provider payloads', () => {
    expect(http).toContain('PAYMENT_WEBHOOK_SECRET');
    expect(http).toContain("process.env.NODE_ENV === 'production'");
    expect(ipsAdapter).toContain('internal.payments.applyPaymentWebhook');
    expect(ipsAdapter).not.toContain('Received from ${gateway}:');
  });

  it('completePayment schedules audit log', () => {
    expect(payments).toContain("'COMPLETE', 'pending', 'completed'");
  });

  it('failPayment schedules audit log', () => {
    expect(payments).toContain("'FAIL', 'pending', 'failed'");
  });

  it('recordPayment schedules audit log', () => {
    expect(payments).toContain("'RECORD', 'none', 'pending'");
  });

  it('approvalWorkflow sends notification on loan approval', () => {
    expect(approvalWorkflow).toContain('Loan Approved');
  });

  it('approvalWorkflow sends notification on loan rejection', () => {
    expect(approvalWorkflow).toContain('Loan Application Update');
  });

  it('systemConfig uses soft-delete', () => {
    const sysConfig = readSrc('convex/systemConfig.ts');
    // Should use deletedAt instead of ctx.db.delete
    expect(sysConfig).toContain('deletedAt');
    expect(sysConfig).not.toMatch(/ctx\.db\.delete\s*\(/);
  });
});

// ---------------------------------------------------------------------------
// Auth Guards — Every public mutation/query must have auth guard
// ---------------------------------------------------------------------------

describe('Auth Guards', () => {
  it('payments.ts has auth guards on all public functions', () => {
    const payments = readSrc('convex/payments.ts');
    // Every handler should call assertAuthenticated, assertStaff, or assertOwnerOrStaff
    const handlerCount = (payments.match(/handler:\s*async/g) || []).length;
    const guardCount = (payments.match(/assert(Authenticated|Staff|Admin|OwnerOrStaff)/g) || [])
      .length;
    expect(guardCount).toBeGreaterThanOrEqual(handlerCount);
  });

  it('users.ts has auth guards on all public functions', () => {
    const users = readSrc('convex/users.ts');
    const handlerCount = (users.match(/handler:\s*async/g) || []).length;
    const guardCount = (users.match(/assert(Authenticated|Staff|Admin|OwnerOrStaff)/g) || [])
      .length;
    // Internal queries don't need guards, so guards >= handlers - internalCount
    const internalCount = (users.match(/internal(Query|Mutation)/g) || []).length;
    expect(guardCount).toBeGreaterThanOrEqual(handlerCount - internalCount);
  });

  it('loans.ts has auth guards on all public functions', () => {
    const loans = readSrc('convex/loans.ts');
    const handlerCount = (loans.match(/handler:\s*async/g) || []).length;
    const guardCount = (loans.match(/assert(Authenticated|Staff|Admin|OwnerOrStaff)/g) || [])
      .length;
    const internalCount = (loans.match(/internal(Query|Mutation)/g) || []).length;
    expect(guardCount).toBeGreaterThanOrEqual(handlerCount - internalCount);
  });
});

// ---------------------------------------------------------------------------
// Admin Dashboard — Dead button wiring
// ---------------------------------------------------------------------------

describe('Tier 3 — Admin Dashboard Wiring', () => {
  it('useDisbursements calls real Convex mutations', () => {
    const hook = readSrc('src/pages/AdminDashboard/hooks/useDisbursements.ts');
    expect(hook).toContain('api.disbursements');
    expect(hook).not.toContain('TODO');
  });

  it('useUserManagement has updateUser wired to Convex', () => {
    const hook = readSrc('src/pages/AdminDashboard/hooks/useUserManagement.ts');
    expect(hook).toContain('api.users.adminUpdateProfile');
  });

  it('useUserManagement has deleteUser wired to deactivateUser', () => {
    const hook = readSrc('src/pages/AdminDashboard/hooks/useUserManagement.ts');
    expect(hook).toContain('api.users.deactivateUser');
  });

  it('useUserManagement has assignRole wired to Convex', () => {
    const hook = readSrc('src/pages/AdminDashboard/hooks/useUserManagement.ts');
    expect(hook).toContain('api.users.assignRole');
  });
});

// ---------------------------------------------------------------------------
// Regulatory — APR limit, currency formatting
// ---------------------------------------------------------------------------

describe('Regulatory Constants', () => {
  it('APR_LIMIT is 32', () => {
    const reg = readSrc('src/constants/regulatory.ts');
    expect(reg).toMatch(/APR_LIMIT\s*=\s*32/);
  });

  it('formatNAD is exported from utils/currency', () => {
    const currency = readSrc('src/utils/currency.ts');
    expect(currency).toContain('export');
    expect(currency).toMatch(/formatNAD|N\$/);
  });

  it('admin components import formatNAD, not formatCurrency from @/lib/utils', () => {
    const adminDir = path.join(ROOT, 'src/pages/AdminDashboard');
    if (!fs.existsSync(adminDir)) return;
    // The wrong pattern is: import { formatCurrency } from '@/lib/utils'
    // A local alias like `const formatCurrency = (x) => formatNAD(x)` is fine
    const files = [
      'components/PaymentManagement/PaymentsList.tsx',
      'components/PaymentManagement/SettledLoansList.tsx',
      'components/Analytics/PortfolioAnalytics.tsx',
    ];
    for (const f of files) {
      const content = readSrc(`src/pages/AdminDashboard/${f}`);
      if (content) {
        // Must not import formatCurrency from utils (renders "R" instead of "N$")
        expect(content).not.toMatch(
          /import\s*\{[^}]*formatCurrency[^}]*\}\s*from\s*['"]@\/lib\/utils['"]/
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Immutable OG presentation
// ---------------------------------------------------------------------------

describe('OG presentation is fixed and light-only', () => {
  it('clears legacy preferences and forces the light root before render', () => {
    const main = readSrc('src/main.tsx');
    const presentation = readSrc('src/lib/presentation.ts');
    expect(main).toContain('enforceOgPresentation();');
    expect(presentation).toContain("'namlend-theme-variant'");
    expect(presentation).toContain("'namlend-dark-mode'");
    expect(presentation).toContain("'vite-ui-theme'");
    expect(presentation).toContain("root.classList.add('light')");
    expect(presentation).toContain("root.removeAttribute('data-theme')");
  });

  it('does not mount a theme provider or a runtime picker', () => {
    const app = readSrc('src/App.tsx');
    const index = readSrc('src/pages/Index.tsx');
    expect(app).not.toMatch(/ThemeProvider|ThemeSwitcher|ThemeBackground/);
    expect(index).not.toMatch(/LandingThemeToggle|BackgroundLayer/);
    expect(fs.existsSync(path.join(ROOT, 'src/context/ThemeContext.tsx'))).toBe(false);
  });

  it('uses only versioned OG metadata assets and path-only logo lettering', () => {
    const html = readSrc('index.html');
    const manifest = readSrc('public/site.webmanifest');
    const logo = readSrc('public/og-financial-logo-v2.svg');
    expect(html).toContain('/og-financial-favicon-v2.svg');
    expect(html).toContain('/og-financial-social-v2.png');
    expect(manifest).toContain('/og-financial-icon-192-v2.png');
    expect(manifest).toContain('/og-financial-icon-512-v2.png');
    expect(logo).toContain('OG Financial Services CC');
    expect(logo).not.toContain('<text');
    expect(html).not.toMatch(/l[o]vable|h[e]art/i);
  });

  it('keeps contract and signature UI out of the loan application', () => {
    const application = [
      readSrc('src/pages/LoanApplication/index.tsx'),
      readSrc('src/pages/LoanApplication/steps/ReviewSubmitStep.tsx'),
    ].join('\n');
    expect(application).not.toContain('loan-contract-step');
    expect(application).not.toContain('contract-signature');
    expect(application).not.toContain('contract-upload');
  });
});
