# Enhancements & Improvements Roadmap

**Date**: February 14, 2026
**Based On**: Full codebase audit (structure, services, types, tests, config, docs)
**Current Version**: 2.8.4

## Executive Summary

NamLend Trust is a well-architected production lending platform with strong foundations in service design, error handling, and security-conscious patterns. This document identifies **42 enhancements** across 11 priority areas derived from a comprehensive codebase audit.

### Health Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Service Architecture | 8/10 | 25 services, good separation of concerns |
| Error Handling | 9/10 | Circuit breaker, offline queue, categorized errors |
| Security | 7/10 | RLS, audit logging in place; CSP headers missing |
| Documentation | 9/10 | 40+ docs, well-indexed |
| State Management | 8/10 | TanStack Query + Context API, clean patterns |
| Type Safety | 4/10 | Strict mode off, Database = any |
| Testing | 5/10 | 45+ E2E tests but no unit test framework |
| Performance | 5/10 | No code splitting, no bundle optimization |
| Developer Experience | 5/10 | No formatter, no pre-commit hooks |
| Internationalization | 0/10 | No i18n despite multi-language market |
| Mobile Experience | 6/10 | Hook exists but barely adopted |

---

## Priority 1: Production Readiness

Items that block or limit production use. Cross-references `docs/TECHNICAL_DEBT.md`.

### 1.1 Deploy Production IPS Adapter

**Status**: Mock implementation
**Impact**: Cannot process real IPS payments

The IPS adapter (`supabase/functions/ips-adapter/`) currently uses mock responses. Production deployment requires:

- Obtain Bank of Namibia IPS credentials and mTLS certificates
- Replace mock adapter with authenticated HTTPS calls
- Configure webhook endpoint for settlement notifications
- Run certification tests against IPS sandbox

**Reference**: `docs/IPP_INTEGRATION.md`, `docs/IPS_PRODUCTION_CHECKLIST.md`

### 1.2 Deploy TigerBeetle Cluster

**Status**: Shadow mode (simulated posting)
**Impact**: Financial ledger not recording real transactions

TigerBeetle runs in shadow mode via `src/services/ledgerService.ts` and the outbox worker at `supabase/functions/tigerbeetle-outbox-worker/`. To transition to primary ledger:

- Deploy TigerBeetle cluster (3-node minimum for production)
- Initialize accounts via `scripts/init-tigerbeetle-accounts.ts`
- Enable outbox worker to post real transfers
- Add reconciliation checks between Supabase and TigerBeetle balances
- Monitor for stuck outbox entries (see `docs/SETTLEMENT_INTEGRITY_REPORT.md`)

**Reference**: `docs/TIGERBEETLE_IMPLEMENTATION.md`, `docs/TIGERBEETLE_PRODUCTION.md`

### 1.3 Configure External API Keys

**Status**: Placeholder keys
**Impact**: SMS and WhatsApp notifications non-functional

| Service | Gateway File | Required Keys |
|---------|-------------|---------------|
| SMS | `src/services/smsGateway.ts` | Africa's Talking API key, username, sender ID |
| WhatsApp | `src/services/whatsappGateway.ts` | Meta Cloud API token, phone number ID, business account ID |

Additionally, WhatsApp message templates must be registered and approved by Meta before production use.

### 1.4 Wire Credit Scoring to Loan Decisions

**Status**: Built but disconnected
**Impact**: AI credit scoring exists but doesn't influence approval workflow

`src/services/creditScoring.ts` and `src/services/scoringRules.ts` implement a full scoring engine (300-850 range) with a declarative rule system. However, `src/services/approvalWorkflow.ts` does not call the scoring engine during loan evaluation.

**Action**: Integrate `calculateCreditScore()` into the approval workflow and display score in the `LoanReviewPanel` admin component.

---

## Priority 2: Type Safety & Code Quality

### 2.1 Enable TypeScript Strict Mode

**File**: `tsconfig.app.json` (lines 18-22)

All strict checks are currently disabled:

```json
"strict": false,
"noUnusedLocals": false,
"noUnusedParameters": false,
"noImplicitAny": false,
"noFallthroughCasesInSwitch": false
```

**Approach** (incremental):

1. Enable `noFallthroughCasesInSwitch: true` first (lowest friction)
2. Enable `noImplicitAny: true` and fix resulting errors
3. Enable `strict: true` (enables strictNullChecks, strictFunctionTypes, etc.)
4. Enable `noUnusedLocals` and `noUnusedParameters` last

**Estimated errors**: 200-400 on initial `strict: true` based on current `any` usage patterns.

### 2.2 Generate Proper Supabase Types

**File**: `src/integrations/supabase/types.ts` (line 30)

The database type is currently:

```typescript
export type Database = any;
```

This means every Supabase query returns untyped data. To fix:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Add this to CI (`.github/workflows/ci-web.yml`) to prevent type drift:

```yaml
- name: Check Supabase types are up to date
  run: |
    npx supabase gen types typescript --local > /tmp/types.ts
    diff src/integrations/supabase/types.ts /tmp/types.ts
```

### 2.3 Eliminate Remaining `any` Usage

Six service files still use `any` types:

| File | Usage |
|------|-------|
| `src/services/auditService.ts` | `Record<string, any>` for state fields |
| `src/services/whatsappGateway.ts` | API response types |
| `src/services/smsGateway.ts` | API response types |
| `src/services/paymentGateway.ts` | Generic payment data |
| `src/services/roleManagementService.ts` | Permission definitions |
| `src/services/workflowEngine.ts` | Dynamic workflow state |

**Action**: Replace with proper interfaces from `src/types/` or create new ones. For dynamic data, use `Record<string, unknown>` with runtime validation via Zod.

---

## Priority 3: Performance Optimization

### 3.1 Implement Route-Level Code Splitting

**File**: `src/App.tsx` (lines 9-18)

All 10 page components are imported synchronously, meaning the entire application is loaded upfront regardless of which page the user visits.

**Current** (all loaded at once):

```typescript
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
```

**Proposed** (loaded on demand):

```typescript
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const AdminDashboard = React.lazy(() => import("@/pages/AdminDashboard"));
```

Wrap routes with `<Suspense fallback={<LoadingSpinner />}>`. The `AdminDashboard` (75+ sub-components) is the biggest win since most users are clients who never visit `/admin`.

### 3.2 Configure Vite Bundle Optimization

**File**: `vite.config.ts`

The current config has no build optimization. Add:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* ... */],
        charts: ['recharts'],
        query: ['@tanstack/react-query'],
      }
    }
  }
}
```

Consider adding `rollup-plugin-visualizer` to monitor bundle size over time.

### 3.3 Optimize TanStack Query Cache Strategy

The current global staleTime (30s) is appropriate for most queries, but certain data could benefit from longer caching:

| Data Type | Suggested staleTime | Rationale |
|-----------|-------------------|-----------|
| User profile | 5 minutes | Rarely changes within a session |
| Loan statuses | 30 seconds | Current setting, appropriate |
| Admin config | 10 minutes | Changed infrequently |
| Branding/theme | 30 minutes | Nearly static |
| Payment history | 1 minute | May update via webhook |

Override per-query using `useQuery({ staleTime: ... })`.

---

## Priority 4: Testing Infrastructure

### 4.1 Configure Vitest for Unit Testing

**Problem**: CI workflow (`.github/workflows/ci-web.yml:57-58`) runs `npm test -- --run` but no `test` script exists in `package.json`, and no test runner is installed.

Two unit test files exist but have no runner:

- `src/tests/security.test.ts`
- `src/tests/approvalWorkflow.test.ts`

**Action**:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

Add to `package.json`:

```json
"test": "vitest",
"test:unit": "vitest run"
```

### 4.2 Expand Unit Test Coverage

Priority services for unit testing (high business logic, no UI dependency):

1. `src/services/approvalWorkflow.ts` — State machine transitions
2. `src/services/creditScoring.ts` — Score calculation accuracy
3. `src/services/scoringRules.ts` — Rule engine evaluation
4. `src/services/paymentService.ts` — Payment validation
5. `src/services/disbursementService.ts` — Disbursement logic
6. `src/utils/rpc.ts` — Circuit breaker behavior
7. `src/constants/regulatory.ts` — APR validation, currency formatting

### 4.3 Run Full E2E Suite in CI

Currently CI only runs API smoke tests (`e2e/api/`). The full 45+ test suite runs only locally.

**Action**: Add a full E2E job to `.github/workflows/ci-web.yml` that:

- Starts the dev server (`npm run dev:e2e`)
- Runs all Playwright tests
- Uploads HTML report as artifact
- Runs on `main` branch merges (not every PR, to manage cost)

### 4.4 Add Accessibility Testing

No accessibility testing is configured. Options:

- **In Vitest**: `jest-axe` for component-level a11y checks
- **In Playwright**: `@axe-core/playwright` for page-level a11y scans
- **In CI**: Add WCAG compliance check as non-blocking job

---

## Priority 5: Developer Experience

### 5.1 Add Code Formatter (Prettier)

No code formatter is configured, leading to inconsistent formatting across contributors.

```bash
npm install -D prettier eslint-config-prettier
```

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 5.2 Add Pre-Commit Hooks

No pre-commit hooks exist. Developers can commit unlinted code.

```bash
npm install -D husky lint-staged
npx husky init
```

Configure `lint-staged` in `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.md": ["markdownlint --fix"]
}
```

### 5.3 Add .editorconfig

Ensures consistent IDE settings across the team:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

### 5.4 Create CONTRIBUTING.md

New developers lack an onboarding guide. Document:

- Setup instructions (beyond CLAUDE.md which targets AI agents)
- Branch naming conventions
- Commit message format
- PR template and review process
- Code style expectations

---

## Priority 6: Security Hardening

### 6.1 Add Content-Security-Policy Header

**File**: `netlify.toml` (lines 26-34)

Current security headers are good (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) but missing CSP.

Add to `netlify.toml`:

```toml
Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co"
```

Test thoroughly as CSP can break functionality if too restrictive.

### 6.2 Use Placeholder Credentials in .env.example

**File**: `.env.example`

The file currently contains real Supabase project URL and anon key. While anon keys are designed to be public, best practice is to use placeholders:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6.3 Add Dependency Security Scanning

No automated dependency scanning is configured. Options:

- **GitHub Dependabot**: Enable in repository settings (free)
- **npm audit**: Add `npm audit --production` to CI pipeline
- **Snyk**: More comprehensive, free tier available

---

## Priority 7: Monitoring & Observability

### 7.1 Integrate External Error Tracking

The codebase has excellent internal error monitoring (`src/utils/errorMonitoring.ts`, `src/utils/errorHandler.ts`) with categorization, severity levels, and offline queuing. However, errors only persist to localStorage and Supabase.

**Recommendation**: Integrate Sentry for real-time alerting and stack trace aggregation.

```bash
npm install @sentry/react
```

Initialize in `main.tsx` before React renders. The existing `ErrorMonitor` class can forward critical errors to Sentry while keeping the local monitoring intact.

### 7.2 Add Health Check Endpoint

No health check exists for external uptime monitoring. Create an edge function (`supabase/functions/health/`) that verifies:

- Database connectivity (simple SELECT)
- Auth service status
- TigerBeetle connection (if applicable)

Return standardized JSON: `{ status: 'healthy', checks: { db: true, auth: true } }`

### 7.3 Structured Logging

Console.log is used throughout for development debugging. For production:

- Establish log levels (debug, info, warn, error)
- Use structured JSON format for log entries
- Route logs to a centralized service (Supabase `error_logs` table is a start)

### 7.4 Critical Error Alerting

`src/utils/errorMonitoring.ts` has `handleCriticalError()` but only logs to console. Wire critical errors to the notification service (`src/services/notificationService.ts`) to alert admins via SMS or email when production issues occur.

---

## Priority 8: Architecture Improvements

### 8.1 Split Oversized Components

Components exceeding 600 lines that should be refactored:

| Component | Lines | Suggested Split |
|-----------|-------|----------------|
| `src/components/BankingSection.tsx` | 997 | `IPSPaymentForm`, `IPSHistoryTable`, `BankAccountManager` |
| `src/pages/AdminDashboard/components/Settings/TigerBeetleConfig.tsx` | 813 | Extract tab panels into separate components |
| `src/pages/AdminDashboard/components/Settings/BrandingConfig.tsx` | 797 | `LogoUploader`, `ColorPicker`, `ThemePreview` |
| `src/pages/AdminDashboard/components/Settings/CreditPolicyConfig.tsx` | 709 | Extract form sections |
| `src/pages/AdminDashboard/components/BatchOperations/BatchOperations.tsx` | 707 | Extract wizard steps |
| `src/pages/LoanApplication.tsx` | 694 | Multi-step form with step components |
| `src/pages/AdminDashboard/components/Loan360/Loan360View.tsx` | 659 | `LoanOverviewTab`, `PaymentHistoryTab`, `DocumentsTab` |
| `src/components/ClientProfileDashboard.tsx` | 660 | Extract tab sections |

### 8.2 Standardize API Layer Usage

Two API patterns coexist:

1. **Direct Supabase queries**: `supabase.from('table').select(...)` in most services
2. **API client**: `src/services/api-client.ts` (793 lines) with retry, monitoring, typed interfaces

Services bypass the API client's retry logic, performance monitoring, and error standardization when using direct queries. Consider:

- Deprecating direct `supabase.from()` calls in service files
- Routing all data access through api-client methods
- Adding an ESLint rule to flag direct Supabase imports in components

### 8.3 Reorganize Component Directory

`src/components/` has 80+ files at root level. Suggested restructure:

```
src/components/
  ui/           (shadcn - keep as-is)
  layout/       (DashboardLayout, Header, ThemeSwitcher, ThemeBackground)
  forms/        (reusable form components)
  modals/       (LoanDetailsModal, PaymentDetailsModal, DisbursementDetailsModal)
  landing/      (existing, well-organized)
  ips/          (existing, well-organized)
  shared/       (ThemedButton, ThemedCard, HeroCard, PageHeader)
```

### 8.4 Fix Context Barrel Export

**File**: `src/context/index.ts`

Only exports ThemeProvider/useTheme but not BrandingProvider/useBranding, breaking the barrel export pattern. Add the missing exports.

### 8.5 Extract Auth Session Manager

`src/hooks/useAuth.tsx` (363 lines) contains complex session restoration logic with localStorage fallbacks and retry mechanisms. Extract the session management into a dedicated `src/services/authSessionManager.ts` to simplify the hook.

---

## Priority 9: Internationalization (i18n)

### 9.1 Current State

No i18n framework is installed. All UI strings are hardcoded in English. Namibia has multiple official languages including English, Afrikaans, German, and Oshiwambo.

### 9.2 Recommended Approach

```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

Create translation structure:

```
src/locales/
  en/
    common.json      (shared strings: loading, error, cancel, etc.)
    auth.json         (login, signup, password reset)
    loans.json        (loan-specific terminology)
    dashboard.json    (dashboard labels)
  af/                 (Afrikaans - second most common)
  de/                 (German)
```

### 9.3 Implementation Steps

1. Install and configure `react-i18next`
2. Extract strings from landing page first (highest user-facing impact)
3. Add language selector to `LandingNavbar` and user settings
4. Expand to auth flow, then dashboard, then admin
5. Ensure loan terms and regulatory disclosures are reviewed by certified translators

---

## Priority 10: Mobile Experience

### 10.1 Adopt useIsMobile Hook

**File**: `src/hooks/use-mobile.tsx` exists (768px breakpoint detection) but is barely used outside shadcn/ui internals.

Adopt across:

- **Client Dashboard**: Render card layout instead of tables on mobile
- **Admin Dashboard**: Responsive table alternatives (`MobileDataCard` pattern)
- **Loan Application**: Optimize multi-step form for mobile input
- **Payment Page**: Simplify payment flow for mobile

### 10.2 Mobile-Specific Admin Layouts

The admin dashboard tables (loan lists, payment lists, user management) are not optimized for mobile. Complex tables with 6+ columns need responsive alternatives:

- Stacked card layout for list views
- Bottom sheet pattern for detail views
- Simplified navigation (bottom tabs instead of sidebar)

### 10.3 Touch Target Compliance

Ensure all interactive elements meet the 44px minimum touch target size. Audit buttons, links, and form controls on 375px viewport.

---

## Priority 11: Documentation Improvements

### 11.1 Component Documentation

100+ components have no usage documentation. Options:

- **Storybook**: Visual component catalog with interactive examples
- **JSDoc**: Inline documentation for complex components (lower effort)
- Start with themed components (`ThemedButton`, `ThemedCard`, etc.) as they define the design system API

### 11.2 API Reference Alignment

Verify `docs/API_REFERENCE.md` matches the 10 API modules in `src/services/api-client.ts`:

- loans, users, payments, admin, analytics
- disbursements, collections, reconciliation, notifications, audit

### 11.3 Generate OpenAPI Spec

Extract endpoint definitions from `src/services/api-client.ts` and edge functions into a machine-readable OpenAPI 3.0 spec. This enables API documentation generation, client SDK generation, and contract testing.

### 11.4 Architecture Decision Records (ADRs)

Key decisions are scattered across docs. Consider consolidating into ADR format:

- Why TigerBeetle shadow mode instead of primary ledger
- Why TanStack Query mutation retry is disabled
- Why direct Supabase queries coexist with api-client
- Why TypeScript strict mode is disabled

---

## Appendix

### Files Referenced

| File | Section | Issue |
|------|---------|-------|
| `tsconfig.app.json` | 2.1 | Strict mode disabled (lines 18-22) |
| `src/integrations/supabase/types.ts` | 2.2 | `Database = any` (line 30) |
| `src/App.tsx` | 3.1 | Synchronous page imports (lines 9-18) |
| `.github/workflows/ci-web.yml` | 4.1 | Broken unit test job (lines 57-58) |
| `netlify.toml` | 6.1 | Missing CSP header (lines 26-34) |
| `src/components/BankingSection.tsx` | 8.1 | 997 lines, needs splitting |
| `src/hooks/use-mobile.tsx` | 10.1 | Exists but underused |
| `src/context/index.ts` | 8.4 | Missing BrandingProvider export |
| `src/services/creditScoring.ts` | 1.4 | Built but not wired to approvals |
| `.env.example` | 6.2 | Contains real credentials |

### Cross-Reference with Existing Docs

| This Document | Related Doc |
|---------------|-------------|
| Priority 1 (Production Readiness) | `docs/TECHNICAL_DEBT.md` items 1-4 |
| Priority 2 (Type Safety) | `docs/TYPE_SAFETY_REMEDIATION.md` |
| Priority 4 (Testing) | `docs/TESTING.md` |
| Priority 6 (Security) | `docs/SECURITY.md` |
| Priority 8.1 (Components) | `docs/UI_UX_AUDIT_REPORT.md` |
| Priority 8.2 (API Layer) | `docs/HANDOVER_API_MIGRATION.md` |
