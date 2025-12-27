# NamLend Trust Portal - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2025-12-27

### Fixed

#### Authentication
- **Auth Race Condition Fix** (`src/hooks/useAuth.tsx`)
  - Fixed page refresh causing momentary sign-out/redirect flash
  - Added `initialCheckComplete` ref to track session initialization state
  - Skip `INITIAL_SESSION` events from `onAuthStateChange` to prevent premature null session handling
  - Rely on `getSession()` for initial state, `onAuthStateChange` for subsequent changes

#### User Management Database Integration
- **RPC Type Mismatch Fix** (`get_profiles_with_roles_admin`)
  - Fixed `varchar(255)` to `text` type casting for email field
  - Migration: `fix_get_profiles_with_roles_admin_type_cast`

- **Audit Logs Query Fix** (`UserAuditLog.tsx`)
  - Changed `timestamp` → `created_at` (correct column name)
  - Changed `old_state`/`new_state` → `old_values`/`new_values`
  - Changed `entity_type`/`entity_id` → `table_name`/`record_id`

- **profiles_with_roles View Enhancement** (migration applied)
  - Added aggregated role columns: `roles[]`, `primary_role`, `is_admin`, `is_loan_officer`, `is_client`
  - Added `account_status` derived from `verified` field
  - Enables proper filtering and display in User Management dashboard

### Changed

#### User Import Wizard (`UserImportWizard.tsx`)
- Converted from modal overlay to inline tab content
- Cancel/X buttons now navigate back to "All Users" tab
- Added missing `Loader2` import
- Fixed app freeze issue when closing wizard

#### Role Management (`RoleManagement.tsx`)
- **View Users Dialog** - Replaced `window.alert()` popup with proper card-based dialog
  - Card layout for each user with avatar initials
  - Displays name, email, phone, and account status
  - Loading and empty state handling
  - User count in footer
  - Consistent with app design system

### Database Migrations
- `fix_get_profiles_with_roles_admin_type_cast` - Cast varchar to text in RPC
- `fix_profiles_with_roles_view` - Add aggregated role columns to view

### Technical Notes
- All User Management features now fully functional end-to-end
- Auth flow stable on page refresh
- TypeScript compiles without errors
- Dark mode contrast maintained across all updated components

---

## [3.0.0] - 2025-12-22

### Added

#### Admin Dashboard Configuration Panels
- **TigerBeetleConfig** (`src/pages/AdminDashboard/components/Settings/TigerBeetleConfig.tsx`)
  - Connection settings (cluster ID, addresses, replica count)
  - Outbox processing configuration (batch size, intervals, retry policies)
  - Reconciliation schedules and thresholds
  - Account structure configuration (codes, ledger IDs)
  - Connection test functionality with real-time feedback
  - Reset to defaults capability

- **SettlementConfig** (`src/pages/AdminDashboard/components/Settings/SettlementConfig.tsx`)
  - Settlement processing parameters (windows, batch sizes, cutoff times)
  - IPS integration settings (endpoint URLs, credentials, timeout configurations)
  - Reconciliation automation (schedules, tolerance thresholds, auto-matching)
  - Three-tab interface: Settlement, IPS Integration, Reconciliation

- **System Configuration Database** (`supabase/migrations/20251222050000_system_configuration.sql`)
  - `system_configuration` table for persistent admin settings
  - RLS policies restricting access to admins only
  - RPC functions: `get_system_config()`, `upsert_system_config()`, `reset_system_config()`
  - Seeded default configurations for TigerBeetle, Settlement, Reconciliation, and IPS

#### User Management Enhancements
- **Real-time Stats Cards** - Dashboard stats now fetch live data from database
  - Total users from `profiles` table
  - Active users (verified) count
  - Admin users from `user_roles` table
  - Pending actions from `approval_requests` table

- **Export Users** - CSV export functionality with user data from `profiles_with_roles` view

- **Add User Modal** - Form for inviting new users with role assignment

- **Advanced Filters Modal** - Multi-criteria filtering (role, status, search)

- **User Profile Database Integration** (`useUserProfile.ts`)
  - Real database queries to `profiles_with_roles` view
  - `updateUser()` function for saving profile changes
  - `suspendUser()` function for account suspension
  - Login count from `view_logs` table

- **User Audit Log Database Integration** (`UserAuditLog.tsx`)
  - Real-time queries to `audit_logs` table
  - Date range filtering (1d, 7d, 30d, 90d)
  - Action type filtering
  - Refresh and retry functionality
  - Error state handling

### Changed

- **Admin Dashboard Navigation** - Added TigerBeetle Ledger and Settlement tabs
- **UserProfile Component** - Save and Suspend buttons now persist to database
- **UserManagementDashboard** - Header buttons fully functional

### Database Migrations
- `20251222050000_system_configuration.sql` - System configuration table with RLS and RPCs

### Technical Notes
- All User Management components now use real database connections
- Configuration panels support loading, saving, resetting, and testing
- Toast notifications provide user feedback for all operations
- TypeScript compiles without errors

---

## [2.9.0] - 2025-12-14

### Added

#### IPS/IPP Settlement Processing Pipeline
- **Settlement Processing RPCs** - Complete pipeline for settlement runs:
  - `create_settlement_run()` - Creates settlement runs with auto-generated IDs
  - `ingest_ips_transactions_for_settlement()` - Ingests IPS disbursements into obligations
  - `compute_settlement_netting()` - Bilateral netting calculations
  - `generate_pacs009_batches()` - ISO 20022 pacs.009 XML file generation
  - `generate_settlement_reports()` - NTSL and Raw Data report generation
  - `process_settlement_run()` - Orchestrates complete pipeline
  - `mark_settlement_settled()` - Simulates NISS acceptance

- **Settlement Service Extensions** (`settlementService.ts`):
  - `createSettlementRun()`, `processSettlementRun()`, `ingestIPSTransactions()`
  - `computeNetting()`, `generatePacs009Batches()`, `generateSettlementReports()`
  - `markSettlementSettled()`, `getSettlementObligations()`, `getNetInstructions()`

- **React Query Hooks** (`useSettlement.ts`):
  - `useCreateSettlementRun` - Mutation for creating runs
  - `useProcessSettlementRun` - Mutation for processing
  - `useMarkSettlementSettled` - Mutation for settling
  - `useSettlementObligations`, `useNetInstructions`, `useSettlementWindows`

- **Enhanced Settlement UI** (`SettlementRunsList.tsx`):
  - "New Settlement Run" button with dialog
  - Date and window selection (SW1/SW2/SW3)
  - Auto-processing: ingest → netting → pacs.009 → reports → settle
  - Processing status indicators

- **Namibian Bank Participants Seeded**:
  - First National Bank Namibia (FIABORNANX)
  - Standard Bank Namibia (SBICNANX)
  - Nedbank Namibia (NEDSNANX)
  - Bank Windhoek (BWNANAMX)
  - NamLend Trust (NAMLNANX)

- **Demo Settlement Data**:
  - 3 IPS disbursement transactions (N$1,000 + N$4,000 + N$5,000)
  - Complete settlement run with obligations, net instructions, pacs.009 batches
  - NTSL and Raw Data reports with acknowledgements

### Database Migrations
- `20251214060000_settlement_processing.sql` - Settlement processing RPCs
- `20251214061000_seed_settlement_demo_data.sql` - Demo data seeding

---

## [2.8.0] - 2025-12-14

### Added

#### Dark Mode System
- **ThemeProvider** (`src/components/ThemeProvider.tsx`) - Context-based theme management with system preference detection
- **ModeToggle** (`src/components/ModeToggle.tsx`) - User-facing theme switcher component
- Theme preference persistence in localStorage

### Changed

#### Comprehensive Dark Mode Refactoring
- **124 files updated** for full dark mode compatibility
- Replaced all hardcoded gray colors with semantic tokens (`bg-muted`, `text-muted-foreground`, `bg-background`)
- Added `dark:` variants for all colored badges (success, warning, error, info)
- Updated all Admin Dashboard components:
  - Payment Management (CollectionsWorkqueue, DisbursementManager, PaymentScheduleViewer, etc.)
  - User Management (BulkUserOperations, PermissionMatrix, UserAuditLog, etc.)
  - Analytics (PortfolioAnalytics, RiskAnalysis, ComplianceReports, etc.)
  - Reconciliation (all settlement viewers and reports)
- Updated client-facing components (SelfServicePortal, ClientProfileDashboard, LoanStatusTimeline)
- Updated core pages (Dashboard, Auth, NotFound, ErrorBoundary)

### Fixed
- `SelfServicePortal.tsx` - Fixed corrupted JSX structure (missing Tabs/TabsList)
- `DisbursementDetailsModal.tsx` - Removed duplicate closing parenthesis syntax error

### Documentation
- Updated `DESIGN_SYSTEM.md` to v2.2.0 with Dark Mode Implementation section
- Updated `UI_UX_AUDIT_REPORT.md` with completion status

---

## [2.7.0] - 2025-12-12

### Added

#### IPS (Instant Payment System) Integration
- **IPSPaymentModal** - Multi-step payment modal (amount → VPA → confirm → process → result)
- **VPAInput** - VPA input component with format validation and server-side verification
- **IPSHistoryList** - Transaction history display for loans
- **IPSTransactionStatus** - Real-time status polling component
- **IPSDisbursementForm** - Admin disbursement via IPS
- **LoanDetails** page (`/loans/:id`) - Detailed loan view with IPS payment option

#### IPS Database Schema
- `ips_transactions` table - Stores all IPS payment transactions
- `ips_vpa_registry` table - User VPA (Virtual Payment Address) records
- `ips_api_logs` table - IPS API call logging for debugging/audit

#### IPS RPC Functions
- `initiate_ips_repayment` - Initiate loan repayment via IPS
- `initiate_ips_disbursement` - Initiate loan disbursement via IPS
- `get_ips_transaction_status` - Check transaction status

#### IPS Edge Function
- `ips-adapter` - Mock IPS API adapter for development/testing
  - POST `/pay` - Process payments
  - POST `/validate-vpa` - Validate VPA addresses
  - POST `/check-status` - Check transaction status

#### IPS React Query Hooks
- `useIPSPayment` - Initiates IPS payments/disbursements
- `useUserVPAs` - Manages user VPA records
- `useIPSTransactionStatus` - Polls transaction status

#### Settlement System (Admin)
- 13 settlement tables for BON reconciliation
- `ReconciliationDashboard` - Settlement run monitoring
- `Pacs009Viewer` - MNSB pacs.009 file viewer
- `NTSLReportViewer` - Net Settlement Report viewer
- `AdjustmentsViewer` - Dispute/chargeback management

#### E2E Test Coverage
- `ips-payment-flow.e2e.ts` - Full IPS payment flow tests
- `ips-adapter.e2e.ts` - Edge function API tests
- `ips-rpc.e2e.ts` - RPC function tests
- Added `data-testid` attributes to all IPS components

#### Documentation
- `IPS_IMPLEMENTATION.md` - Complete implementation guide
- `IPS_TESTING.md` - Testing guide
- `IPS_PRODUCTION_CHECKLIST.md` - Production readiness checklist
- Updated `IPP_INTEGRATION.md` with technical specifications

### Changed
- Payment page now includes IPS as primary payment option
- Updated FUNCTIONALITY_MAP with IPS status
- Updated SERVICES.md with IPS service documentation
- Updated ARCHITECTURE.md with IPS components

### Technical Notes
- IPS operates in **Mock Mode** by default for development
- Set `MOCK_MODE=false` for production IPS integration
- Requires BON PSP registration and certificates for production

---

## [2.6.0] - 2025-12-10

### Added

#### Payment System Enhancements
- **Settled Loans Tab** in Payment Management Dashboard for admin visibility
- **Settled Loans Card** in Payment Overview showing count and total collected
- **SettledLoansList Component** with search, filtering, and client details
- Settlement detection and automatic loan status transitions

#### Schema Alignment & Constants
- `/src/constants/loanStatuses.ts` - Centralized loan/payment status constants
  - `LOAN_STATUS`, `PAYMENT_STATUS`, `SCHEDULE_STATUS`, `DISBURSEMENT_STATUS`
  - `PAYABLE_STATUSES`, `ACTIVE_LOAN_STATUSES`, `CLOSED_LOAN_STATUSES`
  - Helper functions: `isPayableStatus()`, `isActiveLoan()`, `isClosedLoan()`
  - Status labels and colors for consistent UI
- `/src/constants/schemaReference.ts` - Database column reference documentation
  - Documents actual column names for all key tables
  - `getFullName()` helper for profile name handling
  - Common column name corrections mapping

#### New Components
- `NotificationCenter` - In-app notification bell with real-time updates
- `CreditScoreDisplay` - Visual credit score indicator
- `SelfServicePortal` - Client self-service features
- `DashboardSidebar` - Improved navigation sidebar
- `StatCard` - Reusable statistics card component
- `LoanStatusTimeline` - Visual loan status progression

#### New Services
- `creditScoring.ts` - AI-powered credit scoring (300-850 scale)
- `notificationService.ts` - Multi-channel notification delivery
- `paymentGateway.ts` - Payment provider integrations (MTC MoMo, TN Mobile, PayToday)
- `smsGateway.ts` - Africa's Talking SMS integration
- `whatsappGateway.ts` - Meta WhatsApp Business API integration

#### Edge Functions
- `payment-webhook` - Payment provider webhook handler
- `scheduled-tasks` - Cron job for reminders and overdue processing
- `send-sms` - Africa's Talking SMS delivery
- `send-whatsapp` - WhatsApp message delivery

#### Admin Dashboard Features
- `BatchOperations` - Bulk loan operations
- `CollectionsManagement` - Collections queue and activities
- `Loan360View` - Comprehensive loan detail view
- `CreditPolicyConfig` - Credit policy configuration

### Fixed

#### Database Schema Alignment
- Fixed `process_loan_payment` RPC column references:
  - `performed_by` → `user_id` (audit_logs)
  - `reason` → `transition_reason` (state_transitions)
  - `performed_by` → `triggered_by` (state_transitions)
- Fixed `useUserProfile.ts` - `full_name` → `first_name + last_name`
- Fixed `approvalWorkflow.ts` - `full_name` → `first_name + last_name`
- Fixed `BatchOperations.tsx` - FK join → separate queries
- Fixed `SettledLoansList.tsx` - FK join → separate queries

#### Database Improvements
- Added missing foreign key constraints:
  - `loans.user_id` → `auth.users.id`
  - `profiles.user_id` → `auth.users.id`
  - `payments.loan_id` → `loans.id`
  - `payment_schedules.loan_id` → `loans.id`
  - `disbursements.loan_id` → `loans.id`
- Added indexes on `loans.user_id` and `profiles.user_id`

### Changed

#### Performance Optimizations
- `Dashboard.tsx` - Parallel queries with `Promise.all()` (~60% faster)
- `usePaymentMetrics.ts` - Parallel queries with `Promise.all()`
- Dashboard load time reduced from 2300ms+ to ~800ms

#### Documentation
- Reorganized `/docs` with new structure
- Moved legacy docs to `/docs_old`
- Added comprehensive documentation files:
  - `API_REFERENCE.md`
  - `ARCHITECTURE.md`
  - `DATABASE_SCHEMA.md`
  - `DESIGN_SYSTEM.md`
  - `FUNCTIONALITY_MAP.md`
  - `SECURITY.md`
  - `SERVICES.md`
  - `TECHNICAL_DEBT.md`
  - `TESTING.md`

### Database Migrations
- `20251205_create_notification_system.sql`
- `20251206_create_collections_system.sql`
- `20251206_front_office_integrations.sql`
- `add_missing_foreign_keys` (applied via Supabase MCP)

---

## [2.5.0] - 2025-12-09

### Added
- Payment processing system with settlement detection
- Real-time balance calculation via `loan_balance_summary` view
- Payment progress tracking with percentages
- Quick pay buttons (monthly, full balance)
- Settlement celebration UI

### Fixed
- Loan application submission flow
- Approval workflow atomic transactions
- Disbursement lifecycle management

---

## [2.4.2] - 2025-11-30

### Added
- User management system
- Role-based access control (RBAC)
- Audit logging system

### Fixed
- Authentication flow improvements
- Dashboard data fetching

---

## Deployment

- **Production URL**: https://namlend-trust-portal-v220.netlify.app
- **GitHub**: https://github.com/DKTony/namlend-trust-portal-v220
- **Supabase Project**: puahejtaskncpazjyxqp (eu-north-1)

---

## Environment Variables

### Client-side (VITE_)
```
VITE_SUPABASE_URL=https://puahejtaskncpazjyxqp.supabase.co
VITE_SUPABASE_ANON_KEY=<public_anon_key>
VITE_RUN_DEV_SCRIPTS=false
VITE_DEBUG_TOOLS=false
VITE_ALLOW_LOCAL_ADMIN=false
```

### Server-side (Edge Functions)
```
AFRICASTALKING_API_KEY=<api_key>
AFRICASTALKING_USERNAME=<username>
SMS_SENDER_ID=NAMLEND
WHATSAPP_PHONE_NUMBER_ID=<phone_id>
WHATSAPP_ACCESS_TOKEN=<access_token>
PAYTODAY_WEBHOOK_SECRET=<secret>
MTC_MOMO_WEBHOOK_SECRET=<secret>
TN_MOBILE_WEBHOOK_SECRET=<secret>
```
