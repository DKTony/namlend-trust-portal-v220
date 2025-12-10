# NamLend Technical Audit Report (v2.2)

Date: 2025-09-25
Scope: Technical verification of frontend/back-office mapping to database schema, RPCs, views, storage, and workflows, with risks and remediation plan.

## Executive Summary

- Verified core architecture aligns with the current React + TypeScript + Supabase stack.
- RLS is enabled on all core tables and approval workflow tables and leverages `auth.uid()` and `public.has_role()`.
- Front-office flows (Dashboard, Loan Application, Payment, KYC) are mapped correctly to tables and approval workflow.
- Back-office workflows are present with `approval_requests`, history, notifications, and rules, but a few missing backend artifacts reduce admin UX and atomicity.
- Compliance: APR limit is enforced in UI (`src/constants/regulatory.ts`: `APR_LIMIT = 32`) consistent with the 32% cap for the Namibian market.

## Verified Components & Integration Points

- Supabase client: `src/integrations/supabase/client.ts` with dev mock fallback when env keys are missing.
- Admin client: `src/integrations/supabase/adminClient.ts` guarded by `VITE_ALLOW_LOCAL_ADMIN === 'true'` and not bundled by default.
- Views present via migrations: `financial_summary`, `client_portfolio` (`20250801174356_d9748751-f043-4ada-8578-b379ed9b8fa1.sql`).
- RPCs present: `get_dashboard_summary()`, `get_admin_dashboard_summary()` (`sql/optimize_dashboard_performance.sql`), `submit_approval_request(...)`, `evaluate_approval_rules(...)` (`20250906_create_approval_workflow_system.sql`).
- Eligibility: `check_loan_eligibility()` (no-arg, table return) and `check_loan_eligibility(user_uuid UUID)` (boolean) both exist; calls must be explicit.
- Front-office mapping validated for `Dashboard.tsx`, `LoanApplication.tsx`, `Payment.tsx`, `KYC.tsx`.
- Admin Overview UI present (`FinancialSummaryCards.tsx`) but not yet wired to data fetch.

## Key Findings (Misalignments & Risks)

- **Missing admin view `approval_requests_expanded`**
  - Referenced in `src/services/approvalWorkflow.ts` but not defined in migrations.
  - Risk: Reduced admin UX due to lack of joined user/reviewer/assignee info and potential N+1 queries.

- **Missing RPC `process_approval_transaction`**
  - `processApprovedLoanApplication()` calls `supabase.rpc('process_approval_transaction', ...)`, but the RPC is not defined.
  - Risk: Approved applications aren’t processed atomically; data consistency relies on client-side sequences.

- **Admin Overview not wired**
  - `src/pages/AdminDashboard.tsx` renders `FinancialSummaryCards` but never fetches metrics from `financial_summary` or `get_admin_dashboard_summary()`.
  - Risk: Empty/placeholder metrics degrade admin visibility.

- **KYC submit signature mismatch**
  - `src/pages/KYC.tsx` calls `submitApprovalRequest('kyc_document', ...)` while the service expects an object `{ user_id, request_type, request_data, priority? }`.
  - Risk: Insert may fail RLS or parameter mapping, causing user-facing errors.

- **Tests drift from service API**
  - `src/tests/approvalWorkflow.test.ts` imports legacy function names/signatures that differ from `src/services/approvalWorkflow.ts`.
  - Risk: Flaky/obsolete tests and unclear guarantees.

- **Payment method encoding**
  - `payments.payment_method` stores combined channel metadata (e.g., `card_****1234`).
  - Risk: Hard to query/aggregate by method; consider structured JSONB while retaining existing field for compatibility.

- **Broad role visibility (temporary)**
  - `20250803_fix_user_roles_rls.sql` allows `auth.role() = 'authenticated'` to select `user_roles` to break circular dependency.
  - Risk: Wider-than-ideal visibility; mitigate with constrained admin view/RPC for production.

## Remediation Plan (Incremental)

- **R1. Create `approval_requests_expanded` view**
  - Create a view joining approval requests with profiles (user, reviewer, assigned_to) to support admin UI without N+1.
  - Ensure joins are RLS-safe and do not expose sensitive auth schema.

```sql
-- View: public.approval_requests_expanded
CREATE OR REPLACE VIEW public.approval_requests_expanded AS
SELECT
  ar.*,
  up.first_name     AS user_first_name,
  up.last_name      AS user_last_name,
  up.phone_number   AS user_phone_number,
  rp.first_name     AS reviewer_first_name,
  rp.last_name      AS reviewer_last_name,
  ap.first_name     AS assignee_first_name,
  ap.last_name      AS assignee_last_name
FROM public.approval_requests ar
LEFT JOIN public.profiles up ON up.user_id = ar.user_id
LEFT JOIN public.profiles rp ON rp.user_id = ar.reviewer_id
LEFT JOIN public.profiles ap ON ap.user_id = ar.assigned_to;
```

- **R2. Add `process_approval_transaction(request_id UUID)` RPC**
  - Atomic server-side processing for approved loan applications.
  - SECURITY DEFINER with strict checks; verify request status/type and caller permissions.

```sql
CREATE OR REPLACE FUNCTION public.process_approval_transaction(request_id UUID)
RETURNS JSON AS $$
DECLARE
  req    RECORD;
  loanId UUID;
BEGIN
  SELECT * INTO req
  FROM public.approval_requests
  WHERE id = request_id AND status = 'approved' AND request_type = 'loan_application';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or not approved');
  END IF;

  -- Extract from request_data JSONB (ensure keys align with UI payload)
  INSERT INTO public.loans (
    user_id, amount, term_months, interest_rate, monthly_payment, total_repayment, purpose, status
  )
  VALUES (
    req.user_id,
    (req.request_data->>'amount')::numeric,
    COALESCE((req.request_data->>'term_months')::int, (req.request_data->>'term')::int),
    COALESCE((req.request_data->>'interest_rate')::numeric, 32),
    COALESCE((req.request_data->>'monthly_payment')::numeric, 0),
    COALESCE((req.request_data->>'total_repayment')::numeric, 0),
    req.request_data->>'purpose',
    'approved'
  ) RETURNING id INTO loanId;

  UPDATE public.approval_requests
    SET reviewed_at = NOW(), review_notes = COALESCE(review_notes, 'Processed via transaction')
    WHERE id = request_id;

  RETURN json_build_object('success', true, 'loan_id', loanId);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- **R3. Wire Admin Overview metrics**
  - In `src/pages/AdminDashboard.tsx`, fetch via `supabase.rpc('get_admin_dashboard_summary')` and pass into `FinancialSummaryCards`.
  - Keep fallback to zeros on error.

- **R4. Fix KYC submission call**
  - Update `src/pages/KYC.tsx` to call the service with an object:

```ts
await submitApprovalRequest({
  user_id: user.id,
  request_type: 'kyc_document',
  request_data: kycDocumentData,
  priority: 'normal'
});
```

- Alternatively, call SQL RPC `submit_approval_request` with named args: `p_request_type`, `p_request_data`, etc.

- **R5. Align tests with service API**
  - Update `src/tests/approvalWorkflow.test.ts` to use the exported functions from `src/services/approvalWorkflow.ts` (e.g., `getUserApprovalRequests`, `updateApprovalStatus`, `processApprovedLoanApplication`, `getApprovalNotifications`, `markNotificationAsRead`, `getApprovalStatistics`).

- **R6. Payment metadata normalization (optional)**
  - Add `payments.channel_metadata JSONB` for method-specific details and keep `payment_method` for compatibility.

- **R7. Role visibility tightening (post-MVP)**
  - Replace broad `Authenticated users can view all roles` with an admin-only view or RPC e.g. `get_profiles_with_roles_admin`.

## Security & Compliance

- Maintain RLS on all new objects; prefer admin-only access through views/RPCs rather than relaxing table policies.
- Preserve auth flows and audit trails.
- Keep APR limit at 32% APR and validate server-side where applicable.

## Implementation Notes

- Add new objects via Supabase migration files under `supabase/migrations/` to preserve version control and reproducibility.
- Test security fixes in isolation before integrating with UI; follow incremental rollout.
- Maintain backward compatibility (e.g., payment method string) while introducing improvements (JSONB metadata).

## Acceptance Criteria

- Admin approval screens show enriched user/reviewer/assignee context via `approval_requests_expanded`.
- Approved loan applications are processed via a single RPC call with a success JSON payload (`{ success: true, loan_id: ... }`).
- Admin Overview displays portfolio metrics via `get_admin_dashboard_summary()` with fallback.
- KYC document submissions create approval requests successfully without RLS errors.
- Updated tests pass with the new service API and backend artifacts.
