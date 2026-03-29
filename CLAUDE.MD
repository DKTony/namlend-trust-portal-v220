# CLAUDE.MD - AI Agent Context for NamLend Trust Platform

**Last Updated**: March 29, 2026 | **Version**: 5.2.1 | **Backend**: Convex (migrated from Supabase Feb 2026)

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

```
Application → Under Review → Approved → Funded → Active
                    ↓
                Rejected (terminal)
```

All transitions through `convex/approvalWorkflow.ts`.

### Key Backend Directories

- `convex/lib/` — Auth guards, audit, regulatory, event emitter, rule evaluator, rail selector
- `convex/ontology/` — Financial Ontology Engine (event journal, relationships, mandates, institutions, products, accounts, snapshots)
- `convex/actions/` — External IO (IPS, SMS, WhatsApp). Files here MUST have `"use node"` directive
- `convex/scheduled/` — Cron handlers (TB outbox, daily tasks, mandate execution, snapshots, rail health)
- `convex/_generated/` — Auto-generated types. DO NOT EDIT

### Legacy (`src/services/`) — Migration In Progress

~25 files still reference Supabase client. Do NOT add new code here. `src/integrations/supabase/client.ts` retained for legacy hooks only.

## Design Philosophy

### The Three Certainties

Every change must improve at least one:

1. **Execution Certainty** — Can money move when it should?
2. **Authorization Certainty** — Can you prove who agreed to what?
3. **Financial Truth** — Can you prove what actually happened?

### The Iron Rule

Every feature must add a row to the ontology, not just a screen to the UI.

### Five Ontology Primitives

| Primitive | What It Represents | Examples |
|-----------|-------------------|----------|
| **Entity** | A noun in the financial world | Person, Institution, Account, Loan, Product, PaymentRail, Mandate |
| **Relationship** | A typed, temporal edge | Person→guarantees→Loan, Mandate→governs→Loan |
| **Event** | An immutable fact | loan.approved, payment.completed, mandate.executed |
| **Rule** | A constraint or policy | APR ≤ 32%, MIN_CREDIT_SCORE, RAIL_WEIGHTS |
| **Projection** | A derived, queryable view | portfolioMetrics, loan balance, settlement position |

## Design System (Neo-Fintech)

- **Components**: shadcn/ui from `src/components/ui/` + custom themed wrappers (`ThemedButton`, `ThemedCard`, etc.)
- **Style**: `rounded-3xl` cards, `rounded-xl` buttons, `shadow-soft`/`shadow-glow` (see `tailwind.config.ts`)
- **Typography**: Inter (sans), Playfair Display (serif), Space Grotesk (mono)
- **Colors**: See `tailwind.config.ts`. Primary: Zinc/Black, Accent: Electric Blue (#0EA5E9)
- **Icons**: Lucide React

## Common Pitfalls

### 1. APR Exceeding 32%
```typescript
// ALWAYS validate with regulatory helper
import { isValidAPR } from "./lib/regulatory";
if (!isValidAPR(requestedAPR)) throw new ConvexError("Exceeds legal limit");
```

### 2. Missing Auth Guards
```typescript
// WRONG — unprotected
export const getAllLoans = query({
  handler: async (ctx) => ctx.db.query("loans").collect(),
});
// CORRECT
export const getAllLoans = query({
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query("loans").collect();
  },
});
```

### 3. Missing Audit Logs
```typescript
// CORRECT — includes audit via scheduler
import { scheduleAuditLog } from "./lib/audit";
const old = await ctx.db.get(loanId);
await ctx.db.patch(loanId, { status: "approved" });
await scheduleAuditLog(ctx, {
  action: "UPDATE", entityType: "loans", entityId: loanId,
  oldState: old, newState: { ...old, status: "approved" },
});
```

### 4. External IO in Mutations
```typescript
// WRONG — mutations cannot make HTTP calls
export const sendSms = mutation({ handler: async (ctx, args) => {
  await fetch("https://api.africastalking.com/..."); // WILL FAIL
}});
// CORRECT — use action
export const sendSms = action({ handler: async (ctx, args) => {
  await fetch("https://api.africastalking.com/...");
  await ctx.runMutation(internal.notifications.updateStatus, { ... });
}});
```

### 5. Using Legacy Supabase
```typescript
// WRONG
import { supabase } from '@/integrations/supabase/client';
// CORRECT
import { useQuery } from "convex/react";
import { api } from "@/integrations/convex/api";
const loans = useQuery(api.loans.getMyLoans);
```

### 6. Wrong Currency Formatter
```typescript
// WRONG — formatCurrency uses en-ZA locale, renders "R"
import { formatCurrency } from '@/lib/utils';
// CORRECT — formatNAD renders "N$"
import { formatNAD } from '@/constants/regulatory';
```

## Common Tasks

### Adding a New Feature
1. Check existing `convex/*.ts` — don't duplicate
2. Add query/mutation with auth guards
3. Create/update components using `useQuery`/`useMutation`
4. Add E2E test in `e2e/`

### Modifying Loan Logic
1. Read `convex/loans.ts` and `convex/approvalWorkflow.ts` first
2. Validate APR with `isValidAPR()`
3. Add audit logging and state transitions
4. Insert TigerBeetle outbox entry if financial operation (same mutation)

### Schema Changes
1. Update `convex/schema.ts` (single source of truth)
2. Types auto-regenerate on `npx convex dev`
3. Add auth guards in corresponding query/mutation file
4. Add audit logging if financial data

## Current Status

### Migration In Progress
- `src/services/` (~25 files) still reference Supabase — needs migration to Convex
- `src/integrations/supabase/client.ts` retained for legacy hooks

### Known Limitations
- TypeScript strict mode disabled (`strict: false` in tsconfig.app.json)
- TigerBeetle in shadow mode (not primary ledger yet)
- No CI/CD pipeline (no GitHub Actions for Convex deploy)
- ~20 `as any` casts remain in frontend (tests, legacy utils, admin stubs)
- Backoffice UI test coverage ~30%

### Next Priorities
1. Seed ontology data (`seedNamLendTrust`, `seedDefaultRails`, `seedPersonalLoan`)
2. Build ontology admin UI (institutions, payment rails, products, mandates, relationship explorer)
3. Migrate `src/services/` to Convex
4. Wire credit scoring UI in Loan360View and LoanReviewPanel
5. Set up CI/CD pipeline
6. Transition TigerBeetle to primary ledger

## Documentation

Start with `docs/INDEX.md`. Key docs: `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SECURITY.md`, `ONTOLOGY_ENGINE.md`, `DESIGN_SYSTEM.md`, `TESTING.md`, `AGENTS.md`.

---

**This is a production financial system. Every change must be tested, audited, and compliant with Namibian regulations. All new backend logic goes in `convex/`, not `supabase/` or `src/services/`.**
