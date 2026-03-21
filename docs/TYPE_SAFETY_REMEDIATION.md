# TypeScript Type Safety Remediation

**Doc Revision**: 2026-02-22
**Status**: Convex backend `as any` remediation COMPLETE (132→0). Frontend canonical types complete.

---

## Table of Contents

- [Summary](#summary)
- [Progress](#progress)
- [Remaining Work](#remaining-work)
- [Remediation Guide](#remediation-guide)
- [Type Files Reference](#type-files-reference)
- [Commands](#commands)

---

## Summary

The codebase has significantly improved type coverage with canonical loan types created in `src/types/`. Core loan flow now uses typed interfaces. This document tracks remaining `any` usage and provides remediation guidance.

### Current Status

| Area               | Status          | Notes                                                                |
| ------------------ | --------------- | -------------------------------------------------------------------- |
| Loan Types         | Complete        | `LoanStatus`, `LoanRecord`, `LoanApplication`, etc.                  |
| Payment Types      | Complete        | `PaymentStatus`, `Payment`, `PaymentScheduleItem`                    |
| Disbursement Types | Complete        | `DisbursementStatus`, `Disbursement`, `DisbursementResult`           |
| **Convex Backend** | **✅ Complete** | **132→0 `as any` casts — zero remaining across all 48 Convex files** |
| Admin Dashboard    | Partial         | Metrics state needs typing                                           |
| Service Layer      | Partial         | Some audit/workflow payloads use `any`                               |
| Debug Utilities    | Not Started     | `window as any` patterns remain                                      |
| Gateway Services   | Partial         | SMS/WhatsApp payloads need interfaces                                |

---

## Progress

### Completed (2026-02-22) — Convex Backend Phase 2 (37 → 0 casts)

**Eliminated all remaining 37 `as any` casts** — Convex backend is now fully type-safe.
Verified: `grep -rn "as any" convex/ --include="*.ts" | grep -v "_generated" | wc -l` → **0**.
Build verified clean: `npx convex dev --once` + `npm run build` both pass.

**Root causes fixed in Phase 2**:

| Category                                                      | Fixed | Technique                                                                                  |
| ------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| Actions calling wrong namespace (`internal.*` for public fns) | 5     | Switch to `api.*` — actions can call public queries/mutations via `ctx.runQuery(api.X)`    |
| Missing `internalMutation`/`internalQuery` exports            | 6     | Added `recordCreditScore`, `createSystemApprovalRequest`, `getProfileByUserId`             |
| `v.string()` status args vs `v.union(...)` index              | 7     | Exported union validators from `schema.ts`; updated all 6 status-filtered list fns         |
| Audit `triggeredBy`/`userId` as wrong type                    | 3     | Changed schema fields to `v.optional(v.id("users"))` — system events have no userId        |
| `GenericQueryCtx<any>` / `GenericMutationCtx<any>`            | 4     | Replaced with `GenericQueryCtx<DataModel>` / `GenericMutationCtx<DataModel>`               |
| `OutboxEntry._id: string`                                     | 3     | Changed to `Id<"tigerBeetleOutbox">`                                                       |
| `.collect() as any[]` / `(doc as any).field`                  | 8     | Removed — Convex returns fully-typed docs; also replaced collect+filter with index queries |
| `ctx: any` in settlement helper fns                           | 2     | Replaced with `ActionCtx` from `_generated/server`                                         |

**Additional files cleaned in Phase 2**:

- `convex/lib/auth.ts`, `convex/lib/audit.ts` — DataModel-typed contexts
- `convex/audit.ts` — Id-typed arg validators
- `convex/analytics.ts`, `convex/reconciliation.ts` — result casts removed
- `convex/scheduled/tigerBeetleOutboxWorker.ts` — Id<"tigerBeetleOutbox"> type
- `convex/settlement/settlementAcknowledgements.ts` — index queries replace collect+filter
- `convex/settlement/settlementNetting.ts` — correct schema field names surfaced
- `convex/settlement/settlementActions.ts` — typed ActionCtx helper fns
- `convex/actions/ipsAdapter.ts`, `processLoanApplication.ts`, `sendNotification.ts`

**Bugs surfaced when casts were removed**:

- `settlementNetting.ts`: fields `debtorParticipantId`/`creditorParticipantId`/`netAmount` do not exist in schema — correct names are `sourceParticipantId`/`targetParticipantId`/`amount`
- `processLoanApplication.ts`: `priority: "normal"` not in `approvalRequests.priority` union (`"low"|"medium"|"high"|"urgent"`) — fixed to `"low"`

---

### Completed (2026-02-22) — Convex Backend Phase 1 (132 → 37 casts)

**Reduced `as any` casts from 132 → 37** across the entire `convex/` directory (72% reduction).

**Files fully cleaned in Phase 1** (zero `as any` remaining):

- `convex/users.ts`, `convex/loans.ts`, `convex/payments.ts`, `convex/disbursements.ts`
- `convex/audit.ts`, `convex/collections.ts`, `convex/systemConfig.ts`, `convex/notifications.ts`
- `convex/approvalWorkflow.ts`, `convex/loanDocuments.ts`, `convex/loanApprovals.ts`
- `convex/scheduled/dailyTasks.ts`, `convex/tigerbeetle/outbox.ts`
- `convex/ips/ipsAlerts.ts`, `convex/ips/ipsVpa.ts`, `convex/ips/ipsOnboarding.ts`, `convex/ips/ipsTransactions.ts`
- `convex/settlement/settlementRuns.ts`, `convex/settlement/settlementActions.ts`
- `convex/settlement/settlementBatches.ts`, `convex/settlement/settlementReports.ts`
- `convex/settlement/settlementAdjustments.ts`, `convex/settlement/settlementTimeouts.ts`

---

### Completed (2026-01-10)

**Created `src/types/loan.ts`** - Canonical loan type definitions:

```typescript
// Status type unions
type LoanStatus = 'pending' | 'under_review' | 'approved' | 'rejected' |
                  'disbursed' | 'active' | 'completed' | 'defaulted' | 'restructured';
type DisbursementStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed';
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';

// Core interfaces
interface LoanRecord { ... }
interface LoanApplication { ... }
interface LoanDetailsForReview { ... }
interface Loan360Details { ... }
interface Disbursement { ... }
interface Payment { ... }
interface PaymentScheduleItem { ... }

// Type guards
function isValidLoanStatus(status: string): status is LoanStatus
function canApproveLoan(loan: LoanRecord): boolean
function canDisburseLoan(loan: LoanRecord): boolean
```

**Updated Components**:

- `useLoanApplications.ts` - Imports from `@/types/loan`
- `LoanApplicationsList.tsx` - Uses canonical `LoanApplication` type
- `Loan360View.tsx` - Added `approved_at` to interface

---

## Remaining Work

### High Priority `any` Hotspots

| File                                    | Issue                           | Remediation                         |
| --------------------------------------- | ------------------------------- | ----------------------------------- |
| `src/services/workflowEngine.ts`        | Metadata and entity type casts  | Create `WorkflowMetadata` interface |
| `src/services/auditService.ts`          | Audit payloads typed as `any`   | Create `AuditPayload` interface     |
| `src/pages/AdminDashboard.tsx`          | Metrics state untyped           | Create `DashboardMetrics` interface |
| `src/components/ClientProfileModal.tsx` | Profile/loans/payments as `any` | Use canonical types from `@/types`  |

### Medium Priority `any` Hotspots

| File                                            | Issue                     | Remediation                        |
| ----------------------------------------------- | ------------------------- | ---------------------------------- |
| `src/components/DocumentVerificationSystem.tsx` | Document data untyped     | Create `Document` interface        |
| `src/components/ClientProfileDashboard.tsx`     | Profile data untyped      | Create `ClientProfile` interface   |
| `src/services/smsGateway.ts`                    | Template metadata casting | Create `SMSTemplate` interface     |
| `src/services/whatsappGateway.ts`               | Webhook payload casts     | Create `WhatsAppWebhook` interface |

### Low Priority

| File                                      | Issue                 | Remediation                  |
| ----------------------------------------- | --------------------- | ---------------------------- |
| `src/integrations/supabase/mockClient.ts` | Test client mock data | Type mock responses          |
| `src/utils/*` debug utilities             | `window as any` usage | Create typed debug interface |

---

## Remediation Guide

### Step 1: Create Missing Interfaces

For each `any` hotspot, create a typed interface in the appropriate file under `src/types/`:

```typescript
// src/types/admin.ts
export interface DashboardMetrics {
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  overduePayments: number;
  collectionsCount: number;
  // Add all metric fields
}

export interface AdminDashboardState {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
}
```

### Step 2: Replace `any` with Interface

```typescript
// Before
const [metrics, setMetrics] = useState<any>(null);

// After
import { DashboardMetrics } from '@/types/admin';
const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
```

### Step 3: Add Type Guards for API Responses

```typescript
// src/types/guards.ts
export function isDashboardMetrics(data: unknown): data is DashboardMetrics {
  return typeof data === 'object' && data !== null && 'totalLoans' in data && 'activeLoans' in data;
}

// Usage
const { data } = await supabase.rpc('get_dashboard_metrics');
if (isDashboardMetrics(data)) {
  setMetrics(data);
}
```

### Step 4: Handle Debug Utilities

Create a typed debug interface instead of `window as any`:

```typescript
// src/types/debug.ts
interface DebugUtils {
  directPasswordReset: () => Promise<void>;
  debugServiceKey: () => void;
  testSupabaseAccess: () => Promise<void>;
}

declare global {
  interface Window {
    __DEBUG__?: DebugUtils;
  }
}

// Usage (instead of (window as any).debug...)
if (window.__DEBUG__) {
  window.__DEBUG__.directPasswordReset();
}
```

---

## Type Files Reference

| File                      | Purpose                           | Status          |
| ------------------------- | --------------------------------- | --------------- |
| `src/types/loan.ts`       | Loan, disbursement, payment types | Complete        |
| `src/types/admin.ts`      | Admin dashboard types             | Needs expansion |
| `src/types/ips.ts`        | IPS integration types             | Complete        |
| `src/types/services.ts`   | Legacy service types              | Deprecated      |
| `src/types/settlement.ts` | Settlement pipeline types         | Complete        |
| `src/types/theme.ts`      | Theme/styling types               | Complete        |
| `src/types/guards.ts`     | Runtime type guards               | Needs creation  |
| `src/types/debug.ts`      | Debug utility types               | Needs creation  |
| `src/types/index.ts`      | Central exports                   | Active          |

---

## Commands

### Find all `any` usage

```bash
# Count any usage (frontend)
rg "\bany\b" src --type ts -c | sort -t: -k2 -nr

# Count any usage (Convex backend)
grep -rn "as any" convex/ --include="*.ts" | grep -v _generated | wc -l

# List files with any
rg "\bany\b" src --type ts -l

# Show context around any usage
rg "\bany\b" src --type ts -C 2
```

### Verify type coverage

```bash
# Run TypeScript compiler in strict mode
npx tsc --noEmit --strict

# Check for implicit any
npx tsc --noEmit --noImplicitAny
```

### Regenerate Supabase types

```bash
# After schema changes
npx supabase gen types typescript --project-id puahejtaskncpazjyxqp > src/integrations/supabase/types.ts
```

---

## See Also

- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) - Technical debt tracking
- [SERVICES.md](./SERVICES.md) - Service layer documentation
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database types reference
