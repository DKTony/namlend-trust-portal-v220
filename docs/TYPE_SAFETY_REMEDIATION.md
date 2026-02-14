# TypeScript Type Safety Remediation

**Doc Revision**: 2026-01-19
**Status**: Active - Canonical loan types created, remaining `any` usage tracked below.

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

| Area | Status | Notes |
|------|--------|-------|
| Loan Types | Complete | `LoanStatus`, `LoanRecord`, `LoanApplication`, etc. |
| Payment Types | Complete | `PaymentStatus`, `Payment`, `PaymentScheduleItem` |
| Disbursement Types | Complete | `DisbursementStatus`, `Disbursement`, `DisbursementResult` |
| Admin Dashboard | Partial | Metrics state needs typing |
| Service Layer | Partial | Some audit/workflow payloads use `any` |
| Debug Utilities | Not Started | `window as any` patterns remain |
| Gateway Services | Partial | SMS/WhatsApp payloads need interfaces |

---

## Progress

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

| File | Issue | Remediation |
|------|-------|-------------|
| `src/services/workflowEngine.ts` | Metadata and entity type casts | Create `WorkflowMetadata` interface |
| `src/services/auditService.ts` | Audit payloads typed as `any` | Create `AuditPayload` interface |
| `src/pages/AdminDashboard.tsx` | Metrics state untyped | Create `DashboardMetrics` interface |
| `src/components/ClientProfileModal.tsx` | Profile/loans/payments as `any` | Use canonical types from `@/types` |

### Medium Priority `any` Hotspots

| File | Issue | Remediation |
|------|-------|-------------|
| `src/components/DocumentVerificationSystem.tsx` | Document data untyped | Create `Document` interface |
| `src/components/ClientProfileDashboard.tsx` | Profile data untyped | Create `ClientProfile` interface |
| `src/services/smsGateway.ts` | Template metadata casting | Create `SMSTemplate` interface |
| `src/services/whatsappGateway.ts` | Webhook payload casts | Create `WhatsAppWebhook` interface |

### Low Priority

| File | Issue | Remediation |
|------|-------|-------------|
| `src/integrations/supabase/mockClient.ts` | Test client mock data | Type mock responses |
| `src/utils/*` debug utilities | `window as any` usage | Create typed debug interface |

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
  return (
    typeof data === 'object' &&
    data !== null &&
    'totalLoans' in data &&
    'activeLoans' in data
  );
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

| File | Purpose | Status |
|------|---------|--------|
| `src/types/loan.ts` | Loan, disbursement, payment types | Complete |
| `src/types/admin.ts` | Admin dashboard types | Needs expansion |
| `src/types/ips.ts` | IPS integration types | Complete |
| `src/types/services.ts` | Legacy service types | Deprecated |
| `src/types/settlement.ts` | Settlement pipeline types | Complete |
| `src/types/theme.ts` | Theme/styling types | Complete |
| `src/types/guards.ts` | Runtime type guards | Needs creation |
| `src/types/debug.ts` | Debug utility types | Needs creation |
| `src/types/index.ts` | Central exports | Active |

---

## Commands

### Find all `any` usage

```bash
# Count any usage
rg "\bany\b" src --type ts -c | sort -t: -k2 -nr

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
