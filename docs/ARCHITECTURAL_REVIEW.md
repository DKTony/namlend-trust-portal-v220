# NamLend Trust - Architectural Review

**Doc Revision**: 2026-04-28
**Status**: Active - current-state review and remediation roadmap
**Scope**: Web application plus active Convex backend. Mobile app and historical `docs_old/` are out of scope except where repository-wide tooling exposes risk.

---

## Executive Summary

The platform is now a Convex-first lending system: React/Vite frontend, Convex Auth, Convex schema/functions, Convex HTTP webhooks, scheduled jobs, and a Financial Ontology Engine for event/relationship/business-rule modeling.

The implementation is materially stronger than the older Supabase/RLS/RPC architecture, but the documentation and some runtime edges still disagree with that reality. The highest risks are not missing features in the happy path; they are boundary drift, authorization ambiguity in a few read/write functions, legacy Supabase dependencies, simulated financial infrastructure, and test/tooling practices that contradict production compliance requirements.

---

## Current Architecture Model

| Layer           | Current Implementation                                                         | Notes                                                                                       |
| --------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Frontend shell  | React 18, Vite, TypeScript, Tailwind, shadcn/ui, adaptive app shell            | `App.tsx` wraps Convex, Convex Auth, TanStack Query, theme, branding, auth context, routes. |
| Active backend  | Convex queries, mutations, actions, internal functions, HTTP router, cron jobs | Source of truth is `convex/schema.ts` and `convex/_generated/*`.                            |
| Auth            | `@convex-dev/auth` + `convex/auth.ts` profile/role seeding                     | Frontend role state is derived through Convex queries.                                      |
| Authorization   | Explicit guards in `convex/lib/auth.ts`                                        | Convex has no RLS; missing/weak guards are the primary security risk.                       |
| Financial state | Convex operational records plus TigerBeetle outbox shadowing                   | TigerBeetle is not yet the ledger authority.                                                |
| Integrations    | Convex actions for IPS/IPP, SMS, WhatsApp; Convex HTTP webhooks                | IPS production depends on certificates, transport configuration, and BoN readiness.         |
| Legacy islands  | Supabase branding service and role-assignment helper path                      | These remain active and must be treated as migration debt.                                  |
| Documentation   | Mixed Convex-current docs plus stale Supabase agent instructions               | Root/scoped agent docs needed correction in this pass.                                      |

---

## Findings Matrix

| ID   | Severity | Area                 | Finding                                                                                                                                                  | Evidence                                                                                                                                                                                                 | Remediation                                                                                                                                            |
| ---- | -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-01 | P0       | Authorization        | Some public Convex functions authenticate but do not clearly enforce owner-or-staff access before returning or creating sensitive records.               | `approvalWorkflow.getApprovalRequest`, `ipsTransactions.getTransaction`, `ipsTransactions.getTransactionByMsgId`, `ipsAliasDirectory.getAliasByAddr`, `ipsAlerts.createAlert`, `mandates.createMandate`. | Review each function and add `assertOwner`, `assertOwnerOrStaff`, or `assertStaff` based on the returned/linked entity. Add role/ownership tests.      |
| A-02 | P0       | Architecture drift   | Agent instructions previously described Supabase/RLS/RPC as primary, which can cause future agents to implement the wrong architecture if drift returns. | Root `AGENTS.md`, `src/AGENTS.md`, `e2e/AGENTS.md`, `supabase/AGENTS.md` were stale before this documentation pass.                                                                                      | Keep all agent docs Convex-first and explicitly label Supabase as legacy/reference; review them whenever backend boundaries change.                    |
| A-03 | P1       | Legacy coupling      | Credit scoring and legacy test utilities still expose Supabase paths.                                                                                    | `src/services/creditScoring.ts`, `src/utils/rpc.ts`, and `src/utils/testUtils.ts`.                                                                                                                       | Split pure scoring from deprecated Supabase adapters, then migrate tests/utilities to Convex fixtures.                                                 |
| A-04 | P1       | Production hardening | Branding config is Convex-backed, but uploaded assets are stored as data URLs until Convex storage is wired.                                             | `src/hooks/useBrandingConfig.ts`, `src/context/BrandingContext.tsx`, `convex/systemConfig.ts`.                                                                                                           | Move branding assets to Convex storage with size/type validation and public URL generation.                                                            |
| A-05 | P1       | Financial integrity  | TigerBeetle posting is simulated/shadow mode and uses a hardcoded local endpoint.                                                                        | `scheduled/tigerBeetleOutboxWorker.ts` uses `http://127.0.0.1:3001`; docs call this shadow mode.                                                                                                         | Parameterize endpoint, deploy real cluster, run reconciliation assertions, then decide whether TigerBeetle becomes ledger authority.                   |
| A-06 | P1       | IPS readiness        | IPS code supports XML/mock modes but production readiness depends on environment, certs, and BoN connectivity.                                           | `IPS_PROTOCOL_MODE`, mTLS env vars, XML builders/adapters, mock fallback behavior.                                                                                                                       | Gate production use on explicit protocol mode, mTLS verification, certificate rotation, sandbox evidence, callback monitoring, and rollback procedure. |
| A-07 | P1       | Compliance           | Test utilities hard-delete financial records despite the 7-year retention rule.                                                                          | E2E/API cleanup and `src/utils/testUtils.ts` include deletes for loans, payments, disbursements, approval requests, IPS transactions.                                                                    | Use isolated test tenants/datasets or soft-delete/archive test records; keep production-like tests retention-compliant.                                |
| A-08 | P2       | Audit reliability    | Audit writes are intentionally asynchronous and non-blocking.                                                                                            | `scheduleAuditLog()` uses `ctx.scheduler.runAfter(0, ...)`.                                                                                                                                              | Monitor scheduled audit/event failures and add reconciliation checks between financial records, audit logs, and event journal.                         |
| A-09 | P2       | Tooling              | `npm run typecheck` exists, but strict project typecheck currently fails on pre-existing debt.                                                           | `npm run typecheck` runs `tsc -b` and reports Convex/frontend strictness errors.                                                                                                                         | Burn down strict TypeScript errors before making the gate blocking.                                                                                    |
| A-10 | P2       | Quality gates        | Broad docs lint still fails on reference/imported docs; active docs lint is enforceable.                                                                 | `npm run docs:lint:active` passes; `npm run docs:lint` still covers noisy reference docs.                                                                                                                | Keep active docs gated and separately fix or exclude imported/reference specs.                                                                         |
| A-11 | P2       | Performance          | Build passes but emits large shared chunks and Tailwind ambiguous arbitrary easing warnings.                                                             | `npm run build` shows large `ui`, `charts`, and main chunks plus arbitrary easing warnings.                                                                                                              | Split heavy dashboards/charts further; normalize arbitrary easing classes.                                                                             |
| A-12 | P3       | Maintainability      | `convex/schema.ts` remains monolithic.                                                                                                                   | 66 application tables plus shared validators in one file.                                                                                                                                                | Split schema into domain table modules and shared validators once feature churn slows.                                                                 |
| A-13 | P3       | Type modeling        | Multiple `v.any()` metadata/config fields reduce end-to-end type certainty.                                                                              | Schema uses flexible metadata and config payloads across domains.                                                                                                                                        | Introduce typed validators for high-risk metadata first: payments, IPS, audit, product config, workflow conditions.                                    |

Severity key: P0 blocks safe production operation or future implementation direction; P1 is high risk before production hardening; P2 is important quality/operational debt; P3 is maintainability improvement.

---

## Best-Practice Gaps

- **Single source of architectural truth**: `docs/ARCHITECTURE.md`, `docs/AGENTS.md`, root `AGENTS.md`, and scoped agent docs must not disagree about backend authority.
- **Defense in depth**: frontend route guards are UX only; every Convex public function that touches user data needs explicit object-level authorization.
- **Financial immutability**: production rules require archival/reversal patterns. Tests should not normalize hard deletes as an acceptable cleanup strategy.
- **Operational observability**: scheduled audit writes, notification dispatch, IPS callbacks, TigerBeetle outbox retries, and dead-letter queues need dashboards/alerts, not only console output.
- **Dependency retirement**: Supabase cannot be considered inactive until credit-scoring adapters, test utilities, and E2E/API fixtures no longer require it.
- **Release gates**: documented commands should match `package.json`; warnings should have a known baseline and an owner.

---

## Remediation Roadmap

### Immediate

1. Fix or formally risk-accept the authorization findings in A-01.
2. Remove Supabase role-assignment helpers from live admin UI.
3. Document and monitor asynchronous audit/event write failures.
4. Add `npm run typecheck` or update all docs to use `npx tsc --noEmit`.

### Next Release

1. Migrate branding configuration/assets from Supabase to Convex or document Supabase as a supported dependency.
2. Replace hard-delete E2E cleanup with isolated fixtures or soft-delete/archive cleanup.
3. Parameterize TigerBeetle worker endpoint and add reconciliation assertions.
4. Normalize docs lint scope so active docs can be enforced separately from imported IPP reference material.

### Production Hardening

1. Complete IPS sandbox/prod credential, mTLS, callback, and monitoring runbooks.
2. Decide TigerBeetle authority model: shadow with reconciliation or primary ledger.
3. Split monolithic schema into domain slices and reduce `v.any()` in financial/high-compliance records.
4. Add bundle budgets and targeted lazy-loading for large admin/chart surfaces.

---

## Verification Baseline

Commands run during the review planning pass:

| Command             | Result | Notes                                                                                                             |
| ------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `npm run build`     | Pass   | Tailwind ambiguous arbitrary easing warnings and large chunks remain.                                             |
| `npm run lint`      | Pass   | 0 errors, 45 warnings.                                                                                            |
| `npx tsc --noEmit`  | Pass   | No TypeScript errors.                                                                                             |
| `npm run docs:lint` | Fails  | Pre-existing broad markdown lint failures, mostly imported IPP/reference docs. Use targeted lint for edited docs. |

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Current architecture and legacy boundary
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Convex schema reference
- [SERVICES.md](./SERVICES.md) - Service and legacy island inventory
- [SECURITY.md](./SECURITY.md) - Guard-based security model
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) - Tracked remediation items
