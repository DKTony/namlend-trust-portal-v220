# Tenancy Coverage Inventory (Phase 1 input)

Pooled multi-tenancy isolates by `institutionId`. This inventory is the scope of **Phase 1
(tenancy hardening)** — it is **not** done in Phase 0 (which is inert). Verified against
`convex/schema.ts`.

> **Phase 1a — DONE (flag-gated):** the 5 "Ready" tables below now have stamp-on-write +
> scope-on-read via the tenant access layer (`convex/lib/tenancy.ts`) + an idempotent backfill
> (`convex/platform/backfill.ts`), all behind the `TENANCY_ENFORCEMENT` businessRule (default
> off → inert). Negative-isolation tests in `convex/tenancy.test.ts`.
>
> **Phase 1b — DONE (flag-gated):** all remaining tenant-owned tables (profiles, kycDocuments,
> loanDocuments, loanApprovals, paymentSchedules, notifications, notificationPreferences,
> communicationLogs, vpaRegistry, consentRecords, ipsApiLogs, ipsTransactions,
> collectionsInteractions, promiseToPay, overdueReminders, complianceReports, bankTransactions,
> reconciliationRuns, mandateExecutions) now carry `institutionId`, are stamped on write
> (parent-loan / parent-mandate / target-user / caller derivation in `resolveWriteInstitution`),
> and staff bulk reads are scoped (collections queue/PTP/reminders/stats, reconciliation
> lists/stats, IPS tx list, overdue payments, listUsers). Backfill covers all of them. Same
> inert flag. `by_institutionId` indexes for these tables are deferred to the compound-index
> perf pass (1b uses filter-after-fetch). **Data-plane isolation is now complete** —
> Phase 3 (console split) is unblocked.

## Ready — `institutionId` present **and** indexed (5) — ✅ enforced in Phase 1a

| Table                 | Field    | Index                 |
| --------------------- | -------- | --------------------- |
| `loans`               | optional | `by_institutionId` ✅ |
| `disbursements`       | optional | `by_institutionId` ✅ |
| `paymentTransactions` | optional | `by_institutionId` ✅ |
| `approvalRequests`    | optional | `by_institutionId` ✅ |
| `mandates`            | optional | `by_institutionId` ✅ |

> Even these are `optional` and currently NULL for legacy rows — Phase 1 stamps + backfills them.

## Field present, **no index** (2) — add index in Phase 1

`productDefinitions`, `accounts`.

## No `institutionId` at all (~30+) — add column+index OR derive from parent

Direct-owner tables (add own `institutionId`): `profiles`, `kycDocuments`, `notifications`,
`notificationPreferences`, `communicationLogs`, `vpaRegistry`, `ipsTransactions`,
`collectionsInteractions`, `promiseToPay`, `overdueReminders`, `complianceReports`,
`bankTransactions`, `reconciliationRuns`.

Child tables (**derive tenancy from parent**, no own column needed if always loaded via parent):
`loanDocuments`→loan, `loanApprovals`→loan, `paymentSchedules`→loan, `mandateExecutions`→mandate,
`consentRecords`→user, `ipsApiLogs`→ipsTransaction, `settlement*`→settlement run.

Platform/shared (NOT tenant-scoped — owned by the control plane): `institutions`,
`institutionConfig`, `plans`, `tenantSubscriptions`, `tenantEntitlements`, `featuresCatalog`,
`platformGuardrails`, `platformAdmins`, `paymentRails`, `businessRules`, `systemConfiguration`,
`tigerBeetle*`, `eventJournal`/`relationships`/`snapshots` (ontology), `auditLogs`/`stateTransitions`
(global audit), `supportAccessAudit`.

## Phase 1 approach (when approved)

1. Add `institutionId` + `by_institutionId` to direct-owner tables; backfill from the owning
   user's `userRoles.institutionId` (or the parent loan/mandate).
2. For child tables, resolve tenancy through the parent via the tenant access layer; do not
   duplicate the column unless query patterns require it.
3. Route every data-plane read/write through `convex/lib/tenancy.ts` helpers
   (`requireTenantContext` + tenant-scoped query helpers) so raw cross-tenant queries can't be
   written by feature modules.
4. Negative-isolation tests: Tenant A cannot read/mutate/search/approve/export Tenant B on any
   path.

**Risk:** this is the highest-risk phase. Cross-tenant leakage is the existential SaaS failure
mode; ship it behind tests, not behind a console.
