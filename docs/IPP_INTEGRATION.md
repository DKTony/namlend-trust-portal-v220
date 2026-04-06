# Instant Payment Platform Integration Guide

**Doc Revision**: 2026-04-06
**Authoritative Implementation**: Convex
**Canonical Specs**:

- Workflow and business rules: `docs/IPP/IPP_FSD_v10.0.md`
- Wire contract and XML examples: `docs/IPP/IPS_TSD_v0.7.md`
- XML schemas: `docs/IPP/XSD's/`

## Scope

This repository now treats the Convex implementation as the live IPP/IPS path.

The supported-flow registry for this boundary lives in `src/constants/ippSupportMatrix.ts`. Docs and tests should match that file.

- Live path:
  - `convex/actions/ipsAdapter.ts`
  - `convex/actions/ipsAliasAdapter.ts`
  - `convex/actions/ipsOnboardingAdapter.ts`
  - `convex/ips/ipsTransactions.ts`
  - `convex/ips/ipsAliasDirectory.ts`
  - `convex/ips/ipsOnboarding.ts`
  - `convex/ips/ipsVpa.ts`
  - `convex/lib/ipsXmlBuilder.ts`
- Legacy compatibility only:
  - `supabase/functions/ips-adapter`
  - SQL/RPC-era IPP integration notes under `supabase/migrations`
  - `vpaRegistry` table in Convex, surfaced only as a fallback bridge in `convex/ips/ipsVpa.ts`

Do not treat the Supabase edge-function path as the current source of truth for payment, alias, or onboarding behavior.

## Supported Flows

The Convex path supports the flows this repo currently exposes in product/UI code:

- `ReqPay` / `RespPay`
  - loan repayment initiation
  - disbursement initiation
  - collect/request-to-pay initiation
- `ReqValAdd` / `RespValAdd`
  - payee alias validation before payment
- `ReqChkTxn` / `RespChkTxn`
  - deferred/deemed transaction status resolution
- `ReqRegMob`
  - device/mobile registration
  - account verification kickoff
- `ReqListAccPvd` / `RespListAccPvd`
  - SoV provider discovery for onboarding
- `ReqListAccount` / `RespListAccount`
  - account discovery after provider selection
- `ReqOtp`
  - OTP submission for onboarding verification
- `ReqSetCre`
  - IPS PIN setup/change/reset plumbing
- `ReqGetAdd` / `RespGetAdd`
  - alias directory lookup support with terminal `resolved` / `pending` / `failed` outcomes
- `ReqRegMapper` / `RespRegMapper`
  - alias registration/block/delete lifecycle

## Final Review Outcome

Reviewed against:

- `docs/IPP/IPS_TSD_v0.7.md`
- `docs/IPP/XSD's/`
- `docs/IPP/IPP_FSD_v10.0.md`
- the live Convex implementation and current test suite

Current assessment:

- resolved:
  - XML builders/parsers for the shipped flow set
  - `RespChkTxn` correlation back to the original transaction
  - authenticated VPA validation and alias privacy behavior
  - alias usability gating (`ACTIVE` plus `syncedWithIps`)
  - onboarding readiness gating, including staff approval paths
  - disbursement B2P limit classification
- known partial:
  - BON sandbox/production transport validation still depends on external credentials, certificates, and mTLS/HSM setup
  - some supported IPS callback detail is handled in backend logs and types before it is surfaced in every UI screen
- out of scope by design:
  - Supabase IPP runtime resurrection
  - merchant/bulk flows outside the shipped product path
  - expansion of `vpaRegistry` beyond compatibility support

## Current Behavioral Contract

### Onboarding

The onboarding state machine in `convex/ips/ipsOnboarding.ts` is the product contract:

- `NOT_STARTED`
- `DEVICE_BINDING_REQUIRED`
- `DEVICE_BOUND`
- `SOV_SELECTION_PENDING`
- `SOV_SELECTED`
- `ACCOUNTS_LISTED`
- `VERIFICATION_PENDING`
- `VERIFIED`
- `IPS_PIN_SETTING`
- `IPS_PIN_SET`
- `ALIAS_REGISTRATION_PENDING`
- `ALIAS_REGISTERED`
- `READY_FOR_IPP_PAYMENTS`

Important enforcement:

- onboarding is not finalized from `ALIAS_REGISTRATION_PENDING`
- finalization requires a confirmed alias record with:
  - `status === 'ACTIVE'`
  - `syncedWithIps === true`
- the same alias-confirmation rule applies to the staff approval path

### VPA / Alias Data

Frontend VPA reads and validation use the Convex bridge in `convex/ips/ipsVpa.ts`.

- Primary source: `ipsAliasDirectory`
- Fallback source: legacy `vpaRegistry`
- Validation behavior:
  - validation requires an authenticated Convex session
  - local alias hits return immediately only when the alias is `ACTIVE` and `syncedWithIps`
  - external validation waits for `RespValAdd` details when possible
  - ACK-only acceptance is not treated as a final successful validation
  - arbitrary probes do not return masked account-link metadata

### Payment Initiation

Frontend payment hooks map user-facing flows onto the backend transaction model in `convex/ips/ipsTransactions.ts`.

- repayment:
  - debtor/payer VPA = user-selected alias
  - creditor/payee VPA = `collections@namlend` unless overridden by env
- disbursement:
  - debtor/payer VPA = `disbursements@namlend` unless overridden by env
  - creditor/payee VPA = customer alias

## XML Contract Notes

`convex/lib/ipsXmlBuilder.ts` now emits API-shaped request documents instead of a generic envelope. Supported builders cover:

- `ReqPay`
- `ReqValAdd`
- `ReqChkTxn`
- `ReqHbt`
- `ReqBalEnq`
- `ReqRev`
- `ReqAuthDetail`
- `TxnConfirmation`
- `ReqRegMob`
- `ReqOtp`
- `ReqSetCre`
- `ReqListAccPvd`
- `ReqListAccount`
- `ReqGetAdd`
- `ReqRegMapper`
- `ReqListPsp`
- `ReqListKeys`

Shared head behavior:

- `prodType` is always included
- `orgId` no longer defaults to placeholder values like `NAMLEND`
- `msgId` is the correlation key for outbound calls
- webhook processing uses `reqMsgId` to correlate async responses back to the original request

## Known Exclusions

These areas are intentionally not represented as fully complete:

- Supabase edge-function IPS integration is not maintained as the live path
- `vpaRegistry` is legacy and should not be expanded for new IPP features
- merchant/P2M-specific directory enrichments are only partially surfaced in UI types today
- full callback-driven enrichment for every IPS API is not yet wired into first-class frontend flows

## Verification Snapshot

Latest verification set:

- `npx tsc --noEmit`
- `npx vitest run src/tests/ipsXmlBuilder.test.ts src/tests/ipsResponseParsers.test.ts src/tests/ipsCallbackCorrelation.test.ts src/tests/ipsTransactionLimits.test.ts src/tests/ippSupportMatrix.test.ts`
- `npx playwright test e2e/ipp-lifecycle.e2e.ts --project=chromium`

## Review Guidance

When auditing IPP/IPS behavior in this repo:

1. Use `docs/IPP/IPS_TSD_v0.7.md` and the XSDs for XML shape and attribute placement.
2. Use `docs/IPP/IPP_FSD_v10.0.md` for user flow, onboarding, and business-rule checks.
3. Prefer the Convex path over Supabase whenever the two disagree.
4. Treat any doc or test that still presents Supabase as authoritative as drift.
