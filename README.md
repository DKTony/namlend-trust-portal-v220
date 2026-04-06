# NamLend Trust — Loan Management Platform

**Version**: 4.0.0 (Convex Migration)
**Last Updated**: 2026-03-04
**Backend**: Convex (migrated from Supabase, February 2026)
**Design System**: Neo-Fintech / "Black Card" Aesthetic
**Live URL**: <https://namlend-trust-portal-v220.netlify.app>

> ⚠️ **Architecture note**: The backend was fully migrated from Supabase to Convex in February 2026. All server logic lives in `convex/`. The `src/services/` directory and `supabase/` directory are **legacy dead code** retained for reference only.

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Local Development

```bash
git clone <repository-url>
cd namlend-trust-portal-v220-main
npm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Edit `.env` — the only required variable for local development is:

```env
VITE_CONVEX_URL=https://aromatic-okapi-265.convex.cloud
```

Start the dev server:

```bash
npm run dev
# App runs at http://localhost:8080
```

### Environment Variables

| Variable               | Required | Description                                                         |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| `VITE_CONVEX_URL`      | ✅ Yes   | Convex deployment URL (from `npx convex dev` or dashboard)          |
| `VITE_DEBUG_TOOLS`     | No       | Set `true` only for local debugging. Keep `false` in production.    |
| `VITE_RUN_DEV_SCRIPTS` | No       | Set `true` to enable dev utilities. Keep `false` in production.     |
| `VITE_SENTRY_DSN`      | No       | Sentry error tracking DSN. Leave empty to disable.                  |
| `VITE_E2E`             | No       | Set by `npm run dev:e2e` for Playwright runs — do not set manually. |

Server-side secrets (SMS, WhatsApp, IPS, TigerBeetle) are **not** `VITE_` variables. Set them via:

```bash
npx convex env set AFRICASTALKING_API_KEY your_key
npx convex env set IPS_CLIENT_ID your_id
# etc — see .env.example for full list
```

---

## Available Scripts

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests
npm run test:e2e:ui  # Playwright interactive UI mode
npm run format       # Prettier format
```

---

## Running Tests

### Unit Tests

```bash
npm run test:unit
```

Tests live in `src/tests/`. Key test files:

| File                       | What it tests                                        |
| -------------------------- | ---------------------------------------------------- |
| `loanCalculations.test.ts` | Financial calculations (PMT, schedule, balance, DTI) |
| `regulatory.test.ts`       | APR limits, currency formatting                      |
| `creditScoring.test.ts`    | Credit score computation                             |
| `security.test.ts`         | Auth boundary patterns                               |

### End-to-End Tests

```bash
# Requires running dev server on port 8080
npm run dev:e2e &
npm run test:e2e

# Or interactive
npm run test:e2e:ui
```

E2E tests require credentials set in `.env`:

```env
E2E_ADMIN_EMAIL=admin@yourdomain.com
E2E_ADMIN_PASSWORD=yourpassword
```

---

## Architecture

```
React SPA (Vite + TypeScript)
  ↕ WebSocket (reactive queries + mutations)
  ↕ HTTPS (auth)
Convex Platform
  ├── Auth (@convex-dev/auth, Password provider)
  ├── Queries (reactive reads)
  ├── Mutations (atomic writes)
  ├── Actions (external APIs: IPS, SMS, WhatsApp, TigerBeetle)
  ├── HTTP Router (webhooks: /webhook/ips, /webhook/payment)
  └── Cron Jobs
       ├── tb-outbox-worker (every 30s)
       └── daily-maintenance (02:00 UTC)
```

**Key directories:**

```
convex/          Backend (source of truth for all server logic)
src/components/  Reusable UI components
src/pages/       Page components (Dashboard, AdminDashboard, etc.)
src/hooks/       Custom React hooks (useAuth, useKYCEligibility, etc.)
src/constants/   Regulatory constants (APR_LIMIT, currency)
src/utils/       Frontend utilities (loanCalculations, currency, etc.)
e2e/             Playwright E2E tests
docs/            Project documentation
```

---

## Regulatory Compliance

| Requirement            | Implementation                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Max APR 32% (NBFI Act) | Server-side: `convex/lib/regulatory.ts`; Client-side: `src/constants/regulatory.ts`. Both checked on every loan create/update. |
| Currency: NAD          | `formatNAD()` in `src/utils/currency.ts` — used throughout all UI                                                              |
| 7-year data retention  | No hard deletes on financial records in any Convex mutation                                                                    |
| Audit trails           | Every financial state change logged via `scheduleAuditLog()` in `convex/lib/audit.ts`                                          |

---

## User Roles

| Role           | Access                                                                       | Description                                  |
| -------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| `client`       | `/dashboard`, `/loans/*`, `/payment`, `/kyc`, `/budget`, `/loan-application` | Standard borrower                            |
| `loan_officer` | All client routes + `/admin/*`                                               | Reviews and processes loans                  |
| `admin`        | All routes                                                                   | Full system access including user management |

Role assignment is managed in the admin back-office under **User Management → Edit Profile → Role**.

---

## Known Limitations (Pre-Production)

1. **IPS/IPP production transport**: The live application path is implemented on Convex, but BON sandbox/production traffic still depends on external credentials, certificates, and transport setup. See `docs/IPS_PRODUCTION_CHECKLIST.md`.

2. **TigerBeetle ledger**: Running in shadow/simulation mode. Outbox pattern is fully wired but the worker does not connect to a live cluster. Set `TIGERBEETLE_ADDRESS` to enable.

3. **SMS/WhatsApp**: Requires `AFRICASTALKING_API_KEY` and `WHATSAPP_ACCESS_TOKEN` to deliver externally.

4. **Budget Tracker**: Uses illustrative sample transactions — not connected to live bank account data.

5. **TypeScript strict mode**: `tsconfig.app.json` has `strict: false`. Enabling strict mode is tracked as SW-1 in `docs/TECHNICAL_DEBT.md`.

---

## Documentation

| Document                                          | Description                                     |
| ------------------------------------------------- | ----------------------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)           | System architecture, auth model, data flows     |
| [FUNCTIONALITY_MAP.md](docs/FUNCTIONALITY_MAP.md) | Feature-to-API wiring status                    |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)     | All Convex tables and fields                    |
| [TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md)       | Open debt items and remediation steps           |
| [SWEEP_REPORT.md](docs/SWEEP_REPORT.md)           | Pre-UAT principal engineering quality sweep     |
| [FLOWS.md](docs/FLOWS.md)                         | Transaction flow diagrams                       |
| [AUDIT_REPORT.md](docs/AUDIT_REPORT.md)           | 2026-03-03 integration audit findings and fixes |

## 🚀 Current Status (April 2026)

### Core Platform ✅

- **Production Ready** - All critical security issues resolved
- **Back Office Integration** - Comprehensive approval workflow system
- **Mandatory Approval Flow** - All user requests route through admin approval
- **Authentication Working** - Reactive SPA-friendly auth flow
- **Security Hardened** - Comprehensive security audit passed
- **Payment System** - Complete payment processing with settlement detection
- **Schema Alignment** - Database-code consistency verified

### Phase 1-4 Implementation Complete ✅

- **✅ Phase 1**: Mobile-first design, Loan Calculator, Status Timeline, Notifications
- **✅ Phase 2**: Collections Dashboard, Promise-to-Pay, Self-Service Portal
- **✅ Phase 3**: Loan 360° View, Portfolio Analytics, Credit Policy Config, Batch Operations
- **✅ Phase 4**: Payment Gateway, SMS/WhatsApp Integration, AI Credit Scoring
- **✅ Database**: All Phase 4 tables deployed to production (9 new tables)
- **✅ v2.6.0**: Payment system fixes, schema alignment, settled loans visibility
- **✅ v2.7.0**: TigerBeetle financial ledger integration (shadow mode)

### TigerBeetle Financial Ledger ✅ (December 2025)

- **✅ TigerBeetle Server**: Running on `127.0.0.1:3001` (v0.16.67)
- **✅ 11 Global Accounts**: Clearing, Settlement, Income, Expense accounts initialized
- **✅ Shadow Ledger**: Double-entry bookkeeping with outbox pattern
- **✅ Service Integration**: disbursementService & paymentService post to ledger
- **✅ Reconciliation**: Automated comparison between Supabase and TigerBeetle

### UI/UX Refresh ✅ (December 2025)

- **✅ Neo-Fintech Design**: Zinc/Black palette with Electric Blue accents
- **✅ Mobile-First Layout**: Responsive design with collapsible sidebar navigation
- **✅ Split-Screen Auth**: Modern authentication page with brand panel
- **✅ Dashboard Redesign**: StatCards, CSS charts, Quick Actions panel

## 🔒 Security Features

- **Enterprise Authentication**: Supabase Auth with reactive state management
- **Role-Based Access Control**: Database-backed admin/client roles with RLS
- **API Key Protection**: Service keys never exposed to frontend
- **Mandatory Approval Workflow**: All user requests require back office approval
- **Comprehensive Audit Trail**: Complete workflow history for regulatory compliance
- **Real-time Admin Notifications**: Instant alerts for pending approvals and status changes
- **Development Security**: Triple-gated debug tools with secure logging
- **Regulatory Compliance**: 32% APR limit enforcement for Namibian market

## 🎯 Core Features

- **Secure Loan Management**: Complete lifecycle from application to repayment
- **Real-time Dashboard**: Live updates with role-based views (admin/client)
- **Document Management**: Secure upload and management of loan documents
- **Automated Workflows**: Streamlined approval processes and notifications
- **Payment Processing**: Settlement detection, payment schedules, quick-pay buttons
- **IPP/IPS Live Path**: Convex-backed payment, onboarding, alias validation, and status-check flows implemented for the shipped feature set

## 💳 Payment Integrations

| Provider        | Status         | Description                                                |
| --------------- | -------------- | ---------------------------------------------------------- |
| **IPP/IPS**     | ✅ Implemented | Convex live path; BON production credentials still pending |
| MTC MoMo        | ✅ Implemented | Mobile money payments                                      |
| TN Mobile       | ✅ Implemented | Telecom Namibia mobile money                               |
| PayToday        | ✅ Implemented | Online payment gateway                                     |
| Bank EFT        | ✅ Implemented | Traditional bank transfers                                 |
| **TigerBeetle** | ✅ Integrated  | Financial ledger for double-entry bookkeeping              |

> See [docs/IPP_INTEGRATION.md](./docs/IPP_INTEGRATION.md) for IPP integration details.
> See [docs/TIGERBEETLE_IMPLEMENTATION.md](./docs/TIGERBEETLE_IMPLEMENTATION.md) for ledger integration.

## 🛠 Technology Stack

- **Frontend**: React 18.3.1 with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time + RLS)
- **Financial Ledger**: TigerBeetle (OLTP double-entry bookkeeping)
- **Styling**: Tailwind CSS with Neo-Fintech design system
- **UI Components**: shadcn/ui with custom styling (rounded-3xl, shadow-soft)
- **Icons**: Lucide React
- **Build Tool**: Vite with optimized production builds
- **Deployment**: Netlify with automated deployments
- **Currency**: NAD (Namibian Dollar) with proper formatting
- **Payments**: IPP/IPS (Convex live path), Mobile Money, Online Gateway, TigerBeetle Ledger

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Development Setup

1. **Clone and Install**:

```bash
git clone <repository-url>
cd namlend-trust-main-3
npm install
```

2. **Environment Setup**:

```bash
cp .env.example .env
# The .env file is pre-configured with demo credentials for development
```

3. **Start Development Server**:

```bash
npm run dev
# App runs at http://localhost:8081
```

4. **Test Authentication**:

- **Regular User**: `test@example.com` / any password → `/dashboard`
- **Admin User**: `admin@example.com` / any password → `/admin`

### Production Setup

1. **Configure Real Supabase**:

```bash
# Update .env with your production Supabase credentials
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-key
VITE_DEBUG_TOOLS=false
```

2. **Deploy**:

````bash
### 5-Phase Loan Processing
1. **Application Submitted** - Initial loan application
2. **Under Review** - Admin assessment phase
3. **Approved** - Loan approved, awaiting funding
4. **Funded** - Loan disbursed to client
5. **Rejected** - Application declined

### Features
- Loan calculator with NAD currency
- Document upload and management
- Real-time status tracking
- Admin dashboard for loan approval
- Automated loan processing workflows

## 🛠️ Development

### Available Scripts
```sh
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
````

### Development Utilities

When `VITE_RUN_DEV_SCRIPTS=true`, the following utilities are available:

- Password reset testing (`window.directPasswordReset()`)
- Service role key debugging (`window.debugServiceKey()`)
- Supabase access testing (`window.testSupabaseAccess()`)
- Sample data creation and user role setup

## 📊 Database Schema

### Core Tables

- `users` - User authentication and profile data
- `user_roles` - Role assignments (client/admin)
- `loans` - Loan applications and status
- `loan_documents` - Document attachments
- `loan_approvals` - Approval workflow tracking

### Supabase Integration

- **Authentication**: Built-in user management
- **Database**: PostgreSQL with RLS
- **Edge Functions**: Loan processing automation
- **Storage**: Document management

## 🚀 Deployment

### Netlify Deployment

The project includes `netlify.toml` configuration:

```sh
npm run build
# Deploy dist/ folder to Netlify
```

### Environment Variables for Production

Ensure all `VITE_` prefixed environment variables are configured in your deployment platform.

## 📚 Documentation

- **[Technical Context](docs/context.md)** - Complete technical handover document
- **[Design System](docs/DESIGN_SYSTEM.md)** - Neo-Fintech UI/UX specification
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design
- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Database tables and relationships
- **[Services](docs/SERVICES.md)** - Backend services documentation
- **[Product Plan](docs/PRODUCT_IMPROVEMENT_PLAN.md)** - Feature roadmap (all phases complete)
- **[Security](docs/SECURITY.md)** - Security implementation details
- **[Testing](docs/TESTING.md)** - E2E testing guide

## 🔧 Recent Updates (v2.3.0 - December 2025)

### Phase 4 Database Deployment

- All Phase 4 tables deployed to production via Supabase MCP
- 9 new tables: notification_templates, notification_preferences, notification_queue, credit_scores, credit_score_factors, payment_transactions, payment_webhooks, communication_logs, whatsapp_conversations
- 7 new database functions for notifications and credit scoring
- RLS policies configured for all new tables
- 11 notification templates seeded

### Services Implemented

- **Payment Gateway**: Bank Transfer, MTC MoMo, TN Mobile, PayToday, Cash
- **SMS Gateway**: Africa's Talking integration with templates
- **WhatsApp Gateway**: Meta Cloud API integration
- **Credit Scoring**: AI-powered multi-factor scoring (300-850 scale)
- **Notification Service**: Multi-channel with real-time delivery

## 🐛 Known Issues

- External API keys need to be configured for production (payment/SMS/WhatsApp)
- WhatsApp templates need to be registered with Meta for production use
- Backoffice UI tests at 30% coverage - need data-testid attributes

## 📞 Support

For technical issues or questions, refer to the documentation in the `docs/` directory or check the project's issue tracker.
