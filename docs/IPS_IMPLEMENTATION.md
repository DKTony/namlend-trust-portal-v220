# IPS (Instant Payment System) Implementation

**Last Updated**: 2026-04-05
**Aligned With**: IPS/IPP Phase 4A+4B (Sandbox Certification + Missing APIs) — v5.2.3
**Status**: Current ✅

---

## Current Implementation Status

> **Protocol Status**: The IPS adapter supports both **JSON mock mode** (development) and **async XML over HTTPS** (sandbox/production). Protocol mode is controlled by the `IPS_PROTOCOL_MODE` business rule (`json_mock` | `xml_sandbox` | `xml_production`).

> **Phase Completion**:
>
> - ✅ Phase 1: XML protocol foundation (ipsXmlBuilder, ipsSigningProvider, RSA-SHA256 signing)
> - ✅ Phase 2: Alias Directory integration (ipsAliasAdapter, ipsAliasDirectory, phone normalization)
> - ✅ Phase 3: IPS-mandated onboarding flow (10-step state machine, 6 onboarding APIs)
> - ✅ Phase 4A: Sandbox certification fixes (msgId format, namespace, limits, timeouts, mTLS, PIN encryption, NACK parsing, idempotency)
> - ✅ Phase 4B: Missing core APIs (reversal, collect/request-to-pay, auth detail, txn confirmation, ListPsp, ListKeys, deemed resolution)
> - ⬜ Phase 5A: Production features (eFRM, 3-way reconciliation, settlement transport, dispute framework, HSM)
> - ⬜ Phase 5B: Extended capabilities (merchant P2M, bulk G2P/B2P, USSD, ATM cash-out)

---

## Architecture

```
NamLend UI
  ↓ (useMutation — step-specific: completeDeviceBinding, selectSovProvider, etc.)
api.ips.ipsOnboarding.* (Convex mutations — state machine enforcement)
  → Validates transition, patches ipsOnboardingApplications
  → ctx.scheduler → internal.actions.ipsOnboardingAdapter.*

api.ips.ipsTransactions.initiateIpsTransaction (Convex mutation)
  → Inserts ipsTransactions (status: "pending")
  → ctx.scheduler → internal.actions.ipsAdapter.processOutbound

ipsAdapter.processOutbound (Convex Action — XML or mock)
  → Builds XML via ipsXmlBuilder → signs via ipsSigningProvider
  → POSTs to IPS /xml endpoint → parses ACK
  → Logs to ipsApiLogs (direction: OUTBOUND, contentType: xml)
  → ctx.runMutation → patches ipsTransactions.status

IPS Switch (Bank of Namibia) → POST /webhook/ips
  → convex/http.ts parses XML → verifies RSA-SHA256 signature
  → Routes by API name (RespPay, RespRegMapper, RespGetAdd, etc.)
  → Returns XML ACK response
  → ctx.runMutation → updates relevant records
```

---

## Convex Tables Used

| Table                       | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `ipsTransactions`           | Each IPS payment attempt. `msgId` is the idempotency key.                 |
| `ipsApiLogs`                | Full request/response log (direction, contentType, rawXml, correlationId) |
| `ipsAlerts`                 | Anomaly and failure alerts (severity: info/warning/critical)              |
| `ipsOnboardingApplications` | IPP onboarding (IPS-mandated 14-state FSM + legacy state compatibility)   |
| `ipsDeviceBindings`         | Device binding records for IPP authentication                             |
| `ipsAliasDirectory`         | IPN-synced alias registry (addr, entityType, cmId, syncedWithIps)         |
| `vpaRegistry`               | Legacy Virtual Payment Addresses (being replaced by ipsAliasDirectory)    |

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

The `/webhook/ips` endpoint in `convex/http.ts` supports both legacy JSON and XML protocol:

**XML Protocol (Phase 1+)**:

1. Raw body read as text
2. XML parsed to identify API name (from root element, e.g. `RespPay`, `RespRegMapper`)
3. RSA-SHA256 signature verification via `ipsSigningProvider.verify()`
4. Routed to appropriate internal action handler by API name
5. Returns XML ACK response

**Legacy JSON (backward compatible)**:

1. `X-IPS-Signature` or `X-Signature` header checked
2. `verifyHmacSha256(IPS_WEBHOOK_SECRET, rawBody, signature)` using Web Crypto API
3. Returns `401` if verification fails when secret is configured
4. Falls back to warn-only mode if `IPS_WEBHOOK_SECRET` is not set (development)

---

## Adapter Architecture

### Action Files

| File                                     | APIs                                                                                                               | Purpose                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `convex/actions/ipsAdapter.ts`           | ReqPay, ReqValAdd, ReqChkTxn, ReqHbt, ReqBalEnq, ReqRev, ReqAuthDetail, TxnConfirmation, Collect, DeemedResolution | Core payment + utility + Phase 4B APIs |
| `convex/actions/ipsAliasAdapter.ts`      | ReqRegMapper, ReqGetAdd, RespRegMapper, RespGetAdd, MapperConfirmation                                             | Alias Directory (IPN Central Mapper)   |
| `convex/actions/ipsOnboardingAdapter.ts` | ReqRegMob, ReqListAccPvd, ReqListAccount, ReqOtp, ReqSetCre, ReqListPsp, ReqListKeys                               | Onboarding flow APIs                   |

### Library Files

| File                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `convex/lib/ipsXmlBuilder.ts`        | XML request builders + response parsers for all IPS APIs (18 builders) |
| `convex/lib/ipsSigningProvider.ts`   | `IpsSigningProvider` interface + factory (software or HSM)             |
| `convex/lib/ipsSoftwareSigner.ts`    | RSA-SHA256 signing + RSA-OAEP PIN encryption (Node.js `crypto`)        |
| `convex/lib/ipsErrorCodes.ts`        | 100+ IPS error codes → retryable flag + user-friendly messages         |
| `convex/lib/ipsPhoneNormalize.ts`    | Namibian mobile normalization (+264/0 → 9-digit)                       |
| `convex/lib/ipsTransactionLimits.ts` | Daily transaction limit enforcement per IPP FSD §5.2                   |

### Protocol Mode

Controlled by business rule `IPS_PROTOCOL_MODE` (evaluated via `convex/lib/ruleEvaluator.ts`):

| Mode             | Behaviour                                        |
| ---------------- | ------------------------------------------------ |
| `json_mock`      | Simulated responses, no HTTP calls (development) |
| `xml_sandbox`    | Signed XML to IPS sandbox endpoint               |
| `xml_production` | Signed XML to production IPS switch              |

### XML Message Flow

```
Outbound: buildXml() → sign(RSA-SHA256) → POST /xml → parse ACK → log to ipsApiLogs
Inbound:  receive XML → verify signature → parse → route by API name → return XML ACK
```

---

## Onboarding Flow (IPS-Mandated)

The onboarding state machine follows the IPN Product Rules v0.5:

```
NOT_STARTED → DEVICE_BINDING_REQUIRED → DEVICE_BOUND
  → SOV_SELECTION_PENDING → SOV_SELECTED → ACCOUNTS_LISTED
  → VERIFICATION_PENDING → VERIFIED
  → IPS_PIN_SETTING → IPS_PIN_SET
  → ALIAS_REGISTRATION_PENDING → ALIAS_REGISTERED
  → READY_FOR_IPP_PAYMENTS
```

Each transition has a **dedicated mutation** in `convex/ips/ipsOnboarding.ts`:

| Mutation                | Transition                                    | IPS API        |
| ----------------------- | --------------------------------------------- | -------------- |
| `completeDeviceBinding` | DEVICE_BINDING_REQUIRED → DEVICE_BOUND        | ReqRegMob      |
| `selectSovProvider`     | DEVICE_BOUND → SOV_SELECTED                   | ReqListAccount |
| `selectAccount`         | SOV_SELECTED → ACCOUNTS_LISTED                | —              |
| `startVerification`     | ACCOUNTS_LISTED → VERIFICATION_PENDING        | ReqRegMob      |
| `submitOtp`             | VERIFICATION_PENDING → VERIFIED               | ReqOtp         |
| `setupIpsPin`           | VERIFIED → IPS_PIN_SET                        | ReqSetCre      |
| `createHandle`          | IPS_PIN_SET → ALIAS_REGISTRATION_PENDING      | —              |
| `registerAlias`         | ALIAS_REGISTRATION_PENDING → ALIAS_REGISTERED | ReqRegMapper   |
| `confirmOnboarding`     | ALIAS_REGISTERED → READY_FOR_IPP_PAYMENTS     | —              |

### Frontend Integration

`src/hooks/useIPPOnboarding.ts` drives the onboarding UI:

- Reactive via `useQuery(api.ips.ipsOnboarding.getMyOnboarding)`
- Calls step-specific mutations directly (not the legacy `advanceOnboardingStep`)
- Maps legacy `step_1_identity`..`step_7_approved` states for existing records
- Surfaces ConvexError messages from backend to toast notifications

---

## Phase 4 Implementation (2026-04-05)

### Phase 4A — Sandbox Certification Fixes

| Fix                    | Spec Reference | Description                                                                                          |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| **msgId format**       | IPS TSD §2.3   | 35-char: 3-digit bank code (`IPS_BANK_CODE`) + 32 hex UUID. `generateMsgId()` in `ipsXmlBuilder.ts`  |
| **XML namespace**      | IPS TSD §2.1   | Configurable via `IPS_XML_NAMESPACE` env var, defaults to `http://npci.org/upi/schema/`              |
| **Transaction limits** | IPP FSD §5.2   | P2P N$10k/10txn, P2M N$10k/100txn, ATM N$2k/2txn, G2P N$25k/50txn per day. `ipsTransactionLimits.ts` |
| **Timeouts**           | IPS TSD §2.5   | 10s non-financial, 30s financial. AbortController on all `sendIpsXml()` calls                        |
| **PIN encryption**     | IPS TSD §3.3   | RSA-OAEP + SHA-256 via `encryptPin()` when `IPS_HSM_PUBLIC_KEY` is configured                        |
| **mTLS**               | IPS TSD §3.1   | Client cert via `IPS_CLIENT_CERT`/`IPS_CLIENT_KEY`/`IPS_CA_CERT` env vars                            |
| **Idempotent retry**   | IPS TSD §2.3   | Duplicate msgId returns existing transaction (no duplicate insert)                                   |
| **NACK parsing**       | IPS TSD §2.4   | Structured error extraction from `Err` elements in NACK responses                                    |

### Phase 4B — Missing Core APIs

| API                   | Spec Reference | Action                     | Purpose                                                        |
| --------------------- | -------------- | -------------------------- | -------------------------------------------------------------- |
| **ReqRev/RespRev**    | IPP FSD §4.14  | `initiateReversal`         | Full/partial transaction reversal                              |
| **ReqPay (COLLECT)**  | IPP FSD §4.3   | `initiateCollectRequest`   | Creditor-initiated payment request (loan repayment collection) |
| **ReqAuthDetail**     | IPP FSD §4.5   | `queryAuthDetail`          | Transaction authentication status query                        |
| **TxnConfirmation**   | IPP FSD §4.16  | `sendTxnConfirmation`      | Payee confirmation after crediting beneficiary                 |
| **ReqListPsp**        | IPP FSD §4.9   | `reqListPsp`               | List participating PSPs                                        |
| **ReqListKeys**       | IPP FSD §4.10  | `reqListKeys`              | List alias key types                                           |
| **Deemed resolution** | IPS TSD §2.6   | `resolveDeemedTransaction` | Exponential backoff ChkTxn for timed-out transactions          |

---

## Production Requirements

To enable XML protocol mode:

1. **Certificates from Bank of Namibia**: RSA signing key + BoN public certificate
2. **Convex env vars**:
   ```bash
   npx convex env set IPS_BASE_URL https://ips.bon.na/api/v2
   npx convex env set IPS_ORG_ID NAMLEND
   npx convex env set IPS_SIGNING_PRIVATE_KEY <PEM-encoded RSA key>
   npx convex env set IPS_BON_PUBLIC_CERT <PEM-encoded BoN cert>
   npx convex env set IPS_KEY_ID <key-identifier>
   npx convex env set IPS_SIGNING_MODE software  # or "hsm" in Phase 5A
   npx convex env set IPS_BANK_CODE 099  # 3-digit participant code from BoN
   npx convex env set IPS_HSM_PUBLIC_KEY <PEM-encoded BoN HSM public key>
   npx convex env set IPS_CLIENT_CERT <PEM-encoded client certificate for mTLS>
   npx convex env set IPS_CLIENT_KEY <PEM-encoded client private key for mTLS>
   npx convex env set IPS_CA_CERT <PEM-encoded CA certificate for mTLS>
   ```
3. **Toggle protocol mode**: Set `IPS_PROTOCOL_MODE` business rule to `xml_sandbox` or `xml_production`
4. **Register aliases** in IPN Central Mapper for NamLend's routing codes

---

## ISO 20022 Messages

| Message  | Standard  | Use                                                |
| -------- | --------- | -------------------------------------------------- |
| pacs.008 | ISO 20022 | Customer credit transfer (payment initiation)      |
| pacs.002 | ISO 20022 | Payment status report (acceptance/rejection)       |
| pacs.009 | ISO 20022 | Financial institution credit transfer (settlement) |

---

## Known Issues

### IPS Disbursement Type Bug (Fixed 2026-04-04)

The `InitiateIPSDisbursementParams` interface in `src/types/ips.ts` was missing required fields (`amount`, `loanId`, `creditorVpa`). The `IPSDisbursementForm` component passed `disbursementId` and `payeeVpa` but not the other fields needed by the `initiateIpsTransaction` mutation, causing an `ArgumentValidationError: Object is missing the required field 'amount'`.

**Fix applied to:**

- `src/types/ips.ts` — Added `loanId`, `amount`, `creditorVpa` to `InitiateIPSDisbursementParams`
- `src/components/ips/IPSDisbursementForm.tsx` — Passes all required fields to `disbursementMutation.mutateAsync()`

**Status:** Fixed locally, pending Netlify deployment.

---

## See Also

- [API_REFERENCE.md](./API_REFERENCE.md#module-apiips-ipsipp-domain--mock-adapter) — IPS Convex API
- [FLOWS.md](./FLOWS.md#3-disbursement-flow) — IPS disbursement and payment flows
- [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md) — Production readiness items
- [IPS_TESTING.md](./IPS_TESTING.md) — Test coverage
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md) — IPP onboarding integration
- [/docs/IPP/](./IPP/) — Bank of Namibia official IPS/IPP specifications
