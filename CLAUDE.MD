# CLAUDE.MD - AI Agent Context for NamLend Trust Platform

**Last Updated**: March 28, 2026
**Project Version**: 5.2.0 (Ontology Gap Closure)
**Status**: Backend Migrated to Convex — Type-safe (0 `as any` in Convex backend; ~20 remain in frontend) — Semantic domain events + event-driven projections + rules-as-data + ontology admin UI — Frontend service layer migration in progress

## Quick Project Summary

NamLend Trust is a loan management platform for the Namibian market. Built with React 18.3.1 + TypeScript frontend and **Convex** backend (migrated from Supabase in Feb 2026), featuring TigerBeetle financial ledger integration, comprehensive approval workflows, payment processing, and Neo-Fintech design system.

**Live URL**: https://namlend-trust-portal-v220.netlify.app
**Backend**: Convex (reactive document-relational database)
**Previous Backend**: Supabase PostgreSQL (eu-north-1) — retained for reference
**Design**: Neo-Fintech "Black Card" aesthetic with mobile-first approach

## Critical Constraints - READ FIRST

### Regulatory Requirements (HARD LIMITS)

1. **Maximum APR: 32%** - NEVER create or modify loans exceeding this limit (Namibian law)
2. **Currency: NAD** - Always format as `N$ X,XXX.XX` (Namibian Dollar)
3. **Data Retention: 7 years** - NEVER delete financial records or audit logs
4. **KYC Compliance** - All users must complete identity verification before loan approval

### Security Requirements (NON-NEGOTIABLE)

1. **Auth Guards** - Every Convex query/mutation with user data MUST call an auth guard (`assertAuthenticated`, `assertStaff`, `assertAdmin`, etc.) from `convex/lib/auth.ts`
2. **Audit Trails** - All financial operations MUST be logged via `convex/lib/audit.ts` helpers
3. **Role-Based Access** - Three roles: `client`, `loan_officer`, `admin` (stored in `userRoles` table)
4. **No Secret Exposure** - Convex environment variables (set via dashboard) are server-side only; `VITE_*` vars are client-side
5. **PII Protection** - Never log or expose personally identifiable information

### Architecture Constraints

1. **Mobile-First** - All UI must work on 375px width minimum
2. **Reactive Updates** - Use Convex `useQuery()` for automatic live data (no manual subscriptions)
3. **Guard-Protected Access** - All Convex functions must call appropriate auth guard before DB access
4. **Approval Workflow** - All loan operations require back office approval
5. **TigerBeetle Shadow Mode** - Financial ledger runs in shadow mode (records but doesn't control flow)
6. **Atomic Mutations** - Every Convex mutation is automatically transactional (serializable isolation)

## Technology Stack

```
Frontend:
- React 18.3.1 with TypeScript
- Vite 5.4.1 (build tool, runs on port 8080)
- TailwindCSS 3.4.11 + shadcn/ui components
- Convex React client (useQuery/useMutation for reactive data)
- TanStack Query 5.x (for non-Convex data, legacy)
- Zod 3.x for validation
- React Hook Form 7.x for forms
- Recharts 3.x for data visualization
- Lucide React for icons
- next-themes for dark mode

Backend (ACTIVE - Convex):
- Convex (reactive document-relational database)
- @convex-dev/auth (Password provider authentication)
- Schema: convex/schema.ts (55+ tables, ~1031 lines)
- Auth guards: convex/lib/auth.ts (replaces RLS)
- Queries, Mutations, Actions, Internal functions
- HTTP Router: convex/http.ts (webhooks, auth)
- Cron Jobs: convex/crons.ts (outbox worker, daily tasks)

Backend (LEGACY - Supabase, retained for reference):
- supabase/migrations/ (33 SQL migrations - INACTIVE)
- supabase/functions/ (18 Edge Functions - INACTIVE)
- src/services/ (25 service files - NEEDS MIGRATION to Convex)

Financial Ledger:
- TigerBeetle v0.16.67 (double-entry bookkeeping)
- Runs on 127.0.0.1:3001
- Shadow mode with outbox pattern (outbox in Convex DB)

Testing:
- Playwright 1.47.2 (E2E tests) - 45+ test files
- Custom test helpers in e2e/helpers/
- Global setup with seeded test data

Deployment:
- Netlify (frontend) - SPA mode with security headers
- Convex Cloud (backend) - auto-deploy via npx convex deploy
```

## Project Structure

```
namlend-trust-portal-v220-main/
├── convex/                # ⭐ ACTIVE BACKEND (Convex)
│   ├── schema.ts          # Database schema (67+ tables, SOURCE OF TRUTH)
│   ├── auth.ts            # Auth callbacks (afterUserCreatedOrUpdated)
│   ├── auth.config.ts     # Convex Auth provider config
│   ├── http.ts            # HTTP router (webhooks, auth routes)
│   ├── crons.ts           # Cron jobs (outbox, daily tasks, mandates, snapshots, rail health)
│   ├── lib/               # Shared utilities (auth, audit, regulatory, eventEmitter, temporal, railSelector, mandateStateMachine, institutionScope, relationshipEmitter)
│   ├── ontology/          # Financial Ontology Engine (10 files)
│   │   ├── eventJournal.ts      # Unified event stream with causality
│   │   ├── relationships.ts     # Entity knowledge graph (BFS traversal)
│   │   ├── mandates.ts          # Mandate lifecycle (debit order authorization)
│   │   ├── mandateExecutions.ts # Mandate execution tracking
│   │   ├── consentRecords.ts    # POPIA consent management
│   │   ├── institutions.ts      # Multi-institution model + config
│   │   ├── paymentRails.ts      # Payment rail registry + health
│   │   ├── products.ts          # Product definitions + versioning + eligibility
│   │   ├── accounts.ts          # Generalized ledger accounts
│   │   └── snapshots.ts         # Regulatory point-in-time snapshots
│   ├── loans.ts           # Loan queries + mutations (+ product validation, relationships)
│   ├── payments.ts        # Payment queries + mutations (+ relationships)
│   ├── disbursements.ts   # Disbursement state machine (+ rail selection, relationships)
│   ├── collections.ts     # Collections queue + interactions
│   ├── notifications.ts   # Notification lifecycle
│   ├── analytics.ts       # Portfolio analytics (staff-only)
│   ├── audit.ts           # Audit log queries + compliance
│   ├── users.ts           # User/profile management
│   ├── actions/           # External API actions (IPS, SMS, WhatsApp)
│   ├── scheduled/         # Cron handlers (outbox, daily tasks, mandateExecutor, snapshotGenerator, railHealthMonitor)
│   ├── ips/               # IPS domain (5 files)
│   ├── settlement/        # Settlement domain (10 files)
│   ├── tigerbeetle/       # TigerBeetle domain (4 files)
│   └── _generated/        # Auto-generated types (DO NOT EDIT)
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
│   ├── services/          # ⚠️ LEGACY Supabase services (25 files - NEEDS MIGRATION)
│   ├── hooks/             # Custom React hooks (14 files)
│   ├── context/           # React Context providers (ThemeContext, BrandingContext)
│   ├── types/             # TypeScript definitions (9 files)
│   ├── constants/         # App constants (regulatory, loanStatuses, schemaReference)
│   ├── utils/             # Utility functions (13 files — 19 dead Supabase dev tools deleted Mar 2026)
│   ├── integrations/      # External service integrations
│   │   ├── convex/        # Convex client + API re-exports (ACTIVE)
│   │   └── supabase/      # Supabase client & types (LEGACY)
│   └── lib/               # Third-party library configs (utils.ts for cn())
├── docs/                  # Comprehensive documentation (37+ files)
├── e2e/                   # Playwright E2E tests (45+ test files)
│   ├── helpers/           # Test helpers (auth.ts, admin.ts)
│   ├── api/               # API/RLS test files
│   └── unit/              # Unit test files
├── supabase/              # ⚠️ LEGACY - migrations (33) & edge functions (18)
│   ├── migrations/        # Timestamped SQL migrations (INACTIVE)
│   └── functions/         # Deno edge functions (INACTIVE)
├── scripts/               # Automation scripts (TigerBeetle init, link-check)
├── sql/                   # SQL utilities (schema verify, performance, fixes)
├── namlend-mobile/        # Mobile app (separate React Native project)
└── public/                # Static assets
```

## Key Files Reference

### Convex Backend Files (ACTIVE - Use These)

```
convex/
├── schema.ts               # Database schema (67+ tables, SOURCE OF TRUTH)
├── lib/auth.ts             # Auth guards (assertAuthenticated, assertStaff, etc.)
├── lib/audit.ts            # Audit log scheduling helper (bridges to event journal)
├── lib/regulatory.ts       # APR_LIMIT, isValidAPR, formatNAD
├── lib/eventEmitter.ts     # emitEvent() fire-and-forget helper
├── lib/temporal.ts         # effectiveAt(), asOf() temporal query helpers
├── lib/relationshipEmitter.ts  # emitRelationship() fire-and-forget helper
├── lib/domainEvents.ts         # Semantic domain events (loan.approved, etc.)
├── lib/projectionEmitter.ts    # Routes domain events to projection handlers
├── lib/ruleEvaluator.ts        # Reads business rules with typed fallbacks
├── lib/railSelector.ts     # selectOptimalRail() pure scoring function
├── lib/mandateStateMachine.ts  # Mandate state transition rules
├── lib/institutionScope.ts # withInstitution() tenant isolation filter
├── ontology/eventJournal.ts       # Unified event stream (writeEvent, getEventsByEntity, etc.)
├── ontology/relationships.ts      # Knowledge graph (createRelationship, getEntityContext, BFS)
├── ontology/mandates.ts           # Mandate lifecycle (create, authorize, suspend, revoke)
├── ontology/mandateExecutions.ts  # Mandate execution tracking + payment creation
├── ontology/consentRecords.ts     # POPIA consent CRUD
├── ontology/institutions.ts       # Institution CRUD + temporal config + seeding
├── ontology/paymentRails.ts       # Rail registry + health updates + seeding
├── ontology/products.ts           # Product definitions + versions + eligibility engine
├── ontology/accounts.ts           # Generalized ledger accounts (credit/debit/close)
├── ontology/snapshots.ts          # Regulatory point-in-time snapshots
├── ontology/businessRules.ts      # Business rules CRUD + seeding
├── projections/portfolioProjection.ts  # Event-driven portfolio metrics
├── loans.ts                # Loan CRUD + state transitions + product validation + relationships
├── payments.ts             # Payment processing + schedules + relationships
├── disbursements.ts        # Disbursement state machine + rail selection + relationships
├── approvalWorkflow.ts     # Approval queue + workflow + relationships
├── collections.ts          # Collections queue + interactions
├── notifications.ts        # In-app + queued notifications
├── analytics.ts            # Portfolio/revenue/risk analytics (staff-only)
├── audit.ts                # Audit logs + compliance reports
├── users.ts                # User/profile management
├── reconciliation.ts       # Bank reconciliation
├── actions/ipsAdapter.ts   # IPS outbound transfers + webhooks
├── actions/sendSms.ts      # Africa's Talking SMS
├── actions/sendWhatsapp.ts # Meta WhatsApp Business API
├── scheduled/tigerBeetleOutboxWorker.ts  # TB outbox polling
├── scheduled/dailyTasks.ts        # Overdue marking, PTP checks, notifications
├── scheduled/mandateExecutor.ts   # Daily: execute due mandates
├── scheduled/snapshotGenerator.ts # Daily: end-of-day portfolio snapshots
└── scheduled/railHealthMonitor.ts # 5-min: check rail availability
```

### Legacy Supabase Service Files (NEEDS MIGRATION)

```
src/services/               # ⚠️ These still reference Supabase client
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
convex/_generated/           # Auto-generated by Convex (DO NOT EDIT)
├── api.d.ts                # Typed API for all queries/mutations/actions
├── dataModel.d.ts          # Document types from schema.ts
└── server.d.ts             # Server function type helpers

src/integrations/convex/     # Convex client setup (ACTIVE)
├── client.ts               # ConvexReactClient instance
└── api.ts                  # Re-exported api from _generated

src/integrations/supabase/   # LEGACY - retained for reference
├── client.ts               # Supabase client instance (LEGACY)
├── adminClient.ts          # Admin client (LEGACY)
├── mockClient.ts           # Mock client for testing (LEGACY)
└── types.ts                # Database type definitions (LEGACY)
```

> **Note**: Convex provides end-to-end type safety automatically. Types are generated from
> `convex/schema.ts` on every `npx convex dev` or deploy. No manual type generation needed.
> The legacy `src/integrations/supabase/types.ts` is no longer the active type source.

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
# Frontend
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Convex Backend
npx convex dev           # Start Convex dev server (auto-syncs schema + functions)
npx convex deploy        # Deploy to Convex Cloud (production)
npx convex dashboard     # Open Convex dashboard in browser

# Testing
npm run dev:e2e          # Start dev server in E2E mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:headed  # Run E2E with browser UI
npm run test:e2e:ui      # Playwright UI mode

# Docs
npm run docs:lint        # Lint markdown docs
npm run docs:fix         # Auto-fix markdown lint issues
```

### Test Credentials (E2E)

```
Client User:       client1@test.namlend.com / Test1234! → /dashboard
Client User 2:     client2@test.namlend.com / Test1234! → /dashboard
Admin User:        admin@test.namlend.com / Test1234! → /admin
Loan Officer:      loan_officer@test.namlend.com / Test1234! → /admin
```

## Architecture Patterns

### Provider Stack (App.tsx)

```
ConvexProvider (Convex React client)
  → ConvexAuthProvider (Convex Auth session management)
    → ErrorBoundary
      → QueryClientProvider (TanStack Query - for non-Convex data)
        → ThemeProvider (shadcn default theme)
          → EnhancedThemeProvider (custom ThemeContext)
            → BrandingProvider (branding customization)
              → ThemeBackground
                → AuthProvider (useConvexAuth-based)
                  → TooltipProvider
                    → [Toasters - shadcn + Sonner]
                      → BrowserRouter
                        → AuthEventBridge (Convex-native, redirects on session loss)
                        → Routes
                      → ThemeSwitcher (floating toggle)
```

> **Note**: `AuthEventBridge` was migrated from Supabase `onAuthStateChange` to Convex-native `useConvexAuth()` in Feb 2026. The Supabase client import was removed from `App.tsx`.

### Authentication Flow

1. User signs in via Convex Auth (`@convex-dev/auth` Password provider)
2. `ConvexAuthProvider` manages reactive auth state (session-based, no JWT)
3. `ProtectedRoute` component guards routes (supports `requireAdmin`, `requireLoanOfficer`)
4. Role-based routing (`/dashboard` for clients, `/admin` for staff)
5. New users trigger `afterUserCreatedOrUpdated` callback → seeds `profiles` + `userRoles`

### Route Structure

```
/                   → Index (public landing page)
/auth               → Auth (login, signup, password reset via Convex Auth)
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

1. **Read**: `useQuery(api.module.fn)` → Convex query → auth guard → DB → reactive update
2. **Write**: `useMutation(api.module.fn)` → Convex mutation → auth guard → atomic DB write → audit log via scheduler
3. **Reactive**: All `useQuery()` calls auto-update when underlying data changes (no manual subscriptions)
4. **Financial**: Mutation → DB write + TigerBeetle outbox entry (same atomic tx) → cron worker posts to TB
5. **External APIs**: Convex actions (`actions/*.ts`) for IPS, SMS, WhatsApp — use `ctx.runMutation()` for DB writes

### Approval Workflow

```
Application → Under Review → Approved → Funded → Active
                    ↓
                Rejected (terminal state)
```

All transitions go through `convex/approvalWorkflow.ts` (Convex) or `src/services/approvalWorkflow.ts` (legacy).

### Payment Processing

1. Payment initiated via `useMutation(api.payments.recordPayment)` or webhook
2. Convex mutation validates, records payment, and inserts TigerBeetle outbox entry (same atomic tx)
3. Cron worker (`tb-outbox-worker`, every 30s) posts to TigerBeetle shadow ledger
4. Loan balance updated atomically within the mutation
5. Settlement detection on final payment (balance = 0 → status `paid_off`)

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

### Core Tables (Convex)

```
profiles              # User profiles (linked to Convex Auth users)
userRoles             # Role assignments (client/loan_officer/admin)
loans                 # Loan applications and lifecycle
loanDocuments         # Document attachments
approvalRequests      # Approval queue
approvalHistory       # Approval workflow history
disbursements         # Fund disbursement records
paymentTransactions   # Payment records
paymentSchedules      # Expected payment dates
tigerBeetleOutbox     # TigerBeetle outbox (shadow ledger sync)
auditLogs             # Complete audit trail
stateTransitions      # State change records
```

### Auth Guard Pattern (Replaces RLS)

Every Convex query/mutation must call an auth guard at the top:

```typescript
// convex/loans.ts
import { assertAuthenticated, assertStaff } from "./lib/auth";

// Clients see only their own data
export const getMyLoans = query({
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db.query("loans")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .collect();
  },
});

// Staff see all data
export const adminListLoans = query({
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query("loans").collect();
  },
});
```

### Schema Changes

- Schema defined in `convex/schema.ts` (single source of truth)
- Types auto-generate on `npx convex dev` or `npx convex deploy`
- No manual migrations needed — Convex handles schema evolution
- Add indexes inline: `.index("by_name", ["field1", "field2"])`

### Convex Server Functions (Replaces Edge Functions)

```
convex/
├── loans.ts                    # Loan management (replaces api-loans)
├── payments.ts                 # Payment operations (replaces api-payments)
├── disbursements.ts            # Disbursement operations (replaces api-disbursements)
├── users.ts                    # User management (replaces api-users)
├── analytics.ts                # Analytics queries (replaces api-analytics)
├── notifications.ts            # Notification operations (replaces api-notifications)
├── collections.ts              # Collections operations (replaces api-collections)
├── audit.ts                    # Audit logging (replaces api-audit)
├── reconciliation.ts           # Reconciliation (replaces api-reconciliation)
├── actions/ipsAdapter.ts       # IPS protocol adapter (replaces ips-adapter)
├── actions/sendSms.ts          # SMS delivery (replaces send-sms)
├── actions/sendWhatsapp.ts     # WhatsApp delivery (replaces send-whatsapp)
├── actions/sendNotification.ts # Multi-channel dispatch (replaces send-notification)
├── actions/processLoanApplication.ts  # Loan processing (replaces process-loan-application)
├── scheduled/tigerBeetleOutboxWorker.ts  # Ledger sync (replaces tigerbeetle-outbox-worker)
└── scheduled/dailyTasks.ts     # Daily maintenance (replaces scheduled-tasks)
```

## Common Tasks

### Adding a New Feature

1. Check existing Convex functions in `convex/` — don't duplicate
2. Add query/mutation in appropriate `convex/*.ts` file with auth guards
3. Create/update components in `src/components/`
4. Use `useQuery(api.module.fn)` / `useMutation(api.module.fn)` in components
5. Add E2E test in `e2e/`
6. Update documentation in `docs/`

### Modifying Loan Logic

1. **Read** `convex/loans.ts` and `convex/approvalWorkflow.ts` first
2. Check APR doesn't exceed 32% (`APR_LIMIT` in `convex/lib/regulatory.ts`)
3. Ensure audit logging via `convex/lib/audit.ts` helper
4. Add state transition to `stateTransitions` table
5. Insert TigerBeetle outbox entry if financial operation (same mutation)

### Adding Payment Methods

1. Update payment method validators in `convex/schema.ts`
2. Implement handler in `convex/payments.ts`
3. Add UI in `src/components/ips/`
4. Configure webhook handling in `convex/http.ts` + `convex/actions/ipsAdapter.ts`
5. Add E2E test for payment flow

### Database Schema Changes

1. Update `convex/schema.ts` (add table with `defineTable()` + validators + indexes)
2. Add auth guards in the corresponding query/mutation file
3. Types auto-regenerate on `npx convex dev` — no manual step needed
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

// CORRECT - use regulatory constant (server-side)
import { APR_LIMIT, isValidAPR } from "./lib/regulatory";
if (!isValidAPR(requestedAPR)) throw new ConvexError("Exceeds legal limit");

// CORRECT - use regulatory constant (client-side)
import { APR_LIMIT, isValidAPR } from '@/constants/regulatory';
```

### 2. Missing Auth Guards

```typescript
// WRONG - no auth guard, accessible by anyone
export const getAllLoans = query({
  handler: async (ctx) => {
    return ctx.db.query("loans").collect(); // UNPROTECTED!
  },
});

// CORRECT - auth guard enforces access
export const getAllLoans = query({
  handler: async (ctx) => {
    await assertStaff(ctx); // ← Guard REQUIRED
    return ctx.db.query("loans").collect();
  },
});
```

### 3. Missing Audit Logs

```typescript
// WRONG - no audit trail
export const approveLoan = mutation({
  handler: async (ctx, { loanId }) => {
    await ctx.db.patch(loanId, { status: "approved" });
  },
});

// CORRECT - includes audit via scheduler
import { scheduleAuditLog } from "./lib/audit";
export const approveLoan = mutation({
  handler: async (ctx, { loanId }) => {
    const old = await ctx.db.get(loanId);
    await ctx.db.patch(loanId, { status: "approved" });
    await scheduleAuditLog(ctx, {
      action: "UPDATE", entityType: "loans", entityId: loanId,
      oldState: old, newState: { ...old, status: "approved" },
    });
  },
});
```

### 4. External IO in Mutations

```typescript
// WRONG - mutations cannot make HTTP calls
export const sendSms = mutation({
  handler: async (ctx, args) => {
    await fetch("https://api.africastalking.com/..."); // WILL FAIL
  },
});

// CORRECT - use an action for external IO
export const sendSms = action({
  handler: async (ctx, args) => {
    await fetch("https://api.africastalking.com/...");
    await ctx.runMutation(internal.notifications.updateStatus, { ... });
  },
});
```

### 5. Currency Formatting

```typescript
// WRONG - lacks NAD formatting
<span>{amount}</span>

// CORRECT - uses NAD formatter
import { formatNAD } from '@/utils/currency';
// or
import { formatNAD } from '@/constants/regulatory';
<span>{formatNAD(amount)}</span>
```

### 6. Using Legacy Supabase Services

```typescript
// WRONG - still using Supabase client (LEGACY)
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('loans').select('*');

// CORRECT - use Convex queries
import { useQuery } from "convex/react";
import { api } from "@/integrations/convex/api";
const loans = useQuery(api.loans.getMyLoans);
```

## Debugging Tips

### Enable Debug Mode

```env
VITE_E2E=true               # E2E test mode
```

Legacy Supabase debug utilities (`VITE_DEBUG_TOOLS`, `VITE_RUN_DEV_SCRIPTS`) were removed in Mar 2026.
Use `npx convex dashboard` for data inspection and debugging.

### Check TigerBeetle Ledger

```bash
# View TigerBeetle accounts
curl http://localhost:3001/accounts

# Check recent transfers
curl http://localhost:3001/transfers
```

### Database Queries (Convex)

Use the Convex dashboard (`npx convex dashboard`) to inspect data. SQL queries above are stale (Supabase era). For programmatic debugging, use Convex queries:
- Loan approvals: `api.loans.getLoanWithHistory`
- Audit trail: `api.audit.getAuditLogs`
- TigerBeetle outbox: `api.tigerbeetle.outbox.getPendingEntries`

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
2. Check if functionality exists in `convex/` (backend) — don't duplicate
3. Verify regulatory constraints (APR, currency, data retention)
4. Ensure auth guards protect new queries/mutations
5. Plan audit logging for financial operations

### When Writing Code

1. **Backend**: Add queries/mutations in `convex/*.ts` with auth guards — NOT in `src/services/`
2. **Frontend**: Use `useQuery(api.module.fn)` and `useMutation(api.module.fn)` — NOT `supabase.from()`
3. Validate inputs with Convex validators (`v.string()`, etc.) in function `args`
4. Format currency with `formatNAD()` from `@/utils/currency` or `convex/lib/regulatory.ts`
5. Test on mobile viewport (375px minimum)
6. Add audit logs via `convex/lib/audit.ts` scheduler helpers
7. Follow Neo-Fintech design system
8. External HTTP calls go in `actions` only — never in queries or mutations

### When Stuck

1. Check `docs/AGENTS.md` for project-specific guidelines
2. Search `docs/` for related documentation (start with `docs/INDEX.md`)
3. Look for similar patterns in existing `convex/*.ts` files
4. Test theory with E2E test before implementing
5. Ask clarifying questions about regulatory requirements

## Security Checklist

Before submitting code, verify:

- [ ] Auth guards (`assertAuthenticated`, `assertStaff`, `assertAdmin`) protect all new queries/mutations
- [ ] No Convex environment variables exposed to frontend (only `VITE_*` vars are client-side)
- [ ] Audit logs scheduled via `convex/lib/audit.ts` for financial operations
- [ ] PII not logged or exposed in errors
- [ ] APR calculations don't exceed 32% (`convex/lib/regulatory.ts`)
- [ ] User input validated with Convex validators (`v.string()`, `v.number()`, etc.) in `args`
- [ ] External IO only in actions (never in queries or mutations)
- [ ] XSS prevention (React auto-escapes, avoid unsafe HTML rendering)

## Current Status (March 2026)

### Completed Features

- **Financial Ontology Engine** — 6-phase implementation complete (Mar 2026): event journal, mandate authorization, knowledge graph, multi-institution, payment rails, product engine. 12 new tables, 10 ontology modules, 6 lib helpers, 3 scheduled workers. See [ONTOLOGY_ENGINE.md](docs/ONTOLOGY_ENGINE.md)
- **Convex backend migration** — 67+ tables, auth guards, queries, mutations, actions
- **Convex backend type safety** — 132→0 `as any` casts in `convex/` directory; all Convex files fully typed (Feb 2026)
- **Frontend `as any` reduction** — 38→20 casts in `src/` (Mar 2026); remaining are in tests, legacy utils, and admin stubs
- Phase 1-4 implementation (all features)
- TigerBeetle financial ledger (shadow mode, outbox in Convex)
- IPP/IPN integration (ready for production)
- Payment processing (5 methods) with intelligent rail selection
- Credit scoring — server-side scoring via `processLoanApplication` action writes `creditScore`, `debtToIncomeRatio`, `recommendation` to `loans` table; AI-powered client-side engine in `creditScoring.ts`
- SMS/WhatsApp notifications (Africa's Talking + Meta Cloud API)
- Neo-Fintech UI redesign
- Comprehensive E2E tests (45+ test files)
- Netlify deployment with security headers

### Financial Ontology Engine (Mar 2026)

> See [ONTOLOGY_ENGINE.md](docs/ONTOLOGY_ENGINE.md) for the full implementation report.

**12 new tables**: `eventJournal`, `snapshots`, `relationships`, `mandates`, `mandateExecutions`, `consentRecords`, `institutions`, `institutionConfig`, `paymentRails`, `productDefinitions`, `productVersions`, `accounts`

**5 existing tables modified**: `loans` (+`productVersionId`), `disbursements` (+`railId`), `approvalRequests` (+`institutionId`), `paymentTransactions` (+`institutionId`), `mandates` (+`institutionId`)

**Key capabilities**:
- Unified event journal with causality tracking (`correlationId`/`causationId`) — **~95% mutation coverage** via audit bridge
- Entity knowledge graph with BFS traversal — **25 relationship emissions** across all core + ontology modules
- Mandate authorization lifecycle (debit orders, POPIA consent)
- Multi-institution tenant isolation
- Intelligent payment rail selection (cost/speed/availability/reliability scoring)
- Configurable financial product engine with immutable versioning and eligibility rules
- Generalized ledger accounts (loan_principal, loan_interest, savings, clearing, income, suspense)
- Regulatory snapshots (end-of-day/month/quarter/year)
- Correlation chain threading via `loans.correlationId` + `by_causationId` index on event journal

### Schema Additions (Feb 2026 Phase 2)

> See [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md#resolved-schema-issues-feb-2026-remediation) for full details.

- `loans.creditScore`, `loans.debtToIncomeRatio`, `loans.recommendation` — populated by `processLoanApplication` action after credit scoring
- `auditLogs.userId` and `stateTransitions.triggeredBy` are now **optional** — system-triggered events have no user context
- `settlementAcknowledgements` now has `by_batchId` and `by_runId` indexes
- `bankTransactions` now has `by_externalId` and `by_runId` indexes
- Corrected `settlementNetInstructions` field names: `sourceParticipantId` / `targetParticipantId` / `amount`

### Schema Additions (Mar 2026 — Ontology Adoption)

- `loans.correlationId` — optional string; tracks event chain across loan lifecycle mutations
- `eventJournal` — new `by_causationId` index for causation chain traversal
- Audit bridge (`convex/lib/audit.ts`) now accepts optional `correlationId`/`causationId` params for chain threading

### Known Limitations & Migration Gaps

**Critical (Pre-Production Blockers) — ALL RESOLVED (Feb 2026):**

- ~~`convex/auth.ts` callback inserts fields not in schema~~ — **FIXED**: Auth callback now inserts only schema-valid fields
- ~~`promiseToPay.status` mismatch~~ — **FIXED**: Code changed from `"fulfilled"` to `"kept"`
- ~~Missing `paymentSchedules.by_status` index~~ — **FIXED**: Index added to `schema.ts`
- ~~`notificationPreferences` table missing~~ — **FIXED**: Table added to `schema.ts`
- ~~`notifications`/`notificationQueue`/`collectionsInteractions` field mismatches~~ — **FIXED**: Schemas expanded
- ~~`markFunded`/`updateLoanBalance` exposed publicly~~ — **FIXED**: Converted to `internalMutation`
- ~~Analytics full-table scans~~ — **FIXED**: Capped with `.take(10000)` safety limits
- ~~`AuthEventBridge` still used Supabase~~ — **FIXED**: Replaced with Convex-native `useConvexAuth()`
- ~~37 `as any` casts in Convex backend~~ — **FIXED**: All eliminated; 0 remaining (Feb 2026)
- ~~`settlementNetting.ts` reading wrong field names~~ — **FIXED**: `sourceParticipantId`/`targetParticipantId`/`amount`
- ~~`CollectionsDashboard.tsx` duplicate `const` declarations~~ — **FIXED**: Stale `useState` bindings removed

**Migration In Progress:**

- `src/services/` (~25 files) still reference Supabase client — needs migration to Convex `useQuery`/`useMutation`
- `src/integrations/supabase/client.ts` retained for legacy hooks (`useSettlement`, `useBrandingConfig`, `useWorkflow`, `useUserVPAs`) + `serviceRoleAssignment.ts`; `adminClient.ts` and `mockClient.ts` deleted (Mar 2026)
- 19 dead Supabase dev utilities deleted (Mar 2026); `serviceRoleAssignment.ts` and `testUtils.ts` retained (active importers)

**Other Limitations:**

- TypeScript strict mode is disabled (`strict: false` in tsconfig.app.json)
- External API keys need production configuration
- WhatsApp templates need Meta registration
- Backoffice UI test coverage at ~30%
- TigerBeetle in shadow mode (not primary ledger yet)
- No CI/CD pipeline (no GitHub Actions configured for Convex deploy)
- Credit scoring UI: `creditScore`/`recommendation` data exists in DB but not displayed in approval review panel yet

### Next Priorities

1. **Seed ontology data** — run `seedNamLendTrust`, `seedDefaultRails`, `seedPersonalLoan` via Convex dashboard to populate institutions, rails, and products
2. **Ontology UI integration** — build admin views for institutions, payment rails, products, mandates, and relationship explorer
3. **Migrate frontend services** from Supabase to Convex hooks (`src/services/` → `useQuery`/`useMutation`)
4. **Wire credit scoring UI** — display `creditScore`, `debtToIncomeRatio`, `recommendation` in `Loan360View` and `LoanReviewPanel`
5. Increase E2E test coverage to 80%
6. Set up CI/CD pipeline (GitHub Actions + `npx convex deploy`)
7. Complete WhatsApp template registration
8. Production IPP/IPN onboarding
9. Transition TigerBeetle to primary ledger

## Emergency Contacts

- **Technical Issues**: Check `docs/TECHNICAL_DEBT.md`
- **Security Concerns**: Review `docs/SECURITY.md`
- **Deployment Issues**: See `docs/DEPLOYMENT_2026_01_06.md`
- **Testing Failures**: Consult `docs/TESTING.md`

## Version History

- **v5.2.0** (Mar 2026): **Ontology Gap Closure** — Semantic domain events (15 past-tense events in `domainEvents.ts`, wired into all lifecycle mutations), event-driven projections (`portfolioMetrics` table, 5 idempotent projection handlers, `projectionEmitter.ts`), rules-as-data (`businessRules` table with close-and-insert versioning, `ruleEvaluator.ts`, `getAPRLimit(ctx)`, rail weight params), ontology admin UI (3 new admin tabs: Institutions, Payment Rails, Products), credit scoring UI completion (real scores in Dashboard, AI reasoning in LoanReviewPanel), legacy cleanup (deleted dead `api-client.ts` + `useApiQueries.ts`). 9 files created, 12 files modified.
- **v5.1.0** (Mar 2026): **Ontology Adoption Complete** — Event journal coverage ~30%→~95% (10 mutations wired via audit bridge), relationship graph 13→25 emissions (collections, mandateExecutions, consentRecords, users, payments, approvalWorkflow), correlation chain infrastructure (loans.correlationId, by_causationId index, audit bridge threading, getEventsByCausation query). ~215 lines across 14 files.
- **v5.0.0** (Mar 2026): **Financial Ontology Engine** — 6-phase implementation: unified event journal with causality, mandate authorization + POPIA consent, entity knowledge graph with BFS traversal, multi-institution model, intelligent payment rail selection, configurable product engine with eligibility rules. 12 new tables, 10 ontology modules (`convex/ontology/`), 6 lib helpers, 3 scheduled workers, 3 new crons. Modified `loans.ts`, `payments.ts`, `disbursements.ts`, `approvalWorkflow.ts` with relationship emission + rail selection + product validation.
- **v4.1.0** (Mar 2026): **Tier 1 ship-blocking fixes** — financial idempotency guards (payments, disbursements, loans), N+1 query fix (`getMyPayments`), 15 dead admin buttons wired to Convex mutations, 3 new mutations (`batchUpdateLoanStatus`, `removeRole`, `deactivateUser`), 19 dead Supabase utils deleted, frontend `as any` 38→20, CLAUDE.MD accuracy corrections
- **v4.0.0** (Feb 2026): **Convex migration** — backend migrated from Supabase to Convex (55+ tables, auth guards, queries/mutations/actions, cron jobs, HTTP router)
- **v2.8.8** (Feb 2026): **Convex type safety complete** — 132→0 `as any` casts, exported schema validators, typed contexts, new internal exports (`recordCreditScore`, `createSystemApprovalRequest`, `getProfileByUserId`), schema bug fixes, `CollectionsDashboard` duplicate-const fix
- **v2.8.7** (Feb 2026): Convex `as any` Phase 1 — 132→37 casts removed (72% reduction)
- **v2.8.6** (Feb 2026): Settlement compliance hardening — XML injection prevention, audit, resilience
- **v2.8.0** (Jan 2026): Type safety remediation, 40 files fixed, 54 interfaces added
- **v2.7.0** (Dec 2025): TigerBeetle integration, Neo-Fintech redesign
- **v2.6.0** (Dec 2025): Payment fixes, schema alignment
- **v2.3.0** (Dec 2025): Phase 4 features, credit scoring
- **v2.0.0** (Nov 2025): Production release, security hardening

---

**Remember**: This is a production financial system handling real money. Every change must be tested, audited, and compliant with Namibian regulations. The backend now runs on Convex — all new server logic goes in `convex/`, not `supabase/` or `src/services/`. When in doubt, ask questions before making changes.
