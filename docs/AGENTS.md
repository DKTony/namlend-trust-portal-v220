# AI Agent Guidelines for NamLend Trust

**Doc Revision**: 2026-03-03
**Status**: Active
**Audience**: AI/LLM agents (Claude, GPT, Copilot, etc.)

> ⚠️ **Backend is Convex (migrated Feb 2026).** All new server logic goes in `convex/`. The `src/services/` directory is legacy dead code — do NOT add to it or follow its patterns. See [ARCHITECTURE.md](./ARCHITECTURE.md) and [CLAUDE.MD](../CLAUDE.MD) for full context.

---

## Purpose

This document provides project-specific guidelines for AI agents working on the NamLend Trust codebase. It supplements the root-level `CLAUDE.MD` with detailed patterns, anti-patterns, and domain knowledge.

---

## Critical Rules (Hard Constraints)

### 1. Regulatory Compliance

```typescript
// NEVER allow APR > 32% (Namibian law) — server-side enforcement
import { APR_LIMIT, isValidAPR } from './lib/regulatory'; // convex/lib/regulatory.ts

if (!isValidAPR(requestedAPR)) {
  throw new ConvexError('APR exceeds Namibian legal limit of 32%');
}

// Client-side enforcement
import { APR_LIMIT } from '@/constants/regulatory';
if (requestedAPR > APR_LIMIT) {
  throw new Error('APR exceeds Namibian legal limit of 32%');
}
```

### 2. Currency Formatting

```typescript
// ALWAYS use NAD formatter for currency display
import { formatNAD } from '@/utils/currency';

// ✅ Correct
<span>{formatNAD(amount)}</span>  // Outputs: N$ 1,234.56

// ❌ Wrong
<span>${amount}</span>  // Wrong currency symbol
```

### 3. Data Retention

```typescript
// NEVER delete financial records or audit logs
// Data retention requirement: 7 years minimum (Namibian law)
// Convex has no soft-delete built-in — add a `deletedAt` field if needed
// Financial records (loans, payments, disbursements, auditLogs) must NEVER be hard-deleted
```

### 4. Security

```typescript
// NEVER expose Convex environment variable secrets to the frontend
// Convex env vars (set via `npx convex env set KEY value`) are server-side only
// VITE_* vars are client-side — only VITE_CONVEX_URL is safe to expose

// ❌ WRONG — secrets must be set via Convex dashboard, not client env
const apiKey = import.meta.env.VITE_MY_SECRET_KEY; // never do this for secrets

// ✅ CORRECT — secrets accessed in Convex actions (server-side only)
// convex/actions/sendSms.ts
const apiKey = process.env.AFRICASTALKING_API_KEY; // Convex action env var
```

---

## Backend Patterns (ACTIVE — Convex)

### New Server Logic Always Goes in `convex/`

```typescript
// ✅ CORRECT — add a new Convex query
// convex/loans.ts
export const getMyLoans = query({
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx); // ← auth guard REQUIRED
    return ctx.db
      .query('loans')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

// ❌ WRONG — never add new logic to src/services/ (legacy dead code)
// src/services/loanService.ts — DO NOT USE
```

### Ontology-First Development Pattern

Every mutation that changes financial state must participate in the ontology. Follow this checklist:

1. **Emit domain event** via `emitDomainEvent()` from `convex/lib/domainEvents.ts` (past-tense: `loan.approved`, `payment.completed`)
2. **Emit relationships** via `emitRelationship()` from `convex/lib/relationshipEmitter.ts` when creating connections between entities
3. **Log audit** via `scheduleAuditLog()` from `convex/lib/audit.ts` (bridges to event journal automatically)
4. **Read business rules** via `getNumericRule()` / `getJsonRule()` from `convex/lib/ruleEvaluator.ts` instead of hardcoding thresholds

The design principle: every change must improve **execution certainty**, **authorization certainty**, or **financial truth**. See [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) for implementation details and [Raw_Thoughts.md](./Raw_Thoughts.md) for the strategic reasoning.

### Frontend Data Access Pattern

```typescript
// ✅ Read data reactively (auto-updates on change)
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
const loans = useQuery(api.loans.getMyLoans);

// ✅ Write data atomically
import { useMutation } from 'convex/react';
const createLoan = useMutation(api.loans.createLoan);
await createLoan({ principal: 50000, interestRate: 18, termMonths: 24 });

// ❌ WRONG — do not use Supabase client for new code
import { supabase } from '@/integrations/supabase/client'; // LEGACY
const { data } = await supabase.from('loans').select('*'); // LEGACY
```

### Auth Guards (Replaces RLS)

Every Convex query/mutation MUST call an auth guard at the top before any DB access:

```typescript
import { assertAuthenticated, assertStaff, assertAdmin } from './lib/auth';

// Client accessing own data
export const getMyLoans = query({
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx); // throws UNAUTHENTICATED if not logged in
    return ctx.db
      .query('loans')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

// Staff-only endpoint
export const adminListLoans = query({
  handler: async (ctx) => {
    await assertStaff(ctx); // throws if not loan_officer or admin
    return ctx.db.query('loans').collect();
  },
});
```

| Guard                                     | Access Level                        |
| ----------------------------------------- | ----------------------------------- |
| `assertAuthenticated`                     | Any logged-in user (returns userId) |
| `assertOwner(ctx, resourceUserId)`        | Resource owner only                 |
| `assertOwnerOrStaff(ctx, resourceUserId)` | Owner or loan_officer/admin         |
| `assertStaff`                             | loan_officer or admin               |
| `assertAdmin`                             | admin only                          |

### Audit Logging

All financial operations MUST log via the Convex scheduler helper:

```typescript
import { scheduleAuditLog } from './lib/audit'; // convex/lib/audit.ts

// ✅ CORRECT — schedule audit log inside the same mutation
export const approveLoan = mutation({
  handler: async (ctx, { loanId }) => {
    await assertStaff(ctx);
    const old = await ctx.db.get(loanId);
    await ctx.db.patch(loanId, { status: 'approved' });
    await scheduleAuditLog(ctx, {
      action: 'UPDATE',
      entityType: 'loans',
      entityId: loanId,
      oldState: old,
      newState: { ...old, status: 'approved' },
    });
  },
});

// ❌ WRONG — legacy Supabase audit service (DO NOT USE)
import { createAuditLog } from '@/services/auditService';
```

### TigerBeetle Integration (Shadow Mode — Outbox Pattern)

TigerBeetle runs in **shadow mode**. The Convex DB is the source of truth. Insert outbox entry in the **same atomic mutation** as the business record:

```typescript
// ✅ CORRECT — outbox inserted atomically with payment record
export const recordPayment = mutation({
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const paymentId = await ctx.db.insert("paymentTransactions", { ...args, userId });
    // Outbox entry in SAME atomic transaction
    await ctx.db.insert("tigerBeetleOutbox", {
      eventType: "PAYMENT",
      sourceTable: "paymentTransactions",
      sourceId: paymentId,
      payload: args,
      status: "pending",
      retryCount: 0,
    });
    await scheduleAuditLog(ctx, { ... });
  },
});
// The cron job `tb-outbox-worker` (every 30s) picks up pending entries and posts to TigerBeetle
```

### External IO — Always in Actions

Mutations and queries CANNOT make HTTP calls. Use actions for all external APIs:

```typescript
// ✅ CORRECT — HTTP in an action
// convex/actions/sendSms.ts
export const sendSms = action({
  handler: async (ctx, { to, message }) => {
    await fetch("https://api.africastalking.com/...", { ... });
    await ctx.runMutation(internal.notifications.updateStatus, { ... });
  },
});

// ❌ WRONG — mutations cannot make HTTP calls
export const badMutation = mutation({
  handler: async (ctx, args) => {
    await fetch("https://api.africastalking.com/..."); // WILL FAIL AT RUNTIME
  },
});
```

---

## Common Mistakes to Avoid

### 1. Missing Auth Guards

```typescript
// ❌ WRONG — no guard, unprotected endpoint
export const getAllLoans = query({
  handler: async (ctx) => {
    return ctx.db.query('loans').collect(); // ANYONE can call this!
  },
});

// ✅ CORRECT
export const getAllLoans = query({
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query('loans').collect();
  },
});
```

### 2. Hardcoding APR Values

```typescript
// ❌ Hardcoded rate
const apr = 0.35; // Exceeds legal limit!

// ✅ Use constants (server-side)
import { APR_LIMIT, isValidAPR } from './lib/regulatory';
// ✅ Use constants (client-side)
import { APR_LIMIT } from '@/constants/regulatory';
```

### 3. Using Legacy Supabase Services

```typescript
// ❌ WRONG — Supabase client (LEGACY, will not work for new features)
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.rpc('process_approval_transaction', { ... });

// ✅ CORRECT — Convex mutation
import { useMutation } from "convex/react";
import { api } from "@/integrations/convex/api";
const processApproval = useMutation(api.approvalWorkflow.processApprovalRequest);
await processApproval({ requestId, action: "approve" });
```

### 4. Exposing PII in Logs

```typescript
// ❌ Logs sensitive data
console.log('User data:', user);

// ✅ Log only necessary identifiers
console.log('Processing user:', user.id);
```

### 5. Writing to `src/services/`

```typescript
// ❌ WRONG — src/services/ is legacy dead code
// src/services/myNewService.ts  ← DO NOT CREATE

// ✅ CORRECT — add a query/mutation in convex/
// convex/myModule.ts
export const myQuery = query({ handler: async (ctx) => { ... } });
```

---

## Loan State Machine (Convex Schema)

Valid loan status values in the Convex `loans` table:

```
draft → submitted → under_review → approved → funded → active → paid_off
                         ↓
                      rejected (terminal)

active → overdue (missed payments)
active → defaulted (extended default)
active → restructured (terms modified)
active → written_off (terminal)
overdue → active (payment received)
overdue → defaulted (extended default)
```

All transitions go through Convex mutations in `convex/loans.ts` and `convex/approvalWorkflow.ts`:

```typescript
// ✅ CORRECT — Convex mutation for state transitions
const approveLoan = useMutation(api.loans.approveLoan);
await approveLoan({ loanId: loanId as Id<'loans'> });

// ❌ WRONG — legacy service (deleted in Milestone D)
import { transitionLoanStatus } from '@/services/approvalWorkflow';
```

> ⚠️ **`approvalRequests.status` differs from Supabase**: Convex uses `pending | approved | rejected | escalated | withdrawn`. There is **no** `under_review` or `requires_info` status.

---

## Testing Requirements

### E2E Tests

For any new feature, add Playwright E2E test:

```typescript
// e2e/feature-name.e2e.ts
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test('feature description', async ({ page }) => {
  await loginAsAdmin(page);
  // Test implementation
});
```

### Test Commands

```bash
npm run test:e2e          # Run all tests
npm run test:e2e:headed   # Run with browser visible
npm run test:e2e:ui       # Playwright UI mode
```

---

## Documentation Requirements

When adding features:

1. Update relevant docs in `/docs/`
2. Add entry to `docs/INDEX.md` if new doc created
3. Include JSDoc comments for public functions
4. Update CHANGELOG.md for significant changes

---

## Quick Reference

### File Locations

| Type                      | Location                                    |
| ------------------------- | ------------------------------------------- |
| **Backend (ACTIVE)**      | `convex/`                                   |
| Components                | `src/components/`                           |
| Pages                     | `src/pages/`                                |
| Hooks                     | `src/hooks/`                                |
| Types                     | `src/types/`                                |
| Constants                 | `src/constants/`                            |
| E2E Tests                 | `e2e/`                                      |
| **Legacy Services**       | `src/services/` ⚠️ (dead code — do not use) |
| **Legacy Migrations**     | `supabase/migrations/` ⚠️ (INACTIVE)        |
| **Legacy Edge Functions** | `supabase/functions/` ⚠️ (INACTIVE)         |

### Key Constants

```typescript
// src/constants/regulatory.ts (client-side)
APR_LIMIT = 32; // 32% maximum APR (percentage value)
CURRENCY_CODE = 'NAD';
CURRENCY_SYMBOL = 'N$';
DATA_RETENTION_YEARS = 7;

// convex/lib/regulatory.ts (server-side — same values)
(APR_LIMIT, isValidAPR, formatNAD);
```

### Important Loan Status Types (Convex)

```typescript
// convex/schema.ts — loanStatus validator
type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'funded'
  | 'active'
  | 'overdue'
  | 'defaulted'
  | 'paid_off'
  | 'restructured'
  | 'cancelled'
  | 'written_off';

type DisbursementStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn';
```

### Convex API Modules (Quick Lookup)

```typescript
api.loans.*               // Loan CRUD + state transitions (convex/loans.ts)
api.payments.*            // Payment recording + schedules (convex/payments.ts)
api.disbursements.*       // Disbursement state machine (convex/disbursements.ts)
api.approvalWorkflow.*    // Approval queue + workflow (convex/approvalWorkflow.ts)
api.collections.*         // Collections queue + interactions (convex/collections.ts)
api.notifications.*       // In-app + queued notifications (convex/notifications.ts)
api.analytics.*           // Portfolio/revenue analytics [staff-only] (convex/analytics.ts)
api.audit.*               // Audit logs + compliance (convex/audit.ts)
api.users.*               // User/profile management (convex/users.ts)
api.ips.ipsTransactions.* // IPS payment transactions (convex/ips/)
api.settlement.*          // Settlement runs + reports (convex/settlement/)
```

---

## See Also

- [CLAUDE.MD](../CLAUDE.MD) — Root-level AI context (start here, includes Design Philosophy)
- [INDEX.md](./INDEX.md) — Documentation index
- [GLOSSARY.md](./GLOSSARY.md) — Terminology definitions (including ontology primitives)
- [ONTOLOGY_ENGINE.md](./ONTOLOGY_ENGINE.md) — Financial Ontology Engine implementation report (domain events, projections, rules-as-data)
- [Raw_Thoughts.md](./Raw_Thoughts.md) — Strategic vision: three certainties, five primitives, design principles
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture (Convex)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Convex schema reference (67+ tables)
- [SERVICES.md](./SERVICES.md) — Service migration status
- [convexmigratehandover.md](./convexmigratehandover.md) — Convex migration handover notes
