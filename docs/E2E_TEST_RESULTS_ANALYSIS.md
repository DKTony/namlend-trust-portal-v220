# E2E Test Results Analysis - November 13, 2025

## 📊 Current Test Status

**Run Date:** November 13, 2025 @ 12:41 PM  
**Duration:** 4.1 minutes

### Results Summary
- ✅ **20 passed**
- ❌ **35 failed**
- ⏭️ **9 skipped**
- **Total:** 64 tests
- **Pass Rate:** 31.25%

---

## 📈 Progress Tracking

| Stage | Passing | Failing | Skipped | Pass Rate | Change |
|-------|---------|---------|---------|-----------|--------|
| **Initial** | 13 | 42 | 9 | 24% | - |
| **After Test Data** | 21 | 34 | 9 | 38% | +8 ✅ |
| **After Email Fixes** | 20 | 35 | 9 | 31% | -1 ❌ |

**Observation:** We went backwards by 1 test after fixing emails. This suggests the email fix may have broken a previously passing test.

---

## 🔍 Failure Breakdown

### Category 1: Disbursement API Tests (6 failures)
**File:** `e2e/api/disbursement.e2e.ts`

**Tests:**
1. ❌ admin can disburse approved loan
2. ❌ loan_officer can disburse approved loan
3. ❌ client cannot disburse loan
4. ❌ cannot disburse already disbursed loan
5. ❌ disbursement creates audit trail
6. ❌ validates payment method

**Status:** Still failing after email fixes  
**Likely Cause:** 
- RPC function `complete_disbursement` may not exist
- Or function signature doesn't match what tests expect
- Tests call: `adminClient.rpc('complete_disbursement', {...})`

**Action Needed:**
1. Check if RPC function exists in Supabase
2. Verify function signature matches test expectations
3. Create function if missing

---

### Category 2: Disbursements RLS Tests (12 failures)
**File:** `e2e/api/disbursements-rls.e2e.ts`

**Tests:**
1. ❌ Client can read their own disbursements
2. ❌ Client cannot read other user disbursements
3. ❌ Client cannot create disbursement directly
4. ❌ Client cannot update disbursement
5. ❌ Client cannot delete disbursement
6. ❌ Admin can create disbursement
7. ❌ Admin can update disbursement status
8. ❌ Loan Officer can create disbursement
9. ❌ Disbursement with invalid method is rejected
10. ❌ Disbursement query includes user profile via join
11. ❌ Unauthenticated user cannot create disbursement
12. ❌ Client cannot complete disbursement via RPC

**Likely Causes:**
- RLS policies may be too restrictive
- Tests may use wrong column names (client_id vs user_id)
- Tests may expect different schema structure
- RPC function issues (same as Category 1)

**Action Needed:**
1. Review RLS policies on disbursements table
2. Check if tests use correct column names
3. Verify schema matches test expectations

---

### Category 3: Documents Storage RLS Tests (6 failures)
**File:** `e2e/api/documents-rls.e2e.ts`

**Tests:**
1. ❌ Client cannot upload to another user folder
2. ✅ Client can read their own documents (PASSING!)
3. ❌ Client cannot read another user documents
4. ❌ Admin can read all user documents
5. ❌ Client cannot list another user documents
6. ❌ Unauthenticated user cannot upload documents
7. ❌ Unauthenticated user cannot read documents

**Note:** 1 test is passing! This shows storage RLS partially works.

**Likely Causes:**
- Storage bucket RLS policies need adjustment
- Path structure may not match expectations
- Admin permissions may not be configured correctly

**Action Needed:**
1. Review storage bucket RLS policies
2. Check folder path structure
3. Verify admin role has correct permissions

---

### Category 4: Backoffice UI Tests (11 failures)
**File:** `e2e/backoffice-disbursement.e2e.ts`

**Tests:**
1. ❌ Disburse button visible for approved loans
2. ❌ Disbursement modal opens and displays loan details
3. ❌ Payment method selection works
4. ❌ Form validation requires payment reference
5. ❌ Complete disbursement flow
6. ❌ Repayments visible after disbursement
7. ❌ Cannot disburse same loan twice
8. ❌ Audit trail recorded for disbursement
9. ❌ Shows error for invalid payment reference
10. ❌ Cancel button closes modal without changes

**Status:** All UI tests still failing  
**Likely Causes:**
- Dev server may not be running on port 8080
- UI elements may not exist or have different selectors
- Login may be failing
- Timing issues (elements not loaded yet)

**Action Needed:**
1. Verify dev server is running: `npm run dev`
2. Check if login works with admin@test.namlend.com
3. Inspect actual UI to verify selectors
4. Add proper waits for async operations

---

## 🎯 Root Cause Analysis

### Primary Issue: Missing RPC Function
**Impact:** 18 tests (6 API + 12 RLS)

The tests call `complete_disbursement` RPC function which likely doesn't exist:
```typescript
await adminClient.rpc('complete_disbursement', {
  p_disbursement_id: testLoanId,
  p_payment_method: 'bank_transfer',
  p_payment_reference: 'TEST-BANK-REF-001',
  p_notes: 'Test disbursement by admin'
});
```

**Solution:** Create this RPC function in Supabase or update tests to use direct table inserts.

---

### Secondary Issue: UI Server Not Running
**Impact:** 11 tests

UI tests fail because they can't connect to the application. This could mean:
1. Dev server isn't running during tests
2. Tests need to start the dev server first
3. Port 8080 is not accessible

**Solution:** 
- Add dev server startup to test setup
- Or run `npm run dev` before running E2E tests
- Or use Playwright's webServer configuration

---

### Tertiary Issue: RLS Policies Too Restrictive
**Impact:** 6 tests (documents)

Storage RLS may be blocking legitimate operations.

**Solution:** Review and adjust storage bucket policies.

---

## 📋 Recommended Action Plan

### Phase 1: Fix RPC Function (Highest Impact)
**Time:** 15-30 minutes  
**Impact:** Could fix 18 tests (28%)

1. Check if `complete_disbursement` function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'complete_disbursement';
   ```

2. If missing, create it or update tests to use direct inserts

3. Re-run tests

**Expected Result:** 38/64 tests passing (59%)

---

### Phase 2: Fix UI Tests (High Impact)
**Time:** 30-45 minutes  
**Impact:** Could fix 11 tests (17%)

1. Ensure dev server runs before tests:
   ```bash
   npm run dev &
   npm run test:e2e
   ```

2. Or add to playwright.config.ts:
   ```typescript
   webServer: {
     command: 'npm run dev',
     port: 8080,
     reuseExistingServer: true
   }
   ```

3. Verify login works manually
4. Re-run tests

**Expected Result:** 49/64 tests passing (77%)

---

### Phase 3: Fix Storage RLS (Medium Impact)
**Time:** 20-30 minutes  
**Impact:** Could fix 5 tests (8%)

1. Review storage bucket policies
2. Adjust as needed
3. Re-run tests

**Expected Result:** 54/64 tests passing (84%)

---

## 🎯 Immediate Next Steps

### Option A: Quick Win - Start Dev Server
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for server to start)
npm run test:e2e
```

This might immediately fix the 11 UI tests!

---

### Option B: Investigate RPC Function
```bash
# Check Supabase for the function
# Then create it or update tests
```

This would fix the most tests (18).

---

### Option C: Run Specific Test to Debug
```bash
# Run just one failing test to see detailed error
npx playwright test e2e/api/disbursement.e2e.ts:88 --debug
```

This helps understand the exact failure reason.

---

## 💡 Key Insights

1. **Test Data Helped:** We fixed 8 tests by creating loans
2. **Email Fixes Didn't Help:** Actually lost 1 test (need to investigate why)
3. **Main Blocker:** Missing RPC function affects 18 tests
4. **UI Tests Need Server:** 11 tests fail because no dev server running
5. **Some Tests Work:** 20 tests pass, showing infrastructure is mostly correct

---

## 📊 Projected Final Results

**If we fix all issues:**
- Phase 1 (RPC): 38/64 passing (59%)
- Phase 2 (UI): 49/64 passing (77%)
- Phase 3 (Storage): 54/64 passing (84%)

**Remaining 10 tests** would need individual investigation.

---

## 🚀 Recommendation

**Start with Option A (Quick Win):**
1. Start dev server: `npm run dev`
2. Wait 30 seconds for server to be ready
3. Run tests: `npm run test:e2e`

This is the fastest way to see if we can get to 31/64 tests passing (48%).

Then move to Option B to fix the RPC function issues.

---

**Status:** Ready for next action! 🎯
