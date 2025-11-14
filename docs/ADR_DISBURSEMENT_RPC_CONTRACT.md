# ADR: Disbursement RPC Contract

**Status:** Accepted  
**Date:** 2025-11-14  
**Decision Makers:** Engineering Team  
**Tags:** `architecture`, `database`, `rpc`, `disbursement`

---

## Context

The NamLend loan management platform requires a secure, auditable disbursement workflow that allows authorized staff (admins and loan officers) to process loan disbursements while maintaining strict authorization controls and comprehensive audit trails. The disbursement process must:

1. Enforce role-based access control
2. Validate payment methods and references
3. Update loan status atomically
4. Create audit logs for compliance
5. Prevent duplicate disbursements
6. Support multiple payment methods (bank transfer, mobile money, cash, debit order)

---

## Decision

We will implement a set of PostgreSQL stored procedures (RPCs) that encapsulate the disbursement workflow, leveraging `SECURITY DEFINER` for privilege escalation while maintaining application-level authorization checks.

### RPC Functions

#### 1. `create_disbursement_on_approval`

**Purpose:** Create a pending disbursement record when a loan is approved.

**Signature:**

```sql
CREATE FUNCTION public.create_disbursement_on_approval(
  p_loan_id uuid
) RETURNS json;
```

**Authorization:** Admin or Loan Officer only

**Returns:**

```json
{
  "success": true,
  "disbursement_id": "uuid",
  "loan_id": "uuid",
  "status": "pending",
  "amount": 50000.00
}
```

**Error Cases:**

- Unauthorized user (not admin/loan_officer)
- Loan not found
- Loan not in eligible status (`approved` or `pending`)
- Disbursement already exists for loan

#### 2. `approve_disbursement`

**Purpose:** Move a disbursement from `pending` to `approved` status.

**Signature:**

```sql
CREATE FUNCTION public.approve_disbursement(
  p_disbursement_id uuid,
  p_notes text DEFAULT NULL
) RETURNS json;
```

**Authorization:** Admin or Loan Officer only

**Returns:**

```json
{
  "success": true,
  "disbursement_id": "uuid",
  "status": "approved"
}
```

#### 3. `mark_disbursement_processing`

**Purpose:** Mark a disbursement as actively being processed.

**Signature:**

```sql
CREATE FUNCTION public.mark_disbursement_processing(
  p_disbursement_id uuid,
  p_notes text DEFAULT NULL
) RETURNS json;
```

**Authorization:** Admin or Loan Officer only

**Returns:**

```json
{
  "success": true,
  "disbursement_id": "uuid",
  "status": "processing"
}
```

#### 4. `complete_disbursement`

**Purpose:** Complete a disbursement with payment details, update loan status, and create audit trail.

**Signature:**

```sql
CREATE FUNCTION public.complete_disbursement(
  p_disbursement_id uuid,
  p_payment_method text,
  p_payment_reference text,
  p_notes text DEFAULT NULL
) RETURNS json;
```

**Authorization:** Admin or Loan Officer only

**Payment Methods:** `bank_transfer`, `mobile_money`, `cash`, `debit_order`

**Returns:**

```json
{
  "success": true,
  "disbursement_id": "uuid",
  "loan_id": "uuid",
  "amount": 50000.00,
  "status": "completed",
  "payment_method": "bank_transfer",
  "payment_reference": "BANK-REF-12345",
  "message": "Disbursement completed successfully"
}
```

**Side Effects:**

- Updates `disbursements` table: `status='completed'`, `method`, `payment_reference`, `processed_at=NOW()`
- Updates `loans` table: `status='disbursed'`, `disbursed_at=NOW()`
- Inserts audit log entry in `audit_logs` table

**Error Cases:**

- Unauthorized user
- Invalid payment method
- Disbursement not found or already completed
- Associated loan not found

---

## Consequences

### Positive

1. **Security:** Authorization logic centralized in database functions, not scattered across client code
2. **Atomicity:** All state changes (disbursement, loan, audit) happen in a single transaction
3. **Auditability:** Every disbursement action creates an audit trail automatically
4. **Consistency:** Payment method validation enforced at database level
5. **Testability:** RPCs can be tested independently via E2E tests
6. **Performance:** Single round-trip for complex operations

### Negative

1. **Complexity:** Business logic in database functions harder to debug than application code
2. **Versioning:** Schema migrations required for RPC changes
3. **Testing:** Requires database access for integration tests
4. **Observability:** Errors surface as JSON responses, not exceptions

### Mitigations

- Comprehensive E2E test coverage (6 tests covering all scenarios)
- Detailed error messages in JSON responses
- Audit logs for all operations
- Documentation of RPC contracts (this ADR)

---

## Implementation Details

### Authorization Pattern

All RPCs follow this pattern:

```sql
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: No active session');
  END IF;
  
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = v_user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'loan_officer' THEN 2 ELSE 3 END
  LIMIT 1;
  
  IF v_user_role NOT IN ('admin', 'loan_officer') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: ...');
  END IF;
  
  -- Business logic here
END;
```

### Audit Trail Pattern

All state-changing RPCs create audit logs:

```sql
INSERT INTO audit_logs (
  user_id,
  action,
  table_name,
  record_id,
  new_values
) VALUES (
  v_user_id,
  'complete_disbursement',
  'disbursements',
  p_disbursement_id,
  jsonb_build_object(
    'disbursement_id', p_disbursement_id,
    'loan_id', v_disbursement.loan_id,
    'amount', v_disbursement.amount,
    'payment_method', p_payment_method,
    'payment_reference', p_payment_reference,
    'client_id', v_loan.user_id
  )
);
```

### Error Handling Pattern

All RPCs return JSON with consistent structure:

**Success:**

```json
{
  "success": true,
  "disbursement_id": "uuid",
  ...
}
```

**Failure:**

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Alternatives Considered

### 1. Application-Level Logic

**Pros:** Easier to debug, test, and version  
**Cons:** Multiple round-trips, no atomicity guarantees, authorization scattered

**Decision:** Rejected due to lack of atomicity and security concerns

### 2. Database Triggers

**Pros:** Automatic execution, no explicit calls  
**Cons:** Hidden logic, harder to test, limited error handling

**Decision:** Rejected due to lack of explicit control flow

### 3. Supabase Edge Functions

**Pros:** TypeScript, easier to debug  
**Cons:** Additional infrastructure, latency, no atomicity with DB operations

**Decision:** Rejected due to complexity and latency

---

## References

- [Supabase RPC Documentation](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- E2E Test Suite: `/e2e/api/disbursement.e2e.ts`
- Phase 2 Completion Report: `/docs/E2E_PHASE_2_COMPLETION.md`

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-14 | Engineering Team | Initial ADR creation |
