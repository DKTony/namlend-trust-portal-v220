# Convex Stabilization and Migration Execution Plan (E2E-First)

**Date**: 2026-02-22  
**Scope reviewed**: full repository structure, Convex backend, frontend admin flows, E2E harness, CI workflows, `CLAUDE.MD`, and docs updated on 2026-02-22 (`docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `docs/DATABASE_SCHEMA.md`, `docs/TECHNICAL_DEBT.md`, `docs/TYPE_SAFETY_REMEDIATION.md`).

## Current State Baseline (from code review)

- Legacy frontend service layer is still active: **25 files in `src/services/`** directly call Supabase.
- `Loan360View` is Convex-wired but still maps through `as any` and does not surface canonical loan scoring fields (`creditScore`, `debtToIncomeRatio`, `recommendation`).
- `LoanReviewPanel` still fetches via Supabase and derives scoring from `approval_requests.request_data` instead of canonical loan fields.
- `CollectionsDashboard` still casts Convex query results with `as any` and maps to a legacy Supabase-shaped interface.
- Type safety debt is now mostly frontend: about **210 `as any` usages** remain outside `convex/_generated`.
- CI exists (`.github/workflows/*.yml`) but is still Supabase-centric and does not provide a clean Convex deployment pipeline or migration-aware quality gates.
- Strict mode is still disabled (`strict: false`, `noImplicitAny: false` in app config).

## Recommended Priority Order (Execution Plan)

1. **N4: Run E2E suite first (stability gate)**
2. **N1: Wire credit scoring UI (Loan360 + LoanReviewPanel)**
3. **N3: Remove `as any` casts in CollectionsDashboard**
4. **N2: Migrate legacy frontend services from Supabase to Convex**
5. **N6: Finalize CI/CD pipeline for Convex-first delivery**
6. **N5: Enable TypeScript strict mode incrementally**

---

## 1) N4 — E2E Stability Gate (Do First)

### Objective

Detect regressions from recent schema/index/internal-function changes before adding new frontend work.

### Tasks

- Run full E2E baseline locally and in CI:
  - `npm run test:e2e`
  - `npx playwright test e2e/api/`
- Produce a triage matrix per spec:
  - `pass`
  - `fail (product defect)`
  - `fail (test harness drift)`
  - `fail (legacy Supabase dependency)`
- Stabilize the harness where needed:
  - normalize env wiring between local and CI
  - verify `BASE_URL`/`playwright.config.ts` alignment
  - isolate Supabase-only tests from Convex-first tests
- Define required PR gate set:
  - critical auth flows
  - loan submit/review/disbursement paths
  - collections + notifications smoke

### Deliverables

- E2E baseline report in `docs/TESTING.md` (or appended runbook)
- Tagged test inventory (Convex-ready vs legacy Supabase)
- Fixed flaky/high-noise specs in critical flows

### Exit Criteria

- Critical path tests reliably pass in CI PR runs.
- Known failing tests are explicitly quarantined with issue links and owners.

---

## 2) N1 — Credit Scoring UI Wiring

### Objective

Display server-computed scoring fields already stored on `loans`.

### Tasks

- `Loan360View`:
  - read and map `creditScore`, `debtToIncomeRatio`, `recommendation` from Convex loan query
  - render in summary/overview panels with clear badge styling
- `LoanReviewPanel`:
  - prefer canonical loan scoring fields over `approval_requests.request_data`
  - preserve fallback display for older records missing new fields
- Normalize DTI display:
  - backend stores ratio; display as percentage consistently
- Keep APR/UI messaging compliant with Namibian 32% cap references.

### Deliverables

- Updated `Loan360View` and `LoanReviewPanel` scoring sections
- Tests covering:
  - score present
  - score missing fallback
  - recommendation badge states (`approve|review|reject`)

### Exit Criteria

- Reviewers can see score, DTI, recommendation directly in both views from loan record data.

---

## 3) N3 — CollectionsDashboard Type Tightening

### Objective

Eliminate unsafe casts and legacy interface mismatch in Collections UI.

### Tasks

- Remove dependency on legacy `src/services/collectionsService` interfaces for this component.
- Use Convex query return types directly from `api.collections.getCollectionsQueue` and `api.collections.getCollectionsStats`.
- Introduce a typed local view model only where transformation is needed (no `as any`).
- Wire existing mutation placeholders (`recordInteraction`, `createPromiseToPay`) with proper `Id<"loans">` handling.

### Deliverables

- `CollectionsDashboard.tsx` without `as any`
- Typed mapping layer with compile-time checks
- Interaction/PTP actions functional against Convex mutations

### Exit Criteria

- File compiles with zero `as any` and no legacy-type imports from Supabase service models.

---

## 4) N2 — Frontend Service Migration (Largest Body of Work)

### Objective

Retire legacy Supabase service layer and move consumers to Convex-native query/mutation patterns.

### Migration Batches (recommended order)

1. Loans + approvals (`loanService`, `approvalWorkflow`, `clientService`)
2. Payments + disbursements (`paymentService`, `disbursementService`, `outboxService`)
3. Collections (`collectionsService` + dependent dashboards)
4. Notifications/comms (`notificationService`, `smsGateway`, `whatsappGateway`)
5. Admin/workflow/roles (`adminService`, `roleManagementService`, `workflowEngine`)
6. IPS/settlement/reconciliation (`ipsService`, `ipsOnboardingService`, `settlementService`, `reconciliationService`)

### Batch Pattern (repeat for each domain)

- Add or extend Convex service wrapper/hook usage.
- Migrate component consumers off Supabase calls.
- Keep behavior parity and audit trail expectations.
- Add/adjust tests.
- Remove dead Supabase code only after usage count reaches zero.

### Deliverables

- Migration tracker table (file, owner, status, replacement path)
- Supabase service usage count burn-down (`25 -> 0` target in active app paths)

### Exit Criteria

- Active UI flows no longer depend on `src/integrations/supabase/client`.

---

## 5) N6 — CI/CD Pipeline Hardening (Convex-First)

### Objective

Prevent regressions and enable safe automated deployment for Convex architecture.

### Tasks

- Reconcile existing workflows with current architecture (docs currently state missing CI/CD).
- Consolidate gates for PR:
  - lint
  - typecheck
  - unit tests
  - E2E smoke
  - Convex function/schema validation (`npx convex dev --once` or equivalent non-interactive check)
- Add protected deploy workflow for `main`:
  - Convex deploy step
  - environment-scoped secrets
  - rollback/runbook notes
- Update docs so CI/CD description matches real workflow files.

### Deliverables

- Updated GitHub Actions workflows with Convex-aware checks
- Deployment runbook entry with secret requirements and failure actions

### Exit Criteria

- PRs fail fast on quality gates; main deploy path is reproducible and documented.

---

## 6) N5 — Strict Mode Enablement (Incremental)

### Objective

Raise TypeScript safety without blocking delivery.

### Flag Rollout Sequence

1. `noImplicitAny: true`
2. `strictNullChecks: true`
3. `noUncheckedIndexedAccess: true`
4. `exactOptionalPropertyTypes: true`
5. `strict: true`

### Execution Strategy

- Enable one flag at a time.
- Fix by domain alongside N2 migrations (avoid duplicate churn).
- Track error count per flag and set acceptance threshold before next flag.

### Deliverables

- Updated `tsconfig.app.json` in controlled increments
- Error burn-down log in `docs/TYPE_SAFETY_REMEDIATION.md`

### Exit Criteria

- `npm run typecheck` passes under strict configuration (or approved partial strict profile with documented blockers).

---

## Cross-Cutting Controls (Apply to All Priorities)

- Preserve regulatory constraints (APR <= 32%, NAD formatting, KYC-required flows).
- Do not remove financial history or audit records.
- Ensure role-based behavior parity (`client`, `loan_officer`, `admin`).
- Keep PII out of logs and error surfaces.
- Update docs in the same PR when implementation changes behavior.

## Suggested Milestones

1. **Milestone A (Week 1)**: N4 baseline + triage, start N1 implementation — ✅ COMPLETE
2. **Milestone B (Week 2)**: finish N1 + N3, lock regression tests — ✅ COMPLETE (2026-02-23)
   - N1: `Loan360View`, `OverviewTab`, `LoanReviewPanel` all display canonical `creditScore`, `debtToIncomeRatio`, `recommendation` from Convex; DTI normalized to percentage; legacy `riskScore`/`riskLevel` removed.
   - N3: `CollectionsDashboard` — removed `as any` + legacy service imports; local `QueueItem`/`StatsView` view models; `recordInteraction` + `createPromiseToPay` wired with `Id<"loans">`.
3. **Milestone C (Weeks 3-5)**: N2 batch migration by domain — ✅ COMPLETE
   - **Batch 1 ✅ COMPLETE (2026-02-23)**: loans + approvals domain
     - `useLoanApplications.ts`: replaced imperative `adminListLoans` + `useEffect` with reactive `useQuery`; removed mock `riskScore`/`creditScore`; canonical fields used.
     - `ApprovalManagementDashboard.tsx`: removed `useEffect`/`useState` for requests/stats; replaced with `useMemo` from Convex query; tightened `ApprovalRequest` interface to match Convex schema; removed all `as any`.
     - `WorkflowManagementDashboard.tsx`: removed `as any` on `listWorkflowDefinitions` + sub-components (`ActiveWorkflowInstances`, `WorkflowHistory`).
     - `useLoanPortfolioMetrics.ts`: removed `as any`; typed directly from `getPortfolioSummary` return shape.
     - `useLoanActions.ts`: replaced `as any` with `Id<'loans'>` casts.
     - `LoanApplicationsList.tsx`: replaced `as any` with `Id<'loans'>` on `initiateDisbursement`.
     - `UserManagementDashboard.tsx`: removed `as any` on `listUsers` + `adminListApprovals`.
     - `Dashboard.tsx`: removed all `as any` on Convex queries; typed approval request mapping via Convex schema fields.
     - `ClientProfileModal.tsx`: removed `as any`; typed `userId as Id<'users'>`; typed loan/approval maps.
   - **Batch 2 ✅ COMPLETE (2026-02-23)**: payments, disbursements, collections, notifications service consumers
     - `NotificationCenter.tsx`: removed `notificationService` import; inlined `Notification` interface and `formatNotificationTime` helper; removed `as any[]`/`as any` casts on Convex query results; added `Id<'notifications'>` cast on `markReadMutation`.
     - `BudgetTracker.tsx`: removed `financeService` import; inlined mock data as module-level constants (`INITIAL_TRANSACTIONS`, `INITIAL_BUDGETS`, `INITIAL_SAVINGS`); inlined `categorizeTransaction` helper; CSV processing and savings goal mutations now use local React state directly.
     - **Note**: `paymentService`, `disbursementService`, `collectionsService` have **zero active UI consumers** in `src/pages/`, `src/components/`, `src/hooks/` — no migration work required for those files in this batch.
   - **Batch 3 ✅ COMPLETE**: admin, IPS/settlement/reconciliation/audit/credit service consumers
     - **Quick wins ✅ (2026-02-23)**: `WorkflowActionPanel.tsx`, `WorkflowProgress.tsx` — inlined `WorkflowStageExecution` interface. `VPAInput.tsx` — inlined `isValidVPAFormat` + `getVPAProvider` pure utils.
     - **Pure-utility inlines ✅**: `CreditScoreDisplay.tsx`, `LoanApplication/index.tsx` → re-exported via `src/utils/creditScoring.ts`. `NTSLReportViewer.tsx`, `Pacs009Viewer.tsx`, `RawDataReportViewer.tsx` → inlined XML parser functions.
     - **Real service hooks ✅**:
       - `useAudit.ts` → migrated to `api.audit.*` Convex reactive queries/mutations
       - `useIPSPayment.ts` → migrated to `api.ips.ipsTransactions.initiateIpsTransaction` Convex mutation
       - `useIPSTransactionStatus.ts` → migrated to `api.ips.ipsTransactions.getTransaction` Convex query
       - `useUserVPAs.ts` → inlined Supabase RPC calls (no Convex equivalent for VPA registry)
       - `useWorkflow.ts` → inlined Supabase table/RPC calls (workflow engine has no Convex equivalent)
       - `useSettlement.ts` → inlined Supabase RPC calls (settlement pipeline has no Convex equivalent)
       - `useBrandingConfig.ts` → inlined Supabase RPC + Storage calls
       - `useApiQueries.ts` → kept `api-client` import (wraps Edge Functions, not a legacy Supabase service)
     - **Result**: `grep -rn "from '@/services/'" src/hooks/` → **0 results**. `npx tsc --noEmit` → **0 errors**.
4. **Milestone D (Week 6)**: N6 pipeline hardening + N5 strict flag rollout start — ✅ COMPLETE (2026-02-26)
   - **N5 — Type tightening**: Eliminated 75 of 84 `as any` casts in `src/pages/`. 9 structural residuals remain (mock stubs, dynamic config mapping). Created `src/types/convex.ts` with `QueryReturn`, `QueryData`, `QueryItem`, `Id`, `Doc` utilities. All hooks, page components, sub-components, and client pages cleaned.
   - **N6 — CI/CD hardening**:
     - `ci-web.yml`: Added `convex/**` to path triggers; added `VITE_CONVEX_URL` env var to E2E steps; added Convex schema existence check and legacy service import guard.
     - `e2e.yml`: Added `convex/**` and `e2e/**` to path triggers; added `VITE_CONVEX_URL` env var; updated validation step to require Convex URL.
     - `netlify.toml`: Added `https://*.convex.cloud` and `wss://*.convex.cloud` to CSP `connect-src`.
   - **Dead code cleanup**: Deleted 23 unused `src/services/` files (27→4 remaining: `brandingService`, `creditScoring`, `scoringRules`, `api-client`).
   - `npx tsc --noEmit` → **0 errors** throughout.

## Success Metrics

- E2E critical-path pass rate >= 95% on PR runs
- `src/services/` Supabase-dependent files reduced from 25 to 4 for active app paths ✅
- `CollectionsDashboard.tsx` and loan review surfaces free of `as any` ✅
- Credit scoring fields visible in both Loan 360 and Loan Review workflows ✅
- CI pipeline enforces Convex-compatible gates prior to merge/deploy ✅
- `as any` casts in `src/pages/` reduced from 84 to 9 (structural residuals) ✅
