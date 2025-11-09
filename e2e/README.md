# E2E Testing Guide

## Overview

This directory contains End-to-End (E2E) tests for the NamLend Trust Platform using Playwright. Tests cover:
- API functionality (RPC calls, RLS policies)
- UI flows (disbursement, authentication)
- Security (role-based access control)
- Data integrity (audit trails, status transitions)

---

## Prerequisites

### 1. Environment Variables

Create a `.env.local` file in the project root with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# E2E Test Credentials (optional, tests use hardcoded test users)
E2E_ADMIN_EMAIL=admin@test.namlend.com
E2E_ADMIN_PASSWORD=test123
```

### 2. Test Users

The E2E tests require specific test users to exist in your Supabase database:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `client1@test.namlend.com` | `test123` | client | Primary client test user |
| `client2@test.namlend.com` | `test123` | client | Secondary client for isolation tests |
| `admin@test.namlend.com` | `test123` | admin | Admin user for privileged operations |
| `loan_officer@test.namlend.com` | `test123` | loan_officer | Loan officer for disbursement tests |

#### Creating Test Users

**Option 1: Using Supabase Dashboard**
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. After creation, add role in SQL Editor:

```sql
-- Add admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@test.namlend.com';

-- Add loan_officer role
INSERT INTO user_roles (user_id, role)
SELECT id, 'loan_officer'
FROM auth.users
WHERE email = 'loan_officer@test.namlend.com';

-- Client roles are added automatically by trigger
```

**Option 2: Using SQL Script**

```sql
-- Create test users (run in Supabase SQL Editor)
DO $$
DECLARE
  v_client1_id UUID;
  v_client2_id UUID;
  v_admin_id UUID;
  v_loan_officer_id UUID;
BEGIN
  -- Create client 1
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'client1@test.namlend.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_client1_id;

  -- Create client 2
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'client2@test.namlend.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_client2_id;

  -- Create admin
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@test.namlend.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_admin_id;

  -- Create loan officer
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'loan_officer@test.namlend.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_loan_officer_id;

  -- Add roles
  INSERT INTO user_roles (user_id, role) VALUES
    (v_client1_id, 'client'),
    (v_client2_id, 'client'),
    (v_admin_id, 'admin'),
    (v_loan_officer_id, 'loan_officer');

  -- Create profiles
  INSERT INTO profiles (user_id, first_name, last_name, phone_number) VALUES
    (v_client1_id, 'Test', 'Client1', '+264811234567'),
    (v_client2_id, 'Test', 'Client2', '+264811234568'),
    (v_admin_id, 'Test', 'Admin', '+264811234569'),
    (v_loan_officer_id, 'Test', 'Officer', '+264811234570');

  RAISE NOTICE 'Test users created successfully';
END $$;
```

---

## Running Tests

### Local Development

```bash
# Run all tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/api/disbursement.e2e.ts

# Run specific test suite
npx playwright test e2e/api/

# Debug mode
npx playwright test --debug
```

### CI/CD (GitHub Actions)

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main`

**Required GitHub Secrets:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `E2E_ADMIN_EMAIL` - Admin test user email (optional)
- `E2E_ADMIN_PASSWORD` - Admin test user password (optional)

To add secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its value

---

## Test Structure

```
e2e/
├── api/
│   ├── disbursement.e2e.ts          # RPC functionality tests
│   ├── disbursements-rls.e2e.ts     # Disbursements table RLS
│   └── documents-rls.e2e.ts         # Documents storage RLS
└── backoffice-disbursement.e2e.ts   # UI flow tests
```

### Test Categories

#### 1. API Tests (RPC & Database)
- **disbursement.e2e.ts**: Tests `complete_disbursement` RPC
- **disbursements-rls.e2e.ts**: Tests table-level RLS policies
- **documents-rls.e2e.ts**: Tests storage bucket RLS policies

#### 2. UI Tests
- **backoffice-disbursement.e2e.ts**: Tests complete user flows

---

## Test Coverage

| Category | Test Cases | Coverage |
|----------|------------|----------|
| API Tests | 6 | RPC logic, role checks |
| UI Tests | 11 | User flows, form validation |
| Documents RLS | 12 | Storage policies, CRUD |
| Disbursements RLS | 15 | Table policies, joins |
| **Total** | **44** | **Comprehensive** |

---

## Troubleshooting

### Issue: "Could not find a relationship" error

**Cause**: Supabase schema cache not refreshed after migration.

**Solution**:
```bash
# Refresh schema in Supabase Dashboard
# Settings → API → Reload schema
```

### Issue: "User not found" or authentication errors

**Cause**: Test users don't exist or have wrong credentials.

**Solution**:
1. Verify users exist in Supabase Dashboard → Authentication
2. Check passwords match (default: `test123`)
3. Verify roles in `user_roles` table

### Issue: "RLS policy violation"

**Cause**: RLS policies not applied or incorrect.

**Solution**:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies 
WHERE tablename IN ('disbursements', 'documents', 'loans');
```

### Issue: Tests timeout

**Cause**: Supabase connection slow or dev server not starting.

**Solution**:
1. Check `VITE_SUPABASE_URL` is correct
2. Increase timeout in `playwright.config.ts`
3. Ensure dev server starts: `npm run dev:e2e`

### Issue: Flaky tests

**Cause**: Race conditions or network issues.

**Solution**:
1. Tests have built-in retries in CI (1 retry)
2. Use `test.setTimeout()` for slow operations
3. Add explicit waits: `await page.waitForSelector()`

---

## Best Practices

### 1. Test Isolation
- Each test creates its own data
- Cleanup after test completion
- Use unique identifiers (timestamps)

### 2. Assertions
```typescript
// Good: Specific assertions
expect(data.status).toBe('completed');
expect(data.payment_method).toBe('bank_transfer');

// Avoid: Generic assertions
expect(data).toBeTruthy();
```

### 3. Error Handling
```typescript
// Good: Check both success and error cases
const { data, error } = await supabase.rpc('complete_disbursement', params);
expect(error).toBeNull();
expect(data.success).toBe(true);

// Also test error cases
const { error: authError } = await clientSupabase.rpc('complete_disbursement', params);
expect(authError).toBeTruthy();
```

### 4. Test Data
- Use realistic data (valid NAD amounts, proper dates)
- Clean up test data after tests
- Don't rely on existing data (create what you need)

---

## Continuous Integration

### GitHub Actions Workflow

The E2E tests run on every push/PR via `.github/workflows/e2e.yml`:

1. **Checkout code**
2. **Install Node.js 20**
3. **Install dependencies** (`npm ci`)
4. **Install Playwright browsers**
5. **Run tests** with environment variables
6. **Upload HTML report** (available for 7 days)

### Viewing Test Results

**In GitHub:**
1. Go to Actions tab
2. Click on the workflow run
3. View job logs or download HTML report artifact

**Locally:**
```bash
# After running tests
npx playwright show-report
```

---

## Adding New Tests

### 1. Create Test File

```typescript
// e2e/api/my-feature.e2e.ts
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('My Feature', () => {
  test('should do something', async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Your test logic
    const { data, error } = await supabase.from('table').select('*');
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });
});
```

### 2. Run Your Test

```bash
npx playwright test e2e/api/my-feature.e2e.ts
```

### 3. Update Documentation

Add your test to this README and update the test coverage table.

---

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- [ADR-003: E2E Test Coverage Strategy](../docs/ADRs/ADR-003-e2e-test-coverage-strategy.md)
- [Week 3 Disbursement Summary](../docs/WEEK3_DISBURSEMENT_COMPLETION_SUMMARY.md)

---

**Last Updated**: November 9, 2025  
**Test Framework**: Playwright v1.x  
**Node Version**: 20.x  
**Total Test Cases**: 44
