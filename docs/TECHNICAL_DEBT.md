# NamLend Trust - Technical Debt & Outstanding Work

**Doc Revision**: 2026-03-19  
**Status**: Active. Settlement-specific debt added Feb 2026. Convex `as any` remediation **COMPLETE** (132→0 casts, Feb 2026). **Milestone C Batch 1 complete (2026-02-23)**: loans + approvals domain frontend consumers fully rewired to Convex. See `docs/convexmigratehandover.md` for full migration status.

> **See also**: [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for the forward-looking modularization roadmap (schema domain slicing, event bus, TigerBeetle primary ledger, frontend feature-sliced design).

---

## Table of Contents

- [Summary](#summary)
- [High Priority](#high-priority)
- [Medium Priority](#medium-priority)
- [Low Priority](#low-priority)
- [Remediation Checklist](#remediation-checklist)
- [Tracking Progress](#tracking-progress)

---

## Summary

Core lending and backoffice workflows are implemented. This document tracks technical debt items that need attention before full production hardening.

### Quick Stats

| Priority   | Count | Status                               |
| ---------- | ----- | ------------------------------------ |
| High       | 4     | Blocking production features         |
| Medium     | 4     | Quality/maintainability issues       |
| Low        | 2     | Nice-to-have improvements            |
| Settlement | 4     | Settlement-specific gaps (see below) |

---

## High Priority

### 1. IPS Adapter is Mock

**Status**: Not Started
**Impact**: Cannot process real IPS payments

**Problem**:

- `convex/actions/ipsAdapter.ts` returns mock responses
- Production IPS API endpoints not configured
- mTLS certificates not set up
- Switch connectivity not established

**Remediation Steps**:

1. Obtain production IPS credentials from Bank of Namibia
2. Generate and configure mTLS certificates:

   ```bash
   # Generate CSR for IPS connectivity
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout namlend-ips.key -out namlend-ips.csr
   ```

3. Set Convex environment secrets:

   ```bash
   npx convex env set IPS_API_URL=https://ips.bon.com.na/api
   npx convex env set IPS_CLIENT_CERT=<base64-cert>
   npx convex env set IPS_CLIENT_KEY=<base64-key>
   npx convex env set IPS_ENABLED=true
   ```

4. Replace mock responses with actual API calls in `convex/actions/ipsAdapter.ts`
5. Implement proper error handling and retry logic
6. Test with IPS sandbox environment first

**Files**:

- `convex/actions/ipsAdapter.ts` — replace mock logic with production IPS API calls
- `convex/ips/` — IPS domain files (5 files)

---

### 2. TigerBeetle Posting is Simulated

**Status**: Not Started
**Impact**: Financial ledger not recording actual transactions

**Problem**:

- `tigerbeetle-outbox-worker` does not connect to a live cluster
- Direct TB client is Node-only and not used by the worker
- Shadow mode records to Supabase but not TigerBeetle

**Remediation Steps**:

1. Deploy TigerBeetle cluster:

   ```bash
   # Production cluster setup
   tigerbeetle format --cluster=0 --replica=0 /data/tigerbeetle/0.tigerbeetle
   tigerbeetle start --addresses=0.0.0.0:3001 /data/tigerbeetle/0.tigerbeetle
   ```

2. Configure Convex environment secrets:

   ```bash
   npx convex env set TIGERBEETLE_ADDRESS=tigerbeetle.namlend.com:3001
   npx convex env set TIGERBEETLE_CLUSTER_ID=0
   ```

3. Update `convex/scheduled/tigerBeetleOutboxWorker.ts`:
   - Import TigerBeetle client (Node.js SDK)
   - Replace simulated posting with actual client calls
   - Implement proper error handling and idempotency
4. Create account structure for NamLend chart of accounts (see `docs/TIGERBEETLE_IMPLEMENTATION.md`)
5. Test with shadow mode comparison before switching

**Files**:

- `convex/scheduled/tigerBeetleOutboxWorker.ts` — replace simulation with live TB client
- `convex/tigerbeetle/` — TigerBeetle domain files (4 files)

**Documentation**:

- [TIGERBEETLE_IMPLEMENTATION.md](./TIGERBEETLE_IMPLEMENTATION.md)
- [TIGERBEETLE_PRODUCTION.md](./TIGERBEETLE_PRODUCTION.md)

---

### 3. Admin Route Guard Blocks Loan Officers

**Status**: ✅ RESOLVED (2026-03-04)
**Impact**: ~~Loan officers cannot access admin dashboard~~

**Problem**:

- `/admin/*` routes use `requireAdmin` in `ProtectedRoute`
- UI components allow loan_officer inside AdminDashboard
- Router blocks loan_officer role at route level

**Remediation Steps**:

1. Update `src/components/ProtectedRoute.tsx`:

   ```typescript
   // Change from:
   if (requireAdmin && !isAdmin) {
     redirect('/dashboard');
   }

   // To:
   if (requireAdmin && !isStaff) {
     redirect('/dashboard');
   }

   // Where isStaff = isAdmin || isLoanOfficer
   ```

2. Add role-based component visibility within admin pages:

   ```typescript
   // Only show certain features to admins
   {isAdmin && <UserManagementPanel />}

   // Show to all staff
   <ApprovalQueue />
   ```

3. Update navigation to show appropriate menu items per role
4. Add E2E tests for loan officer admin access

**Files**:

- `src/components/ProtectedRoute.tsx`
- `src/pages/AdminDashboard/index.tsx`
- `src/components/Layout/AdminSidebar.tsx`

---

### 4. Generated Supabase Types Drift

**Status**: ~~Partial~~ **SUPERSEDED** — Backend is now Convex. Supabase type generation is no longer relevant for active development paths.

**Resolution**: Active frontend components now consume Convex-generated TypeScript types end-to-end via `convex/_generated/`. The `src/integrations/supabase/types.ts` file is retained for reference only alongside the legacy `supabase/` directory.

**Remaining action**: Delete `src/integrations/supabase/types.ts` as part of Batch 3 cleanup once all service consumers are migrated.

---

## Medium Priority

### 1. Unit/Integration Tests

**Status**: ✅ RESOLVED (2026-03-04)
**Impact**: ~~No automated unit test coverage~~

**Resolution**: Vitest (`^4.0.18`) is installed and configured. `npm run test:unit` runs 137 passing tests across 6 test files in `src/tests/`. Coverage includes:

- `loanCalculations.test.ts` — 38 tests (PMT, schedule, DTI, APR enforcement, float safety)
- `creditScoring.test.ts` — credit score computation
- `regulatory.test.ts` — APR limits, currency
- `security.test.ts` — dev tool gating with `vi.stubEnv`
- `scoringRules.test.ts` — scoring rules engine
- `rpc.test.ts` — API contract tests

Run: `npm run test:unit`

---

### 2. PaymentGateway Dead Code

**Status**: Superseded — `src/services/paymentGateway.ts` is legacy dead code with zero active UI consumers (confirmed in Milestone D audit). Payment flows use Convex mutations directly.
**Impact**: No functional impact; dead code cleanup.

**Remediation Steps**:

1. Confirm zero consumers:

   ```bash
   grep -rn "paymentGateway" src/pages/ src/components/ src/hooks/
   # → (no output expected)
   ```

2. Delete `src/services/paymentGateway.ts` if confirmed unused.
3. Payment operations use `useMutation(api.payments.recordPayment)` directly.

**Files**:

- `src/services/paymentGateway.ts` — safe to delete after confirming zero consumers

---

### 3. Credit Scoring Not Integrated (UI)

**Status**: ✅ RESOLVED (2026-03-04) — `submitLoan` now schedules `processLoanApplication`; `kycStatus === "verified"` bug fixed (was comparing against `"approved"` which never matched); UI shows scores in LoanReviewPanel + Loan360View.
**Impact**: ~~Credit score computed server-side but not shown in approval UI~~

**What exists now**:

- `convex/actions/processLoanApplication.ts` — server-side credit scoring runs automatically after loan submission (300–850 scale, DTI check, APR compliance). Writes `creditScore`, `monthlyPayment`, `debtToIncomeRatio`, `recommendation` to the `loans` table.
- `src/services/creditScoring.ts` — client-side AI scoring engine (for pre-flight UX feedback only)
- `CreditScoreDisplay` component exists but is not wired into the approval UI

**Remaining work**:

1. Display `creditScore` and `recommendation` from the loan record in `LoanReviewPanel`
2. Wire `CreditScoreDisplay` to Convex loan data (`api.loans.getLoanById`)
3. Add auto-reject/auto-approve threshold config to `systemConfiguration` table
4. Show DTI ratio and monthly payment estimate in loan application form (pre-submission feedback)

**Files**:

- `convex/actions/processLoanApplication.ts` — server-side scoring (complete)
- `src/services/creditScoring.ts` — client-side AI scoring
- `src/components/CreditScoreDisplay.tsx` — display component (needs wiring)
- `src/pages/AdminDashboard/components/Loan360/Loan360View.tsx` — should show score

---

### 4. Realtime Updates Limited

**Status**: ✅ Resolved for Convex data (Feb 2026)
**Impact**: All Convex-backed data updates reactively via `useQuery()` — no manual subscriptions needed

**Context**:

The backend migration to Convex in Feb 2026 resolved this debt for all queries that use `useQuery(api.*)`. Convex's reactive query model automatically re-runs subscribed queries when underlying data changes — equivalent to per-table Supabase Realtime, but without any subscription code.

Legacy `src/services/` files that still call Supabase RPCs do not benefit from this. Remediation:

1. Migrate remaining `src/services/` files to `useQuery(api.*)` + `useMutation(api.*)` calls (tracked separately under "Migration In Progress")
2. Components already using Convex hooks (`useConvexQuery(api.loans.*)`, etc.) are fully reactive

**Files**:

- ~~`src/hooks/useLoanApplications.ts`~~ — now uses Convex (reactive)
- ~~`src/pages/AdminDashboard/index.tsx`~~ — KPI hooks use Convex queries
- `src/services/*.ts` — legacy files still need migration

---

## Low Priority

### 1. Documentation Snapshots

**Status**: Complete
**Impact**: Historical docs could cause confusion

**Problem**:

- Several docs are historical (release notes, audits, deployment checklists)
- Need clear labeling as snapshots

**Remediation**:

- Added status notes to historical docs (2026-01-15)
- Created `docs/INDEX.md` with clear categorization
- See [INDEX.md](./INDEX.md) for document status

---

### 2. Design System Drift

**Status**: Not Started
**Impact**: Minor visual inconsistency

**Problem**:

- Design system doc references Inter font
- Font not currently imported in project
- Using Tailwind default sans stack

**Remediation Steps**:

1. Option A - Import Inter font:

   ```html
   <!-- In index.html -->
   <link
     href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
     rel="stylesheet"
   />
   ```

   ```css
   /* In tailwind.config.ts */
   fontFamily: {
     sans:
       [ 'Inter',
       ...defaultTheme.fontFamily.sans];
   }
   ```

2. Option B - Update documentation to reflect actual font stack
3. Audit other design system discrepancies

**Files**:

- `index.html`
- `tailwind.config.ts`
- `docs/DESIGN_SYSTEM.md`

---

## Settlement-Specific Debt (Added 2026-02-18)

Items identified during the IPP/IPS settlement compliance review against `docs/settlement.md`.

### S1. Hardcoded Interchange/Switching Fees

**Status**: Open (SET-004)
**Impact**: Fee computation not rule-driven

**Problem**:

- Settlement netting logic uses hardcoded fee values
- Fees should be driven by `settlementFeeRules` Convex table with effective dates and product/MCC context

**Files**:

- `convex/settlement/` — settlement domain files
- `settlementFeeRules` Convex table exists but not consumed by netting logic

---

### S2. Generic Participant Auto-Insertion

**Status**: Open (SET-005)
**Impact**: Pollutes participant master, no sponsored mapping

**Problem**:

- Settlement ingestion auto-inserts unknown participants with generic BICs
- No sponsor resolution for indirect participants
- No validation against authoritative participant master

**Files**:

- `convex/settlement/` — settlement ingestion logic
- `settlementParticipants` Convex table

---

### S3. Settlement UI Download Stubs

**Status**: Open
**Impact**: Report downloads non-functional

**Problem**:

- Pacs009Viewer, NTSLReportViewer, RawDataReportViewer have "Download" buttons that only call `toast.info('Download...')`
- No actual file generation or download logic implemented

**Files**:

- `src/pages/AdminDashboard/components/Reconciliation/Pacs009Viewer.tsx`
- `src/pages/AdminDashboard/components/Reconciliation/NTSLReportViewer.tsx`
- `src/pages/AdminDashboard/components/Reconciliation/RawDataReportViewer.tsx`

---

### S4. Settlement Lifecycle Simulation

**Status**: Open (SET-002)
**Impact**: No real transport/ack-driven state progression

**Problem**:

- UI runs create → process → settle in one action
- Settlement logic simulates NISS acceptance without real SWIFT/NISS integration
- No inbound ack parsing (xsys.001/002/003)
- Full spec conformance tracked in `docs/settlement.md` gap register (SET-001 through SET-012)

**Files**:

- `convex/settlement/` — settlement state machine
- `settlementRuns`, `settlementAcknowledgements` Convex tables

---

## Remediation Checklist

```markdown
## High Priority

- [ ] IPS Adapter: Obtain credentials from Bank of Namibia
- [ ] IPS Adapter: Configure mTLS certificates
- [ ] IPS Adapter: Replace mock in convex/actions/ipsAdapter.ts with production API calls
- [ ] IPS Adapter: Set secrets via `npx convex env set IPS_API_URL=...`
- [ ] IPS Adapter: Set IPS_WEBHOOK_SECRET for signature verification
- [ ] IPS Adapter: Test with IPS sandbox
- [ ] TigerBeetle: Deploy 3-node production cluster
- [ ] TigerBeetle: Set secrets via `npx convex env set TIGERBEETLE_ADDRESS=...`
- [ ] TigerBeetle: Update convex/scheduled/tigerBeetleOutboxWorker.ts with live client
- [x] Admin Routes: Updated ProtectedRoute to allow loan_officer role (requireLoanOfficer guard) — DONE 2026-03-04
- [x] Admin Routes: Role-based component visibility is in place via isAdmin checks

## Medium Priority

- [x] Vitest: Installed and configured (vitest ^4.0.18) — DONE 2026-03-04
- [x] Vitest: 137 tests passing across 6 test files — DONE 2026-03-04
- [x] TypeScript strict mode: Enabled (strict: true, noImplicitAny: true) — DONE 2026-03-04
- [ ] PaymentGateway: Confirm zero consumers and delete src/services/paymentGateway.ts
- [x] Credit Scoring: creditScore + recommendation displayed in LoanReviewPanel + Loan360View — DONE 2026-03-04
- [x] IPS webhook signature verification implemented (HMAC-SHA256) — DONE 2026-03-04
- [x] KYC reviewKycDocument mutation added with audit logging — DONE 2026-03-04

## Low Priority

- [x] Documentation alignment sweep — DONE 2026-03-04
- [ ] Design System: Font decision (Inter font not yet imported)
```

---

## TypeScript Strict Mode (Resolved 2026-03-04)

**Status**: ✅ COMPLETE — `strict: true` and `noImplicitAny: true` enabled in `tsconfig.app.json`. `npx tsc --noEmit` passes with zero errors.

See [ADR 004](./adr/004-typescript-strict-disabled.md) — now marked Superseded.

---

## Convex Backend Type Safety (Resolved 2026-02-22)

**Status**: ✅ COMPLETE — 132→0 `as any` casts. `npx convex dev --once` and `npm run build` both pass cleanly.

See [TYPE_SAFETY_REMEDIATION.md](./TYPE_SAFETY_REMEDIATION.md) for full technical details.

### What Was Done (Phase 1 + Phase 2)

| ID   | Category                               | Count | Resolution                                                                                                                                      |
| ---- | -------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TS-1 | Actions calling wrong namespace        | 9     | Added `recordCreditScore`, `createSystemApprovalRequest`, `getProfileByUserId` internal exports; switched `internal.*` → `api.*` for public fns |
| TS-2 | Schema mismatches / field access casts | 10    | Removed result casts — Convex docs are typed; corrected field names in `settlementNetting.ts`                                                   |
| TS-3 | `status as any` union narrowing        | 7     | Exported union validators from `schema.ts`; all status-filtered list queries now use narrow types                                               |
| TS-4 | `audit.ts` field casts                 | 3     | Changed `triggeredBy`/`userId` schema fields to `v.optional(v.id("users"))`                                                                     |
| TS-5 | Structural (contexts, outbox, actions) | 8     | `GenericQueryCtx<DataModel>`, `Id<"tigerBeetleOutbox">`, `ActionCtx` in helper fns                                                              |

### Side Effects / Bugs Fixed

- `settlementNetting.ts` was reading non-existent fields — silently broken since migration
- `processLoanApplication.ts` was passing `priority: "normal"` which is not in the schema union
- `CollectionsDashboard.tsx` had duplicate `const` declarations (stale Supabase useState + new Convex consts)

---

## Tracking Progress

### Metrics

Track debt reduction over time:

```bash
# Count TODO/FIXME comments
rg "TODO|FIXME" src --type ts -c

# Count any usage (frontend)
rg "\bany\b" src --type ts -c

# Count any usage (Convex backend)
grep -rn "as any" convex/ --include="*.ts" | grep -v _generated | wc -l

# Count console.log (debug remnants)
rg "console\.(log|warn|error)" src --type ts -c
```

### Review Schedule

- **Weekly**: Review high-priority items
- **Bi-weekly**: Medium-priority triage
- **Monthly**: Full debt inventory

---

## See Also

- [TYPE_SAFETY_REMEDIATION.md](./TYPE_SAFETY_REMEDIATION.md) - TypeScript type improvements
- [TESTING.md](./TESTING.md) - Testing strategy
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [INDEX.md](./INDEX.md) - Documentation index
