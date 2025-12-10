# E2E Test Remediation - Session 4 Plan

**Estimated Duration:** 3-4 hours  
**Focus:** UI Test Data Seeding & Remaining Test Coverage  
**Goal:** Achieve 85%+ test coverage with all UI tests passing

---

## Session Overview

### Objectives
1. ✅ Seed test data for UI tests
2. ✅ Verify all UI tests pass (10/10)
3. ✅ Migrate remaining E2E tests to fixtures
4. ✅ Achieve 85%+ overall test coverage
5. ✅ Document final state and handover

### Prerequisites
- ✅ Session 3 completed (22/22 API tests passing)
- ✅ UI selectors updated with data-testid
- ✅ CI/CD configured for rate limiting
- ✅ Comprehensive documentation exists

---

## Phase 1: UI Test Data Seeding (30 minutes)

### Task 1.1: Verify Test Data Script

**File:** `/e2e/seed-ui-test-data.sql`  
**Status:** Exists but not verified  
**Goal:** Ensure script creates approved loans ready for disbursement

#### Steps

1. **Review the seed script**
   ```bash
   cat e2e/seed-ui-test-data.sql
   ```

2. **Verify it creates:**
   - At least 3 approved loans
   - Loans with status = 'approved'
   - Loans linked to test users (client1, client2)
   - Proper loan amounts and terms

3. **Check for dependencies:**
   - User profiles must exist
   - Loan applications table structure
   - Required foreign keys

### Task 1.2: Run Test Data Seeding

**Estimated Time:** 10 minutes

#### Option A: Direct Database Execution
```bash
# Get your database URL from .env
source .env

# Run the seed script
psql $VITE_SUPABASE_URL -f e2e/seed-ui-test-data.sql
```

#### Option B: Supabase CLI
```bash
# If using Supabase CLI
supabase db execute --file e2e/seed-ui-test-data.sql
```

#### Option C: Create npm Script
```json
// Add to package.json
{
  "scripts": {
    "seed:test-data": "psql $VITE_SUPABASE_URL -f e2e/seed-ui-test-data.sql",
    "clean:test-data": "psql $VITE_SUPABASE_URL -f e2e/cleanup-ui-test-data.sql"
  }
}
```

Then run:
```bash
npm run seed:test-data
```

### Task 1.3: Verify Test Data

**Estimated Time:** 5 minutes

```bash
# Query to verify approved loans exist
psql $VITE_SUPABASE_URL -c "
  SELECT id, user_id, status, amount, created_at 
  FROM loan_applications 
  WHERE status = 'approved' 
  LIMIT 5;
"
```

**Expected Output:**
- At least 3 approved loans
- Loans with proper user_id references
- Recent created_at timestamps

---

## Phase 2: UI Test Verification (30 minutes)

### Task 2.1: Run UI Tests

**File:** `/e2e/backoffice-disbursement.e2e.ts`  
**Current:** 2/10 passing (20%)  
**Target:** 10/10 passing (100%)

#### Steps

1. **Ensure dev server is running**
   ```bash
   # Terminal 1
   npm run dev:e2e
   ```

2. **Run UI tests**
   ```bash
   # Terminal 2
   npm run test:e2e -- e2e/backoffice-disbursement.e2e.ts --workers=1
   ```

3. **Expected Result:**
   ```
   Running 10 tests using 1 worker
   ✓ 10 passed (2-3 minutes)
   ```

### Task 2.2: Debug Any Failures

**If tests still fail:**

1. **Check selector issues**
   - Verify data-testid attributes are in the DOM
   - Use Playwright Inspector: `npx playwright test --debug`

2. **Check data issues**
   - Verify loans are in 'approved' status
   - Check user authentication works
   - Verify RLS policies allow access

3. **Check timing issues**
   - Increase timeouts if needed
   - Add explicit waits for dynamic content

### Task 2.3: Document UI Test Results

**Create:** `/docs/UI_TEST_RESULTS.md`

Include:
- Test execution summary
- Pass/fail breakdown
- Any issues encountered
- Solutions applied
- Screenshots of passing tests

---

## Phase 3: Migrate Remaining Tests (1.5-2 hours)

### Task 3.1: Identify Remaining Tests

**Command:**
```bash
# Find all E2E test files
find e2e -name "*.e2e.ts" -type f

# Check which ones still use manual auth
grep -l "createClient" e2e/**/*.e2e.ts
```

**Expected Files to Migrate:**
- `/e2e/api/admin-rpc.e2e.ts` (if exists)
- `/e2e/api/disbursements-ledger-crud.e2e.ts` (if exists)
- Any other API test files not yet migrated

### Task 3.2: Migrate Each Test File

**For each file, follow this pattern:**

#### Step 1: Backup
```bash
cp e2e/api/[filename].e2e.ts e2e/api/[filename].e2e.ts.backup
```

#### Step 2: Update Imports
```typescript
// Before
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// After
import { test, expect } from '../fixtures';
```

#### Step 3: Remove Manual Auth
Delete these sections:
```typescript
// Remove constants
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

// Remove beforeAll auth setup
test.beforeAll(async () => {
  adminSupabase = createClient(supabaseUrl, supabaseAnonKey);
  await adminSupabase.auth.signInWithPassword({ ... });
});

// Remove afterAll cleanup
test.afterAll(async () => {
  await adminSupabase.auth.signOut();
});
```

#### Step 4: Update Test Signatures
```typescript
// Before
test('My test', async () => {
  const { data } = await adminSupabase.from('table').select('*');
});

// After
test('My test', async ({ adminSupabase }) => {
  const { data } = await adminSupabase.from('table').select('*');
});
```

#### Step 5: Fix Schema Issues
- Use actual user IDs from authenticated sessions
- Use correct column names (e.g., `created_by` not `disbursed_by`)
- Handle RLS behavior (null data vs errors)

#### Step 6: Test
```bash
npm run test:e2e -- e2e/api/[filename].e2e.ts --workers=1
```

### Task 3.3: Track Migration Progress

**Create a checklist:**

- [ ] `/e2e/api/admin-rpc.e2e.ts`
- [ ] `/e2e/api/disbursements-ledger-crud.e2e.ts`
- [ ] `/e2e/api/[other-file].e2e.ts`
- [ ] Document each migration
- [ ] Verify all tests pass

---

## Phase 4: Test Coverage Analysis (30 minutes)

### Task 4.1: Run Full Test Suite

**Command:**
```bash
# Run all E2E tests
npm run test:e2e -- --workers=1

# Generate coverage report
npm run test:e2e -- --reporter=html
```

### Task 4.2: Analyze Coverage

**Create:** `/docs/E2E_COVERAGE_REPORT.md`

Include:
```markdown
# E2E Test Coverage Report

## Overall Statistics
- Total Tests: X/64
- Passing: X
- Failing: X
- Skipped: X
- Coverage: X%

## By Category
### API Tests
- Disbursement: 6/6 (100%)
- Disbursements RLS: 16/16 (100%)
- Documents RLS: 14/14 (100%)
- Admin RPC: X/X (X%)
- Ledger CRUD: X/X (X%)

### UI Tests
- Backoffice Disbursement: 10/10 (100%)
- Other UI: X/X (X%)

## Coverage Gaps
- [ ] List any untested features
- [ ] List any skipped tests
- [ ] Document why tests are skipped
```

### Task 4.3: Identify Gaps

**Questions to answer:**
1. What features have no E2E tests?
2. What critical flows are untested?
3. What edge cases are missing?
4. What error scenarios are untested?

---

## Phase 5: Documentation & Handover (30 minutes)

### Task 5.1: Update Documentation

**Files to update:**

1. **`/docs/E2E_SESSION_4_SUMMARY.md`**
   - Session achievements
   - Final test coverage
   - Migration status
   - Remaining work

2. **`/README.md`** (if needed)
   - Update test coverage badge
   - Add E2E testing section
   - Document how to run tests

3. **`/e2e/README.md`** (create if missing)
   - Test structure overview
   - How to run tests
   - How to write new tests
   - Fixture pattern guide
   - Test data management

### Task 5.2: Create Team Handover Guide

**Create:** `/docs/E2E_TEAM_HANDOVER.md`

Include:
```markdown
# E2E Testing - Team Handover Guide

## Quick Start
- How to run tests locally
- How to run tests in CI
- How to debug failing tests

## Test Structure
- Fixture pattern explanation
- Test data management
- Naming conventions

## Adding New Tests
- Step-by-step guide
- Code examples
- Best practices

## Troubleshooting
- Common issues and solutions
- Rate limiting workarounds
- Test data problems

## Maintenance
- Updating fixtures
- Managing test data
- Handling schema changes
```

### Task 5.3: Final Commit & Push

```bash
# Stage all changes
git add -A

# Commit with comprehensive message
git commit -m "feat(e2e): Session 4 complete - UI tests passing + remaining migrations

Phase 1: UI Test Data Seeding
- Seeded test data for approved loans
- Verified data integrity
- Created npm scripts for seeding/cleanup

Phase 2: UI Test Verification
- All 10 UI tests passing (100%)
- Verified selectors work correctly
- Documented test results

Phase 3: Remaining Test Migrations
- Migrated [X] additional test files
- All tests using fixture pattern
- Eliminated remaining boilerplate

Phase 4: Coverage Analysis
- Total coverage: X% (X/64 tests)
- All critical flows tested
- Documented coverage gaps

Phase 5: Documentation
- Created team handover guide
- Updated all documentation
- Ready for production

Total: X/64 tests passing (X%)
All fixture migrations complete
Production ready"

# Push to remote
git push origin main
```

---

## Success Criteria

### Must Have ✅
- [ ] Test data seeded successfully
- [ ] UI tests: 10/10 passing (100%)
- [ ] All remaining tests migrated to fixtures
- [ ] Overall coverage: 85%+ (54+/64 tests)
- [ ] Comprehensive documentation complete
- [ ] All changes committed and pushed

### Nice to Have 🎯
- [ ] Coverage: 90%+ (58+/64 tests)
- [ ] Automated test data seeding in beforeAll
- [ ] Visual regression tests added
- [ ] Performance benchmarks established
- [ ] CI/CD pipeline optimized

---

## Time Breakdown

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | UI Test Data Seeding | 30 min |
| **Phase 2** | UI Test Verification | 30 min |
| **Phase 3** | Migrate Remaining Tests | 1.5-2 hours |
| **Phase 4** | Coverage Analysis | 30 min |
| **Phase 5** | Documentation & Handover | 30 min |
| **Total** | | **3.5-4 hours** |

---

## Risk Mitigation

### Potential Issues

1. **Test Data Script Fails**
   - **Risk:** SQL errors, FK constraints
   - **Mitigation:** Review script first, test in isolation
   - **Backup Plan:** Create test data via API calls

2. **UI Tests Still Fail**
   - **Risk:** Selector issues, timing problems
   - **Mitigation:** Use Playwright Inspector, add explicit waits
   - **Backup Plan:** Update selectors, increase timeouts

3. **Rate Limiting Persists**
   - **Risk:** Too many auth calls
   - **Mitigation:** Use workers=1, add delays
   - **Backup Plan:** Implement exponential backoff

4. **Schema Mismatches**
   - **Risk:** Database schema changed
   - **Mitigation:** Verify schema before migration
   - **Backup Plan:** Update test expectations

---

## Post-Session Checklist

- [ ] All tests passing locally
- [ ] All tests passing in CI
- [ ] Documentation complete and accurate
- [ ] Team handover guide created
- [ ] All changes committed and pushed
- [ ] Session summary created
- [ ] Next steps documented
- [ ] Known issues documented
- [ ] Celebrate success! 🎉

---

## Next Session Preview (Session 5)

**Focus:** Polish & Production Readiness

Potential tasks:
1. Add visual regression testing
2. Implement performance benchmarks
3. Create automated test data management
4. Add more edge case tests
5. Optimize CI/CD pipeline
6. Create test monitoring dashboard

---

**Session 4 Plan Created:** November 17, 2025  
**Estimated Duration:** 3.5-4 hours  
**Expected Outcome:** 85%+ coverage, all UI tests passing, production ready
