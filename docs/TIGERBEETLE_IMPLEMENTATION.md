# TigerBeetle Integration Guide for NamLend Trust

**Version**: 2.1.0  
**Date**: December 21, 2025  
**Status**: ✅ Phase 1 Complete - Full Integration Operational

---

## Executive Summary

This document outlines the strategic integration of **TigerBeetle** as a dedicated financial ledger service alongside NamLend Trust's existing Supabase/PostgreSQL infrastructure. TigerBeetle will serve as the **authoritative system of record for financial truth** (balances, transfers, reversals), while Supabase remains the system of record for **workflow and product data** (loans, profiles, KYC, approvals).

### Why TigerBeetle?

| Challenge | Current (Postgres) | TigerBeetle Solution |
|-----------|-------------------|---------------------|
| **Balance Calculation** | Aggregation queries | Deterministic, instant balance reads |
| **Double-Entry Integrity** | Application-level | Database-level enforcement |
| **Immutability** | Soft deletes, triggers | Native immutability, no UPDATE/DELETE |
| **Idempotency** | Manual reference tracking | Built-in transfer ID deduplication |
| **Two-Phase Commits** | Complex RPC transactions | Native pending/post/void primitives |
| **Throughput** | ~1,000 TPS | 1,000,000+ TPS per cluster |

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [TigerBeetle Overview](#2-tigerbeetle-overview)
3. [Integration Architecture](#3-integration-architecture)
4. [Chart of Accounts Design](#4-chart-of-accounts-design)
5. [Insertion Points Analysis](#5-insertion-points-analysis)
6. [Service Layer Integration](#6-service-layer-integration)
7. [Phased Rollout Plan](#7-phased-rollout-plan)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Current Architecture Analysis

### 1.1 Existing Financial Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  CURRENT NAMLEND ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  React SPA ───► SUPABASE (PostgreSQL 15+)                       │
│                 ├── loans, payments, disbursements              │
│                 ├── payment_schedules, ips_transactions         │
│                 ├── settlement_* (13 tables)                    │
│                 └── loan_balance_summary VIEW (computed)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Service Layer

**`disbursementService.ts`** - 8 functions:

- `createDisbursementOnApproval()` - RPC: create disbursement record
- `approveDisbursement()` - Status: pending → approved
- `markDisbursementProcessing()` - Status: approved → processing
- `completeDisbursement()` - Status: processing → completed
- `failDisbursement()` - Status: * → failed
- `getPendingDisbursements()` - Query pending queue
- `getDisbursementById()` - Single record lookup
- `getDisbursementsForLoan()` - Loan-filtered query

**`paymentService.ts`** - 12 functions:

- `processLoanPayment()` - Comprehensive payment with settlement detection
- `generatePaymentSchedule()` - Create amortization entries
- `applyPaymentToSchedule()` - Apply payment to oldest due
- `markOverduePayments()` - Scheduled job for overdue flagging
- `calculateLateFee()` / `waiveLateFee()` - Fee management
- `getLoanPaymentDetails()` - Full payment details
- `getLoanPortfolioSummary()` - User portfolio aggregation

### 1.3 Current Balance Calculation

```sql
-- loan_balance_summary VIEW (aggregation-based)
SELECT 
  l.id,
  l.total_repayment,
  COALESCE(SUM(p.amount), 0) as total_paid,
  l.total_repayment - COALESCE(SUM(p.amount), 0) as outstanding_balance
FROM loans l
LEFT JOIN payments p ON p.loan_id = l.id AND p.status = 'completed'
GROUP BY l.id;
```

**Limitations:**
- Query performance degrades with payment volume
- No atomic balance guarantee during concurrent operations
- No separation of principal vs interest vs fees

---

## 2. TigerBeetle Overview

### 2.1 What is TigerBeetle?

TigerBeetle is a purpose-built **OLTP database** for financial transactions implementing **double-entry bookkeeping** at the database level:

- **Strict Serializability**: Strongest isolation level
- **Immutability**: No UPDATE or DELETE operations
- **Two-Phase Transfers**: Native pending/post/void primitives
- **Deterministic Balances**: Balance is a field, not computation
- **Extreme Performance**: 1M+ TPS, sub-millisecond latency

### 2.2 Core Data Model

```
ACCOUNT                           TRANSFER
┌────────────────────┐            ┌────────────────────┐
│ id: u128           │            │ id: u128           │
│ debits_pending     │◄───────────│ debit_account_id   │
│ debits_posted      │            │ credit_account_id  │────►
│ credits_pending    │            │ amount: u128       │
│ credits_posted     │            │ pending_id: u128   │
│ user_data_128      │            │ user_data_*        │
│ ledger: u32        │            │ code, flags        │
│ code: u16          │            │ timeout: u32       │
└────────────────────┘            └────────────────────┘

INVARIANT: For every debit, an equal and opposite credit
```

### 2.3 Key Primitives

| Primitive | Description | NamLend Use Case |
|-----------|-------------|------------------|
| **Accounts** | Double-entry balance tracking | Borrower loan accounts |
| **Transfers** | Immutable money movement | Disbursement, repayment |
| **Pending Transfers** | Two-phase commit | IPS payment initiation |
| **Linked Transfers** | Atomic multi-transfer | Fee + principal allocation |
| **Balance Limits** | Hard limits enforcement | Credit limit control |

---

## 3. Integration Architecture

### 3.1 Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              TARGET NAMLEND + TIGERBEETLE ARCHITECTURE           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  React SPA                                                       │
│      │                                                           │
│      ▼                                                           │
│  SUPABASE (Control Plane)                                        │
│  ├── Auth, RLS, User Profiles/KYC                               │
│  ├── Loan Applications, Approval Workflows                      │
│  ├── Notifications, Settlement Reports/UI                       │
│  │                                                               │
│  │   ledger_events (Outbox)                                     │
│  │       │                                                       │
│  │       ▼                                                       │
│  │   LEDGER SERVICE (Edge Function)                             │
│  │       │                                                       │
│  └───────┼───────────────────────────────────────────────────────┤
│          ▼                                                       │
│  TIGERBEETLE CLUSTER (Data Plane)                               │
│  ├── NAD Ledger                                                 │
│  ├── Borrower Accounts (Principal/Interest/Fee Receivable)      │
│  ├── NamLend Operational (Clearing, Bank, Income)               │
│  └── IPS Accounts (Pending In/Out, Operator Fee)                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Division of Responsibilities

| System | Responsibility |
|--------|----------------|
| **Supabase (OLGP)** | Workflow, metadata, auth, reporting |
| **TigerBeetle (OLTP)** | Financial truth, balances, transfers |
| **Ledger Service** | Bridge, outbox processing, balance API |

### 3.3 Outbox Pattern

```sql
-- Supabase Transaction (atomic)
BEGIN;
  UPDATE disbursements SET status = 'completed' WHERE id = $1;
  INSERT INTO ledger_events (
    event_type, entity_id, payload, idempotency_key
  ) VALUES ('DISBURSEMENT_COMPLETED', $1, {...}, $1::text);
COMMIT;

-- Ledger Service (async worker)
FOR EACH unprocessed event:
  • Parse event payload
  • Create TigerBeetle transfer(s) with idempotency_key as ID
  • Mark event as processed
```

---

## 4. Chart of Accounts Design

### 4.1 Account Structure

```
LEDGER: 1 (NAD - Namibian Dollar)
ASSET_SCALE: 2 (cents: NAD 100.00 = 10000)

CODE RANGES:
• 1000-1999: Borrower Accounts (per loan)
• 2000-2999: NamLend Operational Accounts
• 3000-3999: IPS/Payment Rail Accounts
• 5000-5999: Income Accounts
• 6000-6999: Expense Accounts
```

### 4.2 Borrower Accounts (Per Loan)

| Code | Name | Balance Type | Purpose |
|------|------|--------------|---------|
| 1001 | LOAN_PRINCIPAL_RECEIVABLE | Debit (Asset) | Outstanding principal |
| 1002 | LOAN_INTEREST_RECEIVABLE | Debit (Asset) | Accrued interest |
| 1003 | LOAN_FEE_RECEIVABLE | Debit (Asset) | Late fees, service fees |
| 1010 | BORROWER_OVERPAYMENT | Credit (Liability) | Overpayments held |

### 4.3 NamLend Operational Accounts

| Code | Name | Purpose |
|------|------|---------|
| 2001 | DISBURSEMENT_CLEARING | Money out, before bank confirms |
| 2002 | COLLECTIONS_CLEARING | Money in, before bank confirms |
| 2003 | BANK_OPERATING_ACCOUNT | Real cash position |
| 2010 | SUSPENSE_UNALLOCATED | Unallocated payments |

### 4.4 IPS Accounts

| Code | Name | Purpose |
|------|------|---------|
| 3001 | IPS_PENDING_INBOUND | Pending IPS collections |
| 3002 | IPS_PENDING_OUTBOUND | Pending IPS disbursements |
| 3003 | IPS_OPERATOR_FEE_PAYABLE | Switching fees owed to BON |

### 4.5 Income/Expense Accounts

| Code | Name | Purpose |
|------|------|---------|
| 5001 | INTEREST_INCOME | Interest earned |
| 5002 | FEE_INCOME | Late fees earned |
| 6001 | WRITE_OFF_EXPENSE | Bad debt write-offs |

---

## 5. Insertion Points Analysis

### 5.1 Priority Ranking

| Priority | Insertion Point | Value | Complexity |
|----------|----------------|-------|------------|
| **1** | Loan Sub-Ledger | ⭐⭐⭐⭐⭐ | Medium |
| **2** | IPS Transaction Posting | ⭐⭐⭐⭐ | Medium |
| **3** | Settlement Netting | ⭐⭐⭐ | High |
| **4** | Reconciliation | ⭐⭐ | Low |

### 5.2 Loan Sub-Ledger (RECOMMENDED START)

**Disbursement Posting:**
```
When: disbursement.status = 'completed'

Transfer 1: Recognize Loan Receivable
  DR: LOAN_PRINCIPAL_RECEIVABLE (loan_id)  NAD 10,000
  CR: DISBURSEMENT_CLEARING                NAD 10,000
  code: DISBURSEMENT
  user_data_128: disbursement_id
```

**Repayment Posting (Linked Transfers):**
```
When: payment.status = 'completed'
Allocation: fee → interest → principal

Transfer 1 (linked):
  DR: COLLECTIONS_CLEARING      NAD 50
  CR: LOAN_FEE_RECEIVABLE       NAD 50
  code: LATE_FEE_PAYMENT

Transfer 2 (linked):
  DR: COLLECTIONS_CLEARING      NAD 350
  CR: LOAN_INTEREST_RECEIVABLE  NAD 350
  code: INTEREST_PAYMENT

Transfer 3 (end of chain):
  DR: COLLECTIONS_CLEARING      NAD 800
  CR: LOAN_PRINCIPAL_RECEIVABLE NAD 800
  code: PRINCIPAL_PAYMENT
```

### 5.3 IPS Two-Phase Transfers

```
PHASE 1: INITIATE (flags: pending, timeout: 300)
  DR: BORROWER_LOAN_RECEIVABLE
  CR: IPS_PENDING_INBOUND
  → Reserves funds (pending balances)

PHASE 2a: SUCCESS (flags: post_pending_transfer)
  → Moves from pending to posted

PHASE 2b: FAILURE (flags: void_pending_transfer)
  → Releases reserved funds

PHASE 2c: TIMEOUT (automatic after 300s)
  → Auto-voids pending transfer
```

---

## 6. Service Layer Integration

### 6.1 New Files Required

```
src/services/
├── ledgerService.ts      # TigerBeetle client wrapper
├── ledgerTypes.ts        # Account/Transfer codes
└── ledgerOutbox.ts       # Outbox event processor

supabase/functions/
└── ledger-worker/        # Edge function for outbox
    └── index.ts

supabase/migrations/
└── 20251221_ledger_outbox.sql  # Outbox table
```

### 6.2 Outbox Schema

```sql
CREATE TABLE ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  tigerbeetle_ids JSONB,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_events_pending 
  ON ledger_events(status, created_at) 
  WHERE status = 'pending';
```

### 6.3 Modified Service Pattern

```typescript
// disbursementService.ts - Enhanced with ledger posting
export async function completeDisbursement(...) {
  // 1. Supabase transaction (existing + outbox event)
  const result = await supabase.rpc('complete_disbursement_with_outbox', {
    p_disbursement_id: disbursementId,
    p_payment_method: paymentMethod,
    p_payment_reference: paymentReference
  });
  
  // 2. Trigger outbox processor (or let worker pick up)
  await processOutboxEvents();
  
  return result;
}
```

---

## 7. Phased Rollout Plan

### Phase 0: Shadow Ledger (Weeks 1-2)

**Objective**: Validate integration without affecting production

- Deploy TigerBeetle cluster (single node dev)
- Implement ledgerService.ts
- Create outbox table and processor
- Post events to TigerBeetle in shadow mode
- Compare Postgres vs TigerBeetle balances
- Alert on variance > threshold

**Success Criteria**: Zero discrepancies for 2 weeks

### Phase 1: TigerBeetle Authoritative (Weeks 3-4)

**Objective**: Read balances from TigerBeetle

- Update `getLoanPaymentDetails` to read from TigerBeetle
- Update `getLoanPortfolioSummary` to use TigerBeetle
- Keep Postgres as fallback during transition
- A/B test balance accuracy

**Success Criteria**: UI reads from TigerBeetle successfully

### Phase 2: Settlement Integration (Weeks 5-6)

**Objective**: Power settlement netting with TigerBeetle

- Create settlement participant accounts
- Post obligations as transfers
- Read net positions from account balances
- Compare with existing settlement_net_instructions

**Success Criteria**: Settlement runs use TigerBeetle balances

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Mitigation |
|------|------------|
| TigerBeetle cluster failure | 3-node replication, automatic failover |
| Outbox processing lag | Monitor queue depth, scale workers |
| ID collision | Deterministic ID generation from source |
| Data sync issues | Reconciliation jobs, shadow mode first |

### 8.2 Operational Risks

| Risk | Mitigation |
|------|------------|
| Team learning curve | Phased rollout, shadow mode |
| Debugging complexity | Correlation IDs, unified logging |
| Rollback difficulty | Keep Postgres writes for Phase 0-1 |

### 8.3 Non-Risks (TigerBeetle Handles)

- Double-posting: Idempotent transfer IDs
- Negative balances: Balance limits enforcement
- Concurrent updates: Strict serializability
- Data loss: Replicated WAL, checksums

---

## 9. Implementation Status

### 9.1 Completed Components ✅

| Component | Status | Details |
|-----------|--------|--------|
| TigerBeetle Server | ✅ Running | `127.0.0.1:3001`, cluster=0, v0.16.67 |
| tigerbeetle-node | ✅ Installed | npm package in project |
| Supabase Tables | ✅ Created | 4 tables via migration |
| ledgerService.ts | ✅ Implemented | ~1000 lines, full integration |
| disbursementService.ts | ✅ Integrated | Posts to outbox on complete |
| paymentService.ts | ✅ Integrated | Posts to outbox on payment |

### 9.2 Database Tables Created

```sql
-- Migration: create_tigerbeetle_infrastructure
tigerbeetle_accounts      -- Maps entities to TB 128-bit IDs (13 cols)
tigerbeetle_outbox        -- Transactional outbox pattern (14 cols)
tigerbeetle_transfers     -- Shadow ledger for reconciliation (20 cols)
tigerbeetle_reconciliation -- Tracks recon runs (13 cols)
```

### 9.3 Service Layer Functions

**Account Management:**
- `createLoanAccounts(loanId, userId)` - Creates Principal/Interest/Fee accounts
- `getAccountMapping(entityType, entityId)` - Retrieves account mapping

**Outbox-Based Transfers (Browser-Safe):**
- `postDisbursement(disbursementId, loanId, amount, ref)` - Queue disbursement
- `postRepayment(paymentId, loanId, allocation, ref)` - Queue linked repayment
- `postLateFeeAccrual(loanId, scheduleId, amount)` - Queue late fee
- `postIPSInitiate/Complete/Void()` - Two-phase IPS transfers

**Direct TigerBeetle Operations (Server-Side):**
- `testTigerBeetleConnection()` - Verify connectivity
- `createTBAccountDirect(id, ledger, code)` - Create account
- `createTBTransferDirect(id, debit, credit, amount, ...)` - Create transfer
- `lookupTBAccount(accountId)` - Get balances

**Reconciliation:**
- `runReconciliation(loanId?)` - Compare Supabase vs TigerBeetle
- `getPendingOutboxEntries(limit)` - Get pending for processing
- `completeOutboxEntry(id, transferIds)` - Mark completed
- `failOutboxEntry(id, error)` - Mark failed with retry

### 9.4 Phase 1 Completed ✅

| Component | Status | Details |
|-----------|--------|---------|
| Outbox Worker Edge Function | ✅ Deployed | `tigerbeetle-outbox-worker` |
| Global Accounts (11) | ✅ Initialized | Clearing, Settlement, Income, Expense |
| Admin Dashboard Panel | ✅ Added | LedgerDashboard.tsx in TigerBeetle tab |
| Cron Jobs | ✅ Scheduled | Every 5 min (outbox), Daily 3 AM (recon) |
| Test Scripts | ✅ Created | init-tigerbeetle-accounts.ts, test-shadow-ledger.ts |

### 9.5 Phase 2 (In Progress)

1. **Make TigerBeetle Authoritative** - Balance reads from TigerBeetle
2. **Real-time Balance Display** - Live balances in loan views
3. **Settlement System Integration** - Connect to existing settlement tables
4. **Production Cluster Deployment** - Multi-node TigerBeetle cluster

---

## References

- [TigerBeetle Documentation](https://docs.tigerbeetle.com/)
- [TigerBeetle System Architecture](https://docs.tigerbeetle.com/coding/system-architecture/)
- [TigerBeetle GitHub](https://github.com/tigerbeetle/tigerbeetle)
- [Debit/Credit Schema](https://docs.tigerbeetle.com/concepts/debit-credit/)
- [Two-Phase Transfers](https://docs.tigerbeetle.com/coding/two-phase-transfers/)
- [Node.js Client](https://docs.tigerbeetle.com/clients/node/)

---

## Appendix A: Account ID Generation

```typescript
import { createHash } from 'crypto';

// Generate deterministic 128-bit account ID
function generateAccountId(loanId: string, code: number): bigint {
  const hash = createHash('sha256')
    .update(`${loanId}:${code}`)
    .digest();
  return BigInt('0x' + hash.slice(0, 16).toString('hex'));
}

// Global accounts (no loan context)
function generateGlobalAccountId(code: number): bigint {
  const hash = createHash('sha256')
    .update(`NAMLEND:GLOBAL:${code}`)
    .digest();
  return BigInt('0x' + hash.slice(0, 16).toString('hex'));
}
```

---

## Appendix B: Transfer Code Reference

```typescript
export const TRANSFER_CODE = {
  // Disbursement
  DISBURSEMENT: 101,
  BANK_TRANSFER_OUT: 102,
  
  // Payments
  PAYMENT_RECEIVED: 201,
  PRINCIPAL_PAYMENT: 202,
  INTEREST_PAYMENT: 203,
  LATE_FEE_PAYMENT: 204,
  
  // Accruals
  INTEREST_ACCRUAL: 301,
  LATE_FEE_ASSESSMENT: 302,
  
  // Adjustments
  REVERSAL: 401,
  WRITE_OFF: 501,
  
  // IPS
  IPS_INITIATE: 601,
  IPS_COMPLETE: 602,
  IPS_VOID: 603,
} as const;
```

---

*Document Version: 1.0.0*  
*Last Updated: December 21, 2025*
