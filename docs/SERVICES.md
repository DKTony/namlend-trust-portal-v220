# NamLend Trust - Services Documentation

**Doc Revision**: 2026-04-06
**Status**: Service layer implemented across all domains. IPS/IPP user-facing flows now run through Convex hooks and `api.ips.*`; older service wrappers remain only as legacy/reference unless explicitly noted.

---

## Service Index (src/services)

Legend: ✅ Migrated / deprecated (zero active UI consumers) | ⚠️ Legacy / reference | 🔜 Pending non-IPP migration work

| Service                    | Purpose                          | Migration Status | Notes                                                                                                                       |
| -------------------------- | -------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `api-client.ts`            | API orchestration client         | ⚠️ Legacy        | Edge Function API wrapper with retries/metrics                                                                              |
| `approvalWorkflow.ts`      | Approval request workflow        | ✅ Batch 1       | **Deprecated** — zero UI imports remain. All consumers use `api.approvalWorkflow.*` directly. Safe to delete after Batch 3. |
| `loanService.ts`           | Loan record helpers              | ✅ Batch 1       | **Deprecated** — `useLoanApplications` now uses `useQuery(api.loans.adminListLoans)` directly.                              |
| `convex/loanService.ts`    | Convex loan helpers (imperative) | ✅ Batch 1       | No active UI consumers remain after Batch 1.                                                                                |
| `disbursementService.ts`   | Disbursement state machine       | ✅ Batch 2       | **Zero active UI consumers** — safe to delete after Batch 3 verification                                                    |
| `paymentService.ts`        | Payment processing               | ✅ Batch 2       | **Zero active UI consumers** — safe to delete after Batch 3 verification                                                    |
| `paymentGateway.ts`        | Provider routing + instructions  | ✅ Batch 2       | **Zero active UI consumers** — safe to delete after Batch 3 verification                                                    |
| `ipsService.ts`            | IPS payment integration          | ⚠️ Legacy        | Portal UI uses Convex hooks (`useIPSPayment`, `useUserVPAs`) and `api.ips.*`; file retained as reference                    |
| `ipsOnboardingService.ts`  | IPP onboarding                   | ⚠️ Legacy        | Portal UI uses `useIPPOnboarding` and Convex onboarding mutations directly                                                  |
| `collectionsService.ts`    | Collections workflow             | ✅ Batch 2       | **Zero active UI consumers** — `CollectionsDashboard` uses Convex directly (N3). Safe to delete after Batch 3 verification  |
| `reconciliationService.ts` | Bank transaction matching        | 🔜 Batch 3       | Manual and auto matching                                                                                                    |
| `notificationService.ts`   | In-app notifications             | ✅ Batch 2       | **Deprecated** — `NotificationCenter` inlined type + helper; zero UI imports remain                                         |
| `smsGateway.ts`            | SMS templates + logging          | 🔜 Batch 3       | Client-side logging; Edge function for delivery                                                                             |
| `whatsappGateway.ts`       | WhatsApp templates + logging     | 🔜 Batch 3       | Client-side logging; Edge function for delivery                                                                             |
| `auditService.ts`          | Audit trail access               | ⚠️ Legacy        | RPCs for logs/transitions                                                                                                   |
| `workflowEngine.ts`        | Multi-stage workflows            | ✅ Batch 1       | `WorkflowManagementDashboard` uses `api.approvalWorkflow.listWorkflowDefinitions` directly                                  |
| `roleManagementService.ts` | Role assignment rules            | 🔜 Batch 3       | Validated via RPC                                                                                                           |
| `adminService.ts`          | Admin profile data               | 🔜 Batch 3       | RPC for profiles with roles                                                                                                 |
| `ledgerService.ts`         | TigerBeetle outbox               | ⚠️ Legacy        | Simulated posting via Edge worker                                                                                           |
| `settlementService.ts`     | Settlement runs + reports        | 🔜 Batch 3       | DNS settlement workflows; audit logging, callRpc resilience (Feb 2026)                                                      |
| `clientService.ts`         | Client profile access            | ✅ Batch 1       | `ClientProfileModal` uses `api.users.getUserProfile` directly                                                               |
| `financeService.ts`        | Budget & finance tracking        | ✅ Batch 2       | **Deprecated** — `BudgetTracker` inlined mock data + helpers; zero UI imports remain                                        |
| `creditScoring.ts`         | AI credit risk assessment        | ⚠️ Legacy        | Scoring, recommendations, affordability checks                                                                              |

---

## Approval Workflow

**File**: `src/services/approvalWorkflow.ts`  
**Migration Status**: ✅ **DEPRECATED — Batch 1 complete (2026-02-23)**

All UI consumers now use Convex directly:

| Legacy export               | Convex replacement                                         |
| --------------------------- | ---------------------------------------------------------- |
| `submitApprovalRequest()`   | `useMutation(api.approvalWorkflow.submitForApproval)`      |
| `getAllApprovalRequests()`  | `useQuery(api.approvalWorkflow.adminListApprovals)`        |
| `getUserApprovalRequests()` | `useQuery(api.approvalWorkflow.getMyApprovalRequests)`     |
| `updateApprovalStatus()`    | `useMutation(api.approvalWorkflow.processApprovalRequest)` |
| `getApprovalHistory()`      | `useQuery(api.approvalWorkflow.getApprovalHistory)`        |
| Workflow definitions        | `useQuery(api.approvalWorkflow.listWorkflowDefinitions)`   |

This file is safe to delete after Batch 3 verification.

---

## Disbursement Service

**File**: `src/services/disbursementService.ts`

Key exports:

- `createDisbursementOnApproval()`
- `approveDisbursement()`
- `markDisbursementProcessing()`
- `completeDisbursement()`
- `failDisbursement()`
- `getPendingDisbursements()`
- `getDisbursementById()`
- `getDisbursementsForLoan()`

Notes:

- `completeDisbursement()` posts a TigerBeetle outbox event (non-blocking).

---

## Payment Service

**File**: `src/services/paymentService.ts`

Key exports:

- `processLoanPayment()` (RPC `process_loan_payment`)
- `generatePaymentSchedule()`
- `getPaymentSchedule()`
- `applyPaymentToSchedule()`
- `markOverduePayments()`
- `calculateLateFee()` / `waiveLateFee()`
- `getLoanPaymentDetails()`
- `getLoanPortfolioSummary()`

Notes:

- Payment processing posts repayment events to the TigerBeetle outbox.
- `create_payment` RPC is used for client-initiated payment creation (idempotent).

---

## Payment Gateway

**File**: `src/services/paymentGateway.ts`

Supported providers (manual or webhook-driven):

- `bank_transfer`
- `mobile_money_mtc`
- `mobile_money_tn`
- `paytoday`
- `cash`

Key exports:

- `initiatePayment()`
- `verifyPayment()`
- `getPaymentInstructions()`
- `handlePaymentWebhook()`
- `getPaymentHistory()`
- `getAvailablePaymentMethods()`

Notes:

- IPS/IPP payments in the portal are handled by Convex hooks and `api.ips.*`, not by `src/services/ipsService.ts`.

---

## IPS Service

**File**: `src/services/ipsService.ts`

Key exports:

- `initiateIPSDisbursement()`
- `initiateIPSRepayment()`
- `completeIPSTransaction()`
- `getIPSTransactionStatus()` / `checkIPSTransactionStatus()`
- `validateVPA()`
- `getUserVPAs()` / `upsertUserVPA()` / `deleteUserVPA()` / `setDefaultVPA()`
- `getLoanIPSTransactions()`
- `getPendingIPSTransactions()`

Notes:

- No active portal UI imports remain.
- The live portal path is:
  - `useIPSPayment`
  - `useUserVPAs`
  - `convex/ips/*`
  - `convex/actions/ipsAdapter.ts`
- This file should be treated as legacy/reference only.

---

## IPP Onboarding Service

**File**: `src/services/ipsOnboardingService.ts`

Key exports:

- `getOrCreateOnboarding()`
- `advanceOnboardingStep()`
- `isUserIPPReady()`
- `getOnboardingSummary()`
- `getUsersPendingOnboarding()`
- `adminInitiateOnboarding()`
- Adapter calls: list providers, list accounts, register mobile, map alias, set credentials

Notes:

- No active portal UI imports remain.
- The live portal onboarding path is `useIPPOnboarding` backed by `api.ips.ipsOnboarding.*`.
- This file should be treated as legacy/reference only.

---

## Collections Service

**File**: `src/services/collectionsService.ts`

Key exports:

- `generateCollectionQueue()`
- `recordCollectionActivity()`
- `assignToCollectionAgent()`
- `recordPaymentPromise()` / `markPromiseFulfilled()`
- `getCollectionActivities()` / `getOverdueLoans()`
- `getCollectionsQueue()` / `getCollectionsStats()`
- `createPromiseToPay()` / `resolvePromiseToPay()` / `getPromisesToPay()`
- `logInteraction()` / `getInteractions()`
- `requestReschedule()` / `getRescheduleRequests()` / `processRescheduleRequest()`

---

## Reconciliation Service

**File**: `src/services/reconciliationService.ts`

Key exports:

- `importBankTransactions()`
- `autoMatchPayments()`
- `manualMatchPayment()`
- `getUnmatchedTransactions()`
- `getUnmatchedPayments()`
- `getReconciliationReport()`

Notes:

- Uses legacy `bank_transactions` + `payment_reconciliations` tables.
- `api-reconciliation` Edge Function and `reconciliation_runs` schema exist, but UI still uses this service directly (see `DATABASE_SCHEMA.md`).

---

## Notification Service

**File**: `src/services/notificationService.ts`

Key exports:

- `getNotifications()`
- `getUnreadCount()`
- `markAsRead()` / `markAllAsRead()`
- `getPreferences()` / `updatePreference()`
- `queueNotification()`
- `subscribeToNotifications()`

Notes:

- Functions are tolerant of missing tables (returns empty results).

---

## SMS and WhatsApp Gateways

**Files**: `src/services/smsGateway.ts`, `src/services/whatsappGateway.ts`

Notes:

- Client-side services log to `communication_logs` and `notification_queue`.
- Actual delivery is via Edge Functions (`send-sms`, `send-whatsapp`) with secrets.

---

## Audit Service

**File**: `src/services/auditService.ts`

Key exports:

- `AuditService.logViewAccess()`
- `AuditService.logStateTransition()`
- `AuditService.getAuditLogs()` / `getViewLogs()` / `getStateTransitions()`

---

## Workflow Engine

**File**: `src/services/workflowEngine.ts`

Key exports:

- `getActiveWorkflow()`
- `startWorkflow()`
- `getWorkflowInstance()`
- `getCurrentStageExecution()` / `getStageExecutions()`
- `getMyPendingStages()`
- `approveStage()` / `rejectStage()` / `skipStage()`

---

## Role Management and Admin

**Files**: `src/services/roleManagementService.ts`, `src/services/adminService.ts`

Key exports:

- `assignUserRole()` / `removeUserRole()` / `setUserRoles()`
- `getUserRoles()` / `validateRoleHierarchy()`
- `getProfilesWithRoles()` / `listUserRoles()`

---

## Ledger Service (TigerBeetle)

**File**: `src/services/ledgerService.ts`

Key exports:

- `createLoanAccounts()` / `getAccountMapping()`
- `postDisbursement()` / `postRepayment()` / `postLateFeeAccrual()`
- `postIPSInitiate()` / `postIPSComplete()` / `postIPSVoid()`
- Outbox processing helpers and reconciliation utilities

Notes:

- Browser uses outbox tables; Edge worker processes entries.
- Direct TB client is Node-only and disabled in browser.

---

## Settlement Service

**File**: `src/services/settlementService.ts`

Key exports:

- `getSettlementRuns()` / `getSettlementRunDetails()`
- `getPacs009BatchDetails()` / `getPacs009Batches()`
- `getSettlementReports()` / `getReportContent()`
- `getSettlementAdjustments()` / `getAdjustment()` / `updateAdjustmentStatus()`
- `getTimeoutTransactions()` / `getSettlementStatistics()`
- `createSettlementRun()` / `processSettlementRun()` / `markSettlementSettled()`

Notes:

- All mutations use `callRpc()` from `@/utils/rpc` (circuit breaker + timeout + jitter); financial mutations use `retries: 0`.
- State-changing operations log via `AuditService.logStateTransition()` for CLAUDE.md compliance.
- `postSettlementRunToTigerBeetle()` posts net instructions to TigerBeetle outbox.

---

## Finance Service

**File**: `src/services/financeService.ts`

Key exports:

- `getTransactions()` - Fetch user transactions (mock data currently)
- `getBudgetOverview()` - Get budget limits by category
- `getSavingsGoals()` - Get user's savings goals with progress
- `processCSVUpload()` - Parse bank statement CSV and categorize transactions
- `createSavingsGoal()` - Create a new savings goal
- `addFundsToSavingsGoal()` - Add funds to existing savings goal
- `updateBudgetLimit()` - Update category budget limits

Notes:

- Currently uses mock data; will be integrated with Supabase tables.
- Supports CSV upload from Standard Bank, FNB, Nedbank formats.
- Powers the `/budget` page (Budget Tracker).

---

## Credit Scoring Service

**File**: `src/services/creditScoring.ts`

Key exports:

- `calculateCreditScore()` - AI-powered credit risk assessment
- `getLoanRecommendation()` - Get approval recommendation with terms
- `getCreditFactors()` - Analyze credit factors (income, debt, history)
- `getAffordabilityScore()` - Calculate debt-to-income affordability
- `CREDIT_SCORE_RANGES` - Score range definitions (Excellent/Good/Fair/Poor)

Notes:

- Uses weighted scoring algorithm (income 25%, debt ratio 20%, employment 15%, etc.).
- Enforces 32% APR regulatory limit from `constants/regulatory.ts`.
- Returns `LoanRecommendation` with approved amount, suggested terms, and conditions.
- Currently surfaced via `CreditScoreDisplay` only; not wired into `LoanApplication.tsx` or approval decisions.

---

## Environment Variables

**Client (Vite) — only `VITE_*` vars here, NO secrets**

```env
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
VITE_DEBUG_TOOLS=false
VITE_RUN_DEV_SCRIPTS=false
VITE_ALLOW_LOCAL_ADMIN=false
VITE_TEST_ADMIN_EMAIL=
VITE_TEST_ADMIN_PASSWORD=
VITE_E2E=false
```

**Convex Environment Variables (server-side secrets — set via `npx convex env set`)**

```bash
# SMS (Africa's Talking)
npx convex env set AFRICASTALKING_API_KEY=<value>
npx convex env set AFRICASTALKING_USERNAME=<value>
npx convex env set SMS_SENDER_ID=NAMLEND

# WhatsApp (Meta Cloud API)
npx convex env set WHATSAPP_PHONE_NUMBER_ID=<value>
npx convex env set WHATSAPP_ACCESS_TOKEN=<value>
npx convex env set WHATSAPP_BUSINESS_ID=<value>
npx convex env set WHATSAPP_WEBHOOK_VERIFY_TOKEN=<value>

# Payment Webhook Secrets
npx convex env set PAYTODAY_WEBHOOK_SECRET=<value>
npx convex env set MTC_MOMO_WEBHOOK_SECRET=<value>
npx convex env set TN_MOBILE_WEBHOOK_SECRET=<value>
npx convex env set IPS_WEBHOOK_SECRET=<value>

# IPS (Bank of Namibia)
npx convex env set IPS_ENABLED=true
npx convex env set IPS_ENVIRONMENT=development
npx convex env set IPS_ORG_ID=NAMLEND

# TigerBeetle
npx convex env set TIGERBEETLE_ADDRESS=tigerbeetle.namlend.com:3001
npx convex env set TIGERBEETLE_CLUSTER_ID=0
```

Do not expose secrets in `VITE_*` client environment variables. Only `VITE_CONVEX_URL` is safe to expose.

---

## Financial Ontology Engine Modules (Mar 2026)

The following Convex modules were added as part of the Financial Ontology Engine (v5.0.0, hardened in v5.2.1). These are **not** legacy services — they are active Convex backend modules in `convex/ontology/` and `convex/lib/`. See [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) for the full implementation report.

### Ontology Domain Modules (`convex/ontology/`)

| Module                 | Purpose                                        | Key Exports                                                                                                      |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `eventJournal.ts`      | Unified event stream with causality tracking   | `writeEvent`, `getEventsByEntity`, `getEventsByCorrelation`, `getEventsByCausation`, `getEventStream`            |
| `relationships.ts`     | Entity knowledge graph with BFS traversal      | `createRelationship`, `deactivateRelationship`, `getRelated`, `getRelationshipGraph`, `getEntityContext`         |
| `mandates.ts`          | Mandate authorization lifecycle                | `createMandate`, `authorizeMandate`, `suspendMandate`, `revokeMandate`, `expireMandate`                          |
| `mandateExecutions.ts` | Mandate execution tracking                     | `recordExecution`, `getExecutionsByMandate`                                                                      |
| `consentRecords.ts`    | POPIA consent management                       | `grantConsent`, `withdrawConsent`, `getActiveConsents`, `hasActiveConsent`                                       |
| `institutions.ts`      | Multi-institution model                        | `createInstitution`, `setInstitutionConfig`, `getInstitutionConfig`, `seedNamLendTrust`, `backfillInstitutionId` |
| `paymentRails.ts`      | Payment rail registry + health                 | `createRail`, `updateRailHealth`, `getActiveRails`, `seedDefaultRails`                                           |
| `products.ts`          | Product definitions + versioning + eligibility | `createProduct`, `createVersion`, `checkEligibility`, `seedPersonalLoan`                                         |
| `accounts.ts`          | Generalized ledger accounts                    | `createAccount`, `creditAccount`, `debitAccount`, `closeAccount`, `getAccountsByOwner`                           |
| `snapshots.ts`         | Regulatory point-in-time snapshots             | `generateSnapshot`, `getSnapshot`, `getLatestSnapshot`                                                           |

### Ontology Library Helpers (`convex/lib/`)

| Helper                   | Purpose                                                                                               | Pattern                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `eventEmitter.ts`        | `emitEvent()` — schedules event journal writes                                                        | Fire-and-forget via `ctx.scheduler.runAfter(0, ...)`                                  |
| `relationshipEmitter.ts` | `emitRelationship()`, `deactivateRelationship()` — schedules relationship creation/deactivation       | Fire-and-forget via `ctx.scheduler.runAfter(0, ...)`                                  |
| `audit.ts`               | `scheduleAuditLog()`, `scheduleAuditEntry()` — **audit bridge** that auto-emits event journal entries | Accepts optional `correlationId`/`causationId` for chain threading                    |
| `temporal.ts`            | `effectiveAt()`, `asOf()` — temporal query helpers                                                    | Filters records by `effectiveFrom`/`effectiveTo` dates                                |
| `railSelector.ts`        | `selectOptimalRail()` — pure scoring function                                                         | Weighted: cost 40%, speed 30%, availability 20%, reliability 10%                      |
| `mandateStateMachine.ts` | Mandate state transition rules                                                                        | draft -> pending_authorization -> active -> [suspended <-> active] -> revoked/expired |
| `institutionScope.ts`    | `withInstitution()` — tenant isolation filter                                                         | Filters by `institutionId`, passes through unscoped records                           |

### Scheduled Workers (`convex/scheduled/`)

| Worker                 | Schedule        | Purpose                                                    |
| ---------------------- | --------------- | ---------------------------------------------------------- |
| `mandateExecutor.ts`   | Daily 06:00 UTC | Executes due mandates, creates payment transactions        |
| `snapshotGenerator.ts` | Daily 23:30 UTC | Generates end-of-day portfolio snapshots                   |
| `railHealthMonitor.ts` | Every 5 min     | Checks rail availability, auto-transitions active/degraded |

See [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) for the full implementation report.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) - Financial Ontology Engine implementation report
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database tables used by services
- [API_REFERENCE.md](./API_REFERENCE.md) - RPC function reference
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) - IPS/IPP integration details
- [TIGERBEETLE_IMPLEMENTATION.md](./TIGERBEETLE_IMPLEMENTATION.md) - Ledger service details
- [GLOSSARY.md](./GLOSSARY.md) - Terminology definitions
