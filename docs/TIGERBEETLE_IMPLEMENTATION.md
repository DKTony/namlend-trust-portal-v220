# TigerBeetle Integration — Implementation Reference

**Last Updated**: 2026-03-04
**Aligned With**: Post-quality-sweep codebase
**Status**: Current ✅

---

## Current Status: Shadow Mode (Simulation)

> ⚠️ TigerBeetle is running in **shadow mode**. The outbox pattern is fully implemented end-to-end in Convex, but the cron worker _simulates_ posting rather than connecting to a live cluster. Convex is the authoritative source for all balances.

To enable live posting: `npx convex env set TIGERBEETLE_ADDRESS=your-tb-host:3001`

See [ADR 001](./adr/001-tigerbeetle-shadow-mode.md) for the architectural decision record.

---

## Architecture: Outbox Pattern

```
Financial Mutation (e.g. initiateDisbursement)
  1. Inserts disbursements (primary record)         ─┐
  2. Inserts tigerBeetleOutbox (status: "pending")  ─┘  ← SAME ATOMIC MUTATION

tb-outbox-worker cron (every 30 seconds):
  3. claimPendingEntries → patches outbox status to "processing"
  4. Simulates POST to TigerBeetle (or live call if TIGERBEETLE_ADDRESS set)
  5a. On success → completeEntry (status: "completed") + inserts tigerBeetleTransfers
  5b. On failure → failEntry, increments retryCount (max 10 → "dead_letter")
```

**Key guarantee**: The `tigerBeetleOutbox` entry is written in the **same atomic mutation** as the business record. If the mutation fails, neither record is written. A payment can never exist without a corresponding outbox entry.

---

## Convex Tables

| Table                       | Purpose                                          | Indexes                                       |
| --------------------------- | ------------------------------------------------ | --------------------------------------------- |
| `tigerBeetleOutbox`         | Pending TB operations; claimed by cron worker    | `by_status`, `by_sourceId`                    |
| `tigerBeetleAccounts`       | Maps NamLend entities to TB account IDs          | `by_entityId` (compound: entityType+entityId) |
| `tigerBeetleTransfers`      | Immutable shadow transfer log (7-year retention) | `by_outboxId`                                 |
| `tigerBeetleReconciliation` | Balance comparison runs (Convex vs TB)           | —                                             |

## Outbox Event Types

| `eventType`      | Trigger                 | TB Operation                              |
| ---------------- | ----------------------- | ----------------------------------------- |
| `CREATE_ACCOUNT` | New loan                | Create loan principal + interest accounts |
| `DISBURSEMENT`   | Disbursement completed  | Debit NamLend cash → Credit borrower      |
| `REPAYMENT`      | Payment completed       | Debit borrower → Credit NamLend income    |
| `LATE_FEE`       | Late fee assessed       | Debit borrower → Credit fee income        |
| `IPS_INITIATE`   | IPS transaction started | Pending IPS debit                         |
| `IPS_COMPLETE`   | IPS transaction settled | Final settlement entry                    |
| `IPS_REVERSE`    | IPS reversal            | Reversal entry                            |

---

## Cron Worker

**File**: `convex/scheduled/tigerBeetleOutboxWorker.ts`
**Schedule**: Every 30 seconds (`convex/crons.ts`)
**Handler**: `internal.scheduled.tigerBeetleOutboxWorker.processOutbox`

### Simulation Mode (current — no `TIGERBEETLE_ADDRESS`)

1. Claims pending outbox entries (status → `"processing"`)
2. Generates simulated TB transfer IDs (no HTTP call)
3. Marks entry `"completed"`, stores simulated IDs in `tbTransferIds`
4. Inserts `tigerBeetleTransfers` record as shadow log

### Live Mode (when `TIGERBEETLE_ADDRESS` is configured)

1. Claims pending entries
2. Constructs TB transfer objects from outbox payload
3. Calls TigerBeetle Node.js client: `client.createTransfers([...])`
4. TB returns committed transfer IDs
5. Marks outbox completed with real TB IDs

Retry behaviour: up to 10 attempts with exponential backoff. After 10 failures: `status = "dead_letter"`. Dead-letter entries require manual investigation via Convex dashboard.

---

## Account Structure

Each loan gets three double-entry accounts in TigerBeetle:

| Account (`entityType`) | Represents                            |
| ---------------------- | ------------------------------------- |
| `LOAN_PRINCIPAL`       | Outstanding principal balance (asset) |
| `LOAN_INTEREST`        | Accrued interest receivable (income)  |
| `LOAN_FEE`             | Late fees and charges (income)        |

TB account IDs are 128-bit UInt128 values, stored as two 64-bit numbers (`tbAccountIdHigh`, `tbAccountIdLow`) in the `tigerBeetleAccounts` Convex table.

---

## Enabling Live TigerBeetle

```bash
# 1. Deploy TigerBeetle cluster (single-node example)
tigerbeetle format --cluster=0 --replica=0 /data/0.tigerbeetle
tigerbeetle start --addresses=0.0.0.0:3001 /data/0.tigerbeetle

# 2. Set Convex env vars
npx convex env set TIGERBEETLE_ADDRESS=localhost:3001
npx convex env set TIGERBEETLE_CLUSTER_ID=0

# 3. Deploy
npx convex deploy
```

The worker begins posting real transfers on the next 30-second tick. Run the reconciliation check to validate balances match.

---

## See Also

- [ADR 001](./adr/001-tigerbeetle-shadow-mode.md) — Shadow mode architectural decision
- [FLOWS.md](./FLOWS.md#9-tigerbeetle-outbox-flow) — Outbox flow diagram
- [TIGERBEETLE_PRODUCTION.md](./TIGERBEETLE_PRODUCTION.md) — Production readiness checklist
- [TIGERBEETLE_MCP_SETUP.md](./TIGERBEETLE_MCP_SETUP.md) — Development tooling setup
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md#2-tigerbeetle-posting-is-simulated) — Open debt item
