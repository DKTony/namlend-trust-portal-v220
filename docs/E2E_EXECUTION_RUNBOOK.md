# E2E Test Execution Runbook

**Last Updated:** 2025-11-14  
**Maintainer:** Engineering Team

---

## Overview

This runbook provides step-by-step instructions for executing the NamLend E2E test suite locally and in CI. It covers prerequisites, environment setup, test execution, and troubleshooting.

---

## Prerequisites

### Required Software

- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)
- **Supabase CLI**: v1.50+ (optional, for local DB management)
- **Git**: v2.30+

### Required Access

- **Supabase Project**: Access to `puahejtaskncpazjyxqp` project
- **Environment Variables**: `.env` file with valid credentials (see below)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd namlend-trust-main-3
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` file in project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# E2E Test Configuration
VITE_E2E=true
BASE_URL=http://localhost:8080

# Optional: E2E Test Credentials (if not using defaults)
# E2E_ADMIN_EMAIL=admin@test.namlend.com
# E2E_ADMIN_PASSWORD=test123
```

**Important:** Never commit `.env` to version control. Use `.env.example` as a template.

### 4. Verify Supabase Connection

```bash
# Test connection (optional)
npx supabase status
```

---

## Test Data Setup

### Required Test Users

The E2E suite requires four test users with specific roles:

| Email | Password | Role | UUID |
|-------|----------|------|------|
| `client1@test.namlend.com` | `test123` | client | `11111111-0000-0000-0000-000000000001` |
| `client2@test.namlend.com` | `test123` | client | `22222222-0000-0000-0000-000000000002` |
| `admin@test.namlend.com` | `test123` | admin | `33333333-0000-0000-0000-000000000003` |
| `loan_officer@test.namlend.com` | `test123` | loan_officer | `44444444-0000-0000-0000-000000000004` |

### Creating Test Users

Run the SQL script in Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Execute: e2e/create-test-users.sql
```

Or use the Supabase CLI:

```bash
supabase db execute --file e2e/create-test-users.sql
```

### Creating Test Data

Run the test data creation script:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Execute: e2e/create-test-data.sql
```

This creates:

- 5 loans (3 approved, 1 disbursed, 1 pending)
- 1 disbursement record
- Associated repayment schedules
- Audit trail entries

---

## Running Tests

### Local Execution

#### Run All Tests

```bash
npm run test:e2e
```

#### Run Specific Suite

```bash
# Disbursement API tests
npm run test:e2e -- --grep "Disbursement API Tests"

# Disbursement RLS tests
npm run test:e2e -- --grep "Disbursements Table RLS"

# Documents RLS tests
npm run test:e2e -- --grep "Documents Storage RLS"

# Backoffice UI tests
npm run test:e2e -- --grep "Backoffice Disbursement UI"
```

#### Run Single Test

```bash
npx playwright test e2e/api/disbursement.e2e.ts:88
```

#### Run in Headed Mode (with browser UI)

```bash
npm run test:e2e:headed
```

#### Run with Playwright UI

```bash
npm run test:e2e:ui
```

### CI Execution (GitHub Actions)

Tests run automatically on:

- Push to `main` branch
- Pull requests to `main`
- Manual workflow dispatch

**Workflow File:** `.github/workflows/e2e.yml`

**Environment Variables (GitHub Secrets):**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Test Architecture

### Test Organization

```
e2e/
├── api/                          # API & RLS tests
│   ├── disbursement.e2e.ts      # Disbursement RPC tests
│   ├── disbursements-rls.e2e.ts # Disbursement RLS tests
│   └── documents-rls.e2e.ts     # Document storage RLS tests
├── backoffice-disbursement.e2e.ts # UI tests
├── assign-role-modal.spec.ts     # Role assignment UI tests
├── create-test-users.sql         # Test user setup
└── create-test-data.sql          # Test data setup
```

### Test Suites

| Suite | Tests | Purpose |
|-------|-------|---------|
| **Disbursement API** | 6 | Test RPC functions for disbursement workflow |
| **Disbursements RLS** | 12 | Test row-level security policies |
| **Documents RLS** | 11 | Test storage bucket policies |
| **Backoffice UI** | 8 | Test admin disbursement UI flows |

---

## Playwright Configuration

### Key Settings

```typescript
// playwright.config.ts
{
  testDir: './e2e',
  timeout: 60_000,              // 60s per test
  expect: { timeout: 10_000 },  // 10s for assertions
  fullyParallel: true,          // Run tests in parallel
  retries: process.env.CI ? 1 : 0,
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000            // 2min for server startup
  }
}
```

### Browser Configuration

- **Default:** Chromium only
- **Parallel Execution:** Enabled (6 workers)
- **Headless:** Yes (use `--headed` flag to disable)

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API key" Error

**Symptom:**

```
AuthApiError: Invalid API key
```

**Solution:**

1. Verify `VITE_SUPABASE_ANON_KEY` in `.env` matches Supabase Dashboard (Settings → API)
2. Ensure `.env` is loaded: `source .env && npm run test:e2e`
3. Check for trailing spaces or quotes in `.env` values

#### 2. "Connection Refused" Error

**Symptom:**

```
ERR_CONNECTION_REFUSED at http://localhost:8080
```

**Solution:**

1. Verify dev server is running: `npm run dev:e2e` in separate terminal
2. Check port 8080 is not in use: `lsof -i :8080`
3. Wait for server startup (can take 30-60s)

#### 3. "Row-level security policy" Error

**Symptom:**

```
new row violates row-level security policy for table "loans"
```

**Solution:**

1. Verify test user has correct role in `user_roles` table
2. Check RLS policies allow admin/loan_officer inserts
3. Ensure `loans insert: self or staff` policy exists

#### 4. "Function not found" Error

**Symptom:**

```
Could not find the function public.complete_disbursement
```

**Solution:**

1. Verify RPC functions exist in Supabase (SQL Editor → Functions)
2. Check function signatures match test calls
3. Restart Supabase to refresh schema cache

#### 5. Test Data Issues

**Symptom:**

```
Disbursement not found or already completed
```

**Solution:**

1. Re-run `e2e/create-test-data.sql` to reset test data
2. Check loan IDs in test match seeded data
3. Verify disbursements table has pending records

### Debug Mode

Enable verbose logging:

```bash
DEBUG=pw:api npm run test:e2e
```

View Playwright trace:

```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## Test Maintenance

### Adding New Tests

1. **Create test file** in appropriate directory (`e2e/api/` or `e2e/`)
2. **Follow naming convention**: `*.e2e.ts` or `*.spec.ts`
3. **Use test data** from `create-test-data.sql` (don't create new data)
4. **Add to CI** workflow if needed

### Updating Test Data

1. **Modify** `e2e/create-test-data.sql`
2. **Re-run script** in Supabase SQL Editor
3. **Update tests** to match new data structure
4. **Document changes** in this runbook

### Updating RPC Contracts

1. **Update RPC** in Supabase (SQL Editor)
2. **Update ADR** (`docs/ADR_DISBURSEMENT_RPC_CONTRACT.md`)
3. **Update tests** to match new signature
4. **Run full suite** to verify no regressions

---

## Performance Benchmarks

### Expected Execution Times

| Suite | Tests | Duration (Local) | Duration (CI) |
|-------|-------|------------------|---------------|
| **Disbursement API** | 6 | ~10s | ~15s |
| **Disbursements RLS** | 12 | ~20s | ~30s |
| **Documents RLS** | 11 | ~18s | ~28s |
| **Backoffice UI** | 8 | ~45s | ~60s |
| **Full Suite** | 64 | ~2.5min | ~3.5min |

### Optimization Tips

1. **Use `--grep`** to run specific suites during development
2. **Disable parallelization** for debugging: `--workers=1`
3. **Use `--headed`** only when necessary (slower)
4. **Reuse server** locally: `reuseExistingServer: true`

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          BASE_URL: http://localhost:8080
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Required Secrets

Add to GitHub repository settings (Settings → Secrets → Actions):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Support

### Resources

- **Playwright Docs**: <https://playwright.dev>
- **Supabase Docs**: <https://supabase.com/docs>
- **Project Wiki**: (internal link)

### Contacts

- **E2E Test Owner**: Engineering Team
- **Supabase Admin**: DevOps Team
- **CI/CD Support**: Platform Team

---

## Appendix

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | - | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | - | Supabase anon (public) key |
| `BASE_URL` | No | `http://localhost:8080` | Dev server URL |
| `VITE_E2E` | No | `false` | Enable E2E mode |
| `E2E_ADMIN_EMAIL` | No | `admin@test.namlend.com` | Admin test user email |
| `E2E_ADMIN_PASSWORD` | No | `test123` | Admin test user password |

### Test User UUIDs

```sql
-- Client 1
'11111111-0000-0000-0000-000000000001'

-- Client 2
'22222222-0000-0000-0000-000000000002'

-- Admin
'33333333-0000-0000-0000-000000000003'

-- Loan Officer
'44444444-0000-0000-0000-000000000004'
```

### Loan Test Data UUIDs

```sql
-- Approved Loan 1
'aaaaaaaa-1111-0000-0000-000000000001'

-- Approved Loan 2
'aaaaaaaa-2222-0000-0000-000000000002'

-- Approved Loan 3
'aaaaaaaa-3333-0000-0000-000000000003'

-- Disbursed Loan
'aaaaaaaa-4444-0000-0000-000000000004'

-- Pending Loan
'aaaaaaaa-5555-0000-0000-000000000005'
```
