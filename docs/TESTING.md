# NamLend Trust - Testing Documentation

**Last Updated**: 2026-03-22
**Aligned With**: Post-E2E-fixes codebase
**Status**: Current ✅
**Original Doc Revision**: 2026-01-19

---

## Testing Overview

- **E2E**: Playwright in `e2e/` — **56 tests passing** ✅
- **Unit**: Vitest (`^4.0.18`) in `src/tests/` — run with `npm run test:unit` (137 passing tests)

### Recent Updates (2026-03-22)

- ✅ Fixed loan application E2E test (`e2e/loan-application.e2e.ts`)
- ✅ Implemented KYC document seeding for test users
- ✅ Corrected test navigation to use dashboard "Apply Now" button
- ✅ Added timing fixes for Convex reactive query population

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

Fixtures live in `e2e/fixtures.ts` and create isolated Convex auth sessions per test.

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
  approveBtn
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false),
  processedState
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => false)
    .catch(() => false),
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

---

## Milestone A — N4 E2E Baseline Triage Report

**Date**: 2026-02-22  
**Plan reference**: `plan/plan.md` — Milestone A (N4 E2E Stability Gate)  
**Architecture**: Convex backend (active) + Supabase (legacy, retained for reference)

### Environment Wiring

| Variable                    | Purpose                                         | Required for                       |
| --------------------------- | ----------------------------------------------- | ---------------------------------- |
| `VITE_CONVEX_URL`           | Convex backend URL                              | All UI tests (Convex Auth)         |
| `VITE_SUPABASE_URL`         | Supabase project URL                            | Legacy Supabase tests only         |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anon key                               | Legacy Supabase tests only         |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key                            | `approval-rpc-race-condition` only |
| `E2E_ADMIN_EMAIL`           | Admin login (default: `admin@test.namlend.com`) | All UI tests                       |
| `E2E_ADMIN_PASSWORD`        | Admin password (default: `test123`)             | All UI tests                       |
| `BASE_URL`                  | App base URL (default: `http://localhost:8080`) | All UI tests                       |

**Global setup** (`e2e/global-setup.ts`): Convex-first. Supabase seeding is optional — skips gracefully when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are absent. UI tests authenticate via Convex Auth login form (`signInViaUI` in `fixtures.ts`).

### Full Test Inventory & Triage Matrix

#### UI / Browser Tests (Convex Auth via login form)

These tests authenticate through the app UI using Convex Auth. They do **not** depend on Supabase credentials.

| File                             | Tests | Status           | Notes                                                          |
| -------------------------------- | ----- | ---------------- | -------------------------------------------------------------- |
| `loan-application.e2e.ts`        | 1     | **convex-ready** | Form flow, non-mutating                                        |
| `backoffice-disbursement.e2e.ts` | ~8    | **convex-ready** | Admin UI disbursement flow                                     |
| `budget-tracker.e2e.ts`          | ~10   | **convex-ready** | Client budget tracker UI                                       |
| `ips-payment-flow.e2e.ts`        | ~15   | **convex-ready** | IPS payment UI flow                                            |
| `payment-ips-modal.e2e.ts`       | ~6    | **convex-ready** | IPS payment modal                                              |
| `admin-approvals.e2e.ts`         | ~4    | **convex-ready** | Admin approval queue UI                                        |
| `admin-approvals-actions.e2e.ts` | ~4    | **convex-ready** | Approve/reject actions                                         |
| `admin-currency.e2e.ts`          | ~3    | **convex-ready** | NAD currency display                                           |
| `navigation-pages.e2e.ts`        | ~8    | **convex-ready** | Route/page navigation                                          |
| `dashboard-nav.e2e.ts`           | 1     | **convex-ready** | Dashboard nav smoke                                            |
| `role-routing.e2e.ts`            | ~2    | **convex-ready** | Role-based routing                                             |
| `signout.e2e.ts`                 | ~2    | **convex-ready** | Sign-out flow                                                  |
| `accessibility.e2e.ts`           | ~2    | **convex-ready** | Basic a11y checks                                              |
| `assign-role-modal.spec.ts`      | ~2    | **convex-ready** | Role assignment modal (excluded from default run — `.spec.ts`) |

**Auth helper note**: `e2e/helpers/auth.ts` uses `SUPABASE_STORAGE_KEY = 'namlend-auth'` for localStorage session injection. This must match the Convex Auth storage key used by the app. Verify if session persistence fails during UI tests.

#### API / RLS Tests — Legacy Supabase (Quarantined)

These tests call Supabase directly (RPC, table access, Edge Functions). They **self-skip** when Supabase credentials are absent. Quarantine annotations added 2026-02-22.

| File                                     | Category                    | Status                            | Skip guard                              | Migration target                      |
| ---------------------------------------- | --------------------------- | --------------------------------- | --------------------------------------- | ------------------------------------- |
| `api/admin-rpc.e2e.ts`                   | Supabase RPC                | **quarantined** [legacy-supabase] | `!SUPABASE_URL \|\| !SUPABASE_ANON_KEY` | `api.analytics` (N2 batch)            |
| `api/disbursements-ledger.e2e.ts`        | Supabase table read         | **quarantined** [legacy-supabase] | `!SUPABASE_URL \|\| !SUPABASE_ANON_KEY` | `api.disbursements` (N2 batch)        |
| `api/disbursements-ledger-crud.e2e.ts`   | Supabase table CRUD         | **quarantined** [legacy-supabase] | `!SUPABASE_URL \|\| !SUPABASE_ANON_KEY` | `api.disbursements` (N2 batch)        |
| `api/tigerbeetle-balance.e2e.ts`         | Supabase view + TB accounts | **quarantined** [legacy-supabase] | `!SUPABASE_ANON_KEY`                    | `api.loans.getLoanBalance` (N2 batch) |
| `api/approval-rpc-race-condition.e2e.ts` | Supabase RPC + service key  | **quarantined** [legacy-supabase] | `!serviceClient`                        | `api.approvalWorkflow` (N2 batch)     |
| `api/disbursements-rls.e2e.ts`           | Supabase RLS                | **quarantined** [legacy-supabase] | fixture auth (skips if creds absent)    | `api.disbursements` (N2 batch)        |
| `api/documents-rls.e2e.ts`               | Supabase Storage RLS        | **quarantined** [legacy-supabase] | fixture auth (skips if creds absent)    | Convex file storage (N2 batch)        |
| `api/disbursement.e2e.ts`                | Supabase RPC                | **quarantined** [legacy-supabase] | fixture auth (skips if creds absent)    | `api.disbursements` (N2 batch)        |

#### API / Edge Function Tests — Legacy Supabase (Self-skipping)

These tests call Supabase Edge Functions (now inactive — replaced by Convex). They self-skip when `VITE_SUPABASE_URL` is absent via `test.skip(!supabaseUrl, ...)`.

| File                                         | Edge Function        | Status                      | Migration target                |
| -------------------------------------------- | -------------------- | --------------------------- | ------------------------------- |
| `api/api-analytics.e2e.ts`                   | `api-analytics`      | **skip** [supabase-edge-fn] | `api.analytics` (N2 batch)      |
| `api/api-audit.e2e.ts`                       | `api-audit`          | **skip** [supabase-edge-fn] | `api.audit` (N2 batch)          |
| `api/api-collections.e2e.ts`                 | `api-collections`    | **skip** [supabase-edge-fn] | `api.collections` (N2 batch)    |
| `api/api-notifications.e2e.ts`               | `api-notifications`  | **skip** [supabase-edge-fn] | `api.notifications` (N2 batch)  |
| `api/api-reconciliation.e2e.ts`              | `api-reconciliation` | **skip** [supabase-edge-fn] | `api.reconciliation` (N2 batch) |
| `api/api-disbursements-orchestration.e2e.ts` | `api-disbursements`  | **skip** [supabase-edge-fn] | `api.disbursements` (N2 batch)  |
| `api/ips-adapter.e2e.ts`                     | `ips-adapter`        | **skip** [supabase-edge-fn] | `api.ips` (N2 batch)            |
| `api/ips-rpc.e2e.ts`                         | Supabase IPS RPCs    | **skip** [supabase-edge-fn] | `api.ips` (N2 batch)            |

#### Unit Tests

| File                        | Status   | Notes                               |
| --------------------------- | -------- | ----------------------------------- |
| `unit/currency-util.e2e.ts` | **pass** | Pure utility, no backend dependency |
| `unit/ips-utils.e2e.ts`     | **pass** | Pure utility, no backend dependency |

### PR Gate Set (Critical Path)

The following tests must pass on every PR before merge. Run with:

```bash
npx playwright test \
  e2e/dashboard-nav.e2e.ts \
  e2e/role-routing.e2e.ts \
  e2e/signout.e2e.ts \
  e2e/loan-application.e2e.ts \
  e2e/admin-approvals.e2e.ts \
  e2e/admin-approvals-actions.e2e.ts \
  e2e/backoffice-disbursement.e2e.ts \
  e2e/unit/
```

Or via the `npm run test:e2e` command (runs all, quarantined tests self-skip).

**Gate criteria**:

- Auth flows: `dashboard-nav`, `role-routing`, `signout` → must pass
- Loan submit path: `loan-application` → must pass
- Approval/review path: `admin-approvals`, `admin-approvals-actions` → must pass
- Disbursement path: `backoffice-disbursement` → must pass
- Collections + notifications smoke: covered by UI tests above (no dedicated smoke yet — add in N3)
- Unit tests: `unit/` → must pass

### Quarantine Register

Tests explicitly quarantined with `QUARANTINE [legacy-supabase]` annotation:

| File                                     | Reason                                            | Owner | Plan item                  |
| ---------------------------------------- | ------------------------------------------------- | ----- | -------------------------- |
| `api/admin-rpc.e2e.ts`                   | Calls Supabase `get_admin_dashboard_summary` RPC  | —     | N2 batch 5 (admin)         |
| `api/disbursements-ledger.e2e.ts`        | Reads Supabase `disbursements` table              | —     | N2 batch 2 (disbursements) |
| `api/disbursements-ledger-crud.e2e.ts`   | Inserts into Supabase `disbursements` table       | —     | N2 batch 2 (disbursements) |
| `api/tigerbeetle-balance.e2e.ts`         | Reads Supabase `loan_balance_summary` view        | —     | N2 batch 1 (loans)         |
| `api/approval-rpc-race-condition.e2e.ts` | Calls Supabase `process_approval_transaction` RPC | —     | N2 batch 1 (approvals)     |

### Baseline Count (from `npx playwright test --list`)

**259 tests across 32 files** (Convex-only mode, no server running):

- ~75 tests: UI/browser (convex-ready, require running app)
- ~2 tests: unit (pass without server)
- ~182 tests: legacy Supabase (self-skip when creds absent)

Expected outcome in CI without Supabase creds: **~77 tests run, ~182 skipped**.

### Harness Fixes Applied (2026-02-22)

1. **`e2e/global-setup.ts`**: Converted from Supabase-required to Convex-first. Supabase seeding is now optional and non-fatal. Logs clearly distinguish Convex-only mode vs Supabase-available mode.
2. **Quarantine annotations**: Added `QUARANTINE [legacy-supabase]` comments + updated `test.skip` messages in 5 legacy test files to include migration target and plan reference.
3. **`playwright.config.ts`**: Updated env wiring comment block to document all required/optional variables for Convex-first operation.
4. **`docs/TESTING.md`**: Added this baseline report (Milestone A deliverable).

### Known Flakiness / Risk Areas

| Area                                   | Risk                                                                  | Mitigation                                                          |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `e2e/helpers/auth.ts` localStorage key | `SUPABASE_STORAGE_KEY = 'namlend-auth'` may not match Convex Auth key | Verify key name against app's actual localStorage key on first run  |
| `backoffice-disbursement.e2e.ts`       | Depends on approved loans existing in Convex DB                       | Ensure test users + seed loans exist in Convex                      |
| `ips-payment-flow.e2e.ts`              | Long test (23 KB), many selectors                                     | Run headed to verify `data-testid` selectors still match current UI |
| `budget-tracker.e2e.ts`                | Long test (17 KB), complex state                                      | Run headed to verify selectors                                      |

### Next Steps (Milestone A → B)

1. Run `npm run test:e2e` with `VITE_CONVEX_URL` set — capture actual pass/fail counts.
2. Verify `SUPABASE_STORAGE_KEY` in `auth.ts` matches Convex Auth localStorage key.
3. Fix any selector drift in UI tests (use `--headed` to diagnose).
4. Begin N1: wire `creditScore`, `debtToIncomeRatio`, `recommendation` in `Loan360View` + `LoanReviewPanel`.
