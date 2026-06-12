# Outbox Money-Movement Map

> Every money movement maps to **exactly one** ledger-impacting `tigerBeetleOutbox`
> event, enqueued only on **confirmed completion**, with a deterministic
> idempotency key so replays/retries are no-ops. Amounts are always **cents**.
> Builder: `convex/lib/repaymentOutbox.ts`. Idempotent enqueue:
> `convex/lib/outbox.ts:enqueueOutboxIdempotent`.

| Money movement             | Initiating fn                                 | Completion fn (enqueue point)                       | Event type           | Idempotency key                                                         | Ledger effect                                     |
| -------------------------- | --------------------------------------------- | --------------------------------------------------- | -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| Manual / normal repayment  | `recordPayment` (no post)                     | `completePayment`                                   | `REPAYMENT`          | `repayment:payment:{paymentId}`                                         | principal/interest/fees transfers (cents)         |
| Gateway-webhook repayment  | external webhook                              | `applyPaymentWebhook` (status=completed)            | `REPAYMENT`          | `repayment:payment:{paymentId}` _(same key as manual → no double-post)_ | as above                                          |
| IPS repayment              | `initiateIpsRepayment`                        | `updateIpsTransactionStatusCore` (status=completed) | `IPS_COMPLETE`       | `ipsComplete:{ipsTransactionId}`                                        | settles inbound; **no** `REPAYMENT` emitted       |
| Mandate-debit repayment    | `executeMandateDebit`                         | _(deferred — auto-debit disabled)_                  | `REPAYMENT` (future) | `repayment:payment:{paymentId}`                                         | **none today** (disabled until lifecycle modeled) |
| Disbursement               | `initiateDisbursement`                        | `completeDisbursement`                              | `DISBURSEMENT`       | `disbursement:{disbursementId}`                                         | principal receivable (cents)                      |
| Disbursement reversal      | `reverseDisbursement`                         | same                                                | `IPS_REVERSE`        | `disbursement:reverse:{disbursementId}`                                 | reverses disbursement                             |
| IPS outbound initiation    | `initiateIpsDisbursement` / `insertIpsOutbox` | at initiation (pending rail op)                     | `IPS_INITIATE`       | `ips:initiate:{ipsTransactionId}`                                       | pending transfer (rail)                           |
| IPS completion             | IPS callback                                  | `updateIpsTransactionStatusCore` (completed)        | `IPS_COMPLETE`       | `ipsComplete:{ipsTransactionId}`                                        | posts pending                                     |
| IPS rejection/failure      | IPS callback                                  | `updateIpsTransactionStatusCore` (failed)           | `IPS_REVERSE`        | `ips:reverse:{ipsTransactionId}`                                        | voids pending                                     |
| Failed / abandoned payment | `failPayment`                                 | —                                                   | **none**             | —                                                                       | nothing posted (so nothing to reverse)            |

## Invariants enforced

1. **One event per movement.** A given `paymentId` yields at most one `REPAYMENT`
   row regardless of how many times `completePayment` / `applyPaymentWebhook` run
   (shared idempotency key). An IPS-linked repayment yields `IPS_COMPLETE` only —
   `completeLinkedPayment` updates the balance but enqueues no `REPAYMENT`.
2. **Post on completion, not initiation.** `recordPayment` and `executeMandateDebit`
   create pending operational state only; ledger rows are enqueued at the
   completion boundary.
3. **Cents + valid codes.** `buildRepaymentOutboxPayload` converts to cents and
   attaches transfer codes (2001 principal / 5001 interest / 5002 fees); it rejects
   floating/negative amounts and split mismatches.
4. **`IPS_INITIATE` is informational/pending**, not a final repayment post — it
   represents the rail operation; the final ledger effect is `IPS_COMPLETE`.

## Open items

- Mandate-debit repayment posting is **deferred**: when the execution-completion
  lifecycle is wired, enqueue `REPAYMENT` in `completeExecution` via the builder +
  `enqueueOutboxIdempotent`, keyed on the linked `paymentId`.
- Reconciliation invariant (Phase 8): an outbox row whose source payment/disbursement
  is not in a terminal-success state is an exception to flag.
- **IPS repayment ledger asymmetry (known gap, follow-on before a real cluster):**
  `IPS_COMPLETE` posts only rail-level accounts (`IPS_PENDING_* → COLLECTIONS_CLEARING`
  via post_pending of the `IPS_INITIATE` transfer). Unlike manual `REPAYMENT`, it does
  **not** relieve `LOAN_PRINCIPAL_RECEIVABLE` or book `INTEREST_INCOME`, and
  `completeLinkedPayment` defaults the entire amount to principal with no split.
  Manual vs IPS repayments therefore produce different ledger account effects.
  Acceptable while TigerBeetle is shadow-only; **must be resolved (account mapping
  decision + split capture on IPS repayments) before a real ledger goes live.**
