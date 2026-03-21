# IPS Testing Guide

**Last Updated**: 2026-03-04
**Aligned With**: Post-quality-sweep codebase
**Status**: Current

---

## Current Test Coverage

IPS integration tests are limited — the adapter runs in mock mode with no live BON credentials.

| Area                                       | Type                         | Status                         |
| ------------------------------------------ | ---------------------------- | ------------------------------ |
| Webhook HMAC-SHA256 signature verification | Integration (convex/http.ts) | Implemented; manually verified |
| `ipsTransactions` schema and FSM           | Schema validation via `tsc`  | Passing                        |
| IPS onboarding step FSM (8 states)         | Schema validation via `tsc`  | Passing                        |
| Webhook 401 on invalid signature           | Manual curl test             | Verified                       |
| Webhook warn-only when no secret set       | Manual curl test             | Verified                       |

---

## Running Tests

```bash
# All unit tests (includes schema type-checking)
npm run test:unit

# All E2E tests
npm run test:e2e
```

---

## Mock Adapter Behaviour

The mock adapter in `convex/actions/ipsAdapter.ts` simulates outcomes:

| Scenario                | Behaviour                                |
| ----------------------- | ---------------------------------------- |
| Any outbound transfer   | Simulated success, status -> `completed` |
| Missing `msgId`         | Logged error, status -> `failed`         |
| Inbound webhook payload | Parsed, ipsTransactions updated by msgId |

---

## What Needs Testing Before Production

When live BON credentials are available:

1. **Happy path**: Outbound pacs.008 -> pacs.002 ACSC confirmation
2. **Rejection**: pacs.002 RJCT received -> transaction marked `failed`
3. **Timeout**: No pacs.002 within SLA -> transaction marked `timeout`
4. **Idempotency**: Same `msgId` submitted twice -> second request rejected
5. **Reversal**: Completed transaction reversed -> `reversed` status propagated
6. **Inbound repayment**: Credit from borrower bank -> payment completed in NamLend

```bash
npx convex env set IPS_API_URL=https://sandbox.ips.bon.na/api/v1
npx convex env set IPS_WEBHOOK_SECRET=<sandbox-hmac-secret>
```

---

## See Also

- [IPS_IMPLEMENTATION.md](./IPS_IMPLEMENTATION.md) - Architecture and mock adapter details
- [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md) - Production readiness
- [API_REFERENCE.md](./API_REFERENCE.md) - Webhook endpoint spec
- [FLOWS.md](./FLOWS.md) - IPS webhook flow
