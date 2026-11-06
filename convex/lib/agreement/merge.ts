/**
 * Loan agreement — field mapping, repayment schedule and readiness.
 *
 * `buildAgreement` is the single place that decides what goes on the contract. The
 * draft preview, finalization (which freezes its output), the PDF renderer and both
 * user interfaces all consume it, so the screen, the PDF and the stored record cannot
 * disagree. It is pure: no database access, no clock — `now` is passed in.
 *
 * Nothing here invents data. A value that is not in a source record is `null` and,
 * if required, becomes a blocking readiness issue; the fix is made at the source.
 */

import type { Doc } from '../../_generated/dataModel';
import { computeCostOfCredit, type PricingRule } from '../agreementPricing';
import { generatePaymentSchedule, toCents } from '../amortization';
import type {
  AgreementField,
  AgreementSnapshot,
  AgreementTotals,
  FieldCategory,
  ScheduleRow,
} from './types';

export {
  addMonthsClamped,
  formatLongDate,
  formatNad,
  formatNadCents,
  isIsoDate,
  middayWindhoekMs,
  namibianDate,
} from './format';
import { addMonthsClamped, formatLongDate, formatNad, isIsoDate, middayWindhoekMs } from './format';

// ---------------------------------------------------------------------------
// Inputs and outputs
// ---------------------------------------------------------------------------

export interface AgreementInputs {
  loan: Doc<'loans'>;
  profile: Doc<'profiles'> | null;
  settings: Doc<'agreementSettings'> | null;
  template: Doc<'agreementTemplates'> | null;
  /** From the institution's Credit Policy — the only fee configuration. */
  pricing: PricingRule;
  productName?: string | null;
  firstRepaymentDate?: string;
  placeOfSigning?: string;
  /** Date printed as the agreement date (generation, or finalization once frozen). */
  agreementDate: string;
}

export type IssueCode =
  | 'FIELD_MISSING'
  | 'TEMPLATE_MISSING'
  | 'TEMPLATE_NOT_APPROVED'
  | 'DRAFTING_NOTE'
  | 'SETTINGS_MISSING'
  | 'SETTINGS_NOT_APPROVED'
  | 'FEES_NOT_SUPPORTED'
  | 'INSTALMENT_MISMATCH'
  | 'SCHEDULE_UNAVAILABLE'
  | 'WEBSITE_NOT_SET';

export interface ReadinessIssue {
  code: IssueCode;
  message: string;
  /** Blocking issues prevent finalization; warnings are shown but do not block. */
  blocking: boolean;
  /** Who can resolve it, mapped to the place it is fixed. */
  category: FieldCategory | 'template';
  fieldKey?: string;
}

export interface BuiltAgreement extends AgreementSnapshot {
  issues: ReadinessIssue[];
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const clean = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

function residentialAddress(p: Doc<'profiles'> | null): string | null {
  if (!p) return null;
  const parts = [p.addressLine1, p.addressLine2, p.city, p.postalCode, p.country]
    .map(clean)
    .filter((part): part is string => part !== null);
  // `address` is the legacy single-line field; structured lines win when present.
  return parts.length ? parts.join(', ') : clean(p.address);
}

function borrowerFullName(p: Doc<'profiles'> | null): string | null {
  if (!p) return null;
  const first = clean(p.firstNames);
  const last = clean(p.surname);
  return first && last ? `${first} ${last}` : clean(p.fullName);
}

function loanTermLabel(termMonths: number): string {
  return termMonths === 1 ? '1 month (one payment)' : `${termMonths} months`;
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * Amounts come from the app's amortization engine, unchanged; only the due dates are
 * anchored to the agreed first repayment date rather than to a disbursement that has
 * not happened yet. `ensurePaymentSchedule` later inserts these exact rows, so the
 * loan's repayment schedule is the one the borrower signed.
 */
export function buildSchedule(
  loan: Pick<Doc<'loans'>, 'principal' | 'interestRate' | 'termMonths'>,
  firstRepaymentDate: string
): ScheduleRow[] {
  const amounts = generatePaymentSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    new Date(middayWindhoekMs(firstRepaymentDate))
  );
  return amounts.map((row, index) => {
    const dueDate = addMonthsClamped(firstRepaymentDate, index);
    return {
      installmentNumber: row.installmentNumber,
      dueDate,
      dueDateMs: middayWindhoekMs(dueDate),
      principalDue: row.principalDue,
      interestDue: row.interestDue,
      totalDue: row.totalDue,
    };
  });
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildAgreement(input: AgreementInputs): BuiltAgreement {
  const { loan, profile, settings, template } = input;
  const issues: ReadinessIssue[] = [];
  const fields: AgreementField[] = [];

  const add = (
    section: string,
    key: string,
    label: string,
    category: FieldCategory,
    value: string | null,
    required: boolean
  ) => {
    fields.push({ key, label, section, value, category, required });
    if (required && value === null) {
      issues.push({
        code: 'FIELD_MISSING',
        message: `${label} is missing.`,
        blocking: true,
        category,
        fieldKey: key,
      });
    }
  };

  // --- Schedule & totals (from the calculation engine) --------------------------
  const firstRepaymentDate = isIsoDate(input.firstRepaymentDate) ? input.firstRepaymentDate : null;
  let schedule: ScheduleRow[] = [];
  try {
    if (firstRepaymentDate) schedule = buildSchedule(loan, firstRepaymentDate);
  } catch (error) {
    issues.push({
      code: 'SCHEDULE_UNAVAILABLE',
      message: `The repayment schedule could not be calculated: ${(error as Error).message}`,
      blocking: true,
      category: 'loan',
    });
  }
  const interestCents = schedule.reduce((sum, row) => sum + toCents(row.interestDue), 0);
  const cost = computeCostOfCredit(
    { principal: loan.principal, termMonths: loan.termMonths, interestAmount: interestCents / 100 },
    input.pricing
  );
  const totals: AgreementTotals = {
    creditAmount: loan.principal,
    interestRatePercent: loan.interestRate,
    interestAmount: interestCents / 100,
    initiationFee: cost.initiationFee,
    administrationFee: cost.administrationFee,
    otherCharges: cost.otherCharges,
    totalCostOfCredit: cost.totalCostOfCredit,
    totalAmountRepayable: (toCents(loan.principal) + toCents(cost.totalCostOfCredit)) / 100,
    numberOfInstalments: loan.termMonths,
    instalmentAmount: schedule[0]?.totalDue ?? 0,
    finalInstalmentAmount: schedule[schedule.length - 1]?.totalDue ?? 0,
  };

  // --- A. Borrower (application records) ---------------------------------------
  const p = profile;
  add('Borrower', 'clientNumber', 'Client No.', 'application', clean(p?.clientNumber), true);
  add('Borrower', 'surname', 'Borrower surname', 'application', clean(p?.surname), true);
  add('Borrower', 'firstNames', 'Borrower full names', 'application', clean(p?.firstNames), true);
  add('Borrower', 'fullName', 'Borrower full name', 'application', borrowerFullName(p), true);
  add('Borrower', 'idNumber', 'ID / Passport no.', 'application', clean(p?.idNumber), true);
  add(
    'Borrower',
    'residentialAddress',
    'Residential address',
    'application',
    residentialAddress(p),
    true
  );
  add('Borrower', 'mobile', 'Mobile no.', 'application', clean(p?.phone), true);
  add('Borrower', 'employerName', 'Employer', 'application', clean(p?.employerName), true);
  add('Borrower', 'employeeNumber', 'Employer no.', 'application', clean(p?.employeeNumber), false);
  add('Borrower', 'workAddress', 'Work address', 'application', clean(p?.workAddress), true);

  // --- B. Banking (application records) ------------------------------------------
  add('Banking', 'bankName', 'Bank name', 'application', clean(p?.bankName), true);
  add(
    'Banking',
    'accountHolderName',
    'Account holder',
    'application',
    clean(p?.accountHolderName),
    true
  );
  add('Banking', 'accountNumber', 'Account number', 'application', clean(p?.accountNumber), true);
  add('Banking', 'accountType', 'Account type', 'application', clean(p?.accountType), true);
  add('Banking', 'branchName', 'Branch name', 'application', clean(p?.branchName), false);
  add('Banking', 'branchCode', 'Branch code', 'application', clean(p?.branchCode), true);

  // --- C. Transaction (approved loan + calculation engine) -------------------------
  const money = (nad: number) => (schedule.length ? formatNad(nad) : null);
  add('Transaction', 'loanReference', 'Loan reference', 'loan', clean(loan.loanNumber), true);
  add(
    'Transaction',
    'productReference',
    'Loan / Product reference',
    'loan',
    clean(input.productName) ?? `${loanTermLabel(loan.termMonths)} loan`,
    true
  );
  add('Transaction', 'creditAmount', 'Credit Amount (N$)', 'loan', formatNad(loan.principal), true);
  add('Transaction', 'loanTerm', 'Loan Term', 'loan', loanTermLabel(loan.termMonths), true);
  add(
    'Transaction',
    'interestRate',
    'Interest Rate',
    'loan',
    `${loan.interestRate}% per annum`,
    true
  );
  add(
    'Transaction',
    'interestAmount',
    'Interest Amount (N$)',
    'loan',
    money(totals.interestAmount),
    true
  );
  add(
    'Transaction',
    'initiationFee',
    'Initiation / Administration Fee (N$)',
    'loan',
    money(totals.initiationFee + totals.administrationFee),
    true
  );
  add(
    'Transaction',
    'otherCharges',
    'Other Lawful Charges (N$)',
    'loan',
    money(totals.otherCharges),
    true
  );
  add(
    'Transaction',
    'totalCostOfCredit',
    'Total Cost of Credit (N$)',
    'loan',
    money(totals.totalCostOfCredit),
    true
  );
  add(
    'Transaction',
    'totalAmountRepayable',
    'Total Amount Repayable (N$)',
    'loan',
    money(totals.totalAmountRepayable),
    true
  );
  add(
    'Transaction',
    'numberOfInstalments',
    'Number of Instalments',
    'loan',
    String(loan.termMonths),
    true
  );
  add(
    'Transaction',
    'instalmentAmount',
    'Instalment Amount (N$)',
    'loan',
    schedule.length
      ? totals.finalInstalmentAmount !== totals.instalmentAmount
        ? `${formatNad(totals.instalmentAmount)} (final ${formatNad(totals.finalInstalmentAmount)})`
        : formatNad(totals.instalmentAmount)
      : null,
    true
  );
  add(
    'Transaction',
    'repaymentMethod',
    'Repayment Method',
    'loan',
    clean(loan.repaymentMethod) ?? clean(settings?.defaultRepaymentMethod),
    true
  );

  // --- D/E. Execution (contract preparation and acceptance) -----------------------
  add(
    'Execution',
    'agreementDate',
    'Agreement date',
    'contract',
    formatLongDate(input.agreementDate),
    true
  );
  add(
    'Execution',
    'firstRepaymentDate',
    'First repayment date',
    'contract',
    firstRepaymentDate ? formatLongDate(firstRepaymentDate) : null,
    true
  );
  // Captured from the borrower at acceptance, so not required while preparing.
  add('Execution', 'placeOfSigning', 'Signed at', 'contract', clean(input.placeOfSigning), false);
  add(
    'Execution',
    'representativeName',
    'For OG Financial (authorised representative)',
    'company',
    clean(settings?.representativeName),
    true
  );
  add(
    'Execution',
    'representativeDesignation',
    'Designation',
    'company',
    clean(settings?.representativeDesignation),
    true
  );

  // --- Lender (approved company information) --------------------------------------
  const l = settings?.lender;
  add('Lender', 'registeredName', 'Registered name', 'company', clean(l?.registeredName), true);
  add(
    'Lender',
    'tradingName',
    'Trading as',
    'company',
    clean(l?.tradingName) ?? clean(l?.registeredName),
    true
  );
  add(
    'Lender',
    'registrationNumber',
    'Legal registration no.',
    'company',
    clean(l?.registrationNumber),
    true
  );
  add(
    'Lender',
    'regulatoryNumber',
    'Regulatory registration no.',
    'company',
    clean(l?.regulatoryNumber),
    true
  );
  add(
    'Lender',
    'physicalAddress',
    'Trading / physical address',
    'company',
    clean(l?.physicalAddress),
    true
  );
  add(
    'Lender',
    'administrativeAddress',
    'Administrative office address',
    'company',
    clean(l?.administrativeAddress) ?? clean(l?.physicalAddress),
    true
  );
  add('Lender', 'postalAddress', 'Postal address', 'company', clean(l?.postalAddress), true);
  add('Lender', 'contactNumber', 'Contact number', 'company', clean(l?.contactNumber), true);
  add('Lender', 'email', 'Email', 'company', clean(l?.email), true);
  add('Lender', 'website', 'Website', 'company', clean(l?.website), false);
  add('Lender', 'jurisdiction', 'Jurisdiction', 'company', clean(l?.jurisdiction), true);

  issues.push(...configurationIssues(settings, template, input.pricing));
  if (
    schedule.length &&
    loan.monthlyPayment !== undefined &&
    Math.abs(toCents(loan.monthlyPayment) - toCents(totals.instalmentAmount)) > 1
  ) {
    issues.push({
      code: 'INSTALMENT_MISMATCH',
      blocking: true,
      category: 'loan',
      message: `Calculated instalment ${formatNad(totals.instalmentAmount)} differs from the loan record (${formatNad(loan.monthlyPayment)}).`,
    });
  }

  return {
    fields,
    schedule,
    totals,
    loanTerms: {
      principal: loan.principal,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
    },
    issues,
  };
}

/** Lender fields that must be present before settings can be approved. */
export const REQUIRED_LENDER_FIELDS = [
  'registeredName',
  'registrationNumber',
  'regulatoryNumber',
  'physicalAddress',
  'postalAddress',
  'contactNumber',
  'email',
  'jurisdiction',
] as const;

/** True when any configured fee is non-zero. */
export function hasFees(pricing: PricingRule): boolean {
  return Object.values(pricing).some((value) => typeof value === 'number' && value > 0);
}

/**
 * Readiness of the institution-wide configuration, independent of any loan: the
 * Standard Terms and the agreement settings. Shown on the settings page and folded
 * into every agreement's readiness.
 */
export function configurationIssues(
  settings: Doc<'agreementSettings'> | null,
  template: Doc<'agreementTemplates'> | null,
  pricing: PricingRule
): ReadinessIssue[] {
  const issues: ReadinessIssue[] = [];
  if (!template) {
    issues.push({
      code: 'TEMPLATE_MISSING',
      blocking: true,
      category: 'template',
      message: 'No Standard Terms are configured for this institution.',
    });
  } else {
    if (template.status !== 'approved') {
      issues.push({
        code: 'TEMPLATE_NOT_APPROVED',
        blocking: true,
        category: 'template',
        message: `Standard Terms version ${template.version} has not been approved for customer issue.`,
      });
    }
    for (const note of unresolvedDraftingNotes(template.content)) {
      issues.push({
        code: 'DRAFTING_NOTE',
        blocking: true,
        category: 'template',
        message: `Clause ${note.clause} still contains a drafting note: ${note.resolution}`,
      });
    }
  }
  if (hasFees(pricing)) {
    // Credit Policy configures an origination fee, but nothing in the repayment engine
    // (amortization, payment schedules, ledger) charges it. A contract disclosing that
    // fee would not match what the loan collects; one omitting it would contradict the
    // approved policy. Either way the borrower is misinformed, so issue is blocked.
    issues.push({
      code: 'FEES_NOT_SUPPORTED',
      blocking: true,
      category: 'company',
      message: `Credit Policy sets a ${pricing.initiationFeePercent ?? 0}% origination fee, but the repayment engine does not charge fees, so the contract could not match what the loan collects. Set the origination fee to 0% in Credit Policy, or add fee collection to the repayment engine first.`,
    });
  }
  if (!settings) {
    issues.push({
      code: 'SETTINGS_MISSING',
      blocking: true,
      category: 'company',
      message: 'Agreement settings (company information and representative) are not configured.',
    });
    return issues;
  }
  if (!settings.approvedAt) {
    issues.push({
      code: 'SETTINGS_NOT_APPROVED',
      blocking: true,
      category: 'company',
      message: 'Agreement settings have unapproved changes.',
    });
  }
  if (!clean(settings.lender.website)) {
    issues.push({
      code: 'WEBSITE_NOT_SET',
      blocking: false,
      category: 'company',
      fieldKey: 'website',
      message: 'No company website is configured; the agreement shows “—” in its place.',
    });
  }
  return issues;
}

/** Drafting notes still present verbatim in the template's clause text. */
export function unresolvedDraftingNotes(
  content: Doc<'agreementTemplates'>['content']
): Doc<'agreementTemplates'>['content']['draftingNotes'] {
  const allText = content.clauses
    .flatMap((c) => c.blocks)
    .map((b) =>
      b.type === 'paragraph'
        ? b.text
        : b.type === 'bullets'
          ? b.items.join(' ')
          : b.rows.map((r) => `${r.term} ${r.meaning}`).join(' ')
    )
    .join(' ');
  return content.draftingNotes.filter((note) => allText.includes(note.text));
}

/** Field values keyed for convenient lookup by renderers. */
export function fieldMap(fields: AgreementField[]): Record<string, string | null> {
  return Object.fromEntries(fields.map((f) => [f.key, f.value]));
}

/**
 * Fields whose value differs between a frozen snapshot and the current source data.
 * Used to tell staff that a finalized agreement no longer matches the records and a
 * revised version is needed. Execution-only fields are excluded: they legitimately
 * differ between preparation and acceptance.
 */
export function driftedFields(frozen: AgreementSnapshot, live: AgreementSnapshot): string[] {
  const ignore = new Set(['agreementDate', 'placeOfSigning']);
  const liveMap = fieldMap(live.fields);
  return frozen.fields
    .filter((f) => !ignore.has(f.key) && liveMap[f.key] !== f.value)
    .map((f) => f.label);
}
