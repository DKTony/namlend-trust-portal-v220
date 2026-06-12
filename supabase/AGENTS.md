# Supabase Directory Agent Instructions

## Status

The active NamLend backend is Convex. This `supabase/` directory is legacy/reference material from the previous PostgreSQL/RLS/Edge Function implementation.

Do not create new production functionality here unless the user explicitly asks to work on legacy Supabase reference assets. New backend logic belongs in `convex/`.

## What This Directory Is For

- Historical SQL migrations and schema reference.
- Historical Deno Edge Functions and helper patterns.
- Context for migrating remaining Supabase utility paths out of the web app.
- Reference when comparing old RPC behavior to current Convex functions.

## What Not To Do

- Do not add new RLS policies for active app features.
- Do not add new Supabase RPCs or Edge Functions for active app workflows.
- Do not regenerate active frontend types from Supabase as if they were canonical.
- Do not copy Supabase cleanup patterns that hard-delete financial data into Convex-era tests.

## Current Legacy Runtime Touchpoints

The web app still has selected Supabase dependencies outside this directory:

- `src/services/brandingService.ts` calls Supabase RPC and Storage.
- `src/utils/serviceRoleAssignment.ts` calls a Supabase Edge Function and RPC fallback.
- Some older E2E/API tests and test utilities still use Supabase clients and hard-delete cleanup.

Treat those paths as migration debt. See [../docs/SERVICES.md](../docs/SERVICES.md) and [../docs/ARCHITECTURAL_REVIEW.md](../docs/ARCHITECTURAL_REVIEW.md).

## If You Must Touch Supabase Files

1. State that the change is legacy/reference work.
2. Avoid destructive changes to historical migrations.
3. Do not present Supabase as the active backend in documentation.
4. Keep retention and audit requirements visible.
5. Cross-reference the Convex replacement path where possible.
