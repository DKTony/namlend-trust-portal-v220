# NamLend Trust - Testing Documentation

**Doc Revision**: 2026-01-19

---

## Testing Overview

- **E2E**: Playwright in `e2e/`
- **Unit/Integration**: Vitest-style tests in `tests/` and `src/tests/`

---

## E2E (Playwright)

### Directory Structure

```
e2e/
├── api/                       # API/RPC tests
├── helpers/                   # Auth/admin helpers
├── fixtures.ts                # Isolated auth fixtures
├── global-setup.ts            # Global setup
├── *.e2e.ts                   # UI flows
├── *.spec.ts                  # UI/spec tests
├── *.sql                      # Test data seed/cleanup
└── unit/                      # Utility-focused tests
```

### Key Test Files (Current)

- `e2e/admin-approvals-actions.e2e.ts`
- `e2e/admin-approvals.e2e.ts`
- `e2e/admin-currency.e2e.ts`
- `e2e/assign-role-modal.spec.ts`
- `e2e/backoffice-disbursement.e2e.ts`
- `e2e/dashboard-nav.e2e.ts`
- `e2e/ips-payment-flow.e2e.ts`
- `e2e/loan-application.e2e.ts`
- `e2e/navigation-pages.e2e.ts`
- `e2e/role-routing.e2e.ts`
- `e2e/signout.e2e.ts`

**API/RPC tests** in `e2e/api/`:

- `admin-rpc.e2e.ts`
- `approval-rpc-race-condition.e2e.ts`
- `disbursement.e2e.ts`
- `disbursements-ledger-crud.e2e.ts`
- `disbursements-ledger.e2e.ts`
- `disbursements-rls.e2e.ts`
- `documents-rls.e2e.ts`
- `ips-adapter.e2e.ts`
- `ips-rpc.e2e.ts`
- `tigerbeetle-balance.e2e.ts`

### Fixtures and Test Users

Fixtures live in `e2e/fixtures.ts` and create isolated Supabase clients per test.

Test users:

- `admin@test.namlend.com`
- `client1@test.namlend.com`
- `client2@test.namlend.com`
- `loan_officer@test.namlend.com`

### Running E2E

```bash
npm run dev:e2e      # Start dev server in E2E mode
npm run test:e2e     # Run Playwright
npm run test:e2e:ui  # Playwright UI
```

Notes:
- Playwright is configured to run only `*.e2e.ts` (`playwright.config.ts`). Any `*.spec.ts` files under `e2e/` are currently excluded (e.g. `assign-role-modal.spec.ts`).
- Base URL defaults to `http://localhost:8080` and can be overridden with `BASE_URL`.

---

## Unit and Integration Tests

Location:

- `tests/unit/`
- `tests/integration/`
- `src/tests/`

These tests use Vitest-style APIs. Ensure `vitest` is installed if you plan to run them (not currently in package.json).

Example:

```bash
npx vitest
```

---

## Test Data Utilities

SQL fixtures and helpers live in `e2e/*.sql`. Common scripts:

- `e2e/create-test-data.sql`
- `e2e/create-test-users.sql`
- `e2e/seed-ui-test-data.sql`
- `e2e/cleanup-ui-test-data.sql`

---

## Test Patterns

### Conditional UI State Detection

When testing UI components that conditionally render based on entity status (e.g., approve/reject buttons only for pending requests), use the following pattern:

```typescript
// Check for either action buttons (pending) or processed state (approved/rejected)
const approveBtn = page.getByTestId('approvals-approve-btn');
const processedState = page.getByTestId('approvals-processed-state');

const isPending = await Promise.race([
  approveBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false),
  processedState.waitFor({ state: 'visible', timeout: 5000 }).then(() => false).catch(() => false),
]);

if (isPending) {
  // Test pending state behavior
  await expect(approveBtn).toBeVisible();
} else {
  // Test processed state behavior
  await expect(processedState).toBeVisible();
}
```

### Service Role Key for Setup/Teardown

API tests that need to insert/delete data directly (bypassing RLS) should use the service role client:

```typescript
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serviceClient: ReturnType<typeof createClient> | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('My Test Suite', () => {
  // Skip entire suite if no service key
  test.skip(!serviceClient, 'SUPABASE_SERVICE_ROLE_KEY not set');

  // Use serviceClient for setup/teardown, regular client for RPC calls
});
```

---

## Coverage Notes

Coverage targets are not enforced in CI. Update this document after adding or removing tests.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [QUICK_START.md](./QUICK_START.md) - Quick reference for common commands
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) - Test infrastructure debt items
- [IPS_TESTING.md](./IPS_TESTING.md) - IPS-specific testing guide
- [E2E_AUTH_PERSISTENCE_FIX.md](./E2E_AUTH_PERSISTENCE_FIX.md) - Auth testing details
