# NamLend Trust - Security Documentation

**Doc Revision**: 2026-01-19  \
**Status**: Core auth and RLS implemented; Edge Functions enforce JWT and staff role checks.

---

## Security Layers

```
1. Transport Security (HTTPS/TLS)
2. Authentication (Supabase Auth, JWT)
3. Frontend Route Guards (ProtectedRoute)
4. Service Layer Validation
5. Row Level Security (Postgres RLS)
6. Database Constraints and Triggers
7. Audit Logging (audit_logs, state_transitions)
```

---

## Authentication

- Supabase Auth with persisted sessions in `localStorage` (`namlend-auth`).
- Session restore logic in `useAuth.tsx` avoids race conditions on hydration.
- Global sign-out is enforced via `supabase.auth.signOut({ scope: 'global' })` with local cleanup.

---

## Authorization

### Roles

- `admin`: full backoffice access.
- `loan_officer`: intended for backoffice access (router currently admin-only).
- `client`: self-service access only.

Role precedence in UI: `admin` > `loan_officer` > `client`.

### Frontend Route Guards

- `ProtectedRoute` enforces auth and role checks.
- `/admin/*` currently uses `requireAdmin` (admin-only). Update to `requireLoanOfficer` if staff access is required.
- `ProtectedRoute` sanitizes redirect paths to avoid open redirects.

---

## Row Level Security (RLS)

Core user tables enable RLS. Policies generally follow:

- Own-data access: `auth.uid() = user_id`.
- Staff/admin access: role checks via `user_roles`.
- Service role access for Edge Functions.
- New finance tables (e.g., `reconciliation_runs`, `bank_transactions`) also enable RLS as of the 2026-01-17 migration.

Review RLS policies in `supabase/migrations/` before adding new tables.

---

## Edge Function Security

- JWT required for all Edge Function endpoints.
- Staff role enforcement in `send-sms`, `send-whatsapp`, `send-notification`.
- API orchestration functions (`api-*`) enforce JWT + RBAC at the edge layer.
- `payment-webhook` uses HMAC verification; fails closed in production if secrets are missing.
- `ips-adapter` runs in mock mode unless `IPS_ENABLED=true` with secrets configured.

---

## Client-Side Admin Access Controls

- `supabaseAdmin` is gated by `VITE_ALLOW_LOCAL_ADMIN=true` and DEV mode only (**deprecated**, see `src/main.tsx` warning).
- Debug tooling is gated by `VITE_DEBUG_TOOLS` and `VITE_RUN_DEV_SCRIPTS`.
- Do not ship service role keys in Vite environment variables.

---

## Audit and Logging

- Financial operations log to `audit_logs` via RPCs/triggers.
- Sensitive access is tracked in `view_logs`.
- Do not log PII, financial details, or credentials in client errors.

---

## Security Checklist (Handover)

1. Confirm all RLS policies exist for user-data tables.
2. Verify Edge Function secrets are set in Supabase.
3. Ensure `VITE_DEBUG_TOOLS` and `VITE_RUN_DEV_SCRIPTS` are false in production.
4. Rotate provider webhook secrets in production environments.
5. Regenerate Supabase types after schema changes.

---

## See Also

- [INDEX.md](./INDEX.md) - Documentation index
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture with auth flow diagram
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - RLS policies per table
- [AGENTS.md](./AGENTS.md) - Security rules for AI agents
- [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) - Security-related debt items
