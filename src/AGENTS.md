# Web Platform Agent Instructions

## Project Context
- **Platform**: NamLend Trust - Loan Management Platform for Namibian Market
- **Stack**: React 18.3.1 + TypeScript 5.5.3 + Vite 5.4.1
- **Backend**: Supabase (PostgreSQL, GoTrue Auth, PostgREST, Storage)
- **Styling**: TailwindCSS 3.4.11 + shadcn/ui
- **State Management**: TanStack Query 5.56.2 (server state), React Context (auth)
- **Deployment**: Netlify (auto-deploy on push to main)

## Regulatory & Business Rules
- **Currency**: NAD (Namibian Dollar) - ALWAYS use NAD
- **APR Limit**: 32% maximum (Namibian regulatory requirement)
- **Compliance**: Maintain complete audit trails for all financial operations
- **Security**: 7-layer security model (Network → Auth → Route Guards → API → RLS → DB → Audit)

## Architecture Principles

### Database & RLS (NON-NEGOTIABLE)
- **RLS is mandatory** on ALL tables - never bypass or disable
- Row-Level Security is the ultimate authority for data access
- All financial operations MUST use RPC functions with SECURITY DEFINER
- Never expose service role keys to browser/client
- Query database for actual IDs, never hardcode UUIDs

### Financial Data Handling
- **DECIMAL type only** for all monetary amounts (never float/number)
- **Idempotency keys** required for all payment/disbursement operations
- **Atomic transactions** for multi-step financial operations
- **Immutable audit trails** - never delete, only soft delete with audit log
- **Status machines** must be explicit and validated
- Before/after state logging for all financial changes

### Code Quality Standards
- **Design System**: Neo-Fintech aesthetic (Zinc/Black palette)
- **Theme Variables**: Use semantic variables ONLY
  - Text: `text-foreground`, `text-muted-foreground`
  - Backgrounds: `bg-background`, `bg-card`, `bg-muted`
  - Borders: `border-border`, `border-input`
  - Dark mode: Add `dark:` variants for all color utilities
- **Never use hardcoded colors** like `bg-white`, `text-gray-900`, `bg-zinc-50`
- **Component patterns**: Use shadcn/ui components, maintain consistency
- **Testing**: Add `data-testid` attributes for E2E tests (Playwright)

### Service Layer Patterns
- Use existing services in `/src/services/`:
  - `disbursementService.ts` - Disbursement lifecycle
  - `paymentService.ts` - Payment processing, settlement detection
  - `ledgerService.ts` - TigerBeetle double-entry accounting
  - `settlementService.ts` - IPS/IPP settlement pipeline
  - `auditService.ts` - Audit logging
- All financial operations go through RPC functions, not direct Supabase queries
- Handle loading, error, and empty states for all async operations

### TigerBeetle Integration
- Shadow ledger for financial integrity
- Use outbox pattern for browser-safe operations
- NAD_LEDGER = 1 (ledger ID)
- Never bypass ledger for financial transactions

## Common Tasks

### Adding a New Feature
1. Check if RLS policies need updates
2. Create/update RPC functions for data operations
3. Add audit logging for state changes
4. Use TanStack Query for data fetching
5. Follow design system patterns
6. Add E2E test coverage

### Modifying Financial Logic
1. **STOP** - Verify you understand the full impact
2. Check for downstream consumers
3. Update tests to verify idempotency
4. Ensure audit trail is maintained
5. Validate status machine transitions
6. Update TigerBeetle ledger entries if applicable

### UI Component Changes
1. Use semantic theme variables (never hardcoded colors)
2. Test in both light and dark modes
3. Add loading/error/empty states
4. Maintain responsive design
5. Add `data-testid` for E2E tests
6. Follow existing component patterns

## File Organization
- `/src/pages/` - Page components (Dashboard, AdminDashboard, etc.)
- `/src/components/` - Reusable components
- `/src/services/` - Business logic and API calls
- `/src/hooks/` - Custom React hooks
- `/src/types/` - TypeScript type definitions
- `/src/lib/` - Utilities and helpers
- `/supabase/` - Database migrations, RPC functions, RLS policies

## Critical Warnings
⚠️ **NEVER**:
- Delete financial records (soft delete only)
- Update amounts in place (create adjustment records)
- Bypass RLS policies
- Expose service role keys to client
- Use floating point for money
- Skip audit logging for financial changes
- Weaken security for convenience

✅ **ALWAYS**:
- Use DECIMAL for money
- Log before/after states
- Use database transactions
- Validate at DB/RPC boundary
- Maintain backward compatibility
- Preserve audit trails
- Test RLS policies

## Questions to Ask Before Proceeding
1. Does this change affect financial data? → Verify audit trail
2. Does this need RLS updates? → Test all roles
3. Is this a breaking change? → Check consumers
4. Does this affect TigerBeetle? → Update ledger service
5. Is this properly tested? → Add/update tests
