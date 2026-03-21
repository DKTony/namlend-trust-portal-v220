# ADR 001: TigerBeetle Runs in Shadow Mode

## Status

Accepted (December 2025) — Shadow mode approach unchanged post-Convex migration (February 2026)

> **Note (2026-02-15)**: The backend migrated from Supabase to Convex. TigerBeetle continues to run in shadow mode. The outbox pattern is implemented in Convex (`tigerBeetleOutbox` table + `tb-outbox-worker` cron). The Convex DB is now the source of truth, not Supabase. The shadow mode decision and rationale below remain valid; only the primary database reference has changed.

## Context

NamLend Trust uses Convex as its primary database for all loan, payment, and financial records (migrated from Supabase in February 2026). TigerBeetle is a purpose-built double-entry bookkeeping ledger that provides strong consistency guarantees for financial operations.

Integrating a financial ledger is critical for:

- Double-entry bookkeeping accuracy
- Real-time balance verification
- Future audit and reconciliation requirements

However, adopting TigerBeetle as the primary ledger carries risks:

- The codebase relies on Convex as the single source of truth
- TigerBeetle's TypeScript SDK requires careful integration with the Convex Action runtime
- A hard cutover could introduce data inconsistencies during the transition period
- The team needs time to validate that TigerBeetle balances match Convex records

## Decision

TigerBeetle runs in **shadow mode**: it records all financial operations (disbursements, payments, adjustments) via the outbox pattern, but does not control application flow. Convex remains the authoritative source for loan balances and payment status.

The outbox pattern (`tigerBeetleOutbox` table in `convex/schema.ts`) queues TigerBeetle entries and processes them asynchronously via the `tb-outbox-worker` cron job (every 30 seconds). This decouples the critical path (user-facing operations) from ledger synchronization.

Key behaviors in shadow mode:

- Financial mutations (`initiateDisbursement`, `recordPayment`) insert a `tigerBeetleOutbox` entry atomically with the business record
- The `tb-outbox-worker` action claims pending entries and posts to TigerBeetle (currently simulated — `TIGERBEETLE_ADDRESS` not configured)
- If TigerBeetle is unavailable, the operation still succeeds (entries remain queued with retry)
- `tigerBeetleReconciliation` table periodically records balance comparisons
- Discrepancies are logged but do not block operations

## Consequences

**Positive:**

- Zero risk to production operations during the TigerBeetle integration phase
- Enables gradual validation of ledger accuracy against the existing database
- The outbox pattern naturally handles TigerBeetle downtime or network issues
- Reconciliation reports build confidence for eventual primary ledger promotion

**Negative:**

- TigerBeetle data may lag behind Convex by seconds to minutes
- Two sources of financial data must be maintained and monitored
- Developers must remember that TigerBeetle is not authoritative yet
- The `TigerBeetleBalance` component shows informational data only

**Future:**

- Once reconciliation reports show consistent accuracy over 30+ days, TigerBeetle can be promoted to primary ledger
- At that point, Convex becomes the read cache and TigerBeetle becomes the source of truth for balances
