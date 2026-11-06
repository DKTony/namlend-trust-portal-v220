# Loan Agreement — Generation, Presentation and Acceptance

**Status:** implemented (2026-11-05). Issue to real customers is **blocked by design** until the
legal and business configuration in [§9](#9-outstanding-dependencies) is completed and approved.

**Source document:** `OG Financial Services CC -loan agreement .pdf` (4 pages,
SHA-256 `7aa0b7241123dd63a0435398cbb4374015ddab3850badfbbf43240a8db0e1829`).

**Outcome:** approving a loan opens a contract already populated from the borrower's own
records. Staff complete anything missing, finalize it and send it. The borrower reviews it
page by page in their account and accepts it. The executed copy is archived and fingerprinted.

---

## 1. Current-state assessment (before this work)

| Question (brief §2)                                    | Finding                                                                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Agreement exists as a document, template or component? | No.                                                                                                                           |
| Admins can view, generate, print, download or send it? | No.                                                                                                                           |
| Clients can access it?                                 | No.                                                                                                                           |
| Linked to loans or approvals?                          | No.                                                                                                                           |
| Customer data flows into it?                           | Only after Phase 0 (PR #63) added the missing fields: client no., name split, banking and employment details.                 |
| E-signature, acceptance, archiving?                    | Building blocks only: `consentRecords`, grant-based private file access (`documentGrants`), and the audit and event emitters. |

Other findings that shaped the build:

- `Loan360View` and `LoanReviewPanel` are not mounted anywhere. The live loan-details screen is
  `LoanDetailsModal`, opened from the loans list.
- Credit Policy defined an `originationFeePercent` (default 2%), but **no code charges it**. Decided
  2026-11-06: no origination fee, and the default is now 0%. See §5.
- The source document's contact email uses an `mgholdingptyltd.com` domain, and its website is a
  literal `[insert]`. Both are flagged in the settings screen rather than copied in silently.

---

## 2. Workflow

```
Client applies ─► Back office approves ─► Draft agreement (same transaction)
                                              │  staff complete missing fields (written to the profile)
                                              │  staff set the first repayment date
                                              ▼
                                         Finalize ─► snapshot frozen, PDF rendered and hashed
                                              ▼
                                         Send ─► client notified in-app
                                              ▼
                              Client opens (Viewed) ─► Client accepts ─► executed PDF ─► Archived
```

- **Approval and acceptance are separate.** `approveLoanCore` creates the draft in the same
  transaction, so every approved loan has an agreement. Approval never waits on the agreement,
  and missing data becomes readiness issues rather than an approval failure.
- **After approving**, from the Loans list or the Approvals queue, staff land on
  `/admin/loans/:loanId/agreement`.
- **View contract** is also available from the loan details screen (`LoanDetailsModal`) and from
  the approved-loans register (the Loans → Approved tab).

### Lifecycle

| Status       | Meaning                                                            | Spec status (brief §8)              |
| ------------ | ------------------------------------------------------------------ | ----------------------------------- |
| _(none)_     | Approved loan without an agreement                                 | Pending Contract                    |
| `draft`      | Generated; reads the source records live; contract fields editable | Contract Generated / Pending Review |
| `ready`      | Finalized: snapshot frozen, PDF hashed, content locked             | Ready for Client                    |
| `sent`       | Issued; borrower notified                                          | Sent to Client / Pending Acceptance |
| `viewed`     | Borrower opened it                                                 | Viewed by Client                    |
| `accepted`   | Borrower accepted; executed copy being produced                    | Accepted/Signed                     |
| `archived`   | Executed copy stored                                               | Archived                            |
| `superseded` | Replaced by a revised version (kept on record)                     | Superseded                          |
| `cancelled`  | Withdrawn by staff, or by rejection of the loan                    | Cancelled                           |

Loan approval, agreement acceptance and disbursement remain **separate statuses**.

---

## 3. Data model

| Table                | Purpose                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `agreementTemplates` | Versioned contractual wording per institution. v1 is the verbatim source; revisions are new versions. Approved versions are never edited.       |
| `agreementSettings`  | Company information, authorised representative, default repayment method and the disbursement gate. Any edit clears approval.                   |
| `loanAgreements`     | One row per version per loan: status, contract fields, the frozen `snapshot` (schema-validated, not `v.any`), PDF ids and SHA-256s, acceptance. |

Acceptance is recorded on the agreement row (`acceptance`) **and** as a `consentRecords` row
(`consentType: 'loan_agreement'`) holding the exact statement the borrower accepted.

PDFs are served only through short-lived grants (`documentAccessGrants`, source table
`loanAgreements`). A permanent storage URL is never issued, because the document carries ID and
banking details.

---

## 4. Field mapping (source → contract)

All fields are produced by one pure function, `buildAgreement` in `convex/lib/agreement/merge.ts`.
The draft preview, finalization, the PDF and both user interfaces use its output, so they cannot
disagree. A value that isn't in a source record is `null`. If the field is required, a `null`
becomes a blocking readiness issue, and the fix is made in the source record.

| Contract field (Schedule A)                                     | Source                                                                     | Category    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------- |
| Client No.                                                      | `profiles.clientNumber` (allocated once, per institution)                  | application |
| Borrower surname / full names                                   | `profiles.surname` / `profiles.firstNames`                                 | application |
| ID / Passport no.                                               | `profiles.idNumber`                                                        | application |
| Residential address                                             | `profiles.addressLine1/2, city, postalCode, country` (else `address`)      | application |
| Mobile no.                                                      | `profiles.phone`                                                           | application |
| Employer / Employer no. / Work address                          | `profiles.employerName / employeeNumber / workAddress`                     | application |
| Bank, holder, account no./type, branch name/code                | `profiles.bankName … branchCode`                                           | application |
| Loan reference                                                  | `loans.loanNumber` (allocated if missing)                                  | loan        |
| Loan / Product reference                                        | product name via `productVersionId`, else "N months loan"                  | loan        |
| Credit Amount                                                   | `loans.principal`                                                          | loan        |
| Loan Term / No. of instalments                                  | `loans.termMonths`                                                         | loan        |
| Interest Rate                                                   | `loans.interestRate` (% per annum, ≤ 32%)                                  | loan        |
| Interest Amount                                                 | Σ `interestDue` from the amortization engine's schedule                    | loan        |
| Initiation fee / Other charges                                  | Credit Policy, computed by `computeCostOfCredit`. See §5                   | loan        |
| Total Cost of Credit / Repayable                                | interest + fees; principal + cost of credit                                | loan        |
| Instalment Amount                                               | first scheduled instalment (final shown if different)                      | loan        |
| Repayment Method                                                | `loans.repaymentMethod`, else the approved settings default                | loan        |
| Repayment schedule (§D)                                         | `generatePaymentSchedule` amounts; due dates from the first repayment date | loan        |
| Agreement date / First repayment                                | finalization date / set during preparation                                 | contract    |
| Signed at                                                       | entered by the borrower on acceptance                                      | contract    |
| Representative / Designation                                    | approved settings                                                          | company     |
| Lender block (name, reg. nos, addresses, contact, jurisdiction) | approved settings                                                          | company     |

**Consistency checks:** the calculated instalment must match `loans.monthlyPayment` to the cent
(`INSTALMENT_MISMATCH`). At disbursement, `ensurePaymentSchedule` inserts the **accepted
schedule's exact rows**, so the loan's repayment schedule is the one the borrower signed.

**Money and dates** are formatted from integer cents and fixed Windhoek dates
(`convex/lib/agreement/format.ts`), never with locale data. That keeps output identical across
runtimes, which the SHA-256 depends on.

---

## 5. Readiness gates — what blocks issue

Finalization is refused while any **blocking** issue remains:

- **Borrower field missing** (`FIELD_MISSING`, category `application`): fixed in **Edit missing
  fields**, which writes to the borrower's profile.
- **Contract field missing**: the first repayment date.
- **Standard Terms** missing, not approved, or still containing a drafting note (`DRAFTING_NOTE`).
- **Settings** missing or unapproved.
- **`FEES_NOT_SUPPORTED`**: Credit Policy sets an origination fee, but nothing in the repayment
  engine (amortization, payment schedules, ledger) charges it. A contract that discloses the fee
  wouldn't match what the loan collects. One that omits it would contradict the approved policy.
  Either set the fee to 0% in Credit Policy, or add fee collection to the repayment engine.
  **Decided 2026-11-06: no origination fee.** The default policy is now 0%. An institution that
  saved its own policy above 0% must set it to 0% under Credit Policy → Fees, which now says the fee
  isn't collected and warns when it's above 0%.
- **`INSTALMENT_MISMATCH`**: the loan record disagrees with the engine.

The source document's **four drafting notes** (clauses 5, 13, 14 and 15) are sentences addressed
to OG Financial, not to the borrower. A template version that still contains any of them cannot be
approved. Final wording is entered through **Settings → Loan Agreement → Replace drafting notes**,
which creates a new version and keeps v1 verbatim. **Nothing in this codebase supplies that wording.**

---

## 6. Acceptance and evidence

The borrower must be signed in. They must:

- type their full name, matched against the agreement;
- enter the last four characters of their ID, matched against the agreement;
- give the place of signing;
- tick an explicit agreement to Schedule A §E's statement.

Recorded with the acceptance:

- the statement, as a consent record;
- the **SHA-256 of the exact PDF shown**;
- the time;
- the user.

The executed PDF adds an _Electronic Acceptance Record_ page and fills the borrower's signature
lines with "Accepted electronically by …". **The lender's authorised signature and date lines stay
blank** for the authorised representative to complete.

**Disbursement gate:** when `requireAcceptedAgreementForDisbursement` is on in the approved
settings, `initiateDisbursement` refuses a loan whose agreement isn't accepted
(`AGREEMENT_NOT_ACCEPTED`). It is off by default, so existing operations are unaffected until the
business switches it on.

---

## 7. Audit trail

Every event writes both stores:

- **`auditLogs`**: action, **responsible user**, outcome and a detail line (loan reference,
  purpose or hash — never PII).
- **`stateTransitions`**: the lifecycle transition and its actor.

`scheduleAuditLog` gained an optional `actorId` for this. Events recorded:

- **Agreement:** `GENERATE`, `SAVE_DRAFT`, `FINALIZE`, `RENDER`, `SEND`, `VIEW`, `DOCUMENT_VIEW`,
  `DOCUMENT_PRINT`, `DOCUMENT_DOWNLOAD`, `ACCEPT`, `ARCHIVE`, `SUPERSEDE`, `CANCEL`,
  `RENDER_FAILED`.
- **Borrower data:** `AGREEMENT_CORRECTION` on the profile, listing field names only.
- **Templates and settings:** `IMPORT`, `REVISE`, `APPROVE`, `RETIRE`, `UPDATE`.

Domain events (`loan.agreement.*`) feed the ontology event journal.

---

## 8. Verification

| Area                      | Evidence                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terms are verbatim        | `scripts/agreement/verify_standard_terms.py` rebuilds the template and compares it with the source PDF: **exact match, 7,689 characters**.                                                                                              |
| Lifecycle (brief §11 A–G) | `convex/loanAgreements.test.ts`, 16 tests, covering approval → draft, missing data, PDF, delivery, acceptance, data consistency, security, revision, audit.                                                                             |
| Pure logic and renderer   | `convex/agreementMerge.test.ts`, 15 tests: dates, money, schedule, readiness, drift, matching, reproducible PDF bytes.                                                                                                                  |
| UI                        | `paginate`, `AgreementDocument`, `LifecycleStepper` and `LoanAgreement` tests, 24 in total.                                                                                                                                             |
| PDF output                | Sample issued and executed copies (test data) checked with `pdfplumber`: **58/58** — A4, header/footer and page X of N on every page, all clauses verbatim, populated fields, schedule, unsplit signature blocks, no stranded headings. |
| Screens                   | Rendered with fixture data at desktop and 375 px widths: no horizontal page scroll; the schedule table scrolls inside its own box.                                                                                                      |

**Not verified:**

- **Against a deployed backend.** The functions aren't pushed (see §9). The E2E flow
  `e2e/ipp-lifecycle.e2e.ts` was updated for the post-approval navigation, but not run.
- **Real delivery beyond the in-app notification.** No SMS or email is sent.
- **The legal sufficiency of in-app acceptance.**

---

## 9. Outstanding dependencies

1. **Legal wording** for clauses 5, 13, 14 and 15 (privacy/consent, cooling-off and early
   settlement, complaints and regulator details). This is required before any version can be
   approved.
2. **Saved Credit Policy fee:** the default is now 0% (decided 2026-11-06). If OG Financial has
   saved its own policy with a non-zero origination fee, set it to 0% under Credit Policy → Fees.
   The agreement settings page shows the effective value.
3. **Company information:** approve the settings. Confirm the contact email domain, the website
   and the representative.
4. **Legal confirmation** that authenticated in-app acceptance satisfies the Electronic
   Transactions Act and NAMFISA requirements for this product. If a wet signature is required,
   use the existing **Signed loan agreement** upload type (`signed_loan_agreement`) and keep the
   disbursement gate on.
5. **Deployment:** push the Convex functions and schema. `npx convex dev` in this repository
   targets the deployment the live site uses.
6. **Optional:** SMS/email delivery of the "agreement ready" notice, through the existing
   notification queue.
