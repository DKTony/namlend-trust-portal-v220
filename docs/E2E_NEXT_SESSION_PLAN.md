# E2E Test Remediation - Next Session Action Plan

**Status:** Ready to Execute  
**Estimated Time:** 4-6 hours  
**Current Coverage:** 43/64 (67%)  
**Target Coverage:** 64/64 (100%)

---

## Session 3 Objectives

1. ✅ Migrate remaining test files to fixtures (2-2.5h)
2. ✅ Update UI selectors with data-testid (2-3h)
3. ✅ Achieve 100% test coverage

---

## Pre-Session Checklist

### Environment Setup

```bash
cd /Users/anthony/Documents/DevWork/namlend-trust-main-3

# Ensure environment variables are set
source .env

# Verify test data exists
npm run test:e2e -- --grep "Documents.*RLS"
# Should show: 14/14 passing

# Check current coverage
npm run test:e2e
# Should show: ~43/64 passing (67%)
```

### Reference Materials

- ✅ `/docs/FIXTURE_MIGRATION_GUIDE.md` - Complete migration guide
- ✅ `/e2e/api/documents-rls.e2e.ts` - Perfect example (14/14 passing)
- ✅ `/e2e/fixtures.ts` - Working fixtures implementation
- ✅ `/docs/E2E_SESSION_2_SUMMARY.md` - Previous session summary

---

## Phase 1: Migrate Test Files (2-2.5 hours)

### Task 1.1: Migrate disbursement.e2e.ts (1 hour)

**File:** `/e2e/api/disbursement.e2e.ts`  
**Current:** 6/6 passing (100%) - but using manual auth  
**Target:** 6/6 passing (100%) - using fixtures  
**Lines:** 309

#### Steps

1. **Backup the file**

   ```bash
   cp e2e/api/disbursement.e2e.ts e2e/api/disbursement.e2e.ts.backup
   ```

2. **Update imports**

   ```typescript
   // Change from:
   import { test, expect } from '@playwright/test';
   import { createClient } from '@supabase/supabase-js';
   
   // To:
   import { test, expect } from '../fixtures';
   ```

3. **Remove constants**
   Delete these lines:

   ```typescript
   const supabaseUrl = process.env.VITE_SUPABASE_URL!;
   const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
   const ADMIN_EMAIL = 'admin@test.namlend.com';
   const ADMIN_PASSWORD = 'test123';
   // ... etc
   ```

4. **Remove beforeAll/afterAll**
   Delete the entire beforeAll and afterAll blocks

5. **Update test signatures**

   **Before:**

   ```typescript
   test('admin can disburse approved loan', async () => {
     const { data, error } = await adminClient.rpc('complete_disbursement', {...});
   ```

   **After:**

   ```typescript
   test('admin can disburse approved loan', async ({ adminSupabase, client1Supabase }) => {
     const { data, error } = await adminSupabase.rpc('complete_disbursement', {...});
   ```

6. **Update all test functions**
   Add fixture parameters to all 6 tests:
   - `admin can disburse approved loan` - needs `adminSupabase`, `client1Supabase`
   - `loan_officer can disburse approved loan` - needs `loanOfficerSupabase`, `adminSupabase`, `client1Supabase`
   - `client cannot disburse loan` - needs `client1Supabase`, `adminSupabase`
   - `cannot disburse already disbursed loan` - needs `adminSupabase`, `client1Supabase`
   - `disbursement creates audit trail` - needs `adminSupabase`, `client1Supabase`
   - `validates payment method` - needs `adminSupabase`, `client1Supabase`

7. **Test the migration**

   ```bash
   npm run test:e2e -- e2e/api/disbursement.e2e.ts
   ```

   **Expected:** 6/6 passing

8. **Test parallel execution**

   ```bash
   npm run test:e2e -- e2e/api/disbursement.e2e.ts --workers=6
   ```

   **Expected:** Still 6/6 passing

#### Success Criteria

- ✅ All 6 tests passing
- ✅ No manual auth code
- ✅ No beforeAll/afterAll
- ✅ Parallel execution works
- ✅ Code reduced by ~40%

---

### Task 1.2: Migrate disbursements-rls.e2e.ts (1-1.5 hours)

**File:** `/e2e/api/disbursements-rls.e2e.ts`  
**Current:** 13/16 passing (81%) - using manual auth  
**Target:** 16/16 passing (100%) - using fixtures  
**Lines:** 507

#### Steps

1. **Backup the file**

   ```bash
   cp e2e/api/disbursements-rls.e2e.ts e2e/api/disbursements-rls.e2e.ts.backup
   ```

2. **Follow same pattern as Task 1.1**
   - Update imports
   - Remove constants
   - Remove beforeAll/afterAll
   - Update test signatures

3. **Key tests to update (16 total)**

   **Main describe block (13 tests):**
   - Client can read their own disbursements
   - Client cannot read other user disbursements
   - Client cannot create disbursement directly
   - Client cannot update disbursement
   - Client cannot delete disbursement
   - Admin can read all disbursements
   - Admin can create disbursement
   - Admin can update disbursement status
   - Loan Officer can read all disbursements
   - Loan Officer can create disbursement
   - Disbursement with invalid method is rejected (SKIPPED)
   - Disbursement query includes loan details via join
   - Disbursement query includes user profile via join

   **Unauthenticated block (2 tests):**
   - Unauthenticated user cannot read disbursements
   - Unauthenticated user cannot create disbursement

   **RPC block (2 tests):**
   - Admin can complete disbursement via RPC
   - Client cannot complete disbursement via RPC

4. **Remove manual re-authentication calls**
   Search for and remove all instances of:

   ```typescript
   await clientSupabase.auth.signInWithPassword({
     email: CLIENT_EMAIL,
     password: CLIENT_PASSWORD,
   });
   ```

5. **Test the migration**

   ```bash
   npm run test:e2e -- e2e/api/disbursements-rls.e2e.ts
   ```

   **Expected:** 16/16 passing (or 15/16 with 1 skipped)

#### Success Criteria

- ✅ All 16 tests passing (or 15 + 1 skipped)
- ✅ No manual auth code
- ✅ No beforeAll/afterAll
- ✅ Parallel execution works
- ✅ Code reduced by ~50%

---

## Phase 2: Update UI Selectors (2-3 hours)

### Task 2.1: Run Playwright Codegen (30 minutes)

#### Steps

1. **Start dev server**

   ```bash
   npm run dev:e2e
   ```

   Wait for server to start on `http://localhost:8080`

2. **Run Codegen**

   ```bash
   npx playwright codegen http://localhost:8080/auth
   ```

3. **Record these actions:**
   - Login as admin (<admin@test.namlend.com> / test123)
   - Navigate to Loans page
   - Click "Approved" filter
   - Find and click "Disburse" button
   - Observe the modal that opens
   - Note the payment method dropdown
   - Note the payment reference input
   - Note the notes textarea
   - Note the "Complete Disbursement" button
   - Note the "Cancel" button

4. **Save generated selectors**
   Create `/e2e/selectors-reference.md` with the captured selectors

#### Expected Output

Example selectors to capture:

```typescript
// Login
page.locator('input[type="email"]')
page.locator('input[type="password"]')
page.locator('button[type="submit"]')

// Loans page
page.locator('text=Loans')
page.locator('button:has-text("Approved")')

// Disburse button (note the actual selector)
page.locator('button:has-text("Disburse")')

// Modal elements
page.locator('[role="dialog"]')
page.locator('select[name="paymentMethod"]') // or actual selector
page.locator('input[name="paymentReference"]') // or actual selector
page.locator('textarea[name="notes"]') // or actual selector
page.locator('button:has-text("Complete Disbursement")')
page.locator('button:has-text("Cancel")')
```

---

### Task 2.2: Add data-testid Attributes (1 hour)

#### File 1: CompleteDisbursementModal.tsx

**Location:** `/src/pages/AdminDashboard/components/PaymentManagement/CompleteDisbursementModal.tsx`

**Changes:**

```typescript
// Add data-testid to modal container
<Dialog>
  <DialogContent data-testid="disbursement-modal">
    <DialogTitle data-testid="modal-title">Complete Disbursement</DialogTitle>
    
    {/* Payment method select */}
    <Select data-testid="payment-method-select">
      <SelectTrigger data-testid="payment-method-trigger">
        <SelectValue placeholder="Select payment method" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="bank_transfer" data-testid="payment-method-bank">
          Bank Transfer
        </SelectItem>
        <SelectItem value="mobile_money" data-testid="payment-method-mobile">
          Mobile Money
        </SelectItem>
        <SelectItem value="cash" data-testid="payment-method-cash">
          Cash
        </SelectItem>
        <SelectItem value="debit_order" data-testid="payment-method-debit">
          Debit Order
        </SelectItem>
      </SelectContent>
    </Select>
    
    {/* Payment reference input */}
    <Input 
      data-testid="payment-reference-input"
      placeholder="Payment Reference"
      value={paymentReference}
      onChange={(e) => setPaymentReference(e.target.value)}
    />
    
    {/* Notes textarea */}
    <Textarea 
      data-testid="disbursement-notes"
      placeholder="Notes (optional)"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
    />
    
    {/* Action buttons */}
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

#### File 2: LoansGrid.tsx

**Location:** `/src/pages/AdminDashboard/components/LoansGrid.tsx`

**Changes:**

```typescript
// Add data-testid to filter buttons
<Button
  data-testid="filter-all"
  variant={filter === 'all' ? 'default' : 'outline'}
  onClick={() => setFilter('all')}
>
  All
</Button>

<Button
  data-testid="filter-pending"
  variant={filter === 'pending' ? 'default' : 'outline'}
  onClick={() => setFilter('pending')}
>
  Pending
</Button>

<Button
  data-testid="filter-approved"
  variant={filter === 'approved' ? 'default' : 'outline'}
  onClick={() => setFilter('approved')}
>
  Approved
</Button>

<Button
  data-testid="filter-disbursed"
  variant={filter === 'disbursed' ? 'default' : 'outline'}
  onClick={() => setFilter('disbursed')}
>
  Disbursed
</Button>

// Add data-testid to Disburse button
<Button
  data-testid={`disburse-loan-${loan.id}`}
  onClick={() => handleDisburse(loan)}
>
  Disburse
</Button>

// Add data-testid to loan cards
<Card data-testid={`loan-card-${loan.id}`}>
  {/* loan content */}
</Card>
```

#### Test the Changes

```bash
# Rebuild the app
npm run build

# Or restart dev server
npm run dev:e2e
```

---

### Task 2.3: Update Test Selectors (1-1.5 hours)

**File:** `/e2e/backoffice-disbursement.e2e.ts`

#### Changes

**Before:**

```typescript
await page.click('button:has-text("Approved")');
await page.click('button:has-text("Disburse")');
await page.fill('input[placeholder="Payment Reference"]', 'TEST-REF');
await page.click('button:has-text("Complete Disbursement")');
await page.click('button:has-text("Cancel")');
```

**After:**

```typescript
await page.click('[data-testid="filter-approved"]');
await page.click('[data-testid^="disburse-loan-"]');
await page.fill('[data-testid="payment-reference-input"]', 'TEST-REF');
await page.click('[data-testid="complete-disbursement-button"]');

// Fix viewport issues
const cancelButton = page.locator('[data-testid="cancel-disbursement-button"]');
await cancelButton.scrollIntoViewIfNeeded();
await cancelButton.click();
```

#### All Tests to Update

1. **Disburse button visible for approved loans**

   ```typescript
   await page.click('[data-testid="filter-approved"]');
   await expect(page.locator('[data-testid^="disburse-loan-"]').first()).toBeVisible();
   ```

2. **Disbursement modal opens and displays loan details**

   ```typescript
   await page.click('[data-testid^="disburse-loan-"]').first();
   await expect(page.locator('[data-testid="disbursement-modal"]')).toBeVisible();
   ```

3. **Complete disbursement flow**

   ```typescript
   await page.click('[data-testid="payment-method-trigger"]');
   await page.click('[data-testid="payment-method-bank"]');
   await page.fill('[data-testid="payment-reference-input"]', 'TEST-REF');
   await page.fill('[data-testid="disbursement-notes"]', 'Test notes');
   await page.click('[data-testid="complete-disbursement-button"]');
   ```

4. **Repayments visible after disbursement**
   - Update selectors to use data-testid

5. **Cannot disburse same loan twice**
   - Update selectors to use data-testid

6. **Shows error for invalid payment reference**
   - Update selectors to use data-testid

7. **Cancel button closes modal without changes**

   ```typescript
   const cancelButton = page.locator('[data-testid="cancel-disbursement-button"]');
   await cancelButton.scrollIntoViewIfNeeded();
   await cancelButton.click();
   await expect(page.locator('[data-testid="disbursement-modal"]')).not.toBeVisible();
   ```

#### Test the Changes

```bash
npm run test:e2e -- --grep "Backoffice"
```

**Expected:** 10/10 passing (100%)

---

## Phase 3: Final Verification (30 minutes)

### Run Full Test Suite

```bash
npm run test:e2e
```

**Expected Results:**

- Disbursement API: 6/6 (100%)
- Disbursements RLS: 16/16 (100%)
- Documents RLS: 14/14 (100%)
- Backoffice UI: 10/10 (100%)
- **TOTAL: 64/64 (100%)** 🎉

### Test Parallel Execution

```bash
npm run test:e2e -- --workers=6
```

**Expected:** Still 64/64 (100%)

### Test Stability (Run 3 Times)

```bash
for i in {1..3}; do 
  echo "Run $i:"
  npm run test:e2e
  echo "---"
done
```

**Expected:** All 3 runs pass with 64/64

---

## Troubleshooting

### Issue: Tests fail after fixture migration

**Solution:** Check `/docs/FIXTURE_MIGRATION_GUIDE.md` troubleshooting section

### Issue: UI tests can't find elements

**Solution:**

1. Verify dev server is running
2. Check data-testid attributes were added
3. Use browser inspector to verify selectors
4. Run Playwright in headed mode: `npm run test:e2e -- --headed`

### Issue: Cancel button still outside viewport

**Solution:**

```typescript
const element = page.locator('[data-testid="cancel-button"]');
await element.scrollIntoViewIfNeeded();
await element.waitFor({ state: 'visible' });
await element.click();
```

---

## Success Criteria

### Phase 1 Complete

- [x] disbursement.e2e.ts: 6/6 (100%)
- [x] disbursements-rls.e2e.ts: 16/16 (100%)
- [x] All tests use fixtures
- [x] No manual auth code
- [x] Parallel execution works

### Phase 2 Complete

- [x] data-testid attributes added
- [x] Test selectors updated
- [x] Backoffice UI: 10/10 (100%)
- [x] No viewport issues

### Final Success

- [x] **TOTAL: 64/64 (100%)**
- [x] All tests pass 3 times in a row
- [x] Parallel execution works perfectly
- [x] No flaky tests

---

## Commit Strategy

### After Phase 1

```bash
git add -A
git commit -m "feat(e2e): Migrate remaining test files to fixtures

- Migrated disbursement.e2e.ts: 6/6 (100%)
- Migrated disbursements-rls.e2e.ts: 16/16 (100%)
- All tests now use fixture pattern
- Perfect parallel execution
- Zero auth session bugs"

git push origin main
```

### After Phase 2

```bash
git add -A
git commit -m "feat(e2e): Update UI selectors and achieve 100% coverage! 🎉

- Added data-testid attributes to all UI components
- Updated all test selectors
- Fixed viewport issues
- Backoffice UI: 10/10 (100%)
- TOTAL: 64/64 (100%)

All tests passing with perfect parallel execution!"

git push origin main
```

---

## Post-Completion Tasks

1. **Update Documentation**
   - Mark all tasks as complete in `/docs/E2E_FINAL_SUMMARY.md`
   - Update memory with final status
   - Create completion report

2. **Celebrate! 🎉**
   - 23% → 100% coverage achieved
   - Production-ready test suite
   - Comprehensive documentation
   - Team-ready patterns

3. **Team Handover**
   - Share documentation
   - Demo fixture pattern
   - Review test data management

---

## Quick Reference

### Commands

```bash
# Run all tests
npm run test:e2e

# Run specific suite
npm run test:e2e -- --grep "Documents.*RLS"

# Run with parallelization
npm run test:e2e -- --workers=6

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific file
npm run test:e2e -- e2e/api/documents-rls.e2e.ts
```

### Files to Edit

- `/e2e/api/disbursement.e2e.ts`
- `/e2e/api/disbursements-rls.e2e.ts`
- `/src/pages/AdminDashboard/components/PaymentManagement/CompleteDisbursementModal.tsx`
- `/src/pages/AdminDashboard/components/LoansGrid.tsx`
- `/e2e/backoffice-disbursement.e2e.ts`

### Reference Files

- `/e2e/api/documents-rls.e2e.ts` - Perfect fixture example
- `/docs/FIXTURE_MIGRATION_GUIDE.md` - Complete guide
- `/e2e/fixtures.ts` - Fixture implementation

---

**Ready to achieve 100% coverage! 🚀**
