# AI Agent Guidelines for NamLend Trust

**Doc Revision**: 2026-01-19
**Status**: Active
**Audience**: AI/LLM agents (Claude, GPT, Copilot, etc.)

---

## Purpose

This document provides project-specific guidelines for AI agents working on the NamLend Trust codebase. It supplements the root-level `CLAUDE.md` with detailed patterns, anti-patterns, and domain knowledge.

---

## Critical Rules (Hard Constraints)

### 1. Regulatory Compliance

```typescript
// NEVER allow APR > 32% (Namibian law)
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

```sql
-- NEVER delete financial records or audit logs
-- Data retention requirement: 7 years minimum
-- Use soft deletes if necessary
UPDATE loans SET deleted_at = NOW() WHERE id = ?;
```

### 4. Security

```typescript
// NEVER expose service role key to frontend
// ❌ WRONG - exposes privileged key
const client = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

// ✅ CORRECT - use anon key for frontend
const client = createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY);
```

---

## Service Layer Patterns

### Use Existing Services

Before creating new functionality, check these services:

| Service | Location | Purpose |
|---------|----------|---------|
| `approvalWorkflow.ts` | `src/services/` | Loan state machine |
| `disbursementService.ts` | `src/services/` | Fund disbursement |
| `paymentService.ts` | `src/services/` | Payment processing |
| `settlementService.ts` | `src/services/` | Settlement detection |
| `notificationService.ts` | `src/services/` | Multi-channel notifications |
| `creditScoring.ts` | `src/services/` | AI credit scoring (300-850) |

### Audit Logging

All financial operations MUST be logged:

```typescript
import { createAuditLog } from '@/services/auditService';

// After any financial operation
await createAuditLog({
  table_name: 'loans',
  record_id: loanId,
  action: 'UPDATE',
  old_data: previousState,
  new_data: newState,
  performed_by: userId
});
```

### TigerBeetle Integration

TigerBeetle runs in **shadow mode**. Always post to both Supabase AND TigerBeetle:

```typescript
// 1. Update Supabase (source of truth)
await supabase.from('payments').insert(payment);

// 2. Post to TigerBeetle (shadow ledger)
await queueTigerBeetleEvent({
  type: 'PAYMENT',
  data: payment
});
```

---

## Database Patterns

### Row-Level Security (RLS)

Every table with user data MUST have RLS policies:

```sql
-- Example: Clients see only their own loans
CREATE POLICY "client_select_own" ON loans
  FOR SELECT USING (user_id = auth.uid());

-- Example: Staff see all loans
CREATE POLICY "staff_select_all" ON loans
  FOR SELECT USING (is_staff(auth.uid()));
```

### Using RPC Functions

Prefer RPC functions for complex operations:

```typescript
// ✅ Use RPC for atomic operations
const { data, error } = await supabase.rpc('process_approval_transaction', {
  p_approval_id: approvalId,
  p_officer_id: officerId
});

// ❌ Avoid multiple sequential queries for related operations
```

### Standard Column Patterns

```sql
-- All tables should have these columns
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
created_by UUID REFERENCES auth.users(id)
```

---

## UI/UX Patterns

### Component Library

Use shadcn/ui components from `src/components/ui/`:

```typescript
// ✅ Use existing components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// ❌ Don't create custom buttons/cards
```

### Design System Colors

```css
/* Neo-Fintech "Black Card" aesthetic */
Primary: #000000, #18181B, #27272A (zinc/black)
Accent: #0EA5E9 (electric blue)
Success: #10B981 (emerald)
Warning: #F59E0B (amber)
Danger: #EF4444 (red)
Background: #0A0A0A
Card: #18181B with backdrop-blur
```

### Mobile-First

- Minimum viewport: 375px width
- Use responsive Tailwind classes
- Test on mobile viewports
- Touch targets: minimum 44px

---

## Common Mistakes to Avoid

### 1. Direct Database Access Without RLS

```typescript
// ❌ Bypasses RLS - security risk
const { data } = await supabase.from('loans').select('*');

// ✅ RLS respects user context automatically
// Just ensure user is authenticated
```

### 2. Hardcoding APR Values

```typescript
// ❌ Hardcoded rate
const apr = 0.35; // Exceeds legal limit!

// ✅ Use constants
import { APR_LIMIT } from '@/constants/regulatory';
const apr = Math.min(requestedRate, APR_LIMIT);
```

### 3. Missing Error Handling

```typescript
// ❌ No error handling
const { data } = await supabase.from('loans').select('*');

// ✅ Always handle errors
const { data, error } = await supabase.from('loans').select('*');
if (error) {
  console.error('Failed to fetch loans:', error.message);
  throw new Error('Unable to load loans');
}
```

### 4. Exposing PII in Logs

```typescript
// ❌ Logs sensitive data
console.log('User data:', user);

// ✅ Log only necessary identifiers
console.log('Processing user:', user.id);
```

---

## Loan State Machine

Valid loan status transitions:

```
pending → under_review → approved → disbursed → active → completed
                      ↓
                   rejected (terminal)

active → defaulted (if payments missed)
active → restructured (if terms changed)
```

Use `approvalWorkflow.ts` for all state transitions:

```typescript
import { transitionLoanStatus } from '@/services/approvalWorkflow';

await transitionLoanStatus(loanId, 'approved', {
  officerId,
  notes: 'Approved per credit policy'
});
```

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

| Type | Location |
|------|----------|
| Components | `src/components/` |
| Pages | `src/pages/` |
| Services | `src/services/` |
| Types | `src/types/` |
| Constants | `src/constants/` |
| E2E Tests | `e2e/` |
| Migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |

### Key Constants

```typescript
// src/constants/regulatory.ts
APR_LIMIT = 32  // 32% maximum APR (percentage value)
CURRENCY_CODE = 'NAD'
CURRENCY_SYMBOL = 'N$'
DATA_RETENTION_YEARS = 7
```

### Important Types

```typescript
// src/types/loan.ts
type LoanStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'completed' | 'defaulted';
type DisbursementStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed';
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
```

---

## See Also

- [CLAUDE.md](../CLAUDE.md) - Root-level AI context
- [INDEX.md](./INDEX.md) - Documentation index
- [GLOSSARY.md](./GLOSSARY.md) - Terminology definitions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [SERVICES.md](./SERVICES.md) - Service layer details
