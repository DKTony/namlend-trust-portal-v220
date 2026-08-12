# Convex Agent Instructions

These instructions apply to every file below `convex/`.

- `convex/schema.ts` is the active data-model source of truth. Supabase is not a backend pattern.
- Every public function touching user data must call the appropriate guard from `convex/lib/auth.ts`.
- Authentication alone is insufficient: enforce object ownership, tenant isolation and the required tenant/platform role.
- Validate args and returns at runtime. Use `NOT_STATED` only as an ontology finding, never as a runtime boundary.
- Preserve verified KYC and the 32% APR ceiling in lending paths.
- Financial writes must be retry-safe, retain records, and schedule the required audit/event evidence.
- Distinguish Convex transaction completion, outbox enqueue, provider acceptance, callback processing and external settlement.
- External I/O belongs in actions/HTTP handlers; mutations must not call providers directly.
- Never log PII, financial data, credentials, signatures or raw provider payloads.
- Changes to schema, auth, roles, tenancy, money movement, audit, schedules, flags or integrations are R3 protected and human-led.

Run `npm run test:convex`, `npm run typecheck`, `npm run ontology:extract`,
`npm run ontology:check`, and `npm run ontology:test` for relevant changes.
