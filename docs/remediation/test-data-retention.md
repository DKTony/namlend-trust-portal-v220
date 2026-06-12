# Test-Data Cleanup & Retention Safety

NamLend enforces **7-year retention** on financial records — production Convex
mutations never hard-delete loans, payments, disbursements, or compliance data
(they soft-delete / status-transition). Test tooling must not normalize the
opposite pattern.

## Rules

1. **Never hard-delete financial records in a shared/staging/production database.**
   The forbidden statements are `DELETE FROM loans|payments|disbursements|mandateExecutions`
   (and Supabase snake_case equivalents) outside a disposable test DB.
2. **Convex backend tests** use the `convex-test` in-memory harness (`convex/**/*.test.ts`).
   Each test gets a fresh isolated store — there is nothing persistent to delete.
3. **Legacy Supabase SQL helpers** (`e2e/seed-ui-test-data.sql`,
   `e2e/cleanup-ui-test-data.sql`) are retained only for disposable databases and
   are now **gated**: each begins with a guard that aborts unless the session is
   explicitly marked ephemeral:

   ```sql
   SET app.ephemeral_test = 'true';   -- only against a throwaway DB
   ```

   Without that marker the script raises an exception and performs no deletes.

4. **E2E UI tests** are Convex-first and authenticate through the login form
   (`signInViaUI`). They create namespaced data (`UI-TEST-…` / `UI Test…`) and do
   not depend on hard-delete cleanup; the Supabase REST suite (`e2e/api/*.e2e.ts`)
   self-skips when Supabase credentials are absent.

## Preferred cleanup pattern (going forward)

- Backend invariants → `convex-test` (isolated per test).
- Browser flows → namespaced test data + an ephemeral/disposable deployment, not
  destructive cleanup against a long-lived DB.
- If a destructive reset is ever required, it must run against a database created
  for that run and torn down after — never a shared environment.
