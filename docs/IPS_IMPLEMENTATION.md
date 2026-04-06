# IPS Implementation

**Doc Revision**: 2026-04-06
**Authoritative Runtime**: Convex
**Status**: Active

---

## Summary

NamLend's live IPP/IPS path is now the Convex implementation. The current runtime contract is defined by:

- `src/constants/ippSupportMatrix.ts` for supported flows
- `docs/IPP_INTEGRATION.md` for live-vs-legacy boundary and behavioral rules
- `docs/IPP/IPS_TSD_v0.7.md` plus `docs/IPP/XSD's/` for wire-format truth
- `docs/IPP/IPP_FSD_v10.0.md` for workflow and business-rule truth

Supabase IPP surfaces remain in-repo only as legacy reference material.

---

## Live Architecture

```text
React hooks/components
  -> api.ips.* queries, mutations, actions
  -> Convex tables (ipsTransactions, ipsApiLogs, ipsAliasDirectory, ipsOnboardingApplications)
  -> XML request builders/parsers
  -> outbound IPS HTTP actions
  -> /webhook/ips callback handling in convex/http.ts
```

Primary runtime surfaces:

- `convex/ips/ipsTransactions.ts`
- `convex/ips/ipsVpa.ts`
- `convex/ips/ipsOnboarding.ts`
- `convex/actions/ipsAdapter.ts`
- `convex/actions/ipsAliasAdapter.ts`
- `convex/actions/ipsOnboardingAdapter.ts`
- `convex/lib/ipsXmlBuilder.ts`
- `convex/lib/ipsResponseParsers.ts`
- `convex/lib/ipsCallbackCorrelation.ts`

Legacy compatibility only:

- `supabase/functions/ips-adapter`
- SQL/RPC-era IPP notes under `supabase/migrations`
- `vpaRegistry` as a fallback bridge while older saved records remain

---

## Supported Flows

The live Convex path currently supports the shipped flow set:

| Flow                               | Status | Notes                                                        |
| ---------------------------------- | ------ | ------------------------------------------------------------ |
| `ReqPay / RespPay`                 | live   | Repayment and disbursement initiation                        |
| `ReqValAdd / RespValAdd`           | live   | Alias/VPA validation                                         |
| `ReqChkTxn / RespChkTxn`           | live   | Deemed and deferred status reconciliation                    |
| `ReqRegMob`                        | live   | Device binding and verification kickoff                      |
| `ReqListAccPvd / RespListAccPvd`   | live   | SoV provider discovery                                       |
| `ReqListAccount / RespListAccount` | live   | Linked account discovery                                     |
| `ReqOtp`                           | live   | OTP verification                                             |
| `ReqSetCre`                        | live   | IPS PIN setup/change plumbing                                |
| `ReqGetAdd / RespGetAdd`           | live   | Alias lookup with `resolved` / `pending` / `failed` outcomes |
| `ReqRegMapper / RespRegMapper`     | live   | Alias registration lifecycle                                 |

Not part of the current shipped flow set:

- merchant/P2M-first product surfaces
- bulk G2P/B2P operator tooling
- mobile app migration work outside this repo

---

## Current Behavioral Contract

### Alias and VPA validation

- Validation is authenticated. Anonymous address probing is rejected.
- Local alias resolution succeeds immediately only when the alias is both:
  - `ACTIVE`
  - `syncedWithIps === true`
- Non-usable aliases return non-terminal or invalid outcomes instead of false success.
- Frontend validation is tri-state:
  - `pending`
  - `validated`
  - `invalid`

### Onboarding

The onboarding state machine is enforced in `convex/ips/ipsOnboarding.ts`.

Key rule:

- no path may move an application to `READY_FOR_IPP_PAYMENTS` unless the alias is confirmed by IPS
- this applies to both end-user completion and staff approval paths

### Transaction status and callbacks

- `ReqChkTxn` requests persist correlation back to the original payment/disbursement
- `RespChkTxn` updates the original transaction, not just the check request
- ACK-only acceptance is not treated as a terminal business success

### Limit handling

- loan disbursements are classified into the B2P bucket
- repayments and disbursements do not share the same daily-use-case limit bucket

---

## Protocol Modes

`IPS_PROTOCOL_MODE` controls transport behavior:

| Mode             | Purpose                          |
| ---------------- | -------------------------------- |
| `json_mock`      | Development and local simulation |
| `xml_sandbox`    | BON sandbox / certification path |
| `xml_production` | Production transport path        |

The live application contract is still Convex in all three modes. The mode changes transport behavior, not the product-facing integration boundary.

---

## Verified Today

Current verification covers:

- XML builder coverage
- response parser coverage
- callback correlation coverage
- use-case limit classification coverage
- support-matrix drift coverage
- Playwright end-to-end lifecycle coverage:
  - application
  - approval
  - IPS disbursement
  - IPS repayment
  - admin verification

See [IPS_TESTING.md](./IPS_TESTING.md) for the exact commands and test files.

---

## Known Partials

- BON-managed production dependencies are still external:
  - participant credentials
  - certificates
  - mTLS
  - HSM/public-key material
- Full frontend surfacing for every supported IPS callback remains selective; the backend handles more detail than every UI currently exposes.
- Legacy fallback records in `vpaRegistry` still exist and are intentionally not being expanded.

---

## Related Documents

- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md)
- [IPS_TESTING.md](./IPS_TESTING.md)
- [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md)
- [IPP/IPP_GAP_ASSESSMENT.md](./IPP/IPP_GAP_ASSESSMENT.md)
