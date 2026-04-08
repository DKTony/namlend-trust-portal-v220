# CLAUDE.MD - AI Agent Context for NamLend Trust Platform

**Last Updated**: April 9, 2026 | **Version**: 5.2.3 | **Backend**: Convex (migrated from Supabase Feb 2026)

NamLend Trust is a loan management platform for the Namibian market. React 18.3 + TypeScript frontend, Convex backend, TigerBeetle financial ledger (shadow mode), Neo-Fintech "Black Card" design system.

**Live**: https://namlend-trust-portal-v220.netlify.app | **Convex Dashboard**: `npx convex dashboard`

## Critical Constraints — READ FIRST

### Regulatory (HARD LIMITS — Namibian law)

1. **Maximum APR: 32%** — NEVER exceed. Use `isValidAPR()` from `convex/lib/regulatory.ts` (server) or `@/constants/regulatory` (client)
2. **Currency: NAD** — Format as `N$ X,XXX.XX` using `formatNAD()`. NEVER use `formatCurrency()` from `@/lib/utils` (renders "R" not "N$")
3. **Data Retention: 7 years** — NEVER delete financial records or audit logs
4. **KYC Compliance** — Identity verification required before loan approval

### Security (NON-NEGOTIABLE)

1. **Auth Guards** — Every Convex query/mutation MUST call `assertAuthenticated`, `assertStaff`, or `assertAdmin` from `convex/lib/auth.ts`
2. **Audit Trails** — All financial operations MUST log via `scheduleAuditLog()` from `convex/lib/audit.ts`
3. **Roles** — `client`, `loan_officer`, `admin` (stored in `userRoles` table)
4. **No Secret Exposure** — Only `VITE_*` vars are client-side; Convex env vars are server-only
5. **PII Protection** — Never log or expose personally identifiable information
6. **External IO** — Only in Convex `action` functions, NEVER in queries or mutations
7. **Input Validation** — Use Convex validators (`v.string()`, etc.) in function `args`

### Architecture

1. **Mobile-First** — All UI must work on 375px minimum
2. **Reactive** — Use `useQuery(api.module.fn)` for live data, `useMutation(api.module.fn)` for writes
3. **Atomic** — Every Convex mutation is automatically transactional (serializable isolation)
4. **TigerBeetle Shadow Mode** — Financial ledger records but doesn't control flow; outbox in Convex DB
5. **No Supabase for new code** — All new backend logic goes in `convex/`, not `src/services/`
6. **DashboardLayout for all client pages** — Use `DashboardLayout` (sidebar), NOT `Header`. `Header` is only for the public landing page.

## Tech Stack

```
Frontend: React 18.3.1, Vite 5.4.1 (port 8080), TailwindCSS 3.4 + shadcn/ui, Convex React client
Backend:  Convex (67+ tables in schema.ts), @convex-dev/auth (Password provider)
Ledger:   TigerBeetle v0.16.67 (shadow mode, 127.0.0.1:3001)
Testing:  Playwright 1.47.2 (45+ E2E test files)
Deploy:   Netlify (frontend), Convex Cloud (backend)
```

## Commands

```bash
npm run dev              # Frontend dev server (port 8080)
npx convex dev           # Convex dev server (auto-syncs schema + functions)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright UI mode
npm run build            # Production build
npx convex deploy        # Deploy backend to Convex Cloud
```

### Test Credentials

```
client1@test.namlend.com / Test1234!       → /dashboard
client2@test.namlend.com / Test1234!       → /dashboard
admin@test.namlend.com / Test1234!         → /admin
loan_officer@test.namlend.com / Test1234!  → /admin
```

## Key Architecture Patterns

### Data Flow

- **Read**: `useQuery(api.module.fn)` → auth guard → DB → reactive auto-update
- **Write**: `useMutation(api.module.fn)` → auth guard → atomic DB write → audit log via scheduler
- **Financial**: Mutation → DB write + TigerBeetle outbox entry (same tx) → cron worker posts to TB
- **External APIs**: Convex actions (`actions/*.ts`) for IPS, SMS, WhatsApp — use `ctx.runMutation()` for DB writes

### Approval Workflow

`draft → submitted → under_review → approved → funded → active` (or `→ rejected`). All transitions through `convex/approvalWorkflow.ts`. See [FLOWS.md](./docs/FLOWS.md).

### Key Backend Directories

- `convex/lib/` — Auth guards, audit, regulatory, event emitter, rule evaluator, rail selector
- `convex/ontology/` — Financial Ontology Engine (event journal, relationships, mandates, institutions, products, accounts, snapshots)
- `convex/actions/` — External IO (IPS, SMS, WhatsApp). Files here MUST have `"use node"` directive
- `convex/scheduled/` — Cron handlers (TB outbox, daily tasks, mandate execution, snapshots, rail health)
- `convex/_generated/` — Auto-generated types. DO NOT EDIT

### Design Philosophy

Every change must improve **Execution Certainty** (can money move?), **Authorization Certainty** (who agreed?), or **Financial Truth** (what happened?). Features must add to the ontology, not just the UI. See [ONTOLOGY_ENGINE.md](./docs/ONTOLOGY_ENGINE.md) for the Five Primitives (Entity, Relationship, Event, Rule, Projection).

## Common Pitfalls

### 1. APR Exceeding 32%
```typescript
import { isValidAPR } from "./lib/regulatory";
if (!isValidAPR(requestedAPR)) throw new ConvexError("Exceeds legal limit");
```

### 2. Missing Auth Guards
```typescript
// WRONG: export const fn = query({ handler: async (ctx) => ctx.db.query("loans").collect() });
// CORRECT: call assertStaff(ctx) or assertAuthenticated(ctx) before any DB access
```

### 3. Wrong Currency Formatter
```typescript
// WRONG: formatCurrency() from @/lib/utils → renders "R"
// CORRECT: formatNAD() from @/constants/regulatory → renders "N$"
```

## Current Status

- **Legacy**: `src/services/` (~25 files) still reference Supabase — do NOT add new code here
- **TypeScript**: strict mode disabled; ~20 `as any` casts remain (tests, admin stubs)
- **TigerBeetle**: shadow mode (not primary ledger yet)
- **CI/CD**: no pipeline yet (no GitHub Actions for Convex deploy)
- **Test coverage**: Backoffice UI ~30%

See [FUNCTIONALITY_MAP.md](./docs/FUNCTIONALITY_MAP.md) for complete feature wiring status.

## Documentation

Start with [docs/INDEX.md](./docs/INDEX.md). Key references:

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, routes, layouts, Convex function types |
| [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | 67+ Convex tables, indexes, field definitions |
| [SECURITY.md](./docs/SECURITY.md) | Auth model, role guards, audit trail requirements |
| [ONTOLOGY_ENGINE.md](./docs/ONTOLOGY_ENGINE.md) | Five Primitives, event journal, projections, business rules |
| [DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) | Neo-Fintech visual spec (colors, typography, components) |
| [UI_DESIGN.md](./docs/UI_DESIGN.md) | Theme context implementation, sidebar, responsive patterns |
| [TESTING.md](./docs/TESTING.md) | Playwright E2E setup, test patterns, fixtures |
| [FLOWS.md](./docs/FLOWS.md) | Transaction flow diagrams (loan lifecycle, payments, IPS) |
| [FUNCTIONALITY_MAP.md](./docs/FUNCTIONALITY_MAP.md) | Feature → API → table wiring map |
| [AGENTS.md](./docs/AGENTS.md) | AI agent integration patterns |

---

**This is a production financial system. Every change must be tested, audited, and compliant with Namibian regulations. All new backend logic goes in `convex/`, not `supabase/` or `src/services/`.**
