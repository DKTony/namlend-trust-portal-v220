# NamLend Trust - Database Schema Documentation

**Version**: 2.3.0  
**Last Updated**: December 6, 2025  
**Database**: PostgreSQL 17+ (Supabase)  
**Project**: puahejtaskncpazjyxqp  
**Region**: eu-north-1

---

## Schema Overview

The database follows financial services best practices with comprehensive audit trails, row-level security, and proper data integrity constraints.

---

## Core Tables

### `loans`

Primary loan record table storing loan applications and their lifecycle state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| `user_id` | UUID | FK → auth.users, NOT NULL | Borrower |
| `amount` | NUMERIC | NOT NULL | Loan principal (NAD) |
| `interest_rate` | NUMERIC | NOT NULL | Annual interest rate |
| `term_months` | INTEGER | NOT NULL | Loan duration |
| `monthly_payment` | NUMERIC | NOT NULL | Calculated monthly payment |
| `total_repayment` | NUMERIC | NOT NULL | Principal + interest |
| `purpose` | TEXT | | Loan purpose description |
| `status` | VARCHAR(20) | CHECK constraint | pending, approved, rejected, funded, paid_off |
| `disbursed_at` | TIMESTAMPTZ | | When funds were released |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

**RLS Policies:**

- Users can view their own loans
- Admins can view all loans
- Admins can update loan status

---

### `payments`

Payment records for loan repayments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `loan_id` | UUID | FK → loans | Associated loan |
| `amount` | NUMERIC | NOT NULL | Payment amount (NAD) |
| `payment_method` | VARCHAR(50) | NOT NULL | bank_transfer, mobile_money, cash, debit_order |
| `reference_number` | VARCHAR(100) | | External reference |
| `status` | VARCHAR(20) | | pending, completed, failed |
| `paid_at` | TIMESTAMPTZ | | When payment was processed |
| `is_overdue` | BOOLEAN | DEFAULT FALSE | Overdue flag |
| `days_overdue` | INTEGER | | Days past due date |
| `payment_notes` | TEXT | | Admin notes |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |

---

### `disbursements`

Tracks fund disbursements for approved loans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `loan_id` | UUID | FK → loans, UNIQUE | One disbursement per loan |
| `amount` | NUMERIC | NOT NULL | Disbursement amount (NAD) |
| `status` | VARCHAR(20) | CHECK constraint | pending, approved, processing, completed, failed |
| `method` | VARCHAR(50) | | Payment method |
| `reference` | VARCHAR(100) | | System reference |
| `payment_reference` | VARCHAR(100) | | External payment reference |
| `scheduled_at` | TIMESTAMPTZ | | Scheduled disbursement date |
| `processed_at` | TIMESTAMPTZ | | When actually processed |
| `processing_notes` | TEXT | | Admin notes |
| `created_by` | UUID | FK → auth.users | Creator |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | | Last modification |

---

### `profiles`

User profile information including KYC and credit data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users, UNIQUE | User reference |
| `first_name` | VARCHAR(100) | | First name |
| `last_name` | VARCHAR(100) | | Last name |
| `phone_number` | VARCHAR(20) | | Contact phone |
| `id_number` | VARCHAR(50) | | National ID number |
| `monthly_income` | NUMERIC | | Monthly income (NAD) |
| `employment_status` | VARCHAR(50) | | Employment status |
| `credit_score` | INTEGER | | Credit score (0-850) |
| `risk_category` | VARCHAR(20) | | low, medium, high |
| `verified` | BOOLEAN | DEFAULT FALSE | KYC verification status |
| `last_login` | TIMESTAMPTZ | | Last login timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last modification |

---

### `user_roles`

Role-based access control assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users, NOT NULL | User reference |
| `role` | app_role ENUM | NOT NULL, DEFAULT 'client' | client, loan_officer, admin |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Assignment timestamp |

**Role Enum Values:**

```sql
CREATE TYPE app_role AS ENUM ('client', 'loan_officer', 'admin');
```

---

## Approval Workflow Tables

### `approval_requests`

Central workflow queue for all approval-required actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users | Requester |
| `request_type` | VARCHAR(50) | NOT NULL | loan_application, kyc_document, profile_update, payment, document_upload |
| `request_data` | JSONB | NOT NULL | Request payload |
| `status` | VARCHAR(20) | CHECK constraint | pending, under_review, approved, rejected, requires_info |
| `priority` | VARCHAR(10) | CHECK constraint | low, normal, high, urgent |
| `assigned_to` | UUID | FK → auth.users | Assigned reviewer |
| `reviewer_id` | UUID | FK → auth.users | Who reviewed |
| `reviewed_at` | TIMESTAMPTZ | | When reviewed |
| `review_notes` | TEXT | | Review comments |
| `reference_id` | UUID | | FK to related entity |
| `reference_table` | VARCHAR(50) | | Related table name |
| `auto_approve_eligible` | BOOLEAN | DEFAULT FALSE | Auto-approval flag |
| `risk_score` | INTEGER | CHECK 0-100 | Risk assessment |
| `compliance_flags` | JSONB | DEFAULT '[]' | Compliance issues |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Submission time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

---

### `approval_workflow_history`

Audit trail for approval status changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `approval_request_id` | UUID | FK → approval_requests | Parent request |
| `previous_status` | VARCHAR(20) | | Status before change |
| `new_status` | VARCHAR(20) | NOT NULL | Status after change |
| `changed_by` | UUID | FK → auth.users | Who made the change |
| `change_reason` | TEXT | | Reason for change |
| `changed_at` | TIMESTAMPTZ | DEFAULT NOW() | When changed |
| `additional_data` | JSONB | DEFAULT '{}' | Extra context |

---

### `approval_notifications`

Notification records for approval workflow.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `approval_request_id` | UUID | FK → approval_requests | Related request |
| `recipient_id` | UUID | FK → auth.users | Notification recipient |
| `notification_type` | VARCHAR(30) | NOT NULL | new_request, status_update, assignment, reminder |
| `title` | VARCHAR(200) | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification body |
| `is_read` | BOOLEAN | DEFAULT FALSE | Read status |
| `sent_at` | TIMESTAMPTZ | DEFAULT NOW() | When sent |
| `read_at` | TIMESTAMPTZ | | When read |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |

---

## Audit Tables

### `audit_logs`

Comprehensive audit logging for all system actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `timestamp` | TIMESTAMPTZ | DEFAULT NOW() | Event time |
| `user_id` | UUID | FK → auth.users | Actor |
| `user_role` | TEXT | | Role at time of action |
| `action` | TEXT | CHECK constraint | view, create, update, delete, approve, reject, login, logout, export, download |
| `entity_type` | TEXT | NOT NULL | Table/entity name |
| `entity_id` | UUID | NOT NULL | Record ID |
| `old_state` | JSONB | | State before action |
| `new_state` | JSONB | | State after action |
| `ip_address` | INET | | Client IP |
| `user_agent` | TEXT | | Browser/client info |
| `session_id` | TEXT | | Session identifier |
| `metadata` | JSONB | DEFAULT '{}' | Additional context |

**Design Note:** This table is append-only. Updates are prevented to ensure audit integrity.

---

### `view_logs`

Tracks who viewed sensitive data (PII, financial records).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `timestamp` | TIMESTAMPTZ | DEFAULT NOW() | View time |
| `user_id` | UUID | FK → auth.users | Viewer |
| `entity_type` | TEXT | NOT NULL | What was viewed |
| `entity_id` | UUID | NOT NULL | Record ID |
| `view_duration_ms` | INTEGER | | How long viewed |
| `fields_viewed` | TEXT[] | | Specific fields accessed |
| `ip_address` | INET | | Client IP |
| `session_id` | TEXT | | Session identifier |

---

### `state_transitions`

Detailed status change tracking for compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `timestamp` | TIMESTAMPTZ | DEFAULT NOW() | Transition time |
| `entity_type` | TEXT | NOT NULL | Entity type |
| `entity_id` | UUID | NOT NULL | Entity ID |
| `from_state` | TEXT | NOT NULL | Previous status |
| `to_state` | TEXT | NOT NULL | New status |
| `transition_reason` | TEXT | | Why changed |
| `triggered_by` | UUID | FK → auth.users | Who triggered |
| `workflow_instance_id` | UUID | FK → workflow_instances | Related workflow |
| `metadata` | JSONB | DEFAULT '{}' | Additional data |

---

## Document Tables

### `kyc_documents`

KYC document uploads for verification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users | Document owner |
| `document_type` | VARCHAR(50) | NOT NULL | id_card, proof_income, proof_residence, etc. |
| `file_path` | TEXT | NOT NULL | Storage path |
| `status` | VARCHAR(20) | DEFAULT 'pending' | pending, approved, rejected |
| `verified_at` | TIMESTAMPTZ | | When verified |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload time |

---

## Database Views

### `financial_summary`

Aggregated financial metrics for dashboards.

```sql
CREATE VIEW financial_summary AS
SELECT
  COUNT(DISTINCT user_id) as total_clients,
  COUNT(*) as total_loans,
  SUM(amount) FILTER (WHERE status = 'funded') as total_disbursed,
  SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
  SUM(amount) FILTER (WHERE status = 'rejected') as rejected_amount,
  (SELECT SUM(amount) FROM payments WHERE status = 'completed') as total_repayments,
  (SELECT COUNT(*) FROM payments WHERE is_overdue = true) as overdue_payments
FROM loans;
```

### `client_portfolio`

Client portfolio overview for admin dashboards.

```sql
CREATE VIEW client_portfolio AS
SELECT
  p.user_id,
  p.first_name,
  p.last_name,
  p.phone_number,
  p.credit_score,
  p.monthly_income,
  p.risk_category,
  p.verified,
  COUNT(l.id) as total_loans,
  SUM(l.amount) as total_borrowed,
  ...
FROM profiles p
LEFT JOIN loans l ON l.user_id = p.user_id
GROUP BY p.user_id, ...;
```

### `approval_requests_expanded`

Expanded view with user profile information.

```sql
CREATE VIEW approval_requests_expanded AS
SELECT
  ar.*,
  up.first_name as user_first_name,
  up.last_name as user_last_name,
  ap.first_name as assigned_first_name,
  ap.last_name as assigned_last_name,
  rp.first_name as reviewer_first_name,
  rp.last_name as reviewer_last_name
FROM approval_requests ar
LEFT JOIN profiles up ON ar.user_id = up.user_id
LEFT JOIN profiles ap ON ar.assigned_to = ap.user_id
LEFT JOIN profiles rp ON ar.reviewer_id = rp.user_id;
```

---

## Key Database Functions (RPCs)

### Disbursement Functions

```sql
-- Create disbursement on loan approval
CREATE OR REPLACE FUNCTION create_disbursement_on_approval(p_loan_id UUID)
RETURNS JSONB AS $$
-- Returns: {success, disbursement_id, loan_id, amount, status, message}

-- Complete disbursement with payment reference
CREATE OR REPLACE FUNCTION complete_disbursement(
  p_disbursement_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
-- Returns: {success, disbursement_id, status, payment_reference, message}

-- Get pending disbursements queue
CREATE OR REPLACE FUNCTION get_pending_disbursements()
RETURNS TABLE(...) AS $$
-- Returns: Disbursement records with client names
```

### Payment Functions

```sql
-- Generate payment schedule for loan
CREATE OR REPLACE FUNCTION generate_payment_schedule(p_loan_id UUID)
RETURNS JSONB AS $$
-- Creates amortization schedule entries

-- Apply payment to oldest due schedules
CREATE OR REPLACE FUNCTION apply_payment_to_schedule(
  p_payment_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$

-- Mark overdue payments (scheduled job)
CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS JSONB AS $$
```

### Audit Functions

```sql
-- Log audit entry
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID

-- Log state transition
CREATE OR REPLACE FUNCTION log_state_transition(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_from_state TEXT,
  p_to_state TEXT,
  p_reason TEXT DEFAULT NULL,
  p_workflow_instance_id UUID DEFAULT NULL
) RETURNS UUID
```

---

## Indexes

### Performance Indexes

```sql
-- Loans
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_created_at ON loans(created_at);

-- Payments
CREATE INDEX idx_payments_loan_id ON payments(loan_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Approval Requests
CREATE INDEX idx_approval_requests_user_id ON approval_requests(user_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_type ON approval_requests(request_type);
CREATE INDEX idx_approval_requests_assigned_to ON approval_requests(assigned_to);
CREATE INDEX idx_approval_requests_created_at ON approval_requests(created_at);
CREATE INDEX idx_approval_requests_priority ON approval_requests(priority);

-- Audit Logs
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);
```

---

## Row Level Security Policies

### Pattern: User Owns Data

```sql
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);
```

### Pattern: Admin Full Access

```sql
CREATE POLICY "Admins can view all loans"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

### Pattern: System Insert

```sql
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

---

## Front Office Integration Tables (Phase 4)

### `notification_templates`

Reusable notification templates for multi-channel messaging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Template identifier |
| `name` | VARCHAR(100) | NOT NULL | Display name |
| `category` | VARCHAR(30) | CHECK constraint | loan, payment, kyc, etc. |
| `channels` | TEXT[] | NOT NULL | ['in_app', 'sms', 'email', 'whatsapp'] |
| `title` | VARCHAR(200) | NOT NULL | Notification title |
| `body` | TEXT | NOT NULL | Message body with {variables} |
| `priority` | VARCHAR(10) | DEFAULT 'normal' | low, normal, high, urgent |

---

### `notifications`

In-app notifications for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users | Recipient |
| `title` | VARCHAR(200) | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification body |
| `category` | VARCHAR(30) | NOT NULL | Category for filtering |
| `is_read` | BOOLEAN | DEFAULT false | Read status |
| `read_at` | TIMESTAMPTZ | | When marked read |

---

### `credit_scores`

Historical credit score records for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users | User being scored |
| `loan_id` | UUID | FK → loans | Associated loan (optional) |
| `score` | INTEGER | CHECK 300-850 | Credit score value |
| `score_range` | VARCHAR(20) | NOT NULL | EXCELLENT, GOOD, FAIR, POOR |
| `risk_level` | VARCHAR(20) | NOT NULL | low, medium, high, very_high |
| `max_approved_amount` | DECIMAL(15,2) | | Calculated max loan |
| `suggested_interest_rate` | DECIMAL(5,2) | | Risk-based rate |
| `is_current` | BOOLEAN | DEFAULT true | Current score flag |

---

### `payment_transactions`

Detailed payment transaction logs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `loan_id` | UUID | FK → loans | Associated loan |
| `provider` | VARCHAR(50) | NOT NULL | Payment provider |
| `reference_number` | VARCHAR(100) | NOT NULL | Unique reference |
| `amount` | DECIMAL(15,2) | NOT NULL | Transaction amount |
| `status` | VARCHAR(20) | CHECK constraint | pending, completed, failed |
| `payment_method` | VARCHAR(50) | NOT NULL | bank_transfer, mobile_money, etc. |

---

### `communication_logs`

All outbound SMS/WhatsApp/Email logs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `user_id` | UUID | FK → auth.users | Recipient |
| `channel` | VARCHAR(20) | NOT NULL | sms, whatsapp, email |
| `recipient` | VARCHAR(255) | NOT NULL | Phone/email |
| `content` | TEXT | NOT NULL | Message content |
| `status` | VARCHAR(20) | DEFAULT 'pending' | Delivery status |
| `provider` | VARCHAR(50) | | africastalking, meta_whatsapp |

---

## Database Functions (Phase 4)

| Function | Returns | Description |
|----------|---------|-------------|
| `get_unread_notification_count()` | INTEGER | User's unread count |
| `mark_notification_read(uuid)` | BOOLEAN | Mark as read |
| `mark_all_notifications_read()` | INTEGER | Mark all read |
| `queue_notification(...)` | UUID[] | Queue from template |
| `calculate_credit_score(...)` | UUID | Calculate & store score |
| `get_current_credit_score(uuid)` | TABLE | Get current score |
| `process_payment_webhook(...)` | UUID | Process payment callback |

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 20250729164907 | Jul 2025 | Initial schema |
| 20250731184302 | Jul 2025 | Enhanced loan processing |
| 20250803_fix_user_roles_rls | Aug 2025 | RLS policy fixes |
| 20250906_create_approval_workflow_system | Sep 2025 | Approval workflow |
| 20250921_enhance_client_profile_system | Sep 2025 | Profile enhancements |
| 20251005_harden_assign_user_role | Oct 2025 | Role assignment security |
| 20251009_create_audit_trail_schema | Oct 2025 | Comprehensive audit logging |
| 20251009_create_workflow_engine_schema | Oct 2025 | Workflow engine |
| 20251011195800_documents_bucket_and_table | Oct 2025 | Document storage |
| 20251020_update_complete_disbursement | Oct 2025 | Disbursement with payment method |
| 20251205_create_notification_system | Dec 2025 | Notification system |
| 20251206_create_collections_system | Dec 2025 | Collections management |
| **20251206_front_office_integrations** | **Dec 2025** | **Notifications, Credit Scoring, Payments, Communications** |

---

## Database Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 30+ |
| Total Migrations | 28 |
| RLS Policies | 50+ |
| Database Functions | 25+ |
| Indexes | 40+ |

---

*Document Version: 2.3.0*  
*Last Updated: December 6, 2025*
