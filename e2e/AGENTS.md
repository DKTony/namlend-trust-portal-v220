# E2E Testing Agent Instructions

## Testing Framework

- **Tool**: Playwright
- **Config**: `playwright.config.ts`
- **Test Location**: `/e2e/`
- **Helpers**: `/e2e/helpers/`

## Test Categories

```
e2e/
├── api/                    # API/RPC endpoint tests
│   ├── admin-rpc.e2e.ts
│   ├── disbursement.e2e.ts
│   └── loan-application.e2e.ts
├── helpers/
│   ├── admin.ts           # Admin test utilities
│   └── auth.ts            # Authentication helpers
├── unit/                  # Unit-style E2E tests
└── *.e2e.ts              # UI flow tests
```

## Test Users

```typescript
// Admin user - full access
const ADMIN = {
  email: 'admin@test.namlend.com',
  password: 'test123',
  role: 'admin'
};

// Client user - limited access
const CLIENT = {
  email: 'client1@test.namlend.com', 
  password: 'test123',
  role: 'client'
};
```

## Writing Tests

### Test Structure Template
```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsClient } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - login, navigate, etc.
  });

  test('should do something specific', async ({ page }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

### API Test Template
```typescript
import { test, expect, request } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('API: Feature Name', () => {
  let supabase;
  
  test.beforeAll(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  });

  test('RPC function should work correctly', async () => {
    const { data, error } = await supabase.rpc('function_name', {
      param1: 'value1'
    });
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/api/disbursement.e2e.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run headed (see browser)
npx playwright test --headed

# Debug a specific test
npx playwright test --debug e2e/loan-flow.e2e.ts

# Generate test report
npx playwright show-report
```

## Best Practices

### DO
- Use meaningful test descriptions
- Test one thing per test
- Use `data-testid` attributes for element selection
- Clean up test data after tests
- Test all user roles (admin, client, loan_officer)
- Verify RLS policies are enforced
- Test error states and edge cases
- Use page object pattern for complex flows

### DON'T
- Hardcode UUIDs - query for actual IDs
- Skip authentication in tests
- Leave test data in database
- Test implementation details
- Use flaky selectors (class names that change)
- Ignore network timeouts

## Selector Strategy

Prefer selectors in this order:
1. `data-testid` - Most reliable
2. `role` + `name` - Accessible and stable
3. `text` - For buttons/links with unique text
4. CSS selectors - Last resort

```typescript
// Good
await page.getByTestId('submit-loan-btn').click();
await page.getByRole('button', { name: 'Submit' }).click();

// Avoid
await page.locator('.btn-primary').click();
await page.locator('#submit').click();
```

## Financial Test Considerations

- Always verify APR ≤ 32% in loan tests
- Check currency formatting (N$ X,XXX.XX)
- Verify audit logs are created for financial ops
- Test decimal precision for money calculations
- Verify RLS prevents unauthorized access
- Test idempotency of payment operations

## Test Data Management

### Setup Fixtures
```typescript
// Use SQL files for complex setup
test.beforeAll(async () => {
  await supabase.rpc('setup_test_data');
});
```

### Cleanup
```typescript
test.afterAll(async () => {
  // Clean up test data
  await supabase.rpc('cleanup_test_data');
});
```

## Common Assertions

```typescript
// Page navigation
await expect(page).toHaveURL(/dashboard/);

// Element visibility
await expect(page.getByTestId('loan-form')).toBeVisible();

// Text content
await expect(page.getByTestId('total-amount')).toContainText('N$ 15,000.00');

// API response
expect(response.status()).toBe(200);
expect(data.status).toBe('approved');
```

## Debugging Tips

1. Use `--debug` flag for step-by-step execution
2. Add `await page.pause()` to pause at specific point
3. Check screenshots in `test-results/` folder
4. Review trace files for network requests
5. Use `page.on('console', ...)` to capture browser logs
