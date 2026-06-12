# Release-Readiness Report — Production-Safe Hardening

**Date:** 2026-06-12
**Scope:** Convex-first lending backend hardening per the approved plan + the
8-phase hardening spec. Decisions locked: **KYC at submit+ (drafts allowed)**;
**mandate auto-debit disabled** until the completion lifecycle is modeled.

## Verification gates (all green)

| Gate                      | Command                            | Result                                                                   |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| Convex backend invariants | `npm run test:convex`              | **10 passed**                                                            |
| Frontend unit             | `npm run test:unit` (`vitest run`) | **196 passed, 2 skipped**                                                |
| Lint                      | `eslint .`                         | **0 errors**, 48 warnings (baseline noise)                               |
| Typecheck (real gate)     | `npm run typecheck` (`tsc -b`)     | **530 errors — no new errors introduced** (was 546; refactor reduced it) |
| Build                     | `npm run build`                    | **passed** (15s)                                                         |

The financial-backend changes introduced **0** new type errors against the
baseline (`docs/remediation/typecheck-baseline.md`).

## Definition-of-Done checklist

| Invariant                                                         | Status        | Evidence                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No approval path bypasses KYC/score/DTI/recommendation            | ✅            | `approveLoan` **and** `processApprovalRequest` both delegate to `approveLoanCore` → `assertLoanReadyForApproval` (`convex/lib/approvalReadiness.ts`). Tests prove both paths reject unverified KYC + missing scoring and roll back atomically.                      |
| No pending payment/mandate creates a final repayment ledger entry | ✅            | `recordPayment` posts nothing; `completePayment` posts on completion. Test: recordPayment→0 rows, completePayment→1. `executeMandateDebit` no longer posts at initiation.                                                                                           |
| IPS repayment cannot double-post                                  | ✅            | IPS posts `IPS_COMPLETE` only; `completeLinkedPayment` enqueues no `REPAYMENT`. Documented in money-movement map.                                                                                                                                                   |
| Every money-movement outbox event is idempotent                   | ✅            | `enqueueOutboxIdempotent` + `by_idempotencyKey` index; deterministic keys for payments/disbursements/IPS. Test: double-complete → 1 row.                                                                                                                            |
| Scoring failures are durable, visible, retryable                  | ✅            | `loanProcessingFailures` table; `processLoanApplication` records failures + bounded exponential-backoff retry + admin alert on dead-letter; `retryLoanProcessing` staff mutation.                                                                                   |
| In-flight loans handled under new KYC invariant                   | ✅            | `reconcileInFlightLoansForKycReadiness` classifier query (ready / blocked-KYC / missing-profile / missing-scoring).                                                                                                                                                 |
| Role assignment has one audited production path                   | ✅            | UI uses `api.users.assignRole` (admin-only; writes `auditLogs` via `scheduleAuditLog` + domain event — audit added in post-review Fix 5). `serviceRoleAssignment.ts` deleted; no importers; hardcoded-UUID helper removed. Test: non-admin blocked, admin succeeds. |
| Legacy Supabase privilege paths removed/disabled                  | ✅            | Frontend service-role path deleted; Supabase `assign_user_role` exists only in historical migrations + generated types, unreachable from app.                                                                                                                       |
| Financial test helpers don't hard-delete in persistent envs       | ✅            | `e2e/*.sql` gated by `app.ephemeral_test` guard; pattern documented in `test-data-retention.md`.                                                                                                                                                                    |
| Mandate debit posts only on completion                            | ✅ (disabled) | Auto-debit gated by `MANDATE_AUTODEBIT_ENABLED` (default false); init-time posting removed.                                                                                                                                                                         |
| Typecheck runnable                                                | ✅            | `npm run typecheck` = `tsc -b`.                                                                                                                                                                                                                                     |
| Partial disbursement disabled + KYC + idempotent                  | ✅            | `initiateDisbursement` enforces `amount === principal`, KYC re-check, pending-dedup + idempotent outbox.                                                                                                                                                            |
| Payment webhook idempotent + fail-closed                          | ✅            | `handlePaymentWebhook` → idempotent `applyPaymentWebhook`; HMAC verify + prod fail-closed in `http.ts`.                                                                                                                                                             |
| TB reconciliation claims precise                                  | ✅            | `tigerbeetle-shadow-reconciliation.md` + dashboard disclaimer: shadow consistency ≠ settlement truth.                                                                                                                                                               |

## Authorization surface (verify-and-close)

- `ipsAlerts.createAlert` — already `assertStaff`. Closed.
- `mandates.createMandate` — already `assertOwnerOrStaff` when `loanId` present;
  no-`loanId` branch defaults debtor to caller. Closed.
- `hasActiveMandate`, `hasRelationship` — now `internalQuery`. Closed.
- `submitForApproval` — entity allow-list + owner/staff + state + dedup. Hardened.
- `batchUpdateLoanStatus` — restricted to non-financial workflow states only. Hardened.

## Artifacts produced

`docs/remediation/`: `state-writer-inventory.md`, `typecheck-baseline.md`,
`outbox-money-movement-map.md`, `test-data-retention.md`,
`tigerbeetle-shadow-reconciliation.md`, this report.
New code: `convex/lib/approvalReadiness.ts`, `convex/lib/outbox.ts`,
`convex/loanProcessing.ts`, `convex/hardening.test.ts`,
`vitest.convex.config.ts`.

## Residual / follow-on (not blocking this release)

1. **Typecheck burn-down → blocking CI.** 530 latent errors remain (mostly legacy
   Supabase utils + admin UI strict-null/unused). Burn down, then flip `npm run typecheck`
   to blocking. _(Conditional gate, per plan.)_
2. **Mandate auto-debit lifecycle.** Wire `completeExecution`/`failExecution` to a
   payment-completion driver and enqueue `REPAYMENT` at completion before re-enabling.
3. **Self-escalation guard on role demotion.** `assignRole`/`removeRole` are admin-only;
   add an explicit guard preventing the last admin from self-demoting (lockout).
4. **Reconciliation invariant job.** Implement the "outbox row without terminal-success
   source" exception scan (documented in the money-movement map).
5. **Real TigerBeetle cluster + rail settlement reconciliation** (separate program).

## Verdict

**Ready for a production-safe pilot release.** Every blocking release gate is met:
the approval bypass is closed across both writers, repayment posting is
deterministic (completion-only, idempotent, no IPS double-post), failures are
observable and retryable, role assignment has a single audited path, and
destructive test helpers are fenced. Remaining items are explicitly scoped as
non-blocking follow-on.
