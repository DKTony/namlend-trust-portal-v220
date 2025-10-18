# Security Hardening v2.2.5 (October 2025)

## Overview

This document summarizes the database and authentication hardening applied in v2.2.5, along with RLS consolidation and advisor outcomes. Changes preserve existing authentication flows, maintain RLS on all tables, and avoid exposing sensitive data, per NamLend project rules.

## Database Hardening

- Views switched to SECURITY INVOKER with restricted privileges (anon/public revoked; authenticated-only read):
  - `public.profiles_with_roles`, `public.client_portfolio`, `public.financial_summary`, `public.approval_requests_expanded`.
- Functions pinned to `public` search path inside the body via `PERFORM set_config('search_path','public',true);` and also at function level with `ALTER FUNCTION`:
  - `increment_version()`, `check_loan_eligibility()`, `check_loan_eligibility_admin(uuid)`, `get_dashboard_summary()`.
- Covering indexes added for advisor-flagged foreign keys (approvals, disbursements, loan reviews, notifications, payments).

## RLS Consolidation (performance and clarity)

Replaced per-row `auth.*()` calls with the efficient `(SELECT auth.uid())` pattern and consolidated multiple permissive policies into single policies per action. Consolidated tables include:

- `profiles`, `user_roles`.
- `kyc_documents`, `loans`, `payments`.
- `approval_requests`, `approval_workflow_history`, `approval_workflow_rules`, `approval_notifications`.
- `notifications`, `disbursements`, `error_logs`.

Result: cleared `auth_rls_initplan` warnings on consolidated tables and reduced policy evaluation overhead.

## Authentication Settings

- Email OTP expiry reduced to ≤ 1 hour (e.g., 1200s) in Supabase Dashboard.
- Leaked Password Protection (HIBP): enablement may be plan-dependent; advisor will continue warning until enabled.

## E2E Additions

- `e2e/admin-approvals-actions.e2e.ts`: Verifies Approvals action controls are visible and ensures no write network requests during inspection.
- `e2e/admin-currency.e2e.ts`: Validates strict `N$` currency rendering; skips gracefully if admin UI is unavailable.

## Advisor Outcomes

- Security: view/definer/search_path warnings cleared; remaining:
  - HIBP enablement (Dashboard/plan-dependent).
  - Postgres minor upgrade available (informational).
- Performance:
  - `auth_rls_initplan` cleared on consolidated tables.
  - Multiple permissive policy warnings removed where consolidated.
  - Remaining “unused_index” notices are informational; review before any drops.

## Verification Steps

1. Run Playwright E2E suite; confirm currency and approvals tests pass or skip gracefully.
2. Re-run Supabase advisors (security and performance) and confirm only expected residual warnings remain.
3. Smoke-test Admin: navigate Financial, Loans, Clients, Payments, Approvals; confirm no stray `$` and stable RBAC.

## Backward Compatibility

- All changes are invoker-based and preserve RLS/privilege semantics.
- No existing table or view was dropped; audit trails and security constructs preserved.

## References

- `docs/technical-specs/README.md` (v2.2.5 addendum)
- `docs/security-analysis.md` (updated October 2025 section)
- `docs/CHANGELOG.md` (v2.2.5)
