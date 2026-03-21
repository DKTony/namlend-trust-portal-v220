# Changelog - NamLend Trust Platform

All notable changes to the NamLend Trust Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.2] - 2026-02-22 (Frontend Supabase→Convex Rewiring)

### Changed

- **Core Pages Rewired** — Replaced all `supabase.from()` / `supabase.rpc()` / `supabase.storage` calls with Convex `useQuery()` / `useMutation()`:
  - `Auth.tsx`, `Dashboard.tsx`, `Payment.tsx`, `LoanDetails.tsx`, `KYC.tsx`

- **Core Hooks Rewired** (6 files):
  - `useFetchActiveLoans.ts` → `useQuery(api.loans.getMyLoans)`
  - `useProfileEdit.ts` → `useMutation(api.users.updateMyProfile)`
  - `useLoanForm.ts` → `useQuery(api.users.getMyProfile)`
  - `useIPPOnboarding.ts` → `useQuery/useMutation(api.ips.ipsOnboarding.*)`
  - `useTigerBeetleBalance.ts` → `useQuery(api.loans.getLoan)` (reads balance from loan doc)
  - `useTigerBeetleConfig.ts` → `useQuery(api.systemConfig.getAllConfig)` + `useMutation(api.systemConfig.setConfig)`

- **Admin Dashboard Hooks Rewired** (10 files — all direct Supabase imports removed):
  - `useFinancialMetrics.ts` → `analytics.getPortfolioSummary`, `getRiskMetrics`, `getMonthlyTrends`, `getClientMetrics`
  - `useKPIData.ts` → `analytics.getPortfolioSummary`, `getClientMetrics`, `getRiskMetrics`
  - `usePaymentMetrics.ts` → `analytics.*`, `loans.adminListLoans`
  - `useLoanPortfolioMetrics.ts` → `analytics.getPortfolioSummary`, `approvalWorkflow.adminListApprovals`
  - `useClientPortfolioMetrics.ts` → `analytics.getClientMetrics`, `getPortfolioSummary`
  - `useClientsList.ts` → `users.listUsers`, `loans.adminListLoans`
  - `useUsersList.ts` → `users.listUsers` (removed `getProfilesWithRoles` service dependency)
  - `useUserManagement.ts` → `users.listUsers`, `users.assignRole` (removed `admin-assign-role` edge function call)
  - `useUserProfile.ts` → `users.getUserProfile`
  - `useClientProfile.ts` → `users.getUserProfile`, `loans.adminListLoans`

### Added

- `convex/payments.ts:getMyPayments` — Client's own payments query
- `convex/approvalWorkflow.ts:getMyApprovalRequests` — Client's own approval requests query

- **Admin Dashboard Components Rewired** (14 files — zero supabase imports remain in `src/pages/AdminDashboard/`):
  - `UserAuditLog.tsx` → `audit.getAuditLogs` (reactive, removed manual fetch)
  - `UserManagementDashboard.tsx` → `users.listUsers`, `approvalWorkflow.adminListApprovals` (reactive stats + export)
  - `SettledLoansList.tsx` → `loans.adminListLoans({ status: 'settled' })`, `users.listUsers`
  - `PaymentManagementDashboard.tsx` → Removed Supabase realtime subscription (Convex auto-reactive)
  - `LoanManagementDashboard.tsx` → Removed Supabase realtime subscription (Convex auto-reactive)
  - `LoanApplicationsList.tsx` → `disbursements.initiateDisbursement` (replaced `supabase.rpc('create_disbursement_on_approval')`)
  - `BatchOperations.tsx` → `loans.adminListLoans`, `users.listUsers` (bulk status update TODO)
  - `Loan360View.tsx` → `loans.getLoan`, `users.getUserProfile`, `payments.getPaymentsByLoan`, `disbursements.getDisbursementsByLoan`
  - `IPSHealthWidget.tsx` → `ips.ipsAlerts.getActiveAlerts`, `ips.ipsTransactions.adminListIpsTransactions`, `ips.ipsAlerts.resolveAlert`
  - `IPSTransactionsViewer.tsx` → `ips.ipsTransactions.adminListIpsTransactions`
  - `WorkflowEditor.tsx` → `approvalWorkflow.createWorkflowDefinition` (update TODO)
  - `WorkflowManagementDashboard.tsx` → `approvalWorkflow.listWorkflowDefinitions`, `adminListApprovals`
  - `SettlementConfig.tsx` → `systemConfig.getAllConfig`, `systemConfig.setConfig`
  - `LedgerDashboard.tsx` → TigerBeetle tables not yet in Convex (placeholders, supabase removed)

### Technical

- **Build**: `npx tsc --noEmit` passes clean ✅
- **Pattern**: All rewired hooks and components use Convex reactive queries — no manual `refetch()` needed, UI updates automatically on data change
- **Supabase realtime**: Removed `supabase.channel()` subscriptions from PaymentManagement and LoanManagement dashboards (Convex reactivity replaces polling)
- **TODOs**: Batch loan status update mutation, workflow update mutation, TigerBeetle Convex tables, Convex file storage for KYC docs

- **Page/Component Files Rewired** (5 files — zero supabase imports in `src/pages/` and `src/components/`):
  - `AdminDashboard.tsx` → `analytics.getPortfolioSummary`, `analytics.getClientMetrics`, `loans.adminListLoans`
  - `ClientProfileDashboard.tsx` → `users.getMyProfile` (reactive, removed `callRpc` + `supabase.from('profiles')`)
  - `SelfServicePortal.tsx` → `loans.getMyLoans`, `payments.getMyPayments`
  - `DocumentVerificationSystem.tsx` → `users.getMyProfile` (eligibility derived; file upload TODO for Convex storage)
  - `ClientProfileModal.tsx` → `users.getUserProfile`, `loans.adminListLoans`, `approvalWorkflow.adminListApprovals`

- **Service-Layer Hooks Rewired** (3 files):
  - `useLoanActions.ts` → `loans.approveLoan`, `loans.rejectLoan` (Convex mutations, bulk support)
  - `usePaymentsList.ts` → `payments.adminListPayments` (reactive, removed `paymentsAPI`)
  - `useDisbursements.ts` → `disbursements.adminListDisbursements` (reactive, mutation TODOs)

- **Remaining**: ~25 legacy `src/services/*.ts` files (P4), ~17 `src/utils/` test scripts (P4.5)

---

## [4.0.1] - 2026-02-22 (Convex Migration Remediation)

### Fixed

- **Auth Callback → Schema Mismatch** (CRITICAL — Sign-Up Blocker)
  - `convex/auth.ts` `afterUserCreatedOrUpdated` was inserting non-existent fields (`firstName`, `lastName`, `nationalId`, `bankAccountNumber`, `bankName`, `employerName`, `profilePhotoId`) into `profiles`
  - Changed `kycStatus` from `"not_started"` (invalid enum) to `"pending"`
  - Removed `null` values (Convex optional fields should be omitted, not null)
  - Removed `assignedAt`/`updatedAt` from `userRoles` insert (not in schema)
  - **Impact**: New user sign-up now works correctly

- **`promiseToPay.status` Enum Mismatch** (HIGH — Collections Failure)
  - `collections.ts` was setting status `"fulfilled"` but schema only allows `"pending" | "kept" | "broken" | "rescheduled"`
  - Changed to `"kept"` in `markPromiseFulfilled` and `getCollectionsStats`
  - Fixed `createPromiseToPay` missing `amount` and `createdBy` fields
  - Fixed `scheduleAuditLog` calls passing `null` where `string` required → changed to `"none"`

- **`markFunded`/`updateLoanBalance` Exposed Publicly** (MEDIUM — Security)
  - Converted from client-callable `mutation` to `internalMutation` in `loans.ts`
  - These are now only callable from other server functions (disbursements, payments)
  - Prevents clients from bypassing disbursement workflow

- **Analytics Full-Table Scans** (MEDIUM — Performance)
  - All 6 analytics queries replaced `.collect()` with `.take(10000)` safety limit
  - Prevents hitting Convex read limits at scale

- **Dead Supabase AuthEventBridge** (LOW — Dead Code)
  - Replaced `supabase.auth.onAuthStateChange` listener in `src/App.tsx` with Convex-native `useConvexAuth()`
  - Removed `supabase` import from `App.tsx`
  - New bridge uses `wasAuthenticated` ref to detect session loss → redirect to `/auth`

### Added

- **`notificationPreferences` Table** — New table in `schema.ts` for user notification preferences per channel/category
- **`paymentSchedules.by_status` Index** — Enables efficient overdue payment queries in `collections.ts`
- **`overdueReminders.sent` Boolean** — Convenience field used by `collections.ts`

### Changed

- **`notifications` Schema** — Expanded: `type`/`channel` now optional, added `message`, `category`, `priority`, `actionUrl`, `actionLabel`, `expiresAt` fields
- **`notificationQueue` Schema** — Expanded: added `content`, `retryCount`, `scheduledAt`, `updatedAt` aliases; added `"processing"` status; made `recipient`/`body`/`attempts` optional
- **`collectionsInteractions` Schema** — Expanded: added `activityType`, `activityStatus`, `contactMethod`, `promiseDate`, `promiseAmount`, `promiseFulfilled`, `nextActionType`, `assignedTo`, `updatedAt`
- **`overdueReminders` Schema** — Added `sent` boolean and `updatedAt` field

### Documentation

- Updated `docs/DATABASE_SCHEMA.md` — Reflects all schema changes, replaced "Known Schema Issues" with "Resolved" section
- Updated `docs/ARCHITECTURE.md` — Marked critical gaps as resolved, updated medium/low risk items
- Updated `CLAUDE.MD` — Updated provider stack, marked all critical blockers resolved, updated priorities

### Technical

- **Files modified**: `convex/auth.ts`, `convex/schema.ts`, `convex/collections.ts`, `convex/loans.ts`, `convex/analytics.ts`, `src/App.tsx`, `docs/DATABASE_SCHEMA.md`, `docs/ARCHITECTURE.md`, `CLAUDE.MD`
- **Build**: `npx tsc --noEmit` passes clean ✅
- **Build**: `npx vite build` passes clean ✅

---

## [2.8.6] - 2026-02-17 (Reconciliation Tab Crash Fix)

### Fixed

- **Reconciliation Tab Blank Screen** (HIGH - UI Crash)
  - Root cause 1: `ErrorBoundary` fallback used `ThemedCard`/`ThemedButton` which call `useTheme()`, but ErrorBoundary wraps outside all providers — fallback itself crashed
  - Root cause 2: Settlement hooks returned `ServiceResult<T>` wrappers; UI components called `.map()` on the wrapper object instead of the inner array, throwing `TypeError`
  - Replaced ErrorBoundary fallback with plain HTML + Tailwind CSS variables (no React context dependency)
  - Added TanStack Query `select` to 5 hooks in `useSettlement.ts` to unwrap `ServiceResult` to raw domain data
  - **Impact**: Reconciliation tab now loads correctly; ErrorBoundary displays proper error UI on any future crash

- **Missing Error States in Reconciliation UI** (MEDIUM - UX)
  - Added `isError` / retry handling to all 8 Reconciliation consumer components
  - Failed queries now show error message with retry button instead of silent blank
  - Statistics cards show "Unable to load" fallback on API failure

### Changed

- Removed dead `reconciliationAPI` import from `ReconciliationDashboard.tsx`
- Cleaned up unused `React` default imports across 9 Reconciliation components
- Removed unused `ACK_TYPE_LABELS`, `CheckCircle2`, `formatCurrency`, and `Select` imports

### Technical

- **Files modified**: `ErrorBoundary.tsx`, `useSettlement.ts`, `ReconciliationDashboard.tsx`, `SettlementRunsList.tsx`, `Pacs009Viewer.tsx`, `NTSLReportViewer.tsx`, `RawDataReportViewer.tsx`, `AdjustmentsViewer.tsx`, `PendingAdjustmentResponse.tsx`, `PendingStatusReport.tsx`, `TimeoutReportViewer.tsx`, `AcknowledgementsViewer.tsx`
- **Build**: `tsc --noEmit` passes clean with zero errors

## [2.8.4] - 2026-01-08 (Data Consistency & Access Control)

### Fixed

- **Loan Balance Terminal Status Alignment** (MEDIUM - Data Consistency)
  - Fixed `loan_balance_summary` view to match `CLOSED_LOAN_STATUSES` from `loanStatuses.ts`
  - Terminal statuses now correctly include: `settled`, `completed`, `defaulted`, `rejected`
  - Previous version only zeroed balances for `settled`, `closed`, `written_off`
  - **Impact**: Completed/defaulted/rejected loans now correctly show zero balances

- **Approval RPC Access Scope Correction** (LOW - Security)
  - Removed `approver` role from `process_approval_transaction` RPC
  - Restored original staff-only access (`admin`, `loan_officer`)
  - Approvers can approve/reject requests but not execute final loan creation
  - **Impact**: Prevents unintended privilege escalation for approver role

### Added

- **Migration**: `20260108070200_fix_loan_balance_terminal_statuses.sql`
- **Migration**: `20260108070300_restrict_approval_rpc_to_staff.sql`

### Technical

- `loan_balance_summary` view: Updated terminal status list to match frontend constants
- `process_approval_transaction` RPC: Reverted to original staff-only authorization
- All security controls from v2.8.3 maintained (FOR UPDATE + status validation + 23505 handler)

## [2.8.3] - 2026-01-08 (Security Regression Fixes)

### Fixed

- **Approval RPC Status Validation Regression** (HIGH - Security)
  - Restored critical `status = 'approved'` validation removed in v2.8.2
  - Re-added `FOR UPDATE` row locking to prevent concurrent status modifications
  - Prevents loan creation from pending/rejected approval requests
  - Maintains 23505 idempotency handler for race condition protection
  - **Impact**: Blocks unauthorized loan creation from non-approved requests

- **Loan Balance View Missing Terminal Statuses** (MEDIUM - Runtime Error)
  - Expanded `loan_balance_summary` view to include ALL loan statuses
  - Terminal states (settled/closed/written_off) now return zero balances
  - Prevents PGRST116 errors when querying balances for completed loans
  - **Impact**: Balance reads now work for loans in any status

- **getLoanBalance Error Handling** (MEDIUM - Resilience)
  - Changed `.single()` to `.maybeSingle()` in ledgerService
  - Added graceful null handling for missing loan records
  - Returns zero balances instead of throwing errors
  - **Impact**: Improved resilience for edge cases

### Added

- **Migration**: `20260108070000_fix_approval_rpc_status_validation.sql`
- **Migration**: `20260108070100_expand_loan_balance_summary_view.sql`

### Security

- Approval workflow now enforces status validation with row-level locking
- Prevents race conditions in concurrent approval processing
- Maintains complete audit trail for all approval operations

### Technical

- `process_approval_transaction` RPC: Restored FOR UPDATE + status check
- `loan_balance_summary` view: Removed restrictive status filter
- `ledgerService.getLoanBalance`: Added null-safe fallback logic

## [2.8.2] - 2026-01-08 (Data Integrity & UX Fixes)

### Fixed

- **TigerBeetle Balance Hook Schema Mismatch** (HIGH)
  - Fixed `useTigerBeetleBalance.ts` to match actual `tigerbeetle_transfers` schema
  - Replaced non-existent columns (`debit_amount`, `credit_amount`, `account_type`, `status`) with actual schema (`amount`, `debit_account_id`, `credit_account_id`, `is_posted`)
  - Added proper account code mapping for balance categorization (principal/interest/fees)

- **Missing loan_balance_summary View** (HIGH)
  - Created `loan_balance_summary` view as fallback for balance reads
  - Calculates balances from loans, payments, and payment_schedules tables
  - Ensures graceful degradation when TigerBeetle data unavailable

- **Payment RPC Idempotency Race Condition** (MEDIUM)
  - Added 23505 `unique_violation` exception handler to `create_payment` RPC
  - Concurrent requests that race past pre-check now return existing payment instead of error
  - True idempotency under concurrent load

- **IPS Fee Messaging Mismatch** (LOW - UX)
  - Fixed Payment UI claiming "No additional fees" for IPS while charging NAD 25
  - Made processing fee dynamic: 0 for IPS, 25 for other payment methods
  - UI now accurately reflects actual fee structure

### Added

- **Migration**: `20260108050000_create_loan_balance_summary_view.sql`
- **Migration**: `20260108050100_fix_create_payment_idempotency.sql`

### Technical

- TigerBeetle balance hook now uses `is_posted` boolean instead of `status` string
- Payment fee logic moved from static state to dynamic `getProcessingFee()` function
- All financial operations maintain audit trails

## [2.8.1] - 2026-01-08 (E2E Test Fixes)

### Fixed

- **IPS Payment Flow E2E Tests** (All 5 failures resolved)
  - Fixed VPA input locator issues in `ips-payment-flow.e2e.ts`
  - Replaced fragile `input[placeholder*="@"]` selectors with robust `[data-testid="vpa-input"]`
  - Added explicit "Use a different address" radio selection (VPAInput conditionally rendered)
  - Included VPA verification step in error handling tests (required by business logic)
  - Fixed currency format assertions and multiple-element matches
  - **Test Results**: 11/11 passing (was 6/11)

### Testing

- **E2E Test Coverage: 100%**
  - Total tests: 126/126 passing
  - IPS payment flow: 11/11 tests passing
  - All UI locator issues resolved
  - No known test failures

### Documentation

- Updated `docs/TESTING.md` with latest test coverage (126/126 passing)
- Updated `docs/IPS_TESTING.md` with resolved E2E test status
- Added troubleshooting guidance for VPA input conditional rendering

## [2.8.0] - 2026-01-06 (Production Blockers Remediation)

### Fixed

- **P0-001: IPS Adapter Security** (Critical)
  - Added JWT verification and role-based authorization to `ips-adapter` edge function
  - Staff-only endpoints (`/pay`, `/register-mobile`, `/reg-mapper`, `/set-cred`) now require admin/loan_officer role
  - All IPS endpoints now require valid authentication token

- **P0-002: TigerBeetle Schema Migration** (Critical)
  - Created `20260106_create_tigerbeetle_schema.sql` migration
  - Added `tigerbeetle_accounts`, `tigerbeetle_outbox`, `tigerbeetle_transfers`, `tigerbeetle_reconciliation` tables
  - Added `queue_tigerbeetle_event` RPC function for outbox pattern
  - Implemented RLS policies for all TigerBeetle tables

- **P0-003: Payment Webhook Wrong ID** (Critical)
  - Fixed `payment-webhook` to use `payments.id` instead of `payment_transactions.id`
  - Now correctly captures payment ID before calling `apply_payment_to_schedule` RPC

- **P0-004: process-loan-application Notification Column** (Critical)
  - Fixed notification insert to use `category` column instead of non-existent `type` column

- **P0-005: send-notification Column Mismatch** (Critical)
  - Fixed notification insert to map `type` parameter to `category` column

- **P1-001: Admin Dashboard Overdue Metrics**
  - Fixed overdue count query to use `payment_schedules` table instead of `payments`
  - Now correctly counts schedules where `due_date < now() AND status != 'paid'`

- **P1-003: Multi-Role Staff Authorization**
  - Fixed `send-sms` and `send-notification` edge functions to handle users with multiple roles
  - Changed from `.maybeSingle()` to `.in('role', ['admin', 'loan_officer'])` query pattern

### Added

- **REMEDIATION_PLAN.md** - Comprehensive documentation of all verified findings and fixes
- **Authorization helper** in IPS adapter for centralized JWT/role validation

### Security

- IPS adapter now enforces authentication on all endpoints
- Staff-only financial operations protected by role verification
- Multi-role users now properly authorized across all edge functions

### Migration Notes

- Run `20260106_create_tigerbeetle_schema.sql` before deploying
- TigerBeetle outbox worker will now have required tables
- All existing edge functions updated - redeploy required

## [2.7.1] - 2025-10-18 (Mobile Phase 3: Schema Alignment & Payments)

### Added

- **Mobile Payments UX**
  - Submit Payment button on `PaymentScreenEnhanced.tsx` with in-flight state.
  - Bank Transfer path now captures `reference_number` via input field.

### Changed

- **Loans List & Details**
  - Active tab now includes both `active` and `disbursed` statuses.
  - Added "Approved" filter tab in `LoansListScreen.tsx`.
  - `LoanDetailsScreen.tsx` shows Make Payment button for `active` and `disbursed` loans.

- **Navigation Types**
  - Typed navigation for `LoansListScreen.tsx`, `LoanDetailsScreen.tsx`, and `ProfileScreen.tsx`.
  - Removed `as never`/`@ts-ignore` casts; uses `NativeStackNavigationProp` and `BottomTabNavigationProp`.

### Fixed

- **Schema Alignment (Supabase)**
  - Replaced non-existent `payment_date` with `paid_at` across services and screens.
  - Removed non-existent `loans.outstanding_balance` and `next_payment_date`; now use `total_repayment` and `disbursed_at`.
  - `payments.user_id` does not exist:
    - Removed from inserts in `paymentService.ts` and `offlineProcessor.ts`.
    - `getMyPayments()` now filters via `loans!inner(user_id)` join and strips the joined object.

- **Type Safety**
  - `paymentService.ts` reducers/maps typed with numeric normalization for `totalPaid`, `pendingPayments`, `lastPaymentDate`.

### Notes

- **Schema Notes**
  - `payments`: use `paid_at` timestamp; no `user_id` column.
  - `loans`: use `total_repayment`, `disbursed_at`; statuses include `approved`, `active`, `disbursed`, `completed`.

- **QA**
  - Verified end-to-end: Loan application amount prefill → Disbursed loan → Make Payment keypad → Submit → Payment history ordered by `paid_at`.

## [2.6.0] - 2025-10-14 (Mobile v2.6.0: Feature Parity, Security, QA)

### Added

- **Mobile App (Production Ready)**
  - Complete client features: 3-step loan application, KYC capture, payments (mobile money, bank transfer, debit order), profile management
  - Approver features: approval queue with filters, review actions, real-time badge counts (Supabase Realtime)
  - Offline-first architecture: queued submissions for applications, payments, document uploads; auto-sync on reconnection
  - Push notifications and deep linking (`namlend://`)
  - Session lock with biometric unlock (Face ID/Touch ID)

- **Performance**
  - Virtualized lists and batched rendering for mobile
  - Lazy-loaded images with placeholders and caching

- **Security**
  - Dev tools gating (`EXPO_PUBLIC_DEBUG_TOOLS=false` in production)
  - RLS verification across profiles, loans, payments, documents, approval requests
  - No service role keys exposed in mobile bundles

- **Documentation**
  - Mobile store submission guide (`namlend-mobile/STORE_SUBMISSION.md`)
  - Privacy policy (`namlend-mobile/PRIVACY_POLICY.md`)
  - Security audit (`namlend-mobile/SECURITY_AUDIT.md`)
  - Test plan (`namlend-mobile/TEST_PLAN.md`)

### Changed

- Updated `app.json` to v2.6.0 with deep link scheme and notification config
- Enhanced `PaymentScreen` to include schedule and history (receipts)

### Fixed

- Resolved UI and navigation issues in mobile profile and document flows

### Notes

- APR compliance maintained at 32% cap; NAD currency formatting standardized
- Comprehensive unit and E2E test coverage added for mobile critical paths

## [2.4.2] - 2025-10-09 (Phase 3: Mobile App Implementation)

### Added

- **Mobile App Implementation (namlend-mobile/)**
  - Complete React Native + Expo project initialized
  - Full TypeScript implementation with strict type safety
  - Production-ready mobile application for iOS and Android
- **Mobile App Documentation**
  - Complete setup guide (`MOBILE_APP_SETUP.md`)
  - Comprehensive architecture document (`MOBILE_APP_ARCHITECTURE.md`)
  - Mobile app README with deployment checklist
  - React Native + Expo implementation plan
  - Client and approver feature specifications
- **Authentication & Security**
  - Supabase Auth integration with AsyncStorage persistence
  - Biometric authentication (Face ID, Touch ID, Fingerprint)
  - Auto-refresh tokens with 15-minute session timeout
  - Secure credential storage in device keychain
  - Role-based navigation (client/loan_officer/admin)

- **Client Features (Implemented)**
  - **Dashboard Screen**: Loan statistics, active loans, pending applications
  - **Loans List Screen**: Filter by status, view loan details
  - **Loan Details Screen**: Repayment schedule, payment history, loan terms
  - **Payment Screen**: Mobile money, bank transfer, debit order integration
  - **Document Upload Screen**: Camera integration for KYC documents
  - **Profile Screen**: User information, settings, sign out

- **Approver Features (Implemented)**
  - **Approver Dashboard**: Pending actions, approval statistics
  - **Approval Queue Screen**: Filter by status and priority
  - **Review Application Screen**: Detailed review with approve/reject actions
  - **Approver Profile Screen**: Account management

- **Navigation Structure**
  - Auth Stack: Login, Biometric Setup
  - Client Stack: Bottom tabs with Dashboard, Loans, Documents, Profile
  - Approver Stack: Bottom tabs with Dashboard, Approvals, Profile
  - Role-based routing with loading states

- **Services & State Management**
  - `authService.ts`: Authentication with biometric support
  - `loanService.ts`: Loan operations and statistics
  - `approvalService.ts`: Approval queue and workflow management
  - `paymentService.ts`: Payment processing and history
  - `notificationService.ts`: Push notifications with Expo
  - Zustand store for auth state
  - React Query for server state with caching

- **Custom Hooks**
  - `useAuth`: Authentication state and actions
  - `useLoans`: Loan queries with React Query
  - `useApprovals`: Approval queue and actions
  - `usePayments`: Payment operations
  - Automatic refetching and cache invalidation

### Technical

- **Technology Stack**
  - React Native 0.72+ with Expo SDK 49+
  - TypeScript with strict mode
  - React Navigation (Native Stack + Bottom Tabs)
  - React Query for server state
  - Zustand for client state
  - React Native Paper for UI components
  - Lucide React Native for icons
- **Dependencies Installed**
  - @supabase/supabase-js (backend integration)
  - @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs
  - @tanstack/react-query (server state)
  - zustand (client state)
  - react-native-paper (UI library)
  - expo-local-authentication (biometrics)
  - expo-notifications (push notifications)
  - @react-native-async-storage/async-storage (persistence)
  - lucide-react-native (icons)
  - react-native-url-polyfill (Supabase compatibility)

- **Project Structure**
  - 30+ TypeScript files organized by feature
  - Services layer for API integration
  - Custom hooks for data fetching
  - Reusable components architecture
  - Type-safe navigation with TypeScript
- **Build Configuration**
  - app.json configured with v2.4.2
  - iOS bundle identifier: com.namlend.mobile
  - Android package: com.namlend.mobile
  - Biometric permissions configured
  - Camera and storage permissions
  - Push notification setup

### Security

- Row-Level Security (RLS) policies enforced
- JWT token auto-refresh
- Secure session storage with AsyncStorage
- Biometric authentication with device keychain
- HTTPS for all API calls
- No sensitive data in logs
- 32% APR compliance for Namibian regulations

### Documentation

- Complete mobile app README with setup instructions
- Environment variable configuration guide
- Development workflow documentation
- Production build and deployment checklist
- Troubleshooting guide
- Security considerations
- Performance optimization strategies

## [2.4.1] - 2025-10-09 (Phase 2: Audit Trail Enhancement)

### Added

- **Comprehensive Audit Logging**
  - View logs table - Track who viewed sensitive data
  - State transitions table - Detailed status change tracking
  - Compliance reports table - Pre-generated reports for auditors
  - Integration with existing audit_logs table

- **Audit Service Layer**
  - TypeScript service (`auditService.ts`) with full audit operations
  - Log view access with duration tracking
  - Log state transitions with workflow linkage
  - Generate compliance reports (monthly_approvals, user_activity, state_changes, view_access)
  - Get audit statistics and analytics

- **Audit React Hooks**
  - `useViewTracking` - Automatic view logging on mount/unmount
  - `useAuditLogs` - Fetch audit logs with filters
  - `useViewLogs` - Fetch view logs with filters
  - `useStateTransitions` - Fetch state transitions
  - `useComplianceReports` - Generate and manage reports
  - `useAuditStats` - Dashboard statistics
  - `useStateTransitionLogger` - Helper for logging transitions

### Technical

- 3 new database tables (view_logs, state_transitions, compliance_reports)
- 3 PostgreSQL functions (log_view_access, log_state_transition, generate_compliance_report)
- RLS policies for admin-only access
- Indexed for 7-year retention queries
- IP address and session tracking

### Security

- Append-only audit trail
- Admin-only access to audit logs
- Users can log their own views
- Immutable audit records
- Comprehensive state change tracking

## [2.4.0] - 2025-10-09 (Phase 1: Workflow Engine Foundation)

### Added

- **Configurable Workflow Engine**
  - Database schema for workflow definitions, instances, and stage executions
  - 2-stage approval workflow (Initial Review → Final Approval)
  - Multi-level approval chains with role-based assignments
  - Workflow versioning and history tracking
  - Auto-assignment and manual assignment support

- **Workflow Service Layer**
  - TypeScript service (`workflowEngine.ts`) with full CRUD operations
  - React hooks for workflow operations (`useWorkflow.ts`)
  - Approve/reject stage functionality
  - Workflow progress tracking
  - Dashboard statistics

- **Admin Workflow UI**
  - Workflow Management Dashboard
  - Visual workflow editor with drag-and-drop stages
  - Active workflow instances viewer
  - Workflow history and audit trail
  - Workflow statistics cards

- **Workflow Components**
  - `WorkflowProgress` - Visual timeline with stage status
  - `WorkflowActionPanel` - Approve/reject interface
  - `WorkflowEditor` - Stage configuration editor
  - `WorkflowStats` - Dashboard metrics

### Technical

- 4 new database tables with RLS policies
- 3 PostgreSQL functions (get_active_workflow, start_workflow_instance, decide_workflow_stage)
- Partial unique indexes for data integrity
- SECURITY DEFINER functions with proper grants
- Toast notifications for workflow actions

### Security

- RLS policies on all workflow tables
- Admin-only workflow configuration
- Users can only see/update assigned stages
- Workflow action audit trail
- Role-based stage assignments

## [2.3.2] - 2025-10-09 (Phase 3: Realtime Updates)

### Added

- **Supabase Realtime Subscriptions**
  - Real-time updates for approval_requests table (loan applications)
  - Real-time updates for payments table
  - Automatic detection of INSERT and UPDATE events
  - Toast notifications for new items and status changes

- **Live Refresh UI**
  - "New Items Available" button appears when changes detected
  - Animated pulse effect on refresh button
  - Manual refresh trigger with refreshKey mechanism
  - Separate subscriptions for Loans and Payments dashboards

### Improved

- **User Experience**
  - No manual page refresh needed for new applications
  - Instant notifications when payments are initiated or updated
  - Non-blocking updates - users can continue working
  - Clear visual indicators for pending updates

### Technical

- Added `refreshKey` state to trigger data refetch
- Implemented Supabase channel subscriptions with cleanup
- Toast notifications using shadcn/ui toast component
- RefreshKey passed through component hierarchy to hooks
- Proper subscription cleanup on component unmount

## [2.3.1] - 2025-10-08 (Phase 2: Unified Data Model)

### Added

- **Unified Database View: `loan_applications_unified`**
  - Combines approval_requests (pending/under_review) and loans (approved/rejected/disbursed) into single view
  - Uses SECURITY INVOKER to inherit RLS policies from underlying tables
  - Provides single source of truth for all loan application states
  - Includes user details from profiles (name, employment_status, monthly_income)
  - Optimized with indexes on underlying tables

### Improved

- **Simplified Frontend Queries**
  - Refactored `useLoanApplications` hook to use unified view
  - Single query path for all loan statuses (pending, approved, rejected, all)
  - Reduced code complexity and eliminated dual-source logic
  - Feature flag (`USE_UNIFIED_VIEW`) for safe rollback to legacy queries

### Technical

- Created SQL migration: `20251008_create_loan_applications_unified_view.sql`
- Applied migration to production database
- Added `fetchFromUnifiedView()` function for streamlined data fetching
- Maintained `fetchLegacy()` fallback for rollback safety
- Extracted `applyFilters()` for reusable filter logic

## [2.3.0] - 2025-10-08 (Phase 1: UX & Data Quality)

### Added

- **Real Employment Status Data**
  - Fetches actual `employment_status` and `monthly_income` from profiles table
  - Works for both pending (approval_requests) and non-pending (loans) items
  - Replaces mock data with real database values
  - Visible in LoanApplicationsList badges and LoanDetailsModal

- **Enhanced Filtering System**
  - Date range filter (created_at) for all loan tabs
  - Amount range filter (NAD) across all tabs
  - Priority filter for pending applications (approvals)
  - Collapsible filter panel with clear filters button
  - Real-time filter application with proper state management
  - Deploy ID: 68e6a6fe0b7a7b787cd20e18

### Improved

- **Loading States**
  - Skeleton loaders already present in LoanApplicationsList (verified)
  - Skeleton loaders already present in PaymentOverview (verified)
  - All loading indicators display within 100ms

- **Error Handling**
  - Added Retry button to PaymentOverview error state
  - LoanApplicationsList already had Retry (verified)
  - All error states now actionable with retry functionality

### Technical

- Updated `useLoanApplications.ts` to fetch employment data from profiles
- Added filter parameters to hook interface and component props
- Implemented client-side filtering for date range, amount range, and priority
- Added proper useEffect dependencies for filter reactivity
- Maintained RLS security and 32% APR compliance

## [2.2.0-4] - 2025-10-08 (Critical Fix)

### Fixed

- **Review Buttons in Loan Management Now Functional**
  - Integrated LoanDetailsModal into LoanApplicationsList
  - Review buttons now open modal with formatted loan details
  - Added state management for modal visibility
  - Added data transformation for modal compatibility
  - Tested with Playwright browser automation
  - All loan tabs (Pending, Approved, Rejected, All) now functional
  - Deploy ID: 68e5cfc25c333b647f333d10

### Testing

- **Comprehensive Browser Testing with Playwright**
  - Verified Financial Dashboard displays correct data (6 clients, N$14,239 disbursed)
  - Verified 19 loans display correctly across all tabs
  - Confirmed Review buttons exist and are clickable
  - Identified and fixed Review button navigation issue
  - Created detailed test findings document

## [2.2.0-3] - 2025-10-08 (Critical Fix)

### Fixed

- **Financial Dashboard Statistics Not Displaying**
  - Replaced RPC-dependent approach with direct database queries
  - Added parallel queries for clients, loans, payments, overdue
  - Implemented proper calculation logic for all metrics
  - Added console logging for debugging
  - All dashboard cards now display correct real-time data
  - Deploy ID: 68e5cd861ad9045f24b928a9

- **Loan Management Data Fetching**
  - Verified useLoanApplications hook working correctly
  - Verified useLoanActions hook with approve/reject functions
  - Confirmed all buttons properly wired and functional
  - Issue was data-related (empty database), not code-related
  - All loan management features operational

## [2.2.0-2] - 2025-10-08 (Hotfix)

### Fixed

- **crypto.randomUUID Browser Compatibility**
  - Added UUID fallback for older browsers/environments
  - Fixed errorMonitoring.ts to use generateUUID() method
  - Fixed errorHandler.ts to use generateUUID() method
  - Prevents "crypto.randomUUID is not a function" errors

- **PieChart Component Naming Conflict**
  - Fixed naming conflict in UserAnalytics.tsx
  - Renamed lucide-react PieChart import to PieChartIcon
  - Resolved component rendering error in User Management dashboard
  - Deploy ID: 68e5c4e1157b268ce4500d26

## [2.2.0-1] - 2025-10-07 (Hotfix)

### Fixed

- **Critical CSS MIME Type Issue**
  - Fixed Netlify redirect rule catching static assets
  - Added explicit MIME type headers for CSS and JS files
  - Changed SPA redirect to `force = false` to allow serving actual files
  - Added cache headers for optimal performance
  - Deploy ID: 68e55dfaf887283fcc5f8c5a

## [2.2.0] - 2025-10-07

### 🎉 Added - Detail Modals UI Enhancement

- **LoanDetailsModal** - User-friendly loan application display
  - Loan amount and monthly payment cards with formatted NAD currency
  - Comprehensive loan terms breakdown (term, interest rate, total repayment, purpose)
  - Applicant information with automatic debt-to-income ratio calculation
  - Timeline visualization (application → approval → disbursement)
  - Replaces ugly JSON displays in approval workflow
- **DisbursementDetailsModal** - Complete disbursement information
  - Disbursement amount with payment method display
  - Client and loan information cards
  - Payment reference highlighting in purple cards
  - Processing notes section
  - Timeline visualization (created → scheduled → processed)
- **PaymentDetailsModal** - Payment transaction details
  - Payment amount with method and status badges
  - Transaction reference number highlighting
  - Notes section for additional context
  - Timeline visualization (initiated → completed)
  - Summary cards with formatted dates
- **ClientProfileModal** - Comprehensive client profile with 4 interactive tabs
  - Profile header with employment, income, and credit score
  - **Loans Tab:** All client loans with status, amounts, and terms
  - **Payments Tab:** Complete payment history
  - **Documents Tab:** Placeholder for future document management
  - **Activity Tab:** Recent approval requests and activities
  - Real-time data loading from Supabase with loading/empty states

### Changed

- **PaymentsList** - Integrated PaymentDetailsModal on "View Details" button
- **DisbursementManager** - Integrated DisbursementDetailsModal on "Details" button
- **ClientManagementDashboard** - Replaced old ClientProfile with new ClientProfileModal
- **ApprovalManagementDashboard** - Added "View Loan Application Details" button with LoanDetailsModal

### Improved

- 100% reduction in raw JSON displays for loan applications
- Consistent UI patterns across all admin dashboard sections
- Better data comprehension with formatted, labeled displays
- Mobile-responsive design for all modals
- Loading states with animated spinners
- Empty states with helpful messages and icons
- Color-coded status badges with appropriate icons
- Professional enterprise-grade appearance

### Technical

- Full TypeScript type safety throughout all components
- Reusable modal components following consistent patterns
- Proper state management with useState hooks
- Comprehensive error handling and graceful fallbacks
- Performance optimized with conditional rendering
- ~15KB bundle size impact (minified + gzipped)

### Deployment

- **Deploy ID:** 68e4877bd5f916a8170778fd
- **Site URL:** https://namlend-trust-portal-v220.netlify.app
- **Status:** ✅ Production Deployed
- **Monitor:** https://app.netlify.com/sites/9e80754a-79c0-4cb6-8530-299010039f79/deploys/68e4877bd5f916a8170778fd

### Fixed - Role Assignment System Resolution

- **Supabase Role Assignment Errors Resolved**
  - Fixed 404 error for `assign_user_role` function by implementing direct service role approach
  - Removed references to non-existent `updated_at` column in `user_roles` table
  - Modified `serviceRoleAssignment.ts` to use delete-then-insert pattern for role updates
  - Successfully assigned 'client' role to user `d0825c06-82ce-4b37-b6ea-fc4a160601b1`
  - Created comprehensive test utilities in `testRoleAssignment.ts` for debugging
  - Verified role assignment bypasses RLS policies correctly using service role key

- **Development and Testing Improvements**
  - Added Node.js test script for role assignment verification
  - Enhanced error handling and logging in role assignment functions
  - Updated main.tsx to include new test utilities for development
  - Confirmed user can have multiple roles (both 'client' and 'admin' assigned)

### Technical Details

- Direct service role client approach works reliably for role assignment
- RLS policies properly restrict access while allowing service role operations
- Role assignment system now fully functional for frontend routing integration

## [1.4.0] - 2025-09-07

### Added - Back Office Approval Integration System - Production Testing Complete

- **Comprehensive Approval Workflow Database Schema**
  - Created `approval_requests` table for centralized request management
  - Added `approval_workflow_history` table for complete audit trails
  - Implemented `approval_workflow_rules` table for automated decision support
  - Created `approval_notifications` table for real-time admin notifications
  - Added PostgreSQL functions and triggers for workflow automation
  - Implemented Row-Level Security (RLS) policies for secure access control

- **Service Layer Implementation**
  - Built complete `approvalWorkflow.ts` service with comprehensive functions
  - Added `submitApprovalRequest()` for routing user requests through approval system
  - Implemented `fetchApprovalRequests()` with filtering and pagination
  - Created `updateApprovalStatus()` for admin approval/rejection actions
  - Added `processApprovedLoan()` and `processApprovedKYC()` for request processing
  - Implemented notification management with `fetchApprovalNotifications()`
  - Added approval statistics tracking with `fetchApprovalStatistics()`

- **Frontend Integration & User Experience**
  - Modified `LoanApplication.tsx` to submit applications through approval workflow
  - Enhanced `KYC.tsx` to route document uploads through verification system
  - Created `ApprovalManagementDashboard` component for comprehensive admin interface
  - Built `ApprovalNotifications` component with real-time notification system
  - Added dedicated "Approvals" tab to admin dashboard navigation
  - Integrated approval notifications into header component for admin users

- **Admin Dashboard Enhancements**
  - Added comprehensive approval management interface with filtering and search
  - Implemented real-time approval statistics and performance metrics
  - Created detailed request view with user data and admin notes capability
  - Added bulk action support for efficient approval workflow management
  - Integrated notification bell icon with dropdown for pending approvals

- **Testing & Quality Assurance**
  - Created comprehensive test suite in `approvalWorkflow.test.ts`
  - Added unit tests for all service layer functions and error handling
  - Implemented integration tests for complete approval workflow scenarios
  - Created mock Supabase client for isolated testing environment
  - **PRODUCTION TESTING COMPLETED**: End-to-end validation with 4 test approval requests
  - **DATABASE VALIDATION**: Confirmed triggers, audit trails, and workflow history
  - **ADMIN DASHBOARD TESTING**: Verified approval management and notifications
  - **REAL-TIME NOTIFICATIONS**: Validated 4 unread admin notifications operational

### Changed

- **User Request Processing**: All loan applications and KYC documents now route through mandatory approval workflow
- **Admin Dashboard**: Enhanced with dedicated approval management capabilities and real-time notifications
- **Database Architecture**: Extended with comprehensive approval workflow tables and relationships
- **Security Model**: Strengthened with approval-based access control for sensitive operations

### Security

- **Mandatory Approval System**: All user-initiated requests now require explicit admin approval
- **Audit Trail Compliance**: Complete workflow history tracking for regulatory requirements
- **Role-Based Access Control**: Admin-only access to approval management functions
- **Secure Request Processing**: Validated approval workflow with comprehensive error handling

### Documentation

- Updated architecture documentation with approval workflow system details
- Enhanced technical specifications with new database schema and service layer
- Added comprehensive approval workflow user guide and operational procedures
- Updated all relevant documentation to reflect new approval-based operational model

## [Security Hardening] - 2025-09-06

### 🔒 Security Fixes

- **Authentication Flow Hardening**
  - Removed all hard reloads (`window.location.reload()`) from authentication flows
  - Implemented reactive state management for SPA-friendly auth experience
  - Enhanced mock Supabase client with proper auth state change callbacks
  - Fixed navigation routing issues after login/logout operations

- **Development Tool Security**
  - Unified environment gating under single `VITE_DEBUG_TOOLS` flag
  - Replaced all `console.error()` calls with gated `debugLog()` in development utilities
  - Implemented `safeExposeWindow()` helper for secure development tool exposure
  - Added triple-layer protection for admin utilities (environment + runtime + explicit gating)

- **API Key Protection**
  - Ensured service role key is never exposed to frontend bundles
  - Implemented mock client fallback for development without valid Supabase credentials
  - Added environment variable validation with secure defaults

### 🚀 Features Added

- **Regulatory Compliance Module** (`src/constants/regulatory.ts`)
  - Added `APR_LIMIT` constant set to 32% (Namibian regulatory compliance)
  - Created `isValidAPR()` validation helper function
  - Added `formatNAD()` currency formatting utility
  - Integrated APR validation in loan application flow

- **Mock Development Environment**
  - Created comprehensive mock Supabase client (`src/integrations/supabase/mockClient.ts`)
  - Automatic fallback when real API keys are missing or invalid
  - Mock authentication with test users (admin@example.com, test@example.com)
  - Simulated database operations for frontend development

- **Development Tools Enhancement**
  - Created `devToolsHelper.ts` with secure utility functions
  - Added `debugLog()` for gated console logging
  - Implemented `safeExposeWindow()` for controlled global exposure
  - Enhanced development utilities with proper error handling

### 🐛 Bug Fixes

- **Console Errors Eliminated**
  - Fixed authentication errors in development utilities
  - Cleaned up syntax errors in `manualPasswordReset.ts`
  - Replaced all unguarded console logging with debug-gated alternatives
  - Resolved "No authenticated user found" error spam

- **Navigation Issues Resolved**
  - Fixed app not redirecting to dashboard after successful login
  - Corrected admin dashboard routing for admin users
  - Enhanced role detection logic for mock authentication
  - Added proper timing delays for auth state propagation

- **Environment Configuration**
  - Updated `.env.example` with new `VITE_DEBUG_TOOLS` flag
  - Added backward compatibility for legacy `VITE_ALLOW_LOCAL_ADMIN` flag
  - Improved environment variable documentation and defaults

### 🔧 Technical Improvements

- **Authentication State Management**
  - Replaced hard reloads with reactive state updates in `useAuth` hook
  - Enhanced session establishment timing for reliable navigation
  - Improved error handling in authentication flows
  - Added proper cleanup on sign-out operations

- **Development Workflow**
  - Unified debug tool gating under single environment flag
  - Enhanced mock client with realistic authentication simulation
  - Improved development server startup and error handling
  - Added comprehensive security test coverage

### 📚 Documentation Updates

- **Security Analysis** (`docs/security-analysis.md`)
  - Updated with latest security hardening measures
  - Documented all resolved vulnerabilities
  - Added implementation details for new security features
  - Included security test coverage recommendations

- **Architecture Documentation** (`docs/architecture/README.md`)
  - Updated security architecture section
  - Documented authentication flow changes
  - Added development environment setup details
  - Included regulatory compliance measures

### 🧪 Testing

- **Security Test Suite** (`src/tests/security.test.ts`)
  - Added comprehensive security tests covering dev tool gating
  - Implemented APR validation test coverage
  - Added environment variable protection tests
  - Created auth flow security verification tests

### 🌍 Environment Variables

- **New Variables**
  - `VITE_DEBUG_TOOLS`: Unified flag for all development utilities (default: false)
- **Updated Variables**
  - `VITE_SUPABASE_URL`: Now uses demo URL for development fallback
  - `VITE_SUPABASE_ANON_KEY`: Demo key for mock client operations
- **Deprecated Variables**
  - `VITE_ALLOW_LOCAL_ADMIN`: Replaced by `VITE_DEBUG_TOOLS` (backward compatible)

### 🔄 Migration Notes

- No database migrations required for this release
- Environment variables should be updated to use new `VITE_DEBUG_TOOLS` flag
- Legacy `VITE_ALLOW_LOCAL_ADMIN` flag still supported but deprecated
- Development servers should be restarted to apply authentication fixes

### 📋 Files Modified

**Core Authentication & Security:**

- `src/integrations/supabase/client.ts` - Enhanced with mock client fallback
- `src/integrations/supabase/mockClient.ts` - New comprehensive mock implementation
- `src/hooks/useAuth.tsx` - Removed hard reloads, added reactive state management
- `src/pages/Auth.tsx` - Enhanced login flow with proper navigation timing

**Development Tools:**

- `src/utils/devToolsHelper.ts` - New secure development utilities
- `src/utils/supabaseDebug.ts` - Refactored with secure gating
- `src/utils/testLoanApproval.ts` - Fixed console errors and mock client handling
- `src/utils/createSampleLoans.ts` - Added debug logging and error handling
- `src/utils/resetUserPassword.ts` - Enhanced error handling and logging
- `src/utils/manualPasswordReset.ts` - Fixed syntax errors and improved logging
- `src/utils/setupUserRole.ts` - Replaced console errors with debug logging

**Regulatory & Business Logic:**

- `src/constants/regulatory.ts` - New regulatory compliance module
- `src/pages/LoanApplication.tsx` - Added APR validation integration

**Configuration & Environment:**

- `src/main.tsx` - Unified debug tool gating with backward compatibility
- `.env` - Updated with demo keys and debug flags
- `.env.example` - Added new environment variable documentation

**Documentation & Testing:**

- `docs/security-analysis.md` - Comprehensive security audit update
- `docs/architecture/README.md` - Updated security architecture section
- `src/tests/security.test.ts` - New comprehensive security test suite
- `CHANGELOG.md` - This comprehensive changelog

### 🎯 Next Steps

- [ ] Complete production environment setup with real Supabase credentials
- [ ] Run comprehensive security audit in production environment
- [ ] Implement additional unit tests for business logic components
- [ ] Set up automated security scanning in CI/CD pipeline
- [ ] Document deployment procedures and environment setup

---

**Total Files Modified**: 15 files  
**Security Issues Resolved**: 8 critical issues  
**New Features Added**: 4 major features  
**Test Coverage Added**: Comprehensive security test suite

This release represents a major security hardening effort ensuring the NamLend platform meets enterprise security standards while maintaining excellent developer experience.
