# NamLend Trust - Financial Ontology Engine

**Last Updated**: 2026-03-29
**Version**: v5.2.1 (Execution Hardening — Full event/projection/rules wiring)
**Status**: All 6 phases + gap closure + execution hardening; ~95% domain event coverage (21 mutations), 77% projection coverage (10/13 handlers), 5/5 business rules consumed, 4 ontology admin UI tabs

---

## Executive Summary

The Financial Ontology Engine transforms NamLend Trust from a lending application into a **knowledge-graph-powered financial services platform**. Every entity, relationship, event, rule, and projection in the system now forms a unified ontology of financial reality.

The "iron rule" driving this evolution: **every feature must add to the ontology (entity, relationship, event, rule, or projection), not just a screen to the UI.**

### What Changed

| Before (v4.x)                       | After (v5.0.0)                                   |
| ----------------------------------- | ------------------------------------------------ |
| Relational tables with foreign keys | Knowledge graph with typed relationships         |
| Audit logs only                     | Unified event journal with causality chains      |
| Hardcoded loan parameters           | Configurable product engine with versioning      |
| Single-tenant (NamLend only)        | Multi-institution platform with tenant isolation |
| String-based payment methods        | First-class payment rail entities with scoring   |
| No mandate support                  | Full mandate lifecycle with POPIA consent        |
| Point-in-time queries impossible    | Temporal versioning on configs and snapshots     |

---

## The Five Ontology Primitives

Every feature in the system maps to one of five primitives:

| Primitive        | Definition                                 | Example                                 |
| ---------------- | ------------------------------------------ | --------------------------------------- |
| **Entity**       | A thing that exists (table + fields)       | Loan, Institution, PaymentRail, Product |
| **Relationship** | A typed edge between entities              | `user -> borrowed -> loan`              |
| **Event**        | Something that happened (append-only)      | `loan.created`, `mandate.authorized`    |
| **Rule**         | A constraint that governs behavior         | APR <= 32%, eligibility criteria        |
| **Projection**   | A derived view of state at a point in time | End-of-day portfolio snapshot           |

---

## Architecture

### Directory Structure

```
convex/
  ontology/                     # Ontology domain modules (11 files)
    eventJournal.ts             # Unified event stream
    relationships.ts            # Entity knowledge graph
    mandates.ts                 # Mandate lifecycle
    mandateExecutions.ts        # Execution tracking
    consentRecords.ts           # POPIA consent
    institutions.ts             # Multi-tenancy
    paymentRails.ts             # Rail registry + selection
    products.ts                 # Product definitions + versions
    accounts.ts                 # Generalized ledger accounts
    snapshots.ts                # End-of-period regulatory snapshots
  lib/
    eventEmitter.ts             # emitEvent() fire-and-forget helper
    temporal.ts                 # asOf(), effectiveAt() helpers
    institutionScope.ts         # withInstitution() query wrapper
    railSelector.ts             # selectOptimalRail() pure function
    mandateStateMachine.ts      # Mandate state transition rules
    relationshipEmitter.ts      # emitRelationship() fire-and-forget helper
  scheduled/
    mandateExecutor.ts          # Cron: execute due mandates (06:00 UTC)
    railHealthMonitor.ts        # Cron: check rail availability (every 5 min)
    snapshotGenerator.ts        # Cron: end-of-day snapshots (23:30 UTC)
```

### Cross-Cutting Pattern

Every state-changing mutation now follows this sequence:

```
1. Auth guard (assertAuthenticated / assertStaff / assertAdmin)
2. Business rule validation
3. Atomic DB write(s)
4. Event journal entry (via emitEvent() fire-and-forget)
5. Relationship registration (via emitRelationship() fire-and-forget)
6. Audit log (existing scheduleAuditLog())
7. TigerBeetle outbox entry if financial (existing pattern)
```

Steps 4-6 use the **fire-and-forget scheduler pattern**: `ctx.scheduler.runAfter(0, internal.module.fn, {...}).catch(console.error)`. This means the relationship/event writes happen _after_ the mutation commits, never blocking the critical path.

---

## Phase 1: Temporal Foundation + Event Journal

**Goal**: Every subsequent layer depends on event tracing and temporal queries.

### Event Journal

A unified event stream with causality tracking. Every state-changing mutation writes here via the audit bridge.

| Field                     | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `eventType`               | Domain event name (e.g., `loan.created`, `mandate.authorized`) |
| `entityType` + `entityId` | What entity this event is about                                |
| `correlationId`           | Links events in the same business transaction                  |
| `causationId`             | Links events in a causal chain                                 |
| `actorId` + `actorType`   | Who caused this event (user/system/webhook/cron)               |
| `version`                 | Monotonically incrementing per entity (for ordering)           |

**Key design**: The audit bridge in `convex/lib/audit.ts` was extended so that `scheduleAuditLog()` also calls `emitEvent()`. This means all existing mutations auto-populate the event journal without touching any mutation files.

### Temporal Versioning

The `systemConfiguration` table now uses close-and-insert versioning: setting a config value closes the old record (`effectiveTo = now`) and inserts a new one (`effectiveFrom = now`). This enables "what was the value at time X?" queries.

Helpers in `convex/lib/temporal.ts`:

- `effectiveAt(records, asOf)` — finds the record effective at a point in time
- `currentlyEffective(records)` — convenience for `effectiveAt(records, Date.now())`
- `nearestSnapshot(snapshots, asOfDate)` — nearest snapshot on or before date

### Portfolio Snapshots

Daily cron at 23:30 UTC captures aggregate lending portfolio state (total active loans, outstanding balance, overdue count/amount, funded today, etc.) into the `snapshots` table. Ad-hoc snapshots can be triggered by admin.

---

## Phase 2: Mandate & Authorization Domain

**Goal**: Enable collections enforcement — the "keystone" missing entity.

### Mandate Lifecycle

```
draft -> pending_authorization -> active -> [suspended <-> active] -> revoked | expired
```

State transitions are validated by `convex/lib/mandateStateMachine.ts`. Terminal states (revoked, expired) allow no further transitions.

### Mandate Execution

Daily cron at 06:00 UTC (`mandateExecutor`) processes due mandates:

1. Finds active mandates where `nextExecutionDate <= now`
2. Expires mandates past their `expiresAt` date
3. Executes debit for due mandates (creates `mandateExecution` + `paymentTransaction` + TigerBeetle outbox entry atomically)

### POPIA Consent

`consentRecords` tracks data processing, debit mandate, credit check, communication, and data sharing consents. Each consent has `grantedAt`, `withdrawnAt`, `expiresAt`, and `legalBasis`. Consent can be checked programmatically via `checkConsent()` internalQuery.

### Integration

- **Disbursements**: Soft-check for active mandate before disbursement (warning, not blocker)
- **Collections**: Queue enriched with mandate status (`hasMandate`, `mandateRef`) for routing (mandate path vs. soft path)

---

## Phase 3: Entity Relationships / Knowledge Graph

**Goal**: Turn the database into an ontology where relationships are as valuable as entities.

### Relationship Model

Every relationship is a typed, temporal, directional edge:

```
source -> [relationshipType] -> target
```

| Relationship        | Source      | Target          | Created by             |
| ------------------- | ----------- | --------------- | ---------------------- |
| `borrowed`          | user        | loan            | `createLoan`           |
| `disbursed_via`     | loan        | disbursement    | `initiateDisbursement` |
| `repaid_via`        | loan        | payment         | `recordPayment`        |
| `requires_approval` | entity      | approvalRequest | `submitForApproval`    |
| `authorized`        | user        | mandate         | `createMandate`        |
| `secured_by`        | loan        | mandate         | `createMandate`        |
| `licensed_by`       | institution | institution     | `seedNamLendTrust`     |
| `offers`            | institution | product         | `createProduct`        |
| `holds`             | user        | account         | `createAccount`        |
| `instance_of`       | loan        | productVersion  | `createLoan`           |

### Graph Queries

- **`getRelated(entityType, entityId)`** — First-degree connections (both directions)
- **`getRelationshipGraph(entityType, entityId, maxDepth)`** — BFS traversal, depth-capped at 3
- **`getEntityContext(entityType, entityId)`** — Full context (relationships grouped by type + recent events) — powers back-office detail screens
- **`hasRelationship(source, target, type)`** — Boolean existence check

### Seeding

`seedExistingRelationships` (admin mutation) creates relationship edges from existing foreign keys — run once after deployment to backfill the graph from existing data.

---

## Phase 4: Multi-Institution Model

**Goal**: Transform from single-tenant app to multi-tenant platform.

### Institution Entity

```
institutions: { name, shortCode, type, status, regulatoryLicense, ... }
institutionConfig: { institutionId, key, value, effectiveFrom, effectiveTo, version }
```

Institution config uses the same temporal versioning as system config — close-and-insert pattern, queryable at any point in time.

### Tenant Isolation

- Every major table has `institutionId: v.optional(v.id('institutions'))` + `by_institutionId` index
- `withInstitution(records, institutionId)` filters results by institution (gracefully passes through unscoped records during migration)
- `belongsToInstitution(record, institutionId)` checks a single record

### Seeding + Backfill

1. `seedNamLendTrust()` — Creates NamLend Trust (lender) + Bank of Namibia (regulator), registers `licensed_by` relationship, seeds 8 default config values (max_apr, currency, loan limits, etc.)
2. `backfillInstitutionId(institutionId)` — Stamps all existing loans, disbursements, payments, approvals, and mandates with the institution ID

---

## Phase 5: Payment Rail Abstraction

**Goal**: Payment rails become first-class entities with cost, availability, and health.

### Rail Entity

Each payment rail has:

- **Availability window**: Business hours, weekends, holidays
- **Cost model**: Fixed fee, percentage fee, min/max caps
- **Settlement latency**: Minutes to settle
- **Retry policy**: Max retries, backoff multiplier, initial delay
- **Supported directions**: Disbursement, collection, or both
- **Health status**: Healthy, degraded, offline (updated by cron)

### Default Rails (Namibian)

| Rail          | Provider         | Fee           | Settlement | Availability                      |
| ------------- | ---------------- | ------------- | ---------- | --------------------------------- |
| IPS           | Namclear/BON     | N$5.00 fixed  | 15 min     | Business hours, no weekends       |
| Bank Transfer | Commercial Banks | N$15.00 fixed | 24 hours   | Business hours                    |
| Mobile Money  | MTC/TN Mobile    | 1.5% (N$2-50) | 5 min      | 24/7                              |
| Cash          | In-Branch        | Free          | Instant    | Business hours                    |
| Cheque        | —                | N$25.00 fixed | 3 days     | Business hours, disbursement only |

### Rail Selection Engine

`selectOptimalRail()` is a pure function that scores rails by:

- **Cost efficiency (40%)**: Lower fee = higher score
- **Speed (30%)**: Lower latency = higher score
- **Availability (20%)**: Currently available = full score
- **Reliability (10%)**: Recent health status

Disbursements now auto-select the optimal rail. The selection decision (score, reasoning) is recorded in the event journal.

### Health Monitoring

Cron every 5 minutes checks all active/degraded rails. Auto-transitions: active -> degraded (on failure), degraded -> active (on recovery).

---

## Phase 6: Financial Product Abstraction

**Goal**: Transform from hardcoded lending to configurable product engine.

### Product Model

```
productDefinitions -> productVersions (immutable, 1:many)
```

Product versions are **immutable once created**. Changing a product's terms creates a new version; the old version's `isCurrentVersion` is set to false. Every loan references the exact version of the product it was created under.

### Eligibility Engine

`checkEligibility(productVersionId, applicant)` evaluates configurable criteria:

- Credit score threshold
- Debt-to-income ratio cap
- Minimum monthly income
- Minimum age
- Employment requirement
- KYC verification requirement
- Amount and term range validation

Returns `{ eligible: boolean, reasons: string[] }` — does not block, only advises.

### Generalized Accounts

`accounts` table provides queryable ledger accounts (parallel to TigerBeetle):

- Account types: `loan_principal`, `loan_interest`, `loan_fees`, `savings`, `clearing`, `income`, `suspense`
- Internal mutations: `creditAccount`, `debitAccount`, `closeAccount`
- Auto-generated account numbers: `ACC-{type}-{timestamp}-{random}`

### Integration

- `createLoan` accepts optional `productVersionId` — validates amount, term, and interest rate against product config
- `loan -> instance_of -> productVersion` relationship registered in knowledge graph
- `seedPersonalLoan` extracts current hardcoded parameters into a configurable product

---

## Schema Summary

### New Tables (12)

| Table                | Phase | Rows Created By                   |
| -------------------- | ----- | --------------------------------- |
| `eventJournal`       | 1     | Every mutation (via audit bridge) |
| `snapshots`          | 1     | Daily cron + ad-hoc               |
| `mandates`           | 2     | Client or staff                   |
| `mandateExecutions`  | 2     | Mandate executor cron             |
| `consentRecords`     | 2     | Client consent flow               |
| `relationships`      | 3     | Every entity-creating mutation    |
| `institutions`       | 4     | Admin seed + CRUD                 |
| `institutionConfig`  | 4     | Admin config management           |
| `paymentRails`       | 5     | Admin seed + CRUD                 |
| `productDefinitions` | 6     | Admin product creation            |
| `productVersions`    | 6     | Admin version creation            |
| `accounts`           | 6     | System (disbursement) or admin    |

### Modified Existing Tables

| Table                 | Added Fields                                     | Added Indexes      |
| --------------------- | ------------------------------------------------ | ------------------ |
| `loans`               | `institutionId`, `productVersionId`, `accountId` | `by_institutionId` |
| `disbursements`       | `institutionId`, `railId`                        | `by_institutionId` |
| `paymentTransactions` | `institutionId`                                  | `by_institutionId` |
| `approvalRequests`    | `institutionId`                                  | `by_institutionId` |
| `mandates`            | (already had `institutionId`)                    | `by_institutionId` |
| `systemConfiguration` | `effectiveFrom`, `effectiveTo`, `version`        | `by_key_effective` |

---

## New Files Inventory (19 files)

### Ontology Domain Modules (`convex/ontology/`)

| File                   | Lines | Exports                                                                                                                                                                                                                                                                        |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eventJournal.ts`      | ~100  | `writeEvent`, `getEventsByEntity`, `getEventsByCorrelation`, `getEventStream`, `getEventCountByDomain`                                                                                                                                                                         |
| `snapshots.ts`         | ~100  | `generatePortfolioSnapshot`, `triggerAdHocSnapshot`, `getSnapshotsByDateRange`, `getLatestSnapshot`, `getEntitySnapshots`                                                                                                                                                      |
| `mandates.ts`          | ~400  | `createMandate`, `submitMandate`, `authorizeMandate`, `suspendMandate`, `reactivateMandate`, `revokeMandate`, `expireMandate`, `advanceExecution`, `getMyMandates`, `getMandatesByLoan`, `getMandateByRef`, `getMandate`, `listMandates`, `getDueMandates`, `hasActiveMandate` |
| `mandateExecutions.ts` | ~150  | `executeMandateDebit`, `completeExecution`, `failExecution`, `getExecutionsByMandate`, `getPendingExecutions`, `getActiveMandatesInternal`                                                                                                                                     |
| `consentRecords.ts`    | ~150  | `grantConsent`, `withdrawConsent`, `getMyConsents`, `checkConsent`, `getConsentsByUser`, `listConsents`                                                                                                                                                                        |
| `relationships.ts`     | ~520  | `createRelationship`, `deactivateRelationshipById`, `deactivateByEntities`, `getRelated`, `getRelationshipGraph`, `hasRelationship`, `getEntityContext`, `listRelationshipsByType`, `seedExistingRelationships`                                                                |
| `institutions.ts`      | ~350  | `createInstitution`, `updateInstitution`, `getInstitution`, `getInstitutionByCode`, `listInstitutions`, `setInstitutionConfig`, `getInstitutionConfig`, `getAllInstitutionConfig`, `seedNamLendTrust`, `backfillInstitutionId`                                                 |
| `paymentRails.ts`      | ~320  | `createRail`, `updateRail`, `updateRailHealth`, `getRail`, `getRailByCode`, `listRails`, `getActiveRails`, `seedDefaultRails`                                                                                                                                                  |
| `products.ts`          | ~400  | `createProduct`, `updateProduct`, `createVersion`, `getProduct`, `getProductByCode`, `listProducts`, `getActiveProducts`, `getCurrentVersion`, `getVersionHistory`, `checkEligibility`, `seedPersonalLoan`                                                                     |
| `accounts.ts`          | ~300  | `createAccount`, `creditAccount`, `debitAccount`, `closeAccount`, `getAccount`, `getAccountByNumber`, `getAccountsByOwner`, `getAccountsByProductInstance`, `listAccounts`, `adminCreateAccount`                                                                               |

### Library Helpers (`convex/lib/`)

| File                     | Purpose                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `eventEmitter.ts`        | `emitEvent()` + `generateCorrelationId()`                                                               |
| `temporal.ts`            | `effectiveAt()`, `currentlyEffective()`, `nearestSnapshot()`, `toSnapshotDate()`, `isCurrentlyActive()` |
| `relationshipEmitter.ts` | `emitRelationship()` + `deactivateRelationship()`                                                       |
| `mandateStateMachine.ts` | `validateMandateTransition()`, `generateMandateRef()`, `calculateNextExecutionDate()`                   |
| `institutionScope.ts`    | `withInstitution()` + `belongsToInstitution()`                                                          |
| `railSelector.ts`        | `selectOptimalRail()` pure function                                                                     |

### Scheduled Jobs (`convex/scheduled/`)

| File                   | Schedule        |
| ---------------------- | --------------- |
| `snapshotGenerator.ts` | Daily 23:30 UTC |
| `mandateExecutor.ts`   | Daily 06:00 UTC |
| `railHealthMonitor.ts` | Every 5 minutes |

---

## Modified Existing Files

| File                         | Changes                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `convex/schema.ts`           | 12 new tables, 15 exported validators, 6 modified tables with new fields/indexes |
| `convex/lib/audit.ts`        | Extended `scheduleAuditLog()` to also call `emitEvent()` (audit bridge)          |
| `convex/systemConfig.ts`     | Temporal versioning (close-and-insert pattern)                                   |
| `convex/crons.ts`            | Added 3 new crons (eod-snapshot, mandate-executor, rail-health-monitor)          |
| `convex/loans.ts`            | Product validation + `emitRelationship` + `emitEvent`                            |
| `convex/payments.ts`         | `emitRelationship` (loan -> repaid_via -> payment)                               |
| `convex/disbursements.ts`    | Mandate soft-check, rail selection, `emitRelationship`, `emitEvent`              |
| `convex/approvalWorkflow.ts` | `emitRelationship` (entity -> requires_approval -> approvalRequest)              |
| `convex/collections.ts`      | Collections queue enriched with mandate status                                   |

---

## Backward Compatibility

- All new fields on existing tables use `v.optional()` — no existing data breaks
- All new query filters are optional — existing frontend queries are unchanged
- Existing `useQuery`/`useMutation` calls never break
- No UI changes were made — this is a pure backend evolution
- Zero new `as any` casts introduced

---

## Adoption Status (v5.1.0 — 2026-03-28)

### Event Journal Coverage (~95%)

The audit bridge in `convex/lib/audit.ts` auto-emits event journal entries from every `scheduleAuditLog()` / `scheduleAuditEntry()` call. In v5.1.0, 10 previously uncovered mutations were wired:

| File                  | Mutation                       | Event Type                                               |
| --------------------- | ------------------------------ | -------------------------------------------------------- |
| `loans.ts`            | `recordCreditScore`            | `loans.RECORD_CREDIT_SCORE`                              |
| `loans.ts`            | `updateLoanBalance`            | `loans.BALANCE_UPDATE` (every update, not just paid_off) |
| `payments.ts`         | `createPaymentSchedule`        | `paymentSchedules.CREATE_SCHEDULE`                       |
| `payments.ts`         | `markSchedulePaid`             | `paymentSchedules.MARK_PAID`                             |
| `approvalWorkflow.ts` | `createWorkflowDefinition`     | `workflowDefinitions.CREATE`                             |
| `approvalWorkflow.ts` | `createSystemApprovalRequest`  | `approvalRequests.SYSTEM_CREATE`                         |
| `collections.ts`      | `markReminderSent`             | `overdueReminders.SEND`                                  |
| `notifications.ts`    | `markNotificationRead`         | `notifications.MARK_READ`                                |
| `notifications.ts`    | `markAllNotificationsRead`     | `notifications.MARK_ALL_READ`                            |
| `notifications.ts`    | `updateNotificationPreference` | `notificationPreferences.UPDATE_PREFERENCE`              |

### Relationship Graph (25 emissions)

12 new relationship emissions added in v5.1.0 (13 existing → 25 total):

| File                   | Mutation                   | Relationship                                        |
| ---------------------- | -------------------------- | --------------------------------------------------- |
| `collections.ts`       | `recordInteraction`        | `loan -> has_interaction -> collectionsInteraction` |
| `collections.ts`       | `createPromiseToPay`       | `loan -> has_promise -> promiseToPay`               |
| `collections.ts`       | `markPromiseFulfilled`     | `deactivateRelationship` on promise                 |
| `mandateExecutions.ts` | `executeMandateDebit`      | `mandate -> executed_via -> mandateExecution`       |
| `consentRecords.ts`    | `grantConsent`             | `user -> has_consent -> consentRecord`              |
| `users.ts`             | `assignRole`               | `user -> has_role -> userRole`                      |
| `users.ts`             | `removeRole`               | `deactivateRelationship` on role                    |
| `payments.ts`          | `completePayment`          | `payment -> settled_against -> loan`                |
| `payments.ts`          | `createPaymentSchedule`    | `loan -> has_schedule -> paymentSchedule`           |
| `approvalWorkflow.ts`  | `processApprovalRequest`   | `approvalRequest -> decided_by -> user`             |
| `approvalWorkflow.ts`  | `createWorkflowDefinition` | `workflowDefinition -> applies_to -> system`        |

### Correlation Chain Infrastructure

- `loans.correlationId` — optional field to persist event chain ID across loan lifecycle
- `eventJournal.by_causationId` — new index for causation chain traversal
- `scheduleAuditLog()` / `scheduleAuditEntry()` — now accept optional `correlationId`/`causationId` params
- `getEventsByCausation` — new query in `ontology/eventJournal.ts` for "what did this event trigger?" tracing

### Gap Closure (v5.2.0 — 2026-03-28)

**Phase 1A: Semantic Domain Events** — `convex/lib/domainEvents.ts` created with 15 past-tense event types (`loan.created`, `loan.approved`, `disbursement.completed`, etc.). All lifecycle mutations in `loans.ts`, `disbursements.ts`, and `payments.ts` now emit both audit bridge events (CRUD-style) and semantic domain events (past-tense).

**Phase 1B: Credit Scoring UI Completion** — `CreditScoreSummary` component created. Client Dashboard no longer hardcodes score (reads from real loan data). LoanReviewPanel now shows AI reasoning text below recommendation badge.

**Phase 1C: Legacy Service Cleanup** — Deleted dead `api-client.ts` + `useApiQueries.ts`. `creditScoring.ts` and `brandingService.ts` retained (active importers).

**Phase 2: Event-Driven Projections** — `portfolioMetrics` table added. Domain events trigger incremental projection updates via `scheduleProjection()`. `analytics.ts` reads from projections (O(1)) when available, falling back to full scan. 5 projection handlers: `onLoanApproved`, `onLoanFunded`, `onPaymentCompleted`, `onLoanPaidOff`, `onDisbursementCompleted`.

**Phase 3A: Rules as Data** — `businessRules` table with close-and-insert versioning. `ruleEvaluator.ts` provides typed accessors (`getNumericRule`, `getJsonRule`) with hardcoded fallbacks. `regulatory.ts` now has `getAPRLimit(ctx)` async function. `railSelector.ts` accepts optional `weights` parameter. `ontology/businessRules.ts` provides CRUD + `seedDefaultRules`.

**Phase 3B: Ontology Admin UI** — 3 new admin tabs: Institutions (`InstitutionsDashboard`), Payment Rails (`PaymentRailsDashboard`), Products (`ProductsDashboard`). Each has list view, seed button, and detail display.

### Execution Hardening (v5.2.1 — 2026-03-29)

Closes the gap between "ontology exists" and "ontology drives the product." Every change improves execution certainty (can money move when it should?), authorization certainty (can you prove who agreed to what?), or financial truth (can you prove what actually happened?).

**Phase 1: Complete Event Coverage (68% → ~95%)**

| File                  | Mutation                 | Domain Event                              |
| --------------------- | ------------------------ | ----------------------------------------- |
| `approvalWorkflow.ts` | `submitForApproval`      | `approval.submitted`                      |
| `approvalWorkflow.ts` | `processApprovalRequest` | `approval.approved` / `approval.rejected` |
| `collections.ts`      | `recordInteraction`      | `collection.interaction_recorded`         |
| `collections.ts`      | `createPromiseToPay`     | `collection.promise_recorded`             |
| `collections.ts`      | `markPromiseFulfilled`   | `collection.promise_fulfilled`            |
| `users.ts`            | `assignRole`             | `user.role_assigned`                      |
| `users.ts`            | `adminUpdateProfile`     | `user.profile_updated`                    |

8 new event types added to `domainEvents.ts` catalog (15 → 23 total). `inferDomainSource()` updated for approvals, collections, identity domains.

**Phase 2: Complete Projection Wiring (38% → 77%)**

5 new projection handlers in `portfolioProjection.ts`:

- `onLoanCreated` → `pending_loan_count` + `pending_loan_amount`
- `onLoanSubmitted` → `submitted_loan_count`
- `onLoanRejected` → `rejected_loan_count`
- `onDisbursementFailed` → `failed_disbursement_count`
- `onPaymentFailed` → `failed_payment_count`

All 5 registered in `projectionEmitter.ts`. Total: 10/13 domain events trigger projections (remaining 3 are transitional states).

**Phase 3: Wire Business Rules into Consumers (seeded → consumed)**

| Rule                   | Consumer                                          | Behavior                                                                                                                                   |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `RAIL_WEIGHTS`         | `disbursements.ts` → `initiateDisbursement`       | `getJsonRule()` reads weights, passes to `selectOptimalRail()`. Changing weights in admin dashboard changes rail selection without deploy. |
| `MIN_CREDIT_SCORE`     | `loans.ts` → `approveLoan`                        | `getNumericRule()` reads threshold (fallback 580). Loans with score below threshold throw `CREDIT_CHECK_FAILED`.                           |
| `MAX_DTI_RATIO`        | `loans.ts` → `approveLoan`                        | `getNumericRule()` reads threshold (fallback 0.43). Loans exceeding DTI throw `DTI_CHECK_FAILED`.                                          |
| `APR_LIMIT`            | Already consumed via `getAPRLimit(ctx)` in v5.2.0 | —                                                                                                                                          |
| `DATA_RETENTION_YEARS` | Reference rule (no runtime consumer needed)       | —                                                                                                                                          |

All 5 seeded rules are now actively consumed. Unscored loans (legacy, manual) pass through gracefully — validation only triggers when `creditScore`/`debtToIncomeRatio` fields are present.

**Phase 4: Business Rules Admin UI**

New admin tab: **Business Rules** (`BusinessRulesDashboard.tsx`). Features:

- Rules grouped by category (Regulatory, Credit Scoring, Payment Routing)
- Inline edit with save/cancel (close-and-insert versioning)
- Version history timeline per rule
- JSON pretty-print for structured rules (e.g., `RAIL_WEIGHTS`)
- Seed button for `seedDefaultRules`

Total: **4 ontology admin UI tabs** (Institutions, Payment Rails, Products, Business Rules).

### Remaining Gaps

- **Correlation threading not yet active**: Loan lifecycle mutations don't yet pass `correlationId` forward (schema + infrastructure ready, wiring pending)
- **Causation IDs not yet populated**: No mutation currently sets `causationId` (schema + query ready)
- **TigerBeetle shadow to primary**: Outbox pattern works reliably; transition to primary ledger deferred (production infrastructure decision)
- **Seed data**: `seedNamLendTrust`, `seedDefaultRails`, `seedPersonalLoan`, `seedDefaultRules` available via admin UI or Convex dashboard

## Verification

All phases verified with:

1. `npx convex dev --once` — schema deploys cleanly, "Convex functions ready!"
2. `npm run build` — frontend compiles with no new errors (only pre-existing chunk size warnings)

---

## How to Use the Ontology

### Seed the Platform (Run Once After Deployment)

```typescript
// 1. Seed NamLend Trust institution + Bank of Namibia
const { institutionId } = await seedNamLendTrust();

// 2. Backfill existing records with institution ID
await backfillInstitutionId({ institutionId });

// 3. Seed default payment rails
await seedDefaultRails();

// 4. Seed the Personal Loan product
await seedPersonalLoan({ institutionId });

// 5. Seed relationships from existing foreign keys
await seedExistingRelationships();
```

### Query the Knowledge Graph

```typescript
// Get full context for a loan (relationships + events)
const context = await getEntityContext({ entityType: 'loans', entityId: loanId });
// Returns: { relationships: { borrowed: [...], disbursed_via: [...], repaid_via: [...] }, recentEvents: [...] }

// Traverse the graph to 2 degrees of separation
const graph = await getRelationshipGraph({ entityType: 'users', entityId: userId, maxDepth: 2 });

// Check if a relationship exists
const hasBorrowed = await hasRelationship({
  sourceEntityType: 'users',
  sourceEntityId: userId,
  targetEntityType: 'loans',
  targetEntityId: loanId,
  relationshipType: 'borrowed',
});
```

### Define New Products (No Code Changes)

```typescript
// Create a micro-loan product
const { productId } = await createProduct({
  productCode: 'micro_loan',
  name: 'Micro Loan',
  category: 'loan',
  institutionId,
});

// Configure it with a version
await createVersion({
  productId,
  config: {
    minAmount: 100,
    maxAmount: 5000,
    minTermMonths: 1,
    maxTermMonths: 6,
    maxInterestRate: 25,
    requiresKYC: true,
    requiresMandate: false,
    eligibilityCriteria: { minCreditScore: 400, minAge: 18 },
  },
});
```

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Convex schema reference
- [FUNCTIONALITY_MAP.md](./FUNCTIONALITY_MAP.md) — Feature to code mapping
- [Raw_Thoughts.md](./Raw_Thoughts.md) — Original vision document
