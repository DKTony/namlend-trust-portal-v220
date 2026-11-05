# Loan Agreement Generation & Signature — Design

**Status:** Phase 0 landed (2026-11-05) — data gaps closed. Phases 1–4 not started.
**Source document:** `OG Financial Services CC — Standard Terms and Conditions in respect of Loan Agreement` (4 pages)
**Goal:** on approval, the borrower receives a loan agreement already populated from the data they supplied, signs it, and returns it. No manual typing by staff, no blank fields.

---

## 1. What the source document actually is

Four pages, two very different kinds of content:

| Pages | Content                                                                              | Varies per loan?                                                                  |
| ----- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1–3   | Standard Terms & Conditions, clauses 1–18, plus the wet-signature block in clause 18 | **No** — identical for every borrower. Changes only when legal revises the terms. |
| 4     | `SCHEDULE A — LOAN QUOTATION AND REPAYMENT SCHEDULE`, sections A–E                   | **Yes** — every field is borrower/loan specific.                                  |

This split is the whole design. Treat them as **a versioned template** (pages 1–3) plus **a generated instance** (page 4+), bound together into one PDF and one SHA-256.

Technical facts confirmed from the supplied file:

- No AcroForm. There are no fillable fields to populate — the blanks are drawn rectangles and underscores.
- Pages 1–3 use subset CID fonts (`CIDFont+F1/F2/F3`) → **must be copied verbatim**, never re-typeset.
- Page 4 uses `Helvetica` / `Helvetica-Bold` at 8–8.7pt → matches pdf-lib's `StandardFonts.Helvetica`, so a regenerated page 4 looks like the original.
- Page 4's repayment table (§D) has exactly **one** instalment row. A 6- or 12-month loan needs 6 or 12. Overlay-on-template cannot do this; generation can.

---

## 2. Design principles

These follow from `AGENTS.md` and the existing financial-mutation shape; none are negotiable.

1. **The agreement is a financial record.** Immutable once issued, versioned via `version` / `isCurrent` / `supersededBy`, 7-year retention, no hard deletes. Same shape as `loanDocuments` / `institutionDocuments`.
2. **Freeze the merged values.** The borrower signs _specific numbers_. Never re-render the agreement from live `profiles` / `loans` data — a later profile edit would silently rewrite a signed contract. Persist a `snapshot` of every merged value at generation time and render only from it.
3. **Pin the terms version.** A loan signed under terms v1 renders v1 forever, even after legal publishes v2.
4. **Bind the signature to a hash.** The signature record stores the SHA-256 of the exact PDF bytes that were presented. If the hash doesn't match, the signature doesn't apply to that document.
5. **Multi-tenant from day one.** "OG Financial Services CC" is one row in `institutions`, not a constant. Every lender-side value on page 4 §A resolves from `institutions` + `institutionConfig`. Hardcoding it would make the feature unusable for the second tenant.
6. **Generation never blocks approval.** PDF rendering runs in a scheduled Node action, following the fire-and-forget precedent of `scheduleAuditLog`. A render failure must not roll back an approval — but an unsigned agreement _does_ block disbursement, so failures are visible and recoverable rather than silent.

---

## 3. Field map — template field → data source

### Schedule A §A — Lender (all from `institutions`)

| Template field                     | Source                                       | Status |
| ---------------------------------- | -------------------------------------------- | ------ |
| Lender / Registered name           | `institutions.legalName` ?? `.name`          | ✅     |
| Registration no. (`CC/2025/12791`) | `institutions.registrationNumber`            | ✅     |
| Regulatory no. (`25/11/2366`)      | `institutions.regulatoryLicense`             | ✅     |
| Trading address                    | `institutions.licensedAddress` ?? `.address` | ✅     |
| Contact no.                        | `institutions.contactPhone`                  | ✅     |
| Email                              | `institutions.contactEmail`                  | ✅     |
| Website                            | `institutions.website`                       | ✅     |

### Schedule A §A — Borrower

| Template field      | Source                                                     | Status                               |
| ------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Client No.          | `profiles.clientNumber`                                    | ✅ allocated by `ensureClientNumber` |
| Borrower surname    | `profiles.surname`                                         | ✅                                   |
| Borrower full names | `profiles.fullName` (or `firstNames` + `surname`)          | ✅                                   |
| ID / Passport no.   | `profiles.idNumber` (+ `idType`)                           | ✅                                   |
| Residential address | `profiles.addressLine1/2`, `city`, `postalCode`, `country` | ✅                                   |
| Mobile no.          | `profiles.phone`                                           | ✅                                   |
| Employer no.        | `profiles.employeeNumber`                                  | ✅                                   |
| Work address        | `profiles.workAddress`                                     | ✅                                   |

### Schedule A §B — Banking

| Template field            | Source                                | Status |
| ------------------------- | ------------------------------------- | ------ |
| Bank name                 | `profiles.bankName`                   | ✅     |
| Account number            | `profiles.accountNumber`              | ✅     |
| Branch name / Branch code | `profiles.branchName` / `.branchCode` | ✅     |
| Account holder            | `profiles.accountHolderName`          | ✅     |
| Account type              | `profiles.accountType`                | ✅     |

### Schedule A §C — Transaction detail and cost elements

| Template field                       | Source                                               | Status                                                              |
| ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Loan / Product Reference             | `loans.loanNumber`                                   | ✅ allocated in `createLoan`                                        |
| Credit Amount (N$)                   | `loans.principal`                                    | ✅                                                                  |
| Loan Term                            | `loans.termMonths`                                   | ✅                                                                  |
| Interest Rate                        | `loans.interestRate` (APR, ≤ 32%)                    | ✅                                                                  |
| Interest Amount (N$)                 | `calculateTotalInterest()`                           | ✅                                                                  |
| Initiation / Administration Fee (N$) | `loans.initiationFee` / `.administrationFee`         | ⚠️ fields exist; **unpopulated** until the pricing rule is supplied |
| Other Lawful Charges (N$)            | `loans.otherCharges`                                 | ⚠️ as above                                                         |
| Total Cost of Credit (N$)            | `loans.totalCostOfCredit`, via `computeCostOfCredit` | ⚠️ as above                                                         |
| Total Amount Repayable (N$)          | `totalAmountRepayable(principal, cost)`              | ⚠️ equals principal + interest while fees are zero                  |
| Number of Instalments                | `loans.termMonths`                                   | ✅                                                                  |
| Instalment Amount (N$)               | `loans.monthlyPayment`                               | ✅                                                                  |
| Repayment Method                     | `loans.repaymentMethod`                              | ⚠️ field exists; not yet collected in the UI                        |

### Schedule A §D — Repayment schedule

`paymentSchedules` rows are inserted by `ensurePaymentSchedule()` from `completeDisbursement` — i.e. **after** signing. See §6: the schedule must be _projected_ at approval and then honoured at disbursement.

### Schedule A §E + clause 18 — Acceptance / signature

Signed at (place), Date, Borrower full names, ID/Passport, Borrower signature, Client No., For OG Financial (name), Designation, Authorized signature, Date, Loan reference.

---

## 4. Schema additions

```ts
// Versioned terms template — pages 1-3, per institution.
agreementTemplates: defineTable({
  institutionId: v.id('institutions'),
  templateKey: v.string(),            // 'standard_loan_terms'
  version: v.number(),
  isCurrent: v.boolean(),
  fileStorageId: v.id('_storage'),    // the terms PDF, pages 1-3
  sha256: v.string(),
  pageCount: v.number(),
  effectiveFrom: v.number(),
  effectiveTo: v.optional(v.number()),
  approvedBy: v.optional(v.id('users')),   // legal sign-off
  changeReason: v.optional(v.string()),
  createdAt: v.number(),
})
  .index('by_institution_key_current', ['institutionId', 'templateKey', 'isCurrent']),

// One issued agreement instance per loan (per version).
loanAgreements: defineTable({
  institutionId: v.optional(v.id('institutions')),
  loanId: v.id('loans'),
  userId: v.id('users'),
  templateId: v.id('agreementTemplates'),
  templateVersion: v.number(),
  agreementNumber: v.string(),        // human reference on the PDF
  status: v.union(
    v.literal('generating'),
    v.literal('issued'),              // awaiting borrower
    v.literal('signed'),              // borrower signed
    v.literal('countersigned'),       // lender signed — fully executed
    v.literal('declined'),
    v.literal('expired'),
    v.literal('superseded'),
    v.literal('failed'),
  ),
  snapshot: v.any(),                  // every merged value, frozen (see §2.2)
  fileStorageId: v.optional(v.id('_storage')),
  sha256: v.optional(v.string()),     // hash of the unsigned PDF
  signedFileStorageId: v.optional(v.id('_storage')),
  signedSha256: v.optional(v.string()),
  issuedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),  // quotation validity window
  signedAt: v.optional(v.number()),
  countersignedAt: v.optional(v.number()),
  version: v.number(),
  isCurrent: v.boolean(),
  supersededBy: v.optional(v.id('loanAgreements')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_loanId', ['loanId'])
  .index('by_loanId_current', ['loanId', 'isCurrent'])
  .index('by_userId', ['userId'])
  .index('by_status', ['status']),

// Evidence of execution — append-only, never patched.
agreementSignatures: defineTable({
  agreementId: v.id('loanAgreements'),
  institutionId: v.optional(v.id('institutions')),
  signerUserId: v.id('users'),
  signerRole: v.union(v.literal('borrower'), v.literal('lender')),
  method: v.union(
    v.literal('click_accept'),        // typed name + tick
    v.literal('otp'),                 // + SMS one-time code
    v.literal('drawn'),               // + canvas signature image
    v.literal('wet_upload'),          // printed, signed, scanned
  ),
  documentSha256: v.string(),         // the EXACT bytes signed
  typedFullName: v.optional(v.string()),
  idNumberConfirmed: v.optional(v.string()),
  signatureImageStorageId: v.optional(v.id('_storage')),
  place: v.optional(v.string()),      // "Signed at:"
  otpReference: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  consentRecordId: v.optional(v.id('consentRecords')),
  signedAt: v.number(),
})
  .index('by_agreementId', ['agreementId']),
```

The three tables above are **not yet created** — they land with Phases 1–3.

Field additions elsewhere — **all landed in Phase 0**:

- `profiles`: `clientNumber`, `surname`, `firstNames`, `accountHolderName`, `accountType`, `employeeNumber`, `workAddress`, plus a `by_clientNumber` index.
- `loans`: `initiationFee`, `administrationFee`, `otherCharges`, `totalCostOfCredit`, `repaymentMethod`, and a populated `loanNumber`.
- `sequenceCounters` table — per-(institution, name) counters behind `convex/lib/referenceNumbers.ts`.
- `consentType` union: `v.literal('loan_agreement')`.
- `loanProcessingFailures.stage` union: `v.literal('agreementGeneration')`.
- `documentPolicy.LOAN_DOCUMENT_TYPES`: `'signed_loan_agreement'`.

---

## 5. Generation pipeline

```
approveLoanCore()                                   convex/lib/approvalReadiness.ts
  └─ ctx.scheduler.runAfter(0,
       internal.actions.loanAgreement.generateAgreement, { loanId })

generateAgreement  ('use node' action)              convex/actions/loanAgreement.ts
  1. internal query  → loan + profile + institution + template + product pricing
  2. buildSnapshot() → merge + validate every field          convex/lib/agreement/snapshot.ts
  3. renderPdf()     → pdf-lib                               convex/lib/agreement/render.ts
       • copyPages(templateDoc, [0,1,2])   ← terms, byte-identical
       • draw clause-18 signature block values onto page 3
       • addPage() Schedule A §A–§E, Helvetica 8pt
       • paginate §D if the schedule overflows one page
  4. ctx.storage.store(bytes) + sha256
  5. internal mutation → insert loanAgreements (status 'issued')
       + scheduleAuditLog + emitDomainEvent('loan.agreement.issued')
       + emitRelationship(loan -has_agreement-> loanAgreement)
       + notify borrower ("Your agreement is ready to sign")
  on throw → loanProcessingFailures { stage: 'agreementGeneration' }
```

**Why a Node action and not a mutation:** Convex mutations are deterministic and cannot pull in a PDF library or do this much CPU work. `convex/actions/` already carries the `'use node'` precedent for IPS/SMS. Rendering client-side was rejected — the authoritative legal record must not be produced by the browser.

**Why pdf-lib:** pure JS, runs in a Node action, and uniquely supports `copyPages` (verbatim terms) plus `StandardFonts.Helvetica` (matching page 4). An HTML→PDF renderer would need a headless browser, which Convex cannot host.

**Regeneration:** if the loan terms change after issue (re-approval at a different amount), the old row is patched `isCurrent: false, status: 'superseded', supersededBy` and a new version is issued. Nothing is ever deleted or overwritten.

---

## 6. The schedule-drift problem

`ensurePaymentSchedule(ctx, loan, disbursementDate)` anchors instalment 1 to **one month after disbursement**. At signing, the disbursement date is unknown. A signed Schedule A with dates that later turn out wrong is a contract defect.

Three ways out, in order of preference:

1. **Anchor at approval (recommended).** Capture `expectedDisbursementDate` on approval, project the schedule from it, print real dates. At disbursement, if the actual date moves beyond a tolerance (say 5 days), the agreement is superseded and re-issued for signature. Honest dates, with an explicit re-sign path.
2. **Relative dates.** Print "one month after disbursement", "two months after…". Legally safe, but a borrower cannot see when money leaves their account — poor disclosure.
3. **Re-derive and assert.** Generate the real schedule at disbursement and fail closed if it differs from the signed snapshot. Safe, but turns a routine delay into a blocked disbursement.

Whichever is chosen, `ensurePaymentSchedule` should take the signed snapshot as its input rather than recomputing independently, so one function cannot disagree with the signed contract.

---

## 7. Signature flow

The brief — _"on approval, the customer just signs and returns"_ — describes download → print → sign → scan → upload. Support it, but make it the fallback. Recommended primary is in-app execution:

**In-app (primary)**

1. Borrower opens the agreement in the portal (short-lived grant via `createDocumentGrant`, as KYC documents already do — never `storage.getUrl()`).
2. Must scroll/open the document before the accept control enables.
3. Types full name + last 4 of ID, enters "Signed at" place, optionally draws a signature.
4. OTP to the registered phone (reuses the existing SMS action path).
5. `signAgreement` mutation: verifies OTP, re-reads the stored SHA-256 and checks it matches what was presented, inserts `agreementSignatures`, inserts a `consentRecords` row with the exact acceptance text, patches `loanAgreements.status = 'signed'`, emits audit + domain event + relationship.
6. A Node action stamps the signature block onto the PDF and stores it as `signedFileStorageId`.
7. Staff countersign → `status: 'countersigned'` — fully executed.

**Print / upload (fallback)** — borrower uploads a scan as `loanDocuments.documentType = 'signed_loan_agreement'`; staff verifies and records `method: 'wet_upload'`. Same `agreementSignatures` row, same downstream gate.

> **Legal check required.** Electronic signature validity in Namibia (Electronic Transactions Act) and any NAMFISA requirement for a wet signature on a credit agreement must be confirmed with counsel before the in-app path goes live. If a wet signature is mandatory, the fallback becomes the primary and nothing else in this design changes.

---

## 8. Enforcement

Add a guard mirroring `assertKycVerifiedForUser`:

```ts
// convex/lib/agreement/guard.ts
export async function assertAgreementExecutedForLoan(
  ctx: AnyCtx,
  loanId: Id<'loans'>,
  action: string
): Promise<void>;
```

Called at the top of `initiateDisbursement` (`convex/disbursements.ts:114`), immediately after the existing KYC assert. Without this the feature is decorative — nothing stops money moving against an unsigned contract.

Staff override, if allowed at all, must be a separate audited mutation with a mandatory reason, never a flag on the disbursement call.

---

## 9. Audit & ontology

Every transition emits through the existing bridge:

| Event         | `emitDomainEvent`                            | Relationship                                  |
| ------------- | -------------------------------------------- | --------------------------------------------- |
| Issued        | `loan.agreement.issued`                      | `loans -has_agreement-> loanAgreements`       |
| Viewed        | — (grant fetch already audited in `http.ts`) | —                                             |
| Signed        | `loan.agreement.signed`                      | `users -signed-> loanAgreements`              |
| Countersigned | `loan.agreement.countersigned`               | `users -countersigned-> loanAgreements`       |
| Superseded    | `loan.agreement.superseded`                  | `loanAgreements -supersedes-> loanAgreements` |

`scheduleAuditLog` writes both the legacy audit log and the `eventJournal` entry, so the full execution history is reconstructible — which is exactly what a disputed contract requires.

---

## 10. Delivery phases

| Phase    | Scope                                                                                                                                                                             | Ships                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **0** ✅ | Close the data gaps: client number, surname split, account holder/type, employer no., work address, fee fields, `loanNumber` generator. Collect the new fields in the profile UI. | **Done 2026-11-05.** See "Phase 0 as built" below. |
| **1**    | `agreementTemplates` + upload of the terms PDF (pages 1–3) via the admin console; seed OG Financial's institution row.                                                            | Admin can version terms                            |
| **2**    | Snapshot builder + pdf-lib renderer + generation on approval. Borrower can **download** a fully populated agreement.                                                              | The core ask                                       |
| **3**    | In-app signature + OTP + countersign; signed-copy stamping.                                                                                                                       | "Signs and returns"                                |
| **4**    | Disbursement gate, wet-upload fallback, admin agreement register, supersede/re-issue flow.                                                                                        | Enforcement                                        |

Phase 2 alone satisfies "prepopulated so the customer just signs and returns" if they sign on paper.

---

## 11. Phase 0 as built

| Area                                                      | File                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Schema fields, `sequenceCounters` table, union extensions | `convex/schema.ts`                                                         |
| Client / loan number allocation                           | `convex/lib/referenceNumbers.ts`                                           |
| Cost-of-credit module (placeholder rule)                  | `convex/lib/agreementPricing.ts`                                           |
| Client number on enrollment + backfill on sign-in         | `convex/lib/enrollment.ts`                                                 |
| Loan number on draft creation                             | `convex/loans.ts` (`createLoan`)                                           |
| Profile write path widened to every agreement field       | `convex/users.ts` (`updateMyProfile`)                                      |
| Signed-agreement document type                            | `convex/lib/documentPolicy.ts`                                             |
| Profile UI: new banking + employment fields               | `src/components/client/sections/{BankingSection,EmploymentSection}.tsx`    |
| Profile field mapping                                     | `src/components/ClientProfileDashboard.tsx`, `src/hooks/useProfileEdit.ts` |
| Tests (27 new)                                            | `convex/referenceNumbers.test.ts`, `convex/agreementPricing.test.ts`       |

Two things worth knowing about what landed:

**A latent bug was fixed on the way through.** The profile UI rendered editable inputs for bank
name, account number, branch code, branch name and the three employer fields, but
`updateMyProfile` never accepted them — "Save Changes" discarded every one of those edits with no
error. The agreement needs all of them, so the mutation's arg list now covers the full set and
`useProfileEdit` maps them through. `idNumber` is deliberately still excluded: it is identity
evidence bound to a verified KYC package, so it stays fill-not-clobber via `completeEnrollment`
and staff-only otherwise.

**The fee fields are schema-only.** `computeCostOfCredit` returns interest-only under
`DEFAULT_PRICING`, so nothing downstream changes behaviour and no loan is written with a fee
figure. Populating them is the first thing Phase 2 needs, and it is blocked on decision 1 below —
a wrong fee on a credit agreement is worse than an absent one.

Client numbers backfill automatically: `enrollUser` runs on every sign-in and assigns one to any
profile that lacks it, so no migration is needed for the active user base. `ensureClientNumber` is
the safety net for anyone who never signs in again.

---

## 12. Open decisions

1. **Pricing.** The template itself says _"approved product pricing must be inserted into the Loan Schedule before the agreement is used with customers."_ The initiation / administration fee formula is OG Financial's business rule and is not in the codebase. Needed before §C can be rendered.
2. **Do fees count toward the 32% APR cap?** If the cap applies to total cost of credit rather than interest alone, `isValidAPR` and `createLoan` validation must change — this touches existing regulatory tests.
3. **Schedule anchoring** — which of §6's three options.
4. **Signature method** — in-app vs wet, pending the legal check in §7.
5. **Quotation validity window** — how long an issued agreement stays signable before it expires and must be re-priced.
