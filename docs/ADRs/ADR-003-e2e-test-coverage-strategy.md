# ADR-003: E2E Test Coverage Strategy for Disbursement and RLS

**Status:** Accepted  
**Date:** October 20, 2025  
**Deciders:** QA Team, Platform Team  
**Technical Story:** v2.7.1 Backoffice Disbursement Testing Infrastructure

---

## Context and Problem Statement

The backoffice disbursement feature required comprehensive testing to ensure:
- Functional correctness (UI flows work end-to-end)
- Security enforcement (RLS policies prevent unauthorized access)
- Role-based access control (admin/loan_officer vs client permissions)
- Data integrity (disbursements update loans correctly)
- Audit trail completeness (all actions logged)

We needed to decide on a testing strategy that provides confidence in production deployment while being maintainable and fast enough for CI/CD.

---

## Decision Drivers

- **Production Confidence:** Must catch regressions before deployment
- **Security Validation:** RLS policies must be tested, not assumed
- **Role Coverage:** Test all user roles (admin, loan_officer, client, anonymous)
- **Maintainability:** Tests should be readable and easy to update
- **CI/CD Speed:** Tests must run in reasonable time (<5 minutes)
- **Real Environment:** Test against actual Supabase instance, not mocks

---

## Considered Options

### Option 1: Unit Tests Only
Test individual functions in isolation with mocked Supabase client.

**Pros:**
- Fast execution
- Easy to write
- No external dependencies

**Cons:**
- Doesn't test RLS policies
- Doesn't test actual database behavior
- Doesn't catch integration issues
- False confidence (mocks may not match reality)

### Option 2: Manual Testing Only
QA team manually tests all scenarios before each release.

**Pros:**
- Catches UI/UX issues
- Real user perspective

**Cons:**
- Slow and error-prone
- Not repeatable
- Doesn't scale
- No CI/CD integration
- Expensive (requires QA time)

### Option 3: Comprehensive E2E Test Suite ✅ **SELECTED**
Playwright tests against real Supabase instance covering API, UI, and RLS.

**Pros:**
- Tests real behavior (no mocks)
- Validates RLS policies
- Catches integration issues
- Automated and repeatable
- CI/CD compatible
- Documents expected behavior

**Cons:**
- Slower than unit tests
- Requires test database setup
- More complex to maintain

---

## Decision Outcome

**Chosen option:** Option 3 - Comprehensive E2E Test Suite

We will implement 4 test suites:
1. **API Tests** (`e2e/api/disbursement.e2e.ts`) - RPC functionality
2. **UI Tests** (`e2e/backoffice-disbursement.e2e.ts`) - User flows
3. **Documents RLS Tests** (`e2e/api/documents-rls.e2e.ts`) - Storage security
4. **Disbursements RLS Tests** (`e2e/api/disbursements-rls.e2e.ts`) - Table security

### Test Coverage Goals

- **Functional:** All user flows work end-to-end
- **Security:** RLS policies enforced for all roles
- **Roles:** Admin, loan_officer, client, anonymous tested
- **Error Handling:** Invalid inputs handled gracefully
- **Audit:** All actions create proper audit trail

---

## Implementation

### Test Suite Structure

```
e2e/
├── api/
│   ├── disbursement.e2e.ts          # RPC functionality (6 tests)
│   ├── disbursements-rls.e2e.ts     # Table RLS (15 tests)
│   └── documents-rls.e2e.ts         # Storage RLS (12 tests)
└── backoffice-disbursement.e2e.ts   # UI flows (11 tests)
```

### Test Categories

#### 1. API Tests (RPC Functionality)
```typescript
// e2e/api/disbursement.e2e.ts
describe('Disbursement RPC', () => {
  test('Admin can disburse approved loan');
  test('Loan officer can disburse approved loan');
  test('Client cannot disburse loan (RLS enforcement)');
  test('Cannot disburse already disbursed loan');
  test('Disbursement creates audit trail');
  test('Validates payment method against allowed values');
});
```

#### 2. UI Tests (User Flows)
```typescript
// e2e/backoffice-disbursement.e2e.ts
describe('Disbursement UI Flow', () => {
  test('Disburse button visible for approved loans');
  test('Disbursement modal opens with loan details');
  test('Payment method selection works (all 4 methods)');
  test('Form validation requires payment reference');
  test('Complete disbursement flow end-to-end');
  test('Repayments visible after disbursement');
  test('Cannot disburse same loan twice');
  test('Error handling for invalid inputs');
  test('Cancel button functionality');
});
```

#### 3. Documents RLS Tests (Storage Security)
```typescript
// e2e/api/documents-rls.e2e.ts
describe('Documents Storage RLS', () => {
  test('Client can upload/read/delete own documents');
  test('Client cannot access other user documents');
  test('Admin can read all user documents');
  test('Client can list only own documents');
  test('Unauthenticated users blocked from all operations');
  test('Documents table RLS verified');
  // ... 6 more tests
});
```

#### 4. Disbursements RLS Tests (Table Security)
```typescript
// e2e/api/disbursements-rls.e2e.ts
describe('Disbursements Table RLS', () => {
  test('Client can read own disbursements only');
  test('Client cannot create/update/delete disbursements');
  test('Admin can CRUD all disbursements');
  test('Loan officer can CRUD all disbursements');
  test('complete_disbursement RPC role enforcement');
  test('Invalid payment method validation');
  // ... 9 more tests
});
```

### Test Data Strategy

**Test Users:**
```typescript
const CLIENT_1_EMAIL = 'client1@test.namlend.com';
const CLIENT_2_EMAIL = 'client2@test.namlend.com';
const ADMIN_EMAIL = 'admin@test.namlend.com';
const LOAN_OFFICER_EMAIL = 'loan_officer@test.namlend.com';
```

**Test Isolation:**
- Each test creates its own data
- Cleanup after test completion
- No shared state between tests
- Unique identifiers (timestamps) prevent collisions

### CI/CD Integration

```yaml
# .github/workflows/ci-web.yml
- name: Run E2E Tests
  run: npx playwright test e2e/
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Consequences

### Positive

- ✅ **High Confidence:** Tests validate real behavior, not mocks
- ✅ **Security Validation:** RLS policies tested automatically
- ✅ **Regression Prevention:** Catches breaking changes before production
- ✅ **Documentation:** Tests serve as executable specifications
- ✅ **CI/CD Ready:** Automated testing on every commit
- ✅ **Role Coverage:** All user types tested (admin, loan_officer, client, anon)

### Negative

- ⚠️ **Test Data Setup:** Requires test users in database
- ⚠️ **Execution Time:** ~2-3 minutes for full suite (acceptable)
- ⚠️ **Maintenance:** Tests need updates when features change

### Neutral

- 📝 **Test Environment:** Uses same Supabase project as development
- 📝 **Flakiness Risk:** Network issues can cause intermittent failures (mitigated with retries)

---

## Test Metrics

### Coverage Summary

| Category | Test Cases | Lines Covered |
|----------|------------|---------------|
| API Tests | 6 | RPC logic, role checks |
| UI Tests | 11 | User flows, form validation |
| Documents RLS | 12 | Storage policies, CRUD |
| Disbursements RLS | 15 | Table policies, joins |
| **Total** | **44** | **Comprehensive** |

### Execution Time

- API Tests: ~30 seconds
- UI Tests: ~60 seconds
- Documents RLS: ~45 seconds
- Disbursements RLS: ~50 seconds
- **Total:** ~3 minutes

### Success Criteria

- ✅ All tests pass on main branch
- ✅ No flaky tests (>95% pass rate)
- ✅ Tests run in <5 minutes
- ✅ Coverage includes all user roles
- ✅ RLS policies validated for all tables

---

## Validation

### Test Execution

```bash
# Run all E2E tests
npx playwright test e2e/

# Run specific suite
npx playwright test e2e/api/disbursement.e2e.ts

# Run with UI (for debugging)
npx playwright test --headed

# Generate HTML report
npx playwright test --reporter=html
```

### Continuous Monitoring

- Tests run on every PR
- Failures block merge
- Results visible in GitHub Actions
- HTML reports archived for debugging

---

## Related Decisions

- **ADR-001:** Payment Method Normalization Across Platform
- **ADR-002:** Disbursement RPC with Payment Method and Audit Trail

---

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [RLS Testing Strategies](https://supabase.com/docs/guides/database/testing)
- Implementation: `e2e/` directory

---

**Last Updated:** October 31, 2025  
**Supersedes:** None  
**Superseded By:** None
