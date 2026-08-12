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
