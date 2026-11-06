/**
 * Loan agreement — shared types and Convex validators.
 *
 * The validators live here (not in schema.ts) so the schema, the mutations and the
 * PDF action all agree on one shape, and so the frozen snapshot of a finalized
 * agreement is schema-checked rather than stored as `v.any()`: it is the record of
 * exactly what the borrower was shown, so a malformed write must fail loudly.
 */

import { v, type Infer } from 'convex/values';

// ---------------------------------------------------------------------------
// Template content (the Standard Terms)
// ---------------------------------------------------------------------------

export const agreementBlock = v.union(
  v.object({ type: v.literal('paragraph'), text: v.string() }),
  v.object({ type: v.literal('bullets'), items: v.array(v.string()) }),
  v.object({
    type: v.literal('definitions'),
    rows: v.array(v.object({ term: v.string(), meaning: v.string() })),
  })
);

export const agreementTemplateContent = v.object({
  title: v.string(),
  scheduleTitle: v.string(),
  parties: v.string(),
  clauses: v.array(
    v.object({ number: v.number(), title: v.string(), blocks: v.array(agreementBlock) })
  ),
  scheduleAcceptance: v.string(),
  draftingNotes: v.array(
    v.object({ clause: v.number(), text: v.string(), resolution: v.string() })
  ),
});

export type AgreementBlock = Infer<typeof agreementBlock>;
export type AgreementTemplateContent = Infer<typeof agreementTemplateContent>;
export type AgreementClause = AgreementTemplateContent['clauses'][number];

// ---------------------------------------------------------------------------
// Settings (company information and representative)
// ---------------------------------------------------------------------------

export const lenderDetails = v.object({
  registeredName: v.optional(v.string()),
  tradingName: v.optional(v.string()),
  registrationNumber: v.optional(v.string()),
  regulatoryNumber: v.optional(v.string()),
  physicalAddress: v.optional(v.string()),
  administrativeAddress: v.optional(v.string()),
  postalAddress: v.optional(v.string()),
  contactNumber: v.optional(v.string()),
  email: v.optional(v.string()),
  website: v.optional(v.string()),
  jurisdiction: v.optional(v.string()),
});

export type LenderDetails = Infer<typeof lenderDetails>;

// ---------------------------------------------------------------------------
// Merged fields and the frozen snapshot
// ---------------------------------------------------------------------------

/**
 * Where a field's value comes from. Drives highlighting and who may correct it:
 *  - application: the borrower's own records (profile) — corrected at source
 *  - loan:        the approved loan and the calculation engine — never edited here
 *  - contract:    captured while preparing or accepting this agreement
 *  - company:     approved agreement settings — edited only in settings
 */
export const fieldCategory = v.union(
  v.literal('application'),
  v.literal('loan'),
  v.literal('contract'),
  v.literal('company')
);

export const agreementField = v.object({
  key: v.string(),
  label: v.string(),
  section: v.string(),
  value: v.union(v.string(), v.null()),
  category: fieldCategory,
  required: v.boolean(),
});

export const scheduleRow = v.object({
  installmentNumber: v.number(),
  /** YYYY-MM-DD, Namibian calendar date. */
  dueDate: v.string(),
  /** Midday Windhoek time on dueDate — stable to render in any timezone. */
  dueDateMs: v.number(),
  principalDue: v.number(),
  interestDue: v.number(),
  totalDue: v.number(),
});

export const agreementTotals = v.object({
  creditAmount: v.number(),
  interestRatePercent: v.number(),
  interestAmount: v.number(),
  initiationFee: v.number(),
  administrationFee: v.number(),
  otherCharges: v.number(),
  totalCostOfCredit: v.number(),
  totalAmountRepayable: v.number(),
  numberOfInstalments: v.number(),
  instalmentAmount: v.number(),
  finalInstalmentAmount: v.number(),
});

export const agreementSnapshot = v.object({
  fields: v.array(agreementField),
  schedule: v.array(scheduleRow),
  totals: agreementTotals,
  /** Loan terms the snapshot was computed from — compared to detect later drift. */
  loanTerms: v.object({ principal: v.number(), interestRate: v.number(), termMonths: v.number() }),
});

export type FieldCategory = Infer<typeof fieldCategory>;
export type AgreementField = Infer<typeof agreementField>;
export type ScheduleRow = Infer<typeof scheduleRow>;
export type AgreementTotals = Infer<typeof agreementTotals>;
export type AgreementSnapshot = Infer<typeof agreementSnapshot>;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * draft      generated on approval; data still read live from source records
 * ready      finalized: snapshot frozen, PDF rendered and hashed, content locked
 * sent       issued to the borrower, who has been notified
 * viewed     the borrower has opened it
 * accepted   the borrower has accepted it; the executed copy is being produced
 * archived   executed copy stored — the final record
 * superseded replaced by a newer version
 * cancelled  withdrawn by staff
 */
export const agreementStatus = v.union(
  v.literal('draft'),
  v.literal('ready'),
  v.literal('sent'),
  v.literal('viewed'),
  v.literal('accepted'),
  v.literal('archived'),
  v.literal('superseded'),
  v.literal('cancelled')
);

export type AgreementStatus = Infer<typeof agreementStatus>;

/** Statuses in which the borrower may see the agreement. */
export const CLIENT_VISIBLE_STATUSES: readonly AgreementStatus[] = [
  'sent',
  'viewed',
  'accepted',
  'archived',
];
