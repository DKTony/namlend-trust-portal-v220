# NamLend Architectural Mapping (v2.2)

Date: 2025-09-25
Scope: Front-office and back-office UI components mapped to database schema, RPCs, views, storage, and business workflows. Primary verification source: `docs/` and repository code.

## System Overview

```mermaid
flowchart LR
  subgraph Frontend (React + TS)
    A[App.tsx] --> PR[ProtectedRoute]
    A --> AU[Auth.tsx]
    A --> D[Dashboard.tsx]
    A --> LA[LoanApplication.tsx]
    A --> P[Payment.tsx]
    A --> K[KYC.tsx]
    A --> AD[AdminDashboard.tsx]
  end

  subgraph Backoffice (Admin)
    AD --> OVC[Overview]
    AD --> LMD[Loan Management]
    AD --> CMD[Client Management]
    AD --> PMD[Payment Management]
    AD --> AMD[Approval Management]
    AD --> UMD[User Management]
    AD --> AND[Analytics]
  end

  subgraph Integration (supabase-js)
    C[Supabase Client]:::svc
    C -->|auth| Auth[auth.*]
    C -->|storage| Stor[storage.buckets/objects]
    C -->|tables| TBL[(public tables)]
    C -->|views| VW[(public views)]
    C -->|rpc| RPC[(public functions)]
  end

  subgraph Database (Supabase)
    T1[(profiles)]
    T2[(loans)]
    T3[(payments)]
    T4[(kyc_documents)]
    T5[(document_verification_requirements)]
    T6[(user_roles)]
    T7[(approval_requests)]
    T8[(approval_workflow_history)]
    T9[(approval_notifications)]
    V1[(financial_summary)]
    V2[(client_portfolio)]
    Vx[(profiles_with_roles?):::warn]
    Vz[(approval_requests_expanded?):::warn]
    F1[(check_loan_eligibility)]
    F2[(check_loan_eligibility_admin)]
    F3[(get_dashboard_summary)]
    F4[(get_admin_dashboard_summary)]
    F5[(submit_approval_request)]
    Fx[(process_approval_transaction?):::warn]
  end

  classDef svc fill:#eef,stroke:#55f,stroke-width:1px
  classDef warn fill:#ffe3e3,stroke:#cc0000,stroke-width:1px

  AU --> C
  D --> C
  LA --> C
  P --> C
  K --> C
  AD --> C

  C --> T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9
  C --> V1 & V2 & Vx & Vz
  C --> F1 & F2 & F3 & F4 & F5 & Fx
```

## Cross-Cutting Concerns

- **Authentication & Roles**: `src/hooks/useAuth.tsx` fetches roles from `user_roles` and exposes `isAdmin` and `isLoanOfficer`. RLS policies across tables use `auth.uid()` and `public.has_role()`.
- **Protected Routing**: `src/components/ProtectedRoute.tsx` guards pages; `/admin/*` requires admin.
- **Error Handling**: `src/utils/errorHandler.ts` and `ErrorBoundary.tsx` (global) used by pages like `Dashboard.tsx`.
- **Storage (KYC)**: Bucket `kyc-documents` is created in migration `20250729164907-...` and used by `KYC.tsx`.

---

## Front-Office Views → Data Traceability

### App shell (`src/App.tsx`)

- **Routes**: `/`, `/auth`, `/dashboard`, `/loan-application`, `/payment`, `/kyc`, `/admin/*`
- **Integration**: none directly (delegates to child pages).

### Auth (`src/pages/Auth.tsx`)

- **Tables/RPC**:
  - **auth**: `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`
  - **user_roles**: `select('role').eq('user_id', user.id)` after sign-in
  - On signup, inserts `user_roles { user_id, role: 'client' }`
- **Notes**:
  - Role fetching aligns with `public.user_roles (enum app_role)` from `20250731184302_...`.
  - Uses Zod email validation and normalized lowercasing.

### Dashboard (`src/pages/Dashboard.tsx`)

- **Tabs**: `overview`, `loans`, `applications`, `payments`, `profile`
- **Tables/Views/RPC**:
  - **profiles**: `select('*').eq('user_id', user.id).single()`
  - **loans**: `select('*').eq('user_id', user.id).order('created_at', desc)`
  - **approval_requests**: via service `getUserApprovalRequests('pending')`
  - **payments**: `select('*, loans!inner(user_id)').eq('loans.user_id', user.id)`
- **RLS**: Policies in `20250729164907-...` protect per-user access.

### Loan Application (`src/pages/LoanApplication.tsx`)

- **Workflow**: approval-first; does not write to `loans` directly.
- **Tables/RPC**:
  - Submits to **approval_requests** via `services/approvalWorkflow.submitApprovalRequest()`
  - APR compliance fixed at 32% (NAD), see `src/constants/regulatory.ts`.
- **Notes**: Suggest aligning to SQL RPC `submit_approval_request` for rule evaluation (see Audit).

### Payment (`src/pages/Payment.tsx`) and `src/components/PaymentModal.tsx`

- **Tables**:
  - **loans**: read active/disbursed loans for current user
  - **payments**: insert payment rows `status='pending'`, `payment_method` as channel string, `reference_number`
- **RLS**: `payments` policies tie to owning loan user via subquery.
- **Notes**: Consider normalized payment details or JSONB channel metadata.

### KYC (`src/pages/KYC.tsx`)

- **Storage**: Upload to bucket `kyc-documents` path `${user.id}/{docType}-{timestamp}.ext`
- **Tables**:
  - **kyc_documents**: insert uploaded doc row (TEXT `document_type`)
  - **document_verification_requirements**: update or insert canonical doc (`id_document`, `payslip`, `bank_statement_1`, ...)
  - **approval_requests**: submit KYC verification request
- **Notes**: Canonicalization present. See Audit for consolidation with enum and required doc set alignment.

---

## Back-Office (Admin) Views → Data Traceability

### AdminDashboard (`src/pages/AdminDashboard.tsx`)

- **Tabs**: `financial`, `loans`, `clients`, `payments`, `approvals`, `users`, `analytics`
- **Notes**:
  - Current file does not sync tab <-> URL (e.g., `/admin/loans`). Memory claims it should; see Audit.

### Overview

- `Overview/FinancialSummaryCards.tsx`
  - **View**: `financial_summary` (from `20250801174356_...`)
  - Fallback to zeros on error.
- `Overview/KPIMetrics.tsx`, `Overview/RevenueChart.tsx`
  - **Tables**: `loans`, `profiles` (derived computation)

### Loan Management

- `hooks/useLoanApplications.ts`
  - **Tables**: `loans` (filtered by status), `profiles` (map applicant names)
- `hooks/useLoanActions.ts`
  - **Tables**: `loans` updates (`approved`, `rejected`, `disbursed`)
- Components: `LoanManagementDashboard.tsx`, `LoanApplicationsList.tsx`, `LoanReviewPanel.tsx`, `LoanPortfolioOverview.tsx`, `BulkActionsPanel.tsx`

### Client Management

- `hooks/useClientsList.ts`
  - **Tables**: `profiles`, `loans`, `kyc_documents`
- `hooks/useClientProfile.ts`
  - **Tables/Views/RPC**: `profiles`, `loans`, `payments join loans`, `document_verification_requirements`, fallback `kyc_documents`, `profiles_with_roles?`, RPC `check_loan_eligibility_admin`
- `hooks/useClientPortfolioMetrics.ts`
  - **Tables**: `profiles`, `loans`, `kyc_documents`
- Components: `ClientManagementDashboard.tsx`, `ClientsList.tsx`, `ClientProfile.tsx`, `CommunicationCenter.tsx`, `SupportTickets.tsx`

### Payment Management

- `hooks/usePaymentsList.ts`
  - **Tables**: `payments`, `loans`, `profiles`
- `hooks/useDisbursements.ts`
  - **Tables**: `loans`, `profiles`; updates `loans.disbursed_at`
- `hooks/usePaymentMetrics.ts`
  - **Tables**: `payments`, `loans`
- Components: `PaymentManagementDashboard.tsx`, `PaymentsList.tsx`, `PaymentOverview.tsx`, `DisbursementManager.tsx`, `OverdueManager.tsx`, `CollectionsCenter.tsx`

### Approval Management

- `services/approvalWorkflow.ts`
  - **Tables**:
    - `approval_requests` (insert/select/update)
    - `approval_workflow_history` (select join changed_by)
    - `approval_notifications` (select/update)
  - **RPCs (expected)**:
    - `process_approval_transaction` (missing; see Audit)
  - **Views (expected)**:
    - `approval_requests_expanded` (not found; see Audit)
- Component: `ApprovalManagementDashboard.tsx`

### User Management

- `hooks/useUsersList.ts`
  - **RPC expected**: `get_profiles_with_roles_admin` (not found; see Audit)
  - **View fallback**: `profiles_with_roles` (not found; see Audit)
  - **Tables**: `profiles` (delete/update)
- Components: `UserManagementDashboard.tsx`, `UsersList.tsx`, `UserProfile.tsx`, `RoleManagement.tsx`, `PermissionMatrix.tsx`, `BulkUserOperations.tsx`, etc.

### Analytics

- Components use charting but charts may be disabled; sources typically `loans`, `profiles`, and derived metrics.

---

## Integration Details

- **Supabase Client**: `src/integrations/supabase/client.ts` uses `@supabase/supabase-js` with session persistence and a dev `mockSupabase` fallback for missing env keys.
- **Admin Client**: `src/integrations/supabase/adminClient.ts` gated by `VITE_ALLOW_LOCAL_ADMIN === 'true'` and not bundled in production by default.
- **Edge Functions**: `supabase/functions/process-loan-application/`, `send-notification/` present but not yet wired from all workflows.

---

## Schema, Views, RPCs (Observed from `/supabase/migrations/`)

- **Core tables**: `profiles`, `loans`, `payments`, `kyc_documents`, `user_roles`
- **Backoffice tables**: `approval_requests`, `approval_workflow_history`, `approval_notifications`, `approval_workflow_rules`
- **RLS**: Enabled across all core/backoffice tables with policies for self-access and admin/loan_officer access.
- **Views**: `financial_summary`, `client_portfolio` present. `profiles_with_roles` not found in migrations.
- **RPCs/Functions**:
  - Present: `has_role`, `check_loan_eligibility()` (no-arg, returns table), `check_loan_eligibility_admin(target_user_id)`, `get_dashboard_summary()`, `get_admin_dashboard_summary()`, `submit_approval_request(...)`, `evaluate_approval_rules(...)`
  - Missing but referenced in code: `process_approval_transaction`, `get_profiles_with_roles_admin`, `approval_requests_expanded` view
  - Name collision risk: `enhance_client_profile_system.sql` defines `check_loan_eligibility(user_uuid UUID) RETURNS BOOLEAN` which conflicts with no-arg version used in UI. See Audit.

---

## Tab-Based Navigation Mapping

- **Client Dashboard (`Dashboard.tsx`)**
  - **Tabs**:
    - **overview** → `profiles`, `loans`
    - **loans** → `loans`
    - **applications** → `approval_requests` (filtered)
    - **payments** → `payments` joined to `loans`
    - **profile** → `profiles`, `document_verification_requirements`

- **Admin Dashboard (`AdminDashboard.tsx`)**
  - **financial** → `financial_summary` view
  - **loans** → `loans`, workflow components
  - **clients** → `profiles`, `loans`, `kyc_documents`, `document_verification_requirements`
  - **payments** → `payments`, `loans`
  - **approvals** → `approval_requests`, `approval_workflow_history`, `approval_notifications`
  - **users** → `profiles`, `user_roles` (+ expected `profiles_with_roles` view/RPC)
  - **analytics** → derived metrics from `loans`, `profiles`

---

## Front-to-Back CRUD Matrix (Highlights)

- **profiles**
  - **Create**: trigger `handle_new_user` on `auth.users` insert
  - **Read/Update**: Dashboard/Profile editor, Admin Client Profile editor
  - **RLS**: self read/update, staff read/update

- **loans**
  - **Create**: via backoffice approval (expected RPC `process_approval_transaction`), not direct UI
  - **Read**: client dashboard, admin listings
  - **Update**: status changes (approve/reject/disburse) by admin/loan_officer

- **payments**
  - **Create**: Payment page/modal
  - **Read**: client dashboard, admin payment management

- **kyc_documents** / **document_verification_requirements**
  - **Create/Update**: KYC upload page; verification updates via backoffice

- **approval_requests** / **approval_workflow_history** / **approval_notifications**
  - **Create**: Loan application and KYC submissions
  - **Read/Update**: Admin workflow screens

---

## Notes on Consistency and Coherence

- **Approval pipeline** is correctly centralized through `approval_requests`, with rules/notifications/history. UI calls currently write directly to `approval_requests` (TypeScript), while SQL functions exist to evaluate rules. See Audit for harmonization.
- **Role-based access** is consistent: all admin/loan_officer pathways rely on RLS + `has_role`.
- **Storage alignment** (KYC) is consistent; canonical doc mapping is handled in UI.

This mapping should be used as the canonical traceability reference for subsequent verification and remediation.
