# Enforcement Activation Runbook

Status: operational draft. Do not flip live enforcement flags until this checklist is green.

This runbook turns tenancy and entitlement activation into a controlled procedure. The platform
must prove tenant binding, tenant data stamping, subscriptions, feature keys, and dependencies
before `TENANCY_ENFORCEMENT` or `ENTITLEMENT_ENFORCEMENT` is enabled.

## Flags

- `TENANCY_ENFORCEMENT`: stored in `businessRules`; default is off/inert.
- `ENTITLEMENT_ENFORCEMENT`: stored in `businessRules`; default is off/inert.

## Pre-Activation Sequence

1. Run the platform seed for the first tenant, plans, platform guardrails, and owner role.
2. Bind every tenant user role to an `institutionId`.
3. Run the tenancy backfill until every batch reports `needsRerun: false`.
4. Run the readiness check:

   ```bash
   npx convex run platform/readiness:getEnforcementReadiness '{"includeSamples": true}'
   ```

5. Resolve every blocker reported by the readiness check:
   - tenant users without `institutionId`
   - tenant-owned rows without `institutionId`
   - active tenants without active/trial subscription
   - invalid entitlement feature keys
   - entitlement dependencies not satisfied
6. Run the Convex regression suite:

   ```bash
   npm run test:convex
   ```

7. Confirm platform control-plane guard widening is green:
   - pure `platform_owner` can read and mutate business rules/system config
   - pure `platform_support` can read but cannot mutate
   - tenant-admin `/admin/*` compatibility still works until console cleanup removes those screens
8. Confirm tenant credit policy is enforced in lending decisions:
   - `createLoan` rejects tenant amount/term/rate violations
   - `approveLoanCore` rejects tenant amount/term/rate/monthly-income/DTI violations
   - default policy still permits known-good loan approval flows
9. Confirm tenant-isolation negative tests are green before enabling tenancy enforcement.

## Activation Sequence

1. Flip `TENANCY_ENFORCEMENT` to `true`.
2. Run tenant-scoped smoke tests:
   - Tenant A cannot list, read, mutate, approve, export, or search Tenant B data.
   - Existing sole-tenant NamLend flows still work for loans, payments, approvals, mandates, and
     reconciliation.
3. Re-run the readiness check.
4. Flip `ENTITLEMENT_ENFORCEMENT` to `true`.
5. Run entitlement smoke tests:
   - disabled add-on is hidden in navigation and backend-blocked with `FEATURE_NOT_ENABLED`
   - enabled add-on is visible and callable
   - core lending, payments, approvals, product reads/eligibility, and POPIA consent remain usable
6. Review Platform Console support audit history after any support activity.
7. For platform support tenant-specific reads, confirm an active L1 support session exists for the
   target tenant. Platform owners bypass this support-session requirement; support staff do not.

## Backfill Command

Run the backfill repeatedly until `needsRerun` is false:

```bash
npx convex run platform/backfill:backfillTenancyFinancialCore '{"batchSize": 500}'
```

The backfill stamps only missing `institutionId` values for known tenant-owned tables. It must not
move data between tenants and must not be used after tenants contain mixed unstamped data.

## Readiness Exit Criteria

`platform/readiness:getEnforcementReadiness` must report:

- `readyForTenancy: true`
- `readyForEntitlements: true`
- `usersWithoutInstitution: 0`
- `tenantRowsMissingInstitution: 0`
- `tenantsWithoutActiveSubscription: 0`
- `invalidEntitlementKeys: 0`
- `unmetDependencies: 0`

## Do Not Activate If

- global typecheck failures are in auth, tenancy, entitlement, platform, or config files
- any tenant-owned table has missing `institutionId`
- any active tenant lacks an active/trial subscription
- any entitlement references an unknown feature key
- credit policy config cannot be read back from Convex or lending-policy tests are failing
- platform support can read tenant-specific subscription/entitlement data without an active L1
  support session
- any support workflow requires L2 break-glass or L3 impersonation before approval/audit workflow
  exists
- the Convex entitlement/tenancy tests are failing

## Verification Commands

```bash
npm run test:convex
npm run typecheck
```

`npm run typecheck` may still fail on the documented legacy/UI baseline. New or touched
auth/tenant/entitlement/platform/config files must remain type-clean before activation.

## Deferred Follow-ups (accepted for this release)

Tracked in the Notion **Open Issues & Follow-ups** database. Both are accepted as inert/low-risk
for the control-plane hardening release and are not blockers for shipping (enforcement flags stay
off), but should be closed before the corresponding capabilities are relied on:

- **P3 — support tiers L2/L3 deferred (L0/L1 + read-gating already enforced).** Shipped and active:
  L0/L1 audited support sessions (`convex/platform/support.ts`) and
  `convex/lib/supportAudit.ts::assertTenantSupportReadAccess` — a `platform_support` user must hold an
  active **L1** session for a tenant to read its entitlements / resolved-entitlements / subscription
  (`platform_owner` bypasses). Deferred by design (MVP supports L0/L1 only): **L2 break-glass** and
  **L3 impersonation**, which require an approval + audit workflow not yet built. Low risk:
  platform-staff-only, owner-granted, enforcement inert. Follow-up: build the L2/L3 approval workflow
  before offering those tiers.
- **Accessibility — a11y E2E gate non-blocking.** `e2e/accessibility.e2e.ts` logs axe violations as
  warnings instead of failing; known serious/critical (e.g. `color-contrast`) violations remain on
  some routes. Follow-up: triage and re-enable the failing gate.
