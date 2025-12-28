---
description: Audit RLS policies for security compliance
---

# RLS Security Audit

This workflow helps you audit Row-Level Security policies to ensure data security compliance.

## Overview

RLS (Row-Level Security) is the ultimate authority for data access in NamLend Trust. This audit ensures:
- All tables have RLS enabled
- Policies exist for all user roles
- No data leakage between users
- Service role is properly scoped

## Quick Security Check

1. List all tables without RLS enabled
```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND rowsecurity = true
)
ORDER BY tablename;
```

**Expected result:** Empty (all tables should have RLS)

2. Check for tables with no policies
```sql
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.rowsecurity = true
AND NOT EXISTS (
  SELECT 1 FROM pg_policies p
  WHERE p.schemaname = t.schemaname
  AND p.tablename = t.tablename
)
ORDER BY t.tablename;
```

**Expected result:** Empty (all tables should have policies)

## Role-Based Policy Audit

3. Verify admin policies exist on all tables
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
AND tablename NOT IN (
  SELECT tablename
  FROM pg_policies
  WHERE policyname LIKE '%admin%'
)
ORDER BY tablename;
```

4. Verify client policies exist on user-facing tables
```sql
-- Tables that should have client policies
WITH client_tables AS (
  SELECT unnest(ARRAY[
    'loans', 'payments', 'payment_schedules', 'disbursements',
    'documents', 'profiles', 'notifications', 'credit_scores'
  ]) AS tablename
)
SELECT ct.tablename
FROM client_tables ct
WHERE ct.tablename NOT IN (
  SELECT tablename
  FROM pg_policies
  WHERE policyname LIKE '%client%'
);
```

5. Verify service role policies exist
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
AND tablename NOT IN (
  SELECT tablename
  FROM pg_policies
  WHERE policyname LIKE '%service_role%'
)
ORDER BY tablename;
```

## Test Policies with User Contexts

6. **Test as Admin** (should see all data)
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "fbf720fd-7de2-4142-974f-6d6809f4f8c6"}';

-- Test critical tables
SELECT COUNT(*) FROM loans;
SELECT COUNT(*) FROM payments;
SELECT COUNT(*) FROM profiles;

RESET ROLE;
```

7. **Test as Client1** (should only see own data)
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-0000-0000-0000-000000000001"}';

-- Should only see own loans
SELECT user_id, COUNT(*) FROM loans GROUP BY user_id;

-- Should only see own payments
SELECT COUNT(*) FROM payments p
JOIN loans l ON p.loan_id = l.id
WHERE l.user_id != '11111111-0000-0000-0000-000000000001';
-- Expected: 0 (should not see other users' payments)

RESET ROLE;
```

8. **Test as Client2** (should not see Client1's data)
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-0000-0000-0000-000000000002"}';

-- Verify data isolation
SELECT COUNT(*) FROM loans WHERE user_id = '11111111-0000-0000-0000-000000000001';
-- Expected: 0 (should not see Client1's loans)

RESET ROLE;
```

9. **Test as Loan Officer** (should see assigned loans)
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "44444444-0000-0000-0000-000000000004"}';

-- Should see loans in approval queue
SELECT COUNT(*) FROM approval_requests;

RESET ROLE;
```

## Financial Data Security Audit

10. Verify payment data is protected
```sql
-- Test that clients can't see other clients' payment details
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-0000-0000-0000-000000000001"}';

SELECT COUNT(*) FROM payments p
JOIN loans l ON p.loan_id = l.id
WHERE l.user_id != '11111111-0000-0000-0000-000000000001';
-- Expected: 0

RESET ROLE;
```

11. Verify disbursement data is protected
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-0000-0000-0000-000000000001"}';

SELECT COUNT(*) FROM disbursements d
JOIN loans l ON d.loan_id = l.id
WHERE l.user_id != '11111111-0000-0000-0000-000000000001';
-- Expected: 0

RESET ROLE;
```

12. Verify TigerBeetle ledger is protected
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-0000-0000-0000-000000000001"}';

-- Clients should not have direct access to ledger
SELECT COUNT(*) FROM tigerbeetle_transfers;
-- Expected: 0 or error (access denied)

RESET ROLE;
```

## Audit Log Verification

13. Check that audit logging is working
```sql
-- Recent audit log entries
SELECT user_id, action, table_name, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

14. Verify state transitions are logged
```sql
-- Recent state transitions
SELECT entity_type, entity_id, from_state, to_state, created_at
FROM state_transitions
ORDER BY created_at DESC
LIMIT 10;
```

## Policy Coverage Report

15. Generate comprehensive policy coverage report
```sql
WITH table_policies AS (
  SELECT
    t.tablename,
    t.rowsecurity AS rls_enabled,
    COUNT(DISTINCT p.policyname) AS policy_count,
    ARRAY_AGG(DISTINCT p.policyname ORDER BY p.policyname) AS policies
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, t.rowsecurity
)
SELECT
  tablename,
  rls_enabled,
  policy_count,
  CASE
    WHEN NOT rls_enabled THEN '🔴 RLS DISABLED'
    WHEN policy_count = 0 THEN '🔴 NO POLICIES'
    WHEN policy_count < 3 THEN '🟡 FEW POLICIES'
    ELSE '🟢 OK'
  END AS status,
  policies
FROM table_policies
ORDER BY
  CASE
    WHEN NOT rls_enabled THEN 1
    WHEN policy_count = 0 THEN 2
    WHEN policy_count < 3 THEN 3
    ELSE 4
  END,
  tablename;
```

## Critical Tables Checklist

Verify RLS on these critical tables:
- [ ] loans
- [ ] payments
- [ ] payment_schedules
- [ ] disbursements
- [ ] profiles
- [ ] user_roles
- [ ] documents
- [ ] credit_scores
- [ ] tigerbeetle_accounts
- [ ] tigerbeetle_transfers
- [ ] settlement_runs
- [ ] settlement_obligations
- [ ] audit_logs
- [ ] state_transitions

## Remediation Steps

If issues found:

**RLS not enabled:**
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Missing admin policy:**
```sql
CREATE POLICY "admin_all" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

**Missing service role policy:**
```sql
CREATE POLICY "service_role_all" ON table_name
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Missing client policy:**
```sql
CREATE POLICY "client_read_own" ON table_name
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

## Success Criteria
✅ All tables have RLS enabled
✅ All tables have at least 3 policies (admin, client/role-specific, service_role)
✅ User context tests pass (no data leakage)
✅ Financial data is properly isolated
✅ Audit logging is working
✅ No security warnings in coverage report

## Schedule
Run this audit:
- Before every production deployment
- After any RLS policy changes
- Monthly as part of security review
- After adding new tables
