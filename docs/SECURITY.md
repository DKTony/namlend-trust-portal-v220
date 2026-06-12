# NamLend Trust - Security Documentation

**Last Updated**: 2026-04-28
**Aligned With**: Convex-first architecture review
**Status**: Current with documented review items

---

## Security Layers

```
1. Transport Security (HTTPS/TLS + WSS)
2. Authentication (@convex-dev/auth, session-based — no JWT)
3. Frontend Route Guards (ProtectedRoute)
4. Convex Args Validation (v.string(), v.number(), etc.)
5. Auth Guards (convex/lib/auth.ts — replaces RLS)
6. Convex Serializable Mutations (automatic atomicity)
7. Audit Logging (auditLogs + stateTransitions via convex/lib/audit.ts)
```

---

## Authentication

- `@convex-dev/auth` (Password provider) manages sessions — no JWT, session-based.
- `ConvexAuthProvider` wraps the app and provides reactive auth state via `useConvexAuth()`.
- `useAuth.tsx` wraps `useConvexAuth()` and adds role-based logic.
- New users trigger `afterUserCreatedOrUpdated` callback in `convex/auth.ts` → seeds `profiles` + `userRoles`.
- Sign-out via Convex Auth signOut (clears server-side session).

---

## Authorization

### Roles

- `admin`: full backoffice access.
- `loan_officer`: backoffice access (same routes as admin via `requireLoanOfficer` guard; admin-only features are gated in UI).
- `client`: self-service access only.

Role precedence in UI: `admin` > `loan_officer` > `client`.
Roles stored in `userRoles` Convex table.

### Frontend Route Guards

- `ProtectedRoute` enforces auth and role checks.
- `/admin/*` uses `requireLoanOfficer` (allows `loan_officer` AND `admin`). Admin-only features (user management, system config delete) are gated inside UI components by `isAdmin` check.
- `ProtectedRoute` sanitizes redirect paths to avoid open redirects.

---

## Auth Guard Security (Replaces RLS)

Convex does **not** use Row-Level Security. Access is enforced by guard functions in `convex/lib/auth.ts` called at the top of **every** query and mutation:

| Guard                             | Replaces RLS Policy                            |
| --------------------------------- | ---------------------------------------------- |
| `assertAuthenticated(ctx)`        | `auth.uid() IS NOT NULL`                       |
| `assertOwner(ctx, userId)`        | `user_id = auth.uid()`                         |
| `assertOwnerOrStaff(ctx, userId)` | `user_id = auth.uid() OR is_staff(auth.uid())` |
| `assertStaff(ctx)`                | `is_staff(auth.uid())`                         |
| `assertAdmin(ctx)`                | `is_admin(auth.uid())`                         |

**Every new query/mutation must call the appropriate guard first.** There are no implicit access controls — a function without a guard is unprotected.

Review `convex/lib/auth.ts` when adding new tables or functions.

### Current Authorization Review Items

The following functions need object-level authorization review because they authenticate callers but do not clearly enforce owner-or-staff access on the returned or linked record:

- `approvalWorkflow.getApprovalRequest`
- `ipsTransactions.getTransaction`
- `ipsTransactions.getTransactionByMsgId`
- `ipsAliasDirectory.getAliasByAddr`
- `ipsAlerts.createAlert`
- `mandates.createMandate`

See [ARCHITECTURAL_REVIEW.md](./ARCHITECTURAL_REVIEW.md) for severity and remediation guidance.

---

## Convex Action Security (Replaces Edge Functions)

- Auth guards called at start of any action that accesses user data.
- `payment-webhook` and `webhook/ips` in `convex/http.ts` verify signatures when their secrets/certificates are configured. Current code warns and skips verification when secrets are missing; production configuration must fail closed through environment policy and deployment checks.
- `convex/actions/ipsAdapter.ts` supports mock/XML modes. Production must explicitly configure `IPS_PROTOCOL_MODE`, mTLS certificates, and BoN connectivity.
- Secrets are set via `npx convex env set KEY value` — never in `VITE_*` env vars.
- Actions are the only place that can make external HTTP calls (`fetch()`). Never in mutations or queries.

---

## Client-Side Admin Access Controls

- Debug tooling is gated by `VITE_DEBUG_TOOLS` and `VITE_RUN_DEV_SCRIPTS`.
- Do not ship Convex secrets in `VITE_*` environment variables — only `VITE_CONVEX_URL` is safe.
- Supabase client usage remains in legacy scoring/test utility paths. Do not add new Supabase client paths to production UI.

---

## Audit and Logging

- Financial operations schedule audit log entries via `scheduleAuditLog()` from `convex/lib/audit.ts`.
- Audit logs are written asynchronously via `ctx.scheduler.runAfter()` to avoid blocking mutations. This requires monitoring because the financial mutation can commit before the audit write succeeds.
- Sensitive access is tracked in `viewLogs` Convex table.
- Do not log PII, financial details, or credentials in client errors.
- Settlement state transitions log via `scheduleAuditLog()` in Convex mutations (added 2026-02-18).

## Settlement Security (2026-02-18)

- **XML injection prevention**: `xmlEscape()` TypeScript function in `convex/lib/xmlEscape.ts` applied to all user-sourced values in pacs.009 generation. Escapes `&`, `<`, `>`, `"`, `'` entities.
- **Mutation retry prevention**: Convex financial mutations run in serializable transactions. TanStack Query retries are disabled (`retry: false`) for all financial mutations via the `QueryClient` config in `src/App.tsx`.

---

## Security Checklist (Handover)

1. Confirm auth guards (`assertAuthenticated`, `assertOwner`, `assertOwnerOrStaff`, `assertStaff`, `assertAdmin`) protect all new Convex queries/mutations.
2. Verify Convex environment secrets are set via `npx convex env set` (not in `.env` files).
3. Ensure `VITE_DEBUG_TOOLS` and `VITE_RUN_DEV_SCRIPTS` are false in production.
4. Rotate provider webhook secrets (`PAYTODAY_WEBHOOK_SECRET`, etc.) in production environments.
5. Run `npx convex dev` after schema changes — types regenerate automatically in `convex/_generated/`.
6. Verify no Convex secrets exposed as `VITE_*` environment variables.
7. Verify IPS and payment webhooks cannot deploy to production with missing signature secrets/certificates.
8. Replace hard-delete test cleanup for financial data with isolated fixtures or archival cleanup.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture with auth flow diagram
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Auth guards and access control per table
- [AGENTS.md](./AGENTS.md) - Security rules for AI agents
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) - Security-related debt items
