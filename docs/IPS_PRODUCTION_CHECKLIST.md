# IPS Production Checklist

**Doc Revision**: 2026-04-06
**Status**: Active checklist

---

## Summary

The code path for the shipped IPP flows is implemented in Convex, but production readiness still depends on BON-managed connectivity and operational setup.

Use this checklist to distinguish:

- code-complete items already present in the repo
- external/environment items still required before live BON traffic

---

## 1. Code-Complete Today

- [x] Convex is the live IPP runtime path
- [x] XML builders and parsers exist for the shipped flow set
- [x] webhook routing for IPS callbacks exists in `convex/http.ts`
- [x] alias usability gating is enforced (`ACTIVE` plus `syncedWithIps`)
- [x] onboarding completion requires confirmed alias registration
- [x] `RespChkTxn` reconciliation maps back to the original transaction
- [x] disbursement use-case limits are separated from generic P2P repayment limits
- [x] focused unit coverage exists for XML parsing, callback correlation, and limit classification
- [x] Playwright coverage exists for the end-to-end IPP lifecycle in the local app flow

---

## 2. External Dependencies Before BON Go-Live

### BON / participant onboarding

- [ ] Receive participant credentials from BON
- [ ] Confirm participant organization ID and bank code
- [ ] Register callback URLs with BON
- [ ] Complete BON sandbox connectivity testing

### Certificates / transport security

- [ ] Obtain BON-issued or BON-approved certificate material
- [ ] Configure signing key material for Convex runtime
- [ ] Configure BON public certificate / verification chain
- [ ] Configure client certificate, client key, and CA certificate for mTLS
- [ ] Validate certificate rotation and expiry monitoring

### HSM / credential handling

- [ ] Configure BON HSM public key for PIN encryption
- [ ] Validate operational key custody and vaulting model
- [ ] Confirm production signing mode (`software` vs future `hsm`) with security stakeholders

---

## 3. Convex Environment and Runtime Configuration

Set or verify the required Convex environment values:

```bash
npx convex env set IPS_BASE_URL <bon-endpoint>
npx convex env set IPS_ORG_ID <participant-org-id>
npx convex env set IPS_BANK_CODE <participant-bank-code>
npx convex env set IPS_SIGNING_PRIVATE_KEY <pem>
npx convex env set IPS_BON_PUBLIC_CERT <pem>
npx convex env set IPS_KEY_ID <key-id>
npx convex env set IPS_HSM_PUBLIC_KEY <pem>
npx convex env set IPS_CLIENT_CERT <pem>
npx convex env set IPS_CLIENT_KEY <pem>
npx convex env set IPS_CA_CERT <pem>
```

Operational mode:

- [ ] `IPS_PROTOCOL_MODE` set to `xml_sandbox` for certification
- [ ] `IPS_PROTOCOL_MODE` set to `xml_production` only after BON signoff

---

## 4. Operational Readiness

- [ ] production monitoring for IPS success/failure rates
- [ ] callback failure and timeout alerting
- [ ] logging review for sensitive-field exposure
- [ ] daily reconciliation procedure documented and staffed
- [ ] rollback / fallback procedure documented for BON outage scenarios
- [ ] runbook for stale pending transactions and deemed resolution

---

## 5. Go-Live Exit Criteria

Do not treat the system as BON-production-ready until all of the following are true:

- [ ] BON sandbox certification completed
- [ ] transport security and certificates verified end-to-end
- [ ] production environment values configured in Convex
- [ ] monitoring and alerting in place
- [ ] operational reconciliation runbook approved
- [ ] legal/compliance signoff completed for the live IPP flow

---

## Related Documents

- [IPS_IMPLEMENTATION.md](./IPS_IMPLEMENTATION.md)
- [IPS_TESTING.md](./IPS_TESTING.md)
- [IPP_INTEGRATION.md](./IPP_INTEGRATION.md)
