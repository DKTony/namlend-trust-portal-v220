---
description: Create a new Supabase database migration
---

# Create New Supabase Migration

This workflow guides you through creating a safe, production-ready database migration.

## Planning Phase

1. **Define the change clearly**
   - What tables/columns are affected?
   - What is the business requirement?
   - Is this additive or does it modify existing data?

2. **Check for dependencies**
   - Will this break existing queries?
   - Are there foreign key relationships?
   - Does this affect RLS policies?
   - Will this impact TigerBeetle ledger?

3. **Plan rollback strategy**
   - How will you reverse this change?
   - Can it be rolled back safely?
   - Document the rollback steps

## Create Migration File

4. Generate migration file with timestamp
```bash
cd supabase
supabase migration new descriptive_name_here
```

5. Open the generated migration file in `supabase/migrations/`

## Write Migration (Follow LEDGER Framework)

6. **For new tables**, include:
```sql
-- Create table with constraints
CREATE TABLE table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Enable RLS immediately
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create indexes for common queries
CREATE INDEX idx_table_user_id ON table_name(user_id);
CREATE INDEX idx_table_status ON table_name(status) WHERE deleted_at IS NULL;

-- Add audit trigger
CREATE TRIGGER audit_table_name
  AFTER INSERT OR UPDATE OR DELETE ON table_name
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
```

7. **For RLS policies**, create for all roles:
```sql
-- Admin full access
CREATE POLICY "admin_all" ON table_name
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Client read own data
CREATE POLICY "client_read_own" ON table_name
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role bypass
CREATE POLICY "service_role_all" ON table_name
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

8. **For RPC functions**, use SECURITY DEFINER:
```sql
CREATE OR REPLACE FUNCTION function_name(params)
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Authorization check
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id AND role IN ('admin', 'loan_officer')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Audit log
  INSERT INTO audit_logs (user_id, action, table_name)
  VALUES (v_user_id, 'function_name', 'table_name');
  
  -- Business logic here
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION function_name TO authenticated;
```

## Test Migration Locally

// turbo
9. Apply migration to local database
```bash
supabase db reset
```

10. Verify migration applied successfully
```bash
supabase db diff
```

11. **Test RLS policies** with different user contexts:
```sql
-- Test as admin
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "fbf720fd-7de2-4142-974f-6d6809f4f8c6"}';
SELECT * FROM table_name;
RESET ROLE;

-- Test as client
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-0000-0000-0000-000000000001"}';
SELECT * FROM table_name;
RESET ROLE;
```

12. Test RPC functions if created
```sql
SELECT function_name(test_params);
```

13. Verify indexes were created
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'table_name';
```

## Quality Checklist

Before committing, verify:
- [ ] RLS is enabled on all new tables
- [ ] Policies exist for all roles (admin, client, loan_officer, approver, service_role)
- [ ] Indexes added for foreign keys and common queries
- [ ] Constraints enforce business rules (NOT NULL, CHECK, FK)
- [ ] DECIMAL type used for all monetary amounts
- [ ] Audit logging implemented
- [ ] Migration is idempotent (can run multiple times)
- [ ] Rollback plan documented in comments
- [ ] No breaking changes to existing queries

## Deploy to Production

14. Commit migration file
```bash
git add supabase/migrations/
git commit -m "feat: add [description] migration"
```

15. Push to trigger deployment
```bash
git push origin main
```

16. Monitor Supabase dashboard for migration status
- URL: https://supabase.com/dashboard/project/puahejtaskncpazjyxqp

17. Verify migration applied in production
```bash
supabase db diff --linked
```

## Post-Deployment Verification

18. Test in production:
- [ ] Tables created correctly
- [ ] RLS policies working
- [ ] Indexes present
- [ ] RPC functions executable
- [ ] No errors in Supabase logs

## Rollback (if needed)

19. If migration causes issues, create rollback migration:
```bash
supabase migration new rollback_previous_migration
```

20. Write reverse operations in rollback migration

## Common Patterns

**Adding a column:**
```sql
ALTER TABLE table_name ADD COLUMN new_column type DEFAULT value;
-- Backfill if needed
UPDATE table_name SET new_column = calculated_value WHERE new_column IS NULL;
-- Add NOT NULL after backfill
ALTER TABLE table_name ALTER COLUMN new_column SET NOT NULL;
```

**Soft delete pattern:**
```sql
ALTER TABLE table_name ADD COLUMN deleted_at timestamptz;
CREATE INDEX idx_table_active ON table_name(id) WHERE deleted_at IS NULL;
```

**Audit trigger:**
```sql
CREATE TRIGGER audit_table_name
  AFTER INSERT OR UPDATE OR DELETE ON table_name
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
```

## Success Criteria
✅ Migration file created with proper timestamp
✅ RLS enabled and policies tested
✅ Indexes created for performance
✅ Constraints enforce business rules
✅ Audit logging implemented
✅ Migration tested locally
✅ Rollback plan documented
✅ Successfully deployed to production
