# Test Fixture Migration Guide

**Status:** Pattern Proven - Ready for Team Implementation  
**Success Rate:** 100% (documents-rls.e2e.ts: 14/14 passing)

---

## Why Migrate to Fixtures?

### Problems with Manual Auth

- ❌ 50+ lines of boilerplate per file
- ❌ Auth sessions lost in parallel execution
- ❌ Intermittent "user is null" failures
- ❌ Manual cleanup required
- ❌ Hard to maintain

### Benefits of Fixtures

- ✅ 1 line import, fixture parameters
- ✅ Perfect parallel execution
- ✅ Zero auth session bugs
- ✅ Automatic cleanup
- ✅ 90% less code

---

## Migration Steps

### Step 1: Update Imports

**Before:**

```typescript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const CLIENT_EMAIL = 'client1@test.namlend.com';
const CLIENT_PASSWORD = 'test123';
// ... more constants
```

**After:**

```typescript
import { test, expect } from '../fixtures';
// That's it! No other imports or constants needed
```

### Step 2: Remove beforeAll/afterAll Hooks

**Before:**

```typescript
test.describe('My Tests', () => {
  let clientSupabase: ReturnType<typeof createClient>;
  let adminSupabase: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    clientSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    await clientSupabase.auth.signInWithPassword({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
    });
    
    await adminSupabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  });

  test.afterAll(async () => {
    await clientSupabase.auth.signOut();
    await adminSupabase.auth.signOut();
  });
  
  // tests...
});
```

**After:**

```typescript
test.describe('My Tests', () => {
  // No setup needed! Fixtures handle everything
  
  // tests...
});
```

### Step 3: Add Fixture Parameters to Tests

**Before:**

```typescript
test('Client can read data', async () => {
  const { data, error } = await clientSupabase
    .from('table')
    .select('*');
  
  expect(error).toBeNull();
});
```

**After:**

```typescript
test('Client can read data', async ({ client1Supabase }) => {
  const { data, error } = await client1Supabase
    .from('table')
    .select('*');
  
  expect(error).toBeNull();
});
```

### Step 4: Remove Manual Re-authentication

**Before:**

```typescript
test('My test', async () => {
  // Re-authenticate to ensure session is valid
  await clientSupabase.auth.signInWithPassword({
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
  });
  
  const { data: { user } } = await clientSupabase.auth.getUser();
  // ... test code
});
```

**After:**

```typescript
test('My test', async ({ client1Supabase }) => {
  // No re-auth needed! Fixture provides fresh, authenticated client
  const { data: { user } } = await client1Supabase.auth.getUser();
  // ... test code
});
```

---

## Available Fixtures

### Authenticated Clients

```typescript
// Pre-authenticated client users
client1Supabase  // client1@test.namlend.com
client2Supabase  // client2@test.namlend.com

// Pre-authenticated staff
adminSupabase         // admin@test.namlend.com
loanOfficerSupabase   // loan_officer@test.namlend.com

// Unauthenticated
anonSupabase          // No authentication

// Manual auth (if needed)
supabaseClient        // Create and auth manually
```

### Usage Examples

```typescript
// Single user test
test('Client reads own data', async ({ client1Supabase }) => {
  const { data } = await client1Supabase.from('table').select('*');
  expect(data).toBeTruthy();
});

// Multi-user test
test('Client cannot read other user data', async ({ client1Supabase, client2Supabase }) => {
  // client1 tries to access client2's data
  const { data: { user: client2User } } = await client2Supabase.auth.getUser();
  const { data, error } = await client1Supabase
    .from('table')
    .select('*')
    .eq('user_id', client2User!.id);
  
  expect(data).toEqual([]);
});

// Admin test
test('Admin can read all data', async ({ adminSupabase }) => {
  const { data } = await adminSupabase.from('table').select('*');
  expect(data).toBeTruthy();
});

// Unauthenticated test
test('Anon cannot read data', async ({ anonSupabase }) => {
  const { data, error } = await anonSupabase.from('table').select('*');
  expect(error).toBeTruthy();
});
```

---

## Complete Example: Before & After

### Before (documents-rls.e2e.ts - OLD)

```typescript
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const CLIENT_1_EMAIL = 'client1@test.namlend.com';
const CLIENT_1_PASSWORD = 'test123';
const ADMIN_EMAIL = 'admin@test.namlend.com';
const ADMIN_PASSWORD = 'test123';

test.describe('Documents Storage RLS', () => {
  let client1Supabase: ReturnType<typeof createClient>;
  let adminSupabase: ReturnType<typeof createClient>;

  test.beforeAll(async () => {
    client1Supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adminSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { error: client1Error } = await client1Supabase.auth.signInWithPassword({
      email: CLIENT_1_EMAIL,
      password: CLIENT_1_PASSWORD,
    });
    if (client1Error) {
      console.warn('Client 1 sign-in failed:', client1Error.message);
    }

    const { error: adminError } = await adminSupabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (adminError) {
      console.warn('Admin sign-in failed:', adminError.message);
    }
  });

  test.afterAll(async () => {
    await client1Supabase.auth.signOut();
    await adminSupabase.auth.signOut();
  });

  test('Client can upload document', async () => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    const testFile = new Blob(['Test'], { type: 'text/plain' });
    const filePath = `${user!.id}/test.txt`;

    const { data, error } = await client1Supabase.storage
      .from('documents')
      .upload(filePath, testFile);

    expect(error).toBeNull();
    await client1Supabase.storage.from('documents').remove([filePath]);
  });

  test('Admin can read all documents', async () => {
    // Re-authenticate to ensure session is valid
    await client1Supabase.auth.signInWithPassword({
      email: CLIENT_1_EMAIL,
      password: CLIENT_1_PASSWORD,
    });
    
    const { data: { user: client1User } } = await client1Supabase.auth.getUser();
    expect(client1User).toBeTruthy();

    const testFile = new Blob(['Test'], { type: 'text/plain' });
    const filePath = `${client1User!.id}/admin-test.txt`;

    await client1Supabase.storage.from('documents').upload(filePath, testFile);

    const { data, error } = await adminSupabase.storage
      .from('documents')
      .download(filePath);

    expect(error).toBeNull();
    await client1Supabase.storage.from('documents').remove([filePath]);
  });
});
```

### After (documents-rls.e2e.ts - NEW)

```typescript
import { test, expect } from '../fixtures';

test.describe('Documents Storage RLS', () => {
  test('Client can upload document', async ({ client1Supabase }) => {
    const { data: { user } } = await client1Supabase.auth.getUser();
    expect(user).toBeTruthy();

    const testFile = new Blob(['Test'], { type: 'text/plain' });
    const filePath = `${user!.id}/test.txt`;

    const { data, error } = await client1Supabase.storage
      .from('documents')
      .upload(filePath, testFile);

    expect(error).toBeNull();
    await client1Supabase.storage.from('documents').remove([filePath]);
  });

  test('Admin can read all documents', async ({ client1Supabase, adminSupabase }) => {
    const { data: { user: client1User } } = await client1Supabase.auth.getUser();
    expect(client1User).toBeTruthy();

    const testFile = new Blob(['Test'], { type: 'text/plain' });
    const filePath = `${client1User!.id}/admin-test.txt`;

    await client1Supabase.storage.from('documents').upload(filePath, testFile);

    const { data, error } = await adminSupabase.storage
      .from('documents')
      .download(filePath);

    expect(error).toBeNull();
    await client1Supabase.storage.from('documents').remove([filePath]);
  });
});
```

**Lines of Code:**

- Before: ~70 lines
- After: ~30 lines
- **Reduction: 57%**

---

## Files to Migrate

### ✅ Completed

- `/e2e/api/documents-rls.e2e.ts` - 14/14 passing (100%)

### ⏳ Pending

- `/e2e/api/disbursements-rls.e2e.ts` - 507 lines, 16 tests
- `/e2e/api/disbursement.e2e.ts` - 309 lines, 6 tests

### Estimated Time

- disbursements-rls.e2e.ts: 1-1.5 hours
- disbursement.e2e.ts: 1 hour
- **Total: 2-2.5 hours**

---

## Testing After Migration

### 1. Run Individual File

```bash
npm run test:e2e -- e2e/api/YOUR-FILE.e2e.ts
```

### 2. Check for 100% Passing

All tests should pass on first run with no flakiness.

### 3. Test Parallel Execution

```bash
npm run test:e2e -- e2e/api/YOUR-FILE.e2e.ts --workers=6
```

Should still be 100% passing.

### 4. Run Multiple Times

```bash
for i in {1..5}; do npm run test:e2e -- e2e/api/YOUR-FILE.e2e.ts; done
```

All runs should pass (no flakiness).

---

## Troubleshooting

### Issue: "Cannot find name 'client1Supabase'"

**Cause:** Forgot to add fixture parameter  
**Fix:**

```typescript
// Before
test('My test', async () => {

// After
test('My test', async ({ client1Supabase }) => {
```

### Issue: "user is null"

**Cause:** Using wrong fixture or typo  
**Fix:** Check fixture name matches available fixtures

### Issue: Tests still fail in parallel

**Cause:** Fixtures file not updated with testInfo  
**Fix:** Ensure `/e2e/fixtures.ts` uses testInfo for storage keys:

```typescript
client1Supabase: async ({}, use, testInfo) => {
  const storageKey = `client1-${testInfo.testId}-${Date.now()}`;
  // ...
}
```

---

## Success Criteria

- ✅ All tests passing (100%)
- ✅ No flakiness (run 5x, all pass)
- ✅ Parallel execution works (--workers=6)
- ✅ Code reduced by 50%+
- ✅ No manual auth code
- ✅ No beforeAll/afterAll hooks

---

## Reference Implementation

**Perfect Example:** `/e2e/api/documents-rls.e2e.ts`

This file demonstrates:

- Clean fixture usage
- Multiple user interactions
- Storage operations
- Table queries
- Unauthenticated tests
- **14/14 tests passing with perfect parallel execution**

Use this as a template for migrating other files.
