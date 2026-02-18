# NamLend Trust - Services Documentation

**Doc Revision**: 2026-02-18 \
**Status**: Service layer is implemented across lending, IPS/IPP, collections, reconciliation, and settlement. Settlement service hardened with audit logging, callRpc resilience, and TigerBeetle column fixes (Feb 2026).

---

## Service Index (src/services)

| Service                    | Purpose                         | Notes                                                                  |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `api-client.ts`            | API orchestration client        | Edge Function API wrapper with retries/metrics                         |
| `approvalWorkflow.ts`      | Approval request workflow       | Drives loan application approvals                                      |
| `loanService.ts`           | Loan record helpers             | Status updates + disbursement creation                                 |
| `disbursementService.ts`   | Disbursement state machine      | RPC-driven, posts to ledger outbox                                     |
| `paymentService.ts`        | Payment processing              | Schedules, overdue, fees, ledger posts                                 |
| `paymentGateway.ts`        | Provider routing + instructions | Bank transfer, MoMo, TN Mobile, PayToday, cash                         |
| `ipsService.ts`            | IPS payment integration         | Calls `ips-adapter` Edge Function                                      |
| `ipsOnboardingService.ts`  | IPP onboarding                  | RPC + adapter endpoints                                                |
| `collectionsService.ts`    | Collections workflow            | Activities, promises, reschedules                                      |
| `reconciliationService.ts` | Bank transaction matching       | Manual and auto matching                                               |
| `notificationService.ts`   | In-app notifications            | Queue, preferences, realtime                                           |
| `smsGateway.ts`            | SMS templates + logging         | Client-side logging; Edge function for delivery                        |
| `whatsappGateway.ts`       | WhatsApp templates + logging    | Client-side logging; Edge function for delivery                        |
| `auditService.ts`          | Audit trail access              | RPCs for logs/transitions                                              |
| `workflowEngine.ts`        | Multi-stage workflows           | RPC-driven engine                                                      |
| `roleManagementService.ts` | Role assignment rules           | Validated via RPC                                                      |
| `adminService.ts`          | Admin profile data              | RPC for profiles with roles                                            |
| `ledgerService.ts`         | TigerBeetle outbox              | Simulated posting via Edge worker                                      |
| `settlementService.ts`     | Settlement runs + reports       | DNS settlement workflows; audit logging, callRpc resilience (Feb 2026) |
| `clientService.ts`         | Client profile access           | Profile read/update                                                    |
| `financeService.ts`        | Budget & finance tracking       | Transactions, budgets, savings goals, CSV upload                       |
| `creditScoring.ts`         | AI credit risk assessment       | Scoring, recommendations, affordability checks                         |

---

## Approval Workflow

**File**: `src/services/approvalWorkflow.ts`

Key exports:

- `submitApprovalRequest()`
- `getUserApprovalRequests()`
- `getAllApprovalRequests()`
- `updateApprovalStatus()`
- `getApprovalHistory()`
- `getApprovalNotifications()`
- `markNotificationAsRead()`
- `getApprovalStatistics()`
- `processApprovedLoanApplication()`
- `processApprovedKYCDocument()`

Notes:

- Admin processing uses `process_approval_transaction` RPC and expects an approval request id.
- Loan application UI submits approval requests; loans are created after approval.

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

- IPS/IPP payments are handled by `ipsService.ts`, not the gateway.

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

- Calls the `ips-adapter` Edge Function (mock mode by default).

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

**Client (Vite)**

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PAYTODAY_API_URL=
VITE_PAYTODAY_MERCHANT_ID=
VITE_PAYTODAY_API_KEY=
VITE_MTC_MOMO_API_URL=
VITE_MTC_MOMO_MERCHANT=
VITE_TN_MOBILE_API_URL=
VITE_TN_MOBILE_MERCHANT=
VITE_AFRICASTALKING_API_KEY=
VITE_AFRICASTALKING_USERNAME=
VITE_SMS_SENDER_ID=NAMLEND
VITE_WHATSAPP_PHONE_NUMBER_ID=
VITE_WHATSAPP_ACCESS_TOKEN=
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=
VITE_PAYTODAY_WEBHOOK_SECRET=
VITE_MTC_MOMO_WEBHOOK_SECRET=
VITE_TN_MOBILE_WEBHOOK_SECRET=
VITE_IPS_WEBHOOK_SECRET=
VITE_DEBUG_TOOLS=false
VITE_RUN_DEV_SCRIPTS=false
VITE_ALLOW_LOCAL_ADMIN=false
VITE_TEST_ADMIN_EMAIL=
VITE_TEST_ADMIN_PASSWORD=
VITE_E2E=false
```

**Edge Functions (Supabase secrets)**

```env
AFRICASTALKING_API_KEY=
AFRICASTALKING_USERNAME=
SMS_SENDER_ID=NAMLEND
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ID=
PAYTODAY_WEBHOOK_SECRET=
MTC_MOMO_WEBHOOK_SECRET=
TN_MOBILE_WEBHOOK_SECRET=
IPS_ENABLED=true
IPS_ENVIRONMENT=development
IPS_ORG_ID=NAMLEND
```

Do not expose service role keys in the client. Local admin client is gated by `VITE_ALLOW_LOCAL_ADMIN` and is intended only for dev.
If you must use `VITE_SUPABASE_SERVICE_ROLE_KEY` for local admin utilities, keep it out of production builds.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database tables used by services
- [API_REFERENCE.md](./API_REFERENCE.md) - RPC function reference
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) - IPS/IPP integration details
- [TIGERBEETLE_IMPLEMENTATION.md](./TIGERBEETLE_IMPLEMENTATION.md) - Ledger service details
- [GLOSSARY.md](./GLOSSARY.md) - Terminology definitions
