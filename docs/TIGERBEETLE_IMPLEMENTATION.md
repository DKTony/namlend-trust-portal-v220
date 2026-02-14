# TigerBeetle Integration Guide

**Doc Revision**: 2026-01-19  \
**Status**: Outbox pattern implemented; Edge worker simulates TB posting.

---

## Current Architecture

```
Service Layer
  -> queue_tigerbeetle_event() RPC
  -> tigerbeetle_outbox
  -> tigerbeetle-outbox-worker (Edge Function)
  -> tigerbeetle_transfers (shadow ledger)
```

- Browser does not use a direct TB client.
- `ledgerService.ts` posts outbox entries for disbursements and repayments.
- `useTigerBeetleBalance` reads from `tigerbeetle_transfers` and falls back to `loan_balance_summary` view.

---

## Chart of Accounts (from `ledgerService.ts`)

Borrower receivables:

- 1001: LOAN_PRINCIPAL_RECEIVABLE
- 1002: LOAN_INTEREST_RECEIVABLE
- 1003: LOAN_FEE_RECEIVABLE
- 1004: LOAN_LATE_FEE_RECEIVABLE

Operational accounts:

- 2001: DISBURSEMENT_CLEARING
- 2002: COLLECTIONS_CLEARING
- 2003: BANK_SETTLEMENT
- 2004: SUSPENSE

IPS accounts:

- 3001: IPS_PENDING_INBOUND
- 3002: IPS_PENDING_OUTBOUND
- 3003: IPS_OPERATOR_FEE

Income/Expense:

- 5001: INTEREST_INCOME
- 5002: FEE_INCOME
- 5003: LATE_FEE_INCOME
- 6001: WRITE_OFF_EXPENSE

---

## Posting Flow

1. Service creates outbox event (`tigerbeetle_outbox`).
2. Edge worker marks entry as processing.
3. Worker simulates TB transfer and stores a shadow record in `tigerbeetle_transfers`.
4. UI reads balances from shadow ledger.

---

## Gaps

- Edge worker does not connect to a real TigerBeetle cluster.
- Node-only TB client is not used in serverless context.

