# IPP/IPN/IPS Gap Assessment

**Doc Revision**: 2026-04-06  
**Status**: Current-state assessment  
**Canonical References**:

- `docs/IPP/IPS_TSD_v0.7.md`
- `docs/IPP/XSD's/`
- `docs/IPP/IPP_FSD_v10.0.md`
- `src/constants/ippSupportMatrix.ts`
- `docs/IPP_INTEGRATION.md`

---

## Summary

This document is no longer a pre-remediation gap dump. It is the current-state review after the Convex-first IPP remediation and final verification pass.

Current conclusion:

- the Convex path is live
- the shipped IPP flow set is implemented on Convex
- the Supabase IPP path is legacy only
- the highest-risk protocol and workflow gaps identified during review are now resolved in code
- remaining gaps are mostly production-environment dependencies or intentionally deferred surfaces outside the shipped flow set

---

## Final Discrepancy Matrix

| Area                                           | State                  | Notes                                                                                          |
| ---------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| XML request construction                       | resolved               | API-shaped XML builders now back the shipped flow set instead of a generic envelope            |
| XML response parsing                           | resolved               | downstream fields needed for validation, lookup, and status handling are parsed and surfaced   |
| `ReqChkTxn` / `RespChkTxn` correlation         | resolved               | status checks reconcile to the original payment/disbursement, not only the check request       |
| VPA validation privacy                         | resolved               | validation is authenticated and does not expose arbitrary local account-link metadata          |
| Alias usability gating                         | resolved               | only `ACTIVE` plus `syncedWithIps` aliases are usable                                          |
| Onboarding finalization rule                   | resolved               | end-user and staff approval paths both require confirmed alias registration before readiness   |
| Disbursement limit classification              | resolved               | outbound loan disbursements are treated as B2P for limit purposes                              |
| Playwright IPP lifecycle coverage              | resolved               | full browser run covers application, approval, disbursement, repayment, and admin verification |
| Live-vs-legacy documentation boundary          | resolved               | Convex is documented as live; Supabase IPP is documented as legacy/quarantined                 |
| BON sandbox certification                      | known partial          | blocked on external participant credentials, certificates, and environment access              |
| Production certificate / mTLS / HSM operations | known partial          | code hooks exist, but live operational enablement is external                                  |
| Merchant/P2M and bulk operator surfaces        | out of scope by design | not part of the currently shipped product flow set                                             |
| Mobile repo alignment work                     | out of scope by design | not part of this portal review and docs pass                                                   |
| Expansion of `vpaRegistry` fallback            | out of scope by design | legacy bridge retained only for compatibility                                                  |

---

## Evidence Used In This Review

Code and behavior reviewed:

- `convex/actions/ipsAdapter.ts`
- `convex/actions/ipsAliasAdapter.ts`
- `convex/actions/ipsOnboardingAdapter.ts`
- `convex/ips/ipsTransactions.ts`
- `convex/ips/ipsVpa.ts`
- `convex/ips/ipsOnboarding.ts`
- `convex/lib/ipsXmlBuilder.ts`
- `convex/lib/ipsResponseParsers.ts`
- `convex/lib/ipsCallbackCorrelation.ts`
- `src/hooks/useIPPOnboarding.ts`
- `src/hooks/useUserVPAs.ts`
- `src/hooks/useIPSPayment.ts`

Verification artifacts:

- `src/tests/ipsXmlBuilder.test.ts`
- `src/tests/ipsResponseParsers.test.ts`
- `src/tests/ipsCallbackCorrelation.test.ts`
- `src/tests/ipsTransactionLimits.test.ts`
- `src/tests/ippSupportMatrix.test.ts`
- `e2e/ipp-lifecycle.e2e.ts`

---

## Remaining Hardening Items

These are not evidence that the live path is still incorrect; they are follow-up hardening items:

1. complete BON sandbox and production credential onboarding
2. validate live certificate, mTLS, and HSM operational flows
3. expand UI coverage only if additional IPS APIs become product-facing
4. remove or retire compatibility bridges once legacy saved data is migrated

---

## Review Outcome

For the currently shipped IPP capabilities, the portal is now aligned at three layers:

- wire contract: TSD/XSD
- workflow and gating rules: FSD
- implementation boundary: Convex live, Supabase legacy

Any future review should treat this document as the current gap baseline, not the older pre-remediation assessment.
