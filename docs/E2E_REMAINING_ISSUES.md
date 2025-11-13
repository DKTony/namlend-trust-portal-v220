# E2E Test Remaining Issues & Solutions

**Date:** November 13, 2025  
**Status:** 21/64 tests passing (33% → need to fix 34 failures)

---

## 🎉 Progress Made

### Before Test Data:
- ❌ 42 tests failing
- ✅ 13 tests passing
- **21% pass rate**

### After Test Data:
- ❌ 34 tests failing (8 fewer!)
- ✅ 21 tests passing (8 more!)
- **33% pass rate**

**Improvement:** +8 tests fixed by creating loan data! 🚀

---

## 🔍 Remaining Issues

### Issue #1: Port Mismatch (11 UI tests) 🔴 CRITICAL

**Error:**
```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/login
```

**Root Cause:**
- UI test file hardcodes `BASE_URL = 'http://localhost:5173'`
- But dev server actually runs on port `8080`
- Tests can't connect to non-existent server on port 5173

**Affected Tests:** (11 total)
- `backoffice-disbursement.e2e.ts` - All UI tests

**Solution:**
Fix the hardcoded BASE_URL in test file:

```typescript
// WRONG (current):
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// CORRECT (should be):
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
```

**Files to Fix:**
- `e2e/backoffice-disbursement.e2e.ts` (line 8)
- `e2e/assign-role-modal.spec.ts` (if it exists)

---

### Issue #2: Wrong Admin Email (11 UI tests) 🔴 CRITICAL

**Current Code:**
```typescript
const ADMIN_EMAIL = 'admin@namlend.test';  // WRONG!
const ADMIN_PASSWORD = 'test123';
```

**Problem:**
- Test uses `admin@namlend.test`
- But we created `admin@test.namlend.com`
- Email doesn't match → login fails

**Solution:**
```typescript
const ADMIN_EMAIL = 'admin@test.namlend.com';  // CORRECT
const ADMIN_PASSWORD = 'test123';
```

---

### Issue #3: API/RLS Tests Failing (23 tests) 🟡 MODERATE

**Errors:**
- Disbursement API tests (6 tests)
- Disbursements RLS tests (12 tests)
- Documents RLS tests (5 tests)

**Possible Causes:**

#### A. Schema Mismatch
Tests expect columns that don't exist:
- Tests use: `payment_method`, `disbursed_by`, `disbursed_at`
- Actual schema: `method`, `created_by`, `processed_at`

#### B. RPC Function Missing
```
Error: Cannot find loan with id
```
Tests call RPC functions that may not exist or have wrong signatures.

#### C. Test Data Issues
- Tests expect specific loan IDs
- Tests expect `client_id` column (actual: `user_id`)
- Tests may be looking for wrong data structure

**Solution:** Need to check test files and align with actual schema.

---

## 📋 Action Plan

### Priority 1: Fix Port & Email (Quick Wins) ⚡

**Impact:** Will fix 11 UI tests immediately

**Steps:**
1. Fix `e2e/backoffice-disbursement.e2e.ts`:
   - Change port from 5173 to 8080
   - Change email from `admin@namlend.test` to `admin@test.namlend.com`
2. Fix `e2e/assign-role-modal.spec.ts` (if needed)
3. Re-run tests

**Expected Result:** 32/64 tests passing (50%)

---

### Priority 2: Fix API/RLS Tests (Requires Investigation) 🔍

**Impact:** Will fix 23 tests

**Steps:**
1. Check what RPC functions tests are calling
2. Verify RPC functions exist in database
3. Check if test expectations match actual schema
4. Update tests or create missing RPC functions

**Expected Result:** 55/64 tests passing (86%)

---

### Priority 3: Investigate Skipped Tests (9 tests) 📝

**Why Skipped:**
- May need specific conditions
- May be disabled intentionally
- May need additional test data

---

## 🛠️ Quick Fixes to Apply Now

### Fix #1: Update backoffice-disbursement.e2e.ts

**File:** `e2e/backoffice-disbursement.e2e.ts`

**Change lines 8-10:**
```typescript
// FROM:
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@namlend.test';
const ADMIN_PASSWORD = 'test123';

// TO:
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = 'admin@test.namlend.com';
const ADMIN_PASSWORD = 'test123';
```

### Fix #2: Check assign-role-modal.spec.ts

If this file exists and has the same issue, apply the same fix.

---

## 📊 Expected Results After Fixes

| Priority | Tests Fixed | Cumulative Pass Rate |
|----------|-------------|---------------------|
| Current | 21/64 | 33% |
| After P1 (port/email) | 32/64 | 50% |
| After P2 (API/RLS) | 55/64 | 86% |
| After P3 (skipped) | 64/64 | 100% |

---

## 🎯 Next Steps

1. **Apply Priority 1 fixes** (5 minutes)
   - Update port and email in test files
   - Re-run tests locally

2. **Investigate API failures** (15 minutes)
   - Read failing test files
   - Check what they expect vs what exists
   - Create missing RPC functions or update tests

3. **Push to GitHub** (automatic)
   - Trigger CI tests
   - Verify all tests pass

---

## 📝 Summary

**Current State:**
- ✅ Test users created
- ✅ Test loans created
- ✅ 21 tests passing
- ❌ 34 tests failing (fixable!)

**Root Causes:**
1. **Port mismatch** (5173 vs 8080) - Easy fix
2. **Wrong email** (admin@namlend.test vs admin@test.namlend.com) - Easy fix
3. **Schema mismatches** - Need investigation
4. **Missing RPC functions** - Need to create or fix

**Estimated Time to 100%:**
- Priority 1 fixes: 5 minutes
- Priority 2 fixes: 15-30 minutes
- **Total: ~35 minutes to get all tests passing**

---

**Status:** Ready to apply Priority 1 fixes! 🚀
