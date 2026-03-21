# IPS (Instant Payment System) Implementation

**Last Updated**: 2026-03-04
**Aligned With**: Post-quality-sweep codebase
**Status**: Current ✅

---

## Current Implementation Status

> ⚠️ **Mock Mode**: The IPS adapter (`convex/actions/ipsAdapter.ts`) makes simulated responses. No real Bank of Namibia IPS switch connectivity is in place. See [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md) for what's needed before going live.

---

## Architecture

```
NamLend UI
  ↓ (useMutation)
api.ips.ipsTransactions.initiateIpsTransaction (Convex mutation)
  → Inserts ipsTransactions (status: "pending")
  → ctx.scheduler → internal.actions.ipsAdapter.processOutbound

ipsAdapter.processOutbound (Convex Action — mock)
  → Logs request to ipsApiLogs
  → Simulates pacs.008 submission
  → Simulates pacs.002 status response
  → ctx.runMutation → patches ipsTransactions.status

IPS Switch (Bank of Namibia) → POST /webhook/ips
  → convex/http.ts verifies HMAC-SHA256 (IPS_WEBHOOK_SECRET)
  → internal.actions.ipsAdapter.handleWebhook
  → Looks up ipsTransactions by msgId
  → Updates status, triggers downstream completion
```

---

## Convex Tables Used

| Table                       | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `ipsTransactions`           | Each IPS payment attempt. `msgId` is the idempotency key.    |
| `ipsApiLogs`                | Full request/response log for each API call (audit trail)    |
| `ipsAlerts`                 | Anomaly and failure alerts (severity: info/warning/critical) |
| `ipsOnboardingApplications` | IPP participant onboarding (7-step status FSM)               |
| `ipsDeviceBindings`         | Device binding records for IPP authentication                |
| `vpaRegistry`               | Virtual Payment Addresses registered to users                |

## Transaction Types

| `txType`          | Direction | Use Case                      |
| ----------------- | --------- | ----------------------------- |
| `credit_transfer` | outbound  | Loan disbursement to borrower |
| `credit_transfer` | inbound   | Repayment from borrower       |
| `request_to_pay`  | outbound  | Repayment request             |
| `reversal`        | either    | Transaction reversal          |

## Transaction Status FSM

```
pending → processing → completed
                    ↘ failed
                    ↘ reversed
                    ↘ timeout
```

---

## Webhook Security (Implemented)

Both `/webhook/ips` and `/webhook/payment` in `convex/http.ts` implement HMAC-SHA256 signature verification:

1. Raw body read as text (preserves byte-exact content for HMAC)
2. `X-IPS-Signature` or `X-Signature` header checked
3. `verifyHmacSha256(IPS_WEBHOOK_SECRET, rawBody, signature)` using Web Crypto API
4. Returns `401` if verification fails when secret is configured
5. Falls back to warn-only mode if `IPS_WEBHOOK_SECRET` is not set (development)

Activate: `npx convex env set IPS_WEBHOOK_SECRET <secret-from-bank-of-namibia>`

---

## Mock Adapter Behaviour (`convex/actions/ipsAdapter.ts`)

In the current mock implementation:

- All outbound IPS calls (`processOutbound`) log to `ipsApiLogs` and return a simulated success
- Transaction status is updated to `"completed"` after the simulated round-trip
- No actual HTTP calls are made to `ips.bon.na`
- Inbound webhook (`handleWebhook`, `handlePaymentWebhook`) parses the payload and updates the corresponding transaction record

---

## Production Requirements

To replace the mock with a live IPS connection:

1. **Credentials from Bank of Namibia**: IPS API URL, client ID, client secret
2. **mTLS certificates**: Client certificate and private key (signed by BON CA)
3. **Convex env vars**:
   ```bash
   npx convex env set IPS_API_URL=https://ips.bon.na/api/v1
   npx convex env set IPS_CLIENT_ID=<id>
   npx convex env set IPS_CLIENT_SECRET=<secret>
   npx convex env set IPS_CLIENT_CERT=<base64-cert>
   npx convex env set IPS_CLIENT_KEY=<base64-key>
   npx convex env set IPS_WEBHOOK_SECRET=<webhook-hmac-secret>
   ```
4. **Update `convex/actions/ipsAdapter.ts`**: Replace simulated responses with actual `fetch()` calls using mTLS client certificates
5. **Register VPAs** in the Central Mapper for NamLend's routing codes

---

## ISO 20022 Messages

| Message  | Standard  | Use                                                |
| -------- | --------- | -------------------------------------------------- |
| pacs.008 | ISO 20022 | Customer credit transfer (payment initiation)      |
| pacs.002 | ISO 20022 | Payment status report (acceptance/rejection)       |
| pacs.009 | ISO 20022 | Financial institution credit transfer (settlement) |

---

## See Also

- [API_REFERENCE.md](./API_REFERENCE.md#module-apiips-ipsipp-domain--mock-adapter) — IPS Convex API
- [FLOWS.md](./FLOWS.md#3-disbursement-flow) — IPS disbursement and payment flows
- [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md) — Production readiness items
- [IPS_TESTING.md](./IPS_TESTING.md) — Test coverage
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) — IPP onboarding integration
- [/docs/IPP/](./IPP/) — Bank of Namibia official IPS/IPP specifications
