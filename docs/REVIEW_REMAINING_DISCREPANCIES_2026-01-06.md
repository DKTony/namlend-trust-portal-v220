# Remaining Discrepancies Review (2026-01-06)

**Doc Revision**: 2026-01-19  
**Status Note**: Historical review snapshot. Validate against current migrations before action.

This document captures the remaining discrepancies/issues identified after the latest updates and defines a focused action plan to prepare a patch for all P0 items plus TigerBeetle outbox/balance alignment and idempotency changes.

## Executive Summary

Recent fixes already applied include:
- TigerBeetle schema migration added with `queue_tigerbeetle_event` RPC (`supabase/migrations/20260106_create_tigerbeetle_schema.sql`).
- IPS adapter edge function now enforces JWT + role authorization (`supabase/functions/ips-adapter/index.ts`).
- Payment webhook now updates `payments` and applies schedules using `payments.id` (`supabase/functions/payment-webhook/index.ts`).
- Notification and SMS edge functions now handle multi-role users and correct notification column mapping (`supabase/functions/send-notification/index.ts`, `supabase/functions/send-sms/index.ts`).
- Admin metrics updated to use `payment_schedules` for overdue counts (`src/pages/AdminDashboard.tsx`).

Remaining issues are listed below (prioritized), followed by the action plan.

## Remaining Discrepancies (Prioritized)

### P0 (Blockers)

1) Approval RPC schema mismatch and idempotency gap
- File: `supabase/migrations/20250925_add_process_approval_transaction_rpc.sql`
- Problem:
  - Inserts into non-existent columns in `approval_workflow_history` and `approval_notifications`.
  - Does not set `approval_requests.reference_id` or mark the request as processed.
  - No idempotency guard; re-runs can create duplicate loans.
- Impact: Failure at runtime or duplicate loan creation; breaks auditability and financial correctness.

2) Approval RPC validation uses `request_data.term` only
- File: `supabase/migrations/20250925_add_process_approval_transaction_rpc.sql`
- Problem: Rejects valid requests that provide `term_months` (UI uses `term_months`).
- Impact: Approved applications fail to process despite valid input.

3) TigerBeetle outbox lacks idempotency keys
- File: `supabase/migrations/20260106_create_tigerbeetle_schema.sql`
- Problem: No unique constraint on `idempotency_key` (not present) or equivalent guard.
- Impact: Duplicate ledger postings under retries; violates financial correctness.

4) Webhook schedule application fallback uses `payment_transactions.id`
- File: `supabase/functions/payment-webhook/index.ts`
- Problem: If `payments` update fails, it falls back to `payment_transactions.id`, which is not guaranteed to be the `payments.id` expected by `apply_payment_to_schedule`.
- Impact: Misapplied schedules or failed schedule application.

### P1 (High Priority)

5) WhatsApp edge role check still uses `maybeSingle` (multi-role issue)
- File: `supabase/functions/send-whatsapp/index.ts`
- Problem: Multi-role users can be denied due to `maybeSingle()` behavior.
- Impact: Staff operations blocked (SMS/WhatsApp).

6) Webhook signature validation still accepts unsigned requests when secret missing
- File: `supabase/functions/payment-webhook/index.ts`
- Problem: Signature is treated as valid if no secret is configured.
- Impact: Webhook spoofing risk in production.

7) TigerBeetle shadow ledger vs UI balance mismatch
- Files:
  - `src/hooks/useTigerBeetleBalance.ts`
  - `supabase/functions/tigerbeetle-outbox-worker/index.ts`
- Problem: Hook assumes fields that are not written by the worker and filters on `entity_type = 'loan'` which is inconsistent with mapping (`LOAN_PRINCIPAL`, etc.).
- Impact: Incorrect balances or fallback to legacy views.

8) Shadow ledger transfers missing debit/credit account IDs
- File: `supabase/functions/tigerbeetle-outbox-worker/index.ts`
- Problem: `tigerbeetle_transfers` inserts do not populate `debit_account_id`/`credit_account_id`.
- Impact: Reconciliation and balance calculations lack required detail.

9) TigerBeetle ID precision risk in app layer
- File: `src/services/ledgerService.ts`
- Problem: Uses `Number(...)` for 64-bit TB IDs; can lose precision.
- Impact: Incorrect account mappings or reconciliation drift.

### P2 (Important but Non-Blocking)

10) SMS template schema mismatch and placeholder format
- File: `supabase/functions/send-sms/index.ts`
- Problem: Reads `notification_templates.body` but schema uses `body_template`; placeholder format does not match documented `{{variable}}`.
- Impact: Incorrect SMS content or missing templates.

11) Client Payment flow bypasses RPC/outbox
- File: `src/pages/Payment.tsx`
- Problem: Direct `payments` insert; fee is displayed but not applied.
- Impact: Non-atomic payment processing and ledger desync.

12) Loan status inconsistencies
- Files:
  - `supabase/functions/process-loan-application/index.ts`
  - `src/constants/loanStatuses.ts`
- Problem: Uses `under_review` status not represented in UI constants.
- Impact: UI logic drift and inconsistent status display.

13) Hardcoded colors remain in UI components
- Files: multiple (examples in `src/pages/Auth.tsx`, `src/components/DashboardSidebar.tsx`, `src/components/PaymentModal.tsx`)
- Problem: Non-semantic color usage violates design system rules.
- Impact: Inconsistent theming and dark-mode behavior.

14) Supabase client fallback to mock in production misconfig
- File: `src/integrations/supabase/client.ts`
- Problem: Missing env vars silently activates mock client.
- Impact: Production misconfiguration risk.

## Action Plan: P0 Items + TigerBeetle Outbox/Balance Alignment

### Phase 1: P0 Fixes (Patch-Ready)

1) Fix approval RPC schema alignment and idempotency
- Update `process_approval_transaction` to:
  - Use actual columns on `approval_workflow_history` and `approval_notifications`.
  - Set `approval_requests.reference_id` and/or a processed status to prevent duplicates.
  - Add idempotency guard (e.g., `reference_id IS NOT NULL` or a unique constraint for the request).
  - Accept `term_months` as the primary term field (fallback to `term`).
- Files: `supabase/migrations/20250925_add_process_approval_transaction_rpc.sql`
- Tests:
  - Add/extend E2E approval tests to ensure idempotency and correct term handling.

2) Enforce outbox idempotency for TigerBeetle
- Add `idempotency_key` column to `tigerbeetle_outbox` and a unique constraint.
- Ensure `queue_tigerbeetle_event` uses a deterministic key (e.g., `${event_type}:${source_table}:${source_id}`).
- Files: `supabase/migrations/20260106_create_tigerbeetle_schema.sql`
- Tests:
  - Unit/integration test for duplicate outbox inserts returning the existing record.

3) Remove fallback misuse in webhook schedule application
- Require `payments.id` for schedule application; if `payments` update fails, log and skip apply rather than using `payment_transactions.id`.
- Files: `supabase/functions/payment-webhook/index.ts`
- Tests:
  - Webhook replay test confirming schedules are updated only with `payments.id`.

### Phase 2: TigerBeetle Outbox/Balance Alignment

4) Align shadow ledger inserts with schema
- Populate `debit_account_id` and `credit_account_id` in `tigerbeetle_transfers` for each event type.
- Ensure `amount` is stored in NAD with consistent precision.
- Files: `supabase/functions/tigerbeetle-outbox-worker/index.ts`

5) Align balance hook with TB schema
- Update `useTigerBeetleBalance` to use `tigerbeetle_accounts` and `tigerbeetle_transfers` as defined in the new schema.
- Use `entity_type` values that actually exist in the mapping (e.g., `LOAN_PRINCIPAL`, `LOAN_INTEREST`, `LOAN_FEES`).
- Files: `src/hooks/useTigerBeetleBalance.ts`

6) Prevent TB ID precision loss
- Replace `Number(...)` conversions with string-safe storage and `BIGINT` handling.
- Use `text` or `numeric` where necessary to preserve full 128-bit IDs.
- Files:
  - `src/services/ledgerService.ts`
  - `supabase/migrations/20260106_create_tigerbeetle_schema.sql`

### Phase 3: High Priority Follow-Ups

7) Fix WhatsApp role checks to support multi-role users
- Update to match the SMS/notification logic (multi-role support).
- File: `supabase/functions/send-whatsapp/index.ts`

8) Require webhook signature in production
- Enforce strict verification when `IPS_ENVIRONMENT=production` or similar flag.
- File: `supabase/functions/payment-webhook/index.ts`

## Deliverables

- SQL migration updates for:
  - `process_approval_transaction` fixes and idempotency guard.
  - TigerBeetle outbox idempotency key and unique constraint.
  - TB ID precision-safe types (if required).
- Edge function updates for:
  - Payment webhook schedule application correctness.
  - Outbox worker transfer inserts with debit/credit account IDs.
- App code updates for:
  - TigerBeetle balance hook alignment.
  - TB ID precision handling in ledger service.

## Testing Checklist

- Approval workflow:
  - Approved request processed exactly once (idempotent).
  - `term_months` is accepted and persists correctly.
- Ledger outbox:
  - Duplicate outbox enqueue returns existing ID.
  - Shadow ledger records include debit/credit account IDs.
- Payment webhook:
  - Schedules are applied only using `payments.id`.
- TB balances:
  - UI balance aligns with shadow ledger for the same loan.

## Notes

- This plan focuses on P0 items and TB outbox/balance alignment only, per request.
- P1/P2 items should be addressed in a subsequent remediation pass.
