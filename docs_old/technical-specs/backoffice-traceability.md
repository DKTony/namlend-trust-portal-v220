# Backoffice Traceability Matrix

Version: 1.0.2
Last Updated: 2025-10-06

---

## Purpose

Maps FSD → UI → Services → DB/View/RPC with RLS notes to ensure end‑to‑end coverage and auditability.

---

## Legend

- ✅ Implemented (spec + stub/code)
- 📋 Spec only (implementation pending)

---

## APPR — Approvals

| FSD IDs | UI | Service | DB / View / RPC | RLS Notes | Status |
|---|---|---|---|---|---|
| APPR-001 | `ApprovalManagement/ApprovalManagementDashboard.tsx` | `getAllApprovalRequests()` | `approval_requests_expanded` view, `approval_requests` | Staff read-all; clients read-own (policies §6.1) | ✅ |
| APPR-002 | same | `updateApprovalStatus()` | `approval_requests`, triggers → `approval_workflow_history`, `approval_notifications` | Admin update; history insert via trigger | ✅ |
| APPR-003 | same | `getApprovalStatistics()` | `approval_requests` (aggregation) | Staff only surface | ✅ |
| APPR-004 | same | `getApprovalHistory()` | `approval_workflow_history` | Admin all; user only for own | ✅ |
| APPR-005 | `Header.tsx NotificationBell` | `getApprovalNotifications()`, `markNotificationAsRead()` | `approval_notifications` | `recipient_id = auth.uid()` | ✅ |
| APPR-006 | Submitting actions | `submitApprovalRequest()` | `approval_requests` | Insert with `auth.uid() = user_id` | ✅ |

---

## LOAN — Loan Management

| FSD IDs | UI | Service | DB / View / RPC | RLS Notes | Status |
|---|---|---|---|---|---|
| LOAN-001 | `LoanManagement/LoanApplicationsList.tsx` | `getLoanById()` | `loans` | Clients own; staff read-all (policies) | ✅ |
| LOAN-002 | `LoanManagement/LoanReviewPanel.tsx` | `updateLoanStatus()` | `loans` | Staff update (loan_officer/admin) | ✅ |
| LOAN-003 | `DisbursementManager.tsx` | `createDisbursement()` | `disbursements` + trigger `disbursement_completion_propagate()` | Staff insert/update; clients read-own | ✅ |

---

## PAY — Payment Processing

| FSD IDs | UI | Service | DB / View / RPC | RLS Notes | Status |
|---|---|---|---|---|---|
| PAY-001 | `PaymentManagement/PaymentsList.tsx` | `listPayments()` | `payments` | Client via loan ownership; staff read-all | ✅ |
| PAY-002 | `CollectionsCenter.tsx` | `recordPayment()` | `payments` | Client insert own; staff update statuses | ✅ |
| PAY-003 | `PaymentModal.tsx` | `recordPayment()` | `payments` | Clients insert own; method normalized: bank→bank_transfer, mobile→mobile_money, card→debit_order, agent→cash | ✅ |
| PAY-004 | `PaymentManagement/PaymentsList.tsx` (Retry) | `recordPayment()` | `payments` | Staff-triggered retry; reference_number prefixed with `RETRY-` for audit | ✅ |

---

## CLIENT — Client Management

| FSD IDs | UI | Service | DB / View / RPC | RLS Notes | Status |
|---|---|---|---|---|---|
| CLIENT-001 | `ClientManagement/*` | `getProfile()` | `profiles` | Client own; staff read-all | ✅ |
| CLIENT-002 | `ClientManagement/*` | `updateProfile()` | `profiles` | Client own update; staff update | ✅ |

— Live schema note: update only live columns (avoid PGRST204). See §6.9 in TSD.

---

## ADMIN — Administration

| FSD IDs | UI | Service | DB / View / RPC | RLS Notes | Status |
|---|---|---|---|---|---|
| ADMIN-001 | `UserManagement/*` | `getProfilesWithRoles()` | `get_profiles_with_roles_admin(...)`, `profiles_with_roles` | RPC guarded by role check; INVOKER view | ✅ |
| ADMIN-002 | `UserManagement/*` | `listUserRoles()` | `user_roles` | Authenticated read-all policy to break circular dep | ✅ |
| ADMIN-003 | `UserManagement/RoleManagement.tsx` | `serviceRoleAssignment.assignRoleWithServiceRole()` | Edge Function `admin-assign-role`; RPC fallback `assign_user_role` (SECURITY DEFINER) → `user_roles` | Writes require service role/SECURITY DEFINER; reads per policy | ✅ |

---

## Gaps and Follow-ups

- 📋 Add detailed payload examples in TSD for LOAN/PAY/CLIENT/ADMIN.
- 📋 Expand DB/RLS docs for: `loan_reviews`, `notifications`, `audit_logs`, `kyc_documents`, `document_verification_requirements`.
- 📋 Add E2E coverage for new service stubs.
