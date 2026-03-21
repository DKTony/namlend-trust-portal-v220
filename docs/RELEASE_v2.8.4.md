# Release Notes - v2.8.4

**Doc Revision**: 2026-01-19  
**Status Note**: Historical release notes. Refer to `docs/context.md` for current state.

**Release Date**: January 8, 2026  
**Type**: Data Consistency & Access Control Fixes  
**Status**: ✅ Deployed to Production

---

## Overview

Version 2.8.4 addresses two findings from the v2.8.3 security audit: terminal status alignment with application constants and access control scope correction for the approval RPC function.

---

## What Changed

### 1. Terminal Status Alignment (MEDIUM Priority)

**Problem**: The `loan_balance_summary` view only zeroed balances for `settled`, `closed`, and `written_off` statuses, but the application's `CLOSED_LOAN_STATUSES` constant defines terminal states as `settled`, `completed`, `defaulted`, and `rejected`.

**Impact**: Loans in `completed`, `defaulted`, or `rejected` status would display calculated balances instead of zero, causing UI inconsistencies.

**Fix**: Updated all CASE statements in the view to use the correct terminal status list:

```sql
WHEN l.status IN ('settled', 'completed', 'defaulted', 'rejected') THEN 0
```

**Migration**: `20260108070200_fix_loan_balance_terminal_statuses.sql`

**Verification**: SQL query confirmed no legacy status values (`closed`, `written_off`, `cancelled`) exist in production. All loan statuses align with application constants.

---

### 2. Access Control Scope Correction (LOW Priority)

**Problem**: The `process_approval_transaction` RPC inadvertently added the `approver` role in v2.8.3, expanding access beyond the original design.

**Impact**: Approvers could execute final loan creation (a financial operation) when they should only be able to approve/reject requests (a workflow action).

**Fix**: Reverted to original staff-only authorization:

```sql
AND role IN ('admin', 'loan_officer')
```

**Rationale**:

- **Approvers**: Approve/reject loan applications (workflow decision)
- **Staff (admin/loan_officer)**: Execute loan creation from approved requests (financial operation)
- Maintains proper separation of duties

**Migration**: `20260108070300_restrict_approval_rpc_to_staff.sql`

---

## Migrations Deployed

| Migration                                               | Purpose                                        | Status      |
| ------------------------------------------------------- | ---------------------------------------------- | ----------- |
| `20260108070200_fix_loan_balance_terminal_statuses.sql` | Align terminal statuses with `loanStatuses.ts` | ✅ Deployed |
| `20260108070300_restrict_approval_rpc_to_staff.sql`     | Restore staff-only access to loan creation     | ✅ Deployed |

---

## Security Posture

All security controls from previous versions maintained:

- ✅ `FOR UPDATE` row locking (prevents race conditions)
- ✅ `status = 'approved'` validation (prevents unauthorized loan creation)
- ✅ 23505 idempotency handler (handles concurrent requests)
- ✅ Staff-only authorization for financial operations
- ✅ Complete audit trail

**No regressions introduced.**

---

## Testing & Verification

### Terminal Status Verification

```sql
-- Confirmed no legacy statuses in production
SELECT status, COUNT(*)
FROM public.loans
WHERE status IN ('closed', 'written_off', 'cancelled')
GROUP BY status;
-- Result: 0 rows (no legacy statuses exist)
```

### View Behavior

- ✅ Loans with status `settled` → zero balances
- ✅ Loans with status `completed` → zero balances
- ✅ Loans with status `defaulted` → zero balances
- ✅ Loans with status `rejected` → zero balances
- ✅ Active loans → calculated balances

### RPC Authorization

- ✅ Admin can call `process_approval_transaction`
- ✅ Loan officer can call `process_approval_transaction`
- ❌ Approver **cannot** call `process_approval_transaction` (correct behavior)
- ✅ Approver can still approve/reject via approval workflow

---

## Documentation Updates

| Document              | Changes                                                       |
| --------------------- | ------------------------------------------------------------- |
| `CHANGELOG.md`        | Added v2.8.4 release notes                                    |
| `REMEDIATION_PLAN.md` | Added Round 3 findings section                                |
| `DATABASE_SCHEMA.md`  | Updated version to 3.4.0, added Recent Schema Changes section |
| `ARCHITECTURE.md`     | Updated version to 3.3.0                                      |
| `RELEASE_v2.8.4.md`   | Created comprehensive release documentation                   |

---

## Risk Assessment

### Residual Risk: NONE

**Initial Concern**: If production had legacy status values (`closed`, `written_off`, `cancelled`), those loans would not be zeroed by the new terminal list.

**Resolution**: SQL verification confirmed **zero loans** with legacy statuses exist in production. All loan statuses align with `loanStatuses.ts` constants.

---

## Deployment Timeline

| Time                   | Action                                        | Status      |
| ---------------------- | --------------------------------------------- | ----------- |
| 2026-01-08 06:00 UTC+2 | Created migrations                            | ✅ Complete |
| 2026-01-08 06:15 UTC+2 | Deployed to Supabase (`puahejtaskncpazjyxqp`) | ✅ Complete |
| 2026-01-08 06:20 UTC+2 | Verified production data                      | ✅ Complete |
| 2026-01-08 06:20 UTC+2 | Updated documentation                         | ✅ Complete |

---

## Rollback Plan

If rollback is needed (unlikely):

1. **Terminal Status Rollback**:

   ```sql
   -- Revert to previous terminal list
   DROP VIEW IF EXISTS public.loan_balance_summary;
   -- Re-run 20260108070100_expand_loan_balance_summary_view.sql
   ```

2. **Access Control Rollback**:

   ```sql
   -- Re-add approver role
   -- Re-run 20260108070000_fix_approval_rpc_status_validation.sql
   ```

---

## Next Steps

1. ✅ Monitor loan balance calculations for terminal loans
2. ✅ Monitor approval workflow for access control issues
3. ✅ Verify no regression in loan creation flow
4. ⏳ Continue with remaining production readiness tasks

---

## References

- **Source Code**: `/Users/tonystark/Downloads/Dev/namlend-trust-portal-v220-main`
- **Migrations**: `/supabase/migrations/`
- **Constants**: `/src/constants/loanStatuses.ts`
- **Service**: `/src/services/ledgerService.ts`
- **Supabase Project**: `puahejtaskncpazjyxqp` (eu-north-1)

---

**Release Manager**: Cascade AI  
**Approved By**: User Review  
**Deployment Status**: ✅ Production
