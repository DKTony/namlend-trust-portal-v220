# State-Writer Inventory

> Every domain state reachable through more than one mutation/action must enforce
> the same invariant in **every** writer. This inventory is the gate: no state
> hardening is "done" until all writers for that state are listed and aligned.
> Status reflects the working tree as of 2026-06-12 (post-hardening).

## Loan status → `approved`

| Function                               | File                              | Caller/UI                                    | Guards                                                                      | Status                                                             |
| -------------------------------------- | --------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `approveLoan`                          | `convex/loans.ts`                 | `LoanApplicationsList` → `useLoanActions`    | `assertStaff` → **`approveLoanCore`**                                       | ✅ hardened (delegates to core)                                    |
| `processApprovalRequest` (loan branch) | `convex/approvalWorkflow.ts`      | `ApprovalManagementDashboard`, `useWorkflow` | `assertStaff` → **`approveLoanCore`**                                       | ✅ hardened (was the bypass — now uses core)                       |
| `approveLoanCore` (shared)             | `convex/lib/approvalReadiness.ts` | — (internal helper)                          | `assertLoanReadyForApproval` (KYC + scoring + DTI + recommendation + state) | ✅ single source of truth                                          |
| `batchUpdateLoanStatus`                | `convex/loans.ts`                 | BatchOperations admin                        | `assertAdmin`; blocks terminal/funded                                       | ⚠️ **TODO P3.4**: block approval/disbursement-implying transitions |
| `seedMutations`                        | `convex/seedMutations.ts`         | seed only (`internalMutation`)               | not client-callable                                                         | ✅ internal/seed                                                   |

## Loan status → other (`submitted`, `under_review`, `funded`, `rejected`, `active`, `paid_off`)

| Function                                                             | File                            | Guard / Invariant                               | Status                            |
| -------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------- | --------------------------------- |
| `submitLoan`                                                         | `convex/loans.ts`               | owner-or-staff + **`assertKycVerifiedForUser`** | ✅ KYC-gated at submit (Option B) |
| `createLoan`                                                         | `convex/loans.ts`               | authenticated; **no KYC** (drafts allowed)      | ✅ per locked decision            |
| `moveToReview` / `rejectLoan` / `markFunded`                         | `convex/loans.ts`               | staff / internal                                | ✅                                |
| `completeDisbursement` → loan `funded`                               | `convex/disbursements.ts`       | staff; only from `approved`                     | ✅                                |
| `updateIpsTransactionStatusCore` → loan `funded`/`active`/`paid_off` | `convex/ips/ipsTransactions.ts` | internal (IPS callback)                         | ✅ idempotent linked side-effects |

## Payment status & repayment ledger

| Function                      | File                            | Ledger effect                                                          | Status                             |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `recordPayment`               | `convex/payments.ts`            | **none** (pending operational only)                                    | ✅ no longer posts at create       |
| `completePayment`             | `convex/payments.ts`            | REPAYMENT outbox via `enqueueOutboxIdempotent(repayment:payment:{id})` | ✅ post-on-completion + idempotent |
| `applyPaymentWebhook`         | `convex/payments.ts`            | REPAYMENT (same idempotency key as completePayment)                    | ✅ webhook cannot double-post      |
| `failPayment`                 | `convex/payments.ts`            | none                                                                   | ✅ no posted entry to reverse      |
| `completeLinkedPayment` (IPS) | `convex/ips/ipsTransactions.ts` | balance only; ledger via `IPS_COMPLETE`                                | ✅ no REPAYMENT (no double-post)   |

## Mandate execution status

| Function                              | File                                   | Status                                                    |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| `executeMandateDebit`                 | `convex/ontology/mandateExecutions.ts` | ⛔ **auto-debit disabled**; no longer posts at initiation |
| `processDueMandates` (cron)           | `convex/scheduled/mandateExecutor.ts`  | ⛔ gated by `MANDATE_AUTODEBIT_ENABLED` (default false)   |
| `completeExecution` / `failExecution` | `convex/ontology/mandateExecutions.ts` | ⚠️ no callers (lifecycle wiring out of scope — see plan)  |

## Disbursement status & outbox

| Function                  | File                            | Guard / Ledger                                                                    | Status                  |
| ------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| `initiateDisbursement`    | `convex/disbursements.ts`       | staff + **KYC**; full-amount only; pending-dedup                                  | ✅                      |
| `completeDisbursement`    | `convex/disbursements.ts`       | staff + KYC; DISBURSEMENT outbox via `enqueueOutboxIdempotent(disbursement:{id})` | ✅ idempotent           |
| `reverseDisbursement`     | `convex/disbursements.ts`       | staff; `disbursement:reverse:{id}`                                                | ✅ idempotent           |
| `initiateIpsDisbursement` | `convex/ips/ipsTransactions.ts` | staff (+ KYC — verify)                                                            | ⚠️ confirm KYC re-check |

## User role assignment

| Function                                                                              | File                                          | Status                                                             |
| ------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `users.assignRole` / `removeRole`                                                     | `convex/users.ts`                             | ✅ `assertAdmin`, audited — canonical path                         |
| `serviceRoleAssignment.ts` → Supabase `admin-assign-role` fn + `assign_user_role` RPC | `src/utils/` + `supabase/functions/api-admin` | ⛔ **TODO P4**: decommission; repoint UI to `api.users.assignRole` |

## KYC / scoring fields

| Function                                       | File                                       | Status                                                                       |
| ---------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| `reviewKycDocument` → `profiles.kycStatus`     | `convex/users.ts`                          | ✅ admin-only, audited                                                       |
| `recordCreditScore` → score/DTI/recommendation | `convex/loans.ts`                          | ✅ internal (from scoring action)                                            |
| `processLoanApplication`                       | `convex/actions/processLoanApplication.ts` | ⚠️ **TODO P1.5**: durable failure record + retry (currently swallows errors) |
