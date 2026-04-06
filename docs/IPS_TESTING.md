# IPS Testing Guide

**Doc Revision**: 2026-04-06
**Status**: Active

---

## Summary

The current IPS verification set covers the live Convex path, not the legacy Supabase IPP path. The suite now validates:

- XML request generation
- XML response parsing
- callback correlation for `RespChkTxn`
- use-case limit classification for disbursement vs repayment
- supported-flow registry drift
- browser lifecycle behavior across the shipped IPP flow

This is code-path verification. It is not the same as BON sandbox certification.

---

## Current Automated Coverage

| Area                          | Evidence                                   | Status  |
| ----------------------------- | ------------------------------------------ | ------- |
| XML builders                  | `src/tests/ipsXmlBuilder.test.ts`          | passing |
| XML response parsing          | `src/tests/ipsResponseParsers.test.ts`     | passing |
| `RespChkTxn` correlation      | `src/tests/ipsCallbackCorrelation.test.ts` | passing |
| use-case limit classification | `src/tests/ipsTransactionLimits.test.ts`   | passing |
| support-matrix drift          | `src/tests/ippSupportMatrix.test.ts`       | passing |
| end-to-end IPP lifecycle      | `e2e/ipp-lifecycle.e2e.ts`                 | passing |

---

## Commands

```bash
# TypeScript
npx tsc --noEmit

# Focused IPP/IPS unit coverage
npx vitest run \
  src/tests/ipsXmlBuilder.test.ts \
  src/tests/ipsResponseParsers.test.ts \
  src/tests/ipsCallbackCorrelation.test.ts \
  src/tests/ipsTransactionLimits.test.ts \
  src/tests/ippSupportMatrix.test.ts

# Browser lifecycle
npx playwright test e2e/ipp-lifecycle.e2e.ts --project=chromium
```

---

## Playwright Scope

`e2e/ipp-lifecycle.e2e.ts` currently verifies:

1. client loan application
2. admin approval
3. admin IPS disbursement
4. client IPS repayment
5. admin post-payment verification

Important setup behavior:

- `e2e/global-setup.ts` seeds Convex test users and confirmed aliases
- the setup also pushes the current Convex implementation before the browser run
- optional legacy Supabase seeding may fail without affecting the live Convex UI flow

---

## What Is Verified vs Not Verified

### Verified in-repo

- Convex is the live IPP path
- alias usability gating is enforced
- onboarding finalization requires confirmed alias registration
- `RespChkTxn` maps back to the original transaction
- disbursement limit handling uses the B2P bucket
- payment page IPS default state matches the visible UI behavior

### Not verified without BON environment access

- sandbox certification against BON endpoints
- production certificate exchange and mTLS handshake
- live signature verification against BON-issued material
- HSM-backed PIN encryption flows with real participant keys
- operational reconciliation against external settlement outputs

---

## Manual / External Validation Still Required

When BON sandbox or production access is available, validate:

1. live `ReqPay` / `RespPay` transport against BON
2. live `ReqValAdd` / `RespValAdd` callback timing
3. live `ReqChkTxn` deemed-resolution timing
4. participant certificate and mTLS configuration
5. alias registration and lookup against the external mapper
6. operational alerting, monitoring, and reconciliation procedures

---

## Related Documents

- [IPS_IMPLEMENTATION.md](./IPS_IMPLEMENTATION.md)
- [IPS_PRODUCTION_CHECKLIST.md](./IPS_PRODUCTION_CHECKLIST.md)
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md)
