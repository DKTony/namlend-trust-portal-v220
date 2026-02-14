# NamLend Trust - Technical Context & Handover

**Doc Revision**: 2026-01-19  \
**Status**: Core lending + backoffice flows implemented; external integrations are wired but depend on secrets; IPS adapter runs in mock mode; TigerBeetle uses outbox worker with simulated client.  \
**Supabase Project ID**: `puahejtaskncpazjyxqp`  \
**Database Region**: `eu-north-1`

---

## Executive Summary

NamLend Trust is a React SPA backed by Supabase (PostgreSQL + Auth + Edge Functions) that delivers a full loan lifecycle: application intake, approval workflow, disbursement, repayment scheduling, collections, notifications, and admin operations. The codebase also includes IPS/IPP integration scaffolding (mock adapter), settlement/backoffice workflows, and a TigerBeetle outbox ledger bridge.

**What is implemented in code**

- Loan application flow submits approval requests and enforces APR limit in UI validation.
- Admin approval workflow with queue, review, and atomic loan creation via RPC.
- Disbursement workflow with manual completion and IPS initiation options.
- Payment processing with schedules, overdue marking, and reconciliation tools.
- Collections workflow including activity logging, promise-to-pay, and reschedule requests.
- Notification, SMS, and WhatsApp pipelines (queued + Edge Functions for delivery).
- IPS/IPP onboarding wizard, VPA registry, and transaction status monitoring (mock adapter).
- Settlement schema + processing RPCs + admin reconciliation UI (transport not implemented).
- TigerBeetle outbox schema + worker; browser uses outbox, direct client only in Node.

**Key gaps (handover risks)**

- IPS adapter is mock; production API, mTLS, and switch connectivity are not wired.
- TigerBeetle Edge worker simulates TB posting; real cluster connectivity is pending.
- Admin route guard is admin-only; loan_officer access is blocked at router level.
- Reconciliation schema drift exists between newer migrations and legacy client/types.
- Several docs still reference historical snapshots; see Documentation Map below.

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
| --- | --- | --- |
| React | 18.3.1 | UI framework |
| TypeScript | 5.5.3 | Type safety |
| Vite | 5.4.1 | Build tool |
| TailwindCSS | 3.4.11 | Styling |
| shadcn/ui | Current | UI primitives |
| TanStack Query | 5.56.2 | Server state |
| React Router | 6.26.2 | Routing |
| React Hook Form | 7.53.0 | Forms |
| Zod | 3.23.8 | Validation |
| Lucide Icons | 0.462.0 | Icons |

### Backend (Supabase)

| Component | Purpose |
| --- | --- |
| PostgreSQL 15+ | Primary database |
| Supabase Auth | Authentication and sessions |
| Row Level Security | Data access control |
| Edge Functions | Server-side operations |
| Storage Buckets | Document storage |
| Realtime | Optional subscriptions |

### Infrastructure

| Component | Purpose |
| --- | --- |
| Netlify | Frontend hosting |
| Supabase Cloud | DB/Auth/Functions |
| GitHub Actions | CI workflows (web, mobile, e2e) |
| Playwright | E2E testing |

---

## Repository Structure

```
namlend-trust-portal-v220-main/
├── src/
│   ├── components/         # UI components (shadcn + custom)
│   ├── pages/              # Route pages (client + admin)
│   ├── services/           # Business logic + RPC wrappers
│   ├── hooks/              # React Query + custom hooks
│   ├── integrations/       # Supabase client + types
│   ├── types/              # Domain types
│   ├── utils/              # Helpers, debug tooling
│   └── constants/          # Regulatory constants
├── supabase/
│   ├── migrations/         # Database migrations
│   ├── functions/          # Edge Functions (Deno)
│   └── config.toml          # Local Supabase config
├── e2e/                    # Playwright E2E tests + fixtures
├── tests/                  # Unit/integration tests
├── docs/                   # Documentation (this folder)
└── namlend-mobile/         # Separate React Native app (see subfolder docs)
```

---

## Core Domain Model (Summary)

**Primary entities**

- `profiles` and `user_roles` (role-based access control, multi-role supported).
- `approval_requests` + `approval_workflow_history` + `approval_notifications`.
- `loans`, `disbursements`, `payments`, `payment_schedules`.
- `audit_logs`, `view_logs`, `state_transitions`.
- `notification_*` and `communication_logs` (SMS/WhatsApp).
- `collections_*`, `promise_to_pay`, `reschedule_requests`.
- `reconciliation_runs`, `bank_transactions` (bank reconciliation system).
- `ips_*` tables for IPS/IPP transactions and onboarding state.
- `settlement_*` tables for DNS settlement backoffice workflows.
- `tigerbeetle_*` tables for outbox + shadow ledger.

**Status conventions (not DB-enforced)**

- `approval_requests.status`: `pending`, `under_review`, `approved`, `rejected`, `requires_info`.
- `loans.status`: `pending`, `approved`, `disbursed`, `active`, `funded`, `settled`, `completed`, `defaulted`, `rejected`.
- `disbursements.status`: `pending`, `approved`, `processing`, `completed`, `failed`.
- `payments.status`: `pending`, `completed`, `failed`.

For exact schemas and columns, see `supabase/migrations/` and `src/integrations/supabase/types.ts`.

---

## Authentication & Authorization

- Auth managed via Supabase with session persistence in `localStorage` key `namlend-auth`.
- Roles stored in `user_roles` with precedence `admin` > `loan_officer` > `client`.
- `ProtectedRoute` enforces authentication and role gating; `/admin/*` currently uses `requireAdmin` (admin-only).
- Edge Functions validate JWT and enforce staff roles for privileged actions.

---

## Service Layer Overview

**Loan + approvals**

- `approvalWorkflow.ts`: approval request CRUD, admin queue, `process_approval_transaction` RPC.
- `loanService.ts`: loan status updates and disbursement creation helpers.

**Disbursements and payments**

- `disbursementService.ts`: RPC-driven state machine and ledger outbox posts.
- `paymentService.ts`: `process_loan_payment`, schedules, overdue, late fees.
- `paymentGateway.ts`: bank transfer, mobile money, PayToday, cash (manual instructions + tracking).

**IPS/IPP**

- `ipsService.ts`: IPS payments and VPA management (calls `ips-adapter` Edge Function).
- `ipsOnboardingService.ts`: onboarding workflow (RPC + adapter endpoints).

**Collections + reconciliation**

- `collectionsService.ts`: queue, interactions, promises, reschedules.
- `reconciliationService.ts`: bank transaction import and payment matching.

**Ledger and settlement**

- `ledgerService.ts`: TigerBeetle outbox; direct TB client only in Node.
- `settlementService.ts`: settlement runs, pacs.009, reports, adjustments.

**Admin + support**

- `adminService.ts`: admin profile and role data.
- `roleManagementService.ts`: role hierarchy enforcement via RPCs.
- `workflowEngine.ts`: multi-stage workflow engine via RPCs.
- `auditService.ts`: audit log and state transitions.
- `notificationService.ts`: notifications, preferences, realtime subscription.

---

## Edge Functions

Located in `supabase/functions/`:

- `ips-adapter`: IPS mock adapter (pay, validate, status, onboarding endpoints).
- `payment-webhook`: PayToday/MTC/TN webhook handler (HMAC verification).
- `process-loan-application`: server-side loan review status update (not called by SPA).
- `scheduled-tasks`: overdue marking, notification queue, reminders, broken promises.
- `send-notification`: staff-triggered in-app notification creation.
- `send-sms`: Africa's Talking integration (requires secrets).
- `send-whatsapp`: Meta Cloud API integration (requires secrets).
- `tigerbeetle-outbox-worker`: processes outbox entries (simulated TB posting).
- `api-*`: orchestration layer (loans, users, payments, admin, analytics, audit, collections, disbursements, reconciliation, notifications).

---

## IPS/IPP and Settlement Status

- IPS adapter is mock; production IPS API, mTLS, and switch connectivity are pending.
- IPS monitoring RPCs and alert tables exist; UI includes IPS health widgets.
- IPP onboarding uses RPCs for state and adapter endpoints for provider operations.
- Settlement schema and processing RPCs exist; admin UI can create/process runs.
- File transport (SFTP/AXWAY/SWIFT/NISS) and ack ingestion are not implemented.

---

## Regulatory Compliance

- APR cap enforced in UI and services via `APR_LIMIT = 32`.
- Currency format: `N$ X,XXX.XX` via `formatNAD()`.
- Data retention target: 7 years (no deletions of financial records).
- KYC workflow: document upload + approval requests + profile verification.

---

## Testing Overview

- Playwright E2E suite in `e2e/` (fixtures, API/RLS, UI flows).
- Unit/integration tests in `tests/` and `src/tests/`.
- Run E2E: `npm run test:e2e` (Vite dev server uses port 8080).

See `docs/TESTING.md` for current test inventory.

---

## Deployment Notes

- Vite dev server runs on port `8080` (see `vite.config.ts`).
- Do not expose service role keys in client; use Edge Function secrets.
- Debug tooling is gated by `VITE_DEBUG_TOOLS` and `VITE_RUN_DEV_SCRIPTS`.

Environment reference: `./.env.example` and `docs/DEPLOYMENT_2026_01_06.md` (historical).

---

## Documentation Map

**Current (authoritative)**

- `docs/context.md` (this file)
- `docs/ARCHITECTURE.md`
- `docs/SERVICES.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/FLOWS.md`
- `docs/FUNCTIONALITY_MAP.md`

**Feature-specific (current, detailed)**

- `docs/IPS_IMPLEMENTATION.md`
- `docs/IPP_INTEGRATION.md`
- `docs/TIGERBEETLE_IMPLEMENTATION.md`
- `docs/settlement.md`

**Historical or snapshot reports (reference only)**

- Release notes, audit reports, deployment checklists, and market research files.
- These have been marked as snapshots where applicable.

---

## Key Files for Handover

- `src/App.tsx` (routing + providers)
- `src/hooks/useAuth.tsx` (auth + role handling)
- `src/services/approvalWorkflow.ts`
- `src/services/disbursementService.ts`
- `src/services/paymentService.ts`
- `src/services/ipsService.ts`
- `src/services/ipsOnboardingService.ts`
- `src/services/ledgerService.ts`
- `src/services/settlementService.ts`
- `supabase/migrations/` (schema source of truth)
- `supabase/functions/` (Edge Functions)
- `e2e/fixtures.ts` (Playwright auth isolation)
