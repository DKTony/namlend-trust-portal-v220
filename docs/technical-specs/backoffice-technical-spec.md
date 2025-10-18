# Namlend Trust — Backoffice Technical Specification (TSD)

Document Owner: Technical Lead
Version: 1.0.1
Last Updated: 2025-10-06
Status: Draft — aligned with Backoffice FSD v1.0.0 and Technical Specs v2.3.2

---

> v2.3.2 Addendum — Admin Role search & assignment stabilization

- Recreated `public.profiles_with_roles` with aggregated `roles app_role[]`, `primary_role`, role flags, and stable groupings for admin search.
- Hardened `public.get_profiles_with_roles_admin(p_search_term, p_role_filter, p_limit, p_offset)` (SECURITY DEFINER):
  - Fully qualified columns; `left join auth.users` + `coalesce(pwr.email, u.email)`
  - Search over first/last/email/phone and `user_id::text`
  - `EXECUTE` restricted to `authenticated`
- Dropped legacy zero‑arg overload `get_profiles_with_roles_admin()` to avoid RPC resolution ambiguity.
- UI wiring unchanged: `RoleManagement.tsx` uses `serviceRoleAssignment.assignRoleWithServiceRole()` (Edge Function) with RPC fallback `assign_user_role`.
- Operational: run with `VITE_RUN_DEV_SCRIPTS=false` to prevent dev automations interfering with auth.

## 1. Purpose and Alignment

- Defines the authoritative technical reference for Backoffice systems.
- Strictly mapped to FSD at `docs/functional-specs/backoffice-functional-spec.md`.
- Extends `docs/technical-specs/README.md` (v2.2.5) with Backoffice specifics.

---

## 2. Traceability Overview (FSD → Technical)

| Domain | FSD IDs (examples) | UI (front-end) | Services | DB / Views / RPC |
|---|---|---|---|---|
| DASH | DASH-001..002 | `src/pages/AdminDashboard/components/Overview/*`, `Analytics/*` | Admin metrics fetch | `public.financial_summary` (INVOKER), `public.get_admin_dashboard_summary()` (DEFINER) |
| APPR | APPR-001..003 | `ApprovalManagement/ApprovalManagementDashboard.tsx` | `src/services/approvalWorkflow.ts` | `approval_requests`, `approval_workflow_history`, `approval_notifications`, `approval_workflow_rules`, `approval_requests_expanded` |
| LOAN | LOAN-001..003 | `LoanManagement/*` | `processApprovedLoanApplication()` | `loans`, `disbursements` |
| CLIENT | CLIENT-001..003 | `ClientManagement/*` | Profile/KYC helpers | `profiles`, KYC tables (if present) |
| PAY | PAY-001..003 | `PaymentManagement/*` | Payment helpers | `payments`, `disbursements` |
| ADMIN | ADMIN-001..003 | `UserManagement/*` | Role helpers (server-side) | `user_roles`, audit tables |

---

## 3. Personas → Technical Roles

| Persona | Role(s) | Route Access | Data Access (RLS) |
|---|---|---|---|
| System Administrator | `admin` | `/admin/*` via `ProtectedRoute.tsx` | Full admin per policies |
| Loan Officer | `loan_officer` | `/admin/*` (policy-gated) | Approval + loans (scoped) |
| Compliance Officer | `compliance_officer` | Read-only areas | Read-only portfolio + audit |
| Collections Manager | `collections_manager` | Payments/Overdues | Payments, disbursements, overdues |

- Roles table: `public.user_roles`.
- Route guard: `src/components/ProtectedRoute.tsx`.

---

## 4. Architecture and Components

- Entry: `src/pages/AdminDashboard.tsx` (tabs + routing sync).
- Domains:
  - Approvals: `ApprovalManagement/ApprovalManagementDashboard.tsx`
  - Loans: `LoanManagement/` (`LoanReviewPanel.tsx`, `LoanApplicationsList.tsx`, `BulkActionsPanel.tsx`)
  - Payments/Collections: `PaymentManagement/` (`PaymentsList.tsx`, `OverdueManager.tsx`, `CollectionsCenter.tsx`, `DisbursementManager.tsx`)
  - Overview/Analytics: `Overview/*`, `Analytics/*`
  - Notifications: `src/components/Header.tsx` → `NotificationBell` (FO/BO)

Services layer:

- `src/services/approvalWorkflow.ts` provides core admin workflow APIs.
- Supabase clients: `src/integrations/supabase/client.ts` (browser), `adminClient.ts` (server-only when used).

---

## 5. API Specifications (Backoffice services)

Source: `src/services/approvalWorkflow.ts`

```ts
// List requests for admins with filters
export async function getAllApprovalRequests(filters?: {
  status?: ApprovalRequest['status'];
  requestType?: ApprovalRequest['request_type'];
  priority?: ApprovalRequest['priority'];
  assignedTo?: string;
}): Promise<{ success: boolean; requests?: ApprovalRequest[]; error?: string }>

// Update request status (creates history + notifications via triggers)
export async function updateApprovalStatus(
  requestId: string,
  status: ApprovalRequest['status'],
  reviewNotes?: string,
  assignedTo?: string
): Promise<{ success: boolean; error?: string }>

// Admin dashboard statistics
export async function getApprovalStatistics(): Promise<{
  success: boolean;
  stats?: { total: number; pending: number; underReview: number; approved: number; rejected: number; byType: Record<string, number>; byPriority: Record<string, number>; avgProcessingTime: number };
  error?: string;
}>

// Atomic processing after approval (creates loan, links back)
export async function processApprovedLoanApplication(
  approvalRequestId: string
): Promise<{ success: boolean; loanId?: string; error?: string }>
```

### 5.1 Approvals Module (APPR)

#### 5.1.1 getAllApprovalRequests()

- **Purpose**: Retrieve approval queue for admins/staff with filters and enriched fields from `approval_requests_expanded`.
- **Auth & RLS**: Requires staff role; admins can view all; clients only their own (policies in §6.1).
- **Request Schema**:

```ts
interface GetApprovalRequestsFilter {
  status?: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info';
  requestType?: 'loan_application' | 'kyc_document' | 'profile_update' | 'payment' | 'document_upload';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string; // UUID
}
```

- **Response Schema**:

```ts
type GetApprovalRequestsResponse = {
  success: boolean;
  requests?: ApprovalRequest[]; // see type in services
  error?: string;
}
```

- **Example**:

```ts
await getAllApprovalRequests({ status: 'pending', priority: 'high' });
```

- **Errors**: Permission denied (RLS), validation issues in filters, view not granted (ensure SECURITY INVOKER grants per v2.2.5).

#### 5.1.2 updateApprovalStatus()

- **Purpose**: Transition approval status; records `review_notes`, reviewer metadata; triggers workflow history and notifications.
- **Auth & RLS**: Admin-only update per policy (see §6.1).
- **Request**:

```ts
interface UpdateApprovalStatusInput {
  requestId: string; // UUID
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info';
  reviewNotes?: string;
  assignedTo?: string; // UUID
}
```

- **Response**: `{ success: boolean; error?: string }`

- **Example**:

```ts
import { updateLoanStatus } from '@/services/loanService';

await updateLoanStatus({ loanId: 'a3b9-...', status: 'approved' });
```

- **Example**:

```ts
await updateApprovalStatus(id, 'approved', 'Meets criteria');
```

- **Errors**: RLS update denied (non-admin), invalid status, missing request.

#### 5.1.3 getApprovalStatistics()

- **Purpose**: KPIs for admin dashboard (counts by status/type/priority, avg processing time).
- **Auth**: Staff/admin.
- **Response Shape** (from `approvalWorkflow.ts`):

```ts
{
  success: boolean;
  stats?: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    avgProcessingTime: number;
  };
  error?: string;
}
```

#### 5.1.4 processApprovedLoanApplication()

- **Purpose**: Atomic processing of an approved loan application; creates loan record and links back to approval request.
- **Auth & RLS**: Staff/admin; executes series of inserts/updates within a measured operation.
- **Request**: `approvalRequestId: string` (UUID)
- **Response**: `{ success: boolean; loanId?: string; error?: string }`
- **Notes**: Ensure downstream triggers (e.g., disbursement propagation) and indexes are in place (§8).

#### 5.1.5 getApprovalHistory()

- **Purpose**: Fetch chronological status history for a specific request.
- **Auth & RLS**: Admins view all; users view history for their own requests.
- **Request**: `{ requestId: string }`
- **Response**: `{ success: boolean; history?: ApprovalWorkflowHistory[]; error?: string }`

#### 5.1.6 getApprovalNotifications()

- **Purpose**: List approval notifications for the current user.
- **Auth & RLS**: `recipient_id = auth.uid()` (see §6.3).
- **Request**: `unreadOnly?: boolean = false`
- **Response**: `{ success: boolean; notifications?: ApprovalNotification[]; error?: string }`

#### 5.1.7 markNotificationAsRead()

- **Purpose**: Mark a notification as read, setting `read_at`.
- **Auth & RLS**: User can update only their notifications.
- **Request**: `{ notificationId: string }`
- **Response**: `{ success: boolean; error?: string }`

#### 5.1.8 submitApprovalRequest()

- **Purpose**: Client/staff submits a new approval request.
- **Auth & RLS**: INSERT allowed when `auth.uid() = user_id` (policy in §6.1). Also available via RPC in migrations.
- **Request**:

```ts
interface SubmitApprovalRequestInput {
  user_id: string; // UUID (client)
  request_type: 'loan_application' | 'kyc_document' | 'profile_update' | 'payment' | 'document_upload';
  request_data: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}
```

- **Response**: `{ success: boolean; requestId?: string; error?: string }`
- **Notes**: In DB, `submit_approval_request()` function also exists (SECURITY DEFINER) to orchestrate rule evaluation (see migration in §6.4).

### 5.2 Loan Management (LOAN)

> Recommended service interface shape (to be implemented following `approvalWorkflow.ts` patterns). This section defines the API contract for documentation and future implementation.

#### 5.2.1 getLoanById()

- **Purpose**: Fetch a single loan by ID with client ownership and staff access rules.
- **Auth & RLS**: Client can view own (`auth.uid() = user_id`); staff can view all (see §6.6).
- **Request**:

```ts
interface GetLoanByIdInput { loanId: string }
```

- **Response**:

```ts
type GetLoanByIdResponse = { success: boolean; loan?: any; error?: string }
```

- **Example**:

```ts
import { getLoanById } from '@/services/loanService';

const { success, loan, error } = await getLoanById({ loanId: 'a3b9-...' });
if (!success) console.error(error);
```

#### 5.2.2 updateLoanStatus()

- **Purpose**: Update loan status (e.g., approved → disbursed via disbursement trigger propagation).
- **Auth & RLS**: Staff only (loan_officer/admin) per policy.
- **Request**:

```ts
interface UpdateLoanStatusInput { loanId: string; status: 'pending'|'approved'|'rejected'|'disbursed' }
```

- **Response**: `{ success: boolean; error?: string }`

#### 5.2.3 createDisbursement()

- **Purpose**: Create a disbursement record for a loan; completion propagates to `loans.status='disbursed'` (see §6.8).
- **Auth & RLS**: Staff insert/update on `disbursements`.
- **Request**:

```ts
interface CreateDisbursementInput {
  loanId: string;
  amount: number;
  method?: string;
  scheduled_at?: string; // ISO
}
```

- **Response**: `{ success: boolean; disbursementId?: string; error?: string }`

- **Example**:

```ts
import { createDisbursement } from '@/services/loanService';

await createDisbursement({ loanId: 'a3b9-...', amount: 10000.00, method: 'EFT' });
```

### 5.3 Payment Processing (PAY)

#### 5.3.1 listPayments()

- **Purpose**: List payments by loan and status for staff dashboards; clients can list their own via RLS.
- **Auth & RLS**: Client via loan ownership; staff view all (see §6.7).
- **Request**:

```ts
interface ListPaymentsFilter { loanId?: string; status?: 'pending'|'completed'|'failed' }
```

- **Response**: `{ success: boolean; payments?: any[]; error?: string }`

- **Example**:

```ts
import { listPayments } from '@/services/paymentService';

const res = await listPayments({ status: 'pending' });
```

#### 5.3.2 recordPayment()

- **Purpose**: Record or reconcile a payment.
- **Auth & RLS**: Insert allowed for client on own loan; staff may update statuses.
- **Request**:

```ts
interface RecordPaymentInput {
  loanId: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
}
```

- **Response**: `{ success: boolean; paymentId?: string; error?: string }`

- **Example**:

```ts
import { recordPayment } from '@/services/paymentService';

await recordPayment({ loanId: 'a3b9-...', amount: 1200.00, payment_method: 'bank_transfer' });
```

### 5.4 Client Management (CLIENT)

> Live schema parity: limit profile fields to live columns (see §6.9 note) to avoid PGRST204.

#### 5.4.1 getProfile()

- **Purpose**: Fetch client profile for admin/staff or the client.
- **Auth & RLS**: Client reads own; staff can view all (see §6.9).
- **Request**: `{ userId: string }`
- **Response**: `{ success: boolean; profile?: any; error?: string }`

- **Example**:

```ts
import { getProfile } from '@/services/clientService';

const { profile } = await getProfile({ userId: 'uuid-user' });
```

#### 5.4.2 updateProfile()

- **Purpose**: Update client profile fields.
- **Auth & RLS**: Client updates own; staff can update (policy present). Only live DB columns must be included.
- **Request**: `{ userId: string; patch: Partial<ProfileLiveColumns> }`
- **Response**: `{ success: boolean; error?: string }`

### 5.5 Administration (ADMIN)

#### 5.5.1 getProfilesWithRoles()

- **Purpose**: Admin/staff search across enriched view via RPC `get_profiles_with_roles_admin(...)` (SECURITY DEFINER).
- **Request**: `{ search?: string; role?: 'client'|'loan_officer'|'admin'; limit?: number; offset?: number }`
- **Response**: `{ success: boolean; results?: any[]; error?: string }`

- **Example**:

```ts
import { getProfilesWithRoles } from '@/services/adminService';

await getProfilesWithRoles({ search: 'john', role: 'client', limit: 50, offset: 0 });
```

#### 5.5.2 listUserRoles()

- **Purpose**: Read roles for a user from `user_roles`.
- **RLS**: Authenticated users can SELECT (policy to break circular dependency), see §6.10.
- **Request**: `{ userId: string }`
- **Response**: `{ success: boolean; roles?: ('client'|'loan_officer'|'admin')[]; error?: string }`

- **Example**:

```ts
import { listUserRoles } from '@/services/adminService';

await listUserRoles({ userId: 'uuid-user' });
```

Dashboard RPC:

```sql
-- SECURITY DEFINER with staff guard (search_path pinned)
select * from public.get_admin_dashboard_summary();
```

### 5.6 UI Integration (wiring summary)

- Hooks wired to services for Backoffice parity:
  - `useLoanActions()` → `loanService.updateLoanStatus()` for approve/reject/disburse (and bulk)
  - `useDisbursements()` → `loanService.createDisbursement()` to process via ledger (triggers propagate to `loans`)
  - `usePaymentsList()` → `paymentService.listPayments()` for listing (joins loans/profiles for UI labels)
  - `useClientProfile()` → `clientService.getProfile()` (live-schema safe fetch)
  - `useUsersList()` → `adminService.getProfilesWithRoles()` (RPC-first with view fallback)
  - `RoleManagement.tsx` → `serviceRoleAssignment.assignRoleWithServiceRole()` for assignment (Edge Function with RPC fallback), and `adminService.getProfilesWithRoles()` for role counts

---

## 6. Data Model, Views, Triggers

Core tables (summaries):

- `approval_requests` (status, priority, assigned_to, request_data, metadata, refs)
- `approval_workflow_history` (previous/new status, changed_by, reason, ts)
- `approval_notifications` (recipient_id, type, message, is_read, ts)
- `approval_workflow_rules` (conditions JSONB, action, action_data, is_active)
- `loans`, `payments`, `disbursements` (per migrations in v2.2.4 addendum)

Views and RPCs:

- Views (SECURITY INVOKER): `approval_requests_expanded`, `financial_summary`, etc.
- RPCs (SECURITY DEFINER): `get_admin_dashboard_summary()` guarded by `public.has_staff_role()`.

Triggers:

- On `approval_requests` UPDATE → add `approval_workflow_history` + admin/client notifications.
- On `payments` INSERT/UPDATE → admin and client notifications.
- On `profiles` UPDATE → backoffice notification.

### 6.6 loans (Schema & RLS)

- **Schema**: see `20250729164907-fa8c09db-07bc-4603-8a83-7c3dcdbe5902.sql` lines 16–30.
- **RLS** (enabled):
  - Users: SELECT/INSERT/UPDATE own (`auth.uid() = user_id`).
  - Staff: SELECT all, UPDATE status (policies in `f689a1a6-...sql` lines 145–151).

### 6.7 payments (Schema & RLS)

- **Schema**: same migration lines 32–42; later enhanced with overdue fields.
- **RLS** (enabled):
  - Users: SELECT/INSERT where loan belongs to user (`auth.uid() = (SELECT user_id FROM loans WHERE id = loan_id)`).
  - Staff: SELECT all and UPDATE (policies in `f689a1a6-...sql` lines 153–157).
- **Triggers**: Notification on INSERT/UPDATE (`notify_payment_events` per v2.2.5 addendum).

### 6.8 disbursements (Schema & RLS)

- **Schema**: `20250928_admin_metrics_disbursements.sql` lines 9–22.
- **RLS** (enabled):
  - Read: client on own loan or staff (lines 65–81).
  - Insert/Update: staff only (lines 83–114).
- **Trigger**: `disbursement_completion_propagate()` sets loan `status='disbursed'` and `disbursed_at` (lines 39–61).

### 6.9 profiles (Schema & RLS)

- **Schema**: base in `fa8c09db-...sql` lines 1–14; later extended in `20250921_enhance_client_profile_system.sql` (dev).  
  - **Live schema note**: Production lacks several extended fields (employer/bank details). See project memory; avoid updating non-existent columns.
- **RLS** (enabled):
  - Users: SELECT/INSERT/UPDATE own.
  - Staff: SELECT/UPDATE all (policies in `f689a1a6-...sql` lines 159–165).
- **Triggers**: `update_profile_status_*` recomputes completion/eligibility in dev (ensure parity before using in prod docs).

### 6.10 user_roles (Schema & RLS)

- **Schema**: `f689a1a6-...sql` lines 1–13.
- **RLS** (enabled) with circular-dependency-safe policies: `20250803_fix_user_roles_rls.sql`.
  - Users can view own roles.
  - Authenticated can view all roles (to allow admin checks).
  - Inserts/updates via service role or SECURITY DEFINER (no client exposure).
- **RPCs**: `has_role(...)`, `assign_user_role(...)` (SECURITY DEFINER) and service-role approach for admin flows.

### 6.11 kyc_documents (Schema & RLS)

- **Schema**: `20250729164907-...5902.sql` lines 44–53
- **RLS** (enabled):
  - Users: SELECT/INSERT/UPDATE own (`auth.uid() = user_id`) — lines 89–96
  - Staff: additional access via `20250731184302_...sql` lines 166–171 (view/update by staff)

### 6.12 document_verification_requirements (Schema & RLS)

- **Schema**: `20250921_enhance_client_profile_system.sql` lines 51–65
- **RLS** (enabled):
  - Users: SELECT own (line 71), UPDATE own (line 74), INSERT own (line 77)
- **Triggers**: `update_profile_status_on_document_change` AFTER INSERT/UPDATE — lines 273–276
- **Indexes**: `idx_doc_requirements_user_id`, `idx_doc_requirements_type`, `idx_doc_requirements_verified` — lines 282–285

### 6.13 loan_reviews (Schema & RLS)

- **Schema**: `20250731184302_...sql` lines 47–57
- **RLS** (enabled):
  - Staff (loan_officer/admin) SELECT — line 61–63
  - Staff INSERT — line 64–66

### 6.14 notifications (Schema & RLS)

- **Schema**: `20250731184302_...sql` lines 72–81
- **RLS** (enabled):
  - Users: SELECT own (`auth.uid() = user_id`) — line 85–86
  - Staff: INSERT — line 88–89

### 6.15 audit_logs (Schema & RLS)

- **Schema**: `20250731184302_...sql` lines 91–103
- **RLS** (enabled):
  - Admins: SELECT — lines 107–108

### 6.1 approval_requests (Schema & RLS)

- **Schema**: see `supabase/migrations/20250906_create_approval_workflow_system.sql` lines 5–24.
- **RLS** (enabled):
  - "Users can view their own approval requests" — `FOR SELECT USING (auth.uid() = user_id)`
  - "Admins can view all approval requests" — `FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))`
  - "Admins can update approval requests" — `FOR UPDATE USING (EXISTS (... role='admin'))`
  - "System can insert approval requests" — `FOR INSERT WITH CHECK (auth.uid() = user_id)`
- **Examples**:
  - Client SELECT allowed when `auth.uid() = user_id`.
  - Admin UPDATE allowed; loan_officer UPDATE not permitted unless additional policy exists.

### 6.2 approval_workflow_history (Schema & RLS)

- **Schema**: lines 27–36 of migration.
- **RLS** (enabled):
  - User SELECT own history via join to `approval_requests` (`id = approval_request_id AND user_id = auth.uid()`).
  - Admin SELECT all.
  - Admin INSERT allowed for history records.

### 6.3 approval_notifications (Schema & RLS)

- **Schema**: lines 53–64 of migration.
- **RLS** (enabled):
  - User SELECT and UPDATE where `recipient_id = auth.uid()` (mark as read).
  - System INSERT allowed.
- **Used By**: `getApprovalNotifications()`, `markNotificationAsRead()`.

### 6.4 approval_workflow_rules (Schema & RLS)

- **Schema**: lines 39–50 of migration.
- **RLS** (enabled): Only admins can manage (policy `FOR ALL USING (role = 'admin')`).
- **Rule Evaluation**: `evaluate_approval_rules()` (SECURITY DEFINER) matches JSONB conditions; `submit_approval_request()` inserts request and optionally auto-approves/flags.

### 6.5 Triggers & Functions

- `update_updated_at_column()` — BEFORE UPDATE on `approval_requests` and `approval_workflow_rules`.
- `create_approval_workflow_history()` — AFTER UPDATE on `approval_requests` to capture transitions (SECURITY DEFINER).
- Notification triggers (see v2.2.5 addendum): `notify_approval_status_change`, `notify_payment_events`, `notify_profile_update` populate `approval_notifications`.

---

## 7. Security & RLS

- RLS enforced on all tables (least privilege).
- Views hardened to SECURITY INVOKER; anon/public privileges restricted.
- SECURITY DEFINER RPCs pin `search_path` and guard with `has_staff_role()`.
- Auth hardening (Supabase Dashboard): OTP expiry ≤ 1h; HIBP enabled.
- Do not expose service role keys in browser; use serverless where needed.

---

## 8. Performance & Scalability

Recommended indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_approval_requests_queue
ON approval_requests(status, priority, created_at)
WHERE status IN ('pending','under_review');

CREATE INDEX IF NOT EXISTS idx_loans_overdue
ON loans(status, next_payment_date)
WHERE status='active' AND next_payment_date < CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_loans_apr_compliance
ON loans(interest_rate, created_at)
WHERE interest_rate > 30.0;
```

SLOs:

- Approval list p95 < 2s (paginated 500 rows).
- Collections/Payments dashboards p95 < 3s.
- Compliance exports p95 < 30s.

---

## 9. Error Handling, Monitoring, Testing

- Error utilities used throughout `approvalWorkflow.ts`: `handleDatabaseError`, `handleBusinessLogicError`, `measurePerformance`.
- E2E (Playwright):
  - `e2e/admin-approvals-actions.e2e.ts` — actions exist; no mutating calls during inspection.
  - `e2e/admin-currency.e2e.ts` — validates `N$` formatting across admin tabs.
- Unit/integration: mock Supabase; assert RLS behaviors via session-scoped tests.

---

## 10. Deployment & Configuration

- Frontend: Vite build; env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Production: set `VITE_DEBUG_TOOLS=false`.
- Supabase (manual): OTP ≤ 1h; HIBP enabled.

---

## 11. Maintenance & Versioning

- Keep this TSD aligned with FSD and with `docs/technical-specs/README.md` addenda.
- When adding features:
  - Update: Services signatures, RLS notes, indexes, E2E coverage.
  - Record: DB changes in migrations and in this TSD.
  - Changelog: update `docs/CHANGELOG.md` with version bump.

---

## 12. Appendices

- Key files:
  - `src/components/ProtectedRoute.tsx`
  - `src/services/approvalWorkflow.ts`
  - `src/pages/AdminDashboard/components/*`
- Related docs:
  - `docs/functional-specs/backoffice-functional-spec.md`
  - `docs/technical-specs/README.md`
