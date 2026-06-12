# TigerBeetle Shadow Reconciliation — What Is (and Isn't) Proven

TigerBeetle currently runs in **shadow / simulation mode**. The outbox worker
(`convex/scheduled/tigerBeetleOutboxWorker.ts`) posts to a TigerBeetle HTTP API
only when `TIGERBEETLE_HTTP_URL` is set; otherwise it records a deterministic
**shadow transfer** and returns `{ simulated: true }`. **Convex is the
authoritative balance.**

## Distinct states — do not conflate them

| Layer                          | Meaning                                                                       | Source                                    |
| ------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------- |
| Operational payment state      | `pending` / `completed` / `failed` on `paymentTransactions` / `disbursements` | Convex (authoritative)                    |
| Outbox processing state        | `pending` / `completed` / `dead_letter` ledger enqueue                        | `tigerBeetleOutbox`                       |
| Shadow ledger transfer state   | recorded double-entry transfer in the shadow ledger                           | `tigerBeetleTransfers` (sim or HTTP echo) |
| External rail settlement state | funds actually moved at bank / IPS / gateway                                  | **not modeled** in shadow mode            |

## What reconciliation proves today

✅ **Convex ↔ outbox ↔ shadow-transfer consistency:** every completed money
movement enqueued exactly one idempotent outbox row, and each processed row has a
matching shadow transfer for the right amount (cents) and code.

## What it does NOT prove

❌ **Real-world settlement.** A "completed" shadow transfer does **not** mean funds
have settled at the bank or payment rail. External settlement truth requires a live
TigerBeetle cluster plus rail-level confirmation (IPS settlement reports, bank
statement reconciliation) — see `docs/TIGERBEETLE_PRODUCTION.md`.

## UI / labeling rule

No dashboard may present shadow figures as settlement truth. The Ledger Dashboard
header carries an explicit "shadow ledger / not real-world settlement" disclaimer.
When a real cluster + rail reconciliation are in place, update this document and the
disclaimer accordingly.

## Reconciliation invariant (follow-on)

An outbox row whose source payment/disbursement is **not** in a terminal-success
state is an exception to flag — a money-movement ledger entry should never exist
for an operation that did not confirm completion.
