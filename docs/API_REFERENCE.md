# NamLend Trust - API Reference

**Version**: 2.0.0  
**Last Updated**: December 2025

---

## Overview

NamLend Trust uses Supabase as its backend, providing:

- **REST API** (PostgREST) - Auto-generated from schema
- **Database RPCs** - Custom business logic functions
- **Real-time** - WebSocket subscriptions (planned)
- **Storage API** - Document management

All API calls require authentication via JWT token from Supabase Auth.

---

## Authentication

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    emailRedirectTo: `${window.location.origin}/dashboard`,
    data: { full_name: 'John Doe' }
  }
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});
// Returns: { user, session }
```

### Sign Out

```typescript
await supabase.auth.signOut({ scope: 'global' });
// Invalidates all sessions
```

### Get Current Session

```typescript
const { data: { session } } = await supabase.auth.getSession();
const { data: { user } } = await supabase.auth.getUser();
```

---

## Loan Operations

### Get User's Loans

```typescript
const { data: loans, error } = await supabase
  .from('loans')
  .select('*')
  .order('created_at', { ascending: false });
```

### Get Loan by ID

```typescript
const { data: loan, error } = await supabase
  .from('loans')
  .select(`
    *,
    disbursements(*),
    payments(*)
  `)
  .eq('id', loanId)
  .single();
```

### Create Loan Application (via Approval Workflow)

```typescript
// Submit through approval workflow
const { data, error } = await supabase
  .from('approval_requests')
  .insert({
    user_id: userId,
    request_type: 'loan_application',
    request_data: {
      amount: 10000,
      term_months: 12,
      interest_rate: 28,
      purpose: 'Business expansion'
    },
    status: 'pending',
    priority: 'normal'
  })
  .select()
  .single();
```

---

## Disbursement RPCs

### Create Disbursement on Approval

```typescript
const { data, error } = await supabase.rpc('create_disbursement_on_approval', {
  p_loan_id: 'uuid-here'
});

// Response:
{
  success: true,
  disbursement_id: 'uuid',
  loan_id: 'uuid',
  amount: 10000,
  status: 'pending',
  message: 'Disbursement created successfully'
}
```

### Approve Disbursement

```typescript
const { data, error } = await supabase.rpc('approve_disbursement', {
  p_disbursement_id: 'uuid-here',
  p_notes: 'Approved for processing'
});

// Response:
{
  success: true,
  disbursement_id: 'uuid',
  status: 'approved',
  message: 'Disbursement approved'
}
```

### Mark Disbursement Processing

```typescript
const { data, error } = await supabase.rpc('mark_disbursement_processing', {
  p_disbursement_id: 'uuid-here',
  p_notes: 'Processing with bank'
});

// Response:
{
  success: true,
  disbursement_id: 'uuid',
  status: 'processing'
}
```

### Complete Disbursement

```typescript
const { data, error } = await supabase.rpc('complete_disbursement', {
  p_disbursement_id: 'uuid-here',
  p_payment_method: 'bank_transfer', // bank_transfer | mobile_money | cash | debit_order
  p_payment_reference: 'REF-2025-001234',
  p_notes: 'Transferred to client bank account'
});

// Response:
{
  success: true,
  disbursement_id: 'uuid',
  loan_id: 'uuid',
  amount: 10000,
  status: 'completed',
  payment_reference: 'REF-2025-001234',
  message: 'Disbursement completed'
}
```

### Fail Disbursement

```typescript
const { data, error } = await supabase.rpc('fail_disbursement', {
  p_disbursement_id: 'uuid-here',
  p_reason: 'Bank transfer failed - invalid account'
});

// Response:
{
  success: true,
  disbursement_id: 'uuid',
  status: 'failed',
  message: 'Disbursement marked as failed'
}
```

### Get Pending Disbursements

```typescript
const { data, error } = await supabase.rpc('get_pending_disbursements');

// Response: Array of disbursements with client names
[
  {
    id: 'uuid',
    loan_id: 'uuid',
    client_name: 'John Doe',
    amount: 10000,
    status: 'pending',
    method: 'bank_transfer',
    reference: 'DISB-2025-001',
    scheduled_at: '2025-12-01T00:00:00Z',
    created_at: '2025-11-30T10:00:00Z'
  }
]
```

---

## Payment RPCs

### Generate Payment Schedule

```typescript
const { data, error } = await supabase.rpc('generate_payment_schedule', {
  p_loan_id: 'uuid-here'
});

// Response:
{
  success: true,
  loan_id: 'uuid',
  installments_created: 12
}
```

### Get Payment Schedule

```typescript
const { data, error } = await supabase.rpc('get_payment_schedule', {
  p_loan_id: 'uuid-here'
});

// Response: Array of payment schedule entries
[
  {
    id: 'uuid',
    loan_id: 'uuid',
    installment_number: 1,
    due_date: '2025-01-01',
    principal_amount: 800,
    interest_amount: 200,
    fee_amount: 0,
    late_fee_applied: 0,
    total_amount: 1000,
    amount_paid: 0,
    balance: 1000,
    status: 'pending',
    days_overdue: 0
  }
]
```

### Apply Payment to Schedule

```typescript
const { data, error } = await supabase.rpc('apply_payment_to_schedule', {
  p_payment_id: 'uuid-here',
  p_amount: 1000
});

// Response:
{
  success: true,
  payment_id: 'uuid',
  amount_applied: 1000,
  schedules_updated: 1,
  remaining_amount: 0
}
```

### Mark Overdue Payments

```typescript
const { data, error } = await supabase.rpc('mark_overdue_payments');

// Response:
{
  success: true,
  schedules_marked: 5,
  processed_at: '2025-12-01T00:00:00Z'
}
```

### Calculate Late Fee

```typescript
const { data, error } = await supabase.rpc('calculate_late_fee', {
  p_schedule_id: 'uuid-here'
});

// Response:
{
  success: true,
  late_fee: 50,
  days_overdue: 15,
  outstanding_balance: 1000,
  calculation_method: 'percentage',
  max_fee_cap: 100
}
```

---

## Approval Workflow Operations

### Submit Approval Request

```typescript
const { data, error } = await supabase
  .from('approval_requests')
  .insert({
    user_id: userId,
    request_type: 'loan_application',
    request_data: { /* loan data */ },
    priority: 'normal'
  })
  .select()
  .single();
```

### Get All Approval Requests (Admin)

```typescript
const { data, error } = await supabase
  .from('approval_requests_expanded')
  .select('*')
  .order('created_at', { ascending: false });

// Includes user_first_name, user_last_name, etc.
```

### Update Approval Status

```typescript
const { error } = await supabase
  .from('approval_requests')
  .update({
    status: 'approved',
    reviewer_id: adminUserId,
    reviewed_at: new Date().toISOString(),
    review_notes: 'Application meets all criteria'
  })
  .eq('id', requestId);
```

### Process Approved Loan (Atomic)

```typescript
const { data, error } = await supabase.rpc('process_approval_transaction', {
  request_id: 'uuid-here'
});

// Response:
{
  success: true,
  loan_id: 'uuid',
  error: null
}
```

---

## Audit Operations

### Log View Access

```typescript
const { data, error } = await supabase.rpc('log_view_access', {
  p_entity_type: 'loan',
  p_entity_id: 'uuid-here',
  p_fields_viewed: ['amount', 'status', 'user_id'],
  p_view_duration_ms: 5000
});
```

### Log State Transition

```typescript
const { data, error } = await supabase.rpc('log_state_transition', {
  p_entity_type: 'loan',
  p_entity_id: 'uuid-here',
  p_from_state: 'pending',
  p_to_state: 'approved',
  p_reason: 'Manual approval by admin'
});
```

### Generate Compliance Report

```typescript
const { data, error } = await supabase.rpc('generate_compliance_report', {
  p_report_type: 'monthly_approvals',
  p_period_start: '2025-11-01T00:00:00Z',
  p_period_end: '2025-11-30T23:59:59Z'
});
```

### Get Audit Logs

```typescript
const { data, error } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('entity_type', 'loan')
  .eq('entity_id', loanId)
  .order('timestamp', { ascending: false });
```

---

## User Management

### Get User Role

```typescript
const { data, error } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

// Response: [{ role: 'admin' }]
```

### Assign User Role (Admin Only)

```typescript
const { data, error } = await supabase.rpc('assign_user_role', {
  p_user_id: 'uuid-here',
  p_role: 'loan_officer'
});
```

### Check Role

```typescript
const { data, error } = await supabase.rpc('has_role', {
  _user_id: userId,
  _role: 'admin'
});

// Response: true | false
```

---

## Profile Operations

### Get User Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Update Profile

```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '+264811234567',
    monthly_income: 25000
  })
  .eq('user_id', userId);
```

---

## Document Upload

### Upload KYC Document

```typescript
// 1. Upload file to storage
const { data: fileData, error: uploadError } = await supabase.storage
  .from('documents')
  .upload(`kyc/${userId}/${filename}`, file);

// 2. Create document record
const { data, error } = await supabase
  .from('kyc_documents')
  .insert({
    user_id: userId,
    document_type: 'id_card',
    file_path: fileData.path,
    status: 'pending'
  })
  .select()
  .single();
```

### Get User Documents

```typescript
const { data, error } = await supabase
  .from('kyc_documents')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

---

## Error Handling

### Standard Error Response

```typescript
interface SupabaseError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;  // PostgreSQL error code
}

// Common error codes:
// 23505 - Unique constraint violation
// 23503 - Foreign key violation
// 42501 - Insufficient privilege (RLS)
// PGRST301 - No rows found
```

### Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase.rpc('some_function', params);
  
  if (error) {
    console.error('Database error:', error.message);
    return { success: false, error: error.message };
  }
  
  return { success: true, data };
} catch (err) {
  console.error('Unexpected error:', err);
  return { success: false, error: 'An unexpected error occurred' };
}
```

---

## Rate Limits

| Tier | Requests/Second | Concurrent Connections |
|------|-----------------|------------------------|
| Free | 100 | 60 |
| Pro | 1000 | 200 |
| Enterprise | Custom | Custom |

---

## Best Practices

1. **Always handle errors** - Never ignore the error return value
2. **Use transactions** - For multi-step operations, use RPCs
3. **Validate inputs** - Validate on frontend AND backend
4. **Use proper types** - Leverage TypeScript for type safety
5. **Implement retry logic** - For network failures
6. **Log audit events** - Track all sensitive operations
7. **Use RLS** - Never bypass row-level security

---

*Document Version: 2.0.0*  
*Last Updated: December 2025*
