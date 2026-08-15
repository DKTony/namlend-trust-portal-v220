# NamLend Trust - Flow Validation Matrix

**Doc Revision**: 2026-08-15  
**Status**: Active (Convex-first). This revision replaces the 2026-04-06 table as evidence.

---

## Purpose

Track action-level conformance between implemented behavior and `docs/FLOWS.md`, using the **live Convex API** as the backend contract.

---

## Evidence rules (read first)

| Treat as evidence                                                     | Do **not** treat as evidence                                                                                               |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `convex/*.test.ts` (especially `lendingLifecycle.test.ts`)            | `e2e/api/*.e2e.ts` (legacy Supabase Edge Functions)                                                                        |
| Playwright specs under `e2e/*.e2e.ts` that actually ran (pass ≠ skip) | Dead RPCs: `submitApprovalRequest`, `create_payment`, `update_approval_status`, `process_loan_payment`, `collectionsAPI.*` |
| `docs/E2E_WIRING_AUDIT_2026-08-15.md`                                 | `docs/FLOW_VALIDATION_REPORT_2026-02-14.md` and the 2026-03-03 audit as current proof                                      |
| UI `useQuery` / `useMutation` against `@/integrations/convex/api`     | `src/services/*` payment/approval helpers                                                                                  |

Skip ≠ VERIFIED. Browser journeys that `test.skip` for missing KYC/fixtures stay `blocked`.

---

## Status Legend

| Status        | Meaning                                            |
| ------------- | -------------------------------------------------- |
| `not_started` | Not yet reviewed                                   |
| `in_progress` | Being validated                                    |
| `pass`        | Matches documented flow on the Convex path         |
| `fail`        | Does not match documented flow                     |
| `blocked`     | Cannot validate due to environment/data dependency |

---

## Flow-Level Baseline

| Flow ID | Flow Name                   | Primary Route(s)                                    | Existing Evidence                                                                                       | Status    | Notes                                                                                                                                 |
| ------- | --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| LF-01   | Loan Application            | `/loan-application`                                 | `convex/lendingLifecycle.test.ts` (create + KYC-gated submit); Playwright `e2e/loan-application.e2e.ts` | `pass`    | Convex persistence **pass**. Browser submit still needs a KYC-complete client fixture.                                                |
| LF-02   | Admin Review and Approval   | `/admin/approvals`                                  | `lendingLifecycle` `processApprovalRequest`; `e2e/admin-approvals-actions.e2e.ts`                       | `pass`    | Same loan id on staff queue is convex-test **pass**. Playwright is control-visibility unless a request exists.                        |
| LF-03   | Disbursement                | `/admin/loans`, disbursement modal                  | `lendingLifecycle` initiate(principal)+complete → `funded`; `api.disbursements.*`                       | `pass`    | Convex **pass**. Live IPS/BoN rail **blocked**.                                                                                       |
| LF-04   | Payments                    | `/payment`, `/loans/:id`                            | `lendingLifecycle` recordPayment (0 outbox) → completePayment (1 outbox); UI uses `api.payments.*`      | `pass`    | Two-phase Convex path **pass**. IPS modal uses `initiateIpsRepayment`, not the unused `initiateIpsTransaction` export.                |
| LF-05   | Collections                 | `/admin/payments` Collections, `/admin/collections` | `api.collections.*`; payments tab re-exports `CollectionsWorkqueue`                                     | `pass`    | Convex queue/PTP/interactions **pass**. Expanded activity uses `listInteractionsByLoan`. Mandate-missing loans stay on the soft path. |
| LF-06   | Notifications               | Header popover, `/admin/batch`                      | Lifecycle inserts; `api.communications.sendCommunication` in-app                                        | `pass`    | In-app **pass**. SMS/email/WhatsApp **blocked** (secrets). `e2e/api/api-notifications.e2e.ts` is not evidence.                        |
| LF-07   | Settlement                  | `/admin/reconciliation`, `/platform/settlement`     | Convex settlement/reconciliation modules                                                                | `blocked` | Rows exist. Live NTSL/NISS transport is not connected. `e2e/api/api-reconciliation.e2e.ts` is not evidence.                           |
| LF-08   | Audit and Compliance        | Admin audit, compliance reports                     | `api.audit.*`; `generateComplianceReport` persists `completed`                                          | `pass`    | Convex **pass**. `e2e/api/api-audit.e2e.ts` is not evidence.                                                                          |
| LF-09   | Budget and Finance Tracking | `/budget`                                           | `api.budget.*`; `lendingLifecycle` owner-scope                                                          | `pass`    | Replaced mock `INITIAL_TRANSACTIONS` / `financeService.*` with Convex tables.                                                         |

---

## Action-Level Validation Table (Convex)

| Flow ID | Step ID   | Role   | Screen/Route            | UI Element                        | Handler                                                                   | Expected Backend Operation                              | Validation Method | Evidence                                 | Status    | Notes                                                                              |
| ------- | --------- | ------ | ----------------------- | --------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------- | ---------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| LF-01   | LF-01-S01 | client | `/loan-application`     | KYC warning CTA                   | `navigate('/kyc')`                                                        | none                                                    | static            | `LoanApplication.tsx`                    | `pass`    | UX only; server still enforces KYC on submit                                       |
| LF-01   | LF-01-S02 | client | `/loan-application`     | Continue                          | local wizard step                                                         | none                                                    | static            | `LoanApplication.tsx`                    | `pass`    | Client-side field gates                                                            |
| LF-01   | LF-01-S03 | client | `/loan-application`     | Submit                            | `api.loans.createLoan` then `api.loans.submitLoan`                        | `loans` insert + `submitLoan` KYC + approval request    | convex-test       | `lendingLifecycle.test.ts`               | `pass`    | **Not** `src/services/approvalWorkflow.ts` / `submitApprovalRequest`               |
| LF-02   | LF-02-S01 | admin  | `/admin/approvals`      | Request card                      | `setSelectedRequest`                                                      | `api.approvalWorkflow.adminListApprovals`               | static + e2e      | `ApprovalManagementDashboard.tsx`        | `pass`    | Selection is local; list is Convex                                                 |
| LF-02   | LF-02-S02 | admin  | `/admin/approvals`      | Approve (`approvals-approve-btn`) | `processApprovalRequest` `{ decision: 'approve' }`                        | `approveLoanCore` → `loans.status=approved`             | convex-test       | `lendingLifecycle.test.ts`               | `pass`    | Toast copy is “loan marked approved”                                               |
| LF-02   | LF-02-S03 | admin  | `/admin/approvals`      | Reject                            | `processApprovalRequest` reject / `rejectLoan`                            | from-status `submitted\|under_review\|approved` only    | convex-test       | `lendingLifecycle.test.ts`               | `pass`    | Funded reject → `INVALID_STATE`                                                    |
| LF-02   | LF-02-S04 | admin  | `/admin/approvals`      | Request info                      | `processApprovalRequest` `requires_info`                                  | approval row patch                                      | static            | code mapping                             | `pass`    | Convex mutation; no dedicated e2e case                                             |
| LF-03   | LF-03-S01 | admin  | `/admin/loans`          | Disburse CTA                      | `initiateDisbursement` with principal amount                              | `disbursements` pending                                 | convex-test       | `lendingLifecycle` + `useLoanActions.ts` | `pass`    | Amount is required (not 0)                                                         |
| LF-03   | LF-03-S02 | admin  | disbursement modal      | Payment method                    | local state                                                               | none until submit                                       | static            | `CompleteDisbursementModal.tsx`          | `pass`    |                                                                                    |
| LF-03   | LF-03-S03 | admin  | disbursement modal      | Complete disbursement             | `completeDisbursement`                                                    | loan `funded` + outbox                                  | convex-test       | `lendingLifecycle.test.ts`               | `pass`    |                                                                                    |
| LF-03   | LF-03-S04 | admin  | IPS disbursement        | Disburse Now                      | `api.ips.ipsTransactions.startLoanDisbursement`                           | IPS tx + adapter                                        | static            | `useIPSPayment.ts`                       | `blocked` | Live BoN **blocked**; Convex path exists. Unused export: `initiateIpsDisbursement` |
| LF-04   | LF-04-S01 | client | `/payment`              | Pay                               | `api.payments.recordPayment`                                              | pending `paymentTransactions`; **no** outbox            | convex-test       | `Payment.tsx` + `lendingLifecycle`       | `pass`    | **Not** `create_payment` RPC                                                       |
| LF-04   | LF-04-S02 | client | `/loans/:id`            | IPS pay CTA                       | open `IPSPaymentModal`                                                    | none until submit                                       | static            | `LoanDetails.tsx`                        | `pass`    |                                                                                    |
| LF-04   | LF-04-S03 | client | IPS modal               | Continue                          | local steps                                                               | none                                                    | static            | `IPSPaymentModal.tsx`                    | `pass`    |                                                                                    |
| LF-04   | LF-04-S04 | client | IPS modal               | Pay now                           | `api.ips.ipsTransactions.initiateIpsRepayment`                            | IPS tx + adapter                                        | static            | `useIPSPayment.ts`                       | `blocked` | Live rail **blocked**. Unused export: `initiateIpsTransaction`                     |
| LF-04   | LF-04-S05 | client | dashboard payment modal | Confirm payment                   | `api.payments.recordPayment`                                              | pending payment                                         | static            | `PaymentModal.tsx`                       | `pass`    | **Not** `process_loan_payment`                                                     |
| LF-04   | LF-04-S06 | staff  | `/admin/payments`       | Complete payment                  | `api.payments.completePayment`                                            | balances + `tigerBeetleOutbox` REPAYMENT + notification | convex-test       | `lendingLifecycle.test.ts`               | `pass`    | Ledger posts on complete, not record                                               |
| LF-05   | LF-05-S01 | staff  | collections             | Queue load                        | `api.collections.getCollectionsQueue`                                     | `collectionsInteractions` / overdue derived             | static            | `CollectionsWorkqueue.tsx`               | `pass`    | Payments-tab mock removed 2026-08-15                                               |
| LF-05   | LF-05-S02 | staff  | collections             | Log interaction                   | `api.collections.recordInteraction`                                       | interaction row                                         | static            | `collections.ts`                         | `pass`    |                                                                                    |
| LF-05   | LF-05-S03 | staff  | collections             | Record PTP                        | `api.collections.createPromiseToPay` (or equivalent collections mutation) | `promiseToPay`                                          | static            | collections module                       | `pass`    |                                                                                    |
| LF-05   | LF-05-S04 | staff  | expanded loan           | Activity history                  | `api.collections.listInteractionsByLoan`                                  | interactions for that loan                              | static            | `CollectionsWorkqueue.tsx`               | `pass`    | Previously documented as a placeholder; query is wired                             |
| LF-06   | LF-06-S01 | any    | notification popover    | Bell                              | `api.notifications.getMyNotifications`                                    | `notifications`                                         | convex-test       | lifecycle notifications                  | `pass`    |                                                                                    |
| LF-06   | LF-06-S02 | staff  | `/admin/batch`          | Send                              | `api.communications.sendCommunication` in-app only                        | `notifications` insert                                  | static            | `BatchOperations.tsx`                    | `pass`    | SMS/email refused with “channel not configured”                                    |
| LF-07   | LF-07-S01 | admin  | reconciliation          | Settlement run                    | `api.reconciliation.*` / `convex/settlement/*`                            | Convex settlement rows                                  | static            | settlement modules                       | `blocked` | Simulate NISS remains labelled; no live clearing                                   |
| LF-08   | LF-08-S01 | admin  | audit / compliance      | Generate report                   | `api.audit.generateComplianceReport`                                      | `complianceReports` `status=completed`                  | convex-test       | `lendingLifecycle.test.ts`               | `pass`    |                                                                                    |
| LF-09   | LF-09-S01 | client | `/budget`               | page load                         | `api.budget.listMyBudgetEntries` / goals / limits                         | owner-scoped rows                                       | convex-test       | `BudgetTracker.tsx`                      | `pass`    | **Not** `financeService.*`                                                         |
| LF-09   | LF-09-S02 | client | `/budget`               | CSV import                        | `api.budget.importBudgetEntries`                                          | `budgetEntries`                                         | static            | `BudgetTracker.tsx`                      | `pass`    |                                                                                    |
| LF-09   | LF-09-S03 | client | `/budget`               | Add Funds                         | `api.budget.addFundsToGoal`                                               | `savingsGoals.currentAmount`                            | convex-test       | `lendingLifecycle.test.ts`               | `pass`    | Cross-user add denied                                                              |
| LF-09   | LF-09-S04 | client | `/budget`               | New Goal                          | `api.budget.createSavingsGoal`                                            | `savingsGoals`                                          | convex-test       | `lendingLifecycle.test.ts`               | `pass`    |                                                                                    |

---

## Control-level remainder (not a frozen every-button matrix)

Wave B records that a **button-level freeze of every route × control** was never produced. Surfaces still outside this table (inventory only, not claimed `pass`):

- Client: dashboard overview widgets, banking/IPP client SM in the browser, profile completion, every filter/sort/pagination control
- Admin chrome: every modal/dropdown/export/search/settings field on loans/clients/payments/analytics/reconciliation
- Platform console writes: tenants, plans, entitlements, guardrails, ledger, TB config, settlement, payment rails, support
- Dead / unmounted: `DocumentVerificationSystem.tsx`, `LoanReviewPanel.tsx`, disabled bulk Export/Notify, admin invite mailer
- Failure-path UX: network errors, ConvexError mapping, ErrorBoundary on `/admin/tenant-info` dual-hat

---

## Unused public Convex exports (no `api.<module>.<name>` in `src/`)

Scan of 354 public `query`/`mutation`/`action` exports vs `src/` (tests and `e2e/` excluded). **Unused ≠ broken** — many are staff/ontology/settlement APIs with no mounted UI, or superseded by a sibling the UI actually calls.

Notable gaps (UI calls the sibling instead, or no screen):

| Export                                                                        | What the UI actually uses / why unused                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ips.ipsTransactions.initiateIpsTransaction` / `initiateIpsDisbursement`      | UI: `initiateIpsRepayment`, `startLoanDisbursement`                    |
| `ips.ipsAliasDirectory.*` (register/deregister/getAliasByAddr/getMyAliases/…) | Client alias writes go through `ipsOnboarding.registerAlias`           |
| `users.generateKycUploadUrl` / `recordKycDocument`                            | Live KYC: `kycDocuments.*`                                             |
| `approvalWorkflow.submitForApproval`                                          | Loans submit via `loans.submitLoan`                                    |
| `ontology.mandates.*`, `consentRecords.*`, `products.*` (most)                | Backend ready; admin UI incomplete                                     |
| `settlement.*` (most)                                                         | Platform/admin settlement screens partial                              |
| `tigerbeetle.outbox` drain / `reconciliation.recordReconciliation`            | Dashboard buttons **disabled** (scheduled worker / no client drain)    |
| `budget.createBudgetEntry` / `upsertBudgetLimit`                              | Tracker uses list/import/goals; create-entry may be unused by the page |

Full machine list from the 2026-08-15 scan is in [E2E_WIRING_AUDIT_2026-08-15.md](./E2E_WIRING_AUDIT_2026-08-15.md) appendix.

---

## Static Gap PR Tasks

Historical FLOW-FIX-\* tickets in `docs/FLOW_FIX_PR_TASKS_2026-02-15.md` targeted the old SPA. Budget CTAs (FLOW-FIX-BUDGET-001/002/003) are closed on Convex. IPS live-rail (FLOW-FIX-IPS-001) remains an infrastructure ticket, not a UI wiring ticket.

---

## Evidence Standards

Each `pass`/`fail` row must include:

- a reproducible test reference (convex-test, Playwright run, or static handler mapping)
- observed result
- backend confirmation (`api.*` + table, not a Supabase RPC name)
- file reference for the handler

---

## Review Cadence

- Update this matrix per PR affecting flow logic.
- Treat [E2E_WIRING_AUDIT_2026-08-15.md](./E2E_WIRING_AUDIT_2026-08-15.md) as the latest wiring evidence pack.
- Publish a summary after each full-cycle validation as `docs/FLOW_VALIDATION_REPORT_YYYY-MM-DD.md`.
