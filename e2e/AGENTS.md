# E2E Testing Agent Instructions

## Testing Framework

- **Tool**: Playwright
- **Config**: `playwright.config.ts`
- **Test Location**: `/e2e/`
- **Helpers**: `/e2e/helpers/`
- **Active app backend**: Convex

## Current Test Boundary

The application runtime is Convex-first. Some older API/RPC tests and helpers still use Supabase clients, SQL cleanup, or Supabase RPC names. Treat those as legacy tests that need migration, not as examples for new coverage.

New E2E tests should exercise the browser app through the UI or Convex-backed helpers. Do not introduce new Supabase RPC/RLS tests unless the task is explicitly about legacy Supabase reference material.

## Test Categories

```text
e2e/
├── api/                    # Mixed legacy API tests; review before copying patterns
├── helpers/
│   ├── admin.ts            # Admin test utilities
│   └── auth.ts             # Authentication helpers
└── *.e2e.ts                # UI flow tests
```

## Running Tests

```bash
# Run all configured E2E tests
npm run test:e2e

# Run a specific test file
npx playwright test e2e/loan-application.e2e.ts

# Run adaptive layout coverage
BASE_URL=http://127.0.0.1:8080 npx playwright test e2e/adaptive-layout.e2e.ts

# Interactive/debug modes
npx playwright test --ui
npx playwright test --headed
npx playwright test --debug e2e/loan-application.e2e.ts
```

## Best Practices

Do:

- Prefer `data-testid`, role/name, and accessible selectors.
- Test all relevant roles: `client`, `loan_officer`, `admin`.
- Keep financial cleanup retention-aware; prefer isolated fixtures over hard deletes.
- Verify route guards and backend effects, not just button clicks.
- Cover compact and desktop viewports for shell/navigation changes.

Do not:

- Copy legacy Supabase RPC test templates into new tests.
- Hardcode UUIDs when test data can be discovered or created deterministically.
- Leave test data that can affect later runs.
- Use flaky selectors tied to visual classes.
- Normalize hard deletes for production-like financial records.

## Selector Strategy

Prefer selectors in this order:

1. `data-testid`
2. `role` + accessible name
3. Unique text
4. CSS selector only when the first three are not feasible

```typescript
await page.getByTestId('submit-loan-button').click();
await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
```

## Migration Note

When touching an older Supabase-backed E2E/API test, either migrate it to the active Convex path or label it clearly as legacy/reference. Update [TESTING.md](../docs/TESTING.md) if the coverage boundary changes.
