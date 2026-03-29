# NamLend Trust — Transaction Flows

**Last Updated**: 2026-03-04
**Aligned With**: Post-quality-sweep codebase
**Status**: Current ✅

All Convex function references below are in the form `api.module.function` (public) or `internal.module.function` (server-only). See [API_REFERENCE.md](./API_REFERENCE.md) for full signatures and auth requirements.

---

## 1. Loan Application Flow

### Trigger

Client navigates to `/loan-application` → fills form → clicks Submit.

### KYC Gate

Before submission, `useKYCEligibility` hook checks `profiles.kycStatus`. If status is not `"verified"`, the submit button is disabled and the client is prompted to complete KYC first.

### Submission Steps

```
1. Client fills LoanApplication.tsx form
2. useMutation(api.loans.createLoan)
      - assertAuthenticated
      - Validates interestRate <= 32% (APR_LIMIT — throws APR_LIMIT_EXCEEDED if breached)
      - Inserts loan record (status: "draft")
      - scheduleAuditLog(ctx, "loan", loanId, "CREATE_LOAN", ...)
      - Returns loanId

3. useMutation(api.loans.submitLoan)
      - assertAuthenticated
      - Patches loan status: "draft" → "submitted"
      - Inserts approvalRequests (status: "pending", requestType: "loan_application")
      - ctx.scheduler.runAfter(0, internal.actions.processLoanApplication, { loanId, ... })
      - scheduleAuditLog(ctx, "loan", loanId, "SUBMIT_LOAN", ...)

4. processLoanApplication action (runs async, seconds later)
      - Loads profile (income, employmentStatus, kycStatus)
      - Computes creditScore (300–850) and debtToIncomeRatio
      - Derives recommendation: "approve" | "review" | "reject"
      - ctx.runMutation(internal.loans.recordCreditScore, { loanId, creditScore, dti, recommendation })
```

### Result

- Loan visible in client's `/dashboard` with status `"submitted"`
- Loan visible in admin `/admin` approval queue
- Credit score and recommendation written to `loans.creditScore`, `loans.debtToIncomeRatio`, `loans.recommendation`
- Reactive update: `Loan360View` and `LoanReviewPanel` auto-refresh with new fields

---

## 2. Admin Approval Flow

### Trigger

Loan officer / admin opens approval queue at `/admin` → reviews loan → Approve or Reject.

### Approve Path

```
Admin UI → ApprovalManagementDashboard
  1. useMutation(api.approvalWorkflow.processApprovalRequest)
        - assertStaff
        - action: "approve"
        - Patches approvalRequests.status: "pending" → "approved"
        - Inserts approvalHistory entry
        - scheduleAuditLog(...)

  2. useMutation(api.loans.approveLoan)
        - assertStaff
        - Patches loan.status: "submitted" | "under_review" → "approved"
        - Inserts loanApprovals record (decision: "approved")
        - scheduleAuditLog(...)

  Client sees loan status update reactively via useQuery(api.loans.getMyLoans)
  Notification created for client: "Your loan has been approved"
```

### Reject Path

```
Admin UI → ApprovalManagementDashboard
  1. useMutation(api.approvalWorkflow.processApprovalRequest)
        - action: "reject"
        - Patches approvalRequests.status → "rejected"
        - Inserts approvalHistory entry

  2. useMutation(api.loans.rejectLoan)
        - assertStaff
        - Patches loan.status → "rejected", sets rejectionReason
        - Inserts loanApprovals record (decision: "rejected")
        - scheduleAuditLog(...)

  Client sees rejection reactively; notification sent
```

---

## 3. Disbursement Flow

### Manual Disbursement

```
Admin → DisbursementManager component

1. useMutation(api.disbursements.initiateDisbursement)
      - assertStaff
      - Inserts disbursement (status: "pending", method: "bank_transfer")
      - Inserts tigerBeetleOutbox entry in SAME atomic mutation
        (eventType: "DISBURSEMENT", status: "pending")
      - scheduleAuditLog(...)

2. useMutation(api.disbursements.processDisbursement)
      - Patches disbursement.status: "pending" → "processing"

3. (Manual bank transfer occurs off-system)

4. useMutation(api.disbursements.completeDisbursement)
      - Patches disbursement.status → "completed"
      - Patches loans.status: "approved" → "funded"
      - Sets loans.disbursedAt = now
      - scheduleAuditLog(...)

5. tb-outbox-worker cron (every 30s):
      - Claims pending tigerBeetleOutbox entry
      - Simulates posting to TigerBeetle (localhost:3001)
      - Marks entry: status "completed"
      - Inserts tigerBeetleTransfers record (shadow ledger)
```

### IPS Disbursement (Mock Adapter)

> ⚠️ IPS adapter is in mock mode. No real Bank of Namibia connectivity.

```
Admin → IPS disbursement form

1. useMutation(api.ips.ipsTransactions.initiateIpsTransaction)
      - Inserts ipsTransactions (status: "pending", txType: "credit_transfer")
      - ctx.scheduler → internal.actions.ipsAdapter.processOutbound

2. ipsAdapter.processOutbound action (mock):
      - Logs request to ipsApiLogs
      - Returns simulated success response
      - ctx.runMutation → patches ipsTransactions.status: "completed"
```

---

## 4. Payment Flow

### 4.1 Client-Initiated Payment (Payment Page)

```
Client → /payment page

1. useMutation(api.payments.recordPayment)
      - assertOwnerOrStaff
      - Inserts paymentTransactions (status: "pending")
      - Inserts tigerBeetleOutbox entry atomically
      - scheduleAuditLog(...)

2. Admin or webhook marks payment complete:
   useMutation(api.payments.completePayment)
      - Patches paymentTransactions.status → "completed"
      - Updates loans.outstandingBalance (reduces by principalPaid)
      - Updates loans.totalPaid
      - Checks: if outstandingBalance <= 0 → patch loans.status → "paid_off"
      - scheduleAuditLog(...)
```

### 4.2 Payment Webhook (External Gateway — PayToday, MTC MoMo, TN Mobile)

```
External gateway → POST /webhook/payment

1. convex/http.ts httpAction:
      a. Reads raw body as text (for HMAC verification)
      b. Verifies HMAC-SHA256 signature (PAYMENT_WEBHOOK_SECRET)
      c. Parses JSON body

2. ctx.runAction(internal.actions.ipsAdapter.handlePaymentWebhook, { payload })
      - Looks up paymentTransaction by externalTransactionId or referenceNumber
      - Calls ctx.runMutation to update payment status
      - If completed → triggers completePayment mutation chain

3. Returns 200 { "received": true } to gateway
```

**Idempotency**: If the same webhook is received twice, the second call finds the payment already in `"completed"` state and is a no-op.

---

## 5. KYC Flow

### Client Submission

```
Client → /kyc page

1. Client uploads document (Convex File Storage)
2. useMutation(api.users.recordKycDocument)
      - assertAuthenticated
      - Inserts kycDocuments (status: "pending", fileStorageId: <Convex storage ID>)
      - profiles.kycStatus remains "pending" or "submitted"
```

### Admin Review

```
Admin → User Management → KYC review panel

1. useMutation(api.users.reviewKycDocument)
      - assertAdmin
      - Patches kycDocuments.status → "approved" | "rejected"
      - Sets kycDocuments.reviewedBy, reviewNotes
      - scheduleAuditLog(ctx, "kycDocument", docId, "REVIEW_KYC", oldStatus, newStatus)

2. If status = "approved" AND all docs for this user are approved:
      - Patches profiles.kycStatus → "verified"
      - scheduleAuditLog(ctx, "profile", profileId, "KYC_VERIFIED", ...)

3. If status = "rejected":
      - Patches profiles.kycStatus → "rejected"
      - scheduleAuditLog(ctx, "profile", profileId, "KYC_REJECTED", ...)
```

### Eligibility Gate Lift

`useKYCEligibility` hook reads `profiles.kycStatus` via `useQuery(api.users.getMyProfile)`. Because Convex queries are reactive, the gate lifts in real-time the moment `profiles.kycStatus` is set to `"verified"` — no page refresh needed.

---

## 6. Collections Flow

### Queue Population (Automated — Daily at 02:00 UTC)

```
convex/crons.ts → "daily-maintenance" → internal.scheduled.dailyTasks.runDailyTasks

  markOverduePayments:
    - Queries paymentSchedules where dueDate < now AND status = "scheduled"
    - Patches each to status: "overdue"
    - For each overdue loan, inserts overdueReminders record
```

### Staff Interaction

```
Loan officer → CollectionsDashboard → CollectionsWorkqueue

1. useQuery(api.collections.getCollectionsQueue)
      → Returns loans with overdue installments + collections context

2. useMutation(api.collections.recordInteraction)
      - assertStaff
      - Inserts collectionsInteractions (activityType, contactMethod, notes, outcome)

3. useMutation(api.collections.createPromiseToPay)
      - assertStaff
      - Inserts promiseToPay (status: "pending", promiseDate, amount)

4. Daily cron checks broken promises:
      checkPromiseToPay:
        - Queries promiseToPay where promiseDate < now AND status = "pending"
        - Patches to status: "broken"
```

---

## 7. Notification Flow

### In-App Notification Creation

```
Any mutation that triggers a user notification calls:
  scheduleNotification(ctx, userId, { title, body, type, category, actionUrl })
  → ctx.scheduler.runAfter(0, internal.notifications.createNotification, { ... })
  → Inserts into notifications table

Client reads via useQuery(api.notifications.getMyNotifications) — reactive, instant
```

### SMS / WhatsApp Queue Processing (Daily at 02:00 UTC)

```
daily-maintenance cron → processNotificationQueue:
  1. Queries notificationQueue where status = "pending"
  2. For each entry:
     - channel = "sms" → ctx.runAction(internal.actions.sendSms, { ... })
       → Africa's Talking API (requires AFRICASTALKING_API_KEY)
       → On success: patches status "sent", inserts communicationLogs
       → On failure: increments retryCount, updates errorMessage
     - channel = "whatsapp" → ctx.runAction(internal.actions.sendWhatsapp, { ... })
       → Meta Cloud API (requires WHATSAPP_ACCESS_TOKEN)
```

---

## 8. IPS Webhook Flow (Inbound — Bank of Namibia Callback)

```
IPS Switch → POST /webhook/ips

1. convex/http.ts httpAction:
      a. Reads raw body as text
      b. Verifies HMAC-SHA256: X-IPS-Signature header vs IPS_WEBHOOK_SECRET
      c. If invalid: returns 401 Unauthorized
      d. Parses JSON body (IPS pacs.002 payload)

2. ctx.runAction(internal.actions.ipsAdapter.handleWebhook, { payload })
      - Looks up ipsTransactions by msgId
      - Updates status based on pacs.002 status code
      - If completed → triggers disbursement or payment completion

3. Returns 200 { "received": true }
```

---

## 9. TigerBeetle Outbox Flow

```
Financial mutation (initiateDisbursement / recordPayment):
  1. Inserts business record (disbursements / paymentTransactions)
  2. Inserts tigerBeetleOutbox entry — SAME atomic mutation
     (status: "pending", eventType: "DISBURSEMENT" | "REPAYMENT")

tb-outbox-worker cron (every 30s):
  1. internal.tigerbeetle.outbox.claimPendingEntries → patches status "processing"
  2. Simulates POST to TigerBeetle at TIGERBEETLE_ADDRESS (or localhost:3001)
     (Currently simulation — no live cluster connection)
  3. On simulated success:
     - internal.tigerbeetle.outbox.completeEntry → status "completed"
     - Inserts tigerBeetleTransfers record (shadow ledger)
  4. On failure (after 10 retries):
     - internal.tigerbeetle.outbox.failEntry → status "dead_letter"
     - Logs lastError

Key guarantee: outbox entry is atomic with business record.
If the mutation fails, neither the business record nor the outbox entry is written.
```

---

## 10. Settlement Flow

> ⚠️ Settlement is implemented without an outbound transport layer. pacs.009 XML is generated and stored in Convex but not transmitted to NISS.

```
Admin → ReconciliationDashboard → Settlement tabs

1. Create settlement run:
   useMutation(api.settlement.createRun, { runId, settlementDate, windowId })
   → Inserts settlementRuns (state: "collecting")

2. State transitions (manual or automated):
   collecting → cutoff_reached → prepare_inputs → netting → generated → ...

3. Netting computation:
   - Queries ipsTransactions for the settlement window
   - Inserts settlementObligations (gross bilateral amounts)
   - Inserts settlementExposures (net positions per participant)
   - Inserts settlementNetInstructions

4. PACS.009 batch generation:
   - Generates ISO 20022 pacs.009 XML via convex/lib/xmlEscape.ts
   - Inserts settlementPacs009Batches (fileContent stored inline)
   - state → "generated"

5. Dispatch (no transport implemented):
   - state → "dispatched" (manual admin action)
   - In production: would transmit to NISS over mTLS
```

---

## 11. Audit Log Flow

```
Financial mutation calls scheduleAuditLog(ctx, entityType, entityId, action, oldState, newState):
  → ctx.scheduler.runAfter(0, internal.audit.writeAuditEntry, { ... })
  → Inserts auditLogs (async, non-blocking to mutation)

State transitions also logged:
  → ctx.scheduler.runAfter(0, internal.audit.writeStateTransition, { ... })
  → Inserts stateTransitions

Sensitive view access:
  useMutation(api.audit.logViewAccess, { entityType, entityId })
  → Inserts viewLogs
```

All audit records are **append-only**. No hard deletes. 7-year retention.

---

## 12. User Onboarding and Role Assignment

```
1. Client registers via /auth page:
   - Convex Auth Password provider handles sign-up
   - afterUserCreatedOrUpdated callback in convex/auth.ts fires:
     a. Inserts profiles (userId, email, kycStatus: "pending")
     b. Inserts userRoles (role: "client")

2. Admin upgrades role:
   Admin → User Management → Edit Profile → Change Role
   useMutation(api.users.setUserRole, { userId, role: "loan_officer" | "admin" })
   - assertAdmin
   - Patches userRoles.role
   - scheduleAuditLog(...)
```

---

## 13. Budget Tracker Flow

```
Client → /budget page (BudgetTracker.tsx)
  - Reads mock transaction data (inline — no Convex tables)
  - Displays spending breakdown (Recharts pie chart)
  - Supports CSV upload: processCSVUpload() parses bank statement formats
    (Standard Bank, FNB, Nedbank column mappings)

⚠️ No live bank account integration. Data is illustrative.
```

---

## See Also

- [API_REFERENCE.md](./API_REFERENCE.md) — Full function signatures and auth requirements
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Tables used in each flow
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flow diagrams
- [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) — Domain events, projections, and rules triggered by each flow
- [FUNCTIONALITY_MAP.md](./FUNCTIONALITY_MAP.md) — Feature implementation status
- [FLOW_VALIDATION_PLAN.md](./FLOW_VALIDATION_PLAN.md) — Flow validation approach
- [FLOW_VALIDATION_MATRIX.md](./FLOW_VALIDATION_MATRIX.md) — Flow conformance tracker

> **Note**: Each flow step that changes financial state emits domain events to the event journal (via `emitDomainEvent()` in `convex/lib/domainEvents.ts`). These events drive real-time projections and are the primary audit trail. See [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) for the complete event catalog.
