# CLAUDE.MD - AI Agent Context for NamLend Trust Platform

**Last Updated**: February 14, 2026
**Project Version**: 2.8.0
**Status**: Production-Ready Digital Lending Platform

## Quick Project Summary

NamLend Trust is a production-ready loan management platform for the Namibian market. Built with React 18.3.1 + TypeScript frontend and Supabase (PostgreSQL) backend, featuring TigerBeetle financial ledger integration, comprehensive approval workflows, payment processing, and Neo-Fintech design system.

**Live URL**: https://namlend-trust-portal-v220.netlify.app
**Database**: PostgreSQL 17+ (Supabase eu-north-1)
**Design**: Neo-Fintech "Black Card" aesthetic with mobile-first approach

## Critical Constraints - READ FIRST

### Regulatory Requirements (HARD LIMITS)

1. **Maximum APR: 32%** - NEVER create or modify loans exceeding this limit (Namibian law)
2. **Currency: NAD** - Always format as `N$ X,XXX.XX` (Namibian Dollar)
3. **Data Retention: 7 years** - NEVER delete financial records or audit logs
4. **KYC Compliance** - All users must complete identity verification before loan approval

### Security Requirements (NON-NEGOTIABLE)

1. **Row-Level Security (RLS)** - Every table with user data MUST have RLS policies
2. **Audit Trails** - All financial operations MUST be logged to `audit_logs` table
3. **Role-Based Access** - Three roles: `client`, `loan_officer`, `admin`
4. **Service Keys** - NEVER expose `VITE_SUPABASE_SERVICE_ROLE_KEY` to frontend
5. **PII Protection** - Never log or expose personally identifiable information

### Architecture Constraints

1. **Mobile-First** - All UI must work on 375px width minimum
2. **Real-time Updates** - Use Supabase real-time subscriptions for live data
3. **No Direct DB Access** - All database operations through RLS-protected tables or RPC functions
4. **Approval Workflow** - All loan operations require back office approval
5. **TigerBeetle Shadow Mode** - Financial ledger runs in shadow mode (records but doesn't control flow)

## Technology Stack

```
Frontend:
- React 18.3.1 with TypeScript
- Vite 5.4.1 (build tool, runs on port 8080)
- TailwindCSS 3.4.11 + shadcn/ui components
- TanStack Query 5.x (React Query) for server state
- Zod 3.x for validation
- React Hook Form 7.x for forms
- Recharts 3.x for data visualization
- Lucide React for icons
- next-themes for dark mode

Backend:
- Supabase (PostgreSQL 17+)
- Supabase Auth (authentication)
- Supabase Real-time (live updates)
- Row-Level Security (RLS)
- Edge Functions (Deno runtime) - 18 functions
- 54 database migrations

Financial Ledger:
- TigerBeetle v0.16.67 (double-entry bookkeeping)
- Runs on 127.0.0.1:3001
- Shadow mode with outbox pattern

Testing:
- Playwright 1.47.2 (E2E tests) - 45+ test files
- Custom test helpers in e2e/helpers/
- Global setup with seeded test data

Deployment:
- Netlify (frontend) - SPA mode with security headers
- Supabase Cloud (backend)
```

## Project Structure

```
namlend-trust-portal-v220-main/
├── src/
│   ├── components/         # React components (~150+ files)
│   │   ├── ui/            # shadcn/ui + custom themed components
│   │   ├── ips/           # IPS/IPP payment components
│   │   ├── Layout/        # Layout components (DashboardLayout, ThemeSwitcher, etc.)
│   │   └── landing/       # Landing page components
│   ├── pages/             # Route components (10 pages)
│   │   └── AdminDashboard/  # Back office (14 subdirectories, 75+ components)
│   │       ├── components/  # Domain-organized admin components
│   │       └── hooks/       # Admin-specific hooks (16 files)
│   ├── services/          # Business logic & API calls (25 services - CRITICAL)
│   ├── hooks/             # Custom React hooks (14 files)
│   ├── context/           # React Context providers (ThemeContext, BrandingContext)
│   ├── types/             # TypeScript definitions (9 files)
│   ├── constants/         # App constants (regulatory, loanStatuses, schemaReference)
│   ├── utils/             # Utility functions (29 files, mostly dev/debug tools)
│   ├── integrations/      # External service integrations
│   │   └── supabase/      # Supabase client, adminClient, mockClient & types
│   └── lib/               # Third-party library configs (utils.ts for cn())
├── docs/                  # Comprehensive documentation (37+ files)
├── e2e/                   # Playwright E2E tests (45+ test files)
│   ├── helpers/           # Test helpers (auth.ts, admin.ts)
│   ├── api/               # API/RLS test files
│   └── unit/              # Unit test files
├── supabase/              # Database migrations (54) & edge functions (18)
│   ├── migrations/        # Timestamped SQL migrations
│   └── functions/         # Deno edge functions
├── scripts/               # Automation scripts (TigerBeetle init, link-check)
├── sql/                   # SQL utilities (schema verify, performance, fixes)
├── namlend-mobile/        # Mobile app (separate React Native project)
└── public/                # Static assets
```

## Key Files Reference

### Critical Service Files (USE THESE - Don't Reinvent)

```
src/services/
├── approvalWorkflow.ts      # Loan approval state machine
├── loanService.ts           # Core loan CRUD operations
├── disbursementService.ts   # Fund disbursement (posts to TigerBeetle)
├── paymentService.ts        # Payment processing (posts to TigerBeetle)
├── paymentGateway.ts        # Payment gateway abstraction
├── settlementService.ts     # Payment settlement detection & matching
├── reconciliationService.ts # Transaction reconciliation
├── notificationService.ts   # Multi-channel notifications
├── creditScoring.ts         # AI-powered credit scoring (300-850)
├── scoringRules.ts          # Declarative credit scoring rule engine
├── smsGateway.ts            # Africa's Talking SMS gateway
├── whatsappGateway.ts       # Meta Cloud API WhatsApp gateway
├── ledgerService.ts         # TigerBeetle ledger interface
├── outboxService.ts         # Outbox pattern for TigerBeetle sync
├── auditService.ts          # Audit logging for compliance
├── ipsService.ts            # IPS/IPP payment system integration
├── ipsOnboardingService.ts  # IPP onboarding workflow
├── workflowEngine.ts        # Configurable workflow state machine
├── adminService.ts          # Admin-specific operations
├── clientService.ts         # Client profile & account management
├── collectionsService.ts    # Collections/debt recovery
├── financeService.ts        # Financial calculations & reporting
├── roleManagementService.ts # Role-based access control
├── brandingService.ts       # Branding/theming configuration
└── api-client.ts            # HTTP API client
```

### Important Constants

```
src/constants/
├── regulatory.ts           # APR_LIMIT (32), CURRENCY_CODE, formatNAD, isValidAPR
├── loanStatuses.ts         # Loan status definitions
└── schemaReference.ts      # Database schema reference constants
```

### Core Types

```
src/integrations/supabase/
├── client.ts               # Supabase client instance (anon key)
├── adminClient.ts          # Admin client (service role - server-side only)
├── mockClient.ts           # Mock client for testing
└── types.ts                # Database type definitions (permissive - see note below)
```

> **Note**: `types.ts` currently uses permissive `any` for the Database type. TypeScript strict mode
> is NOT enabled in `tsconfig.app.json` (`strict: false`, `noImplicitAny: false`). Full type safety
> requires generating types from a running Supabase instance:
> `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`

### Additional Type Files

```
src/types/
├── index.ts                # Type re-exports
├── loan.ts                 # Loan domain types
├── ips.ts                  # IPS/IPP payment types
├── settlement.ts           # Settlement & reconciliation types
├── services.ts             # Service layer type definitions
├── admin.ts                # Admin operation types
├── supabase.ts             # Database type definitions
├── theme.ts                # Theme configuration types
└── branding.ts             # Branding configuration types
```

### Custom React Hooks

```
src/hooks/
├── useAuth.tsx             # Authentication state & AuthProvider context
├── useSettlement.ts        # Settlement data & operations
├── useAudit.ts             # Audit log queries & mutations
├── useWorkflow.ts          # Workflow state management
├── useIPSPayment.ts        # IPS payment flow
├── useIPSTransactionStatus.ts  # IPS transaction status polling
├── useTigerBeetleBalance.ts    # TigerBeetle account balance
├── useUserVPAs.ts          # Virtual Payment Address management
├── useKYCEligibility.ts    # KYC compliance checking
├── useErrorHandler.ts      # Error handling utility
├── useApiQueries.ts        # API query management
├── useFetchActiveLoans.ts  # Active loans data fetching
├── use-toast.ts            # Toast notification hook (shadcn/ui)
└── use-mobile.tsx          # Mobile viewport detection
```

### Documentation (Read Before Making Changes)

```
docs/
├── INDEX.md                    # Start here - documentation index
├── QUICK_START.md              # Getting started guide
├── ARCHITECTURE.md             # System architecture overview
├── DATABASE_SCHEMA.md          # Complete database schema
├── SERVICES.md                 # Service layer documentation
├── SECURITY.md                 # Security implementation
├── DESIGN_SYSTEM.md            # UI/UX guidelines
├── UI_DESIGN.md                # UI design specifications
├── TESTING.md                  # E2E testing guide
├── API_REFERENCE.md            # API endpoint documentation
├── FLOWS.md                    # Data flow documentation
├── FUNCTIONALITY_MAP.md        # Feature to code mapping
├── IPP_INTEGRATION.md          # Bank of Namibia IPP integration
├── IPS_IMPLEMENTATION.md       # IPS system implementation
├── IPS_TESTING.md              # IPS testing procedures
├── IPS_PRODUCTION_CHECKLIST.md # IPS production readiness
├── TIGERBEETLE_IMPLEMENTATION.md   # Financial ledger setup
├── TIGERBEETLE_PRODUCTION.md       # TigerBeetle production config
├── TIGERBEETLE_MCP_SETUP.md        # TigerBeetle MCP integration
├── TYPE_SAFETY_REMEDIATION.md      # Type safety improvements
├── TECHNICAL_DEBT.md               # Technical debt register
├── AGENTS.md                       # AI agent guidelines
├── GLOSSARY.md                     # Terminology definitions
├── context.md                      # Complete technical handover
└── DEPLOYMENT_2026_01_06.md        # Deployment guide
```

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Copy environment file (pre-configured for demo)
cp .env.example .env

# Start development server
npm run dev  # Runs on http://localhost:8080
```

### Common Commands

```bash
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run dev:e2e          # Start dev server in E2E mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:headed  # Run E2E with browser UI
npm run test:e2e:ui      # Playwright UI mode
npm run docs:lint        # Lint markdown docs
npm run docs:fix         # Auto-fix markdown lint issues
```

### Test Credentials (E2E)

```
Client User:       client1@test.namlend.com / test123 → /dashboard
Client User 2:     client2@test.namlend.com / test123 → /dashboard
Admin User:        admin@test.namlend.com / test123 → /admin
Loan Officer:      loan_officer@test.namlend.com / test123 → /admin
```

## Architecture Patterns

### Provider Stack (App.tsx)

```
ErrorBoundary
  → QueryClientProvider (TanStack Query - no mutation retries for financial safety)
    → ThemeProvider (shadcn default theme)
      → EnhancedThemeProvider (custom ThemeContext)
        → BrandingProvider (branding customization)
          → ThemeBackground
            → AuthProvider (useAuth hook)
              → TooltipProvider
                → [Toasters - shadcn + Sonner]
                  → BrowserRouter
                    → AuthEventBridge (auth state listener)
                      → Routes
                    → ThemeSwitcher (floating toggle)
```

### Authentication Flow

1. User signs in via Supabase Auth
2. `AuthProvider` (in `src/hooks/useAuth.tsx`) manages reactive auth state
3. `ProtectedRoute` component guards routes (supports `requireAdmin`, `requireLoanOfficer`)
4. Role-based routing (`/dashboard` for clients, `/admin` for staff)

### Route Structure

```
/                   → Index (public landing page)
/auth               → Auth (login, signup, password reset)
/dashboard          → Dashboard (client - protected)
/loan-application   → LoanApplication (client - protected)
/payment            → Payment (client - protected)
/loans/:id          → LoanDetails (client - protected)
/kyc                → KYC (client - protected)
/budget             → BudgetTracker (client - protected)
/admin/*            → AdminDashboard (admin - protected, wildcard routing)
*                   → NotFound (404)
```

### Data Flow

1. **Read**: TanStack Query → Supabase RLS-protected tables
2. **Write**: Service layer → RPC function or RLS table → Audit log
3. **Real-time**: Supabase subscription → React state update
4. **Financial**: Service → Supabase + TigerBeetle (shadow mode)
5. **RPC Calls**: `src/utils/rpc.ts` provides circuit breaker + retry with jitter

### Approval Workflow

```
Application → Under Review → Approved → Funded → Active
                    ↓
                Rejected (terminal state)
```

All transitions go through `approvalWorkflow.ts` service.

### Payment Processing

1. Payment initiated (UI or external webhook)
2. `paymentService.ts` validates and records
3. Posts to TigerBeetle ledger (shadow mode) via `ledgerService.ts`
4. `settlementService.ts` detects and matches settlements
5. Loan balance updated via `updateLoanBalance()` RPC

### Admin Dashboard Structure

The admin dashboard (`/admin/*`) uses tab-based navigation with 14 domain areas:

| Domain | Key Components |
|--------|---------------|
| **Overview** | KPIMetrics, FinancialSummaryCards, RevenueChart, QuickActions |
| **LoanManagement** | LoanApplicationsList, LoanReviewPanel, LoanPortfolioOverview |
| **ApprovalManagement** | ApprovalManagementDashboard |
| **PaymentManagement** | PaymentOverview, DisbursementManager, CollectionsCenter, OverdueManager |
| **ClientManagement** | ClientProfile, ClientsList, CommunicationCenter, SupportTickets |
| **UserManagement** | UsersList, RoleManagement, PermissionMatrix, UserActivityMonitor |
| **Reconciliation** | IPSTransactionsViewer, SettlementRunsList, ReconciliationDashboard |
| **Analytics** | PortfolioAnalytics, PerformanceMetrics, RiskAnalysis, ReportGenerator |
| **Settings** | CreditPolicyConfig, TigerBeetleConfig, SettlementConfig, BrandingConfig |
| **WorkflowManagement** | WorkflowEditor, WorkflowStats |
| **TigerBeetle** | LedgerDashboard |
| **Loan360** | Loan360View |
| **IPPOnboarding** | IPPOnboardingDashboard |
| **BatchOperations** | BatchOperations |

## Design System

### Color Palette (Neo-Fintech)

```css
Primary: Zinc/Black (#000000, #18181B, #27272A)
Accent: Electric Blue (#0EA5E9)
Success: Emerald (#10B981)
Warning: Amber (#F59E0B)
Danger: Red (#EF4444)
Background: #0A0A0A
Card: #18181B with backdrop-blur
```

### UI Components

- Use shadcn/ui components from `src/components/ui/` (48 shadcn + 7 custom themed)
- Custom themed wrappers: `ThemedButton`, `ThemedCard`, `ThemedInput`, `ThemedTextarea`, `ThemedBadge`, `HeroCard`, `PageHeader`
- Border radius: `rounded-3xl` for cards, `rounded-xl` for buttons
- Shadows: `shadow-soft`, `shadow-medium`, `shadow-strong`, `shadow-glow` (in tailwind.config.ts)
- Typography: Inter (sans), Playfair Display (serif), Space Grotesk (mono)
- Icons: Lucide React

### Mobile-First Approach

- Design for 375px width minimum
- Test on mobile viewports
- Collapsible sidebar navigation (`use-mobile.tsx` hook)
- Touch-friendly tap targets (min 44px)

## Database Guidelines

### Core Tables

```
users                 # User profiles (linked to auth.users)
user_roles            # Role assignments (client/loan_officer/admin)
loans                 # Loan applications and lifecycle
loan_documents        # Document attachments
loan_approvals        # Approval workflow history
disbursements         # Fund disbursement records
payment_transactions  # Payment records
payment_schedules     # Expected payment dates
tigerbeetle_entries   # Financial ledger entries (shadow)
audit_logs            # Complete audit trail
```

### RLS Policies

Every table with user data has RLS enabled. Key patterns:

```sql
-- Clients see only their own data
CREATE POLICY "client_select_own" ON loans
  FOR SELECT USING (user_id = auth.uid());

-- Staff see all data for their role
CREATE POLICY "staff_select_all" ON loans
  FOR SELECT USING (is_staff(auth.uid()));

-- Only staff can insert/update
CREATE POLICY "staff_insert" ON loans
  FOR INSERT WITH CHECK (is_staff(auth.uid()));
```

### Migrations

- Located in `supabase/migrations/` (54 migrations as of Feb 2026)
- Named with timestamp: `YYYYMMDDHHMMSS_description.sql`
- Always include rollback logic
- Test locally before production deployment

### Edge Functions (Supabase)

```
supabase/functions/
├── api-admin/             # Admin operations API
├── api-loans/             # Loan management API
├── api-payments/          # Payment processing API
├── api-disbursements/     # Disbursement operations API
├── api-users/             # User management API
├── api-analytics/         # Analytics API
├── api-notifications/     # Notification API
├── api-collections/       # Collections API
├── api-audit/             # Audit logging API
├── api-reconciliation/    # Reconciliation API
├── ips-adapter/           # IPS protocol adapter
├── payment-webhook/       # Webhook handler
├── send-sms/              # Africa's Talking SMS
├── send-whatsapp/         # Meta Cloud API WhatsApp
├── send-notification/     # Multi-channel dispatcher
├── process-loan-application/  # Loan processing
├── tigerbeetle-outbox-worker/ # Ledger sync worker
├── scheduled-tasks/       # Cron-like scheduled tasks
└── _shared/               # Shared utilities (auth, audit, responses, router, validation)
```

## Common Tasks

### Adding a New Feature

1. Check existing services in `src/services/` - don't duplicate functionality
2. Create/update components in `src/components/`
3. Add service methods in `src/services/` if needed
4. Update types in `src/types/`
5. Add E2E test in `e2e/`
6. Update documentation in `docs/`

### Modifying Loan Logic

1. **Read** `src/services/approvalWorkflow.ts` first
2. Check APR doesn't exceed 32% (`APR_LIMIT` in `@/constants/regulatory`)
3. Ensure audit logging is included (`auditService.ts`)
4. Update `loan_approvals` table for state transitions
5. Post to TigerBeetle if financial operation (`ledgerService.ts`)

### Adding Payment Methods

1. Update `payment_methods` enum in database
2. Implement handler in `src/services/paymentService.ts`
3. Add UI in `src/components/ips/`
4. Configure webhook handling if applicable
5. Add E2E test for payment flow

### Database Schema Changes

1. Create migration in `supabase/migrations/`
2. Add RLS policies for new tables
3. Regenerate types: `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`
4. Add audit logging if financial data
5. Document in `docs/DATABASE_SCHEMA.md`

## Testing Strategy

### E2E Tests (Playwright)

```bash
# Run all tests
npm run test:e2e

# Run specific test
npx playwright test e2e/loan-application.e2e.ts

# Debug mode
npx playwright test --headed --project=chromium

# Interactive UI
npm run test:e2e:ui
```

### Test Helpers

Located in `e2e/helpers/`:
- `auth.ts` - Login/logout utilities, session persistence, data-testid selectors
- `admin.ts` - Admin route navigation, tab switching

Additional test infrastructure:
- `e2e/fixtures.ts` - Pre-authenticated Supabase clients per role
- `e2e/global-setup.ts` - Seeds test data (8 loans, 4 disbursements)
- `e2e/create-test-users.sql` - SQL to create test users
- `e2e/create-test-data.sql` - SQL to seed test data

### Test Categories

- **UI/Integration tests** (13): loan application, approvals, disbursement, IPS payments, routing
- **API/RLS tests** (16): disbursements, documents, IPS, admin RPCs, race conditions, TigerBeetle
- **Unit tests** (2): currency utilities, IPS utilities

### Playwright Configuration

- **Timeout**: 60s per test, 10s per expect
- **Workers**: 1 local / 2 CI (rate limiting prevention)
- **Browser**: Chromium only
- **Base URL**: `http://localhost:8080`
- **Global setup**: Seeds test loans and disbursements

### Coverage Goals

- Critical paths: 100% (auth, loan creation, payments)
- Admin workflows: 80%
- UI components: 30% (focus on business logic)

## Common Pitfalls

### 1. APR Calculation Errors

```typescript
// WRONG - might exceed 32%
const monthlyRate = annualRate / 12;

// CORRECT - use regulatory constant
import { APR_LIMIT, isValidAPR } from '@/constants/regulatory';
if (!isValidAPR(requestedAPR)) throw new Error('Exceeds legal limit');
```

### 2. Direct Database Access

```typescript
// WRONG - bypasses RLS
const { data } = await supabase.from('loans').select('*');

// CORRECT - respects RLS
const { data } = await supabase
  .from('loans')
  .select('*')
  .eq('user_id', userId);
```

### 3. Missing Audit Logs

```typescript
// WRONG - no audit trail
await supabase.from('loans').update({ status: 'approved' });

// CORRECT - includes audit via auditService
import { createAuditLog } from '@/services/auditService';
await createAuditLog({
  table_name: 'loans',
  action: 'UPDATE',
  old_data: oldLoan,
  new_data: newLoan
});
```

### 4. Service Key Exposure

```typescript
// WRONG - exposes service key to frontend
const client = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

// CORRECT - use anon key or server-side only
const client = createClient(url, import.meta.env.VITE_SUPABASE_ANON_KEY);
```

### 5. Currency Formatting

```typescript
// WRONG - lacks NAD formatting
<span>{amount}</span>

// CORRECT - uses NAD formatter (available in both locations)
import { formatNAD } from '@/utils/currency';
// or
import { formatNAD } from '@/constants/regulatory';
<span>{formatNAD(amount)}</span>
```

### 6. XSS Prevention

```typescript
// WRONG - rendering raw HTML from user input is unsafe
// Always sanitize if you must render HTML

// CORRECT - React auto-escapes by default
<div>{userInput}</div>

// If HTML rendering is needed, sanitize first with DOMPurify
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 7. RPC Calls Without Resilience

```typescript
// WRONG - no timeout, no retry, no circuit breaker
const { data, error } = await supabase.rpc('my_function', args);

// CORRECT - use the RPC utility with built-in resilience
import { callRpc } from '@/utils/rpc';
const result = await callRpc('my_function', args, { timeoutMs: 3000, retries: 1 });
if (result.ok) { /* use result.data */ }
```

## Debugging Tips

### Enable Debug Mode

```env
VITE_DEBUG_TOOLS=true       # Enables window.debug* utilities
VITE_RUN_DEV_SCRIPTS=true   # Loads development utilities (sample data, test scripts)
VITE_E2E=true               # E2E test mode (disables debug tools)
```

Available in browser console (when debug tools enabled):
- `window.directPasswordReset()` - Test password reset
- `window.debugServiceKey()` - Check service key config
- `window.testSupabaseAccess()` - Verify Supabase connection

### Check TigerBeetle Ledger

```bash
# View TigerBeetle accounts
curl http://localhost:3001/accounts

# Check recent transfers
curl http://localhost:3001/transfers
```

### Database Queries

```sql
-- Check loan approval state
SELECT id, status, current_stage
FROM loan_approvals
WHERE loan_id = 'LOAN_ID';

-- Audit trail for loan
SELECT * FROM audit_logs
WHERE table_name = 'loans'
AND record_id = 'LOAN_ID'
ORDER BY created_at DESC;

-- TigerBeetle reconciliation
SELECT * FROM tigerbeetle_entries
WHERE status = 'pending_sync'
ORDER BY created_at DESC;
```

## Key Documentation to Read

For specific tasks, consult these docs:

| Task | Documentation |
|------|---------------|
| **Start here** | `docs/INDEX.md` |
| Quick start guide | `docs/QUICK_START.md` |
| Understanding system design | `docs/ARCHITECTURE.md` |
| AI agent guidelines | `docs/AGENTS.md` |
| Terminology/glossary | `docs/GLOSSARY.md` |
| Database changes | `docs/DATABASE_SCHEMA.md` |
| API endpoints | `docs/API_REFERENCE.md` |
| Data flows | `docs/FLOWS.md` |
| Feature mapping | `docs/FUNCTIONALITY_MAP.md` |
| Payment integration | `docs/IPP_INTEGRATION.md` |
| IPS implementation | `docs/IPS_IMPLEMENTATION.md` |
| TigerBeetle ledger | `docs/TIGERBEETLE_IMPLEMENTATION.md` |
| UI/UX changes | `docs/DESIGN_SYSTEM.md` |
| Security concerns | `docs/SECURITY.md` |
| Writing tests | `docs/TESTING.md` |
| Service layer | `docs/SERVICES.md` |
| Type safety | `docs/TYPE_SAFETY_REMEDIATION.md` |
| Technical debt | `docs/TECHNICAL_DEBT.md` |
| Complete context | `docs/context.md` |

## AI Agent Best Practices

### Before Making Changes

1. Read relevant documentation in `docs/`
2. Check if functionality exists in `src/services/` (25 services available)
3. Verify regulatory constraints (APR, currency, data retention)
4. Ensure RLS policies cover data access
5. Plan audit logging for financial operations

### When Writing Code

1. Use existing service methods - don't reinvent the wheel
2. Avoid introducing `any` types - use proper interfaces from `src/types/`
3. Use Zod for runtime validation
4. Format currency with `formatNAD()` from `@/utils/currency`
5. Test on mobile viewport (375px minimum)
6. Add audit logs for financial operations via `auditService.ts`
7. Follow Neo-Fintech design system
8. Use `callRpc()` from `@/utils/rpc` for Supabase RPC calls (includes circuit breaker)

### When Stuck

1. Check `docs/AGENTS.md` for project-specific guidelines
2. Search `docs/` for related documentation (start with `docs/INDEX.md`)
3. Look for similar patterns in existing code
4. Test theory with E2E test before implementing
5. Ask clarifying questions about regulatory requirements

## Security Checklist

Before submitting code, verify:

- [ ] RLS policies protect new/modified tables
- [ ] No service keys exposed to frontend
- [ ] Audit logs created for financial operations
- [ ] PII not logged or exposed in errors
- [ ] APR calculations don't exceed 32%
- [ ] User input validated with Zod
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (React auto-escapes, avoid unsafe HTML rendering)

## Current Status (February 2026)

### Completed Features

- Phase 1-4 implementation (all features)
- TigerBeetle financial ledger (shadow mode)
- IPP/IPN integration (ready for production)
- Payment processing (5 methods)
- Credit scoring (AI-powered, declarative rule engine)
- SMS/WhatsApp notifications (Africa's Talking + Meta Cloud API)
- Neo-Fintech UI redesign
- Comprehensive E2E tests (45+ test files)
- Production security audit
- Netlify deployment with security headers

### Known Limitations

- TypeScript strict mode is disabled (`strict: false` in tsconfig.app.json)
- Database types use permissive `any` (requires generated types for full safety)
- External API keys need production configuration
- WhatsApp templates need Meta registration
- Backoffice UI test coverage at ~30%
- TigerBeetle in shadow mode (not primary ledger yet)
- No CI/CD pipeline (no GitHub Actions configured)

### Next Priorities

1. Enable TypeScript strict mode and generate proper Supabase types
2. Increase E2E test coverage to 80%
3. Set up CI/CD pipeline (GitHub Actions)
4. Complete WhatsApp template registration
5. Production IPP/IPN onboarding
6. Transition TigerBeetle to primary ledger
7. Advanced analytics dashboard

## Emergency Contacts

- **Technical Issues**: Check `docs/TECHNICAL_DEBT.md`
- **Security Concerns**: Review `docs/SECURITY.md`
- **Deployment Issues**: See `docs/DEPLOYMENT_2026_01_06.md`
- **Testing Failures**: Consult `docs/TESTING.md`

## Version History

- **v2.8.0** (Jan 2026): Type safety remediation, 40 files fixed, 54 interfaces added
- **v2.7.0** (Dec 2025): TigerBeetle integration, Neo-Fintech redesign
- **v2.6.0** (Dec 2025): Payment fixes, schema alignment
- **v2.3.0** (Dec 2025): Phase 4 features, credit scoring
- **v2.0.0** (Nov 2025): Production release, security hardening

---

**Remember**: This is a production financial system handling real money. Every change must be tested, audited, and compliant with Namibian regulations. When in doubt, ask questions before making changes.
