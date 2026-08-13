# Enforcement Activation Runbook

Status: operational draft. Do not flip live enforcement flags until this checklist is green.

This runbook turns tenancy and entitlement activation into a controlled procedure. The platform
must prove tenant binding, tenant data stamping, subscriptions, feature keys, and dependencies
before `TENANCY_ENFORCEMENT` or `ENTITLEMENT_ENFORCEMENT` is enabled.

## Flags

- `TENANCY_ENFORCEMENT`: stored in `businessRules`; default is off/inert.
- `ENTITLEMENT_ENFORCEMENT`: stored in `businessRules`; default is off/inert.

## Pre-Activation Sequence

1. Deploy the feature manifest, validation, migration API, route/write guards, and UI while both
   enforcement flags remain off.
2. Run the platform seed for fresh environments. For existing environments, invoke the
   owner-authenticated `platform.entitlements.backfillClientFeatureDefaults` mutation with
   `{ dryRun: true }`, review the report, then invoke it with `{ dryRun: false }`.
   - It inserts only missing client catalogue rows.
   - It appends all nine client keys plus dependency closure to every active plan.
   - It preserves existing plan grants and tenant overrides.
   - Removal/disabled overrides are reported as conflicts and are never silently cleared.
3. Bind every tenant user role to an `institutionId`.
4. Run the tenancy backfill until every batch reports `needsRerun: false`.
5. Run the readiness check:

   ```bash
   npx convex run platform/readiness:getEnforcementReadiness '{"includeSamples": true}'
   ```

6. Resolve every blocker reported by the readiness check:
   - tenant users without `institutionId`
   - tenant-owned rows without `institutionId`
   - active tenants without active/trial subscription
   - missing Client Portal catalogue rows
   - active plans missing Client Portal defaults or `ippOnboarding` dependency closure
   - active plans or entitlement rows containing unknown/platform-only feature keys
   - entitlement dependencies not satisfied
7. Run the Convex regression suite:

   ```bash
   npm run test:convex
   ```

8. Confirm platform control-plane boundaries are green:
   - pure `platform_owner` can read and mutate business rules/system config
   - pure `platform_support` can read but cannot mutate
   - tenant admins cannot create or update either protected enforcement rule
9. Confirm tenant credit policy is enforced in lending decisions:
   - `createLoan` rejects tenant amount/term/rate violations
   - `approveLoanCore` rejects tenant amount/term/rate/monthly-income/DTI violations
   - default policy still permits known-good loan approval flows
10. Confirm tenant-isolation negative tests are green before enabling tenancy enforcement.
11. Record the two required human approvals for the protected activation change.

## Activation Sequence

1. A platform owner activates `TENANCY_ENFORCEMENT` first.
2. Run tenant-scoped smoke tests:
   - Tenant A cannot list, read, mutate, approve, export, or search Tenant B data.
   - Existing sole-tenant NamLend flows still work for loans, payments, approvals, mandates, and
     reconciliation.
3. Re-run the readiness check.
4. After readiness is fully green, a platform owner calls
   `setEntitlementEnforcement({ enabled: true, reason })`. The server rejects activation when
   tenancy enforcement is off or any readiness blocker remains.
5. Run entitlement smoke tests:
   - disabled add-on is hidden in navigation and backend-blocked with `FEATURE_NOT_ENABLED`
   - enabled add-on is visible and callable
   - core loan/client/payment aggregates, repayments, approvals, product reads/eligibility, and
     mandatory POPIA consent primitives remain usable
   - one disabled Client Portal feature is absent on desktop/mobile, rejects direct/deep state, and
     blocks its client-originated writes with `FEATURE_NOT_ENABLED`
   - disabling Banking removes IPP payment/onboarding controls without blocking non-IPP repayment
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
- `missingClientCatalogFeatures: 0`
- `plansMissingClientDefaults: 0`
- `plansWithInvalidDefaults: 0`
- `invalidEntitlementKeys: 0`
- `unmetDependencies: 0`

## Do Not Activate If

- global typecheck failures are in auth, tenancy, entitlement, platform, or config files
- any tenant-owned table has missing `institutionId`
- any active tenant lacks an active/trial subscription
- the client-feature dry-run has not been reviewed and applied
- any active plan lacks the nine client defaults or their dependency closure
- any active plan or entitlement references an unknown or platform-only feature key
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
npm run test:unit
npm run ontology:extract
npm run ontology:check
npm run ontology:test
npm run agent:policy
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
