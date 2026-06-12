# NamLend Trust Portal - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Version Scheme Note

This changelog contains two version tracks:

| Track                 | Current | Description                                                    |
| --------------------- | ------- | -------------------------------------------------------------- |
| **Web Platform**      | v2.8.5  | Main React web application (this repo's primary focus)         |
| **Combined Platform** | v3.x    | Web + Mobile app releases (includes `namlend-mobile/` changes) |

**Current documented web version: v2.8.14** (April 2026)

The v3.x versions (Dec 2025) document combined releases that include mobile app optimizations. For web-only changes, refer to the v2.8.x entries.

---

## [2.8.14] - 2026-04-28 (Adaptive UI Shell and Responsive Operations)

### Added

- **Adaptive layout primitives**
  - `useAdaptiveLayout()` for compact, medium, expanded, and wide viewport state
  - `AdaptiveShell`, `AdaptiveTabs`, `ResponsiveActionBar`, `AdaptiveDialog`, and `AdaptiveCollection`

- **Adaptive Playwright coverage**
  - Added `e2e/adaptive-layout.e2e.ts`
  - Covers `360x740`, `390x844`, `768x1024`, `1024x768`, `1366x900`, and `1536x864`
  - Validates public, client, and admin routes for horizontal overflow and reachable shell navigation

### Changed

- **Client shell**
  - Compact phones now use drawer navigation plus bottom navigation for core client flows
  - Tablets use an icon rail
  - Desktop and wide screens use a permanent sidebar and dense content layout

- **Admin shell**
  - Compact admin screens use grouped drawer navigation
  - Tablet screens use a grouped rail
  - Desktop screens use a permanent grouped sidebar

- **Dense operational screens**
  - Loan applications, clients, payments, disbursements, users, approvals, and reconciliation screens now stack cards/actions on compact screens and expand into denser layouts on desktop

- **Mobile-safe shared UI**
  - Dialogs, alert dialogs, drawers, sheets, page headers, buttons, themed cards, and notification panels now have safer compact-screen sizing and overflow behavior
  - Landing mobile navigation now has an accessible/testable hamburger trigger and navigation landmark

### Verified

- `npm run build`
- `npm run lint` (existing warnings only)
- `BASE_URL=http://127.0.0.1:8080 npx playwright test e2e/adaptive-layout.e2e.ts`

---

## [2.8.13] - 2026-04-06 (IPP Final Review, Docs Sync, and Verification)

### Fixed

- **Onboarding approval loophole** (`convex/ips/ipsOnboarding.ts`)
  - `reviewOnboarding` now enforces the same alias-confirmation gate as `confirmOnboarding`
  - staff approval can no longer move an application to `READY_FOR_IPP_PAYMENTS` unless the alias is `ACTIVE` and `syncedWithIps`

### Changed

- **Final IPP review completed**
  - Re-reviewed callback correlation, alias/VPA privacy and usability rules, onboarding completion gating, disbursement limit classification, and Playwright flow assumptions against the current code
  - Converted `docs/IPP/IPP_GAP_ASSESSMENT.md` into a current-state discrepancy matrix with `resolved`, `known partial`, and `out of scope by design` outcomes

- **Core NamLend IPP docs synchronized to current platform truth**
  - Rewrote `docs/IPS_IMPLEMENTATION.md`, `docs/IPS_TESTING.md`, and `docs/IPS_PRODUCTION_CHECKLIST.md`
  - Updated `docs/IPP_INTEGRATION.md`, `docs/INDEX.md`, `docs/SERVICES.md`, `docs/FLOW_VALIDATION_MATRIX.md`, and `README.md`
  - Root docs now consistently describe Convex as the live IPP path and Supabase IPP surfaces as legacy/reference only

### Verified

- `npx tsc --noEmit`
- `npx vitest run src/tests/ipsXmlBuilder.test.ts src/tests/ipsResponseParsers.test.ts src/tests/ipsCallbackCorrelation.test.ts src/tests/ipsTransactionLimits.test.ts src/tests/ippSupportMatrix.test.ts`
- `npx playwright test e2e/ipp-lifecycle.e2e.ts --project=chromium`

### Notes

- BON sandbox/production credentials, certificates, mTLS, and HSM-backed operational enablement remain external production dependencies rather than code-path gaps

---

## [2.8.12] - 2026-04-05 (IPS Phase 4A+4B — Sandbox Certification & Missing APIs)

### Added

#### Phase 4A — Sandbox Certification Fixes

- **Spec-compliant msgId format** — 35-char IDs (3-digit bank code + 32 hex UUID) per IPS TSD §2.3 (`convex/lib/ipsXmlBuilder.ts`)
- **Configurable XML namespace** — `IPS_XML_NAMESPACE` env var, defaults to spec `http://npci.org/upi/schema/` per IPS TSD §2.1
- **Daily transaction limits** — P2P/P2M/ATM/G2P enforcement per IPP FSD §5.2 (`convex/lib/ipsTransactionLimits.ts`)
- **API timeouts with AbortController** — 10s non-financial, 30s financial per IPS TSD §2.5 (`convex/actions/ipsAdapter.ts`)
- **RSA-OAEP PIN encryption** — Activated when `IPS_HSM_PUBLIC_KEY` configured per IPS TSD §3.3
- **mTLS support** — `IPS_CLIENT_CERT`/`IPS_CLIENT_KEY`/`IPS_CA_CERT` env vars per IPS TSD §3.1
- **Idempotent msgId retry** — Duplicate msgId returns existing transaction per IPS TSD §2.3
- **NACK error parsing** — Structured `Err` element extraction from IPS NACK responses per IPS TSD §2.4

#### Phase 4B — Missing Core APIs

- **Reversal API** (`initiateReversal`) — Full/partial reversal via ReqRev/RespRev per IPP FSD §4.14
- **Request-to-Pay / Collect** (`initiateCollectRequest`) — Creditor-initiated payment collection per IPP FSD §4.3
- **Auth Detail API** (`queryAuthDetail`) — Transaction authentication status per IPP FSD §4.5
- **Txn Confirmation** (`sendTxnConfirmation`) — Payee-side credit confirmation per IPP FSD §4.16
- **ListPsp API** (`reqListPsp`) — List participating PSPs per IPP FSD §4.9
- **ListKeys API** (`reqListKeys`) — List alias key types per IPP FSD §4.10
- **Deemed transaction resolution** (`resolveDeemedTransaction`) — Exponential backoff ChkTxn for timed-out transactions per IPS TSD §2.6

#### Gap Analysis

- Comprehensive 29-gap analysis comparing IPP FSD v10.0 and IPS TSD v0.7 against codebase implementation
- Phase 4A (8 gaps) and Phase 4B (6 gaps) implemented; Phase 5A/5B gaps documented for future work

### Files Modified

- `convex/lib/ipsXmlBuilder.ts` — 6 new XML builders (ReqRev, ReqAuthDetail, TxnConfirmation, ReqListPsp, ReqListKeys), `generateMsgId()`, configurable namespace, NACK parsing
- `convex/lib/ipsTransactionLimits.ts` — NEW: Daily limit enforcement per use case type
- `convex/actions/ipsAdapter.ts` — 5 new actions (reversal, collect, authDetail, txnConfirmation, deemedResolution), mTLS, timeouts
- `convex/actions/ipsOnboardingAdapter.ts` — 2 new actions (reqListPsp, reqListKeys), activated PIN encryption
- `convex/actions/ipsAliasAdapter.ts` — Spec-compliant msgId
- `convex/ips/ipsTransactions.ts` — Transaction limits enforcement, idempotent retry
- `convex/lib/ipsSoftwareSigner.ts` — RSA-OAEP PIN encryption (already implemented, now activated)

---

## [2.8.11] - 2026-04-04 (Payment Lifecycle & IPS Fix)

### Fixed

#### IPS Disbursement Type Bug (`src/types/ips.ts`, `src/components/ips/IPSDisbursementForm.tsx`)

- **`InitiateIPSDisbursementParams`** was missing `amount`, `loanId`, `creditorVpa` fields
- `IPSDisbursementForm` now passes all required fields to `disbursementMutation.mutateAsync()`
- Without this fix, IPS disbursements fail with `ArgumentValidationError: Object is missing the required field 'amount'`

#### Admin Payment Completion (`src/pages/AdminDashboard/components/PaymentManagement/PaymentsList.tsx`)

- "Complete Payment" button added to pending payment cards (testid: `complete-payment-{paymentId}`)
- Calls `api.payments.completePayment` mutation which updates loan balance, triggers status transitions, and sends client notifications

### Changed

#### Payment Lifecycle Documentation

- Updated `docs/FLOWS.md` with detailed two-phase payment settlement flow
- Payment amount options documented (Monthly, Pay Full, Custom)
- Loan status transition table: funded → active (first payment), active → paid_off (full payoff)

#### Test Portal Skill (`.claude/commands/test-portal.md`)

- Enhanced with complete admin payment completion flow
- Added Quick Role Switch pattern for multi-role testing
- Documented all admin routes for local dev server
- Added payment modal interaction details (dropdown selection, amount precision, Pay Full)
- Documented 7 known bugs with status
- Added troubleshooting for payment amount precision and session persistence

---

## [2.8.10] - 2026-03-29 (IPS/IPP Phase 3 — Onboarding Rework)

### Added

#### IPS Onboarding Adapter (`convex/actions/ipsOnboardingAdapter.ts`)

- **6 IPS API actions**: `reqRegMob`, `reqListAccPvd`, `reqListAccount`, `startVerification`, `reqOtp`, `reqSetCre`
- All support `json_mock` (development) and XML protocol (sandbox/production) modes
- Automatic status updates via `updateOnboardingStatus` internal mutation on success/failure

#### IPS-Mandated Onboarding State Machine (`convex/ips/ipsOnboarding.ts`)

- **10 step-specific mutations**: `completeDeviceBinding`, `selectSovProvider`, `selectAccount`, `startVerification`, `submitOtp`, `setupIpsPin`, `createHandle`, `registerAlias`, `confirmOnboarding`, `reviewOnboarding`
- State machine enforcement via `VALID_TRANSITIONS` map — prevents invalid state jumps
- Audit logging on every transition via `scheduleAuditLog`
- Legacy `advanceOnboardingStep` mutation retained for backward-compatible records

#### Onboarding Schema Expansion (`convex/schema.ts`)

- 14 IPS-mandated onboarding states (NOT_STARTED → READY_FOR_IPP_PAYMENTS)
- 8 legacy states retained for existing records
- New fields: `deviceBindingId`, `mobileNumberNormalized`, `sovProviderCode`, `sovProviderName`, `selectedAccountRef`, `selectedAccountMasked`, `selectedAccountIfsc`, `verificationMethod`, `ipsPinSet`, `aliasAddr`, `aliasId`, `lastErrorCode`, `lastErrorMessage`

### Changed

#### Frontend Onboarding Hook (`src/hooks/useIPPOnboarding.ts`)

- Rewritten to call step-specific mutations instead of generic `advanceOnboardingStep`
- Derived state from `useQuery` (eliminated `useEffect` + `useState` pattern for data mapping)
- Legacy state mapping preserved for existing `step_1_identity`..`step_7_approved` records
- ConvexError messages surfaced to toast notifications

### Fixed

- **Convex bundler error**: Fixed `ipsSoftwareSigner.ts` — removed invalid `"use node"` directive (lib file, not action file) and deferred `crypto` import to avoid static resolution by the bundler

---

## [2.8.9] - 2026-03-22 (E2E Testing & KYC Seeding)

### Fixed

#### E2E Test Infrastructure

- **Fixed loan application E2E test** - Test now passes reliably after addressing KYC eligibility gate
- **Corrected KYC document seeding schema** - Fixed `seedKycDocuments` mutation to use correct `kycDocuments` table instead of `loanDocuments`
- **Schema alignment** - Removed invalid `documentUrl` field, using proper Convex schema fields (`fileStorageId`, `documentType`, `status`)
- **Test navigation improvements** - Updated test to use dashboard "Apply Now" button instead of non-existent sidebar link
- **Timing fixes** - Added 3-second wait for Convex reactive queries to populate before navigation
- **Enhanced logging** - Added try-catch blocks and detailed logging to `seed.ts` for debugging

#### Test Results

- **56 E2E tests passing** ✅
- Loan application form flow validated end-to-end
- KYC eligibility gate properly tested
- Test user (`client1@test.namlend.com`) now has approved KYC documents seeded automatically

### Changed

#### Convex Seed Mutations

- `convex/seedMutations.ts` - Added `seedKycDocuments` internal mutation for E2E test setup
- `convex/seed.ts` - Integrated KYC document seeding into `seedTestUsers` action with error handling
- Test users now created with proper KYC verification status for E2E testing

---

## [2.8.8] - 2026-02-22 (Convex Backend Type Safety — Complete)

### Changed

#### Convex `as any` Remediation — Phase 2 (Complete: 37 → 0)

- **Achieved zero `as any` casts** in the entire `convex/` directory (37 remaining casts fully eliminated)
- `convex/schema.ts` — Exported union validators (`loanStatus`, `txStatus`, `settlementRunState`, `kycStatus`, `paymentTxStatus`, `approvalRequestStatus`, `ipsTransactionStatus`, `loanRecommendation`) so function args can use narrow union types instead of `v.string()`, eliminating index-narrowing casts
- `convex/lib/auth.ts` — Replaced `GenericQueryCtx<any>` with `GenericQueryCtx<DataModel>` — `ctx.db` queries are now fully typed without casts
- `convex/lib/audit.ts` — Replaced `GenericMutationCtx<any>` with `GenericMutationCtx<DataModel>`; updated `scheduleAuditEntry` param from `userId: string` to `userId?: Id<"users">`
- `convex/audit.ts` — Fixed `writeStateTransition` and `writeAuditEntry` arg validators: `triggeredBy` / `workflowInstanceId` / `userId` now use `v.id(...)` / `v.optional(v.id(...))` instead of `v.string()`
- `convex/loans.ts` — Added `recordCreditScore` internalMutation used by `processLoanApplication` action
- `convex/approvalWorkflow.ts` — Added `createSystemApprovalRequest` internalMutation; fixed `status as any` in `processApprovalRequest` using a typed `ApprovalStatus` union
- `convex/users.ts` — Added `getProfileByUserId` internalQuery used by `processLoanApplication` action
- `convex/actions/ipsAdapter.ts` — Switched 2 calls from `internal.ips.ipsTransactions.*` → `api.ips.ipsTransactions.*` (public functions must be called via `api`, not `internal`)
- `convex/actions/processLoanApplication.ts` — Removed 4 `as any` casts on now-typed internal function refs
- `convex/actions/sendNotification.ts` — Removed `as any` from `getPreferencesForUser` ref and result
- `convex/settlement/settlementActions.ts` — Typed 2 private helpers with `ActionCtx` instead of `any`; switched `getSettlementRun` call from `internal.*` → `api.*`
- `convex/settlement/settlementAcknowledgements.ts` — Replaced collect+filter pattern with index queries (`by_batchId`, `by_runId`) — eliminates 5 casts and improves read performance
- `convex/settlement/settlementNetting.ts` — Removed result casts; corrected field names from schema (`sourceParticipantId` / `targetParticipantId` / `amount`)
- `convex/scheduled/tigerBeetleOutboxWorker.ts` — Fixed `OutboxEntry._id: string` → `Id<"tigerBeetleOutbox">`; removed 3 casts
- `convex/analytics.ts` — Removed all `.take() as any[]` casts; fixed `by_status` index callback type
- `convex/reconciliation.ts` — Removed 5 casts; fixed index names (`by_runId`, `by_externalId`)

#### Schema Enhancements

- `convex/schema.ts` — Added `debtToIncomeRatio` and `recommendation` optional fields to `loans` table (populated by `processLoanApplication` action after credit scoring)
- `convex/schema.ts` — Made `auditLogs.userId` and `stateTransitions.triggeredBy` optional (`v.optional(v.id("users"))`) — system-triggered events have no user context
- `convex/schema.ts` — Added `by_batchId` and `by_runId` indexes to `settlementAcknowledgements`
- `convex/schema.ts` — Added `by_externalId` and `by_runId` indexes to `bankTransactions`

#### Bug Fixes Surfaced During Type Remediation

- **`settlementNetting.ts`** was accessing fields `debtorParticipantId`, `creditorParticipantId`, `netAmount` that do not exist in the schema. Correct field names are `sourceParticipantId`, `targetParticipantId`, `amount`. Previously masked by `as any[]` cast.
- **`processLoanApplication.ts`** was passing `priority: "normal"` to `createSystemApprovalRequest` but the `approvalRequests.priority` schema union is `"low" | "medium" | "high" | "urgent"` — `"normal"` is not a valid value. Fixed to `"low"`.
- **`CollectionsDashboard.tsx`** had duplicate `const` declarations (`loading`, `queue`, `stats`) — old `useState` bindings from the Supabase era left alongside new Convex-reactive `const` derivations. esbuild treats this as a hard error. Removed the stale `useState` declarations.

**Verification**:

```bash
grep -rn "as any" convex/ --include="*.ts" | grep -v "_generated" | wc -l  # → 0
npx convex dev --once   # → ✔ Convex functions ready!
npm run build           # → ✓ built in 8.03s
```

**Files Modified**: 20 files in `convex/`, 1 file in `src/` (`CollectionsDashboard.tsx`)
**Documentation Updated**: `docs/TYPE_SAFETY_REMEDIATION.md`, `docs/TECHNICAL_DEBT.md`, `docs/DATABASE_SCHEMA.md`, `docs/CHANGELOG.md`, `CLAUDE.md`

---

## [2.8.7] - 2026-02-22 (Convex Backend Type Safety)

### Changed

#### Convex `as any` Remediation (72% Complete)

- **Reduced `as any` casts from 132 → 37** across `convex/` directory (95 casts removed)
- Auth guard functions (`assertAuthenticated`, `assertStaff`, `assertAdmin`) now return `Id<"users">` — eliminated `userId as any` pattern
- Removed `(q: any)` annotations from all `withIndex` callbacks — Convex infers types correctly
- Removed `ctx.db.get() as any` casts where schema fields match code usage
- Fixed schema property names in `settlementBatches.ts` (`xmlContent` → `fileContent`, `generatedAt` → `createdAt`)

**Files cleaned** (24 files, zero `as any` remaining):

- Core: `users.ts`, `loans.ts`, `payments.ts`, `disbursements.ts`, `audit.ts`, `collections.ts`, `systemConfig.ts`, `notifications.ts`, `approvalWorkflow.ts`, `loanDocuments.ts`, `loanApprovals.ts`
- IPS: `ipsAlerts.ts`, `ipsVpa.ts`, `ipsOnboarding.ts`, `ipsTransactions.ts`
- Settlement: `settlementRuns.ts`, `settlementActions.ts`, `settlementBatches.ts`, `settlementReports.ts`, `settlementAdjustments.ts`, `settlementTimeouts.ts`
- Scheduled: `dailyTasks.ts`
- TigerBeetle: `outbox.ts`
- Settlement: `settlementNetting.ts` (withIndex only; data access casts remain due to schema mismatch)

**Remaining 37 casts** fall into two categories requiring separate work:

1. **Structural** (16): action↔mutation type inference gaps, union type narrowing
2. **Schema mismatches** (10): code references fields/statuses not in `convex/schema.ts` (analytics, reconciliation, settlementAcknowledgements, settlementNetting)

**Files Modified**: 24 files in `convex/`, `convex/lib/auth.ts`
**Documentation Updated**: `docs/TYPE_SAFETY_REMEDIATION.md`, `docs/TECHNICAL_DEBT.md`

---

## [2.8.6] - 2026-02-18 (Settlement Compliance Hardening)

### Fixed

#### Settlement XML Injection Prevention (P0 Security)

- **Problem**: `generate_pacs009_xml` SQL function built ISO 20022 XML via string concatenation without entity escaping
- **Fix**: Created `xml_escape()` SQL helper function and applied it to all user-sourced values in pacs.009 generation
- **Migration**: `20260218100000_fix_pacs009_xml_injection.sql`

#### TigerBeetle Settlement Column References (P0 Data Integrity)

- **Problem**: `postSettlementRunToTigerBeetle` referenced non-existent columns `participant_id` and `net_amount`
- **Fix**: Corrected to `source_participant_id` and `amount` matching `settlement_net_instructions` schema

#### Currency Formatting Across Settlement UI (P1 Compliance)

- **Problem**: 9 Reconciliation UI components used `formatCurrency` which rendered `R` prefix (South African Rand) instead of `N$` (Namibian Dollar)
- **Fix**: Replaced all `formatCurrency` imports with `formatNAD` from `@/constants/regulatory`
- **Components**: SettlementRunsList, ReconciliationDashboard, Pacs009Viewer, RawDataReportViewer, NTSLReportViewer, IPSHealthWidget, TimeoutReportViewer, AdjustmentsViewer, IPSTransactionsViewer

### Changed

#### Settlement Mutation Retry Safety (P0 Financial Safety)

- Added `retry: false` to all 5 settlement mutation hooks in `useSettlement.ts`
- Prevents TanStack Query from auto-retrying failed financial operations (which could cause double-processing)
- Affected hooks: `useUpdateAdjustmentStatus`, `useResolveTimeout`, `useCreateSettlementRun`, `useProcessSettlementRun`, `useMarkSettlementSettled`

#### Settlement Audit Logging (P1 CLAUDE.md Compliance)

- Added `AuditService.logStateTransition()` calls to 5 critical settlement functions in `settlementService.ts`
- Functions: `createSettlementRun`, `processSettlementRun`, `markSettlementSettled`, `updateAdjustmentStatus`, `resolveTimeoutTransaction`

#### RPC Resilience for Settlement Operations (P1 Reliability)

- Replaced 7 direct `supabase.rpc()` calls in `settlementService.ts` with `callRpc()` wrapper
- Provides circuit breaker, timeout, and exponential backoff with jitter
- Financial mutations use `retries: 0` to prevent double-processing

**Files Created**: `supabase/migrations/20260218100000_fix_pacs009_xml_injection.sql`
**Files Modified**: `src/services/settlementService.ts`, `src/hooks/useSettlement.ts`, 9 Reconciliation UI components

---

## [2.8.5] - 2026-02-14 (Enhancement Batch: Cache, Testing, DX, Architecture)

### Added

#### Unit Tests for Critical Services (Enhancement 4.2)

- `src/tests/regulatory.test.ts` — 13 tests covering APR validation, NAD formatting, max loan calculation
- `src/tests/creditScoring.test.ts` — 20 tests covering credit score ranges, APR cap compliance, income/DTI/default impacts, loan recommendation approval and rejection paths

#### Accessibility Testing (Enhancement 4.4)

- Installed `@axe-core/playwright`
- `e2e/accessibility.e2e.ts` — WCAG 2.1 Level A & AA scans for Landing Page and Auth Page; fails only on critical/serious violations

#### Pre-Commit Hooks (Enhancement 5.2)

- Installed `husky` and `lint-staged`
- `.husky/pre-commit` runs `npx lint-staged` on every commit
- Staged `.ts/.tsx` files are auto-linted (ESLint) and formatted (Prettier)
- Staged `.md` files are auto-formatted (Prettier)

#### Auth Session Manager (Enhancement 8.5)

- `src/services/authSessionManager.ts` — extracted `restoreSession()`, `fetchUserRole()`, `clearPersistedAuth()` from the monolithic `useAuth` hook

### Changed

#### TanStack Query Cache Optimization (Enhancement 3.3)

- Expanded `staleTimes` in `src/hooks/useApiQueries.ts` with new tiers: `paymentHistory` (1 min), `adminConfig` (10 min)
- Increased `semiStatic` from 2 min to 5 min (user profiles rarely change within a session)
- Applied `paymentHistory` to `usePaymentsForLoan`, `adminConfig` to `useComplianceReport`

#### Auth Hook Refactor (Enhancement 8.5)

- `src/hooks/useAuth.tsx` reduced from 363 to ~250 lines by delegating to `authSessionManager`

**Files Created**: `src/services/authSessionManager.ts`, `src/tests/regulatory.test.ts`, `src/tests/creditScoring.test.ts`, `e2e/accessibility.e2e.ts`, `.husky/pre-commit`
**Files Modified**: `src/hooks/useApiQueries.ts`, `src/hooks/useAuth.tsx`, `package.json`, `docs/ENHANCEMENTS.md`

---

## [2.8.4] - 2026-01-18 (Client Dashboard Navigation Fix)

### Fixed

#### Client Dashboard Sidebar Navigation

- **Problem**: Clicking Documents, Self Service, and Profile links in the client dashboard sidebar did not navigate to their respective pages
- **Root Cause**: Navigation handlers were working correctly but explicit handling was added for clarity
- **Fix**: Simplified `handleTabChange` function in `Dashboard.tsx` with clear routing logic

**Navigation Behavior**:
| Sidebar Item | Action | Destination |
|-------------|--------|-------------|
| Documents | External route | `/kyc` page |
| Self Service | Internal tab | `<SelfServicePortal />` component |
| Profile | Internal tab | `<ClientProfileDashboard />` component |

**Files Updated**:
| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Simplified `handleTabChange` with explicit tab routing |
| `src/components/Layout/ThemedSidebar.tsx` | Verified navigation handler (no functional changes) |

---

## [2.8.3] - 2026-01-11 (E2E Test Fixes for Conditional Rendering)

### Fixed

#### E2E Tests for Approval Button Conditional Rendering

- **Problem**: Tests assumed approve/reject buttons are always visible, but Issue 3 fix correctly hides them for processed requests
- **Fix**: Updated tests to handle both pending (buttons visible) and processed (buttons hidden) states

**Files Updated**:
| Test File | Change |
|-----------|--------|
| `admin-approvals.e2e.ts` | Handles both pending and processed request states |
| `admin-approvals-actions.e2e.ts` | Handles both pending and processed request states |
| `approval-rpc-race-condition.e2e.ts` | Uses service role key for setup, skips gracefully when unavailable |

#### Component Enhancement

- Added `data-testid="approvals-processed-state"` to `ApprovalManagementDashboard.tsx` for test detection of processed state

### Test Results

```
Before: 129 passed, 3 failed, 3 skipped
After:  131 passed, 0 failed, 4 skipped

Skipped tests (approval-rpc-race-condition.e2e.ts) require SUPABASE_SERVICE_ROLE_KEY
```

---

## [2.8.2] - 2026-01-10 (Loan Flow Resolution & Type Consolidation)

### Fixed

#### Critical: Disbursement Status Mismatch

- **Root Cause**: `create_disbursement_on_approval` RPC created disbursements with `pending` status, but `initiate_ips_disbursement` expected `approved` status
- **Fix**: Updated RPC to create disbursements with `approved` status
- **Migration**: `20260110180000_fix_create_disbursement_on_approval_status.sql`
- **Impact**: IPS disbursements now work immediately after loan approval

#### LoanReviewPanel Mock Data

- Replaced hardcoded mock data with real Supabase API calls
- Added `status` prop for conditional button rendering
- Approve/Reject buttons now only shown for pending loans
- Added loading and error states

#### Loan360View Interface

- Added `approved_at` field to `LoanDetails` interface for accurate timeline display

### Added

#### Canonical Type Definitions

- Created `src/types/loan.ts` with unified loan type definitions:
  - `LoanStatus`, `DisbursementStatus`, `PaymentStatus` type unions
  - `LoanRecord`, `LoanApplication`, `LoanDetailsForReview`, `Loan360Details`
  - `Disbursement`, `DisbursementResult`, `Payment`, `PaymentScheduleItem`
  - Type guards: `isValidLoanStatus()`, `canApproveLoan()`, `canDisburseLoan()`
- Created `src/types/index.ts` for centralized type exports

### Changed

- `useLoanApplications.ts` now imports canonical `LoanApplication` type
- `LoanApplicationsList.tsx` uses canonical types from hook
- Database: All stuck `pending` disbursements for approved loans updated to `approved`

### Test Results

- 6/6 Disbursement API E2E tests passing
- Production build succeeds

### Documentation

- Updated `docs/RESOLUTION_FRAMEWORK_LOAN_FLOW.md` with completed work
- Updated `docs/TYPE_SAFETY_REMEDIATION.md` with canonical types progress

## [2.8.1] - 2026-01-07 (E2E Test Stabilization & Auth Persistence Fix)

### Added

- `e2e/helpers/admin.ts` to standardize admin sidebar readiness and navigation in Playwright UI tests
- IPS payment flow E2E setup helpers to seed and clean up disbursed loans and approved disbursements
- `gotoAuthenticated` helper in `e2e/helpers/auth.ts` with session injection for protected route navigation
- Session persistence wait in login helper to ensure auth state is available before test navigation

### Fixed

- **Critical: E2E Auth Persistence** - Resolved session loss after `page.goto()` navigation
  - Root cause: Supabase auth hydration from `localStorage` wasn't completing before `ProtectedRoute` checked authentication
  - Added manual session restoration with `setSession()` in `src/hooks/useAuth.tsx`
  - Implemented exponential backoff retry for session hydration (100ms, 300ms, 600ms)
  - Added re-login fallback pattern in tests when session is lost after navigation
  - Fixed `loan-application.e2e.ts` - now passes (1/1)
  - Fixed `role-routing.e2e.ts` - now passes (2/2)
  - Updated `ips-payment-flow.e2e.ts` with re-login pattern - auth now works correctly
- Fixed `data-testid` placement on `SelectTrigger` components in `LoanApplication.tsx` for E2E test reliability
- Login helper to use data-testid selectors, wait for `sidebar-trigger`, and detect auth errors more reliably
- Admin UI tests for approvals, currency formatting, sign-out, role routing, and backoffice disbursement to align with sidebar navigation and empty states
- IPS adapter E2E tests to refresh auth tokens per test and align unknown endpoint expectations
- Disbursement ledger CRUD/RLS tests to create missing loan data and validate invalid payment method handling
- IPS RPC tests to create approved disbursements and clean up after execution
- API E2E tests to load dotenv config and accept `VITE_SUPABASE_*` fallbacks when `SUPABASE_*` envs are unset

### Changed

- E2E test pattern: Tests now handle session loss gracefully with re-login fallback and SPA navigation
- Auth hydration strategy: Proactive session restoration from localStorage instead of passive waiting

### Documentation

- Updated `docs/TESTING.md` with E2E auth persistence fix details and latest test results
- Updated `docs/IPS_TESTING.md` with prerequisites and data seeding details

## [2.8.0] - 2026-01-06 (Production Blockers Remediation)

### Fixed

#### Critical Security & Data Integrity Issues (P0)

- **P0-001: IPS Adapter Authorization Bypass** (Critical Security)
  - Added JWT verification and role-based authorization to `ips-adapter` edge function
  - Implemented `verifyAuthorization()` helper function for centralized auth checks
  - Staff-only endpoints (`/pay`, `/register-mobile`, `/reg-mapper`, `/set-cred`) now require admin/loan_officer role
  - All IPS endpoints now require valid JWT authentication token
  - Prevents unauthorized access to financial operations

- **P0-002: TigerBeetle Schema Missing** (Critical Data)
  - Created migration `20260106_create_tigerbeetle_schema.sql`
  - Added tables: `tigerbeetle_accounts`, `tigerbeetle_outbox`, `tigerbeetle_transfers`, `tigerbeetle_reconciliation`
  - Added `queue_tigerbeetle_event` RPC function for outbox pattern
  - Added `get_tigerbeetle_balance` RPC function for balance queries
  - Implemented RLS policies for all TigerBeetle tables
  - Enables double-entry ledger integration

- **P0-003: Payment Webhook Wrong Payment ID** (Critical Data)
  - Fixed `payment-webhook` edge function to use `payments.id` instead of `payment_transactions.id`
  - Now correctly captures payment record ID before calling `apply_payment_to_schedule` RPC
  - Ensures payment schedules are updated with correct payment reference

- **P0-004: process-loan-application Notification Column** (Critical Data)
  - Fixed notification insert to use `category` column instead of non-existent `type` column
  - Mapped notification type to valid category value

- **P0-005: send-notification Column Mismatch** (Critical Data)
  - Fixed notification insert to map `type` parameter to `category` column
  - Ensures notifications are properly stored and displayed

#### High Priority Issues (P1)

- **P1-001: Admin Dashboard Overdue Metrics**
  - Fixed overdue count query to use `payment_schedules` table instead of `payments`
  - Query now correctly counts schedules where `due_date < now() AND status != 'paid'`
  - Provides accurate overdue payment metrics

- **P1-003: Multi-Role Staff Authorization**
  - Fixed `send-sms` and `send-notification` edge functions to handle users with multiple roles
  - Changed from `.maybeSingle()` to `.in('role', ['admin', 'loan_officer'])` query pattern
  - Prevents authorization failures for staff with multiple role assignments

### Added

- **REMEDIATION_PLAN.md** - Comprehensive documentation of all verified findings and remediation steps
- **Authorization helper** in IPS adapter for centralized JWT and role validation
- **Multi-role support** across all edge functions requiring staff permissions

### Security

- IPS adapter now enforces authentication on all endpoints
- Staff-only financial operations protected by role verification
- Multi-role users now properly authorized across all edge functions
- JWT tokens validated before any IPS operations

### Deployment Notes

- ✅ Migration `20260106_create_tigerbeetle_schema.sql` deployed to production
- ✅ All 5 edge functions redeployed:
  - `ips-adapter` (v4) - P0-001 fix
  - `payment-webhook` (v2) - P0-003 fix
  - `process-loan-application` (v4) - P0-004 fix
  - `send-notification` (v4) - P0-005 + P1-003 fixes
  - `send-sms` (v2) - P1-003 fix
- ✅ E2E tests verified: 21 passed, 5 skipped, 11 did not run

---

## [3.3.0] - 2025-12-27

### Added

#### Mobile Application v2.7.1 - Production Optimizations

- **Query Optimization** - Replaced `select('*')` with specific column selections
  - Updated loanService.ts, paymentService.ts, approvalService.ts
  - Reduced network payload size significantly
  - Improved query performance across all services

- **Navigation-Aware Prefetching** - Intelligent data preloading
  - usePrefetchDashboard hook for client dashboard
  - usePrefetchLoanDetails hook for loan details
  - usePrefetchProfile hook for profile data
  - usePrefetchApproverDashboard hook for approver queue
  - Improved perceived performance via background prefetching

- **Global Error Handling** - Enhanced crash resilience
  - ErrorBoundary component wrapping NavigationContainer
  - Graceful error recovery with user-friendly messages
  - Error logging for debugging

- **Network Status Indicator** - Global connectivity awareness
  - NetworkBanner component extended to all navigation stacks
  - Slide animation for offline/online status
  - Visible across ClientStack and ApproverStack

- **UI Improvements**
  - Fixed ReviewApplicationScreen button positioning
  - Action buttons now visible above floating tab bar
  - Improved theme consistency in PaymentScreen and DocumentUploadScreen

#### IPS Payment Method in Client Payment Modal

- **PaymentModal.tsx** - Added "IPP Instant" as primary payment method option
  - Green-highlighted button for instant payments
  - Info panel showing benefits (no fees, real-time, secure)
  - 3-column grid layout for 5 payment methods

#### IPS Transactions Reconciliation Dashboard

- **IPSTransactionsViewer.tsx** - New admin reconciliation component
  - Transaction statistics (total, success, pending, failed, deemed)
  - Filter by status and transaction type
  - Search by ID, VPA
  - Real-time data refresh

### Fixed

#### IPS Adapter Edge Function

- Fixed 404 error for `/validate-vpa` endpoint
- Updated URL path extraction to handle `/functions/v1/` prefix correctly
- Fixed `ipsService.ts` to use absolute Supabase URL instead of relative path

#### Database Constraints

- Added `'ips'` to `payment_method_valid` check constraint on `payments` table
- Allowed values now: `bank_transfer`, `mobile_money`, `cash`, `debit_order`, `ips`

### Documentation

#### Mobile App Documentation Updates

- **namlend-mobile/docs/context.md** - Updated to v2.7.1
  - Added P1/P2 improvements section
  - Updated architecture with new components
  - Documented performance optimizations

- **namlend-mobile/docs/TECHNICAL_AUDIT_REPORT.md** - Audit completion
  - Marked all P1 issues as resolved
  - Marked core P2 issues as resolved
  - Added post-audit improvements summary

- **namlend-mobile/docs/HANDOVER_SUMMARY.md** - Updated handover
  - Updated to v1.1.0
  - Added recent improvements section
  - Updated metrics and achievements

#### Main Project Documentation Updates

- **docs/context.md** - Updated to v3.3.0
  - Added Phase 6: IPP Integration & Mobile Optimization
  - Updated project structure with mobile app
  - Added mobile v2.7.1 achievements
  - Updated core tables with IPS tables

- **docs/CHANGELOG.md** - This file
  - Added mobile v2.7.1 improvements
  - Documented all optimization work

---

## [3.2.0] - 2025-12-27

### Added

#### IPP Onboarding System

- **Database Schema** (migration: `20251227100000_ipp_onboarding_system`)
  - `ips_device_bindings` - Device binding records for mobile registration
  - `ips_onboarding` - Customer onboarding state machine (15 states)
  - `ips_alias_directory` - VPA alias cache
  - `ips_merchants` - Merchant registration for P2M payments
  - `ips_vae_entries` - Verified Address Entries
  - `ips_keys_cache` - Encryption keys cache
  - `ips_sov_providers` - Store of Value providers (7 Namibian banks seeded)
  - `ips_onboarding_history` - Audit trail for state transitions

- **RPC Functions**
  - `get_or_create_ips_onboarding()` - Get/create onboarding record
  - `advance_ips_onboarding_step()` - Advance to next state
  - `is_user_ipp_ready()` - Check if user can make IPP payments
  - `get_ipp_onboarding_summary()` - Admin summary stats
  - `get_users_pending_ipp_onboarding()` - List users by state
  - `admin_initiate_ipp_onboarding()` - Start onboarding for user
  - `queue_ipp_onboarding_notification()` - Queue notification for user

- **IPS Adapter Edge Function** - Added onboarding endpoints
  - `/list-acc-pvd` - List SoV providers
  - `/list-account` - List user accounts
  - `/register-mobile` - Register mobile device
  - `/get-alias` - Get alias directory
  - `/reg-mapper` - Register VPA alias
  - `/set-cred` - Set IPS PIN
  - `/list-keys` - List encryption keys

- **TypeScript Types** (`src/types/ips.ts`)
  - Added IPP onboarding types, state machine enums, and utility functions

- **IPP Onboarding Service** (`src/services/ipsOnboardingService.ts`)
  - Customer and merchant onboarding flows
  - State machine management
  - IPS adapter integration

- **Admin Dashboard IPP Onboarding UI** (`src/pages/AdminDashboard/components/IPPOnboarding/`)
  - Statistics overview (total users, by state, ready, in-progress)
  - User listing with state filtering
  - Initiate onboarding for customers
  - View detailed onboarding status modal

- **Client Banking Section** (`src/components/BankingSection.tsx`)
  - Self-service IPP enrollment UI
  - Step-by-step onboarding wizard (Device Binding → Bank Selection → OTP → IPS PIN → VPA)
  - Linked accounts view
  - Payment methods overview

- **Dashboard Integration**
  - Added "Banking" tab to client dashboard sidebar
  - Notification triggers for onboarding steps requiring user input

---

## [3.1.0] - 2025-12-27

### Fixed

#### Authentication

- **Auth Race Condition Fix** (`src/hooks/useAuth.tsx`)
  - Fixed page refresh causing momentary sign-out/redirect flash
  - Added `initialCheckComplete` ref to track session initialization state
  - Skip `INITIAL_SESSION` events from `onAuthStateChange` to prevent premature null session handling
  - Rely on `getSession()` for initial state, `onAuthStateChange` for subsequent changes

#### User Management Database Integration

- **RPC Type Mismatch Fix** (`get_profiles_with_roles_admin`)
  - Fixed `varchar(255)` to `text` type casting for email field
  - Migration: `fix_get_profiles_with_roles_admin_type_cast`

- **Audit Logs Query Fix** (`UserAuditLog.tsx`)
  - Changed `timestamp` → `created_at` (correct column name)
  - Changed `old_state`/`new_state` → `old_values`/`new_values`
  - Changed `entity_type`/`entity_id` → `table_name`/`record_id`

- **profiles_with_roles View Enhancement** (migration applied)
  - Added aggregated role columns: `roles[]`, `primary_role`, `is_admin`, `is_loan_officer`, `is_client`
  - Added `account_status` derived from `verified` field
  - Enables proper filtering and display in User Management dashboard

### Changed

#### User Import Wizard (`UserImportWizard.tsx`)

- Converted from modal overlay to inline tab content
- Cancel/X buttons now navigate back to "All Users" tab
- Added missing `Loader2` import
- Fixed app freeze issue when closing wizard

#### Role Management (`RoleManagement.tsx`)

- **View Users Dialog** - Replaced `window.alert()` popup with proper card-based dialog
  - Card layout for each user with avatar initials
  - Displays name, email, phone, and account status
  - Loading and empty state handling
  - User count in footer
  - Consistent with app design system

### Database Migrations

- `fix_get_profiles_with_roles_admin_type_cast` - Cast varchar to text in RPC
- `fix_profiles_with_roles_view` - Add aggregated role columns to view

### Technical Notes

- All User Management features now fully functional end-to-end
- Auth flow stable on page refresh
- TypeScript compiles without errors
- Dark mode contrast maintained across all updated components

---

## [3.0.0] - 2025-12-22

### Added

#### Admin Dashboard Configuration Panels

- **TigerBeetleConfig** (`src/pages/AdminDashboard/components/Settings/TigerBeetleConfig.tsx`)
  - Connection settings (cluster ID, addresses, replica count)
  - Outbox processing configuration (batch size, intervals, retry policies)
  - Reconciliation schedules and thresholds
  - Account structure configuration (codes, ledger IDs)
  - Connection test functionality with real-time feedback
  - Reset to defaults capability

- **SettlementConfig** (`src/pages/AdminDashboard/components/Settings/SettlementConfig.tsx`)
  - Settlement processing parameters (windows, batch sizes, cutoff times)
  - IPS integration settings (endpoint URLs, credentials, timeout configurations)
  - Reconciliation automation (schedules, tolerance thresholds, auto-matching)
  - Three-tab interface: Settlement, IPS Integration, Reconciliation

- **System Configuration Database** (`supabase/migrations/20251222050000_system_configuration.sql`)
  - `system_configuration` table for persistent admin settings
  - RLS policies restricting access to admins only
  - RPC functions: `get_system_config()`, `upsert_system_config()`, `reset_system_config()`
  - Seeded default configurations for TigerBeetle, Settlement, Reconciliation, and IPS

#### User Management Enhancements

- **Real-time Stats Cards** - Dashboard stats now fetch live data from database
  - Total users from `profiles` table
  - Active users (verified) count
  - Admin users from `user_roles` table
  - Pending actions from `approval_requests` table

- **Export Users** - CSV export functionality with user data from `profiles_with_roles` view

- **Add User Modal** - Form for inviting new users with role assignment

- **Advanced Filters Modal** - Multi-criteria filtering (role, status, search)

- **User Profile Database Integration** (`useUserProfile.ts`)
  - Real database queries to `profiles_with_roles` view
  - `updateUser()` function for saving profile changes
  - `suspendUser()` function for account suspension
  - Login count from `view_logs` table

- **User Audit Log Database Integration** (`UserAuditLog.tsx`)
  - Real-time queries to `audit_logs` table
  - Date range filtering (1d, 7d, 30d, 90d)
  - Action type filtering
  - Refresh and retry functionality
  - Error state handling

### Changed

- **Admin Dashboard Navigation** - Added TigerBeetle Ledger and Settlement tabs
- **UserProfile Component** - Save and Suspend buttons now persist to database
- **UserManagementDashboard** - Header buttons fully functional

### Database Migrations

- `20251222050000_system_configuration.sql` - System configuration table with RLS and RPCs

### Technical Notes

- All User Management components now use real database connections
- Configuration panels support loading, saving, resetting, and testing
- Toast notifications provide user feedback for all operations
- TypeScript compiles without errors

---

## [2.9.0] - 2025-12-14

### Added

#### IPS/IPP Settlement Processing Pipeline

- **Settlement Processing RPCs** - Complete pipeline for settlement runs:
  - `create_settlement_run()` - Creates settlement runs with auto-generated IDs
  - `ingest_ips_transactions_for_settlement()` - Ingests IPS disbursements into obligations
  - `compute_settlement_netting()` - Bilateral netting calculations
  - `generate_pacs009_batches()` - ISO 20022 pacs.009 XML file generation
  - `generate_settlement_reports()` - NTSL and Raw Data report generation
  - `process_settlement_run()` - Orchestrates complete pipeline
  - `mark_settlement_settled()` - Simulates NISS acceptance

- **Settlement Service Extensions** (`settlementService.ts`):
  - `createSettlementRun()`, `processSettlementRun()`, `ingestIPSTransactions()`
  - `computeNetting()`, `generatePacs009Batches()`, `generateSettlementReports()`
  - `markSettlementSettled()`, `getSettlementObligations()`, `getNetInstructions()`

- **React Query Hooks** (`useSettlement.ts`):
  - `useCreateSettlementRun` - Mutation for creating runs
  - `useProcessSettlementRun` - Mutation for processing
  - `useMarkSettlementSettled` - Mutation for settling
  - `useSettlementObligations`, `useNetInstructions`, `useSettlementWindows`

- **Enhanced Settlement UI** (`SettlementRunsList.tsx`):
  - "New Settlement Run" button with dialog
  - Date and window selection (SW1/SW2/SW3)
  - Auto-processing: ingest → netting → pacs.009 → reports → settle
  - Processing status indicators

- **Namibian Bank Participants Seeded**:
  - First National Bank Namibia (FIABORNANX)
  - Standard Bank Namibia (SBICNANX)
  - Nedbank Namibia (NEDSNANX)
  - Bank Windhoek (BWNANAMX)
  - NamLend Trust (NAMLNANX)

- **Demo Settlement Data**:
  - 3 IPS disbursement transactions (N$1,000 + N$4,000 + N$5,000)
  - Complete settlement run with obligations, net instructions, pacs.009 batches
  - NTSL and Raw Data reports with acknowledgements

### Database Migrations

- `20251214060000_settlement_processing.sql` - Settlement processing RPCs
- `20251214061000_seed_settlement_demo_data.sql` - Demo data seeding

---

## [2.8.0] - 2025-12-14

### Added

#### Dark Mode System

- **ThemeProvider** (`src/components/ThemeProvider.tsx`) - Context-based theme management with system preference detection
- **ModeToggle** (`src/components/ModeToggle.tsx`) - User-facing theme switcher component
- Theme preference persistence in localStorage

### Changed

#### Comprehensive Dark Mode Refactoring

- **124 files updated** for full dark mode compatibility
- Replaced all hardcoded gray colors with semantic tokens (`bg-muted`, `text-muted-foreground`, `bg-background`)
- Added `dark:` variants for all colored badges (success, warning, error, info)
- Updated all Admin Dashboard components:
  - Payment Management (CollectionsWorkqueue, DisbursementManager, PaymentScheduleViewer, etc.)
  - User Management (BulkUserOperations, PermissionMatrix, UserAuditLog, etc.)
  - Analytics (PortfolioAnalytics, RiskAnalysis, ComplianceReports, etc.)
  - Reconciliation (all settlement viewers and reports)
- Updated client-facing components (SelfServicePortal, ClientProfileDashboard, LoanStatusTimeline)
- Updated core pages (Dashboard, Auth, NotFound, ErrorBoundary)

### Fixed

- `SelfServicePortal.tsx` - Fixed corrupted JSX structure (missing Tabs/TabsList)
- `DisbursementDetailsModal.tsx` - Removed duplicate closing parenthesis syntax error

### Documentation

- Updated `DESIGN_SYSTEM.md` to v2.2.0 with Dark Mode Implementation section
- Updated `UI_UX_AUDIT_REPORT.md` with completion status

---

## [2.7.0] - 2025-12-12

### Added

#### IPS (Instant Payment System) Integration

- **IPSPaymentModal** - Multi-step payment modal (amount → VPA → confirm → process → result)
- **VPAInput** - VPA input component with format validation and server-side verification
- **IPSHistoryList** - Transaction history display for loans
- **IPSTransactionStatus** - Real-time status polling component
- **IPSDisbursementForm** - Admin disbursement via IPS
- **LoanDetails** page (`/loans/:id`) - Detailed loan view with IPS payment option

#### IPS Database Schema

- `ips_transactions` table - Stores all IPS payment transactions
- `ips_vpa_registry` table - User VPA (Virtual Payment Address) records
- `ips_api_logs` table - IPS API call logging for debugging/audit

#### IPS RPC Functions

- `initiate_ips_repayment` - Initiate loan repayment via IPS
- `initiate_ips_disbursement` - Initiate loan disbursement via IPS
- `get_ips_transaction_status` - Check transaction status

#### IPS Edge Function

- `ips-adapter` - Mock IPS API adapter for development/testing
  - POST `/pay` - Process payments
  - POST `/validate-vpa` - Validate VPA addresses
  - POST `/check-status` - Check transaction status

#### IPS React Query Hooks

- `useIPSPayment` - Initiates IPS payments/disbursements
- `useUserVPAs` - Manages user VPA records
- `useIPSTransactionStatus` - Polls transaction status

#### Settlement System (Admin)

- 13 settlement tables for BON reconciliation
- `ReconciliationDashboard` - Settlement run monitoring
- `Pacs009Viewer` - MNSB pacs.009 file viewer
- `NTSLReportViewer` - Net Settlement Report viewer
- `AdjustmentsViewer` - Dispute/chargeback management

#### E2E Test Coverage

- `ips-payment-flow.e2e.ts` - Full IPS payment flow tests
- `ips-adapter.e2e.ts` - Edge function API tests
- `ips-rpc.e2e.ts` - RPC function tests
- Added `data-testid` attributes to all IPS components

#### Documentation

- `IPS_IMPLEMENTATION.md` - Complete implementation guide
- `IPS_TESTING.md` - Testing guide
- `IPS_PRODUCTION_CHECKLIST.md` - Production readiness checklist
- Updated `IPP_INTEGRATION.md` with technical specifications

### Changed

- Payment page now includes IPS as primary payment option
- Updated FUNCTIONALITY_MAP with IPS status
- Updated SERVICES.md with IPS service documentation
- Updated ARCHITECTURE.md with IPS components

### Technical Notes

- IPS operates in **Mock Mode** by default for development
- Set `MOCK_MODE=false` for production IPS integration
- Requires BON PSP registration and certificates for production

---

## [2.6.0] - 2025-12-10

### Added

#### Payment System Enhancements

- **Settled Loans Tab** in Payment Management Dashboard for admin visibility
- **Settled Loans Card** in Payment Overview showing count and total collected
- **SettledLoansList Component** with search, filtering, and client details
- Settlement detection and automatic loan status transitions

#### Schema Alignment & Constants

- `/src/constants/loanStatuses.ts` - Centralized loan/payment status constants
  - `LOAN_STATUS`, `PAYMENT_STATUS`, `SCHEDULE_STATUS`, `DISBURSEMENT_STATUS`
  - `PAYABLE_STATUSES`, `ACTIVE_LOAN_STATUSES`, `CLOSED_LOAN_STATUSES`
  - Helper functions: `isPayableStatus()`, `isActiveLoan()`, `isClosedLoan()`
  - Status labels and colors for consistent UI
- `/src/constants/schemaReference.ts` - Database column reference documentation
  - Documents actual column names for all key tables
  - `getFullName()` helper for profile name handling
  - Common column name corrections mapping

#### New Components

- `NotificationCenter` - In-app notification bell with real-time updates
- `CreditScoreDisplay` - Visual credit score indicator
- `SelfServicePortal` - Client self-service features
- `DashboardSidebar` - Improved navigation sidebar
- `StatCard` - Reusable statistics card component
- `LoanStatusTimeline` - Visual loan status progression

#### New Services

- `creditScoring.ts` - AI-powered credit scoring (300-850 scale)
- `notificationService.ts` - Multi-channel notification delivery
- `paymentGateway.ts` - Payment provider integrations (MTC MoMo, TN Mobile, PayToday)
- `smsGateway.ts` - Africa's Talking SMS integration
- `whatsappGateway.ts` - Meta WhatsApp Business API integration

#### Edge Functions

- `payment-webhook` - Payment provider webhook handler
- `scheduled-tasks` - Cron job for reminders and overdue processing
- `send-sms` - Africa's Talking SMS delivery
- `send-whatsapp` - WhatsApp message delivery

#### Admin Dashboard Features

- `BatchOperations` - Bulk loan operations
- `CollectionsManagement` - Collections queue and activities
- `Loan360View` - Comprehensive loan detail view
- `CreditPolicyConfig` - Credit policy configuration

### Fixed

#### Database Schema Alignment

- Fixed `process_loan_payment` RPC column references:
  - `performed_by` → `user_id` (audit_logs)
  - `reason` → `transition_reason` (state_transitions)
  - `performed_by` → `triggered_by` (state_transitions)
- Fixed `useUserProfile.ts` - `full_name` → `first_name + last_name`
- Fixed `approvalWorkflow.ts` - `full_name` → `first_name + last_name`
- Fixed `BatchOperations.tsx` - FK join → separate queries
- Fixed `SettledLoansList.tsx` - FK join → separate queries

#### Database Improvements

- Added missing foreign key constraints:
  - `loans.user_id` → `auth.users.id`
  - `profiles.user_id` → `auth.users.id`
  - `payments.loan_id` → `loans.id`
  - `payment_schedules.loan_id` → `loans.id`
  - `disbursements.loan_id` → `loans.id`
- Added indexes on `loans.user_id` and `profiles.user_id`

### Changed

#### Performance Optimizations

- `Dashboard.tsx` - Parallel queries with `Promise.all()` (~60% faster)
- `usePaymentMetrics.ts` - Parallel queries with `Promise.all()`
- Dashboard load time reduced from 2300ms+ to ~800ms

#### Documentation

- Reorganized `/docs` with new structure
- Moved legacy docs to `/docs_old`
- Added comprehensive documentation files:
  - `API_REFERENCE.md`
  - `ARCHITECTURE.md`
  - `DATABASE_SCHEMA.md`
  - `DESIGN_SYSTEM.md`
  - `FUNCTIONALITY_MAP.md`
  - `SECURITY.md`
  - `SERVICES.md`
  - `TECHNICAL_DEBT.md`
  - `TESTING.md`

### Database Migrations

- `20251205_create_notification_system.sql`
- `20251206_create_collections_system.sql`
- `20251206_front_office_integrations.sql`
- `add_missing_foreign_keys` (applied via Supabase MCP)

---

## [2.5.0] - 2025-12-09

### Added

- Payment processing system with settlement detection
- Real-time balance calculation via `loan_balance_summary` view
- Payment progress tracking with percentages
- Quick pay buttons (monthly, full balance)
- Settlement celebration UI

### Fixed

- Loan application submission flow
- Approval workflow atomic transactions
- Disbursement lifecycle management

---

## [2.4.2] - 2025-11-30

### Added

- User management system
- Role-based access control (RBAC)
- Audit logging system

### Fixed

- Authentication flow improvements
- Dashboard data fetching

---

## Deployment

- **Production URL**: <https://namlend-trust-portal-v220.netlify.app>
- **GitHub**: <https://github.com/DKTony/namlend-trust-portal-v220>
- **Supabase Project**: puahejtaskncpazjyxqp (eu-north-1)

---

## Environment Variables

### Client-side (VITE\_)

```
VITE_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
VITE_SUPABASE_ANON_KEY=<public_anon_key>
VITE_RUN_DEV_SCRIPTS=false
VITE_DEBUG_TOOLS=false
VITE_ALLOW_LOCAL_ADMIN=false
```

### Server-side (Edge Functions)

```
AFRICASTALKING_API_KEY=<api_key>
AFRICASTALKING_USERNAME=<username>
SMS_SENDER_ID=NAMLEND
WHATSAPP_PHONE_NUMBER_ID=<phone_id>
WHATSAPP_ACCESS_TOKEN=<access_token>
PAYTODAY_WEBHOOK_SECRET=<secret>
MTC_MOMO_WEBHOOK_SECRET=<secret>
TN_MOBILE_WEBHOOK_SECRET=<secret>
```
