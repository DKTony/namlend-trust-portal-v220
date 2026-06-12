# NamLend Trust - Service Layer Inventory

**Doc Revision**: 2026-04-28
**Status**: Current with active legacy islands
**Scope**: Web app service utilities and frontend data-access patterns. Convex modules in `convex/` are the active backend service layer.

---

## Current Rule

New application data access should use Convex directly:

- Reads: `useQuery(api.module.function, args)` from `convex/react`
- Writes: `useMutation(api.module.function)` from `convex/react`
- External IO: Convex `action` or `internalAction`
- Auth and authorization: guards in `convex/lib/auth.ts`

Do not add new Supabase-backed services under `src/services/`. Existing Supabase usage is migration debt and must be called out explicitly.

---

## Active `src/services/` Files

The current repository contains two service files:

| File                            | Active Consumers                                      | Backend Dependency                                                             | Current Status                                                                                                         |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/services/creditScoring.ts` | Unit tests and `src/utils/creditScoring.ts` re-export | Local scoring logic plus legacy Supabase RPC methods at the bottom of the file | Mixed utility/legacy file. Pure scoring functions are still useful; DB-backed methods should not be used for new work. |
| `src/services/scoringRules.ts`  | `src/tests/scoringRules.test.ts`, scoring utilities   | Local TypeScript rule evaluation                                               | Active local utility. No backend dependency.                                                                           |

All previously documented files such as `loanService.ts`, `paymentService.ts`, `disbursementService.ts`, `approvalWorkflow.ts`, `notificationService.ts`, `ledgerService.ts`, and `settlementService.ts` are no longer present in `src/services/`. Their live equivalents are Convex modules under `convex/`.

---

## Active Legacy Supabase Utility Paths

These are outside `src/services/` but still matter architecturally:

| File                                  | Usage                                                                 | Risk                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/integrations/supabase/client.ts` | Creates a Supabase client used by legacy services/tests/utilities     | Keeps Supabase env vars and auth storage assumptions alive while legacy utilities remain.                                             |
| `src/services/creditScoring.ts`       | Pure scoring types/rules plus deprecated Supabase score adapter paths | UI should import only pure scoring exports through `src/utils/creditScoring.ts`; backend scoring belongs in Convex actions/mutations. |
| `src/utils/rpc.ts`                    | Tested by `src/tests/rpc.test.ts`                                     | Generic Supabase RPC wrapper retained for legacy tests/utilities; should not be used in new app code.                                 |
| `src/utils/testUtils.ts`              | Legacy local/dev test helpers                                         | Uses Supabase auth and hard deletes test financial records, conflicting with production retention rules.                              |

---

## Convex Backend Service Map

| Domain                           | Primary Convex Modules                                                                                                         | Notes                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Auth, profiles, roles, KYC       | `convex/auth.ts`, `convex/users.ts`, `convex/loanDocuments.ts`                                                                 | Convex Auth seeds `profiles` and `userRoles`; role writes require admin guards.                                                         |
| Loans and approvals              | `convex/loans.ts`, `convex/approvalWorkflow.ts`, `convex/loanApprovals.ts`                                                     | Loan lifecycle, approval request workflow, audit/event emissions.                                                                       |
| Payments and disbursements       | `convex/payments.ts`, `convex/disbursements.ts`                                                                                | Completed financial state enqueues TigerBeetle outbox records and schedules audit logs.                                                 |
| IPS/IPP                          | `convex/ips/*`, `convex/actions/ipsAdapter.ts`, `convex/actions/ipsAliasAdapter.ts`, `convex/actions/ipsOnboardingAdapter.ts`  | XML/mock protocol modes, alias directory, onboarding state machine, callbacks.                                                          |
| Collections and reconciliation   | `convex/collections.ts`, `convex/reconciliation.ts`, `convex/settlement/*`                                                     | Collections are Convex-backed; reconciliation/settlement are implemented but still need production transport and operational hardening. |
| Notifications and communications | `convex/notifications.ts`, `convex/actions/sendNotification.ts`, `convex/actions/sendSms.ts`, `convex/actions/sendWhatsapp.ts` | In-app notifications are Convex-backed; external channels need configured secrets.                                                      |
| Ontology engine                  | `convex/ontology/*`, `convex/projections/*`, `convex/lib/domainEvents.ts`                                                      | Event journal, relationships, mandates, consent, institutions, rails, products, accounts, snapshots.                                    |
| Ledger shadowing                 | `convex/tigerbeetle/*`, `convex/scheduled/tigerBeetleOutboxWorker.ts`                                                          | Outbox pattern is implemented; posting is currently shadow/simulated.                                                                   |

---

## Service-Layer Best Practices

- Prefer direct Convex hooks in UI feature hooks/components over wrapper services unless a wrapper removes real duplication.
- Keep financial writes in Convex mutations so they are serializable and can enqueue audit/outbox records in the same transaction.
- Keep HTTP/network calls in Convex actions, not browser services or Convex mutations.
- Validate APR, KYC, role, and ownership constraints server-side, even when the UI already validates.
- Treat any import from `@/integrations/supabase/client` or `@/utils/rpc` as a migration finding unless the file is explicitly marked legacy/reference.

---

## Remediation Priorities

1. Split `creditScoring.ts` into pure scoring utilities and a clearly deprecated Supabase RPC adapter, then remove the adapter once no tests depend on it.
2. Delete or quarantine `src/utils/rpc.ts` and Supabase test utilities after E2E/API tests are migrated to Convex fixtures.
3. Move branding asset persistence from data URLs in `systemConfiguration` to Convex storage before production white-label use.

---

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and legacy boundary
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Convex schema reference
- [SECURITY.md](./SECURITY.md) - Guard-based security model
- [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) - Findings and remediation roadmap
