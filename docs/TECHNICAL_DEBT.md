# NamLend Trust - Technical Debt & Outstanding Work

**Doc Revision**: 2026-04-28
**Status**: Active - aligned with current Convex-first implementation

> See [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for the current findings matrix, severity definitions, and remediation roadmap.

---

## Summary

Core lending and back-office workflows are implemented on Convex. Remaining debt is concentrated in production hardening, legacy Supabase islands, authorization review, financial infrastructure, and quality gates.

| Priority | Count | Theme                                                                          |
| -------- | ----- | ------------------------------------------------------------------------------ |
| P0       | 2     | Authorization correctness and architecture-direction drift                     |
| P1       | 5     | Legacy coupling, financial infrastructure, IPS readiness, retention compliance |
| P2       | 4     | Audit reliability, tooling, lint/docs quality, bundle/performance warnings     |
| P3       | 2     | Schema modularity and stricter metadata modeling                               |

---

## P0 - Must Resolve or Risk-Accept

### 1. Object-Level Authorization Review

Some public Convex functions authenticate callers but do not clearly enforce owner-or-staff access on the returned or linked object.

Current review targets:

- `convex/approvalWorkflow.ts`: `getApprovalRequest`
- `convex/ips/ipsTransactions.ts`: `getTransaction`, `getTransactionByMsgId`
- `convex/ips/ipsAliasDirectory.ts`: `getAliasByAddr`
- `convex/ips/ipsAlerts.ts`: `createAlert`
- `convex/ontology/mandates.ts`: `createMandate`

Remediation: add `assertOwner`, `assertOwnerOrStaff`, `assertStaff`, or stricter linked-entity checks as appropriate, then add role/ownership tests.

### 2. Agent Documentation Drift

Root and scoped agent instructions previously described Supabase/RLS/RPC as primary architecture. This documentation pass realigns them with the active Convex backend, but the issue remains a governance risk whenever architecture boundaries change.

Remediation: keep all `AGENTS.md` files Convex-first, explicitly mark Supabase as legacy/reference, and review agent docs whenever backend ownership changes.

---

## P1 - Production Hardening

### 1. Supabase Legacy Islands

Active code still calls Supabase:

- `src/services/creditScoring.ts` still contains deprecated Supabase score adapter paths.
- `src/utils/rpc.ts` wraps Supabase RPC for legacy tests/utilities.
- `src/utils/testUtils.ts` uses Supabase auth/data helpers and hard-delete cleanup.
- `src/integrations/supabase/client.ts` remains required by those legacy paths.

Remediation: split pure scoring from Supabase adapters, migrate tests to Convex fixtures, and remove the Supabase client from the active web bundle.

### 2. TigerBeetle Shadow Posting

TigerBeetle outbox records are created, but the scheduled worker posts to a hardcoded local shadow endpoint and does not establish TigerBeetle as the financial authority.

Remediation: parameterize the endpoint, deploy a real cluster, add reconciliation assertions, and decide whether Convex remains operational truth or TigerBeetle becomes primary ledger truth.

### 3. IPS Production Readiness

IPS XML protocol support exists, but production use depends on `IPS_PROTOCOL_MODE`, mTLS/certificate configuration, BoN sandbox evidence, callback verification, and operational monitoring.

Remediation: complete sandbox/prod credential setup, certificate rotation plan, callback monitoring, failure/reversal runbooks, and explicit production-mode gating.

### 4. Data Retention in Tests

E2E/API helpers still hard-delete loans, payments, disbursements, approval requests, and IPS records. This conflicts with the 7-year retention rule and normalizes unsafe cleanup patterns.

Remediation: use isolated test tenants/datasets, archive flags, or soft-delete cleanup for production-like test paths.

### 5. Asynchronous Audit Reliability

Financial mutations schedule audit/event writes asynchronously via `ctx.scheduler.runAfter()`. This protects user operations from audit write failures, but creates a separate reliability surface.

Remediation: add monitoring and reconciliation for failed scheduled audit/event writes and dead-lettered side effects.

---

## P2 - Quality and Operability

### 1. Missing Typecheck Script

Docs and agent instructions referenced `npm run typecheck`, but `package.json` does not define it. `npx tsc --noEmit` passes.

Remediation: add `"typecheck": "tsc --noEmit"` or update all documentation to use the direct command.

### 2. Lint Warning Baseline

`npm run lint` passes with 0 errors and 45 warnings, including React hook dependency warnings, fast-refresh warnings, generated-file warnings, and legacy Supabase type warning noise.

Remediation: define a warning budget, suppress generated/reference files intentionally, and fix app-source warnings first.

### 3. Markdown Lint Scope

`npm run docs:lint` fails broadly, mostly in imported IPP/reference documents and generated/spec-derived markdown.

Remediation: split active-doc linting from reference-spec linting, or exclude imported specification material from the default docs lint target.

### 4. Build Warnings and Bundle Size

`npm run build` passes but reports Tailwind ambiguous arbitrary easing warnings and large generated chunks for shared UI, charts, and main app bundles.

Remediation: normalize arbitrary easing classes, add bundle budgets, and continue lazy-loading heavy admin/chart surfaces.

---

## P3 - Maintainability

### 1. Monolithic Convex Schema

`convex/schema.ts` contains 66 application tables plus shared validators. This keeps the source of truth obvious but increases merge/conflict and cognitive load.

Remediation: split table definitions into domain modules and keep `schema.ts` as a thin assembler once feature churn slows.

### 2. Flexible Metadata Types

`v.any()` is still used for metadata, config, and workflow payloads. That is pragmatic but weakens type certainty in financial and compliance-sensitive records.

Remediation: add typed validators first for payment metadata, IPS payloads, audit metadata, workflow conditions, and product configuration.

---

## Verification Baseline

| Command             | Current Result                                      |
| ------------------- | --------------------------------------------------- |
| `npx tsc --noEmit`  | Pass                                                |
| `npm run build`     | Pass with Tailwind easing warnings and large chunks |
| `npm run lint`      | Pass with 45 warnings                               |
| `npm run docs:lint` | Fails on pre-existing broad docs/reference issues   |

---

## See Also

- [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) - Findings matrix and roadmap
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Current architecture
- [SERVICES.md](./SERVICES.md) - Service and legacy island inventory
- [SECURITY.md](./SECURITY.md) - Guard-based security model
