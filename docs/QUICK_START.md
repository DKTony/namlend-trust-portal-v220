# NamLend Trust - Quick Start Guide

**Doc Revision**: 2026-03-03
**Status**: Active
**Purpose**: Developer cheatsheet for common tasks

> ⚠️ **Backend is Convex (migrated Feb 2026).** Use `npx convex dev` for backend changes — NOT Supabase CLI commands. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full context.

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
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Optional for debugging:

```env
VITE_DEBUG_TOOLS=true
VITE_RUN_DEV_SCRIPTS=true
```

All API secrets (SMS, WhatsApp, IPS, TigerBeetle) are set as **Convex environment variables** (server-side only):

```bash
# Set secrets via Convex CLI (NOT in .env)
npx convex env set AFRICASTALKING_API_KEY=xxx
npx convex env set WHATSAPP_ACCESS_TOKEN=xxx
npx convex env set IPS_API_KEY=xxx
```

---

## Development

### Start Development Server

```bash
npm run dev          # Starts on http://localhost:8080
```

### Test Credentials (E2E defaults)

These map to the Playwright defaults in `e2e/helpers/auth.ts` and should exist in Convex Auth.

| Role   | Email                      | Password | Dashboard  |
| ------ | -------------------------- | -------- | ---------- |
| Client | <client1@test.namlend.com> | test123  | /dashboard |
| Admin  | <admin@test.namlend.com>   | test123  | /admin     |

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

Vitest is configured and ready. Test files live in `src/tests/`.

```bash
# Run all unit tests
npm run test:unit

# Run with Vitest UI
npm run test:unit -- --ui

# Run with coverage
npm run test:unit -- --coverage
```

---

## Database (Convex)

### Start Convex Dev Server

```bash
# Start Convex dev server (auto-syncs schema + functions, watches for changes)
npx convex dev

# TypeScript types auto-generate in convex/_generated/ on every sync
# No manual type generation needed
```

### Deploy to Production

```bash
# Deploy schema + all functions to Convex Cloud
npx convex deploy

# Open Convex dashboard (logs, data browser, functions)
npx convex dashboard
```

### Schema Changes

```bash
# 1. Edit convex/schema.ts
# 2. Run dev server — types auto-regenerate
npx convex dev

# 3. No migration files needed — Convex handles schema evolution
```

### Query Data via Convex Dashboard

Open the Convex dashboard data browser to inspect tables:

```bash
npx convex dashboard  # → Data tab → select table
```

Useful checks:

- **`loans`** table: filter by `status` to see pending/active loans
- **`approvalRequests`** table: filter by `status: "pending"` to see approval queue
- **`tigerBeetleOutbox`** table: filter by `status: "pending"` for unprocessed outbox entries
- **`auditLogs`** table: filter by `entityType: "loans"` for loan audit trail
- **`paymentSchedules`** table: filter by `status: "overdue"` for missed payments

---

## Deployment

### Deploy Frontend to Netlify

```bash
# Build for production
npm run build

# Deploy (if Netlify CLI installed)
netlify deploy --prod

# Auto-deploys on push to main branch
```

### Deploy Convex Backend

```bash
# Deploy schema + all Convex functions to production
npx convex deploy

# Set Convex environment secrets (server-side only)
npx convex env set AFRICASTALKING_API_KEY=xxx
npx convex env set AFRICASTALKING_USERNAME=xxx
npx convex env set WHATSAPP_ACCESS_TOKEN=xxx
npx convex env set IPS_API_KEY=xxx
npx convex env set TIGERBEETLE_ADDRESS=tigerbeetle.namlend.com:3001
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

### Adding a New Backend Query or Mutation

1. Add to existing or new file in `convex/`
2. Call auth guard at top of handler
3. Schedule audit log for financial operations

```typescript
// convex/myModule.ts
import { query, mutation } from './_generated/server';
import { assertAuthenticated, assertStaff } from './lib/auth';
import { scheduleAuditLog } from './lib/audit';

export const myQuery = query({
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('myTable')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const myMutation = mutation({
  args: {
    /* define args with Convex validators */
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    const id = await ctx.db.insert('myTable', args);
    await scheduleAuditLog(ctx, { action: 'INSERT', entityType: 'myTable', entityId: id });
    return id;
  },
});
```

### Adding a Schema Table

1. Edit `convex/schema.ts` — add `defineTable()` with validators and indexes
2. Run `npx convex dev` — types auto-regenerate in `convex/_generated/`
3. Add auth guard checks in the corresponding query/mutation file
4. No migration files needed

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

**User not redirected after login**

```typescript
// Convex Auth session is reactive — check ConvexAuthProvider is wrapping the app in src/App.tsx
// Inspect src/hooks/useAuth.tsx for role-based redirect logic
// Check userRoles table in Convex dashboard for role assignment
```

**Admin redirect to dashboard (wrong role)**

```bash
# Check userRoles table in Convex dashboard data browser
# Ensure userId has role: "admin" in the userRoles table
npx convex dashboard  # → Data → userRoles → filter by userId
```

### Build Errors

**TypeScript type errors**

```bash
# Check for type issues
npx tsc --noEmit

# If Convex types are stale, restart Convex dev server
npx convex dev  # Types regenerate in convex/_generated/
```

**Convex function errors**

```bash
# Check Convex function logs
npx convex dashboard  # → Logs tab

# Run Convex dev to catch schema + function errors
npx convex dev
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

### Convex Issues

**Auth guard throwing unexpectedly**

```typescript
// Ensure ConvexAuthProvider is in the provider stack (src/App.tsx)
// Check the auth guard in convex/lib/auth.ts — verify role is set in userRoles table
```

**Outbox entries stuck as pending**

```bash
# Check tigerBeetleOutbox table in Convex dashboard
# Verify tb-outbox-worker cron is running (convex/crons.ts)
npx convex dashboard  # → Functions → Cron Jobs
```

---

## Quick Reference

### File Locations

| What                 | Where                                |
| -------------------- | ------------------------------------ |
| **Backend (ACTIVE)** | `convex/`                            |
| Components           | `src/components/`                    |
| Pages                | `src/pages/`                         |
| Hooks                | `src/hooks/`                         |
| Types                | `src/types/`                         |
| Constants            | `src/constants/`                     |
| E2E Tests            | `e2e/`                               |
| Documentation        | `docs/`                              |
| Legacy services      | `src/services/` ⚠️ (dead code)       |
| Legacy migrations    | `supabase/migrations/` ⚠️ (INACTIVE) |
| Legacy edge fns      | `supabase/functions/` ⚠️ (INACTIVE)  |

### Key Constants

```typescript
// src/constants/regulatory.ts
APR_LIMIT = 32; // 32% max APR (percentage value)
CURRENCY_CODE = 'NAD';
CURRENCY_SYMBOL = 'N$';
DATA_RETENTION_YEARS = 7;
```

### Useful Commands Summary

| Task                      | Command                |
| ------------------------- | ---------------------- |
| Start frontend dev server | `npm run dev`          |
| Start Convex dev server   | `npx convex dev`       |
| Run E2E tests             | `npm run test:e2e`     |
| Build for production      | `npm run build`        |
| Deploy Convex backend     | `npx convex deploy`    |
| Open Convex dashboard     | `npx convex dashboard` |
| Lint code                 | `npm run lint`         |
| TypeScript check          | `npx tsc --noEmit`     |

---

## See Also

- [INDEX.md](./INDEX.md) - Full documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [TESTING.md](./TESTING.md) - Detailed testing guide
- [AGENTS.md](./AGENTS.md) - AI agent guidelines
- [GLOSSARY.md](./GLOSSARY.md) - Terminology
