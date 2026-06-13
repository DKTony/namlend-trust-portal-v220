# Multi-Tenant Lending Platform — Architecture Blueprint (v2, reconciled)

**Status:** Design blueprint (no code yet). Execution is phased and separately approved.
**Version:** v2 — supersedes v1. Reconciles three inputs: the v1 blueprint, the "Owner Console
and Tenant Feature Management Plan", and the owner's reconciliation analysis.
**Date:** 2026-06-12
**Audience:** Platform owner + engineering.

---

## 0. The real architecture: control plane vs data plane

The headline is **not** "two consoles." It is **control-plane / data-plane separation**. Most
SaaS failures happen when the control plane is treated as just another admin screen.

- **Control plane** (the policy brain): who may exist, which tenant is active, which plan
  applies, which features are entitled, which rollout state applies, which guardrails are
  non-negotiable, and who accessed what and why.
- **Data plane** (tenant-isolated execution): loans, clients, payments, mandates, approvals,
  collections, disbursements, ledger postings — every row scoped to exactly one tenant.

The two consoles are the _UI surface_ of these planes; the planes themselves are enforced in the
Convex backend.

---

## 1. Why this exists

NamLend is being turned from a single-tenant lending app into a **licensable platform**: the
owner rents the software to businesses and, from a central **Platform Console**, provisions
tenants and dispatches features by plan/tier — separate from each tenant's **Backoffice Console**.

Today `/admin/*` is one mixed console (business backoffice + platform setup + system settings +
ontology controls + support diagnostics) behind a single flat `admin` role. We split it:

| Persona                                    | Console                | Responsibility                                                                                                                                                    | Owner's framing                                           |
| ------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Platform Owner** (you)                   | `/platform/*`          | Tenant lifecycle, plans & feature catalog, entitlement dispatch, rollout, platform guardrails, shared infra (ledger/settlement/rails), cross-tenant observability | "application owner, feature & config dispatch"            |
| **Platform Support** (your app-support)    | `/platform/*` (scoped) | Health, safe metadata, audited break-glass + impersonation. **No commercial controls.**                                                                           | "application support" (kept separate from business admin) |
| **Business Backoffice** (tenant operators) | `/admin/*`             | Lending operations for their own business; see only entitled features                                                                                             | "backoffice business enablement"                          |
| Borrower (client)                          | client app             | Apply, pay — unchanged UX, now tenant-scoped                                                                                                                      | —                                                         |

**Locked decisions:** pooled row-level tenancy (one Convex deployment, isolation by
`institutionId`); runtime entitlement toggles ("deploy a feature" = flip an entitlement, no
redeploy); Platform Console = a gated route in the same app under a platform role **outside** the
tenant role model; full 4-layer commercial model adopted now.

---

## 2. Current state — verified grounding

The codebase has the _bones_ of multi-tenancy but **nothing enforces it** and there is **no
entitlement system**. Every number below is verified against the schema.

| Capability                                              | State                                                                                                                                                                                                                                                                                                                                                                                                          | Evidence                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Tenant entity                                           | ✅ `institutions` (typed `lender/bank/fintech/mno/regulator`, has `status`)                                                                                                                                                                                                                                                                                                                                    | `convex/ontology/institutions.ts`, `schema.ts:1825`          |
| Per-tenant config                                       | ✅ `institutionConfig` (temporal, FK-enforced)                                                                                                                                                                                                                                                                                                                                                                 | `schema.ts:1845`                                             |
| `institutionId` on data plane                           | ⚠️ Present **+indexed on only 5 tables** (loans, disbursements, paymentTransactions, approvalRequests, mandates); `productDefinitions`/`accounts` have the field but **no index**; **~30+ tenant-owned tables have no `institutionId` at all** (profiles, kycDocuments, loanDocuments, loanApprovals, paymentSchedules, collectionsInteractions, promiseToPay, notifications, ipsTransactions, vpaRegistry, …) | `schema.ts`                                                  |
| Tenant scoping helper                                   | ⚠️ `lib/institutionScope.ts` exists but **imported nowhere**; filter-after-fetch, not index-time                                                                                                                                                                                                                                                                                                               | `convex/lib/institutionScope.ts`                             |
| Roles                                                   | ⚠️ Flat `client/loan_officer/admin`, one per user, **no platform tier**, **no tenant link**                                                                                                                                                                                                                                                                                                                    | `convex/lib/auth.ts`, `schema.ts:300`                        |
| Tier / plan / subscription / entitlement / feature flag | ❌ None                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                            |
| Rules / config                                          | ⚠️ Global only (`businessRules`, `systemConfiguration`)                                                                                                                                                                                                                                                                                                                                                        | `convex/ontology/businessRules.ts`, `convex/systemConfig.ts` |
| Admin nav                                               | ⚠️ Single flat array gated only by `isAdmin`; types already support per-item flags                                                                                                                                                                                                                                                                                                                             | `src/config/adminNav.ts`                                     |
| Ontology-admin drift                                    | ⚠️ **Real** — Workflow/Products admin dashboards carry live type errors                                                                                                                                                                                                                                                                                                                                        | typecheck baseline                                           |
| Audit surfaces                                          | ✅ `auditLogs`, `stateTransitions`, `viewLogs`, `ippComplianceEvidence` exist                                                                                                                                                                                                                                                                                                                                  | `schema.ts:1416+`                                            |

**Implication:** we extend a half-built foundation. `institutions`+`institutionConfig`+the dormant
`institutionId` columns are the right substrate; the work is to **enforce** them (across the whole
data plane, not just 5 tables) and add the **commercial + console** layers.

---

## 3. Identity & roles (control plane)

Platform staff are deliberately **outside** the tenant role model so a tenant admin can never
escalate into platform scope.

```
userRoles (tenant-scoped)                 platformAdmins (cross-tenant)
  userId                                    userId
  institutionId   ← NEW, REQUIRED           platformRole: platform_owner | platform_support
  role: tenant_admin | loan_officer | client                 (+ platform_auditor later)
        (+ collections_officer, approver later)               status, createdBy, lastReviewedAt
  status, effectiveFrom, effectiveTo
```

- **Migrate `admin → tenant_admin`** (an `admin` that doesn't say "admin of what" is dangerous in
  multi-tenant SaaS). Seeded NamLend users become `tenant_admin`; the software owner account is
  assigned `platform_owner` manually.
- Guards (in `convex/lib/auth.ts`): keep `assertOwner/assertOwnerOrStaff`; add
  `assertTenantRole(ctx, institutionId, roles[])`, `assertTenantAdmin`, `assertTenantStaff`,
  `assertPlatformOwner`, `assertPlatformSupport`.

---

## 4. Commercial & entitlement model — 4 layers

> **Entitlement ≠ feature flag ≠ rollout state.** Entitlement = contract right; rollout state =
> operational availability; the manifest = what code can enforce. A tenant can be _entitled_ to
> IPP but not yet _rolled out_ (provider creds pending).

```
src/config/features.ts   (CODE — enforcement authority; canonical featureKey list)
        │  authority rule: a DB feature row is valid only if its key exists here
        ▼
featuresCatalog (DB)     display/sell/roll-out/audit metadata only — may not invent keys
        ▼
plans                    planCode → { defaultFeatures: featureKey[], limits }
        ▼
tenantSubscriptions      institutionId → active plan + status + effective period
        ▼
tenantEntitlements       institutionId × featureKey → source + enabled + rolloutState + temporal
```

### Tables (new)

- **`plans`** — `planCode`, `name`, `status`, `defaultFeatures: featureKey[]`, `limits` (e.g.
  `maxOperators`, `maxActiveLoans`), `effectiveFrom/To`.
- **`tenantSubscriptions`** — `institutionId`, `planCode`, `status:
trial|active|suspended|expired|cancelled`, `effectiveFrom/To`, `billingRef?`, `createdBy`,
  `reason`. Answers _which plan, what state, when does it renew, who approved_.
- **`tenantEntitlements`** — `institutionId`, `featureKey`, `source:
plan|addon|trial|manual_override|removal`, `enabled`, `rolloutState:
off|internal|pilot|enabled|deprecated`, `effectiveFrom/To`, `reason`, `changedBy`, `changedAt`.
  Temporal like `institutionConfig`.
- **`featuresCatalog`** (optional) — DB mirror for owner display/sell; gated by the authority rule.

### Resolved entitlement (the function both planes read)

```
resolved(tenant) =
    activeSubscription.plan.defaultFeatures
  ∪ add-ons ∪ active trials
  − removals
  ∩ rolloutState ∈ {enabled, pilot-for-this-tenant}
  ∩ NOT blocked by platform compliance hard-stops
```

### Feature manifest (`src/config/features.ts`) — the coupling contract

```ts
export interface FeatureDef {
  key: string; // 'collections', 'mandates', 'whiteLabelBranding', ...
  name: string;
  category: 'lending' | 'collections' | 'payments' | 'analytics' | 'compliance' | 'branding';
  console: 'platform' | 'backoffice' | 'client';
  requiredRoles?: string[];
  routes?: string[];
  navItems?: string[];
  backendCapabilities?: string[];
  dependsOn?: string[]; // dependency graph = the loose-coupling contract
  complianceClass?: 'guardrail' | 'tenant_policy' | 'feature_rule';
  defaultAvailability?: string[]; // plans that include it by default
  killSwitchable?: boolean;
  alwaysOn?: boolean; // core lending
}
```

---

## 5. Enforcement — both planes, backend-authoritative

> **Hard rule (proved in this codebase):** UI gating is **not** security. The KYC gate earlier in
> this project was bypassable because it lived only in the UI. Tenancy and entitlement are
> enforced in Convex; the UI is convenience.

Every protected tenant function resolves **caller → tenant → role → entitlement → guardrails**:

```ts
const caller  = await requireAuthenticatedUser(ctx);
const tenant  = await requireTenantContext(ctx, caller);          // convex/lib/tenancy.ts
await assertTenantRole(ctx, tenant.institutionId, ['tenant_admin','loan_officer']);
await assertFeatureEnabled(ctx, tenant.institutionId, 'collections'); // convex/lib/entitlements.ts
await assertWithinPlatformGuardrails(ctx, proposedConfig);          // APR cap etc.
return await tenantScopedLoans(ctx, tenant.institutionId).create(...);
```

Platform functions (`convex/platform/*`):

```ts
const platformUser = await assertPlatformOwner(ctx);
await auditPlatformAction(ctx, {
  actor: platformUser.userId,
  action: 'tenant.entitlement.updated',
  institutionId,
  featureKey,
});
```

### Mandatory tenancy access layer (not just index-time scoping)

Convex has no Postgres-RLS net, so isolation must be **infrastructural, not optional developer
discipline**. Feature modules must not query core tenant tables directly. Instead:

- `convex/lib/tenancy.ts` → `requireTenantContext(ctx)` resolves `institutionId` from `userRoles`.
- Tenant-scoped helpers own the `withIndex('by_institutionId', …)`: `listTenantLoans(ctx)`,
  `tenantDb(ctx, institutionId).query('loans')…`. Raw cross-tenant reads are blocked except via
  explicit platform diagnostic functions.
- Enforced by lint rule + **negative-isolation tests** (the `convex-test` harness at
  `convex/hardening.test.ts` extends here): Tenant A cannot read/mutate/search/approve/export
  Tenant B on any path.

### Frontend (UX only)

`src/hooks/useEntitlements.ts` resolves the set; `adminNav.ts` items gain `console` +
`requiredFeature`; `ProtectedRoute` gains `requireFeature` + `requirePlatform`; a `<FeatureGate>`
handles inline gating.

---

## 6. Configuration & business rules — 3 classes

"Business rules" is too broad to live in one place. Split it:

| Class                                            | Examples                                                                                   | Owner          | Store                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ | -------------- | --------------------------------------- |
| **Platform guardrails** (non-negotiable)         | APR cap (32%), KYC minimums, 7-yr retention, jurisdiction limits, no-hard-delete           | Platform       | new `platformGuardrails` / global rules |
| **Tenant policy** (flexible _within_ guardrails) | risk bands, approval thresholds, product pricing below caps, collection/notification prefs | Tenant         | `institutionConfig`                     |
| **Feature rules**                                | Collections/Mandates/IPP/Products behavior                                                 | Feature module | feature config                          |

`systemConfiguration` = **platform-only** (shared infra, provider creds, env). Tenant config can
**never** override a guardrail: a tenant product at 35% APR is rejected server-side even if the UI
hides the field. (Regulatory tests must prove this, plus no hard deletes of financial records.)

**Cleanup flagged:** `CreditPolicyConfig` currently persists to `localStorage` — must move to
Convex `institutionConfig` (within guardrails).

---

## 7. Console split — section reassignment

### → Platform Console (`/platform/*`)

Tenant registry (today "Institutions"); **Plans & Feature Catalog** (new); **Entitlements /
Provisioning** (new); **Rollout controls** (new); Platform guardrails (global business rules);
TigerBeetle Ledger + TB Config; Settlement + transport config; Payment Rails; cross-tenant
observability; **audited Support** (health, safe metadata, break-glass, impersonation);
Billing/usage (future).

### → Backoffice Console (`/admin/*`, entitlement-gated)

Always-on: **Overview, Loans, Clients, Payments, Approvals, tenant User Management, Batch Ops**.
Tier-gated: **Collections, IPP/IPS onboarding, Mandates, Products, Branding (white-label), Credit
Policy (within guardrails), POPIA Consent, advanced Analytics, tenant Reconciliation**.

### → Client App

Borrower onboarding, applications, repayments, consent/mandate UX — tenant-scoped.

---

## 8. Support access — progressive, not blanket

Platform support crosses tenant boundaries, so it is a **privileged security surface** audited
_more heavily_ than tenant admin. Read-only is not harmless: unnecessary borrower-PII exposure is
a confidentiality breach.

| Level  | Access                                                         | Control                                           |
| ------ | -------------------------------------------------------------- | ------------------------------------------------- |
| **L0** | Platform health, tenant metadata, rollout status, error counts | Default for `platform_support`                    |
| **L1** | Tenant-scoped operational metadata, **no borrower PII**        | Default                                           |
| **L2** | Break-glass diagnostic into tenant data                        | Time-bound, reason required, audited              |
| **L3** | Impersonation                                                  | Tenant- or platform-owner-approved, fully audited |

Dedicated **`supportAccessAudit`**: `actorUserId, platformRole, institutionId, accessType, reason,
approvedBy?, startedAt, endedAt, viewedResources, impersonatedUserId?, ticketRef?`. (POPIA-aligned;
OWASP multi-tenant guidance: tenant-isolated audit trails, alert on cross-tenant access attempts.)

---

## 9. Loose coupling without physical separation

"Deploy features separately" is achieved at **runtime**, gated by entitlements, without
micro-frontend ops cost: each feature is a self-contained module (Convex functions namespaced per
feature, UI under a feature folder, declared in the manifest with explicit `dependsOn`);
cross-feature access via stable interfaces, not deep imports; routes already lazy-loaded so a
disabled feature's bundle is never fetched. "Deploy feature X to customer Y" = flip an
entitlement. (True module federation / dedicated deployment is deferred to enterprise isolation.)

---

## 10. Phased roadmap

> **Order is load-bearing:** roles → tenant context → tenant-scoped data access → entitlements →
> console UX. Never console-UX-first. Do **not** build the Platform Console before tenancy is
> enforced — a pretty console over a soft data boundary is a security illusion.

| Phase                                  | Goal                            | Key outputs                                                                                                                                                                                                                                                                                                                                                                                                                           | Behavior change                        |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **-1 Baseline stabilization**          | De-risk before building         | typecheck triage (categorize ~527 errors: auth/tenant/config-affecting vs UI drift vs dead code); rule _"any auth/role/entitlement/config/tenancy file must be type-clean; no new errors in touched files; existing debt documented"_; conceptual `admin→tenant_admin`; **institutionId-coverage inventory** (5 ready / ~30+ to migrate); authorization matrix; fix `CreditPolicy` localStorage + ontology drift in files we'll touch | None                                   |
| **0 Inert control plane**              | Substrate, zero behavior change | manifest; `platformAdmins`,`plans`,`tenantSubscriptions`,`tenantEntitlements`,`featuresCatalog`; guards in **allow-all**; seed NamLend tenant #1; migrate admins→`tenant_admin`; assign `platform_owner`                                                                                                                                                                                                                              | **None** (identical prod)              |
| **1 Tenancy hardening** (highest risk) | Hard isolation boundary         | add `institutionId`+index across tenant tables (or parent-derived for child rows like paymentSchedules→loan); backfill legacy; tenancy access layer; block raw cross-tenant reads; **negative-isolation tests**                                                                                                                                                                                                                       | Data scoped per tenant                 |
| **2 Entitlement resolution**           | Features gate by tier           | plan→subscription→entitlement resolver; temporal + dependency validation + rolloutState; **downgrade = hide UI + block new writes + preserve historical reads + audit/compliance records**                                                                                                                                                                                                                                            | Disabled features hidden + blocked     |
| **3 Console split**                    | Two consoles                    | `/platform/*` + platform role; move platform-only sections out of `/admin/*`; nav driven by console + role + entitlement + platform role                                                                                                                                                                                                                                                                                              | Owner vs backoffice separation         |
| **4 Platform Console MVP**             | Self-serve dispatch             | create/suspend tenant, assign plan, enable add-on, start/end trial, tenant health, safe metadata, entitlement audit, audited support access                                                                                                                                                                                                                                                                                           | Owner can onboard customers w/o deploy |
| **5 Commercial / scale**               | Monetize                        | usage metering, billing hooks, self-serve upgrades, downgrade workflows, per-tenant limits, enterprise isolated-deployment path                                                                                                                                                                                                                                                                                                       | Billing live                           |

**Migration safety:** Phase 0 is fully inert (NamLend on an all-features plan, guards allow-all) →
production byte-for-byte unchanged until entitlements are deliberately flipped later.

---

## 11. Risks & non-negotiables

1. **Cross-tenant data leak = the existential SaaS failure mode.** Enforce tenancy in the backend
   on every data-plane path; cover with negative-isolation tests. The ~30+ tables lacking
   `institutionId` are the live gap — Phase 1 is not optional polish.
2. **Entitlement bypass** — `assertFeatureEnabled` is backend-side; nav filtering is convenience.
3. **Compliance erosion** — APR cap / KYC / retention are platform guardrails; tenants may only
   tighten within bounds, never relax. Server-enforced + tested.
4. **Support as invisible super-admin** — progressive access + heavier audit than tenant admin.
5. **Rollout/entitlement conflation** — model both; never let the DB invent feature keys the code
   can't enforce.
6. **Type-debt normalization** — don't widen architecture on an unstable type baseline; freeze and
   quarantine (Phase -1), keep tenancy/auth/entitlement files type-clean.

---

## 12. Where it lands (file map)

**Backend:** `convex/schema.ts` (new tables + `userRoles.institutionId` + `institutionId` across
data-plane tables); new `convex/lib/{tenancy,entitlements}.ts`; `convex/lib/auth.ts` (+ tenant &
platform guards); wire/replace `convex/lib/institutionScope.ts`; `convex/ontology/institutions.ts`;
new `convex/platform/*` (owner-console functions); shared `src/config/features.ts`; new
`platformGuardrails` + `supportAccessAudit` tables.

**Frontend:** `src/config/adminNav.ts` (+ `console`, `requiredFeature`); new
`src/hooks/useEntitlements.ts`; `src/components/system/ProtectedRoute.tsx` (+ `FeatureGate`, +
platform guard); `src/pages/AdminDashboard/adminRoutes.tsx`; new `src/pages/PlatformConsole/*`;
`src/hooks/useAuth.tsx` (+ platform role, + tenant); `CreditPolicyConfig` → Convex.

---

## 13. Open questions for later phases (not blocking)

- Limits (max operators / active loans): hard-enforced or soft/alerting first?
- Tenant onboarding: self-serve signup vs owner-provisioned only.
- White-label: per-tenant custom domains vs subdomain only.
- Enterprise isolation: when (if ever) to graduate a tenant to a dedicated deployment.
- Impersonation consent/audit retention specifics under POPIA.

---

_v2 supersedes v1. v1's structure and phasing are retained; v2 hardens role model, commercial
model, support posture, tenancy-enforcement scope, and the control-plane/data-plane framing per the
owner's reconciliation._
