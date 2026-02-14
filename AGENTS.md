# NamLend Trust - AI Agent Guidelines

## Project Overview

NamLend Trust is a digital lending platform serving the Namibian market. This codebase implements a full-stack loan management system with React frontend and Supabase backend.

## Critical Constraints

### Regulatory Requirements (NON-NEGOTIABLE)

- **Maximum APR: 32%** - Never create loans exceeding this limit
- **Currency: NAD** (Namibian Dollar) - Format as `N$ X,XXX.XX`
- **Data Retention: 7 years** - Never delete financial records
- **KYC Compliance** - All users must complete identity verification

### Security Requirements

- **Row-Level Security (RLS)** - Every table with user data MUST have RLS policies
- **Audit Trails** - All financial operations must be logged to `audit_logs`
- **Role-Based Access** - Respect the three roles: `client`, `loan_officer`, `admin`
- **Never expose** PII, financial data, or credentials in logs or errors

## Technology Stack

```
Frontend: React 18.3.1, TypeScript, TailwindCSS, shadcn/ui
Backend: Supabase (PostgreSQL 15+, Auth, Edge Functions)
Testing: Playwright E2E, Vitest unit tests
Deployment: Netlify (frontend), Supabase Cloud (backend)
```

## Key Commands

```bash
# Development
npm run dev              # Start dev server on port 5173
npm run build            # Production build
npm run typecheck        # TypeScript validation
npm run lint             # ESLint check

# Testing
npm run test:e2e         # Run Playwright E2E tests
npx playwright test --ui # Interactive test runner

# Database
npx supabase start       # Start local Supabase
npx supabase db push     # Apply migrations
npx supabase gen types typescript --local > src/types/supabase.ts
```

## File Structure Guidelines

```
src/
├── components/     # Reusable UI components (use shadcn/ui)
├── pages/          # Route components
├── services/       # Business logic & API calls
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── constants/      # Regulatory & app constants
└── context/        # React Context providers

supabase/
├── migrations/     # Database migrations (timestamped)
├── functions/      # Edge Functions (Deno)
└── config.toml     # Local Supabase config

e2e/
├── api/            # API/RPC tests
├── helpers/        # Test utilities
└── *.e2e.ts        # UI flow tests
```

## Code Style Preferences

- Use `async/await` over Promise chains
- Use Zod for runtime validation
- Use TanStack Query for server state
- Format currency with `N$` prefix and 2 decimal places
- Use existing services in `src/services/` - don't create new ones
- Follow Neo-Fintech design system (zinc/black with blue accents)

## Before Making Changes

1. Check if similar functionality exists in `src/services/`
2. Verify APR calculations don't exceed 32%
3. Ensure RLS policies cover new tables
4. Add audit logging for financial operations
5. Test on mobile viewport (mobile-first design)

## Important Files Reference

- `src/constants/regulatory.ts` - APR limits, currency settings
- `src/services/approvalWorkflow.ts` - Loan approval logic
- `src/services/disbursementService.ts` - Fund disbursement
- `docs/DATABASE_SCHEMA.md` - Complete schema reference
- `docs/ARCHITECTURE.md` - System architecture
