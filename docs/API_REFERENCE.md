# NamLend Trust — Convex API Reference

**Last Updated**: 2026-03-04
**Aligned With**: Post-quality-sweep codebase
**Status**: Current ✅

---

## Overview

NamLend Trust uses **Convex** as its backend. There is no REST API, no PostgREST, no Supabase RPC, and no Edge Functions. All server logic is implemented as Convex functions (queries, mutations, actions) called via the Convex React SDK.

### Calling Convex Functions from the Frontend

```typescript
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/integrations/convex/api';

// Reactive read — auto-updates when data changes
const loans = useQuery(api.loans.getMyLoans);

// Atomic write
const createLoan = useMutation(api.loans.createLoan);
await createLoan({ principal: 50000, interestRate: 18, termMonths: 24 });
```

### Authentication

Authentication is managed by `@convex-dev/auth` (Password provider). There are no JWTs managed by the client — sessions are handled server-side by Convex.

```typescript
import { useAuthActions } from '@convex-dev/auth/react';

const { signIn, signOut } = useAuthActions();

// Sign in
await signIn('password', { email, password, flow: 'signIn' });

// Sign out
await signOut();
```

Auth state is exposed via `useConvexAuth()` (from `convex/react`) and wrapped by `useAuth()` in `src/hooks/useAuth.tsx` which adds role-based logic.

### Error Handling

Convex functions throw `ConvexError` on business rule violations. The error shape is:

```typescript
// Server-side throw
throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

// Client-side catch
try {
  await createLoan(args);
} catch (err) {
  if (err instanceof ConvexError) {
    const { code, message } = err.data;
  }
}
```

Common error codes used in this codebase:

| Code                 | Meaning                                |
| -------------------- | -------------------------------------- |
| `UNAUTHENTICATED`    | No active session                      |
| `UNAUTHORIZED`       | Insufficient role                      |
| `NOT_FOUND`          | Document does not exist                |
| `VALIDATION_ERROR`   | Argument failed schema validation      |
| `APR_LIMIT_EXCEEDED` | interestRate > 32% (Namibian law)      |
| `CONFLICT`           | Idempotency key collision or duplicate |

---

## Auth Guards

Every Convex query and mutation calls an auth guard at the start of its handler. There are no implicit access controls.

| Guard (in `convex/lib/auth.ts`)   | Access Required             |
| --------------------------------- | --------------------------- |
| `assertAuthenticated(ctx)`        | Any signed-in user          |
| `assertOwner(ctx, userId)`        | Owner of the resource only  |
| `assertOwnerOrStaff(ctx, userId)` | Owner OR loan_officer/admin |
| `assertStaff(ctx)`                | loan_officer or admin       |
| `assertAdmin(ctx)`                | admin only                  |

---

## Module: `api.users`

### Queries

#### `getMyProfile`

- **Auth**: `assertAuthenticated`
- **Returns**: `Doc<"profiles"> | null`
- **Purpose**: Get the current user's profile, including KYC status.

#### `getMyKycDocuments`

- **Auth**: `assertAuthenticated`
- **Returns**: `Doc<"kycDocuments">[]`
- **Purpose**: Get all KYC documents uploaded by the current user.

#### `adminListUsers`

- **Auth**: `assertAdmin`
- **Args**: `{ limit?: number }`
- **Returns**: Array of `{ user, profile, role }` objects
- **Purpose**: List all users with their profiles and roles (admin dashboard).

#### `getUserRole`

- **Auth**: `assertAdmin`
- **Args**: `{ userId: Id<"users"> }`
- **Returns**: `"client" | "loan_officer" | "admin"`
- **Purpose**: Get the role of any user.

### Mutations

#### `updateMyProfile`

- **Auth**: `assertAuthenticated`
- **Args**: `{ fullName?: string; phone?: string }`
- **Purpose**: Update the current user's displayable profile fields.

#### `setUserRole`

- **Auth**: `assertAdmin`
- **Args**: `{ userId: Id<"users">; role: "client" | "loan_officer" | "admin" }`
- **Purpose**: Assign or change a user's role. Writes audit log.

#### `createUserProfile`

- **Auth**: `assertAdmin`
- **Args**: `{ userId, email, fullName?, phone?, ... }`
- **Purpose**: Create a profile for a user (used by admin when creating accounts directly).

#### `recordKycDocument`

- **Auth**: `assertAuthenticated`
- **Args**: `{ documentType: string; fileStorageId?: Id<"_storage">; documentNumber?: string }`
- **Returns**: `Id<"kycDocuments">`
- **Purpose**: Record a KYC document upload. Sets status to `"pending"`.

#### `reviewKycDocument`

- **Auth**: `assertAdmin`
- **Args**: `{ documentId: Id<"kycDocuments">; status: "approved" | "rejected"; reviewNotes?: string }`
- **Purpose**: Admin approves or rejects a KYC document. Writes audit log for the document status change. On approval, automatically sets `profiles.kycStatus = "verified"` when all of the user's documents are approved. On rejection, sets `profiles.kycStatus = "rejected"`. Both profile changes are also audit-logged.

---

## Module: `api.loans`

### Queries

#### `getMyLoans`

- **Auth**: `assertAuthenticated`
- **Returns**: `Doc<"loans">[]`
- **Purpose**: Get all loans for the current user.

#### `getLoanById`

- **Auth**: `assertOwnerOrStaff`
- **Args**: `{ loanId: Id<"loans"> }`
- **Returns**: `Doc<"loans"> | null`
- **Purpose**: Get full loan details.

#### `adminListLoans`

- **Auth**: `assertStaff`
- **Args**: `{ status?: loanStatus; limit?: number }`
- **Returns**: Array of loans with profile enrichment
- **Purpose**: Staff view of all loans, optionally filtered by status.

### Mutations

#### `createLoan`

- **Auth**: `assertAuthenticated`
- **Args**: `{ principal: number; interestRate: number; termMonths: number; purpose?: string }`
- **Returns**: `Id<"loans">`
- **Side effects**: Inserts loan with status `"draft"`. Validates `interestRate <= 32`. Schedules audit log.
- **Purpose**: Create a draft loan application.

#### `submitLoan`

- **Auth**: `assertAuthenticated`
- **Args**: `{ loanId: Id<"loans"> }`
- **Side effects**: Updates loan status to `"submitted"`. Creates `approvalRequests` entry. Schedules `processLoanApplication` action (runs server-side credit scoring, writes `creditScore`, `debtToIncomeRatio`, `recommendation` to the loan). Schedules audit log.
- **Purpose**: Submit a draft loan for review.

#### `approveLoan`

- **Auth**: `assertStaff`
- **Args**: `{ loanId: Id<"loans">; notes?: string }`
- **Side effects**: Updates loan status to `"approved"`. Inserts `loanApprovals` record. Schedules audit log.

#### `rejectLoan`

- **Auth**: `assertStaff`
- **Args**: `{ loanId: Id<"loans">; reason: string }`
- **Side effects**: Updates loan status to `"rejected"`, sets `rejectionReason`. Inserts `loanApprovals` record. Schedules audit log.

#### `updateLoanStatus`

- **Auth**: `assertStaff`
- **Args**: `{ loanId: Id<"loans">; status: loanStatus; notes?: string }`
- **Side effects**: Updates loan status. Schedules audit log.

---

## Module: `api.disbursements`

### Queries

#### `getDisbursementsByLoan`

- **Auth**: `assertOwnerOrStaff`
- **Args**: `{ loanId: Id<"loans"> }`
- **Returns**: `Doc<"disbursements">[]`

#### `adminListDisbursements`

- **Auth**: `assertStaff`
- **Args**: `{ status?: txStatus; limit?: number }`
- **Returns**: Disbursements array

### Mutations

#### `initiateDisbursement`

- **Auth**: `assertStaff`
- **Args**: `{ loanId, amount, method, bankName?, accountNumber?, accountName?, branchCode? }`
- **Returns**: `Id<"disbursements">`
- **Side effects**: Inserts disbursement (status `"pending"`). Inserts `tigerBeetleOutbox` entry in **the same atomic mutation**. Schedules audit log.

#### `processDisbursement`

- **Auth**: `assertStaff`
- **Args**: `{ disbursementId: Id<"disbursements"> }`
- **Side effects**: Updates status to `"processing"`.

#### `completeDisbursement`

- **Auth**: `assertStaff`
- **Args**: `{ disbursementId: Id<"disbursements">; referenceNumber?: string }`
- **Side effects**: Updates disbursement to `"completed"`. Updates `loans.status` to `"funded"` and sets `loans.disbursedAt`. Schedules audit log.

#### `failDisbursement`

- **Auth**: `assertStaff`
- **Args**: `{ disbursementId: Id<"disbursements">; failureReason: string }`
- **Side effects**: Updates status to `"failed"`.

#### `reverseDisbursement`

- **Auth**: `assertStaff`
- **Args**: `{ disbursementId: Id<"disbursements">; reason: string }`
- **Side effects**: Updates status to `"reversed"`. Schedules audit log.

---

## Module: `api.payments`

### Queries

#### `getPaymentsByLoan`

- **Auth**: `assertOwnerOrStaff`
- **Args**: `{ loanId: Id<"loans"> }`
- **Returns**: `Doc<"paymentTransactions">[]`

#### `getPaymentSchedule`

- **Auth**: `assertOwnerOrStaff`
- **Args**: `{ loanId: Id<"loans"> }`
- **Returns**: `Doc<"paymentSchedules">[]`

#### `getOverduePayments`

- **Auth**: `assertStaff`
- **Returns**: Overdue payment schedule entries

#### `adminListPayments`

- **Auth**: `assertStaff`
- **Args**: `{ status?: string; limit?: number }`
- **Returns**: Payment transactions array

### Mutations

#### `recordPayment`

- **Auth**: `assertOwnerOrStaff`
- **Args**: `{ loanId, amount, method, referenceNumber? }`
- **Returns**: `Id<"paymentTransactions">`
- **Side effects**: Inserts payment (status `"pending"`). Inserts `tigerBeetleOutbox` entry atomically. Schedules audit log.

#### `completePayment`

- **Auth**: `assertStaff`
- **Args**: `{ paymentId: Id<"paymentTransactions">; principalPaid?: number; interestPaid?: number }`
- **Side effects**: Updates payment to `"completed"`. Updates `loans.outstandingBalance` and `loans.totalPaid`. Checks for loan payoff. Schedules audit log.

#### `failPayment`

- **Auth**: `assertStaff`
- **Args**: `{ paymentId: Id<"paymentTransactions"> }`
- **Side effects**: Updates payment to `"failed"`.

#### `createPaymentSchedule`

- **Auth**: `assertStaff`
- **Args**: `{ loanId, disbursementDate, principal, annualRate, termMonths }`
- **Side effects**: Generates and inserts `paymentSchedules` entries using amortization formula.

---

## Module: `api.approvalWorkflow`

### Queries

#### `adminListApprovals`

- **Auth**: `assertStaff`
- **Args**: `{ status?: approvalRequestStatus; limit?: number }`
- **Returns**: Approval requests with enriched entity data

#### `getApprovalRequestById`

- **Auth**: `assertStaff`
- **Args**: `{ requestId: Id<"approvalRequests"> }`
- **Returns**: `Doc<"approvalRequests"> | null`

#### `listWorkflowDefinitions`

- **Auth**: `assertStaff`
- **Returns**: `Doc<"workflowDefinitions">[]`

### Mutations

#### `createApprovalRequest`

- **Auth**: `assertAuthenticated`
- **Args**: `{ entityType, entityId, requestType, notes?, priority? }`
- **Returns**: `Id<"approvalRequests">`

#### `processApprovalRequest`

- **Auth**: `assertStaff`
- **Args**: `{ requestId: Id<"approvalRequests">; action: "approve" | "reject" | "escalate"; notes? }`
- **Side effects**: Updates approval status. Inserts `approvalHistory` entry. Schedules audit log.

#### `createWorkflowDefinition`

- **Auth**: `assertAdmin`
- **Args**: `{ name, entityType, stages, isActive }`
- **Returns**: `Id<"workflowDefinitions">`

---

## Module: `api.notifications`

### Queries

#### `getMyNotifications`

- **Auth**: `assertAuthenticated`
- **Args**: `{ limit?: number }`
- **Returns**: `Doc<"notifications">[]` — array (not object)

#### `getUnreadCount`

- **Auth**: `assertAuthenticated`
- **Returns**: `number`

#### `getMyNotificationPreferences`

- **Auth**: `assertAuthenticated`
- **Returns**: `Doc<"notificationPreferences">[]`

### Mutations

#### `markNotificationRead`

- **Auth**: `assertAuthenticated`
- **Args**: `{ notificationId: Id<"notifications"> }`

#### `markAllNotificationsRead`

- **Auth**: `assertAuthenticated`

#### `updateNotificationPreference`

- **Auth**: `assertAuthenticated`
- **Args**: `{ channel: string; category: string; enabled: boolean }`

---

## Module: `api.collections`

### Queries

#### `getCollectionsQueue`

- **Auth**: `assertStaff`
- **Args**: `{ limit?: number }`
- **Returns**: Overdue loans with collections context

#### `getCollectionsStats`

- **Auth**: `assertStaff`
- **Returns**: Collection metrics

#### `listPromisesToPay`

- **Auth**: `assertStaff`
- **Args**: `{ loanId?: Id<"loans"> }`
- **Returns**: `Doc<"promiseToPay">[]`

#### `listInteractionsByLoan`

- **Auth**: `assertStaff`
- **Args**: `{ loanId: Id<"loans"> }`
- **Returns**: `Doc<"collectionsInteractions">[]`

### Mutations

#### `recordInteraction`

- **Auth**: `assertStaff`
- **Args**: `{ loanId, activityType, contactMethod, notes?, outcome?, nextAction?, nextActionDate? }`
- **Returns**: `Id<"collectionsInteractions">`

#### `createPromiseToPay`

- **Auth**: `assertStaff`
- **Args**: `{ loanId, amount, promiseDate, notes? }`
- **Returns**: `Id<"promiseToPay">`

#### `markPromiseFulfilled`

- **Auth**: `assertStaff`
- **Args**: `{ promiseId: Id<"promiseToPay"> }`
- **Side effects**: Updates status to `"kept"`.

---

## Module: `api.analytics`

All analytics queries require `assertStaff`.

#### `getPortfolioSummary`

- **Returns**: `{ totalClients, kycApproved, kycPending, newThisMonth, withActiveLoans, ... }`

#### `getRevenueMetrics`

- **Returns**: Revenue and interest income metrics

#### `getRiskMetrics`

- **Returns**: Portfolio risk distribution

#### `getMonthlyTrends`

- **Args**: `{ months?: number }`
- **Returns**: Monthly loan and payment trend data

---

## Module: `api.audit`

### Queries

#### `getAuditLogs`

- **Auth**: `assertStaff`
- **Args**: `{ entityType?: string; entityId?: string; limit?: number }`
- **Returns**: `Doc<"auditLogs">[]`

#### `getStateTransitions`

- **Auth**: `assertStaff`
- **Args**: `{ entityType: string; entityId: string }`
- **Returns**: `Doc<"stateTransitions">[]`

#### `getViewLogs`

- **Auth**: `assertAdmin`
- **Args**: `{ userId?: Id<"users">; limit?: number }`
- **Returns**: `Doc<"viewLogs">[]`

#### `getComplianceReports`

- **Auth**: `assertAdmin`
- **Returns**: `Doc<"complianceReports">[]`

### Mutations

#### `logViewAccess`

- **Auth**: `assertAuthenticated`
- **Args**: `{ entityType, entityId, fieldsViewed? }`
- **Purpose**: Record that a user viewed a sensitive record.

#### `generateComplianceReport`

- **Auth**: `assertAdmin`
- **Args**: `{ reportType, periodStart, periodEnd }`
- **Returns**: `Id<"complianceReports">`

---

## Module: `api.systemConfig`

### Queries

#### `getConfig`

- **Auth**: `assertStaff`
- **Args**: `{ key: string }`
- **Returns**: `Doc<"systemConfiguration"> | null`

#### `getAllConfig`

- **Auth**: `assertStaff`
- **Args**: `{ category?: string }`
- **Returns**: `Doc<"systemConfiguration">[]`

#### `getConfigValue`

- **Auth**: `assertStaff`
- **Args**: `{ key: string }`
- **Returns**: `any | null`

### Mutations

#### `setConfig`

- **Auth**: `assertAdmin`
- **Args**: `{ key, value, category?, description?, isPublic? }`
- **Side effects**: Upserts config. Schedules `update_config` or `create_config` audit log.

#### `deleteConfig`

- **Auth**: `assertAdmin`
- **Args**: `{ key: string }`
- **Side effects**: Deletes config. Schedules `delete_config` audit log.

#### `seedDefaultConfig`

- **Auth**: `assertAdmin`
- **Args**: `{}`
- **Returns**: `{ created: number, skipped: number }`
- **Purpose**: Insert default regulatory config keys if they don't exist.

---

## Module: `api.reconciliation`

All functions require `assertStaff` or `assertAdmin`.

#### `listRuns` (query)

- **Returns**: `Doc<"reconciliationRuns">[]`

#### `getRunById` (query)

- **Args**: `{ runId: Id<"reconciliationRuns"> }`

#### `createRun` (mutation)

- **Auth**: `assertAdmin`
- **Args**: `{ runDate: string }`
- **Returns**: `Id<"reconciliationRuns">`

#### `importBankTransactions` (mutation)

- **Auth**: `assertStaff`
- **Args**: `{ runId, transactions: Array<{ amount, date, description, reference, direction }> }`

#### `autoMatch` (mutation)

- **Auth**: `assertStaff`
- **Args**: `{ runId: Id<"reconciliationRuns"> }`
- **Purpose**: Automatically match bank transactions to internal payment records by reference number and amount.

---

## Module: `api.ips` (IPS/IPP domain — Convex live path)

> The live IPP runtime is Convex. Transport mode may be `json_mock`, `xml_sandbox`, or `xml_production`, but the application-facing boundary remains `api.ips.*`.

High-signal current surfaces:

### Onboarding (`api.ips.ipsOnboarding`)

- user onboarding queries and mutations
- alias registration lifecycle
- readiness confirmation gated by confirmed IPS alias state

### Transactions (`api.ips.ipsTransactions`)

- `initiateIpsTransaction`
- transaction status and admin listing helpers
- disbursement and repayment initiation share this backend transaction model

### Alias and VPA bridge (`api.ips.ipsVpa`)

- authenticated VPA validation
- saved alias reads
- default-alias management
- legacy `vpaRegistry` access only as a compatibility bridge

For the exact supported flow set and behavioral contract, use:

- `docs/IPP_INTEGRATION.md`
- `src/constants/ippSupportMatrix.ts`
- `docs/IPS_IMPLEMENTATION.md`

---

## HTTP Endpoints

HTTP endpoints are defined in `convex/http.ts` via Convex's HTTP router. These handle webhooks and health checks from external systems.

### `GET /health`

Public. No authentication required.

**Response** (`200 OK`):

```json
{ "status": "ok", "service": "namlend-convex", "ts": 1709510400000 }
```

### `POST /webhook/ips`

Receives IPS transaction status callbacks from the Bank of Namibia switch.

**Security**: The endpoint supports both legacy JSON and the current XML callback path. Live XML callbacks are routed through the Convex IPP handlers and may also enforce signature verification depending on configured transport material.

- legacy JSON path: HMAC-style header verification when configured
- current XML path: parsed and routed by API name in `convex/http.ts`

**Request body**: XML for the current IPS callback path; legacy JSON remains compatibility-only

**Responses**:
| Status | Meaning |
|--------|---------|
| `200` | Callback accepted and routed |
| `400` | Cannot read or parse request body |
| `401` | Missing or invalid signature where enforced |
| `500` | Internal error in handler |

**Handler**: `internal.actions.ipsAdapter.handleWebhook`

### `POST /webhook/payment`

Receives payment gateway webhooks from PayToday, MTC MoMo, and TN Mobile.

**Security**: HMAC-SHA256 signature verification using `PAYMENT_WEBHOOK_SECRET`. Checks headers `X-PayToday-Signature`, `X-Signature`, or `X-Webhook-Signature` (first match wins).

**Responses**: Same structure as `/webhook/ips`.

**Handler**: `internal.actions.ipsAdapter.handlePaymentWebhook`

### Auth Routes (mounted by `@convex-dev/auth`)

The following routes are automatically mounted by `auth.addHttpRoutes(http)`:

| Path                     | Method | Purpose                        |
| ------------------------ | ------ | ------------------------------ |
| `/api/auth/signin`       | POST   | Sign in with email + password  |
| `/api/auth/signout`      | POST   | Sign out (invalidates session) |
| `/api/auth/token`        | POST   | Refresh session token          |
| `/api/auth/userIdentity` | GET    | Get current user identity      |

---

## Actions (Server-Side, Not Called Directly from Browser)

Actions are internal Convex functions that can make external HTTP calls. They are triggered by mutations (via `ctx.scheduler`) or cron jobs.

| File                                | Internal Reference                          | Purpose                                              |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `actions/ipsAdapter.ts`             | `internal.actions.ipsAdapter.*`             | IPS outbound transfers and webhook handling          |
| `actions/processLoanApplication.ts` | `internal.actions.processLoanApplication.*` | Server-side credit scoring (runs after `submitLoan`) |
| `actions/sendNotification.ts`       | `internal.actions.sendNotification.*`       | Multi-channel notification dispatch                  |
| `actions/sendSms.ts`                | `internal.actions.sendSms.*`                | Africa's Talking SMS delivery                        |
| `actions/sendWhatsapp.ts`           | `internal.actions.sendWhatsapp.*`           | Meta WhatsApp Business API                           |

### `processLoanApplication` (Action)

Triggered by `api.loans.submitLoan` via `ctx.scheduler.runAfter(0, ...)`.

**What it does**:

1. Loads borrower profile
2. Computes server-side credit score (300–850 scale) based on KYC status, employment, income, DTI
3. Determines recommendation: `"approve"` (score ≥ 650, DTI ≤ 35%, APR ≤ 32%, KYC verified) or `"reject"` or `"review"`
4. Writes `creditScore`, `debtToIncomeRatio`, `recommendation` to the `loans` table via `internal.loans.recordCreditScore`

---

## Scheduled Jobs

Defined in `convex/crons.ts`:

| Name                | Schedule         | Handler                                                    | Purpose                                                                                |
| ------------------- | ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `tb-outbox-worker`  | Every 30 seconds | `internal.scheduled.tigerBeetleOutboxWorker.processOutbox` | Claims pending TigerBeetle outbox entries and posts to ledger (simulation)             |
| `daily-maintenance` | 02:00 UTC daily  | `internal.scheduled.dailyTasks.runDailyTasks`              | Marks overdue payments, checks promise-to-pay deadlines, dispatches notification queue |

---

## Environment Variables

### Client-Side (`VITE_*`)

| Variable               | Required | Description                                     |
| ---------------------- | -------- | ----------------------------------------------- |
| `VITE_CONVEX_URL`      | ✅       | Convex deployment URL                           |
| `VITE_DEBUG_TOOLS`     | No       | Enable dev window utilities (default: `false`)  |
| `VITE_RUN_DEV_SCRIPTS` | No       | Auto-run dev seeding scripts (default: `false`) |
| `VITE_SENTRY_DSN`      | No       | Sentry error tracking DSN                       |
| `VITE_E2E`             | No       | Set by `npm run dev:e2e` — do not set manually  |

### Server-Side (Convex env vars — set via `npx convex env set KEY value`)

| Variable                   | Required for       | Description                                |
| -------------------------- | ------------------ | ------------------------------------------ |
| `AFRICASTALKING_API_KEY`   | SMS                | Africa's Talking API key                   |
| `AFRICASTALKING_USERNAME`  | SMS                | Africa's Talking username                  |
| `WHATSAPP_ACCESS_TOKEN`    | WhatsApp           | Meta Cloud API token                       |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp           | Meta phone number ID                       |
| `IPS_API_URL`              | IPS (production)   | IPS switch base URL                        |
| `IPS_CLIENT_CERT`          | IPS (production)   | mTLS client certificate (base64)           |
| `IPS_CLIENT_KEY`           | IPS (production)   | mTLS client key (base64)                   |
| `IPS_WEBHOOK_SECRET`       | Webhook security   | HMAC secret for `/webhook/ips`             |
| `PAYMENT_WEBHOOK_SECRET`   | Webhook security   | HMAC secret for `/webhook/payment`         |
| `TIGERBEETLE_ADDRESS`      | TigerBeetle (live) | TB cluster address (e.g. `localhost:3001`) |

---

## See Also

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — All Convex tables, fields, and indexes
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and auth flow diagrams
- [FLOWS.md](./FLOWS.md) — End-to-end transaction flows using these APIs
- [SECURITY.md](./SECURITY.md) — Auth guards and security model
- [openapi.yaml](./openapi.yaml) — HTTP endpoint schema (Convex HTTP router only)
