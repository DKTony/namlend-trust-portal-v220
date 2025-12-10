# NamLend Trust Portal - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
