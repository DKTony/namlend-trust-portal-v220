---
description: Run E2E tests with Playwright
---

# Run E2E Tests

This workflow guides you through running end-to-end tests for the NamLend Trust platform.

## Test Environment Setup

1. Ensure test database is seeded
```bash
cd e2e
psql -h aws-0-eu-north-1.pooler.supabase.com -p 6543 -d postgres -U postgres.puahejtaskncpazjyxqp -f seed-ui-test-data.sql
```

2. Verify test users exist
```sql
SELECT email, id FROM auth.users WHERE email LIKE 'test%@namlend.com';
```

Expected users:
- test-admin@namlend.com
- test-client1@namlend.com
- test-client2@namlend.com
- test-loan-officer@namlend.com

3. Set environment variables
```bash
export SUPABASE_URL="https://puahejtaskncpazjyxqp.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

## Run Tests

// turbo
4. Run all E2E tests
```bash
npx playwright test
```

5. Run specific test suite
```bash
# Disbursement API tests
npx playwright test disbursement.e2e.ts

# RLS tests
npx playwright test disbursements-rls.e2e.ts
npx playwright test documents-rls.e2e.ts

# UI tests
npx playwright test backoffice-ui.e2e.ts
```

6. Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

7. Run tests with specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Debug Failing Tests

8. Run single test in debug mode
```bash
npx playwright test disbursement.e2e.ts --debug
```

9. View test report
```bash
npx playwright show-report
```

10. Check test screenshots (if test failed)
```bash
ls -la test-results/
```

## Test Coverage Report

11. View current coverage status
```bash
npx playwright test --reporter=html
```

Current coverage (as of Dec 2025):
- Disbursement API: 6/6 (100%) ✅
- Disbursements RLS: 13/16 (81%) ✅
- Documents RLS: 14/14 (100%) ✅
- Backoffice UI: 3/10 (30%) ⏳

## Common Test Patterns

**Using fixtures for authentication:**
```typescript
import { test, expect } from '../fixtures';

test('Client can view own loans', async ({ client1Supabase }) => {
  const { data, error } = await client1Supabase
    .from('loans')
    .select('*');
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

**Testing RLS policies:**
```typescript
test('Client cannot view other clients loans', async ({ client1Supabase }) => {
  const { data } = await client1Supabase
    .from('loans')
    .select('*')
    .eq('user_id', 'client2-uuid');
  
  expect(data).toHaveLength(0); // Should not see other client's data
});
```

**Testing UI interactions:**
```typescript
test('Admin can approve loan', async ({ page, adminSupabase }) => {
  await page.goto('/admin/approvals');
  await page.getByTestId('loan-approve-button').first().click();
  await page.getByTestId('confirm-approval').click();
  
  await expect(page.getByText('Loan approved')).toBeVisible();
});
```

## Cleanup After Tests

12. Clean up test data
```bash
psql -h aws-0-eu-north-1.pooler.supabase.com -p 6543 -d postgres -U postgres.puahejtaskncpazjyxqp -f cleanup-ui-test-data.sql
```

13. Verify cleanup
```sql
SELECT COUNT(*) FROM loans WHERE loan_number LIKE 'UI-TEST-%';
-- Expected: 0
```

## CI/CD Integration

14. Tests run automatically on:
- Pull requests to main
- Pushes to main
- Manual workflow dispatch

15. View CI test results in GitHub Actions
- URL: https://github.com/DKTony/namlend-trust-portal-v220/actions

## Adding New Tests

16. Create new test file
```bash
touch e2e/my-new-test.e2e.ts
```

17. Use fixture pattern for authentication
```typescript
import { test, expect } from '../fixtures';

test.describe('My Feature', () => {
  test('should work correctly', async ({ client1Supabase, page }) => {
    // Test implementation
  });
});
```

18. Add data-testid to UI elements
```tsx
<button data-testid="my-button">Click me</button>
```

19. Run new test
```bash
npx playwright test my-new-test.e2e.ts
```

## Troubleshooting

**Tests timing out:**
- Increase timeout in playwright.config.ts
- Check network connectivity
- Verify Supabase is accessible

**Authentication failures:**
- Verify test users exist
- Check SUPABASE_URL and SUPABASE_ANON_KEY
- Ensure fixtures are using testInfo.testId for isolation

**RLS policy failures:**
- Run RLS audit workflow
- Verify policies exist for test scenarios
- Check user roles are assigned correctly

**UI selector failures:**
- Add data-testid attributes
- Use more specific selectors
- Check if element is visible/enabled

## Test Data Management

**Test data prefixes:**
- Loan numbers: `UI-TEST-%`
- User names: `UI Test%`
- Emails: `test%@namlend.com`

**Safe cleanup pattern:**
```sql
DELETE FROM table_name WHERE column LIKE 'UI-TEST-%';
```

## Success Criteria
✅ All tests pass
✅ No authentication errors
✅ RLS policies working correctly
✅ UI interactions work as expected
✅ Test data cleaned up
✅ Coverage report generated
✅ No flaky tests

## Test Maintenance Schedule
- Run full suite before each deployment
- Add tests for new features
- Update tests when UI changes
- Review and fix flaky tests weekly
- Maintain >80% coverage target
