# NamLend Trust - Quick Start Guide

**Doc Revision**: 2026-01-19
**Status**: Active
**Purpose**: Developer cheatsheet for common tasks

---

## Table of Contents

- [Setup](#setup)
- [Development](#development)
- [Testing](#testing)
- [Database](#database)
- [Deployment](#deployment)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Setup

### First Time Setup

```bash
# Clone repository
git clone <repo-url>
cd namlend-trust-portal-v220-main

# Install dependencies
npm install

# Copy environment file (pre-configured for demo)
cp .env.example .env

# Start development server
npm run dev
```

### Environment Variables

Required for local development:

```env
VITE_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Optional for debugging:

```env
VITE_DEBUG_TOOLS=true
VITE_RUN_DEV_SCRIPTS=true
VITE_ALLOW_LOCAL_ADMIN=true # deprecated; prefer VITE_DEBUG_TOOLS
```

---

## Development

### Start Development Server

```bash
npm run dev          # Starts on http://localhost:8080
```

### Test Credentials (E2E defaults)

These map to the Playwright defaults in `e2e/helpers/auth.ts` and should exist in Supabase Auth.

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| Client | client1@test.namlend.com | test123 | /dashboard |
| Admin | admin@test.namlend.com | test123 | /admin |

Override with env vars in CI or local runs:

```env
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_CLIENT_EMAIL=
E2E_CLIENT_PASSWORD=
```

### Build Commands

```bash
npm run build        # Production build
npm run build:dev    # Development-mode build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run docs:lint    # Lint markdown docs
npm run docs:fix     # Auto-fix markdown docs
```

---

## Testing

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/loan-application.e2e.ts

# Run tests matching pattern
npx playwright test -g "loan approval"

# Debug a failing test
npx playwright test --debug e2e/loan-application.e2e.ts
```

### Unit Tests (Vitest)

```bash
# Note: Vitest not currently in package.json
# Install first if needed:
npm install -D vitest

# Then run:
npx vitest
npx vitest --ui
npx vitest --coverage
```

---

## Database

### Regenerate TypeScript Types

```bash
# After schema changes, regenerate types
npx supabase gen types typescript \
  --project-id puahejtaskncpazjyxqp \
  > src/integrations/supabase/types.ts
```

### Run Migrations Locally

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Reset database
npx supabase db reset
```

### Useful SQL Queries

```sql
-- Check loan approval state
SELECT id, status, request_type, created_at
FROM approval_requests
WHERE request_data->>'loan_id' = 'LOAN_ID_HERE'
ORDER BY created_at DESC;

-- View audit trail for a loan
SELECT * FROM audit_logs
WHERE table_name = 'loans'
  AND record_id = 'LOAN_ID_HERE'
ORDER BY created_at DESC;

-- Check pending disbursements
SELECT d.*, l.amount as loan_amount
FROM disbursements d
JOIN loans l ON d.loan_id = l.id
WHERE d.status = 'pending';

-- TigerBeetle sync status
SELECT status, COUNT(*)
FROM tigerbeetle_outbox
GROUP BY status;

-- Overdue payments
SELECT ps.*, l.id as loan_id
FROM payment_schedules ps
JOIN loans l ON ps.loan_id = l.id
WHERE ps.due_date < NOW()
  AND ps.status != 'paid';
```

---

## Deployment

### Deploy to Netlify

```bash
# Build for production
npm run build

# Deploy (if Netlify CLI installed)
netlify deploy --prod
```

### Deploy Edge Functions

```bash
# Deploy single function
npx supabase functions deploy ips-adapter

# Deploy all functions
npx supabase functions deploy

# Set secrets
npx supabase secrets set IPS_API_KEY=xxx
```

---

## Common Tasks

### Adding a New Component

1. Create component in `src/components/`
2. Use shadcn/ui components from `src/components/ui/`
3. Follow Neo-Fintech design system (see `docs/DESIGN_SYSTEM.md`)

```typescript
// Example component structure
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  return (
    <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800">
      <CardHeader>
        <h2 className="text-lg font-semibold">Title</h2>
      </CardHeader>
      <CardContent>
        <Button variant="default">Action</Button>
      </CardContent>
    </Card>
  );
}
```

### Adding a New Service

1. Create file in `src/services/`
2. Use Supabase client for data operations
3. Add audit logging for financial operations

```typescript
// src/services/myService.ts
import { supabase } from '@/integrations/supabase/client';
import { createAuditLog } from '@/services/auditService';

export async function myOperation(params: MyParams) {
  const { data, error } = await supabase
    .rpc('my_rpc_function', params);

  if (error) {
    throw new Error(error.message);
  }

  // Audit financial operations
  await createAuditLog({
    table_name: 'my_table',
    action: 'INSERT',
    new_data: data,
  });

  return data;
}
```

### Adding a New RPC Function

1. Create migration in `supabase/migrations/`
2. Add RLS policies if needed
3. Regenerate TypeScript types

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_my_function.sql
CREATE OR REPLACE FUNCTION my_function(
  p_param1 TEXT,
  p_param2 INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Implementation
  RETURN jsonb_build_object('success', true);
END;
$$;
```

### Adding a New E2E Test

```typescript
// e2e/my-feature.e2e.ts
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, false); // false = regular user
  });

  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.getByTestId('my-element')).toBeVisible();
    // Add assertions
  });
});
```

---

## Troubleshooting

### Auth Issues

**Session lost after navigation**

```typescript
// Ensure session is restored in useAuth hook
// Check localStorage for 'namlend-auth' key
localStorage.getItem('namlend-auth');
```

**Admin redirect to dashboard**

```
Check user_roles table for admin role assignment
SELECT * FROM user_roles WHERE user_id = 'USER_ID';
```

### Build Errors

**TypeScript type errors**

```bash
# Check for type issues
npx tsc --noEmit

# Regenerate Supabase types
npx supabase gen types typescript --project-id puahejtaskncpazjyxqp > src/integrations/supabase/types/database.types.ts
```

**Module not found**

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
```

### E2E Test Failures

**Auth persistence issues**

```typescript
// Use the re-login pattern in tests
await login(page);
await page.goto('/protected-route');
// If redirected to /auth, re-login
if (page.url().includes('/auth')) {
  await login(page);
  await page.goto('/protected-route');
}
```

**Element not found**

```bash
# Run in debug mode
npx playwright test --debug e2e/my-test.e2e.ts

# Take screenshot on failure
npx playwright test --screenshot=on
```

### Database Issues

**RLS blocking queries**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test as specific user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'USER_UUID_HERE';
SELECT * FROM my_table;
```

**Migration failures**

```bash
# Check migration status
npx supabase migration list

# Repair migrations
npx supabase db reset
```

---

## Quick Reference

### File Locations

| What | Where |
|------|-------|
| Components | `src/components/` |
| Pages | `src/pages/` |
| Services | `src/services/` |
| Types | `src/types/` |
| Constants | `src/constants/` |
| E2E Tests | `e2e/` |
| Migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| Documentation | `docs/` |

### Key Constants

```typescript
// src/constants/regulatory.ts
APR_LIMIT = 32  // 32% max APR (percentage value)
CURRENCY_CODE = 'NAD'
CURRENCY_SYMBOL = 'N$'
DATA_RETENTION_YEARS = 7
```

### Useful Commands Summary

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run E2E tests | `npm run test:e2e` |
| Build for production | `npm run build` |
| Lint code | `npm run lint` |
| Deploy function | `npx supabase functions deploy <name>` |
| Regenerate types | `npx supabase gen types typescript --project-id puahejtaskncpazjyxqp` |

---

## See Also

- [INDEX.md](./INDEX.md) - Full documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [TESTING.md](./TESTING.md) - Detailed testing guide
- [AGENTS.md](./AGENTS.md) - AI agent guidelines
- [GLOSSARY.md](./GLOSSARY.md) - Terminology
