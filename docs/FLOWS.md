# NamLend Trust - Transaction Flows

**Doc Revision**: 2026-01-19

---

## 1. Loan Application Flow (Current)

```
Client UI (LoanApplication.tsx)
  -> KYC eligibility check (useKYCEligibility hook)
  -> submitApprovalRequest()
  -> approval_requests (status: pending)
  -> admin queue (approval_requests_expanded)
```

Notes:

- KYC verification is required before loan application submission.
- Credit scoring is not invoked during submission (display-only component exists).
- No loan record is created on submit; loan is created after admin approval.

---

## 2. Admin Review and Approval

```
Admin Queue
  -> updateApprovalStatus() (pending -> under_review -> approved/rejected)
  -> process_approval_transaction RPC (approved only)
      -> loans insert (approval_request_id linked)
      -> payment_schedules generation
      -> disbursements insert
```

---

## 3. Disbursement Flow

### Manual Disbursement

```
Admin -> DisbursementManager
  -> approve_disbursement
  -> mark_disbursement_processing
  -> complete_disbursement
  -> ledger outbox post (TigerBeetle)
```

### IPS Disbursement (Mock)

```
Admin -> IPSDisbursementForm
  -> initiateIPSDisbursement()
  -> initiate_ips_disbursement RPC
  -> ips-adapter /pay (mock)
  -> complete_ips_transaction RPC
```

---

## 4. Payments

### 4.1 Payment Page (Create Payment)

```
Client -> Payment page
  -> create_payment RPC (idempotent)
  -> payments (status: pending)
  -> payment_webhook or manual update -> status completed
  -> apply_payment_to_schedule RPC (webhook path)
```

### 4.2 Dashboard Payment Modal (Direct Processing)

```
Client -> PaymentModal
  -> process_loan_payment RPC
  -> payments + payment_schedules updated
  -> ledger outbox post (TigerBeetle)
```

### 4.3 IPS Repayment (Mock)

```
Client -> IPSPaymentModal
  -> initiateIPSRepayment()
  -> initiate_ips_repayment RPC
  -> ips-adapter /pay (mock)
  -> complete_ips_transaction RPC
```

---

## 5. Collections Flow

```
Scheduled Tasks / Admin
  -> mark_overdue_payments RPC
  -> collections_queue view
  -> record_collection_activity / promise_to_pay / reschedule_requests
```

---

## 6. Notifications Flow

```
Service calls queue_notification RPC
  -> notification_queue
  -> scheduled-tasks Edge Function
  -> send-sms / send-whatsapp Edge Functions (if enabled)
  -> notifications + communication_logs
```

---

## 7. Settlement Flow (Back Office)

```
Admin -> ReconciliationDashboard
  -> create_settlement_run RPC
  -> process_settlement_run RPC
  -> pacs.009 batches + reports stored
  -> (No outbound transport implemented)
```

---

## 8. Audit and Compliance

```
RPCs and triggers -> audit_logs / view_logs / state_transitions
```

---

## 9. Budget & Finance Tracking Flow

```
Client UI (BudgetTracker.tsx)
  -> financeService.getTransactions() (mock data currently)
  -> financeService.getBudgetOverview() (category budgets)
  -> financeService.getSavingsGoals() (savings progress)
  -> CSV upload: processCSVUpload() (bank statement parsing)
```

Notes:

- Currently uses mock data; Supabase tables pending.
- Supports CSV upload from Standard Bank, FNB, Nedbank formats.
- Spending breakdown pie chart (Recharts) and budget progress bars.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [SERVICES.md](./SERVICES.md) - Service layer details
- [FUNCTIONALITY_MAP.md](./FUNCTIONALITY_MAP.md) - Feature to service mapping
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database tables used in flows
