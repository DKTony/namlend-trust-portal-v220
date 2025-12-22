# NamLend Trust - Transaction Flows Documentation

**Version**: 1.0.0  
**Date**: December 21, 2025  
**Status**: ✅ Complete End-to-End Documentation

---

## Table of Contents

1. [Client Loan Request Flow](#1-client-loan-request-flow)
2. [Admin Review & Approval Flow](#2-admin-review--approval-flow)
3. [Disbursement Flows](#3-disbursement-flows)
   - 3.1 [IPS/IPP Disbursement](#31-ipsipp-disbursement)
   - 3.2 [Bank Transfer Disbursement](#32-bank-transfer-disbursement)
   - 3.3 [Mobile Wallet Disbursement](#33-mobile-wallet-disbursement)
4. [Payment/Repayment Flows](#4-paymentrepayment-flows)
5. [Service Reference Matrix](#5-service-reference-matrix)

---

## 1. Client Loan Request Flow

### Overview
Complete flow from client loan application to approval queue entry.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LOAN REQUEST FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│ Loan Form    │────▶│ Credit Score │────▶│ Submit to    │
│  Portal  │     │ (UI)         │     │ Assessment   │     │ Approval     │
└──────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                       │                     │                     │
                       ▼                     ▼                     ▼
                 ┌──────────┐         ┌──────────────┐     ┌──────────────┐
                 │ loans    │         │credit_scores │     │ approval_    │
                 │ (table)  │         │   (table)    │     │ requests     │
                 └──────────┘         └──────────────┘     └──────────────┘
```

### Step-by-Step Touchpoints

| Step | Actor | UI Component | Service | Database | Status |
|------|-------|--------------|---------|----------|--------|
| 1 | Client | `LoanApplication.tsx` | - | - | User opens loan form |
| 2 | Client | Form validation | - | - | Client enters loan details |
| 3 | System | - | `creditScoring.ts` → `calculateCreditScore()` | `credit_scores` | AI credit assessment |
| 4 | System | - | `loanService.ts` → `createLoan()` | `loans` INSERT | Loan record created (status: `pending`) |
| 5 | System | - | `approvalWorkflow.ts` → `submitApprovalRequest()` | `approval_requests` INSERT | Request queued |
| 6 | System | - | `notificationService.ts` → `queueNotification()` | `notifications` INSERT | Client notified |
| 7 | System | - | `smsGateway.ts` → `sendTemplateSMS('LOAN_SUBMITTED')` | `communication_logs` | SMS sent |
| 8 | System | - | `auditService.ts` → `logStateTransition()` | `state_transitions` | Audit trail |

### Services Hot for Loan Request

```typescript
// Primary Services
src/services/creditScoring.ts       // calculateCreditScore(), getLoanRecommendation()
src/services/loanService.ts         // createLoan(), getLoanDetails()
src/services/approvalWorkflow.ts    // submitApprovalRequest()
src/services/notificationService.ts // queueNotification()
src/services/smsGateway.ts          // sendTemplateSMS()
src/services/auditService.ts        // logStateTransition(), logViewActivity()

// Database Tables
loans                    // Main loan record
credit_scores            // AI credit assessment
approval_requests        // Back-office queue
notifications            // In-app notifications
communication_logs       // SMS/WhatsApp history
state_transitions        // Audit trail
```

### Database Flow

```sql
-- 1. Loan Created
INSERT INTO loans (user_id, amount, term_months, interest_rate, status, ...)
VALUES ($1, $2, $3, $4, 'pending', ...);

-- 2. Credit Score Recorded
INSERT INTO credit_scores (user_id, loan_id, score, risk_level, factors, ...)
VALUES ($1, $2, $3, $4, $5, ...);

-- 3. Approval Request Created
INSERT INTO approval_requests (user_id, request_type, request_data, status, priority, ...)
VALUES ($1, 'loan_application', $2, 'pending', 'normal', ...);

-- 4. Notification Queued
INSERT INTO notifications (user_id, title, message, category, ...)
VALUES ($1, 'Loan Application Submitted', $2, 'loan', ...);
```

---

## 2. Admin Review & Approval Flow

### Overview
Complete flow for admin to review, approve/reject, and trigger disbursement.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ADMIN REVIEW & APPROVAL FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin sees   │────▶│ Review Loan  │────▶│ Approve/     │────▶│ Create       │
│ Queue        │     │ Details      │     │ Reject       │     │ Disbursement │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ approval_    │     │ profiles     │     │ loans        │     │disbursements │
│ requests     │     │ documents    │     │ state_trans  │     │   (table)    │
│ _expanded    │     │ credit_score │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Step-by-Step Touchpoints

| Step | Actor | UI Component | Service | Database | Status |
|------|-------|--------------|---------|----------|--------|
| 1 | Admin | `ApprovalManagementDashboard.tsx` | `approvalWorkflow.ts` → `getAllApprovalRequests()` | `approval_requests_expanded` VIEW | View queue |
| 2 | Admin | `LoanReviewPanel.tsx` | - | `loans`, `profiles`, `documents` SELECT | Review details |
| 3 | Admin | `Loan360View.tsx` | `creditScoring.ts` → `getCreditScore()` | `credit_scores` SELECT | View credit assessment |
| 4 | Admin | Review Form | `approvalWorkflow.ts` → `updateApprovalStatus()` | `approval_requests` UPDATE | Mark under_review |
| 5 | Admin | Approve Button | `approvalWorkflow.ts` → `processApprovalTransaction()` | RPC: `process_approval_transaction` | Atomic approval |
| 6 | System | - | RPC updates `loans.status` | `loans` UPDATE to `approved` | Loan approved |
| 7 | System | - | `disbursementService.ts` → `createDisbursementOnApproval()` | `disbursements` INSERT | Disbursement created |
| 8 | System | - | `notificationService.ts` | `notifications` INSERT | Client notified |
| 9 | System | - | `smsGateway.ts` → `sendTemplateSMS('LOAN_APPROVED')` | `communication_logs` | SMS sent |
| 10 | System | - | `auditService.ts` | `state_transitions`, `audit_logs` | Audit trail |

### Approval Decision States

```
pending → under_review → approved → disbursement_pending
                      ↘ rejected (terminal)
                      ↘ requires_info → pending (loop back)
```

### Services Hot for Approval

```typescript
// Primary Services
src/services/approvalWorkflow.ts    // getAllApprovalRequests(), updateApprovalStatus(), processApprovalTransaction()
src/services/creditScoring.ts       // getCreditScore(), getLoanRecommendation()
src/services/disbursementService.ts // createDisbursementOnApproval()
src/services/notificationService.ts // queueNotification()
src/services/smsGateway.ts          // sendTemplateSMS('LOAN_APPROVED')
src/services/whatsappGateway.ts     // quickSend.loanApproved()
src/services/auditService.ts        // logStateTransition()

// Database Tables/Views
approval_requests_expanded  // Queue view with user info
loans                       // Loan record
profiles                    // Client profile
documents                   // KYC documents
credit_scores               // Credit assessment
disbursements               // Disbursement record
state_transitions           // Audit trail
approval_workflow_history   // Workflow audit
```

### Key RPC Functions

```sql
-- Atomic loan approval (all-or-nothing)
SELECT process_approval_transaction(
  p_loan_id := $1,
  p_reviewer_id := $2,
  p_review_notes := $3
);

-- Create disbursement on approval
SELECT create_disbursement_on_approval(
  p_loan_id := $1
);
```

---

## 3. Disbursement Flows

### 3.1 IPS/IPP Disbursement

**Instant Payment Platform - Real-time settlement via Bank of Namibia**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IPS DISBURSEMENT FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin        │────▶│ Validate     │────▶│ IPS Adapter  │────▶│ IPS Switch   │
│ Initiates    │     │ Client VPA   │     │ (Edge Func)  │     │ (BON)        │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│disbursements │     │ ips_vpas     │     │ips_trans-   │     │ Beneficiary  │
│              │     │              │     │ actions      │     │ Bank Account │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │ TigerBeetle  │
                                         │ Ledger       │
                                         └──────────────┘
```

#### Step-by-Step Touchpoints

| Step | Actor | UI Component | Service | Database/External | Status |
|------|-------|--------------|---------|-------------------|--------|
| 1 | Admin | `DisbursementManager.tsx` | `disbursementService.ts` → `getPendingDisbursements()` | `disbursements` SELECT | View pending |
| 2 | Admin | Select IPS | `ipsService.ts` → `getUserVPAs()` | `ips_vpas` SELECT | Get client VPA |
| 3 | Admin | Initiate | `ipsService.ts` → `initiateIPSDisbursement()` | RPC: `initiate_ips_disbursement` | Create IPS transaction |
| 4 | System | - | Edge Function: `ips-adapter` | IPS Switch (BON) | Send to IPS |
| 5 | System | - | `ipsService.ts` → `completeIPSTransaction()` | `ips_transactions` UPDATE | Record result |
| 6 | System | - | `disbursementService.ts` → `completeDisbursement()` | RPC: `complete_disbursement` | Mark complete |
| 7 | System | - | `ledgerService.ts` → `postDisbursement()` | `tigerbeetle_outbox` INSERT | Queue to TigerBeetle |
| 8 | System | - | `notificationService.ts` | `notifications` INSERT | Client notified |
| 9 | System | - | `smsGateway.ts` → `sendTemplateSMS('LOAN_DISBURSED')` | `communication_logs` | SMS sent |

#### IPS Message Flow (XML)

```xml
<!-- Step 1: ReqPay to IPS Switch -->
<ReqPay xmlns="http://ips.bon.na">
  <Txn>
    <TxnId>NL-ABC123</TxnId>
    <Payer>
      <Addr>namlend@fnb</Addr>
      <Name>NamLend Trust</Name>
    </Payer>
    <Payee>
      <Addr>john.doe@bank</Addr>
      <Name>John Doe</Name>
    </Payee>
    <Amount>5000.00</Amount>
    <Currency>NAD</Currency>
  </Txn>
</ReqPay>

<!-- Step 2: RespPay from IPS Switch -->
<RespPay>
  <TxnId>NL-ABC123</TxnId>
  <Result>SUCCESS</Result>
  <RefId>BON-2025122100001</RefId>
</RespPay>
```

#### Services Hot for IPS Disbursement

```typescript
// Primary Services
src/services/ipsService.ts           // initiateIPSDisbursement(), completeIPSTransaction(), getUserVPAs()
src/services/disbursementService.ts  // completeDisbursement(), approveDisbursement()
src/services/ledgerService.ts        // postDisbursement(), createLoanAccounts()
src/services/notificationService.ts  // queueNotification()
src/services/smsGateway.ts           // sendTemplateSMS('LOAN_DISBURSED')

// Edge Functions
supabase/functions/ips-adapter/      // IPS Switch communication
supabase/functions/tigerbeetle-outbox-worker/ // Ledger posting

// Database Tables
disbursements          // Disbursement record
ips_transactions       // IPS transaction record
ips_vpas               // Virtual Payment Addresses
tigerbeetle_outbox     // Ledger queue
tigerbeetle_transfers  // Shadow ledger
```

---

### 3.2 Bank Transfer Disbursement

**Manual EFT via FNB Namibia**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BANK TRANSFER DISBURSEMENT FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin        │────▶│ Process EFT  │────▶│ Enter Bank   │────▶│ Complete     │
│ Approves     │     │ Externally   │     │ Reference    │     │ Disbursement │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│disbursements │     │ External     │     │ Manual Entry │     │ loans UPDATE │
│ (approved)   │     │ Banking      │     │ by Admin     │     │ (disbursed)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

#### Step-by-Step Touchpoints

| Step | Actor | UI Component | Service | Database | Status |
|------|-------|--------------|---------|----------|--------|
| 1 | Admin | `DisbursementManager.tsx` | `disbursementService.ts` → `approveDisbursement()` | `disbursements` UPDATE | Approve for processing |
| 2 | Admin | External | - | - | Process EFT in bank portal |
| 3 | Admin | `CompleteDisbursementModal.tsx` | - | - | Enter bank reference |
| 4 | Admin | Submit | `disbursementService.ts` → `completeDisbursement()` | RPC: `complete_disbursement` | Complete disbursement |
| 5 | System | - | RPC updates `loans.status` | `loans` UPDATE to `disbursed` | Loan disbursed |
| 6 | System | - | `ledgerService.ts` → `postDisbursement()` | `tigerbeetle_outbox` INSERT | Queue to TigerBeetle |
| 7 | System | - | `paymentService.ts` → `generatePaymentSchedule()` | `payment_schedules` INSERT | Create schedule |
| 8 | System | - | `notificationService.ts` | `notifications` INSERT | Client notified |

#### Services Hot for Bank Transfer

```typescript
// Primary Services
src/services/disbursementService.ts  // approveDisbursement(), markDisbursementProcessing(), completeDisbursement()
src/services/ledgerService.ts        // postDisbursement(), createLoanAccounts()
src/services/paymentService.ts       // generatePaymentSchedule()
src/services/notificationService.ts  // queueNotification()
src/services/smsGateway.ts           // sendTemplateSMS('LOAN_DISBURSED')
src/services/auditService.ts         // logStateTransition()

// Database Tables
disbursements         // Disbursement record
loans                 // Loan status update
payment_schedules     // Repayment schedule
tigerbeetle_outbox    // Ledger queue
state_transitions     // Audit trail
```

---

### 3.3 Mobile Wallet Disbursement

**MTC MoMo / TN Mobile Money**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MOBILE WALLET DISBURSEMENT FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Admin        │────▶│ Select       │────▶│ Mobile Money │────▶│ Complete     │
│ Initiates    │     │ Provider     │     │ API Call     │     │ Disbursement │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│disbursements │     │ MTC MoMo     │     │ Webhook      │     │ loans UPDATE │
│              │     │ or TN Mobile │     │ Confirmation │     │ (disbursed)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

#### Step-by-Step Touchpoints

| Step | Actor | UI Component | Service | Database/External | Status |
|------|-------|--------------|---------|-------------------|--------|
| 1 | Admin | `DisbursementManager.tsx` | `disbursementService.ts` → `getPendingDisbursements()` | `disbursements` SELECT | View pending |
| 2 | Admin | Select MoMo/TN | `paymentGateway.ts` → `initiatePayment()` | - | Select provider |
| 3 | System | - | `paymentGateway.ts` → `initiateMTCMoMo()` or `initiateTNMobile()` | MTC/TN API | API call |
| 4 | System | - | Edge Function: `payment-webhook` | Webhook received | Provider confirms |
| 5 | System | - | `paymentGateway.ts` → `handlePaymentWebhook()` | `payments` UPDATE | Record confirmation |
| 6 | Admin | Complete | `disbursementService.ts` → `completeDisbursement()` | RPC: `complete_disbursement` | Complete |
| 7 | System | - | `ledgerService.ts` → `postDisbursement()` | `tigerbeetle_outbox` INSERT | Queue to TigerBeetle |
| 8 | System | - | `notificationService.ts` | `notifications` INSERT | Client notified |

#### Mobile Money Provider Details

| Provider | API Endpoint | Phone Format | USSD Code |
|----------|--------------|--------------|-----------|
| MTC MoMo | `api.mtc.com.na/momo` | 081XXXXXXX | *140# |
| TN Mobile | `api.tnmobile.com.na` | 085XXXXXXX | *111# |

#### Services Hot for Mobile Wallet

```typescript
// Primary Services
src/services/paymentGateway.ts       // initiatePayment(), initiateMTCMoMo(), initiateTNMobile(), handlePaymentWebhook()
src/services/disbursementService.ts  // completeDisbursement()
src/services/ledgerService.ts        // postDisbursement()
src/services/notificationService.ts  // queueNotification()
src/services/smsGateway.ts           // sendTemplateSMS()

// Edge Functions
supabase/functions/payment-webhook/  // Webhook handler

// Database Tables
disbursements         // Disbursement record
payments              // Payment transactions
tigerbeetle_outbox    // Ledger queue
```

---

## 4. Payment/Repayment Flows

### Client Makes a Repayment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPAYMENT FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Client       │────▶│ Select       │────▶│ Process      │────▶│ Apply to     │
│ Payment Page │     │ Provider     │     │ Payment      │     │ Schedule     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Payment.tsx  │     │ paymentGate- │     │ payments     │     │ payment_     │
│              │     │ way.ts       │     │ (table)      │     │ schedules    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │ TigerBeetle  │
                                         │ postRepayment│
                                         └──────────────┘
```

#### Step-by-Step Touchpoints

| Step | Actor | UI Component | Service | Database | Status |
|------|-------|--------------|---------|----------|--------|
| 1 | Client | `Payment.tsx` | `paymentService.ts` → `getLoanPaymentDetails()` | RPC: `get_loan_payment_details` | View balance |
| 2 | Client | Select method | `paymentGateway.ts` → `getPaymentInstructions()` | - | Get instructions |
| 3 | Client | Pay | `paymentGateway.ts` → `initiatePayment()` | `payments` INSERT | Create payment |
| 4 | System | - | Webhook or manual | `payments` UPDATE | Payment confirmed |
| 5 | System | - | `paymentService.ts` → `processLoanPayment()` | RPC: `process_loan_payment` | Apply to schedule |
| 6 | System | - | `ledgerService.ts` → `postRepayment()` | `tigerbeetle_outbox` INSERT | Queue to TigerBeetle |
| 7 | System | - | Check if fully paid | `loans` UPDATE to `settled` | Settlement check |
| 8 | System | - | `notificationService.ts` | `notifications` INSERT | Payment confirmation |

#### Services Hot for Repayment

```typescript
// Primary Services
src/services/paymentService.ts       // processLoanPayment(), getLoanPaymentDetails(), applyPaymentToSchedule()
src/services/paymentGateway.ts       // initiatePayment(), verifyPayment(), handlePaymentWebhook()
src/services/ledgerService.ts        // postRepayment()
src/services/notificationService.ts  // queueNotification()
src/services/smsGateway.ts           // sendTemplateSMS('PAYMENT_RECEIVED')

// Database Tables
payments             // Payment transactions
payment_schedules    // Schedule entries
loans                // Loan status (check for settlement)
loan_balance_summary // Balance view
tigerbeetle_outbox   // Ledger queue
```

---

## 5. Service Reference Matrix

### Complete Service Touchpoint Map

| Transaction Type | Services Used |
|-----------------|---------------|
| **Loan Request** | `creditScoring.ts`, `loanService.ts`, `approvalWorkflow.ts`, `notificationService.ts`, `smsGateway.ts`, `auditService.ts` |
| **Approval** | `approvalWorkflow.ts`, `creditScoring.ts`, `disbursementService.ts`, `notificationService.ts`, `smsGateway.ts`, `whatsappGateway.ts`, `auditService.ts` |
| **IPS Disbursement** | `ipsService.ts`, `disbursementService.ts`, `ledgerService.ts`, `notificationService.ts`, `smsGateway.ts` |
| **Bank Transfer** | `disbursementService.ts`, `ledgerService.ts`, `paymentService.ts`, `notificationService.ts`, `smsGateway.ts`, `auditService.ts` |
| **Mobile Wallet** | `paymentGateway.ts`, `disbursementService.ts`, `ledgerService.ts`, `notificationService.ts`, `smsGateway.ts` |
| **Repayment** | `paymentService.ts`, `paymentGateway.ts`, `ledgerService.ts`, `notificationService.ts`, `smsGateway.ts` |
| **Collections** | `collectionsService.ts`, `paymentService.ts`, `smsGateway.ts`, `whatsappGateway.ts`, `notificationService.ts` |

### Database Tables by Flow

| Flow | Primary Tables | Supporting Tables |
|------|---------------|-------------------|
| **Loan Request** | `loans`, `approval_requests` | `credit_scores`, `profiles`, `notifications`, `state_transitions` |
| **Approval** | `approval_requests`, `loans`, `disbursements` | `approval_workflow_history`, `audit_logs`, `state_transitions` |
| **Disbursement** | `disbursements`, `loans` | `ips_transactions`, `payments`, `payment_schedules`, `tigerbeetle_outbox` |
| **Repayment** | `payments`, `payment_schedules` | `loans`, `loan_balance_summary`, `tigerbeetle_outbox` |

### Edge Functions Used

| Edge Function | Used By |
|---------------|---------|
| `ips-adapter` | IPS disbursements & repayments |
| `payment-webhook` | All payment providers |
| `tigerbeetle-outbox-worker` | All financial transactions |
| `send-sms` | All notifications |
| `send-whatsapp` | All notifications |
| `send-notification` | In-app notifications |
| `scheduled-tasks` | Payment reminders, overdue processing |

### RPC Functions Summary

| RPC Function | Purpose | Used In Flow |
|--------------|---------|--------------|
| `process_approval_transaction` | Atomic loan approval | Approval |
| `create_disbursement_on_approval` | Create disbursement record | Approval |
| `complete_disbursement` | Mark disbursement complete | All Disbursements |
| `initiate_ips_disbursement` | Start IPS transaction | IPS Disbursement |
| `process_loan_payment` | Apply payment to schedule | Repayment |
| `get_loan_payment_details` | Get payment summary | Repayment |
| `generate_payment_schedule` | Create repayment schedule | Post-Disbursement |
| `mark_overdue_payments` | Flag overdue payments | Scheduled Job |

---

## Appendix A: Status State Machines

### Loan Status

```
pending → under_review → approved → disbursed → active → settled
                       ↘ rejected (terminal)
                                   ↘ defaulted (terminal)
```

### Disbursement Status

```
pending → approved → processing → completed
                               ↘ failed → pending (retry)
```

### Payment Status

```
pending → processing → completed
                    ↘ failed
                    ↘ cancelled
```

### IPS Transaction Status

```
initiated → pending_callback → completed
                            ↘ failed
                            ↘ timeout → pending_callback (retry)
```

---

## Appendix B: TigerBeetle Integration Points

All financial transactions post to TigerBeetle via the outbox pattern:

| Transaction | Ledger Service Function | TigerBeetle Entry |
|-------------|------------------------|-------------------|
| Disbursement | `postDisbursement()` | DR: Principal Receivable, CR: Disbursement Clearing |
| Repayment | `postRepayment()` | DR: Collections Clearing, CR: Principal/Interest/Fees |
| Late Fee | `postLateFeeAccrual()` | DR: Fees Receivable, CR: Late Fee Income |
| IPS Transfer | `postIPSInitiate/Complete()` | Two-phase transfer |
| Settlement | `postSettlementToTigerBeetle()` | Net position transfers |

---

**Document End**  
*Generated: December 21, 2025*  
*NamLend Trust v2.7.0*
