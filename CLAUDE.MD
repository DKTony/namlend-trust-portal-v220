# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NamLend Trust is a Convex-first digital lending platform for the Namibian market (React 18 + Vite SPA frontend, Convex backend). `AGENTS.md` holds the regulatory/security constraints and code-style rules — read it; they are non-negotiable (APR ≤ 32%, NAD formatting, 7-year retention / no hard deletes, explicit Convex auth guards, audit on every financial write). This file covers the build/test commands and the cross-cutting architecture you can't see from any single file.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:8080
npm run build          # Production build → dist/ (vite build; NB: no typecheck — see gotchas)
npm run lint           # ESLint
npm run format         # Prettier write over src/

# Unit tests (Vitest, jsdom) — files: src/**/*.test.{ts,tsx}
npm run test:unit                              # run all once
npx vitest run src/tests/regulatory.test.ts    # single file
npx vitest -t "APR"                            # single test by name (watch)

# E2E (Playwright, testDir ./e2e) — auto-starts dev:e2e on :8080 via webServer
npm run test:e2e
npx playwright test e2e/loan-application.e2e.ts           # single spec
npx playwright test -g "admin approves loan"              # by title
npm run test:e2e:ui                                       # interactive

# Convex backend
npx convex dev                                 # local backend + codegen watch (regenerates convex/_generated)
npx convex deploy
npx convex env set IPS_CLIENT_ID <val>         # server secrets are Convex env vars, NOT VITE_ vars
```

Single required env var for local dev: `VITE_CONVEX_URL` (see `.env.example`). E2E needs `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`.

## Architecture: the parts that span multiple files

**Convex is the entire backend and the source of truth.** `convex/schema.ts` (~2k lines) is the live data model. `src/services/` and `supabase/` are described as legacy/reference — but a few Supabase paths are still *imported by live code* (e.g. `src/utils/serviceRoleAssignment.ts`, `src/services/brandingService.ts`), so "legacy" does not always mean "dead." New backend logic goes in `convex/`, never `src/services/`.

**Authorization is explicit and centralized — there is no RLS.** Every public query/mutation calls a guard from `convex/lib/auth.ts`: `assertAuthenticated` / `assertOwner` / `assertOwnerOrStaff` / `assertStaff` / `assertAdmin`. Object-level authz means: load the row, resolve its owner, then assert against *that* — being authenticated is never sufficient. Roles (`client` | `loan_officer` | `admin`) live in the Convex `userRoles` table, which is what every guard reads.

**Financial mutations follow one consistent shape** (see `convex/payments.ts`, `disbursements.ts`, `loans.ts` as the canonical examples). A single mutation atomically:
1. Guards + validates (state-machine check on `status`, amount/APR validation).
2. Applies an **idempotency guard** (recent-duplicate window, or dedupe on `externalTransactionId` / `referenceNumber` / a pending row) — financial mutations are designed to be safely retried.
3. Writes the domain row.
4. **Enqueues a `tigerBeetleOutbox` row in the same transaction** — amounts in **cents** (`Math.round(x * 100)`) with a transfer `code`. This is the transactional-outbox pattern: the ledger entry exists iff the DB write committed.
5. Emits side effects via `scheduleAuditLog` / `scheduleAuditEntry` (`convex/lib/audit.ts`), `emitDomainEvent`, and `emitRelationship`.

**Two ledgers run in parallel.** Convex holds the authoritative `loan.outstandingBalance` / `totalPaid`; TigerBeetle is a shadow ledger fed by the outbox. `convex/scheduled/tigerBeetleOutboxWorker.ts` (cron, every 30s) claims pending outbox rows and POSTs to `TIGERBEETLE_HTTP_URL`, or "simulates" success when unset. When touching money, keep both ledgers consistent and keep all outbox amounts in cents — a producer that emits NAD instead of cents silently corrupts the shadow ledger.

**The audit/event layer is fire-and-forget by design.** `scheduleAuditLog` uses `ctx.scheduler.runAfter(0, ...)` so an audit-write failure can never roll back or block a financial op, and it *also* writes an `eventJournal` entry — the same call feeds both the legacy audit log and the ontology event stream.

**Ontology Engine (`convex/ontology/`).** A second modeling layer over the lending tables: `eventJournal` (append-only event stream), `relationships` (entity graph, e.g. `user -borrowed-> loan`), `snapshots`, `mandates` + `mandateExecutions` (the automated-debit "hard path" for collections, run by `convex/scheduled/mandateExecutor.ts`), `products`/`productVersions` (loan product config validated at `createLoan`), `paymentRails` + `businessRules`. Rules are data-driven via `convex/lib/ruleEvaluator.ts` (`getNumericRule('APR_LIMIT', 32)` etc.) — limits read from the `businessRules` table with hardcoded fallbacks, so behavior is identical before any rule is seeded.

**External I/O lives in actions, never mutations.** `convex/actions/` (`'use node'`) and `convex/ips/` handle IPS/IPP (Bank of Namibia instant payments, XML + legacy JSON), SMS/WhatsApp, and credit scoring. Webhooks land in `convex/http.ts` (`/webhook/ips`, `/webhook/payment`) with RSA-SHA256 (XML) / HMAC-SHA256 (JSON) signature verification that **fails closed in production** (`convex/lib/ipsProductionConfig.ts`). `convex/settlement/` implements clearing/netting/PACS settlement flows.

**Loan lifecycle:** `draft → submitted → under_review → approved → funded → active → paid_off` (plus `rejected`, `written_off`). `submitLoan` schedules `processLoanApplication` (credit scoring) which creates a back-office approval request; approval/disbursement transition the loan and enqueue ledger entries. Status transitions are enforced per-mutation — don't patch `status` directly outside the owning mutation (`batchUpdateLoanStatus` deliberately blocks terminal/financial statuses for this reason).

**Frontend Convex boundary.** Components use `useQuery`/`useMutation` from `convex/react` against `@/integrations/convex/api`. `src/hooks/useAuth.tsx` wraps Convex Auth but exposes a Supabase-shaped `User`/`Session` so legacy consumers didn't need rewriting. UI gates (e.g. `useKYCEligibility`) are UX only — the authoritative check must also exist server-side in the Convex mutation.

## Verified gotchas

- **There is no working typecheck gate.** `npx tsc --noEmit` (what the docs cite) compiles *zero* files — root `tsconfig.json` has `"files": []` and, without `-b`, ignores the project references. The real check is `npx tsc -b` (honors `tsconfig.app.json` `strict: true`) and it currently reports many errors. `npm run build` is `vite build` (esbuild, strips types) and type-checks nothing. Use `npx tsc -b` to actually validate types.
- **Editing `convex/schema.ts` or any Convex function requires `npx convex dev` running** to regenerate `convex/_generated`; stale codegen produces misleading type errors.
- **Server secrets are Convex env vars, not `VITE_`** — anything in `import.meta.env.VITE_*` is shipped to the browser. IPS/SMS/WhatsApp/TigerBeetle keys go through `npx convex env set`.
- **E2E/test SQL helpers hard-delete records**, which contradicts the 7-year-retention rule the app enforces — don't copy that pattern into application code.

## Key references

`convex/schema.ts` (data model) · `convex/lib/auth.ts` (guards) · `convex/lib/audit.ts` (audit/event bridge) · `convex/lib/regulatory.ts` (APR/NAD) · `convex/loans.ts` · `convex/payments.ts` · `convex/disbursements.ts` · `convex/http.ts` (webhooks) · `convex/crons.ts` (scheduled jobs) · `docs/ARCHITECTURE.md` · `docs/TECHNICAL_DEBT.md` (honest, current risk list).
