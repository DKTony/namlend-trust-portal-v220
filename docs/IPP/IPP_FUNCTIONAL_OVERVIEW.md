# Instant Payment Namibia (IPN) / IPP – Functional Overview

**Version**: 0.1.0  
**Last Updated**: December 10, 2025  
**Status**: 🔶 Draft – Engineering interpretation, validate against official FSD/TSD

**External References (not embedded here)**

- `20251022_IPP Functional Specification Document (FSD)_v10.0.pdf`
- `20251022_IPN Scheme Rules v 0.3_vShared.pdf`
- `20251117_BON_Instant Payment Solution (IPS) TSD_v0.7_unlocked.pdf`

> This document gives a **use-case and flow-oriented** view of IPN/IPP as it relates to NamLend. It complements:
>
> - `IPP_GOVERNANCE.md` – scheme rules, roles, risk, compliance.
> - `IPP_INTEGRATION.md` – integration guide and API patterns.

---

## 1. Actors and High-Level Responsibilities

| Actor                   | Core Responsibilities in Flows                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Customer (Borrower)** | Initiates repayments, approves mandates, receives disbursements.                      |
| **NamLend**             | Orchestrates disbursements/repayments, maintains loan state, reconciles IPN outcomes. |
| **Partner Bank(s)**     | Hold settlement and customer accounts; perform debits/credits and risk checks.        |
| **PSP / Gateway**       | Hosts IPP connector, constructs XML messages, handles certificates, retries.          |
| **IPN / IPS Switch**    | Routes messages, enforces scheme rules, coordinates final settlement.                 |

In technical terms, NamLend generally acts as:

- **Payee / Beneficiary** in **repayment** scenarios.
- **Payer** (merchant side) in **disbursement** and **refund** scenarios.

---

## 2. Core Flows for NamLend

### 2.1 Loan Disbursement via IPN (Credit Push to Customer)

**Goal**: Credit the approved loan amount into the customer’s bank account in real time.

**Primary IPP message pattern**: `ReqPay` → `RespPay` with `txnSubType = PAY` (push payment).

**Indicative Sequence** (conceptual):

```
Customer Approved → NamLend Core → IPP Connector → IPN → Banks → IPN → Connector → NamLend
```

**Key Steps**:

1. **Loan approved** in NamLend (`loans.status = approved`).
2. **Disbursement record** created (`disbursements` row with target amount, bank/VPA).
3. NamLend/connector constructs `ReqPay` with:
   - `Payer` = NamLend settlement account.
   - `Payee` = customer account or VPA.
   - `Amount` = approved loan amount (NAD).
4. IPN routes request to issuing and acquiring banks; banks perform balance and risk checks.
5. `RespPay` returned with `result` = `SUCCESS` / `FAILURE` / `DEEMED` and an `errCode` if applicable.
6. NamLend updates:
   - `disbursements.status`, `processed_at`, `payment_reference`.
   - `loans.status` and `disbursed_at`.
7. On **failure/timeouts**, NamLend may:
   - Mark disbursement as failed/pending.
   - Offer a retry or fallback rail (EFT, mobile money) via `paymentGateway`.

**Functional Invariants**:

- A loan **must not** transition to `settled` based solely on disbursement; settlement depends on repayments.
- Each `disbursement` must be linked to **exactly one** IPN transaction ID set (for reconciliation).

---

### 2.2 Single Loan Repayment via IPN (Credit Push to NamLend)

**Goal**: Allow borrowers to repay loans to NamLend via IPN in real time.

**Message pattern**: `ReqPay` → `RespPay` with `txnSubType = PAY` or scheme-specific repayment type.

**Indicative Flow**:

1. Customer opens **Repayment** screen in NamLend app.
2. App fetches from Supabase:
   - `loans` (outstanding balance).
   - `payment_schedules` (upcoming installments).
3. Customer selects amount: **minimum due**, **installment amount**, or **full settlement**.
4. NamLend constructs `ReqPay`:
   - `Payer` = customer VPA/account.
   - `Payee` = NamLend collections VPA (e.g. `collections@namlend`).
   - `Amount` = chosen repayment amount.
   - `Txn.refId` / `custRef` = internal loan/payment identifiers.
5. Customer authorises via IPN-approved method (MPIN/OTP) in PSP or bank app.
6. IPN returns `RespPay` with final status.
7. NamLend:
   - On `SUCCESS`:
     - Inserts `payments` row.
     - Applies payment to `payment_schedules` and adjusts `loans.outstanding_balance`.
     - If balance reaches 0 with scheme-confirmed finality → mark `loans.status = settled`.
   - On `FAILURE` / `DEEMED` / `PENDING`:
     - Updates UI and backoffice with exact IPN status.
     - Optionally prompts user to retry or switches to another rail.

---

### 2.3 Recurring Repayments via Mandates (Conceptual)

**Goal**: Automate periodic debits for scheduled installments.

**Message pattern**: Mandate create/modify/revoke flows, then debit/collect flows using the mandate ID (specifics in FSD/TSD).

**Functional View**:

1. Customer opts into **auto-debit** when accepting loan terms.
2. NamLend initiates **mandate creation** with rules for: amount or amount range, frequency, start/end dates.
3. Customer approves mandate through PSP/bank channel.
4. On each due date:
   - NamLend triggers a **collect** operation against the mandate.
   - IPN orchestrates debits/credits, returning final status.
5. NamLend reconciles each debit outcome with its installment schedule.

> Exact mandate tags and constraints (e.g. `recurrencePatternType`, `amtRuleType`) come from `UPI-Common.xsd` and must be consistent with FSD/TSD.

---

### 2.4 Balance Enquiry for Collections Context

**Goal**: Obtain the real-time available balance on a customer account before triggering a high-value debit.

**Message pattern**: `ReqBalEnq` → `RespBalEnq` (see `UPI-Meta-BalEnq.xsd`).

**Usage in NamLend** (optional, risk-based):

1. Before issuing a large debit (e.g. full settlement), NamLend or the PSP sends `ReqBalEnq` with payer account details.
2. IPN returns `RespBalEnq` with encrypted balance info.
3. NamLend’s risk engine can:
   - Decide whether to proceed.
   - Propose split payments or alternative arrangements.

> Detailed field-level behaviour and limits must be derived from FSD v10.0 and the TSD.

---

### 2.5 Transaction Status Check and Reconciliation

**Goal**: Resolve uncertainty about transaction outcomes (timeouts, network errors, intermittent failures).

**Message pattern**: `ReqChkTxn` → `RespChkTxn` (see `UPI-Meta-ChkTxn.xsd`).

**Functional Flow**:

1. NamLend marks a transaction as **"status unknown"** when:
   - Connector times out waiting for `RespPay`.
   - Response is ambiguous or indicates `PENDING`.
2. Backoffice or an automated process sends `ReqChkTxn` referencing original `msgId` / `txnId` / equivalent.
3. IPN returns `RespChkTxn` with:
   - Updated transaction result (`SUCCESS`/`FAILURE`/`PENDING`).
   - Optional references, consents, and organisation status codes.
4. NamLend updates internal records, ensuring that:
   - Each IPN transaction has a **single, final** outcome.
   - All pending states are resolved within scheme-defined time windows.

---

### 2.6 Refunds, Reversals, and Adjustments

**Goal**: Handle error correction and customer redress in a scheme-compliant way.

High-level functional scenarios:

- **Merchant Refund** – Overpayment or corrected billing; NamLend initiates a payment back to customer.
- **Auto-Reversal** – Scheme or bank reverses a transaction due to failure to complete within time or internal errors.
- **Dispute-Based Adjustment** – After dispute investigation, funds are reallocated.

Functional responsibilities for NamLend:

- Model refunds and reversals as **separate but linked transactions** in internal ledgers.
- Track scheme-level flags (e.g. adjustment indicators) from IPP messages in `payments` or a dedicated ledger table.
- Expose refund/reversal history clearly in admin UI for compliance and audit.

---

## 3. State Model and Mapping to NamLend

### 3.1 IPP Transaction States (Conceptual)

From the XSDs (`resultType`, `txnCnfrmOrgStatus`) and typical UPI-style systems, common result values include:

- `SUCCESS` – Final, funds moved according to the transaction instruction.
- `FAILURE` – Final, funds **not** moved; any pre-authorisation reversed.
- `PENDING` – Temporary, final outcome not yet known.
- `DEEMED` – Scheme-specific classification (e.g. treated as successful based on reconciliation rules); must be interpreted via the TSD.

### 3.2 Mapping to NamLend Payment/Disbursement States

| IPP Result | Internal Payment/Disbursement State | Notes                                                        |
| ---------- | ----------------------------------- | ------------------------------------------------------------ |
| `SUCCESS`  | `completed` / `settled`             | Final; eligible to move loan towards settlement.             |
| `FAILURE`  | `failed`                            | No funds moved; may allow retry or fallback rail.            |
| `PENDING`  | `pending_external`                  | Must trigger `ReqChkTxn` and not update loan balance yet.    |
| `DEEMED`   | `completed_pending_recon`           | Requires reconciliation policy defined with bank and scheme. |

> The exact internal status names should align with `loanStatuses.ts` and schema reference helpers.

### 3.3 Idempotency and Duplicate Handling

Functional rules to avoid double-posting:

- Each outgoing IPN transaction must have a **unique business key** (e.g. loan ID + schedule ID + sequence number).
- Connector should enforce **idempotency** so that retries (due to network issues) do not result in duplicate debits or credits.
- NamLend should treat IPP identifiers (e.g. `txn.id`, `orgTxnId`, `rrn`) as part of its reconciliation key set.

---

## 4. Operational and UX Considerations

### 4.1 Customer Experience

- Show **clear, scheme-aligned statuses**: "Processing", "Successful", "Failed", "Pending Confirmation".
- Provide **reference numbers** that combine NamLend internal IDs with IPN identifiers.
- For `PENDING` states, inform customers that final confirmation may take additional time and that they will be notified.

### 4.2 Backoffice and Support

- Provide operators with:
  - Full view of IPN/IPP identifiers per transaction.
  - Ability to trigger **status checks** and **manual reconciliation**.
  - Access to IPN error codes, reason texts, and bank-level status.

### 4.3 Monitoring and Alerting

- Track key KPIs:
  - Success rate per provider and per bank.
  - Latency distributions (time to `RespPay`).
  - Volume of `PENDING` and disputed transactions.
- Define thresholds for alerting (e.g. sudden spike in failures from a single bank or channel).

---

## 5. Validation Checklist Against FSD/TSD

When aligning this functional overview with the official specs:

- [ ] Confirm all **use cases** (disbursement, repayment, mandates, refunds) are permitted and modelled correctly in IPN.
- [ ] Align transaction sub-types (`txnSubType`, `payConstant`) with those listed in `UPI-Common.xsd` and TSD.
- [ ] Validate that the **state mappings** and meaning of `DEEMED` / `PENDING` match scheme definitions.
- [ ] Confirm that mandate flows use the correct APIs and constraint tags.
- [ ] Cross-check any assumed reconciliation timelines with the Scheme Rules and TSD.
- [ ] Ensure all flows are compatible with NamLend’s RLS, audit, and regulatory obligations.
