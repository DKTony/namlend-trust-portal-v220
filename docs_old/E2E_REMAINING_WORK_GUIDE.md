# E2E Remaining Work - Implementation Guide

**Status:** Ready to Implement  
**Estimated Time:** 9-12 hours  
**Priority:** High (UI test stability)

---

## Overview

This guide provides step-by-step instructions for completing the remaining E2E test work. The core functionality (RPCs, RLS, API tests) is production-ready. This work focuses on UI test stability and data management.

---

## Prerequisites

- ✅ Phase 1-3 complete (UI connectivity, RPC layer, documentation)
- ✅ Disbursement API tests at 100%
- ✅ RLS policies configured
- ✅ Test fixtures created (`/e2e/fixtures.ts`)
- ✅ Test data scripts created (`/e2e/seed-ui-test-data.sql`, `/e2e/cleanup-ui-test-data.sql`)

---

## Task 1: Seed Test Data for UI Tests

**Estimated Time:** 2-3 hours  
**Priority:** High (Unblocks other work)

### Problem

UI tests expect specific loan states (approved, disbursed) but no test data exists in the database.

### Solution

Use the pre-created seeding script to populate test data before UI tests run.

### Implementation Steps

#### Step 1: Run Seeding Script Manually (Test)

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Or use Supabase CLI

cd /Users/anthony/Documents/DevWork/namlend-trust-main-3

# Option A: Via Supabase Dashboard
# 1. Open https://supabase.com/dashboard/project/puahejtaskncpazjyxqp
# 2. Go to SQL Editor
# 3. Copy contents of e2e/seed-ui-test-data.sql
# 4. Execute

# Option B: Via Supabase CLI (if configured)
supabase db execute --file e2e/seed-ui-test-data.sql
```

#### Step 2: Verify Test Data

```sql
-- Run verification queries from seed-ui-test-data.sql
SELECT 
  'Approved Loans' as category,
  COUNT(*) as count
FROM loans
WHERE purpose LIKE 'UI Test%' AND status = 'approved'
UNION ALL
SELECT 
  'Pending Disbursements' as category,
  COUNT(*) as count
FROM disbursements
WHERE reference LIKE 'UI-TEST-%' AND status = 'pending';

-- Expected output:
-- Approved Loans: 3
-- Pending Disbursements: 3
```

#### Step 3: Run UI Tests

```bash
npm run test:e2e -- --grep "Backoffice"
```

**Expected Result:** More tests should pass now that data exists.

#### Step 4: Automate Seeding in CI

Update `.github/workflows/e2e.yml`:

```yaml
# Add before test execution
- name: Seed UI Test Data
  run: |
    npx supabase db execute --file e2e/seed-ui-test-data.sql
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

- name: Run E2E Tests
  run: npm run test:e2e
  # ... existing config

- name: Cleanup UI Test Data
  if: always()
  run: |
    npx supabase db execute --file e2e/cleanup-ui-test-data.sql
```

#### Step 5: Add Local Seeding Script

Create `/e2e/seed-local.sh`:

```bash
#!/bin/bash
# Seed UI test data locally

echo "Seeding UI test data..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI not found. Please install it first."
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Execute seeding script
supabase db execute --file e2e/seed-ui-test-data.sql

echo "✅ UI test data seeded successfully"
echo ""
echo "Run tests with: npm run test:e2e -- --grep 'Backoffice'"
echo "Clean up with: supabase db execute --file e2e/cleanup-ui-test-data.sql"
```

Make it executable:

```bash
chmod +x e2e/seed-local.sh
```

### Verification

- [ ] Seeding script runs without errors
- [ ] Verification queries show correct counts
- [ ] UI tests can find "Disburse" buttons
- [ ] Tests can complete disbursement flow
- [ ] Cleanup script removes all test data

### Files Modified

- `.github/workflows/e2e.yml` (add seeding step)
- `/e2e/seed-local.sh` (new file)

---

## Task 2: Fix Auth Session Persistence

**Estimated Time:** 3-4 hours  
**Priority:** High (Eliminates flaky tests)

### Problem

Parallel test execution causes auth sessions to be invalidated, leading to intermittent "user is null" failures.

### Solution

Use test fixtures with isolated Supabase client instances.

### Implementation Steps

#### Step 1: Update Disbursement API Tests

**File:** `/e2e/api/disbursement.e2e.ts`

```typescript
// BEFORE
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ... manual authentication

test('Admin can disburse', async () => {
  const { data, error } = await adminClient.rpc('complete_disbursement', {...});
  // ...
});

// AFTER
import { test, expect, TEST_USERS } from '../fixtures';

test('Admin can disburse', async ({ adminSupabase }) => {
  const { data, error } = await adminSupabase.rpc('complete_disbursement', {...});
  // ...
});
```

**Changes:**

1. Remove manual client creation
2. Remove `beforeAll` authentication
3. Remove `afterAll` sign-out
4. Use fixture parameters instead

#### Step 2: Update Disbursements RLS Tests

**File:** `/e2e/api/disbursements-rls.e2e.ts`

```typescript
// BEFORE
test.describe('Disbursements Table RLS', () => {
  let clientSupabase: ReturnType<typeof createClient>;
  let adminSupabase: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await clientSupabase.auth.signInWithPassword({...});
    // ...
  });

  test('Client can read own', async () => {
    const { data } = await clientSupabase.from('disbursements').select('*');
    // ...
  });
});

// AFTER
import { test, expect } from '../fixtures';

test.describe('Disbursements Table RLS', () => {
  test('Client can read own', async ({ client1Supabase }) => {
    const { data } = await client1Supabase.from('disbursements').select('*');
    // ...
  });

  test('Admin can read all', async ({ adminSupabase }) => {
    const { data } = await adminSupabase.from('disbursements').select('*');
    // ...
  });
});
```

#### Step 3: Update Documents RLS Tests

**File:** `/e2e/api/documents-rls.e2e.ts`

Same pattern as above - replace manual client management with fixtures.

#### Step 4: Remove Re-authentication Workarounds

Search for and remove all instances of:

```typescript
// Remove these workarounds
await client1Supabase.auth.signInWithPassword({
  email: CLIENT_1_EMAIL,
  password: CLIENT_1_PASSWORD,
});
```

Fixtures handle authentication automatically.

#### Step 5: Test Parallel Execution

```bash
# Run with full parallelization
npm run test:e2e -- --workers=6

# Check for auth-related failures
# Should see no "user is null" errors
```

### Verification

- [ ] No manual client creation in test files
- [ ] No `beforeAll`/`afterAll` auth code
- [ ] No re-authentication workarounds
- [ ] Tests pass with `--workers=6`
- [ ] No "user is null" errors in output

### Files Modified

- `/e2e/api/disbursement.e2e.ts`
- `/e2e/api/disbursements-rls.e2e.ts`
- `/e2e/api/documents-rls.e2e.ts`

---

## Task 3: Update UI Selectors

**Estimated Time:** 4-5 hours  
**Priority:** Medium (Requires test data first)

### Problem

UI tests use fragile selectors that don't match actual DOM structure or are outside viewport.

### Solution

Add `data-testid` attributes to UI components and update test selectors.

### Implementation Steps

#### Step 1: Run Playwright Codegen

```bash
# Start dev server
npm run dev:e2e

# In another terminal, run codegen
npx playwright codegen http://localhost:8080/auth

# Actions to record:
# 1. Login as admin
# 2. Navigate to Loans page
# 3. Click "Approved" filter
# 4. Click "Disburse" button
# 5. Fill payment details
# 6. Click "Complete Disbursement"
# 7. Click "Cancel"
```

**Save the generated selectors** for reference.

#### Step 2: Add Data Attributes to UI Components

**File:** `/src/pages/AdminDashboard/components/PaymentManagement/CompleteDisbursementModal.tsx`

```typescript
// Add data-testid attributes
<Dialog>
  <DialogContent data-testid="disbursement-modal">
    <DialogTitle data-testid="modal-title">Complete Disbursement</DialogTitle>
    
    <Select data-testid="payment-method-select">
      {/* ... */}
    </Select>
    
    <Input 
      data-testid="payment-reference-input"
      placeholder="Payment Reference"
    />
    
    <Textarea 
      data-testid="disbursement-notes"
      placeholder="Notes (optional)"
    />
    
    <Button 
      data-testid="complete-disbursement-button"
      onClick={handleComplete}
    >
      Complete Disbursement
    </Button>
    
    <Button 
      data-testid="cancel-disbursement-button"
      variant="outline"
      onClick={onClose}
    >
      Cancel
    </Button>
  </DialogContent>
</Dialog>
```

**File:** `/src/pages/AdminDashboard/components/LoansGrid.tsx`

```typescript
// Add data-testid to Disburse button
<Button
  data-testid={`disburse-loan-${loan.id}`}
  onClick={() => handleDisburse(loan)}
>
  Disburse
</Button>

// Add data-testid to status filters
<Button
  data-testid="filter-approved"
  variant={filter === 'approved' ? 'default' : 'outline'}
  onClick={() => setFilter('approved')}
>
  Approved
</Button>
```

#### Step 3: Update Test Selectors

**File:** `/e2e/backoffice-disbursement.e2e.ts`

```typescript
// BEFORE: Fragile text-based selectors
await page.click('button:has-text("Disburse")');
await page.fill('input[placeholder="Payment Reference"]', 'TEST-REF');
await page.click('button:has-text("Cancel")');

// AFTER: Stable data-testid selectors
await page.click('[data-testid^="disburse-loan-"]');
await page.fill('[data-testid="payment-reference-input"]', 'TEST-REF');

// Fix viewport issues
const cancelButton = page.locator('[data-testid="cancel-disbursement-button"]');
await cancelButton.scrollIntoViewIfNeeded();
await cancelButton.click();
```

#### Step 4: Update All UI Tests

Replace all instances of:

```typescript
// Replace these patterns:
'button:has-text("...")' → '[data-testid="..."]'
'input[placeholder="..."]' → '[data-testid="..."]'
'text=...' → '[data-testid="..."]'
```

#### Step 5: Handle Viewport Issues

```typescript
// For elements that might be outside viewport
async function clickElement(page, selector: string) {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await element.click();
}

// Use in tests
await clickElement(page, '[data-testid="cancel-button"]');
```

### Verification

- [ ] All UI components have `data-testid` attributes
- [ ] Tests use `data-testid` selectors
- [ ] No viewport-related failures
- [ ] Tests pass consistently (run 3x)
- [ ] No timeout errors

### Files Modified

- `/src/pages/AdminDashboard/components/PaymentManagement/CompleteDisbursementModal.tsx`
- `/src/pages/AdminDashboard/components/LoansGrid.tsx`
- `/e2e/backoffice-disbursement.e2e.ts`

---

## Testing Checklist

After completing all tasks, verify:

### API Tests

- [ ] `npm run test:e2e -- --grep "Disbursement API"` → 6/6 passing
- [ ] `npm run test:e2e -- --grep "Disbursements.*RLS"` → 16/16 passing
- [ ] `npm run test:e2e -- --grep "Documents.*RLS"` → 14/14 passing

### UI Tests

- [ ] `npm run test:e2e -- --grep "Backoffice"` → 10/10 passing

### Full Suite

- [ ] `npm run test:e2e` → 64/64 passing (100%)
- [ ] No flaky tests (run 3x, all pass)
- [ ] CI pipeline passes

---

## Troubleshooting

### Issue: Seeding Script Fails

**Error:** `relation "loans" does not exist`

**Solution:**

- Verify Supabase connection
- Check database schema is up to date
- Run migrations first: `supabase db push`

### Issue: Fixtures Not Working

**Error:** `Cannot find module '../fixtures'`

**Solution:**

- Verify `/e2e/fixtures.ts` exists
- Check TypeScript compilation
- Restart TypeScript server

### Issue: UI Tests Still Timeout

**Error:** `Test timeout of 60000ms exceeded`

**Solution:**

- Verify dev server is running: `npm run dev:e2e`
- Check port 8080 is not in use: `lsof -i :8080`
- Increase timeout in `playwright.config.ts`:

  ```typescript
  timeout: 90_000, // 90 seconds
  ```

### Issue: Data Attributes Not Found

**Error:** `locator('[data-testid="..."]') not found`

**Solution:**

- Verify UI components were updated
- Rebuild app: `npm run build`
- Check browser DevTools for actual attributes

---

## Success Metrics

### Before

- Overall: 40+/64 (62%+)
- Backoffice UI: 3/10 (30%)
- Flaky tests: ~20%

### After

- Overall: 64/64 (100%) ✅
- Backoffice UI: 10/10 (100%) ✅
- Flaky tests: 0% ✅

---

## Next Steps After Completion

1. **Update Documentation**
   - Update `/docs/E2E_EXECUTION_RUNBOOK.md` with new seeding steps
   - Document fixture usage patterns
   - Add troubleshooting entries

2. **CI/CD Integration**
   - Verify GitHub Actions workflow passes
   - Add test data seeding to CI
   - Configure test result reporting

3. **Team Handover**
   - Share updated documentation
   - Demonstrate fixture usage
   - Review test data management

4. **Production Deployment**
   - Deploy RPC functions
   - Deploy RLS policies
   - Monitor for issues

---

## Support

For questions or issues:

- Review `/docs/E2E_EXECUTION_RUNBOOK.md`
- Check `/docs/E2E_FINAL_SUMMARY.md`
- Consult `/docs/ADR_DISBURSEMENT_RPC_CONTRACT.md`

---

## Estimated Timeline

| Task | Time | Dependencies |
|------|------|--------------|
| Seed Test Data | 2-3h | None |
| Fix Auth Sessions | 3-4h | None |
| Update UI Selectors | 4-5h | Test data seeded |
| **Total** | **9-12h** | - |

**Recommended Order:**

1. Seed test data (unblocks UI work)
2. Fix auth sessions (parallel with #1)
3. Update UI selectors (requires #1)
