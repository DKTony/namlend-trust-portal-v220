# NamLend Trust - Testing Documentation

**Version**: 2.7.0  
**Last Updated**: December 12, 2025

---

## Testing Overview

NamLend Trust uses **Playwright** for end-to-end testing with a focus on:

- API/RPC testing against Supabase
- Row-Level Security (RLS) verification
- UI workflow testing
- Cross-role access control validation

---

## Test Infrastructure

### Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Playwright | 1.47.2 | E2E test framework |
| Supabase Client | 2.53.0 | Database access |
| TypeScript | 5.5.3 | Test language |

### Directory Structure

```
e2e/
├── fixtures.ts              # Test fixtures with auth isolation
├── api/                     # API/RPC tests
│   ├── disbursement.e2e.ts
│   ├── disbursements-ledger-crud.e2e.ts
│   ├── disbursements-rls.e2e.ts
│   ├── documents-rls.e2e.ts
│   ├── loan-rpc.e2e.ts
│   ├── admin-rpc.e2e.ts
│   ├── ips-adapter.e2e.ts   # IPS Edge Function tests
│   └── ips-rpc.e2e.ts       # IPS RPC tests
├── ips-payment-flow.e2e.ts  # IPS UI payment flow tests
├── unit/                    # Unit tests
│   ├── currency-util.e2e.ts
│   └── ips-utils.e2e.ts     # IPS utility tests
├── helpers/                 # Test helpers
│   └── auth.ts
├── create-test-data.sql     # Test data setup
├── create-test-users.sql    # Test user creation
├── seed-ui-test-data.sql    # UI test data
├── ips-rpc-tests.sql        # IPS RPC test data
└── cleanup-ui-test-data.sql # Test data cleanup
```

---

## Test Fixtures

The project uses a **proven fixture pattern** for parallel test execution without session conflicts.

### Import Pattern

```typescript
import { test, expect } from '../fixtures';
```

### Available Fixtures

| Fixture | Description | User |
|---------|-------------|------|
| `client1Supabase` | Pre-authenticated client user | client1@test.namlend.com |
| `client2Supabase` | Pre-authenticated client user | client2@test.namlend.com |
| `adminSupabase` | Pre-authenticated admin user | admin@test.namlend.com |
| `loanOfficerSupabase` | Pre-authenticated loan officer | loan_officer@test.namlend.com |
| `anonSupabase` | Unauthenticated client | (anonymous) |
| `supabaseClient` | Isolated client (manual auth) | (none) |

### Usage Example

```typescript
import { test, expect } from '../fixtures';

test('Admin can create disbursement', async ({ adminSupabase }) => {
  // adminSupabase is pre-authenticated and isolated
  const { data, error } = await adminSupabase
    .from('disbursements')
    .insert({
      loan_id: testLoanId,
      amount: 10000,
      status: 'pending'
    })
    .select()
    .single();
  
  expect(error).toBeNull();
  expect(data).toBeTruthy();
  expect(data.status).toBe('pending');
});

test('Client cannot access other client data', async ({ 
  client1Supabase, 
  client2Supabase 
}) => {
  // Create data as client1
  const { data: loan } = await client1Supabase
    .from('loans')
    .select('*')
    .limit(1)
    .single();
  
  // client2 should not see it
  const { data: otherLoan } = await client2Supabase
    .from('loans')
    .select('*')
    .eq('id', loan.id)
    .single();
  
  expect(otherLoan).toBeNull();
});
```

### Key Pattern: testInfo for Isolation

```typescript
// In fixtures.ts
client1Supabase: async ({}, use, testInfo) => {
  // Unique storage key per test
  const storageKey = `client1-${testInfo.testId}-${Date.now()}`;
  const client = createIsolatedClient(storageKey);
  await authenticateClient(client, TEST_USERS.client1.email, TEST_USERS.client1.password);
  await use(client);
  await client.auth.signOut();
}
```

**Why This Works:**

- `testInfo.testId` is unique per test
- `Date.now()` adds additional uniqueness
- Each test gets completely isolated auth session
- No session conflicts in parallel execution

---

## Test Users

### Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | `admin@test.namlend.com` | `test123` | admin |
| Client 1 | `client1@test.namlend.com` | `test123` | client |
| Client 2 | `client2@test.namlend.com` | `test123` | client |
| Loan Officer | `loan_officer@test.namlend.com` | `test123` | loan_officer |

### User IDs

```typescript
export const TEST_USERS = {
  admin: {
    id: 'fbf720fd-7de2-4142-974f-6d6809f4f8c6',
    email: 'admin@test.namlend.com',
    password: 'test123',
  },
  client1: {
    id: '11111111-0000-0000-0000-000000000001',
    email: 'client1@test.namlend.com',
    password: 'test123',
  },
  client2: {
    id: '22222222-0000-0000-0000-000000000002',
    email: 'client2@test.namlend.com',
    password: 'test123',
  },
  loanOfficer: {
    id: '44444444-0000-0000-0000-000000000004',
    email: 'loan_officer@test.namlend.com',
    password: 'test123',
  },
};
```

---

## Test Data Management

### Seeding Test Data

```bash
# Run SQL seed script
psql $DATABASE_URL -f e2e/seed-ui-test-data.sql
```

### Test Data Prefixes

Use consistent prefixes for easy identification and cleanup:

- `UI-TEST-` for reference numbers
- `UI Test` for names/descriptions
- Test UUIDs with recognizable patterns

### Cleanup

```bash
# Run cleanup script
psql $DATABASE_URL -f e2e/cleanup-ui-test-data.sql
```

---

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Headed Mode (Debug)

```bash
npm run test:e2e:headed
```

### UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Specific File

```bash
npx playwright test e2e/api/disbursement.e2e.ts
```

### Specific Test

```bash
npx playwright test -g "Admin can create disbursement"
```

### With Trace

```bash
npx playwright test --trace on
```

---

## Test Coverage

### Current Status

| Area | Tests | Passing | Coverage |
|------|-------|---------|----------|
| Disbursement API | 6 | 6 | 100% ✅ |
| Disbursements RLS | 16 | 13 | 81% ✅ |
| Documents RLS | 14 | 14 | 100% ✅ |
| Backoffice UI | 10 | 3 | 30% ⏳ |
| Loan RPC | 4 | 4 | 100% ✅ |
| Admin RPC | 3 | 3 | 100% ✅ |
| **Overall** | | | **67%** |

### Target Coverage

- API/RPC tests: 100%
- RLS tests: 100%
- UI critical paths: 80%

---

## Test Categories

### 1. RLS Tests

Verify Row-Level Security policies work correctly:

```typescript
test.describe('Loans RLS', () => {
  test('Client can only see own loans', async ({ client1Supabase }) => {
    const { data } = await client1Supabase
      .from('loans')
      .select('*');
    
    // All loans should belong to client1
    data.forEach(loan => {
      expect(loan.user_id).toBe(TEST_USERS.client1.id);
    });
  });

  test('Admin can see all loans', async ({ adminSupabase }) => {
    const { data } = await adminSupabase
      .from('loans')
      .select('*');
    
    // Admin should see multiple users' loans
    const userIds = new Set(data.map(l => l.user_id));
    expect(userIds.size).toBeGreaterThan(1);
  });
});
```

### 2. RPC Tests

Test database functions:

```typescript
test.describe('Disbursement RPCs', () => {
  test('complete_disbursement requires payment reference', async ({ adminSupabase }) => {
    const { data, error } = await adminSupabase.rpc('complete_disbursement', {
      p_disbursement_id: testDisbursementId,
      p_payment_method: 'bank_transfer',
      p_payment_reference: '',  // Empty
      p_notes: null
    });
    
    expect(data.success).toBe(false);
    expect(data.error).toContain('required');
  });
});
```

### 3. UI Tests

Test user interface workflows:

```typescript
test.describe('Loan Application', () => {
  test('Client can submit loan application', async ({ page }) => {
    await page.goto('/loan-application');
    
    await page.fill('[data-testid="loan-amount"]', '10000');
    await page.selectOption('[data-testid="loan-term"]', '12');
    await page.click('[data-testid="submit-application"]');
    
    await expect(page.locator('[data-testid="success-message"]'))
      .toBeVisible();
  });
});
```

---

## Best Practices

### 1. Use Fixtures

```typescript
// ✅ Good - Use fixtures
import { test, expect } from '../fixtures';

test('Test', async ({ adminSupabase }) => {
  // Pre-authenticated client
});

// ❌ Bad - Manual auth in each test
test('Test', async () => {
  const client = createClient(url, key);
  await client.auth.signInWithPassword({...});
  // More boilerplate...
});
```

### 2. Cleanup After Tests

```typescript
test.afterEach(async ({ adminSupabase }) => {
  // Clean up test data
  await adminSupabase
    .from('test_table')
    .delete()
    .like('reference', 'UI-TEST-%');
});
```

### 3. Use data-testid for UI Elements

```typescript
// In component
<Button data-testid="submit-btn">Submit</Button>

// In test
await page.click('[data-testid="submit-btn"]');
```

### 4. Test Both Success and Failure Cases

```typescript
test('Success case', async ({ adminSupabase }) => {
  const { data, error } = await adminSupabase.rpc('function', validParams);
  expect(error).toBeNull();
  expect(data.success).toBe(true);
});

test('Failure case - invalid input', async ({ adminSupabase }) => {
  const { data, error } = await adminSupabase.rpc('function', invalidParams);
  expect(data.success).toBe(false);
  expect(data.error).toBeTruthy();
});
```

### 5. Isolate Tests

Each test should be independent:

```typescript
// ✅ Good - Test creates its own data
test('Test', async ({ adminSupabase }) => {
  const { data: created } = await adminSupabase
    .from('table')
    .insert({ name: 'Test Item' })
    .select()
    .single();
  
  // Test with created data
  // Clean up
});

// ❌ Bad - Depends on external data
test('Test', async ({ adminSupabase }) => {
  // Assumes data exists
  const { data } = await adminSupabase
    .from('table')
    .select('*')
    .eq('id', 'hardcoded-uuid');
});
```

---

## Debugging Tests

### View Trace

```bash
npx playwright show-trace test-results/trace.zip
```

### Debug Mode

```bash
PWDEBUG=1 npx playwright test
```

### Console Output

```typescript
test('Debug test', async ({ adminSupabase }) => {
  const { data, error } = await adminSupabase.from('table').select('*');
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Troubleshooting

### Session Conflicts

**Symptom**: Tests fail with auth errors in parallel execution

**Solution**: Use fixtures with `testInfo.testId` for isolation

### RLS Blocking Access

**Symptom**: Queries return empty arrays unexpectedly

**Solution**: Check RLS policies and user roles

### Flaky Tests

**Symptom**: Tests pass/fail inconsistently

**Solutions**:

- Add explicit waits for async operations
- Use `test.slow()` for slow tests
- Ensure proper cleanup between tests

---

*Document Version: 2.0.0*  
*Last Updated: December 2025*
