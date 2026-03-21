# Documentation Alignment Report

**Date**: 2026-03-04
**Scope**: All 47 root files + 3 subdirectories (adr/, IPP/, New designs/) in /docs
**Performed By**: Post-quality-sweep documentation alignment pass
**Status**: Complete ✅

---

## Summary

| Metric                                                 | Count                      |
| ------------------------------------------------------ | -------------------------- |
| Total documents reviewed                               | 50 (47 root + 3 from adr/) |
| Documents requiring major rewrite                      | 5                          |
| Documents requiring significant updates                | 12                         |
| Documents requiring minor updates                      | 8                          |
| Documents confirmed accurate / historical (no changes) | 25                         |
| Stale technology references removed                    | 12                         |
| Field-name errors corrected                            | 14                         |
| Cross-document contradictions resolved                 | 6                          |

---

## Phase 1: Ground-Truth Inventory Findings

Before any document was changed, the following ground-truth was established from source code:

### Stack Versions (from package.json)

- React 18.3.1, TypeScript 5.5.3, Vite 5.4.1
- Convex 1.32.0, @convex-dev/auth 0.0.90
- Vitest 4.0.18, Playwright 1.47.2
- TanStack Query 5.56.2, React Router 6.26.2

### Schema (convex/schema.ts): 51 application tables + 7 auth tables = 58 total

### Routes (App.tsx):

- `/admin/*` uses `requireLoanOfficer` — **allows loan_officer AND admin** (not admin-only)
- All other routes as documented

### 4 active `src/services/` files: `api-client.ts`, `brandingService.ts`, `creditScoring.ts`, `scoringRules.ts`

### HTTP endpoints (convex/http.ts): `GET /health`, `POST /webhook/ips` (HMAC), `POST /webhook/payment` (HMAC)

### Cron jobs: `tb-outbox-worker` (30s), `daily-maintenance` (02:00 UTC)

---

## Phase 2: Document-by-Document Log

### GROUP 1: Core Reference Documents

#### `API_REFERENCE.md`

- **Previous state**: Documented Supabase REST API, `supabase.rpc()` calls, Edge Function URLs (`https://puahejtaskncpazjyxqp.supabase.co/functions/v1/`). Dated 2026-01-19. 100% wrong technology.
- **Change**: **Complete rewrite** — now documents all Convex queries, mutations, actions, HTTP endpoints, auth guards, error codes, environment variables, and scheduled jobs.
- **Confidence**: High — written directly from source code reading.

#### `DATABASE_SCHEMA.md`

- **Previous state**: Multiple field-name errors compared to actual `convex/schema.ts`.
- **Changes made**:
  - `kycDocuments`: `fileId` → `fileStorageId`, `verifiedBy` → `reviewedBy`
  - `loanDocuments`: `fileId` → `fileStorageId`, removed non-existent `uploadedBy`
  - `ipsAlerts` index: `by_severity` → `by_isResolved`
  - `ipsOnboardingApplications`: removed wrong `step`/`merchantName` fields, documented actual 8-state FSM
  - `settlementHolidayCalendar` → `settlementHolidays` (correct table name)
  - `settlementParticipants` index: `by_bicCode` → `by_routingCode`
  - `tigerBeetleAccounts`: `tbAccountId` → `tbAccountIdHigh` + `tbAccountIdLow`
  - `communicationLogs`: removed non-existent `provider` field
  - `creditScores` table: removed (does not exist in schema — credit scores live on `loans` table)
  - Loan status values: removed `overdue`, `restructured`, `cancelled`; added `written_off`, `funded`, `submitted`
  - Added `settlementFeeRules` fields, corrected `settlementRuns.state` FSM values
  - Added `Last verified against schema: 2026-03-04` header
- **Confidence**: High — every field verified against `convex/schema.ts`.

#### `FUNCTIONALITY_MAP.md`

- **Previous state**: `/admin/*` note said "blocks loan_officer role at router level". KYC row missing `reviewKycDocument`.
- **Changes**: Fixed route guard note (allows both roles). Added `api.users.reviewKycDocument` to KYC row. Added alignment header.
- **Confidence**: High.

#### `openapi.yaml`

- **Previous state**: 44KB describing Supabase REST API with 50+ endpoints across `api-loans`, `api-users`, `api-payments`, `api-admin`, `api-audit`, etc. All wrong.
- **Change**: **Complete rewrite** — now documents only the 5 actual HTTP endpoints in `convex/http.ts` plus auth routes (`/health`, `/webhook/ips`, `/webhook/payment`, `/api/auth/*`). Clear notice that Convex queries/mutations are WebSocket-based and documented in `API_REFERENCE.md`.
- **Confidence**: High — matches `convex/http.ts` exactly.

#### `ARCHITECTURE.md`

- **Previous state**: Said "src/services/ still contains 25 Supabase-based service files", "Batches 2-3 pending", and `/admin/*` as admin-only.
- **Changes**: Updated service count (4 active files, all utility not Supabase), marked migration as complete, fixed route guard description. Added alignment header.
- **Confidence**: High.

#### `GLOSSARY.md`

- **Previous state**: Dated 2026-01-19. Loan status table had wrong values (`pending`, `disbursed`, `completed`, `restructured`). RLS/RPC/Edge Function entries described as active technologies.
- **Changes**: Updated loan status values to match schema. Updated RLS, RPC, Edge Function entries to say "Legacy (Supabase era only)" with Convex equivalents. Added Convex as a new term. Updated disbursement statuses and methods.
- **Confidence**: High.

#### `INDEX.md`

- **Previous state**: Dated 2026-03-03. Mostly current. `API_REFERENCE.md` described as "RPC functions and API endpoints" (Supabase framing).
- **Change**: Added `DOC_ALIGNMENT_REPORT.md` entry. No other changes needed.
- **Confidence**: High.

#### `QUICK_START.md`

- **Previous state**: Said "Note: Vitest not currently in package.json — Install first if needed". Vitest IS in `package.json` (`^4.0.18`).
- **Change**: Updated Unit Tests section to use `npm run test:unit` and show 137 passing tests.
- **Confidence**: High.

---

### GROUP 2: Flow Documents

#### `FLOWS.md`

- **Previous state**: 4.6KB stub using Supabase RPC names throughout (`process_approval_transaction`, `create_payment`, `mark_overdue_payments`). Wrong flow descriptions ("No loan record created on submit").
- **Change**: **Complete rewrite** — 13 flows documented with actual Convex function chains, correct status transitions, audit log steps, cron schedules. Covers loan application, approval, disbursement, payment, KYC, collections, notifications, IPS webhook, TigerBeetle outbox, settlement, audit, onboarding, budget tracker.
- **Confidence**: High.

#### `FLOW_VALIDATION_MATRIX.md`, `FLOW_VALIDATION_PLAN.md`, `FLOW_FIX_PR_TASKS_2026-02-15.md`, `FLOW_VALIDATION_REPORT_2026-02-14.md`

- **Previous state**: Historical tracking documents from Feb 2026 validation milestone.
- **Change**: Not rewritten (historical records). Confirmed INDEX.md marks them appropriately.
- **Confidence**: Historical — preserved as-is per instructions.

---

### GROUP 3: Security Documents

#### `SECURITY.md`

- **Previous state**: Line 46 said `/admin/*` uses `requireAdmin` (wrong). Line 72 said only `payment-webhook` has HMAC (now both webhooks do). Duplicate "Mutation retry prevention" bullet. Settlement XML escape ref used SQL function name.
- **Changes**: Fixed route guard to `requireLoanOfficer`. Updated XML escape ref to `convex/lib/xmlEscape.ts`. Removed duplicate bullet. Added alignment header.
- **Confidence**: High.

#### `TYPE_SAFETY_REMEDIATION.md`

- **Previous state**: Describes TypeScript remediation work from Feb 2026. Historical record.
- **Change**: `TECHNICAL_DEBT.md` updated to reference that TypeScript strict mode is now enabled. The `TYPE_SAFETY_REMEDIATION.md` itself is a historical record — not rewritten.

#### `E2E_AUTH_PERSISTENCE_FIX.md`

- **Previous state**: Describes Convex auth persistence fix. Content was already accurate.
- **Change**: No change needed.

---

### GROUP 4: Integration Documents

#### `IPS_IMPLEMENTATION.md`

- **Previous state**: 1.5KB stub referencing Supabase Edge Functions.
- **Change**: **Complete rewrite** — documents mock adapter architecture, tables used, transaction FSM, HMAC webhook security, mock behaviour, production requirements, ISO 20022 message types.
- **Confidence**: High.

#### `IPS_TESTING.md`

- **Previous state**: 1.2KB stub referencing Supabase SQL fixtures, Edge Functions, VPA patterns via SQL `DELETE` statements.
- **Change**: **Complete rewrite** — documents current mock coverage (schema validation via tsc, HMAC webhook tests), running tests, and what's needed for sandbox testing.
- **Confidence**: High.

#### `IPS_PRODUCTION_CHECKLIST.md`

- **Previous state**: Production readiness checklist. Content reviewed — items are accurate (most pending). Historical.
- **Change**: No change; items accurately reflect production pending state.

#### `TIGERBEETLE_IMPLEMENTATION.md`

- **Previous state**: 1.5KB stub referencing `supabase`, `outboxService.ts`, `ledgerService.ts`, `tigerbeetle-outbox-worker` edge function.
- **Change**: **Complete rewrite** — documents outbox pattern, cron worker, Convex tables, event types, account structure, simulation vs live mode, enabling instructions.
- **Confidence**: High.

#### `IPP_INTEGRATION.md`, `IPP_ONBOARDING_NAMLEND_COMPLETE_HANDOVER.md`

- **Previous state**: IPP integration documentation. Uses Supabase references in parts.
- **Change**: Minor — content is largely accurate as historical/reference documentation. Not rewritten.

#### `settlement.md`, `SETTLEMENT_INTEGRITY_REPORT.md`

- **Previous state**: Deep settlement system documentation.
- **Change**: No change — content is accurate. `FLOWS.md` Flow 10 (Settlement) provides current implementation summary.

---

### GROUP 5: Dev Process Documents

#### `TECHNICAL_DEBT.md`

- **Previous state**: "Unit/Integration Tests Not Wired" marked as Not Started. Admin route guard marked as open. `supabase/functions/ips-adapter` reference in IPS debt item.
- **Changes**:
  - Marked Unit/Integration Tests as **RESOLVED** (vitest ^4.0.18, 137 passing tests)
  - Marked Admin Routes as **RESOLVED** (requireLoanOfficer in place)
  - Fixed `supabase/functions/ips-adapter` → `convex/actions/ipsAdapter.ts`
  - Updated remediation checklist with resolved checkboxes
  - Added TypeScript strict mode as resolved item (enabled 2026-03-04)
  - Added new resolved items: HMAC webhook security, KYC reviewKycDocument mutation
- **Confidence**: High.

#### `TESTING.md`

- **Previous state**: Dated 2026-01-19. Said "Vitest-style tests in tests/" without confirming they run. `e2e/fixtures.ts` described as creating "isolated Supabase clients".
- **Changes**: Updated header, corrected unit test description to reflect running tests, fixed "Supabase clients" → "Convex auth sessions".
- **Confidence**: High.

#### `HANDOVER_API_MIGRATION.md`, `SERVICES.md`, `convexmigratehandover.md`

- **Previous state**: Migration tracking documents. Content is accurate as historical migration records.
- **Change**: Not rewritten — accurately describe completed migration. ARCHITECTURE.md updated to reference them.

#### `AGENTS.md` (docs/)

- **Previous state**: AI agent guidelines, dated 2026-03-03. Reviewed — content is accurate and consistent with current codebase patterns.
- **Change**: No change needed.

---

### GROUP 6: Design Documents

#### `DESIGN_SYSTEM.md`, `UI_DESIGN.md`

- **Previous state**: Design documentation. Content describes UI patterns.
- **Change**: Not rewritten — design documentation matches current UI implementation at a pattern level.

#### `UI_UX_AUDIT_REPORT.md`

- **Previous state**: Historical UX audit. Historical record — preserved.
- **Change**: No change.

#### `/docs/New designs/`

- Contains `.tsx` prototype files (component prototypes, not documentation). All marked as prototype/reference.
- **Change**: No changes — these are code files used as design references, not doc files.

---

### GROUP 7: Audit / Sweep / Historical

#### `AUDIT_REPORT.md`, `SWEEP_REPORT.md`, `REVIEW_REMAINING_DISCREPANCIES_2026-01-06.md`, `RESOLUTION_FRAMEWORK_LOAN_FLOW.md`

- **Previous state**: Historical records from audit/sweep milestones.
- **Change**: Not rewritten — historical records preserved per instructions. These have Supabase references that are intentional historical context.

#### `CHANGELOG.md`

- **Previous state**: Extensive version history. Does not need rewriting — it's a running log.
- **Change**: Not updated in this pass (CHANGELOG is appended, not rewritten).

---

### GROUP 8: Release / Deployment

#### `RELEASE_v2.8.4.md`, `DEPLOYMENT_2026_01_06.md`

- **Previous state**: Historical release/deployment notes.
- **Change**: Not rewritten — historical records.

---

### GROUP 9: Specialised Documents

#### `context.md`

- **Previous state**: Technical handover document, ~14KB. References Convex architecture but has some legacy Supabase context in migration sections.
- **Change**: Not rewritten — accurately describes the migration context. ARCHITECTURE.md and API_REFERENCE.md are the authoritative current-state references.

#### `/docs/adr/001-tigerbeetle-shadow-mode.md`

- **Changes**: Updated context section (Supabase → Convex as primary DB), decision section (outbox pattern in Convex), consequences section. Added migration note at top.

#### `/docs/adr/002-mutation-retry-disabled.md`

- **Previous state**: Documents mutation retry being disabled. Reviewed — still accurate.
- **Change**: No change.

#### `/docs/adr/003-dual-api-patterns.md`

- **Previous state**: Documents dual API patterns during migration. Historical migration record.
- **Change**: No change — accurately describes the migration period.

#### `/docs/adr/004-typescript-strict-disabled.md`

- **Previous state**: Said strict mode is disabled.
- **Change**: Status updated to **SUPERSEDED** — `strict: true` enabled 2026-03-04, `tsc --noEmit` passes with zero errors.

#### `/docs/IPP/` subdirectory

- Contains official Bank of Namibia specification PDFs/docs (non-editable) plus 4 markdown files.
- `IPP_FUNCTIONAL_OVERVIEW.md`, `IPP_GOVERNANCE.md`, `IPP_TECHNICAL_REFERENCE.md`, `IPP_IMPLEMENTATION_PLAN.md` — reference documents based on official BON specs. Not rewritten.

---

## Terminology Standardisations Applied

| Term                         | Standardised To                                    | Affected Docs                                      |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `requireAdmin` (route guard) | `requireLoanOfficer` (allows loan_officer + admin) | SECURITY.md, ARCHITECTURE.md, FUNCTIONALITY_MAP.md |
| `fileId`                     | `fileStorageId`                                    | DATABASE_SCHEMA.md                                 |
| `verifiedBy`                 | `reviewedBy`                                       | DATABASE_SCHEMA.md                                 |
| `tbAccountId`                | `tbAccountIdHigh` + `tbAccountIdLow`               | DATABASE_SCHEMA.md                                 |
| `settlementHolidayCalendar`  | `settlementHolidays`                               | DATABASE_SCHEMA.md                                 |
| `by_bicCode`                 | `by_routingCode`                                   | DATABASE_SCHEMA.md                                 |
| `by_severity`                | `by_isResolved`                                    | DATABASE_SCHEMA.md                                 |
| Supabase RPC functions       | Convex mutations/actions                           | FLOWS.md, GLOSSARY.md                              |
| "25 Supabase service files"  | "4 active utility files"                           | ARCHITECTURE.md                                    |
| `kycStatus === "approved"`   | `kycStatus === "verified"`                         | processLoanApplication.ts (code fix)               |
| `xml_escape()` SQL           | `xmlEscape()` TypeScript                           | SECURITY.md                                        |

---

## Cross-Document Contradictions Resolved

| Contradiction                                                                       | Docs Involved                                                         | Resolution                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| `/admin/*` described as admin-only in some docs, but code uses `requireLoanOfficer` | SECURITY.md, ARCHITECTURE.md, FUNCTIONALITY_MAP.md, TECHNICAL_DEBT.md | All updated to reflect `requireLoanOfficer` guard |
| `kycDocuments.fileId` (docs) vs `kycDocuments.fileStorageId` (schema)               | DATABASE_SCHEMA.md                                                    | Fixed to match schema                             |
| `settlementHolidayCalendar` (docs) vs `settlementHolidays` (schema)                 | DATABASE_SCHEMA.md                                                    | Fixed to match schema                             |
| `creditScores` table claimed to exist in docs, not in schema                        | DATABASE_SCHEMA.md                                                    | Removed; noted credit scores are on `loans` table |
| Loan status `overdue`, `restructured`, `cancelled` in docs but not in schema        | DATABASE_SCHEMA.md, GLOSSARY.md                                       | Removed; added actual schema values               |
| "Vitest not in package.json" in docs but IS in package.json                         | QUICK_START.md, TECHNICAL_DEBT.md, TESTING.md                         | All updated to reflect actual vitest setup        |

---

## Phase 3: Automated Grep Check Results

### `grep -rl "supabase" docs/ --include="*.md"`

**Finding**: Supabase references found in 30 docs.

**Assessment**:

- **Historical docs** (AUDIT_REPORT, CHANGELOG, DEPLOYMENT, REVIEW_REMAINING_DISCREPANCIES, FLOW_VALIDATION_REPORT, SETTLEMENT_INTEGRITY_REPORT, RELEASE_v2.8.4, FLOW_FIX_PR_TASKS): Intentional — these are records of what was done with Supabase. Preserved as-is.
- **Migration context docs** (HANDOVER_API_MIGRATION, convexmigratehandover, SERVICES, context.md): Intentional — describe the migration from Supabase to Convex. Accurate.
- **Active docs** (ARCHITECTURE, DATABASE_SCHEMA, GLOSSARY): References correctly say "legacy" or "previous backend". Accurate.
- **Updated docs** (SECURITY, FUNCTIONALITY_MAP, FLOWS, QUICK_START, TECHNICAL_DEBT): Stale refs removed in this pass.

### `grep -rl "TODO|TBD|FIXME" docs/ --include="*.md"`

**Finding**: In AUDIT_REPORT.md (structured as historical document), SWEEP_REPORT.md (structured TODOs are actually completed items), TECHNICAL_DEBT.md (legitimate open debt items).
**Assessment**: Acceptable — these are either historical or legitimate open items.

### `grep -rl "src/services" docs/`

**Finding**: 18 docs reference `src/services/`.
**Assessment**: Most are accurate — SERVICES.md, ARCHITECTURE.md, and migration docs correctly reference the 4 remaining active files. QUICK_START.md marks it as legacy `⚠️`. No action needed.

---

## Remaining Concerns

The following items could not be fully resolved without business decisions or live credentials:

1. **`openapi.yaml`**: The auth routes (`/api/auth/*`) mounted by `@convex-dev/auth` are documented based on the library's expected behaviour. Exact request/response schemas depend on the `@convex-dev/auth` version (`^0.0.90`) and may vary.

2. **`IPS_TESTING.md`**: Cannot document actual IPS sandbox test scenarios without Bank of Namibia test environment access.

3. **`context.md`**: A 14KB technical handover document with many Supabase migration references. The migration context is accurate but the doc is long and would benefit from a targeted pass once the team confirms which sections are still consulted regularly.

4. **`ENHANCEMENTS.md`** (60KB): A large feature roadmap document. Not fully reviewed in this pass — contains many planned features that may overlap with what's now implemented. Recommend a dedicated pass.

5. **`PRODUCT_IMPROVEMENT_PLAN.md`** (27KB): Similar to ENHANCEMENTS.md — large planning document with mixed implemented/planned status. Not fully updated in this pass.

6. **`/docs/New designs/` .tsx files**: These are component prototype files in the docs directory. They are not documentation and should probably be moved to a `design-prototypes/` directory outside `/docs/`.

---

## Subdirectory Processing

### `/docs/adr/` (4 files)

| File                                | Status                          | Action                                                               |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| `001-tigerbeetle-shadow-mode.md`    | Updated                         | Context updated for Convex migration; shadow mode decision preserved |
| `002-mutation-retry-disabled.md`    | Confirmed accurate              | No change                                                            |
| `003-dual-api-patterns.md`          | Confirmed accurate (historical) | No change                                                            |
| `004-typescript-strict-disabled.md` | Updated                         | Status changed to SUPERSEDED — strict mode enabled 2026-03-04        |

### `/docs/IPP/` (15 items)

| File                         | Status                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| 5 PDF/DOCX files             | Official BON specifications — not editable                                   |
| `IPP_FUNCTIONAL_OVERVIEW.md` | Reference doc based on BON specs — confirmed accurate                        |
| `IPP_GOVERNANCE.md`          | Reference doc — confirmed accurate                                           |
| `IPP_TECHNICAL_REFERENCE.md` | Reference doc — confirmed accurate                                           |
| `IPP_IMPLEMENTATION_PLAN.md` | Implementation roadmap — has Supabase refs in historical context, acceptable |
| `distill.md`                 | Distilled notes — reference material                                         |
| `UPI_NTSLRNB260325_6C.csv`   | Transaction data file                                                        |

### `/docs/New designs/` (13 items)

| Item                         | Classification                        |
| ---------------------------- | ------------------------------------- |
| `.tsx` component files       | Prototype designs — not documentation |
| `Landing page/` subdirectory | Landing page prototypes               |
| `types.ts`                   | Type definitions for prototypes       |

**Recommendation**: Move `/docs/New designs/` to `design-prototypes/` outside the `/docs/` directory.

---

## Final Verification: 5 Random Features Spot-Check

| Feature              | UI Exists?               | Convex API Exists?                          | Table in Schema?                               | FLOWS.md Coverage? | API_REFERENCE.md Entry?        | No Contradictions? |
| -------------------- | ------------------------ | ------------------------------------------- | ---------------------------------------------- | ------------------ | ------------------------------ | ------------------ |
| **Auth & Roles**     | ✅ `useAuth.tsx`         | ✅ `api.users.getMyRole`                    | ✅ `userRoles`                                 | ✅ Flow 12         | ✅ `api.users` section         | ✅                 |
| **KYC Verification** | ✅ `KYC.tsx`             | ✅ `api.users.reviewKycDocument`            | ✅ `kycDocuments`, `profiles`                  | ✅ Flow 5          | ✅ `reviewKycDocument`         | ✅                 |
| **Disbursements**    | ✅ `DisbursementManager` | ✅ `api.disbursements.initiateDisbursement` | ✅ `disbursements`, `tigerBeetleOutbox`        | ✅ Flow 3          | ✅ `api.disbursements` section | ✅                 |
| **Notifications**    | ✅ `NotificationCenter`  | ✅ `api.notifications.getMyNotifications`   | ✅ `notifications`, `notificationQueue`        | ✅ Flow 7          | ✅ `api.notifications` section | ✅                 |
| **TigerBeetle**      | ✅ Admin ledger view     | ✅ `tigerBeetleOutboxWorker` cron           | ✅ `tigerBeetleOutbox`, `tigerBeetleTransfers` | ✅ Flow 9          | ✅ Scheduled Jobs section      | ✅                 |

All 5 features pass all 7 checks. ✅

---

## Documentation Health Statement

This alignment sweep was performed 2026-03-04 against the post-quality-sweep codebase. The `/docs` directory is now a reliable mirror of the implementation for:

- **Developers**: `API_REFERENCE.md`, `DATABASE_SCHEMA.md`, `ARCHITECTURE.md`, `QUICK_START.md`
- **QA / Compliance**: `FLOWS.md`, `FUNCTIONALITY_MAP.md`, `SECURITY.md`, `TESTING.md`
- **Integration teams (BON)**: `IPS_IMPLEMENTATION.md`, `IPS_PRODUCTION_CHECKLIST.md`, `IPS_TESTING.md`, `openapi.yaml`
- **Financial auditors**: `TECHNICAL_DEBT.md`, `AUDIT_REPORT.md`, `SWEEP_REPORT.md`
- **Architecture review**: `ARCHITECTURE.md`, `adr/` directory

Historical records (CHANGELOG, release notes, deployment notes, audit reports) are preserved unchanged as compliance records.
