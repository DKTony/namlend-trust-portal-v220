# NamLend Trust - Technical Context & Handover

**Doc Revision**: 2026-03-19
**Status**: Backend migrated to Convex (Feb 2026). All milestone A–D work complete. Frontend service rewiring complete (Batch 1–3 + Milestone D). IPS adapter runs in mock mode. TigerBeetle uses Convex outbox worker with simulated posting.
**Live URL**: <https://namlend-trust-portal-v220.netlify.app>
**Convex Deployment**: Convex Cloud (auto-deploy via `npx convex deploy`)

---

## Executive Summary

NamLend Trust is a React SPA backed by **Convex** (reactive document-relational database, migrated from Supabase in Feb 2026) that delivers a full loan lifecycle: application intake, approval workflow, disbursement, repayment scheduling, collections, notifications, and admin operations. The codebase also includes IPS/IPP integration scaffolding (Convex mock adapter), settlement/backoffice workflows, and a TigerBeetle shadow ledger via Convex outbox pattern.

**What is implemented in code**

- Loan application flow: `createLoan` → `submitLoan` → approval review → `approveLoan`/`rejectLoan` via Convex mutations.
- Admin approval workflow with Convex-backed queue, reactive updates, and atomic state transitions.
- Disbursement workflow: `initiateDisbursement` → `processDisbursement` → `completeDisbursement` (Convex state machine).
- Payment processing with schedules, overdue marking, settlement detection, and reconciliation tools.
- Collections workflow including activity logging, promise-to-pay (`createPromiseToPay`), and reschedule requests.
- Notification pipeline: in-app (Convex), SMS/WhatsApp queued via `notificationQueue` + Convex actions.
- IPS/IPP onboarding wizard, VPA registry, and transaction status monitoring (mock adapter via Convex action).
- Settlement schema (13 tables) + processing + admin reconciliation UI (NISS/SWIFT transport not implemented).
- TigerBeetle outbox in Convex DB; cron worker posts to TB every 30s (simulated cluster connection).
- All `src/services/` files are legacy dead code — 23 deleted in Milestone D, 4 remain with active consumers.

**Key gaps (production blockers)**

- IPS adapter is mock; production IPS API, mTLS, and switch connectivity are not wired.
- TigerBeetle cron worker simulates TB posting; real cluster connectivity is pending.
- ~~Admin route guard is admin-only~~ — **RESOLVED (2026-03-04)**: `/admin/*` uses `requireLoanOfficer` guard; both `loan_officer` and `admin` roles can access.
- ~~Credit scoring UI not shown~~ — **RESOLVED (2026-03-04)**: `creditScore`, `debtToIncomeRatio`, and `recommendation` displayed in `Loan360View` and `LoanReviewPanel`. `submitLoan` schedules `processLoanApplication` action automatically.

---

## Technology Stack

### Frontend

| Technology      | Version | Purpose                                  |
| --------------- | ------- | ---------------------------------------- |
| React           | 18.3.1  | UI framework                             |
| TypeScript      | 5.5.3   | Type safety                              |
| Vite            | 5.4.1   | Build tool (port 8080)                   |
| TailwindCSS     | 3.4.11  | Styling                                  |
| shadcn/ui       | Current | UI primitives                            |
| Convex React    | Latest  | Reactive data (`useQuery`/`useMutation`) |
| TanStack Query  | 5.56.2  | For non-Convex data (legacy hooks)       |
| React Router    | 6.26.2  | Routing                                  |
| React Hook Form | 7.53.0  | Forms                                    |
| Zod             | 3.23.8  | Validation                               |
| Lucide Icons    | 0.462.0 | Icons                                    |

### Backend (ACTIVE — Convex)

| Component                             | Purpose                                           |
| ------------------------------------- | ------------------------------------------------- |
| Convex document DB                    | Primary database (55+ tables, `convex/schema.ts`) |
| `@convex-dev/auth`                    | Authentication (Password provider, session-based) |
| Auth guards (`convex/lib/auth.ts`)    | Data access control (replaces RLS)                |
| Convex Queries/Mutations/Actions      | Server logic (replaces RPCs + Edge Functions)     |
| Convex HTTP Router (`convex/http.ts`) | Webhooks and auth callbacks                       |
| Convex Cron Jobs (`convex/crons.ts`)  | Scheduled tasks (replaces pg_cron + Edge timers)  |

### Legacy (INACTIVE — Supabase, retained for reference)

| Component                                                 | Status                                   |
| --------------------------------------------------------- | ---------------------------------------- |
| `supabase/migrations/` (33 SQL migrations)                | INACTIVE — reference only                |
| `supabase/functions/` (18 Deno Edge Functions)            | INACTIVE — replaced by Convex actions    |
| `src/services/` (4 remaining files with active consumers) | LEGACY — do not add new logic here       |
| `src/integrations/supabase/`                              | LEGACY client and types — reference only |

### Infrastructure

| Component      | Purpose                                |
| -------------- | -------------------------------------- |
| Netlify        | Frontend hosting (auto-deploy on push) |
| Convex Cloud   | Backend (DB/Auth/Functions/Crons)      |
| GitHub Actions | CI workflows (`ci-web.yml`, `e2e.yml`) |
| Playwright     | E2E testing                            |

---

## Repository Structure

```
namlend-trust-portal-v220-main/
├── convex/                    # ⭐ ACTIVE BACKEND
│   ├── schema.ts              # Database schema (55+ tables, SOURCE OF TRUTH)
│   ├── auth.ts / auth.config.ts  # Convex Auth callbacks + config
│   ├── http.ts                # HTTP router (webhooks, auth routes)
│   ├── crons.ts               # Cron jobs (outbox worker, daily tasks)
│   ├── lib/                   # auth guards, audit helper, regulatory, xmlEscape
│   ├── loans.ts / payments.ts / disbursements.ts / approvalWorkflow.ts
│   ├── collections.ts / notifications.ts / analytics.ts / audit.ts / users.ts
│   ├── reconciliation.ts / systemConfig.ts / loanApprovals.ts / loanDocuments.ts
│   ├── actions/               # ipsAdapter, processLoanApplication, sendSms, sendWhatsapp, sendNotification
│   ├── scheduled/             # tigerBeetleOutboxWorker, dailyTasks
│   ├── ips/                   # IPS domain (5 files)
│   ├── settlement/            # Settlement domain (10 files)
│   └── tigerbeetle/           # TigerBeetle domain (4 files)
├── src/
│   ├── components/            # UI components (shadcn + custom, ~150+ files)
│   ├── pages/                 # Route pages (client + admin)
│   ├── hooks/                 # Convex reactive hooks
│   ├── integrations/
│   │   ├── convex/            # Convex client + api re-exports (ACTIVE)
│   │   └── supabase/          # LEGACY client + types (reference only)
│   ├── types/                 # Domain types (includes convex.ts shared utilities)
│   ├── utils/                 # Helpers, debug tooling
│   └── constants/             # Regulatory constants
├── supabase/                  # ⚠️ LEGACY (reference only)
│   ├── migrations/            # 33 PostgreSQL migrations (INACTIVE)
│   └── functions/             # 18 Deno Edge Functions (INACTIVE)
├── e2e/                       # Playwright E2E tests + fixtures
├── docs/                      # Documentation (this folder)
└── namlend-mobile/            # Separate React Native app
```

---

## Core Domain Model (Summary)

**Primary entities (Convex camelCase table names)**

- `profiles` and `userRoles` (role-based access: `client`/`loan_officer`/`admin`).
- `approvalRequests` + `approvalHistory` + `workflowDefinitions` + `workflowInstances`.
- `loans`, `disbursements`, `paymentTransactions`, `paymentSchedules`, `loanDocuments`.
- `auditLogs`, `viewLogs`, `stateTransitions`, `complianceReports`.
- `notifications`, `notificationQueue`, `notificationPreferences`, `notificationTemplates`, `communicationLogs`.
- `collectionsInteractions`, `promiseToPay`, `overdueReminders`.
- `reconciliationRuns`, `bankTransactions` (bank reconciliation).
- `ipsTransactions`, `vpaRegistry`, `ipsApiLogs`, `ipsAlerts`, `ipsOnboardingApplications`, `ipsDeviceBindings`.
- `settlement*` tables (13) for DNS settlement backoffice workflows.
- `tigerBeetleOutbox`, `tigerBeetleAccounts`, `tigerBeetleTransfers`, `tigerBeetleReconciliation`.
- `systemConfiguration`, `creditScores`, `kycDocuments`.

**Status conventions (enforced by Convex schema validators)**

- `approvalRequests.status`: `pending`, `approved`, `rejected`, `escalated`, `withdrawn`.
- `loans.status`: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `funded`, `active`, `overdue`, `defaulted`, `paid_off`, `restructured`, `cancelled`, `written_off`.
- `disbursements.status`: `pending`, `processing`, `completed`, `failed`, `reversed`.
- `paymentTransactions.status`: `pending`, `processing`, `completed`, `failed`, `reversed`.

For exact schema, see `convex/schema.ts` (source of truth).

---

## Authentication & Authorization

- Auth managed via `@convex-dev/auth` (Password provider, session-based — no JWT).
- `ConvexAuthProvider` wraps the app; `useConvexAuth()` provides reactive auth state.
- Roles stored in `userRoles` Convex table; `ProtectedRoute` enforces role gating.
- `/admin/*` currently uses `requireAdmin` (admin-only; loan_officer blocked — open debt item).
- All server-side access controlled by auth guards in `convex/lib/auth.ts` (replaces RLS).
- New users trigger `afterUserCreatedOrUpdated` callback → seeds `profiles` + `userRoles`.

---

## Service Layer Overview

> **Note**: `src/services/` is legacy dead code. All active server logic is in `convex/`. The 4 files listed below are the ONLY remaining `src/services/` files with active consumers.

**Remaining legacy services (active consumers)**

- `src/services/brandingService.ts` — used by `useBrandingConfig` hook (inlined Supabase calls).
- `src/services/creditScoring.ts` — client-side AI scoring engine (re-exported via `src/utils/creditScoring.ts`).
- `src/services/scoringRules.ts` — imported by `creditScoring.ts`.
- `src/services/api-client.ts` — wraps Edge Functions (not a Supabase service; kept).

**Active Convex server functions**

- `convex/loans.ts` — Loan CRUD + state transitions (`createLoan`, `submitLoan`, `approveLoan`, `rejectLoan`).
- `convex/payments.ts` — Payment recording + schedules + overdue + settlement detection.
- `convex/disbursements.ts` — Disbursement state machine (initiate → process → complete/fail/reverse).
- `convex/approvalWorkflow.ts` — Approval queue, processing, workflow definitions.
- `convex/collections.ts` — Collections queue, interactions, promises-to-pay.
- `convex/notifications.ts` — In-app + queued notification lifecycle.
- `convex/analytics.ts` — Portfolio/revenue/risk analytics (staff-only).
- `convex/audit.ts` — Audit logs + compliance reports.
- `convex/users.ts` — User/profile management.
- `convex/reconciliation.ts` — Bank reconciliation.
- `convex/actions/ipsAdapter.ts` — IPS outbound transfers + webhook handling (mock mode).
- `convex/actions/processLoanApplication.ts` — Server-side loan processing + credit scoring.
- `convex/actions/sendSms.ts` / `sendWhatsapp.ts` / `sendNotification.ts` — External delivery.
- `convex/scheduled/tigerBeetleOutboxWorker.ts` — TB outbox polling (cron: every 30s).
- `convex/scheduled/dailyTasks.ts` — Overdue marking, PTP checks, notification queue (cron: 02:00 UTC).

---

## IPS/IPP and Settlement Status

- IPS adapter (`convex/actions/ipsAdapter.ts`) is mock; production IPS API, mTLS, and switch connectivity are not wired.
- `ipsTransactions`, `vpaRegistry`, `ipsApiLogs`, `ipsAlerts` tables exist; UI includes IPS health widgets.
- IPP onboarding uses Convex mutations for state and adapter actions for provider operations.
- Settlement schema (13 Convex tables) and processing exist; admin UI can create/process runs.
- File transport (SFTP/AXWAY/SWIFT/NISS) and ack ingestion are not implemented.

---

## Regulatory Compliance

- APR cap enforced server-side in `convex/lib/regulatory.ts` (`APR_LIMIT = 32`, `isValidAPR()`).
- APR cap also enforced client-side in `src/constants/regulatory.ts`.
- Currency format: `N$ X,XXX.XX` via `formatNAD()` from `@/utils/currency`.
- Data retention target: 7 years (never delete financial records or audit logs — Namibian law).
- KYC workflow: document upload (`kycDocuments` table) + approval requests + profile verification.

---

## Testing Overview

- Playwright E2E suite in `e2e/` (fixtures, API tests, UI flows).
- Unit/integration tests in `tests/` and `src/tests/` (Vitest not yet wired — open debt item).
- Run E2E: `npm run test:e2e` (Vite dev server uses port 8080).

See `docs/TESTING.md` for current test inventory.

---

## Deployment Notes

- Vite dev server runs on port `8080` (see `vite.config.ts`).
- Frontend: Netlify auto-deploys on push. Build command: `npm run build`.
- Backend: `npx convex deploy` deploys to Convex Cloud. Schema + functions sync automatically.
- Secrets: Set Convex environment variables via `npx convex env set KEY value` (never in `VITE_*`).
- Only `VITE_CONVEX_URL` is required in the client `.env` file.
- Debug tooling is gated by `VITE_DEBUG_TOOLS` and `VITE_RUN_DEV_SCRIPTS`.

Environment reference: `./.env.example`.

---

## Documentation Map

**Current (authoritative)**

- `docs/CLAUDE.MD` (root — primary AI agent context)
- `docs/context.md` (this file — technical handover)
- `docs/ARCHITECTURE.md` — system architecture with Convex diagrams
- `docs/DATABASE_SCHEMA.md` — Convex schema reference (55+ tables)
- `docs/SERVICES.md` — service migration status table
- `docs/SECURITY.md` — security model (auth guards, not RLS)
- `docs/TESTING.md` — E2E testing guide
- `docs/FLOWS.md` — user flow documentation
- `docs/FUNCTIONALITY_MAP.md` — feature-to-code mapping
- `docs/convexmigratehandover.md` — migration batch status + gotchas (critical reference)

**Feature-specific (current, detailed)**

- `docs/IPP_INTEGRATION.md` — IPS/IPP integration
- `docs/IPS_IMPLEMENTATION.md` — IPS system implementation
- `docs/TIGERBEETLE_IMPLEMENTATION.md` — TigerBeetle financial ledger
- `docs/settlement.md` — Settlement processing deep dive
- `docs/TECHNICAL_DEBT.md` — Outstanding technical debt register

**Historical or snapshot reports (reference only)**

- Release notes, audit reports, deployment checklists, market research files.
- See `docs/INDEX.md` for document status classifications.

---

## Key Files for Handover

- `convex/schema.ts` — **source of truth** for all table shapes and field names
- `convex/lib/auth.ts` — auth guards (security boundary)
- `convex/lib/audit.ts` — audit log scheduler helper
- `convex/lib/regulatory.ts` — APR limit + currency helpers
- `convex/loans.ts` — loan lifecycle mutations
- `convex/approvalWorkflow.ts` — approval queue
- `convex/disbursements.ts` — disbursement state machine
- `convex/payments.ts` — payment processing
- `convex/actions/ipsAdapter.ts` — IPS integration (mock)
- `src/App.tsx` — routing + provider stack
- `src/hooks/useAuth.tsx` — auth + role handling
- `src/integrations/convex/api.ts` — Convex API re-exports
- `e2e/fixtures.ts` — Playwright auth isolation
- `e2e/helpers/auth.ts` — login utilities
