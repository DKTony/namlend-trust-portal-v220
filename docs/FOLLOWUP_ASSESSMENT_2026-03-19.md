# NamLend Trust — Follow-Up Engineering Assessment

**Date**: 2026-03-19
**Type**: Ground-truth codebase audit — remaining work quantification
**Methodology**: Static analysis of actual source files, not documentation claims
**Assessed By**: Frontier Software Design Specialist

---

## Executive Summary

**Overall Production Readiness: 7.5 / 10** _(up from 6.5 at time of quality sweep)_

The platform has made significant progress since the Convex migration. TypeScript compiles cleanly (`npx tsc --noEmit` = 0 errors), strict mode is enabled, and the core loan lifecycle is functionally complete. However, the codebase still carries substantial residual debt from the Supabase-to-Convex migration that will compound if left unaddressed.

### Key Numbers (From Source Code, Not Docs)

| Metric                                       | Count                                                                            | Severity                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `as any` casts in frontend (`src/`)          | **34**                                                                           | Medium — 27 are structural (Convex query return casting), 7 are data logic |
| Legacy Supabase imports in active hooks      | **4 hooks** (`useSettlement`, `useBrandingConfig`, `useUserVPAs`, `useWorkflow`) | Medium — these hooks still call Supabase directly                          |
| `TODO` / `FIXME` markers in source           | **31**                                                                           | High — 22 are unwired Convex mutations (UI buttons that do nothing)        |
| `v.any()` escape hatches in schema           | **29**                                                                           | Medium — undermines end-to-end type safety                                 |
| Legacy debug/test utilities in `src/utils/`  | **26 of 32 files** reference Supabase                                            | Low — dead code, ships in bundle                                           |
| `console.log/warn/error` in Convex backend   | **51**                                                                           | Low — noise in production logs                                             |
| Admin components (not lazy-loaded)           | **97 .tsx files**                                                                | Medium — all bundled together on admin entry                               |
| Frontend components total                    | **218 .tsx files**                                                               | Context — large surface area                                               |
| Convex backend lines of code                 | **6,561**                                                                        | Context — substantial server logic                                         |
| Monolithic schema file                       | **1,130 lines**                                                                  | Medium — single-file bottleneck                                            |
| Financial mutations without idempotency keys | **2** (`recordPayment`, `initiateDisbursement`)                                  | High — double-submit risk                                                  |
| IPS adapter mode                             | **Mock** (no real IPS connectivity)                                              | Critical — production blocker                                              |
| TigerBeetle outbox worker                    | **Simulated** (no live cluster)                                                  | Critical — production blocker                                              |
| CI/CD: Convex auto-deploy on merge           | **Not configured**                                                               | Medium — manual deploy only                                                |
| Legacy `src/services/` files remaining       | **4** (api-client, brandingService, creditScoring, scoringRules)                 | Low — contained                                                            |

---

## Category Breakdown

### 1. Unwired UI (22 TODO markers) — HIGH PRIORITY

These are buttons, modals, and actions in the admin dashboard that look functional but do nothing:

| Component                    | Unwired Action                                | Impact                                             |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `ReconciliationDashboard`    | Auto-match, manual match, import transactions | Admin sees reconciliation UI but can't use it      |
| `CompleteDisbursementModal`  | Complete disbursement button                  | Staff can't complete disbursements from this modal |
| `RecordActivityModal`        | Record collections interaction                | Collections workflow is display-only               |
| `CollectionsWorkqueue`       | Load activity history per loan                | No drill-down into collections history             |
| `RoleManagementModal`        | Remove user role                              | Admin can't demote users                           |
| `WorkflowEditor`             | Save workflow definition edits                | Workflow editing is non-functional                 |
| `IPPOnboardingDashboard`     | All onboarding queries/mutations              | IPP admin is display-only mock                     |
| `BatchOperations`            | Batch loan status update                      | Batch operations non-functional                    |
| `LedgerDashboard`            | Outbox processing, reconciliation             | TigerBeetle admin is display-only                  |
| `PaymentsList`               | Admin record payment                          | Admin can't record payments                        |
| `SelfServicePortal`          | Reschedule requests                           | Client self-service partially broken               |
| `ApprovalNotifications`      | Mark notification as read                     | Notifications don't clear                          |
| `DocumentVerificationSystem` | File upload, requirements fetch               | KYC document upload is stubbed                     |
| `useUsersList`               | Suspend/delete user                           | User management actions broken                     |
| `useUserManagement`          | Update profile, export CSV, suspend           | User management is read-only                       |
| `useDisbursements`           | Process/complete/fail disbursement            | Disbursement workflow buttons are dead             |
| `useLoanActions`             | Disburse loan                                 | Loan action button non-functional                  |

**Estimated effort to wire all 22**: ~16-24 hours (most have Convex mutations already written — just need UI→mutation connection)

### 2. Legacy Supabase Hooks (4 active) — MEDIUM PRIORITY

These hooks still import and call `supabase` directly. They work against the legacy database, not Convex:

| Hook                   | Purpose                 | Convex Equivalent                                      |
| ---------------------- | ----------------------- | ------------------------------------------------------ |
| `useSettlement.ts`     | Settlement runs/reports | `convex/settlement/*` exists — needs rewiring          |
| `useBrandingConfig.ts` | Theme/branding config   | `convex/systemConfig.ts` can store this                |
| `useUserVPAs.ts`       | VPA management          | `convex/ips/vpaRegistry.ts` exists — needs rewiring    |
| `useWorkflow.ts`       | Workflow engine         | `convex/approvalWorkflow.ts` exists — partial coverage |

**Estimated effort**: ~8 hours (settlement is the largest; branding and VPAs are small)

### 3. `as any` Casts (34 total) — MEDIUM PRIORITY

Breakdown by category:

| Category                                           | Count | Example                                       | Fix                                   |
| -------------------------------------------------- | ----- | --------------------------------------------- | ------------------------------------- |
| Convex query return casting (`as any[]`, `as any`) | 12    | `useConvexQuery(...) as any[]`                | Type the query return properly        |
| Config dynamic key mapping                         | 6     | `s[section as keyof ...] = item.value as any` | Type the config object                |
| `useAuth.tsx` profile field mapping                | 5     | `(profileData as any).userId`                 | Type `profileData` from Convex schema |
| TigerBeetle hook casting                           | 3     | `loanId as any`, result `as any`              | Type the hook args/return             |
| Mock stubs / placeholder data                      | 4     | `[] as any[]` in IPP onboarding               | Remove mock, wire real data           |
| UI method access                                   | 2     | `(method as any).highlight`                   | Type the UI component props           |
| Comment-only (no actual cast)                      | 2     | `// no as any (N2)`                           | No action needed                      |

**Estimated effort**: ~6 hours (mechanical but important for a financial platform)

### 4. Dead Code — `src/utils/` (26 Supabase files) — LOW PRIORITY

26 of 32 files in `src/utils/` reference Supabase and are legacy debug/test utilities:

```
assignRoleDirectly.ts, checkDatabase.ts, createAdminUser.ts, createSampleLoans.ts,
createTestUser.ts, debugServiceKey.ts, directPasswordReset.ts, manualPasswordReset.ts,
manualUserCreation.ts, resetUserPassword.ts, serviceRoleAssignment.ts, serviceUtils.ts,
setupUserRole.ts, supabaseDebug.ts, testAuth.ts, testLoanApproval.ts,
testPasswordResetConsole.ts, testRoleAssignment.ts, testSignOut.ts,
testSupabaseAccess.ts, testSupabaseConnection.ts, testUtils.ts, ...
```

These ship in the production bundle via Vite (gated by `VITE_DEBUG_TOOLS` but still bundled). This is **bundle bloat and a potential PII exposure vector** if debug tools are accidentally enabled.

**Fix**: Delete all 26 files. Verify zero consumers first with `grep -rn "from '@/utils/<name>'" src/`.

**Estimated effort**: ~2 hours (verify + delete + test build)

### 5. Schema Architecture (1,130-line monolith + 29 `v.any()`) — MEDIUM PRIORITY

Per the [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md), `convex/schema.ts` should be split into domain slices. The 29 `v.any()` escape hatches on `metadata`, `conditions`, `rawRequest`, `rawResponse`, `context`, and similar fields undermine the end-to-end type safety that Convex provides.

**Estimated effort**: Schema splitting = ~4 hours. Typing `v.any()` fields = ~4 hours.

### 6. Financial Safety Gaps — HIGH PRIORITY

Two critical financial mutations lack idempotency protection:

- **`convex/payments.ts` → `recordPayment`**: No idempotency key. A double-click or network retry creates duplicate payment records.
- **`convex/disbursements.ts` → `initiateDisbursement`**: No idempotency key. Same risk for disbursements.

Only `ipsTransactions.msgId` has idempotency today.

Additionally, `getMyPayments` in `payments.ts` has an N+1 query pattern — it loops over all user loans and queries `paymentTransactions` per loan separately.

**Estimated effort**: Idempotency = ~2 hours. N+1 fix = ~1 hour.

### 7. CI/CD Gap — MEDIUM PRIORITY

GitHub Actions exist (`ci-web.yml`, `e2e.yml`) with Convex path triggers and schema checks. However:

- **No `npx convex deploy`** step exists in any workflow
- No preview environment deployment for PRs
- All Convex deployments are manual

**Estimated effort**: ~4 hours

### 8. Production Blockers (External Dependencies)

| Blocker                              | Status             | Dependency                                           |
| ------------------------------------ | ------------------ | ---------------------------------------------------- |
| IPS mock adapter → production        | Not started        | Bank of Namibia PSP registration + mTLS certificates |
| TigerBeetle simulated → live cluster | Not started        | Infrastructure provisioning (server + cluster setup) |
| SMS/WhatsApp delivery                | Wired but untested | API keys from Africa's Talking + Meta                |
| Translations (af/de)                 | Not started        | Certified translators                                |

These are **not code work** — they're external dependency resolution. The code adapters are ready.

---

## Work Remaining — Prioritized Effort Estimate

### Tier 1: Ship-Blocking (before any UAT with real users)

| Work Item                                                        | Hours      | Risk                    |
| ---------------------------------------------------------------- | ---------- | ----------------------- |
| Wire 22 TODO mutations (admin UI actions)                        | 16-24h     | Medium                  |
| Add idempotency keys to `recordPayment` + `initiateDisbursement` | 2h         | High (financial safety) |
| Fix N+1 query in `getMyPayments`                                 | 1h         | Low                     |
| Delete 26 dead Supabase utils from bundle                        | 2h         | Low                     |
| **Subtotal**                                                     | **21-29h** |                         |

### Tier 2: Quality Hardening (before production launch)

| Work Item                                | Hours   | Risk   |
| ---------------------------------------- | ------- | ------ |
| Rewire 4 legacy Supabase hooks to Convex | 8h      | Medium |
| Eliminate 34 `as any` casts              | 6h      | Medium |
| Split schema.ts into domain slices       | 4h      | Low    |
| Type 29 `v.any()` metadata fields        | 4h      | Medium |
| Add Convex deploy to CI/CD               | 4h      | Low    |
| **Subtotal**                             | **26h** |        |

### Tier 3: Architectural Evolution (per ARCHITECTURAL_REVIEW.md)

| Work Item                                                        | Hours   | Risk   |
| ---------------------------------------------------------------- | ------- | ------ |
| Domain Event Bus                                                 | 16h     | Medium |
| Frontend modularization (feature slices + lazy admin tabs)       | 12h     | Low    |
| Provider stack cleanup                                           | 2h      | Low    |
| User journey enhancements (stepper, approval cockpit, admin nav) | 16h     | Medium |
| **Subtotal**                                                     | **46h** |        |

### Tier 4: Production Integration (external dependency gated)

| Work Item                    | Hours   | Blocked On      |
| ---------------------------- | ------- | --------------- |
| IPS production adapter       | 4h      | BoN credentials |
| TigerBeetle live cluster     | 4h      | Infrastructure  |
| TB reconciliation assertions | 4h      | Live cluster    |
| SMS/WhatsApp production test | 2h      | API keys        |
| **Subtotal**                 | **14h** |                 |

---

## Total Remaining Work

| Tier                       | Hours        | Status              |
| -------------------------- | ------------ | ------------------- |
| **Tier 1** (ship-blocking) | 21-29h       | Ready to start      |
| **Tier 2** (quality)       | 26h          | Ready to start      |
| **Tier 3** (architecture)  | 46h          | Ready to start      |
| **Tier 4** (integrations)  | 14h          | Blocked on external |
| **Grand Total**            | **107-115h** | ~14-15 working days |

### Recommended Sequencing

```
Week 1-2:  Tier 1 (wire TODOs + financial safety) — unlocks UAT
Week 2-3:  Tier 2 (quality hardening) — production-ready codebase
Week 4-6:  Tier 3 (architecture) — long-term maintainability
Ongoing:   Tier 4 (when credentials/infra arrive)
```

---

## Positive Findings

What's genuinely strong in the current codebase:

1. **`npx tsc --noEmit` = 0 errors** with strict mode ON — impressive for a 218-component financial app
2. **Auth guard pattern** is consistently applied across all 20+ Convex query/mutation files
3. **Audit logging** is fire-and-forget via `scheduleAuditLog()` — never blocks mutations
4. **TigerBeetle outbox pattern** is architecturally correct — atomic with business records
5. **Route-level code splitting** in `App.tsx` with `React.lazy()` for all pages
6. **137 unit tests** passing, E2E infrastructure in place
7. **Zero Supabase imports** in `src/pages/` and `src/components/` (migration truly complete there)
8. **Schema validators are exported** — status enums like `loanStatus`, `txStatus` are reusable

---

## Risk Register

| Risk                                                             | Likelihood                           | Impact                  | Mitigation                   |
| ---------------------------------------------------------------- | ------------------------------------ | ----------------------- | ---------------------------- |
| Double-payment from missing idempotency                          | High (any network hiccup)            | Critical (financial)    | Tier 1: Add idempotency keys |
| Admin performs action that silently fails (TODO stubs)           | Certain (22 dead buttons)            | High (user trust)       | Tier 1: Wire all TODOs       |
| Supabase hooks return stale/empty data                           | Medium (if Supabase instance lapses) | High (broken features)  | Tier 2: Rewire to Convex     |
| `v.any()` metadata allows invalid data to persist                | Medium                               | Medium (data integrity) | Tier 2: Type metadata fields |
| Bundle size grows unchecked (97 admin components, 26 dead utils) | Certain (already happening)          | Low (DX/UX)             | Tier 1 + Tier 3              |

---

## See Also

- [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) — Forward-looking modularization roadmap
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) — Outstanding technical debt register
- [FUNCTIONALITY_MAP.md](./FUNCTIONALITY_MAP.md) — Feature implementation status
- [SWEEP_REPORT.md](./SWEEP_REPORT.md) — Previous quality sweep (2026-03-04)
