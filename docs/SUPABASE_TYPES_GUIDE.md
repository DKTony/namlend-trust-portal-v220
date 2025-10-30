# Supabase Types Generation Guide

**Status:** Types infrastructure in place  
**Last Updated:** October 31, 2025

---

## Overview

This project uses TypeScript types generated from the live Supabase schema to ensure type safety across web and mobile applications.

---

## Type Locations

### Web Application
- **File:** `src/integrations/supabase/types.ts`
- **Usage:** Imported by services, hooks, and components
- **Auto-generated:** Yes (via Supabase MCP or CLI)

### Mobile Application
- **File:** `namlend-mobile/src/types/supabase.d.ts`
- **Usage:** Imported by mobile services and screens
- **Auto-generated:** Yes (copy from web or regenerate)

---

## Generating Types

### Method 1: Using Supabase MCP (Recommended)

```typescript
// Via MCP tool (already integrated in this session)
mcp7_generate_typescript_types({ project_id: 'puahejtaskncpazjyxqp' })
```

### Method 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Generate types
supabase gen types typescript --project-id puahejtaskncpazjyxqp > src/integrations/supabase/types.ts

# For mobile (copy the same file)
cp src/integrations/supabase/types.ts namlend-mobile/src/types/supabase.d.ts
```

### Method 3: Manual Update

1. Navigate to Supabase Dashboard → API Docs → TypeScript
2. Copy the generated types
3. Paste into `src/integrations/supabase/types.ts`
4. Copy to mobile: `namlend-mobile/src/types/supabase.d.ts`

---

## When to Regenerate Types

Regenerate types whenever you:
- ✅ Add/remove database tables
- ✅ Add/remove columns from existing tables
- ✅ Change column types or constraints
- ✅ Add/modify database functions (RPCs)
- ✅ Add/modify database views
- ✅ Change enum types

---

## Type Usage Examples

### Web Services

```typescript
import { Database } from '@/integrations/supabase/types';

type Loan = Database['public']['Tables']['loans']['Row'];
type LoanInsert = Database['public']['Tables']['loans']['Insert'];
type LoanUpdate = Database['public']['Tables']['loans']['Update'];

// In service functions
export async function getLoan(loanId: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();
    
  return data;
}

export async function createLoan(loan: LoanInsert): Promise<Loan | null> {
  const { data, error } = await supabase
    .from('loans')
    .insert(loan)
    .select()
    .single();
    
  return data;
}
```

### Mobile Services

```typescript
import { Database } from '../types/supabase';

type Payment = Database['public']['Tables']['payments']['Row'];

export async function getPayments(loanId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('paid_at', { ascending: false });
    
  return data || [];
}
```

### RPC Function Types

```typescript
import { Database } from '@/integrations/supabase/types';

type CompleteDisbursementParams = Database['public']['Functions']['complete_disbursement']['Args'];
type CompleteDisbursementReturn = Database['public']['Functions']['complete_disbursement']['Returns'];

export async function completeDisbursement(
  params: CompleteDisbursementParams
): Promise<CompleteDisbursementReturn> {
  const { data, error } = await supabase.rpc('complete_disbursement', params);
  return data;
}
```

---

## Current Schema Coverage

### Tables (Complete Type Coverage)
- ✅ `approval_notifications`
- ✅ `approval_requests`
- ✅ `approval_workflow_history`
- ✅ `approval_workflow_rules`
- ✅ `audit_logs`
- ✅ `bank_transactions`
- ✅ `collections_activities`
- ✅ `disbursements`
- ✅ `documents`
- ✅ `error_logs`
- ✅ `kyc_documents`
- ✅ `late_fees`
- ✅ `loans`
- ✅ `notifications`
- ✅ `payment_reconciliations`
- ✅ `payments`
- ✅ `profiles`
- ✅ `repayment_schedules`
- ✅ `state_transitions`
- ✅ `user_roles`
- ✅ `workflow_instances`

### Views (Complete Type Coverage)
- ✅ `approval_requests_expanded`
- ✅ `client_portfolio`
- ✅ `financial_summary`
- ✅ `profiles_with_roles`

### Functions/RPCs (Complete Type Coverage)
- ✅ `assign_user_role`
- ✅ `check_loan_eligibility`
- ✅ `check_loan_eligibility_admin`
- ✅ `complete_disbursement`
- ✅ `get_admin_dashboard_summary`
- ✅ `get_dashboard_summary`
- ✅ `get_overdue_loans`
- ✅ `get_payment_schedule`
- ✅ `get_profiles_with_roles_admin`
- ✅ `process_approval_transaction`
- ✅ `submit_approval_request`
- And 20+ more...

### Enums
- ✅ `app_role`: `'client' | 'loan_officer' | 'admin'`

---

## Type Safety Best Practices

### 1. Use Generated Types, Not Manual Interfaces

❌ **Don't:**
```typescript
interface Loan {
  id: string;
  amount: number;
  // ... manually defined fields
}
```

✅ **Do:**
```typescript
import { Database } from '@/integrations/supabase/types';
type Loan = Database['public']['Tables']['loans']['Row'];
```

### 2. Use Insert/Update Types for Mutations

❌ **Don't:**
```typescript
const newLoan = {
  id: uuid(), // Don't include auto-generated fields
  amount: 5000,
  // ...
};
```

✅ **Do:**
```typescript
type LoanInsert = Database['public']['Tables']['loans']['Insert'];

const newLoan: LoanInsert = {
  amount: 5000,
  user_id: userId,
  // id is optional (auto-generated)
};
```

### 3. Type RPC Calls Properly

❌ **Don't:**
```typescript
const result = await supabase.rpc('complete_disbursement', {
  p_disbursement_id: id,
  // Missing type safety
});
```

✅ **Do:**
```typescript
type CompleteDisbursementArgs = Database['public']['Functions']['complete_disbursement']['Args'];

const params: CompleteDisbursementArgs = {
  p_disbursement_id: id,
  p_payment_method: 'bank_transfer',
  p_payment_reference: ref,
  p_notes: notes || null,
};

const { data, error } = await supabase.rpc('complete_disbursement', params);
```

---

## CI/CD Integration

### Automated Type Checking

The CI workflow checks for type drift:

```yaml
# .github/workflows/ci-web.yml
- name: TypeScript Type Check
  run: npm run typecheck
```

### Pre-commit Hook (Optional)

```bash
# .husky/pre-commit
npm run typecheck || {
  echo "❌ Type check failed. Regenerate types if schema changed."
  exit 1
}
```

---

## Troubleshooting

### Issue: Types Out of Sync

**Symptoms:**
- TypeScript errors after schema changes
- Missing properties in type definitions
- RPC function signatures don't match

**Solution:**
```bash
# Regenerate types
supabase gen types typescript --project-id puahejtaskncpazjyxqp > src/integrations/supabase/types.ts

# Or use MCP tool
mcp7_generate_typescript_types({ project_id: 'puahejtaskncpazjyxqp' })
```

### Issue: Mobile Types Not Updated

**Symptoms:**
- Mobile app has type errors
- Web works but mobile doesn't

**Solution:**
```bash
# Copy web types to mobile
cp src/integrations/supabase/types.ts namlend-mobile/src/types/supabase.d.ts
```

### Issue: RPC Types Missing

**Symptoms:**
- New RPC functions not in types
- Function signatures incorrect

**Solution:**
1. Ensure RPC is deployed to Supabase
2. Regenerate types (includes all functions)
3. Restart TypeScript server in IDE

---

## Maintenance Schedule

- **After every migration:** Regenerate types
- **Weekly:** Verify types match live schema
- **Before deployment:** Run type check in CI
- **After schema changes:** Update both web and mobile types

---

## Related Documentation

- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/generating-types)
- [Database Schema](./technical-specs/database-schema.md)
- [API Documentation](./API.md)
- [Migration Guide](./deployment-guide.md)

---

**Last Schema Sync:** October 31, 2025  
**Project ID:** `puahejtaskncpazjyxqp`  
**PostgreSQL Version:** 15.x  
**PostgREST Version:** 13.0.4
