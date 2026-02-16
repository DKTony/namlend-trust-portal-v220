# ADR 001: TigerBeetle Runs in Shadow Mode

## Status

Accepted (December 2025)

## Context

NamLend Trust uses Supabase (PostgreSQL) as its primary database for all loan, payment, and financial records. TigerBeetle is a purpose-built double-entry bookkeeping ledger that provides strong consistency guarantees for financial operations.

Integrating a financial ledger is critical for:

- Double-entry bookkeeping accuracy
- Real-time balance verification
- Future audit and reconciliation requirements

However, adopting TigerBeetle as the primary ledger carries risks:

- The codebase currently relies on Supabase as the single source of truth
- TigerBeetle's TypeScript SDK requires careful integration with browser-compatible builds
- A hard cutover could introduce data inconsistencies during the transition period
- The team needs time to validate that TigerBeetle balances match Supabase records

## Decision

TigerBeetle runs in **shadow mode**: it records all financial operations (disbursements, payments, adjustments) via the outbox pattern, but does not control application flow. Supabase remains the authoritative source for loan balances and payment status.

The outbox pattern (`outboxService.ts`) queues TigerBeetle entries and processes them asynchronously via the `tigerbeetle-outbox-worker` edge function. This decouples the critical path (user-facing operations) from ledger synchronization.

Key behaviors in shadow mode:

- `ledgerService.ts` posts entries to TigerBeetle after Supabase commits succeed
- If TigerBeetle is unavailable, the operation still succeeds (entries are queued)
- `reconciliationService.ts` periodically compares Supabase and TigerBeetle balances
- Discrepancies are logged but do not block operations

## Consequences

**Positive:**

- Zero risk to production operations during the TigerBeetle integration phase
- Enables gradual validation of ledger accuracy against the existing database
- The outbox pattern naturally handles TigerBeetle downtime or network issues
- Reconciliation reports build confidence for eventual primary ledger promotion

**Negative:**

- TigerBeetle data may lag behind Supabase by seconds to minutes
- Two sources of financial data must be maintained and monitored
- Developers must remember that TigerBeetle is not authoritative yet
- The `TigerBeetleBalance` component shows informational data only

**Future:**

- Once reconciliation reports show consistent accuracy over 30+ days, TigerBeetle can be promoted to primary ledger
- At that point, Supabase becomes the read cache and TigerBeetle becomes the source of truth for balances
