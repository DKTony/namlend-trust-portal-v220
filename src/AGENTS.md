# Web Platform Agent Instructions

## Project Context

- **Platform**: NamLend Trust web portal for the Namibian lending market
- **Frontend**: React 18.3.1, TypeScript 5.5.3, Vite 5.4.1
- **Backend authority**: Convex (`convex/`), Convex Auth, Convex generated API
- **Legacy boundary**: Supabase client/types remain for selected migration-debt utilities and tests only
- **Styling**: TailwindCSS 3.4.11, shadcn/ui, Neo-Fintech design system
- **Deployment**: Netlify frontend and Convex backend

## Regulatory and Business Rules

- **Currency**: NAD only; display as `N$ X,XXX.XX`.
- **APR Limit**: 32% maximum.
- **Auditability**: preserve audit/event logging for all financial state changes.
- **Retention**: do not hard-delete production financial records.
- **KYC**: client lending flows must enforce verified KYC eligibility.

## Architecture Principles

### Convex Guards Are the Security Boundary

- Use `convex/lib/auth.ts` guards for all public Convex functions that touch user data.
- `assertAuthenticated` only proves identity. For record access, use `assertOwner`, `assertOwnerOrStaff`, `assertStaff`, or `assertAdmin`.
- Frontend `ProtectedRoute` is a UX guard, not the security boundary.
- Do not implement new Supabase RLS/RPC/Edge Function flows.

### Financial Data Handling

- Keep financial writes in Convex mutations so changes are serializable.
- Enqueue ledger/audit/outbox side effects in the same mutation where required.
- Use idempotency keys or deterministic identifiers for provider/payment workflows.
- Use reversal/adjustment records instead of destructive updates.
- Never expose service credentials or provider secrets to browser code.

### Frontend Data Access

- Prefer `useQuery(api.module.fn)` and `useMutation(api.module.fn)` from `convex/react`.
- External HTTP belongs in Convex actions, not browser services.
- Treat imports from `@/integrations/supabase/client` or `@/utils/rpc` as legacy migration debt.
- Do not add new files to `src/services/` for business/backend logic.

### UI Quality

- Use semantic theme variables (`text-foreground`, `bg-card`, `border-border`, etc.).
- Follow adaptive UI patterns in `src/components/adaptive/`.
- Add stable `data-testid` attributes for E2E-relevant controls.
- Test compact, tablet, desktop, and wide layouts for shell or dense admin UI changes.

## Common Tasks

### Adding a Feature

1. Locate the relevant Convex module or create a new one under `convex/`.
2. Define args with Convex validators.
3. Add the correct guard before DB access.
4. Add audit/event/relationship/outbox behavior if financial or compliance state changes.
5. Wire the UI with Convex hooks.
6. Update docs and tests for the flow.

### Modifying Financial Logic

1. Trace downstream effects: loan status, payment schedules, disbursements, audit logs, event journal, TigerBeetle outbox.
2. Verify APR/KYC/role constraints.
3. Preserve idempotency and status-machine validation.
4. Add or update targeted tests.

### UI Component Changes

1. Use shadcn/ui and existing local patterns.
2. Preserve loading, error, and empty states.
3. Avoid hardcoded colors outside intentional design tokens.
4. Validate responsive behavior and text overflow.

## Critical Warnings

Never:

- Hard-delete production financial records.
- Add new Supabase-backed production paths.
- Bypass Convex auth guards.
- Expose secrets through `VITE_*` variables.
- Log PII, account numbers, credentials, or raw financial payloads.
- Retry financial mutations blindly from the client.

Always:

- Use Convex-generated types for active backend data.
- Log financial state changes.
- Validate role/ownership at the backend boundary.
- Keep docs aligned with actual implementation.
