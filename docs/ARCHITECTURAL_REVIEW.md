# NamLend Trust — Architectural Review & Modularization Plan

**Doc Revision**: 2026-03-19
**Status**: Active — Strategic architectural roadmap for v5.0
**Audience**: Architects, Tech Leads, Senior Engineers
**Scope**: Full-stack review of v4.0.0 Convex codebase with actionable modularization plan

> This document provides a comprehensive architectural review of the NamLend Trust platform at v4.0.0 (Convex migration complete), identifies structural improvements for modularity and loose coupling, and delivers a phased implementation roadmap. It supersedes ad-hoc architectural notes scattered across other documents.

---

## Table of Contents

- [Part 1: Strategic Review](#part-1-strategic-review)
- [Part 2: Gaps Not Previously Identified](#part-2-gaps-not-previously-identified)
- [Part 3: User Journey Architecture](#part-3-user-journey-architecture)
- [Part 4: Implementation Roadmap](#part-4-implementation-roadmap)
- [Part 5: Architectural Principles](#part-5-architectural-principles)

---

## Part 1: Strategic Review

Seven architectural improvements were evaluated against the actual v4.0.0 codebase. Each is assessed for current validity.

### Assessment Key

- ✅ **Still Valid** — proposal is accurate and actionable against current codebase
- 🔄 **Partially Superseded** — some elements done, core idea still valuable
- ⛔ **Superseded** — already resolved in codebase

---

### 1. Split `schema.ts` into Domain Slices

**Verdict**: ✅ Still Valid — HIGH PRIORITY

**Problem**: The 1,131-line `convex/schema.ts` with 55+ tables is monolithic. Every engineer touching any domain touches the same file. Merge conflicts and cognitive load scale with table count.

**Solution**: Convex's `defineSchema()` accepts spread operators. Domain files export plain objects of table definitions; `schema.ts` assembles them. Shared validators (`loanStatus`, `txStatus`, etc.) move to `convex/lib/validators.ts`.

**Target structure**:

```
convex/
├── schema.ts                    # Thin assembler (~30 lines)
├── lib/validators.ts            # Shared status unions (loanStatus, txStatus, etc.)
├── domains/
│   ├── identity/tables.ts       # profiles, userRoles, kycDocuments
│   ├── origination/tables.ts    # loans, loanDocuments, loanApprovals, approval*, workflow*
│   ├── servicing/tables.ts      # disbursements, paymentTransactions, paymentSchedules
│   ├── collections/tables.ts    # collectionsInteractions, overdueReminders, promiseToPay
│   ├── notifications/tables.ts  # notifications, notificationTemplates, notificationQueue, etc.
│   ├── ips/tables.ts            # ipsTransactions, vpaRegistry, ipsApiLogs, ipsAlerts, etc.
│   ├── settlement/tables.ts     # 13 settlement* tables
│   ├── tigerbeetle/tables.ts    # tigerBeetleOutbox, tigerBeetleAccounts, etc.
│   ├── audit/tables.ts          # auditLogs, stateTransitions, viewLogs, complianceReports
│   ├── reconciliation/tables.ts # reconciliationRuns, bankTransactions
│   └── system/tables.ts         # systemConfiguration
```

**Assembled schema**:

```typescript
// convex/schema.ts — becomes a thin assembler only
import { defineSchema } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { identityTables } from './domains/identity/tables';
import { originationTables } from './domains/origination/tables';
import { servicingTables } from './domains/servicing/tables';
import { collectionsTables } from './domains/collections/tables';
import { notificationTables } from './domains/notifications/tables';
import { ipsTables } from './domains/ips/tables';
import { settlementTables } from './domains/settlement/tables';
import { tigerBeetleTables } from './domains/tigerbeetle/tables';
import { auditTables } from './domains/audit/tables';
import { reconciliationTables } from './domains/reconciliation/tables';
import { systemTables } from './domains/system/tables';

export default defineSchema({
  ...authTables,
  ...identityTables,
  ...originationTables,
  ...servicingTables,
  ...collectionsTables,
  ...notificationTables,
  ...ipsTables,
  ...settlementTables,
  ...tigerBeetleTables,
  ...auditTables,
  ...reconciliationTables,
  ...systemTables,
});
```

**Effort**: ~4 hours | **Risk**: Low (pure refactoring, zero behavior change)

---

### 2. Domain Event Bus

**Verdict**: ✅ Still Valid — HIGHEST ARCHITECTURAL VALUE

**Problem**: Mutations embed side effects inline. `completeDisbursement` directly patches the loan, formats currency, creates a notification, AND logs an audit entry. Adding a new side effect (e.g., "send SMS on disbursement") means modifying the disbursement mutation itself.

**Solution**: Formalize the existing `ctx.scheduler.runAfter(0, ...)` pattern into a typed event bus.

**Architecture**:

```
domainEvents table (append-only event log)
     ↓
publishEvent() helper (writes event + schedules dispatcher)
     ↓
eventHandlers.dispatch (internalMutation — fans out to subscribers)
     ↓
┌─────────────────────────────────────────────────────────┐
│ AuditSubscriber    → schedules writeStateTransition     │
│ NotificationSubscriber → schedules createNotification   │
│ TigerBeetleSubscriber → schedules outbox entry          │
│ SMSSubscriber → schedules sendSms action                │
│ (future subscribers added here — zero change to source) │
└─────────────────────────────────────────────────────────┘
```

**Event types** (derived from actual codebase mutations):

```typescript
type DomainEvent =
  | { type: 'LoanCreated'; loanId: Id<'loans'>; userId: Id<'users'> }
  | { type: 'LoanSubmitted'; loanId: Id<'loans'>; userId: Id<'users'> }
  | { type: 'LoanApproved'; loanId: Id<'loans'>; officerId: Id<'users'> }
  | { type: 'LoanRejected'; loanId: Id<'loans'>; reason: string }
  | { type: 'LoanFunded'; loanId: Id<'loans'> }
  | { type: 'LoanPaidOff'; loanId: Id<'loans'>; userId: Id<'users'> }
  | {
      type: 'DisbursementInitiated';
      disbursementId: Id<'disbursements'>;
      loanId: Id<'loans'>;
      amount: number;
    }
  | {
      type: 'DisbursementCompleted';
      disbursementId: Id<'disbursements'>;
      loanId: Id<'loans'>;
      amount: number;
    }
  | { type: 'DisbursementReversed'; disbursementId: Id<'disbursements'>; reason: string }
  | {
      type: 'PaymentRecorded';
      paymentId: Id<'paymentTransactions'>;
      loanId: Id<'loans'>;
      amount: number;
    }
  | { type: 'PaymentCompleted'; paymentId: Id<'paymentTransactions'>; loanId: Id<'loans'> }
  | { type: 'PaymentOverdue'; scheduleId: Id<'paymentSchedules'>; loanId: Id<'loans'> }
  | { type: 'KYCVerified'; userId: Id<'users'> }
  | { type: 'KYCRejected'; userId: Id<'users'> }
  | { type: 'PromiseToPayCreated'; promiseId: Id<'promiseToPay'>; loanId: Id<'loans'> }
  | { type: 'PromiseToPayBroken'; promiseId: Id<'promiseToPay'> };
```

**Convex-specific constraints**:

- Event dispatcher is an `internalMutation` (writes event record, schedules handlers)
- Handlers needing DB writes use `internalMutation`; those needing external IO use `internalAction`
- Idempotency via `processedAt` field on each event record — handlers check before acting

**Effort**: ~16 hours | **Risk**: Medium

---

### 3. Promote TigerBeetle to Primary Ledger

**Verdict**: ✅ Still Valid — CRITICAL but correctly deferred

**Current state**: Shadow mode with outbox pattern in Convex. `tigerBeetleOutboxWorker.ts` simulates posting. The code path is 90% built.

**Migration path**:

```
Phase 1 (current): Shadow mode — TB records alongside Convex fields
Phase 2 (next):    Dual-write with reconciliation assertion
                   → Convex action queries TB balance + compares to loans.outstandingBalance
                   → Runs on cron (every 5 min) + alerts on discrepancy
Phase 3 (target):  TB is primary — outstandingBalance derived from TB, not Convex field
```

**Dependency**: Requires deployed TB cluster (infrastructure, not code architecture).

**Effort**: Phase 2 = ~4 hours | Phase 3 = ~4 hours | **Risk**: High (financial data)

---

### 4. Frontend Feature-Sliced Design

**Verdict**: 🔄 Partially Valid — AdminDashboard already domain-organized

**What exists**: AdminDashboard has 15 domain-organized subdirectories (`Analytics/`, `LoanManagement/`, `PaymentManagement/`, `CollectionsManagement/`, etc.). The gap is the **client side** — `src/components/` is a flat grab-bag, and `src/pages/` mixes client pages with admin.

**Adjusted approach** (incremental, not a rewrite):

1. Create `src/features/client/` for client-facing pages and components
2. Co-locate admin hooks with their domain component directories (16 hooks in `AdminDashboard/hooks/`)
3. Lazy-load each AdminDashboard tab for bundle splitting
4. Add ESLint `no-restricted-imports` rules for domain boundaries
5. Merge redundant theme providers in `App.tsx`

**Effort**: ~12 hours | **Risk**: Low (file moves + lazy imports)

---

### 5. Harden Credit Scoring Engine

**Verdict**: 🔄 Partially Superseded

**Resolved**:

- Credit scoring UI wired into `LoanReviewPanel` + `Loan360View` (2026-03-04)
- Server-side `processLoanApplication` runs on `submitLoan` and writes scores

**Still valid**:

- `src/services/creditScoring.ts` (client-side) coexists with server-side scorer — confusing
- Missing `scoringVersion` field on `loans` table for regulatory audits
- No auto-reject/auto-approve thresholds in `systemConfiguration`

**Effort**: ~3 hours | **Risk**: Low

---

### 6. CI/CD Pipeline with Quality Gates

**Verdict**: 🔄 Partially Superseded

**Resolved**: GitHub Actions (`ci-web.yml`, `e2e.yml`) exist with Convex-aware gates. TypeScript strict mode enabled. 137 unit tests.

**Still valid**:

- No automated Convex deployment step (manual `npx convex deploy`)
- No Convex preview environment workflow for PRs
- No branch-specific Convex deployment

**Effort**: ~4 hours | **Risk**: Low

---

### 7. IPS Production Integration

**Verdict**: ✅ Still Valid — CRITICAL for production

Architecture is correct — mock adapter in `convex/actions/ipsAdapter.ts` with environment-driven switching. Blocked on Bank of Namibia PSP registration and mTLS certificates, not code.

**Effort**: ~4 hours (code) + external dependency | **Risk**: High (regulatory)

---

## Part 2: Gaps Not Previously Identified

### Gap A: `v.any()` Escape Hatches in Schema

**Risk**: Medium — undermines end-to-end type safety

The schema uses `v.any()` for `metadata` fields on 8+ tables (loans, disbursements, paymentTransactions, ipsTransactions, etc.) and for `conditions` in workflowDefinitions. Typos in metadata keys are invisible at compile time.

**Fix**: Define typed metadata validators per domain:

```typescript
const loanMetadata = v.optional(
  v.object({
    sourceChannel: v.optional(v.string()),
    referralCode: v.optional(v.string()),
  })
);
```

---

### Gap B: Missing Idempotency for Financial Mutations

**Risk**: High — double-click or network retry creates duplicate records

IPS transactions use `msgId` for idempotency, but `recordPayment` and `initiateDisbursement` have no idempotency key. Convex mutations are atomic but not idempotent by default.

**Fix**: Add `idempotencyKey: v.optional(v.string())` to financial mutations. Check for existing records with same key before inserting.

---

### Gap C: N+1 Query in `payments.ts`

**Risk**: Performance — worsens as users accumulate loans

`getMyPayments` loops over all user loans and queries `paymentTransactions` per loan (N+1 pattern).

**Fix**: Add `by_userId` index to `paymentTransactions` and query directly.

---

### Gap D: Admin Dashboard Bundle Size

**Risk**: UX/DX — 120 components loaded at once on admin entry

`App.tsx` lazy-loads `AdminDashboard` page, but once loaded, all 14 domain tabs and 75+ components are bundled together.

**Fix**: Lazy-load each admin tab:

```typescript
const LoanManagement = React.lazy(() => import('./components/LoanManagement'));
const PaymentManagement = React.lazy(() => import('./components/PaymentManagement'));
```

---

### Gap E: Dual Notification Field Aliases

**Risk**: Low — schema debt from organic growth

`notifications` has both `body` and `message`. `notificationQueue` has both `attempts` and `retryCount`, plus `body` and `content`. These aliases indicate organic growth without cleanup.

**Fix**: Deprecate aliases; standardize on one canonical field name per concept.

---

### Gap F: Provider Stack Depth (7 levels)

**Risk**: Low — DX and potential performance

`App.tsx` nests 7 providers: `ConvexProvider → ConvexAuthProvider → ErrorBoundary → QueryClientProvider → ThemeProvider → EnhancedThemeProvider → BrandingProvider → AuthProvider`.

`ThemeProvider` and `EnhancedThemeProvider` are partially redundant. `QueryClientProvider` may be removable if all data fetching is Convex-native.

**Fix**: Merge theme providers. Evaluate TanStack Query removal.

---

## Part 3: User Journey Architecture

### Client Journey — Guided Application Shell

**Current**: Register → KYC (separate page) → Loan Application (separate page) → Wait. No progress indicator, no contextual guidance. KYC is a blocking wall.

**Target**: Unified stepper flow owned by the Origination domain:

1. **Register** (Convex Auth)
2. **Complete Profile** (inline, not separate page)
3. **KYC Upload** (progressive, allow partial submission)
4. **Loan Application** (with client-side credit pre-check for UX feedback)
5. **Submission Confirmation** (progress tracker showing pipeline position)

The `useKYCEligibility` hook already gates loan submission reactively. The improvement is UX, not plumbing.

### Loan Officer Journey — Approval Cockpit

**Current gap**: `LoanReviewPanel` shows credit score and recommendation but lacks side-by-side comparison with similar past loans, quick-action buttons, and client communication history from `collectionsInteractions`.

**Target**: Single-screen approval cockpit per loan showing score, DTI, recommendation, client history, and one-click approve/reject with mandatory notes.

### Admin Journey — Domain-Aligned Navigation

**Current**: 14 tabs in flat navigation.

**Target**: Group tabs into domain clusters:

- **Lending** (Loans, Approvals, Disbursements)
- **Servicing** (Payments, Collections, Overdue)
- **Operations** (Reconciliation, Settlement, IPS)
- **Platform** (Users, Analytics, Settings, TigerBeetle)

This is a UI reorganization, not a code restructure.

---

## Part 4: Implementation Roadmap

### Phase 0 — Foundation (Week 1, ~8 hours)

| Task                                                              | Files                              | Effort | Risk   |
| ----------------------------------------------------------------- | ---------------------------------- | ------ | ------ |
| Extract shared validators to `convex/lib/validators.ts`           | 2 files                            | 1h     | Low    |
| Split `schema.ts` into 11 domain slice files                      | 12 new + 1 modified                | 3h     | Low    |
| Add idempotency key to `recordPayment` and `initiateDisbursement` | 2 mutations                        | 1h     | Medium |
| Fix N+1 query in `getMyPayments` (add `by_userId` index)          | schema.ts + payments.ts            | 1h     | Low    |
| Add `scoringVersion` field to loans schema                        | schema.ts + processLoanApplication | 30min  | Low    |
| Deprecate notification field aliases (JSDoc `@deprecated`)        | schema.ts                          | 30min  | Low    |

### Phase 1 — Domain Event Bus (Weeks 2-3, ~16 hours)

| Task                                                        | Files            | Effort | Risk   |
| ----------------------------------------------------------- | ---------------- | ------ | ------ |
| Create `domainEvents` table in schema                       | schema.ts        | 30min  | Low    |
| Implement `publishEvent()` helper in `convex/lib/events.ts` | New file         | 2h     | Medium |
| Implement `convex/eventHandlers.ts` dispatcher              | New file         | 3h     | Medium |
| Create subscribers: Audit, Notification, TigerBeetle        | 3 new files      | 4h     | Medium |
| Refactor `completeDisbursement` to publish event (pilot)    | disbursements.ts | 2h     | Medium |
| Refactor `completePayment` to publish event                 | payments.ts      | 2h     | Medium |
| Refactor `approveLoan` / `rejectLoan` to publish events     | loans.ts         | 2h     | Medium |
| Add event replay/idempotency guard                          | eventHandlers.ts | 1h     | Low    |

### Phase 2 — Frontend Modularization (Weeks 3-4, ~12 hours)

| Task                                                             | Files              | Effort | Risk |
| ---------------------------------------------------------------- | ------------------ | ------ | ---- |
| Create `src/features/client/` and move client pages + components | ~20 files          | 3h     | Low  |
| Co-locate admin hooks with domain component directories          | 16 hooks           | 2h     | Low  |
| Lazy-load each AdminDashboard tab                                | AdminDashboard.tsx | 2h     | Low  |
| Merge `ThemeProvider` + `EnhancedThemeProvider`                  | 3 files            | 2h     | Low  |
| Evaluate TanStack Query removal                                  | App.tsx + hooks    | 2h     | Low  |
| Add ESLint `no-restricted-imports` rules                         | eslint.config.js   | 1h     | Low  |

### Phase 3 — Production Hardening (Weeks 4-6, ~20 hours)

| Task                                                            | Files                      | Effort | Risk   |
| --------------------------------------------------------------- | -------------------------- | ------ | ------ |
| Add Convex preview deployment to PR workflow                    | ci-web.yml                 | 2h     | Low    |
| Add protected Convex production deploy on main merge            | deploy.yml                 | 2h     | Low    |
| Type `v.any()` metadata fields with domain-specific validators  | schema.ts + mutations      | 4h     | Medium |
| Implement TB reconciliation assertion (Phase 2 of TB migration) | New action + cron          | 4h     | Medium |
| Wire real TB cluster connection in outbox worker                | tigerBeetleOutboxWorker.ts | 4h     | High   |
| Wire real IPS adapter (when BoN credentials available)          | ipsAdapter.ts              | 4h     | High   |

### Phase 4 — User Journey Enhancements (Weeks 6-8, ~16 hours)

| Task                                                          | Files                           | Effort | Risk   |
| ------------------------------------------------------------- | ------------------------------- | ------ | ------ |
| Build guided application shell (stepper)                      | New component                   | 6h     | Medium |
| Group admin tabs into domain clusters                         | AdminDashboard.tsx + sidebar    | 3h     | Low    |
| Build approval cockpit with score, history, one-click actions | LoanReviewPanel                 | 4h     | Medium |
| Add client-side credit pre-check in loan application form     | LoanApplication + creditScoring | 3h     | Low    |

---

## Part 5: Architectural Principles

These principles should govern all future development decisions:

### 1. Domains Own Their Schema

Each domain's table definitions live in `convex/domains/<name>/tables.ts`. `schema.ts` is a thin assembler. No Convex function in one domain should directly write to another domain's tables. Cross-domain writes go through the event bus.

### 2. Events as the Integration Contract

The loan lifecycle emits typed domain events. Every other system reaction — notifications, audit logs, TigerBeetle entries, SMS/WhatsApp, credit bureau pings — is an event subscriber. The mutation that triggers the event is clean and focused on its own domain.

### 3. TigerBeetle is the Ledger Authority (Target State)

Convex is the operational database. TigerBeetle is the immutable financial ledger. `outstandingBalance` on loans becomes a cached projection derived from TB, not primary state. Until Phase 3 completes, TB remains in shadow mode with reconciliation assertions.

### 4. Adapters at the Perimeter

IPS, Africa's Talking, Meta — all live behind a typed interface in `convex/actions/`. Mock and production adapters implement the same interface, selected by environment variable. Domain logic never calls these directly; it publishes an event that the infrastructure layer handles.

### 5. Feature Slice = Testable Unit

A feature directory (`src/features/<name>/`) is testable in isolation with mocked Convex functions. Adding a new loan product type means creating a new feature slice and new event types, not modifying existing ones.

### 6. Financial Mutations are Idempotent

Every mutation that creates a financial record accepts an optional `idempotencyKey`. Duplicate submissions with the same key are no-ops. This is non-negotiable for payment and disbursement operations.

---

## Priority Summary

| Priority | Improvement                              | Status              | Est. Hours |
| -------- | ---------------------------------------- | ------------------- | ---------- |
| **P0**   | Schema domain slicing                    | Not started         | 4h         |
| **P0**   | Idempotency keys for financial mutations | Not started         | 1h         |
| **P0**   | N+1 query fix in payments                | Not started         | 1h         |
| **P1**   | Domain Event Bus                         | Not started         | 16h        |
| **P1**   | Frontend modularization                  | Not started         | 12h        |
| **P2**   | CI/CD Convex deploy automation           | Partially done      | 4h         |
| **P2**   | `v.any()` metadata typing                | Not started         | 4h         |
| **P2**   | TB reconciliation assertions             | Not started         | 4h         |
| **P2**   | Provider stack cleanup                   | Not started         | 2h         |
| **P3**   | Live TB cluster wiring                   | Blocked (infra)     | 4h         |
| **P3**   | Live IPS adapter wiring                  | Blocked (BoN creds) | 4h         |
| **P3**   | User journey enhancements                | Not started         | 16h        |

**Total estimated effort**: ~72 hours across 8 weeks.

---

## See Also

- [INDEX.md](./INDEX.md) — Documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture overview
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) — Outstanding technical debt register
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Convex schema reference
- [FLOWS.md](./FLOWS.md) — Transaction flow documentation
- [context.md](./context.md) — Technical handover document
