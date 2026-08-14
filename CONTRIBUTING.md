# Contributing to NamLend Trust

NamLend Trust is a Convex-first digital lending platform. Read `AGENTS.md`
before changing code; its regulatory and security constraints are release gates.

## Prerequisites

- Node.js 22.23.2 and npm 10.9.8 (`.nvmrc` and `packageManager` are canonical)
- Git
- A development Convex deployment and `VITE_CONVEX_URL`

Supabase files are legacy or migration-debt references. Do not add new Supabase,
RLS, RPC, Edge Function, or `src/services/` business logic.

## Setup and checks

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test:unit
npm run test:convex
npm run build
npm run ontology:check
npm run ontology:test
npm run agent:policy
```

Use an isolated E2E Convex deployment for Playwright. Production credentials and
production data must never be supplied to tests or coding agents.

## Change safety

- Maximum APR is 32%; preserve server-side enforcement.
- Lending requires verified KYC at the authoritative backend boundary.
- Enforce owner, owner-or-staff, staff, admin, tenant and platform access as appropriate.
- Schedule audit/event writes for financial operations.
- Never hard-delete production financial or compliance records.
- Keep money amounts in NAD at product boundaries and cents at TigerBeetle boundaries.
- An outbox enqueue does not prove provider acceptance; callback processing does not prove settlement.

## Pull requests

1. Branch from current `main` and keep the change narrowly scoped.
2. Describe affected ontology node IDs and the evidence path used for impact analysis.
3. Run the checks relevant to the changed behavior and attach named-test evidence.
4. Regenerate the ontology when tracked system structure changes.
5. Register every runtime test skip with an owner, reason, expiry and gap.
6. Land only after required CI is green. The current solo-operator policy does
   not require a second human approval. Restore two-person review when a second
   qualified collaborator exists.

Agents may propose only allowlisted R0/R1 work. Humans own merges, deployments,
seeds, migrations, backfills, production access and protected NamLend behavior.

## Active structure

| Path              | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `src/`            | React/Vite application and Convex client boundary              |
| `convex/`         | Active schema, authorization, workflows, actions and schedules |
| `e2e/`            | Playwright browser and API checks                              |
| `ontology/`       | Authoritative system/evidence graph and reports                |
| `agent-harness/`  | Agent contracts, risk policy, exceptions and evaluation corpus |
| `tools/graphify/` | Optional local discovery sidecar lock                          |
| `supabase/`       | Legacy/reference and selected migration-debt paths only        |

See `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and
`docs/AI_ENGINEERING_HARNESS.md` for the active operating model.
