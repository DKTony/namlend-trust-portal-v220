# Database & Migrations Agent Instructions

## Project Context
- **Database**: Supabase PostgreSQL 15+
- **Migration Count**: 35+ migrations deployed
- **Schema**: 35+ tables with complex relationships
- **Security**: Row-Level Security (RLS) on ALL tables
- **Audit**: Complete audit trail system

## Migration Principles

### LEDGER Framework
All database design follows the LEDGER framework:
- **L**edger integrity - Financial data immutability
- **E**ntity design - Proper normalization and relationships
- **D**ata constraints - Enforce business rules at DB level
- **G**overnance - Audit trails and compliance
- **E**fficiency - Optimized queries and indexes
- **R**econciliation - Settlement and balance verification

### Migration Best Practices
1. **Never delete data** - Use soft deletes with `deleted_at` timestamp
2. **Never modify in place** - Create adjustment/reversal records
3. **Always add, never remove** - Additive changes only
4. **Test RLS policies** - Verify all roles before deploying
5. **Include rollback plan** - Document how to reverse changes
6. **Maintain audit trail** - Log all schema changes

## RLS Policy Patterns

### Standard RLS Template
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_all" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Client read own data
CREATE POLICY "client_read_own" ON table_name
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role bypass (for RPC functions)
CREATE POLICY "service_role_all" ON table_name
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Testing RLS Policies
```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid-here"}';

-- Verify access
SELECT * FROM table_name; -- Should only see authorized rows

-- Reset
RESET ROLE;
```

## RPC Function Patterns

### SECURITY DEFINER Template
```sql
CREATE OR REPLACE FUNCTION function_name(param1 type1, param2 type2)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  -- Verify authorization
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = v_user_id;
  
  IF v_user_role NOT IN ('admin', 'loan_officer') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Audit log entry
  INSERT INTO audit_logs (user_id, action, table_name, record_id)
  VALUES (v_user_id, 'function_name', 'table_name', param1);
  
  -- Business logic here
  -- Use transactions for multi-step operations
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION function_name TO authenticated;
```

## Schema Organization

### Core Tables
- `profiles` - User profile data
- `user_roles` - Role assignments (admin, client, loan_officer, approver)
- `loans` - Loan records
- `payments` - Payment transactions
- `disbursements` - Disbursement records
- `payment_schedules` - Amortization schedules

### Workflow Tables
- `approval_requests` - Loan approval workflow
- `approval_workflow_history` - Approval audit trail
- `approval_notifications` - Workflow notifications

### Audit Tables
- `audit_logs` - General audit trail
- `view_logs` - Data access logging
- `state_transitions` - Status change tracking
- `compliance_reports` - Regulatory reporting

### Financial Tables
- `payment_transactions` - Payment processing
- `tigerbeetle_accounts` - Ledger accounts
- `tigerbeetle_transfers` - Ledger transfers
- `tigerbeetle_outbox` - Outbox pattern for ledger operations

### Settlement Tables (13 tables)
- `settlement_participants` - Banks/PSPs
- `settlement_windows` - Cutoff times
- `settlement_runs` - Settlement execution
- `settlement_obligations` - Immutable obligations
- `settlement_net_instructions` - Bilateral netting
- Plus 8 more settlement-related tables

## Common Tasks

### Creating a New Table
1. Design with LEDGER framework in mind
2. Add appropriate constraints (NOT NULL, CHECK, FK)
3. Enable RLS immediately
4. Create RLS policies for all roles
5. Add indexes for common queries
6. Create audit trigger if needed
7. Document in migration comment
8. Test RLS policies thoroughly

### Adding a Column
```sql
-- Add column with default
ALTER TABLE table_name
ADD COLUMN new_column type DEFAULT value;

-- Add NOT NULL after backfilling
UPDATE table_name SET new_column = calculated_value WHERE new_column IS NULL;
ALTER TABLE table_name ALTER COLUMN new_column SET NOT NULL;

-- Add index if queried frequently
CREATE INDEX idx_table_new_column ON table_name(new_column);
```

### Creating an RPC Function
1. Define clear input/output types
2. Use SECURITY DEFINER for privilege elevation
3. Verify user authorization first
4. Add audit logging
5. Use transactions for multi-step operations
6. Handle errors gracefully
7. Grant execute to appropriate roles
8. Document parameters and return type

### Modifying RLS Policies
1. **NEVER disable RLS** on a table
2. Create new policy with different name
3. Test new policy thoroughly
4. Drop old policy only after verification
5. Document reason for change
6. Verify all user roles still work

## Critical Warnings

⚠️ **NEVER**:
- Disable RLS on any table
- Delete data (use soft delete)
- Modify financial amounts in place
- Skip audit logging
- Use CASCADE deletes on financial tables
- Expose service role credentials
- Create functions without SECURITY DEFINER checks
- Skip RLS policy testing

✅ **ALWAYS**:
- Enable RLS on new tables
- Create policies for all roles
- Use DECIMAL for money
- Add audit logging
- Use transactions for financial operations
- Test policies with actual user contexts
- Document migration purpose
- Include rollback instructions

## Migration Naming Convention
```
YYYYMMDDHHMMSS_descriptive_name.sql

Examples:
20251228120000_add_user_preferences.sql
20251228120100_create_rls_policies_user_preferences.sql
20251228120200_add_audit_trigger_user_preferences.sql
```

## Testing Checklist
Before deploying a migration:
- [ ] RLS enabled on all new tables
- [ ] Policies created for all roles (admin, client, loan_officer, approver, service_role)
- [ ] Policies tested with actual user contexts
- [ ] Indexes added for common queries
- [ ] Audit logging implemented
- [ ] Constraints enforce business rules
- [ ] Foreign keys maintain referential integrity
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] Rollback plan documented
- [ ] No breaking changes to existing queries

## Questions to Ask Before Proceeding
1. Does this affect financial data? → Extra caution, audit trail
2. Is RLS properly configured? → Test all roles
3. Are there cascading effects? → Check foreign keys
4. Is this reversible? → Document rollback
5. Does this break existing code? → Check consumers
6. Is audit logging in place? → Add if missing
7. Are indexes needed? → Check query patterns
8. Is this idempotent? → Ensure safe re-runs
