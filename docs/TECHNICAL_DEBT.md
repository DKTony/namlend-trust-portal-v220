# NamLend Trust - Technical Debt & Outstanding Work

**Doc Revision**: 2026-02-18
**Status**: Active - Tracking technical debt items with remediation steps. Settlement-specific debt added Feb 2026.

---

## Table of Contents

- [Summary](#summary)
- [High Priority](#high-priority)
- [Medium Priority](#medium-priority)
- [Low Priority](#low-priority)
- [Remediation Checklist](#remediation-checklist)
- [Tracking Progress](#tracking-progress)

---

## Summary

Core lending and backoffice workflows are implemented. This document tracks technical debt items that need attention before full production hardening.

### Quick Stats

| Priority   | Count | Status                               |
| ---------- | ----- | ------------------------------------ |
| High       | 4     | Blocking production features         |
| Medium     | 4     | Quality/maintainability issues       |
| Low        | 2     | Nice-to-have improvements            |
| Settlement | 4     | Settlement-specific gaps (see below) |

---

## High Priority

### 1. IPS Adapter is Mock

**Status**: Not Started
**Impact**: Cannot process real IPS payments

**Problem**:

- `supabase/functions/ips-adapter` returns mock responses
- Production IPS API endpoints not configured
- mTLS certificates not set up
- Switch connectivity not established

**Remediation Steps**:

1. Obtain production IPS credentials from Bank of Namibia
2. Generate and configure mTLS certificates:
   ```bash
   # Generate CSR for IPS connectivity
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout namlend-ips.key -out namlend-ips.csr
   ```
3. Update edge function secrets:
   ```bash
   supabase secrets set IPS_API_URL=https://ips.bon.com.na/api
   supabase secrets set IPS_CLIENT_CERT=<base64-cert>
   supabase secrets set IPS_CLIENT_KEY=<base64-key>
   ```
4. Replace mock responses with actual API calls in `ips-adapter/index.ts`
5. Implement proper error handling and retry logic
6. Test with IPS sandbox environment first

**Files**:

- `supabase/functions/ips-adapter/index.ts`
- `src/services/ipsService.ts`

---

### 2. TigerBeetle Posting is Simulated

**Status**: Not Started
**Impact**: Financial ledger not recording actual transactions

**Problem**:

- `tigerbeetle-outbox-worker` does not connect to a live cluster
- Direct TB client is Node-only and not used by the worker
- Shadow mode records to Supabase but not TigerBeetle

**Remediation Steps**:

1. Deploy TigerBeetle cluster:
   ```bash
   # Production cluster setup
   tigerbeetle format --cluster=0 --replica=0 /data/tigerbeetle/0.tigerbeetle
   tigerbeetle start --addresses=0.0.0.0:3001 /data/tigerbeetle/0.tigerbeetle
   ```
2. Configure edge function connection:
   ```bash
   supabase secrets set TIGERBEETLE_ADDRESS=tigerbeetle.namlend.com:3001
   supabase secrets set TIGERBEETLE_CLUSTER_ID=0
   ```
3. Update `tigerbeetle-outbox-worker/index.ts`:
   - Import TigerBeetle client
   - Replace simulated posting with actual client calls
   - Implement proper error handling and idempotency
4. Create account structure for NamLend chart of accounts
5. Test with shadow mode comparison before switching

**Files**:

- `supabase/functions/tigerbeetle-outbox-worker/index.ts`
- `src/services/tigerBeetleService.ts`

**Documentation**:

- [TIGERBEETLE_IMPLEMENTATION.md](./TIGERBEETLE_IMPLEMENTATION.md)
- [TIGERBEETLE_PRODUCTION.md](./TIGERBEETLE_PRODUCTION.md)

---

### 3. Admin Route Guard Blocks Loan Officers

**Status**: Not Started
**Impact**: Loan officers cannot access admin dashboard

**Problem**:

- `/admin/*` routes use `requireAdmin` in `ProtectedRoute`
- UI components allow loan_officer inside AdminDashboard
- Router blocks loan_officer role at route level

**Remediation Steps**:

1. Update `src/components/ProtectedRoute.tsx`:

   ```typescript
   // Change from:
   if (requireAdmin && !isAdmin) {
     redirect('/dashboard');
   }

   // To:
   if (requireAdmin && !isStaff) {
     redirect('/dashboard');
   }

   // Where isStaff = isAdmin || isLoanOfficer
   ```

2. Add role-based component visibility within admin pages:

   ```typescript
   // Only show certain features to admins
   {isAdmin && <UserManagementPanel />}

   // Show to all staff
   <ApprovalQueue />
   ```

3. Update navigation to show appropriate menu items per role
4. Add E2E tests for loan officer admin access

**Files**:

- `src/components/ProtectedRoute.tsx`
- `src/pages/AdminDashboard/index.tsx`
- `src/components/Layout/AdminSidebar.tsx`

---

### 4. Generated Supabase Types Drift

**Status**: Partial
**Impact**: TypeScript errors, runtime mismatches

**Problem**:

- `src/integrations/supabase/types.ts` does not fully match migrations
- New columns/tables added without type regeneration
- Reconciliation tables differ between recent migrations (`reconciliation_runs`, new `bank_transactions`) and legacy services/types (`payment_reconciliations`, legacy `bank_transactions`)
- Some components use manual types instead of generated

**Remediation Steps**:

1. Regenerate types from production schema:
   ```bash
   npx supabase gen types typescript \
     --project-id puahejtaskncpazjyxqp \
     > src/integrations/supabase/types.ts
   ```
2. Compare generated types with existing usage:
   ```bash
   # Find type mismatches
   npx tsc --noEmit 2>&1 | grep "supabase/types"
   ```
3. Update components to use generated types:
   ```typescript
   import { Database } from '@/integrations/supabase/types';
   type Loan = Database['public']['Tables']['loans']['Row'];
   ```
4. Add type generation to CI pipeline
5. Create pre-commit hook to check type freshness

**Files**:

- `src/integrations/supabase/types.ts` (generated types)

---

## Medium Priority

### 1. Unit/Integration Tests Not Wired

**Status**: Not Started
**Impact**: No automated unit test coverage

**Problem**:

- Vitest-style tests exist in `tests/` and `src/tests/`
- `vitest` is not defined in `package.json` scripts
- Only Playwright E2E tests are runnable

**Remediation Steps**:

1. Add Vitest to project:
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   ```
2. Add scripts to `package.json`:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```
3. Create `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: {
       environment: 'jsdom',
       setupFiles: ['./tests/setup.ts'],
     },
   });
   ```
4. Fix existing tests to use correct imports
5. Add coverage threshold requirements

**Files**:

- `package.json`
- `vitest.config.ts` (create)
- `tests/setup.ts` (create)

---

### 2. PaymentGateway Not Wired to UI

**Status**: Not Started
**Impact**: Unused code, potential confusion

**Problem**:

- `src/services/paymentGateway.ts` exists but unused
- Payment flows use RPCs directly
- Gateway provides abstraction but not utilized

**Remediation Steps**:

1. Audit gateway vs. direct RPC usage:
   ```bash
   rg "paymentGateway" src
   rg "supabase.rpc.*payment" src
   ```
2. Decision needed:
   - **Option A**: Wire UI to use gateway (recommended for abstraction)
   - **Option B**: Remove gateway if RPC pattern is preferred
3. If keeping gateway, update payment components to use it:
   ```typescript
   // Instead of direct RPC
   import { processPayment } from '@/services/paymentGateway';
   await processPayment({ loanId, amount, method });
   ```
4. Add gateway tests

**Files**:

- `src/services/paymentGateway.ts`
- `src/pages/Payment.tsx`
- `src/components/ips/PaymentModal.tsx`

---

### 3. Credit Scoring Not Integrated

**Status**: Partial
**Impact**: Credit scoring exists but not used in loan decisions

**Problem**:

- `creditScoring.ts` has AI scoring logic
- `CreditScoreDisplay` component exists
- Neither integrated into loan submission/approval flow

**Remediation Steps**:

1. Add credit score fetch to loan application:
   ```typescript
   // In LoanApplication.tsx
   const { data: creditScore } = await getCreditScore(userId);
   ```
2. Display score in application form
3. Add score to approval review panel
4. Consider auto-reject threshold (configurable)
5. Store score with loan record for audit

**Files**:

- `src/services/creditScoring.ts`
- `src/components/CreditScoreDisplay.tsx`
- `src/pages/LoanApplication.tsx`
- `src/components/admin/LoanReviewPanel.tsx`

---

### 4. Realtime Updates Limited

**Status**: Partial
**Impact**: Users must manually refresh for updates

**Problem**:

- Only notifications subscribe to Supabase Realtime
- Loan status changes require manual refresh
- Admin dashboards don't auto-update

**Remediation Steps**:

1. Add realtime subscription to loan status:

   ```typescript
   useEffect(() => {
     const channel = supabase
       .channel('loan-changes')
       .on(
         'postgres_changes',
         {
           event: 'UPDATE',
           schema: 'public',
           table: 'loans',
           filter: `user_id=eq.${userId}`,
         },
         handleLoanUpdate
       )
       .subscribe();

     return () => {
       supabase.removeChannel(channel);
     };
   }, [userId]);
   ```

2. Add to dashboard metrics
3. Add to approval queue
4. Consider throttling for high-volume tables

**Files**:

- `src/hooks/useLoanApplications.ts`
- `src/pages/AdminDashboard/index.tsx`
- `src/components/admin/ApprovalQueue.tsx`

---

## Low Priority

### 1. Documentation Snapshots

**Status**: Complete
**Impact**: Historical docs could cause confusion

**Problem**:

- Several docs are historical (release notes, audits, deployment checklists)
- Need clear labeling as snapshots

**Remediation**:

- Added status notes to historical docs (2026-01-15)
- Created `docs/INDEX.md` with clear categorization
- See [INDEX.md](./INDEX.md) for document status

---

### 2. Design System Drift

**Status**: Not Started
**Impact**: Minor visual inconsistency

**Problem**:

- Design system doc references Inter font
- Font not currently imported in project
- Using Tailwind default sans stack

**Remediation Steps**:

1. Option A - Import Inter font:
   ```html
   <!-- In index.html -->
   <link
     href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
     rel="stylesheet"
   />
   ```
   ```css
   /* In tailwind.config.ts */
   fontFamily: {
     sans:
       [ 'Inter',
       ...defaultTheme.fontFamily.sans];
   }
   ```
2. Option B - Update documentation to reflect actual font stack
3. Audit other design system discrepancies

**Files**:

- `index.html`
- `tailwind.config.ts`
- `docs/DESIGN_SYSTEM.md`

---

## Settlement-Specific Debt (Added 2026-02-18)

Items identified during the IPP/IPS settlement compliance review against `docs/settlement.md`.

### S1. Hardcoded Interchange/Switching Fees

**Status**: Open (SET-004)
**Impact**: Fee computation not rule-driven

**Problem**:

- `compute_settlement_netting` SQL function uses hardcoded fee values
- Fees should be driven by `settlement_fee_rules` configuration with effective dates and product/MCC context

**Files**:

- `supabase/migrations/20251214060000_settlement_processing.sql` (netting function)
- `settlement_fee_rules` table exists but not consumed by netting logic

---

### S2. Generic Participant Auto-Insertion

**Status**: Open (SET-005)
**Impact**: Pollutes participant master, no sponsored mapping

**Problem**:

- `ingest_ips_transactions_for_settlement` auto-inserts unknown participants with generic BICs
- No sponsor resolution for indirect participants
- No validation against authoritative participant master

**Files**:

- `supabase/migrations/20251214060000_settlement_processing.sql` (ingestion function)
- `settlement_participants` table

---

### S3. Settlement UI Download Stubs

**Status**: Open
**Impact**: Report downloads non-functional

**Problem**:

- Pacs009Viewer, NTSLReportViewer, RawDataReportViewer have "Download" buttons that only call `toast.info('Download...')`
- No actual file generation or download logic implemented

**Files**:

- `src/pages/AdminDashboard/components/Reconciliation/Pacs009Viewer.tsx`
- `src/pages/AdminDashboard/components/Reconciliation/NTSLReportViewer.tsx`
- `src/pages/AdminDashboard/components/Reconciliation/RawDataReportViewer.tsx`

---

### S4. Settlement Lifecycle Simulation

**Status**: Open (SET-002)
**Impact**: No real transport/ack-driven state progression

**Problem**:

- UI runs create → process → settle in one action
- `mark_settlement_settled` simulates NISS acceptance without real SWIFT/NISS integration
- No inbound ack parsing (xsys.001/002/003)
- Full spec conformance tracked in `docs/settlement.md` gap register (SET-001 through SET-012)

**Files**:

- `src/services/settlementService.ts`
- `supabase/migrations/20251214060000_settlement_processing.sql`

---

## Remediation Checklist

Use this checklist to track progress:

```markdown
## High Priority

- [ ] IPS Adapter: Obtain credentials
- [ ] IPS Adapter: Configure mTLS
- [ ] IPS Adapter: Replace mock responses
- [ ] IPS Adapter: Test with sandbox
- [ ] TigerBeetle: Deploy cluster
- [ ] TigerBeetle: Configure connection
- [ ] TigerBeetle: Update worker
- [ ] Admin Routes: Update ProtectedRoute
- [ ] Admin Routes: Add role-based visibility
- [ ] Admin Routes: Add E2E tests
- [ ] Supabase Types: Regenerate
- [ ] Supabase Types: Update components
- [ ] Supabase Types: Add to CI

## Medium Priority

- [ ] Vitest: Install and configure
- [ ] Vitest: Fix existing tests
- [ ] PaymentGateway: Decide keep/remove
- [ ] PaymentGateway: Implement decision
- [ ] Credit Scoring: Integrate in UI
- [ ] Credit Scoring: Add to approval flow
- [ ] Realtime: Add loan subscriptions
- [ ] Realtime: Add dashboard updates

## Low Priority

- [ ] Documentation: Complete (done 2026-01-15)
- [ ] Design System: Font decision
```

---

## Tracking Progress

### Metrics

Track debt reduction over time:

```bash
# Count TODO/FIXME comments
rg "TODO|FIXME" src --type ts -c

# Count any usage (type safety)
rg "\bany\b" src --type ts -c

# Count console.log (debug remnants)
rg "console\.(log|warn|error)" src --type ts -c
```

### Review Schedule

- **Weekly**: Review high-priority items
- **Bi-weekly**: Medium-priority triage
- **Monthly**: Full debt inventory

---

## See Also

- [TYPE_SAFETY_REMEDIATION.md](./TYPE_SAFETY_REMEDIATION.md) - TypeScript type improvements
- [TESTING.md](./TESTING.md) - Testing strategy
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [INDEX.md](./INDEX.md) - Documentation index
