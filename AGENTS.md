# NamLend Trust - AI Agent Guidelines

## Project Overview

NamLend Trust is a digital lending platform serving the Namibian market. The active web platform is a React/Vite frontend backed by Convex Auth, Convex database tables, Convex queries/mutations/actions, Convex HTTP routes, and Convex scheduled jobs.

Supabase remains in the repository for legacy/reference material and selected migration-debt paths. Do not use Supabase/RLS/RPC patterns for new application work.

## Critical Constraints

### Regulatory Requirements

- **Maximum APR: 32%** - Never create or approve loans exceeding this limit.
- **Currency: NAD** - Format as `N$ X,XXX.XX`.
- **Data Retention: 7 years** - Never hard-delete production financial records.
- **KYC Compliance** - Client lending flows must respect verified KYC requirements.

### Security Requirements

- **Convex auth guards** - Every public Convex query/mutation touching user data must call the correct guard from `convex/lib/auth.ts`.
- **Object-level authorization** - Authenticated is not enough; enforce owner, owner-or-staff, staff, or admin access as appropriate.
- **Audit trails** - Financial operations must schedule audit/event writes through Convex audit helpers.
- **Role-based access** - Keep tenant roles (`client`, `loan_officer`, `admin`, `tenant_admin`) distinct from platform roles (`platform_owner`, `platform_support`).
- **No sensitive logging** - Do not expose PII, financial data, credentials, or raw provider payloads in client logs/errors.

## Technology Stack

```bash
Frontend: React 18.3.1, TypeScript, Vite, TailwindCSS, shadcn/ui
Backend: Convex, Convex Auth, Convex HTTP router, Convex scheduled jobs
Legacy: Supabase migrations/functions/client retained for reference and selected migration-debt paths
Testing: Playwright E2E, Vitest unit tests
Deployment: Netlify frontend, Convex backend
```

## Key Commands

```bash
# Development
npm run dev
npm run build
npm run typecheck
npm run lint

# Testing
npm run test:unit
npm run test:convex
npm run test:e2e
npm run ontology:check
npm run ontology:test
npm run agent:policy
npx playwright test --ui

# Convex
npx convex dev
npx convex deploy
```

`npm run typecheck` runs `tsc -b` and is the release gate for TypeScript.

## Active File Structure

```text
src/
├── components/     # Reusable UI components and adaptive primitives
├── pages/          # Route components
├── hooks/          # Custom React hooks
├── context/        # React Context providers
├── integrations/   # Convex client/API re-export; legacy Supabase client
├── types/          # TypeScript type definitions
└── constants/      # Regulatory and app constants

convex/
├── schema.ts       # Source of truth for active data model
├── *.ts            # Domain queries/mutations
├── actions/        # External IO
├── scheduled/      # Cron workers
├── ontology/       # Financial Ontology Engine modules
└── lib/            # Auth, audit, events, rules, IPS helpers

supabase/
├── migrations/     # Legacy/reference SQL migrations
└── functions/      # Legacy/reference Edge Functions
```

## Code Style Preferences

- Use `async/await` over Promise chains.
- Use Convex validators and server-side checks for runtime boundaries.
- Use TanStack Query only where appropriate for non-Convex client state; Convex `useQuery` is the default server-state path.
- Format currency with `N$` prefix and 2 decimal places.
- Do not add new business logic to `src/services/`; new backend behavior belongs in `convex/`.
- Follow the Neo-Fintech design system and adaptive UI guidance.

## Before Making Changes

1. Check whether the relevant Convex module already exists.
2. Verify APR calculations do not exceed 32%.
3. Confirm the correct auth guard and object-level authorization.
4. Add or preserve audit logging for financial operations.
5. Avoid hard deletes for financial/compliance records.
6. Test relevant mobile/adaptive viewport behavior for UI changes.

## Important Files

- `convex/schema.ts` - Active schema source of truth
- `convex/lib/auth.ts` - Authorization guards
- `convex/lib/audit.ts` - Audit/event bridge helpers
- `convex/loans.ts` - Loan lifecycle
- `convex/payments.ts` - Payment processing
- `convex/disbursements.ts` - Disbursement lifecycle
- `docs/ARCHITECTURE.md` - Current architecture
- `docs/ARCHITECTURAL_REVIEW.md` - Current flaws, risks, and remediation roadmap
- `docs/SERVICES.md` - Service layer and legacy island inventory
- `docs/AI_ENGINEERING_HARNESS.md` - Agent contracts, graph boundaries, risk tiers, and promotion gates

## Agent Harness Boundary

The NamLend ontology is authoritative for system inventory, evidence, and impact.
Graphify is an optional local discovery sidecar and cannot establish E0/E1 facts.
Autonomous work is limited to policy-validated R0/R1 tasks; humans retain merge,
deployment, production, schema, financial, auth, security, and agent-policy authority.

## Cursor Cloud specific instructions

Scope: these notes cover the **web portal** (repo root: React/Vite frontend + Convex
backend), which is the primary product. `namlend-mobile/` is a separate Expo /
Supabase-backed app and is NOT set up by the startup update script; run `npm ci`
inside `namlend-mobile/` only when doing mobile work.

### Node toolchain (important gotcha)

- The repo pins Node `22.23.2` / npm `10.9.8` (`.nvmrc`, `package.json` `engines`)
  and `.npmrc` sets `engine-strict=true`, so npm **fails** unless the running Node is
  exactly `22.23.2`. The VM's default `/exec-daemon/node` is a different version and is
  force-prepended to `PATH` ahead of nvm, so `nvm use` alone is not enough.
- The startup update script installs `22.23.2` via nvm and runs `npm ci` through
  `nvm exec 22.23.2`, which pins Node regardless of `PATH`.
- Interactive shells: `~/.bashrc` has been configured to prepend the nvm `22.23.2`
  bin dir, so a normal login shell resolves the correct `node`/`npm`. If you spawn a
  non-login shell and hit an engine error, run commands via `nvm exec 22.23.2 <cmd>`
  or `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"` first.

### Running the app (two services)

- Frontend: `npm run dev` → Vite on `http://localhost:8080`.
- Backend: the frontend needs a reachable `VITE_CONVEX_URL`. For isolated local dev,
  run a local Convex deployment in agent mode:
  `CONVEX_AGENT_MODE=anonymous npx convex dev --typecheck=disable`. This writes
  `VITE_CONVEX_URL=http://127.0.0.1:3210` to `.env.local`. Do NOT point local dev at
  the production deployment in `convex.json`.
- `--typecheck=disable` is required for `npx convex dev`: the Convex CLI typechecks
  `convex/**/*.test.ts` via `convex/tsconfig.json`, and those test files use Vite's
  `import.meta.glob`, which fails the CLI's `tsc`. The real TS gate is `npm run
typecheck` (`tsc -b`), and backend tests run via `npm run test:convex`.

### Convex Auth env vars (required for login to work)

- The Password auth provider needs `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` set on the
  Convex deployment. A fresh local anonymous deployment starts WITHOUT them, so sign-in
  appears to succeed but the session fails to validate and protected routes bounce back
  to `/auth`. These are per-deployment (not repo) and must be reset on each new local
  deployment. Generate an RS256 keypair (via `jose`, matching `@convex-dev/auth`) and:
  `npx convex env set JWT_PRIVATE_KEY -- "<pkcs8, newlines->spaces>"`,
  `npx convex env set JWKS -- '<{"keys":[{"use":"sig",...}]}>'`,
  `npx convex env set SITE_URL http://localhost:8080`.

### Ports

- `8080` Vite dev server, `3210` Convex backend, `3211` Convex HTTP actions.
