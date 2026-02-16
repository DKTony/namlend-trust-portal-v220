# NamLend Trust - API Reference

**Doc Revision**: 2026-01-19

---

## Overview

NamLend Trust uses Supabase for:

- REST API (PostgREST)
- RPC functions for business logic
- Edge Functions for privileged operations

All requests require JWT auth unless explicitly public.

---

## Authentication

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

await supabase.auth.signOut({ scope: 'global' });
```

---

## Approval Workflow

### Submit Approval Request

```ts
const { data, error } = await supabase
  .from('approval_requests')
  .insert({
    user_id,
    request_type: 'loan_application',
    request_data: {
      amount,
      term_months,
      interest_rate,
      monthly_payment,
      total_repayment,
      purpose,
    },
    status: 'pending',
    priority: 'normal',
  })
  .select()
  .single();
```

### Process Approved Loan (RPC)

```ts
const { data, error } = await supabase.rpc('process_approval_transaction', {
  p_request_id: approvalRequestId,
});
```

---

## Disbursements

```ts
await supabase.rpc('create_disbursement_on_approval', {
  p_loan_id: loanId,
});

await supabase.rpc('complete_disbursement', {
  p_disbursement_id: disbursementId,
  p_payment_method: 'bank_transfer',
  p_payment_reference: 'REF-2026-001',
  p_notes: 'Manual transfer',
});
```

---

## Payments

### Create Payment (RPC - idempotent)

```ts
await supabase.rpc('create_payment', {
  p_loan_id: loanId,
  p_amount: 500,
  p_payment_method: 'bank_transfer',
  p_processing_fee: 25,
  p_idempotency_key: 'client-ref-123',
});
```

### Process Payment + Apply to Schedule

```ts
await supabase.rpc('process_loan_payment', {
  p_loan_id: loanId,
  p_amount: 500,
  p_payment_method: 'bank_transfer',
  p_reference_number: 'PAY-2026-001',
});
```

---

## IPS / IPP

### Initiate IPS Repayment (RPC + Edge)

```ts
await supabase.rpc('initiate_ips_repayment', {
  p_loan_id: loanId,
  p_amount: 500,
  p_payer_vpa: 'user@bank',
});
```

### IPS Adapter (Edge Function)

```ts
const res = await fetch(`${SUPABASE_URL}/functions/v1/ips-adapter/pay`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ipsTransactionId,
    msgId,
    txnId,
    amount,
    currency: 'NAD',
    payerVpa,
    payeeVpa,
    purposeCode: 'PERS',
  }),
});
```

---

## Notifications

```ts
await supabase.rpc('queue_notification', {
  p_user_id: userId,
  p_template_code: 'PAYMENT_RECEIVED',
  p_data: { amount: '500.00', date: '2026-01-10' },
});
```

---

## Collections

```ts
await supabase.rpc('generate_collection_queue');

await supabase.rpc('record_collection_activity', {
  p_loan_id: loanId,
  p_activity_type: 'call_attempt',
  p_notes: 'Left voicemail',
});
```

---

## Settlement

```ts
await supabase.rpc('create_settlement_run', {
  p_settlement_date: '2026-01-10',
  p_window_id: 'SW1',
});

await supabase.rpc('process_settlement_run', {
  p_run_id: runId,
});
```

---

## Edge Functions

| Function                    | Purpose                     |
| --------------------------- | --------------------------- |
| `payment-webhook`           | Provider webhook processing |
| `send-sms`                  | SMS delivery                |
| `send-whatsapp`             | WhatsApp delivery           |
| `send-notification`         | Staff notification send     |
| `scheduled-tasks`           | Overdue + reminders         |
| `tigerbeetle-outbox-worker` | Ledger outbox processing    |

Each Edge Function requires a valid `Authorization: Bearer <JWT>` header unless explicitly documented.

---

## API Orchestration Layer

Centralized API endpoints for backoffice operations with consistent security, validation, and audit logging.

### Base URL

```
https://puahejtaskncpazjyxqp.supabase.co/functions/v1/
```

Use `VITE_SUPABASE_URL` in client builds to avoid hardcoding the project URL.

### api-loans

| Method | Endpoint                       | Description                        | Roles                  |
| ------ | ------------------------------ | ---------------------------------- | ---------------------- |
| GET    | `/api-loans/list`              | List loans with pagination/filters | All (filtered by role) |
| GET    | `/api-loans/:id`               | Get loan details                   | All (owner or staff)   |
| POST   | `/api-loans/apply`             | Submit loan application            | client                 |
| POST   | `/api-loans/approve`           | Approve loan                       | loan_officer, admin    |
| POST   | `/api-loans/reject`            | Reject loan                        | loan_officer, admin    |
| POST   | `/api-loans/disburse`          | Initiate disbursement              | loan_officer, admin    |
| GET    | `/api-loans/approval-requests` | List pending approvals             | loan_officer, admin    |
| GET    | `/api-loans/schedules/:id`     | Get payment schedule               | All (owner or staff)   |

### api-users

| Method | Endpoint              | Description                 | Roles               |
| ------ | --------------------- | --------------------------- | ------------------- |
| GET    | `/api-users/profile`  | Get current user profile    | All                 |
| PATCH  | `/api-users/profile`  | Update current user profile | All                 |
| GET    | `/api-users/list`     | List all users              | admin               |
| GET    | `/api-users/:id`      | Get user by ID              | admin, loan_officer |
| PATCH  | `/api-users/:id/role` | Update user role            | admin               |
| GET    | `/api-users/roles`    | List available roles        | admin, loan_officer |

### api-payments

| Method | Endpoint                       | Description                | Roles                  |
| ------ | ------------------------------ | -------------------------- | ---------------------- |
| GET    | `/api-payments/list`           | List payments with filters | All (filtered by role) |
| GET    | `/api-payments/:id`            | Get payment details        | All (owner or staff)   |
| POST   | `/api-payments/record`         | Record a payment           | loan_officer, admin    |
| POST   | `/api-payments/reverse`        | Reverse a payment          | admin                  |
| GET    | `/api-payments/loan/:loanId`   | Get payments for loan      | All (owner or staff)   |
| GET    | `/api-payments/reconciliation` | Get reconciliation data    | admin                  |

### api-admin

| Method | Endpoint                       | Description          | Roles               |
| ------ | ------------------------------ | -------------------- | ------------------- |
| GET    | `/api-admin/dashboard`         | Dashboard statistics | loan_officer, admin |
| GET    | `/api-admin/audit-logs`        | View audit logs      | admin               |
| GET    | `/api-admin/system-health`     | System health check  | admin               |
| POST   | `/api-admin/bulk-approve`      | Bulk approve loans   | admin               |
| GET    | `/api-admin/compliance-report` | Compliance report    | admin               |
| GET    | `/api-admin/collections`       | Collections overview | loan_officer, admin |

### api-audit

| Method | Endpoint                      | Description                  | Roles |
| ------ | ----------------------------- | ---------------------------- | ----- |
| GET    | `/api-audit/logs`             | List audit logs with filters | admin |
| GET    | `/api-audit/logs/:id`         | Get audit log details        | admin |
| GET    | `/api-audit/financial`        | Financial operation logs     | admin |
| GET    | `/api-audit/user/:userId`     | Audit logs for a user        | admin |
| GET    | `/api-audit/table/:tableName` | Audit logs for a table       | admin |
| GET    | `/api-audit/export`           | Export logs (CSV/JSON)       | admin |
| GET    | `/api-audit/summary`          | Audit summary statistics     | admin |
| GET    | `/api-audit/actions`          | List all action types        | admin |

### api-analytics

| Method | Endpoint                            | Description                  | Roles               |
| ------ | ----------------------------------- | ---------------------------- | ------------------- |
| GET    | `/api-analytics/portfolio`          | Portfolio summary statistics | loan_officer, admin |
| GET    | `/api-analytics/loan-performance`   | Loan performance metrics     | loan_officer, admin |
| GET    | `/api-analytics/collections-stats`  | Collections statistics       | loan_officer, admin |
| GET    | `/api-analytics/disbursement-stats` | Disbursement statistics      | loan_officer, admin |
| GET    | `/api-analytics/risk-analysis`      | Risk analysis report         | admin               |
| GET    | `/api-analytics/trends`             | Trend analysis over time     | loan_officer, admin |

### api-disbursements

| Method | Endpoint                      | Description                     | Roles               |
| ------ | ----------------------------- | ------------------------------- | ------------------- |
| GET    | `/api-disbursements/list`     | List disbursements with filters | loan_officer, admin |
| GET    | `/api-disbursements/pending`  | List pending disbursements      | loan_officer, admin |
| GET    | `/api-disbursements/:id`      | Get disbursement details        | loan_officer, admin |
| POST   | `/api-disbursements/approve`  | Approve disbursement            | loan_officer, admin |
| POST   | `/api-disbursements/process`  | Mark as processing              | loan_officer, admin |
| POST   | `/api-disbursements/complete` | Mark as completed               | loan_officer, admin |
| POST   | `/api-disbursements/fail`     | Mark as failed                  | loan_officer, admin |
| GET    | `/api-disbursements/queue`    | Get disbursement queue          | loan_officer, admin |

### api-collections

| Method | Endpoint                        | Description                 | Roles               |
| ------ | ------------------------------- | --------------------------- | ------------------- |
| GET    | `/api-collections/queue`        | Get collections work queue  | loan_officer, admin |
| GET    | `/api-collections/case/:loanId` | Get collection case details | loan_officer, admin |
| POST   | `/api-collections/interaction`  | Record borrower interaction | loan_officer, admin |
| POST   | `/api-collections/promise`      | Create promise to pay       | loan_officer, admin |
| PATCH  | `/api-collections/promise/:id`  | Update promise status       | loan_officer, admin |
| POST   | `/api-collections/escalate`     | Escalate collection case    | admin               |
| GET    | `/api-collections/reminders`    | List payment reminders      | loan_officer, admin |
| POST   | `/api-collections/reminder`     | Schedule payment reminder   | loan_officer, admin |

### api-reconciliation

| Method | Endpoint                           | Description                   | Roles               |
| ------ | ---------------------------------- | ----------------------------- | ------------------- |
| GET    | `/api-reconciliation/runs`         | List reconciliation runs      | loan_officer, admin |
| GET    | `/api-reconciliation/runs/:id`     | Get run details               | loan_officer, admin |
| POST   | `/api-reconciliation/runs`         | Create new reconciliation run | admin               |
| POST   | `/api-reconciliation/import`       | Import bank transactions      | loan_officer, admin |
| POST   | `/api-reconciliation/auto-match`   | Auto-match transactions       | loan_officer, admin |
| POST   | `/api-reconciliation/manual-match` | Manual match transaction      | loan_officer, admin |
| GET    | `/api-reconciliation/unmatched`    | List unmatched transactions   | loan_officer, admin |
| GET    | `/api-reconciliation/summary`      | Reconciliation summary        | loan_officer, admin |

### api-notifications

| Method | Endpoint                           | Description                     | Roles |
| ------ | ---------------------------------- | ------------------------------- | ----- |
| GET    | `/api-notifications/list`          | List user notifications         | All   |
| GET    | `/api-notifications/:id`           | Get notification details        | All   |
| POST   | `/api-notifications/mark-read`     | Mark notification as read       | All   |
| POST   | `/api-notifications/mark-all-read` | Mark all as read                | All   |
| DELETE | `/api-notifications/:id`           | Delete notification             | All   |
| GET    | `/api-notifications/preferences`   | Get notification preferences    | All   |
| PUT    | `/api-notifications/preferences`   | Update notification preferences | All   |
| POST   | `/api-notifications/send`          | Send notification               | admin |

### Error Codes

All API endpoints return a consistent error envelope:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

| HTTP Status | Response Helper      | Meaning                                                       | Retryable            |
| ----------- | -------------------- | ------------------------------------------------------------- | -------------------- |
| 400         | `badRequest()`       | Invalid request parameters or body                            | No                   |
| 401         | `unauthorized()`     | Missing or expired JWT token                                  | No (re-authenticate) |
| 403         | `forbidden()`        | Valid JWT but insufficient role/permissions                   | No                   |
| 404         | `notFound()`         | Resource does not exist                                       | No                   |
| 405         | `methodNotAllowed()` | HTTP method not supported for this endpoint                   | No                   |
| 409         | `conflict()`         | Resource state conflict (e.g. duplicate idempotency key)      | No                   |
| 422         | `unprocessable()`    | Validation passed but business rule violated (e.g. APR > 32%) | No                   |
| 429         | `rateLimited()`      | Too many requests; includes `Retry-After` header              | Yes                  |
| 500         | `serverError()`      | Unexpected server error                                       | Yes                  |
| 502         | —                    | Bad gateway / upstream failure                                | Yes                  |
| 503         | —                    | Service unavailable                                           | Yes                  |
| 504         | —                    | Gateway timeout                                               | Yes                  |

**Source**: `supabase/functions/_shared/responses.ts`

### Pagination Metadata

Paginated endpoints include a `meta` object in the response:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasMore": true
  }
}
```

| Field     | Type      | Description                     |
| --------- | --------- | ------------------------------- |
| `page`    | `number`  | Current page number (1-indexed) |
| `limit`   | `number`  | Items per page                  |
| `total`   | `number`  | Total matching records          |
| `hasMore` | `boolean` | `true` if more pages exist      |

### Retry Configuration

The frontend API client (`src/services/api-client.ts`) implements automatic retry with exponential backoff:

| Parameter     | Default | Description                                      |
| ------------- | ------- | ------------------------------------------------ |
| `maxRetries`  | 3       | Maximum retry attempts                           |
| `baseDelayMs` | 1000    | Base delay before first retry                    |
| `maxDelayMs`  | 10000   | Maximum delay cap                                |
| Jitter        | 30%     | Random jitter applied to prevent thundering herd |

**Retryable status codes**: 408, 429, 500, 502, 503, 504

Rate-limited requests (429) receive up to 5 retry attempts. Non-retryable errors (400, 401, 403, 404, 409, 422) fail immediately.

For mutations that must not be retried (financial operations), use `callAPIOnce()`:

```typescript
import { callAPIOnce } from '@/services/api-client';
const result = await callAPIOnce('api-payments/record', { method: 'POST', body: data });
```

### Usage Example

```typescript
import {
  loansAPI,
  usersAPI,
  paymentsAPI,
  adminAPI,
  analyticsAPI,
  disbursementsAPI,
  notificationsAPI,
} from '@/services/api-client';

// List loans with pagination
const result = await loansAPI.list({ page: 1, limit: 20, status: 'active' });
if (result.success) {
  const { data, meta } = result;
}

// Get user profile
const profile = await usersAPI.getProfile();

// Record a payment
await paymentsAPI.record({
  loan_id: 'uuid',
  amount: 500,
  payment_method: 'bank_transfer',
});

// Admin dashboard stats
const stats = await adminAPI.getDashboard();

// Analytics - portfolio metrics
const portfolio = await analyticsAPI.getPortfolio({ period: '30d' });

// Disbursements - list with filters
const disbursements = await disbursementsAPI.list({ status: 'pending' });

// Notifications - list and mark as read
const notifications = await notificationsAPI.list({ limit: 50 });
await notificationsAPI.markRead({ notification_id: 'uuid' });
```

---

## Frontend Integration Status

The following components have been migrated to use the API Orchestration Layer:

| Component                  | API Module          | Status                 |
| -------------------------- | ------------------- | ---------------------- |
| `useDisbursements.ts`      | `disbursementsAPI`  | ✅ Migrated            |
| `PortfolioAnalytics.tsx`   | `analyticsAPI`      | ✅ Migrated            |
| `NotificationCenter.tsx`   | `notificationsAPI`  | ✅ Migrated            |
| `CollectionsDashboard.tsx` | `collectionsAPI`    | ✅ Migrated            |
| `usePaymentsList.ts`       | `paymentsAPI`       | ✅ Migrated            |
| `useLoanApplications.ts`   | `loansAPI`          | ✅ Migrated            |
| `usersAPI`                 | `usersAPI`          | ✅ Defined (available) |
| `adminAPI`                 | `adminAPI`          | ✅ Defined (available) |
| `auditAPI`                 | `auditAPI`          | ✅ Defined (available) |
| `reconciliationAPI`        | `reconciliationAPI` | ✅ Defined (available) |

### Migration Pattern

```typescript
// Before (direct Supabase)
const { data, error } = await supabase.from('table').select('*');

// After (API client)
import { someAPI } from '@/services/api-client';
const result = await someAPI.list({ params });
if (result.success) {
  // Handle result.data
} else {
  // Handle result.error
}
```
