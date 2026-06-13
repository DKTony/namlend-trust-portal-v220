# Typecheck Triage (Phase -1 baseline)

`npm run typecheck` = `tsc -b`. The gate is **runnable, non-blocking** (per the hardening
program's baseline). Phase -1 rule: **any auth / role / entitlement / config / tenancy file must
be type-clean, and no new errors may be introduced in touched files.** Existing unrelated debt is
documented here and frozen (not worsened).

## Snapshot

- **Command:** `npx tsc -b --pretty false`
- **Total:** **527** (unchanged by the Phase 0 control-plane work — 0 new errors)
- **Split:** `convex/` 51 · `src/` 476

## Categories

| Count | Code            | Meaning                           | Class           |
| ----: | --------------- | --------------------------------- | --------------- |
|   234 | TS6133          | declared but never used           | dead/UI drift   |
|   126 | TS7006          | implicit `any` param              | UI drift        |
|    50 | TS2322          | not assignable (strictNullChecks) | UI drift / real |
|    28 | TS2339          | property does not exist           | drift / real    |
|    14 | TS2345          | arg not assignable                | drift / real    |
|    12 | TS7053          | implicit any index                | UI drift        |
|   9+9 | TS6196 / TS2304 | unused type / cannot find name    | dead / real     |

## Security-relevant files (must be clean before Phase 1–2)

New Phase 0 control-plane files (`convex/lib/{features,platformAuth,tenancy,entitlements}.ts`,
`convex/platform/*`, `src/config/features.ts`) are **type-clean** by construction.

Pre-existing errors in security-adjacent files — **fix in Phase -1 before tenancy/entitlement
enforcement**:

| File                                  | Error                                                     | Severity                                                       |
| ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `convex/auth.ts:11`                   | unused `internal` import (TS6133)                         | trivial                                                        |
| `convex/users.ts:279`                 | unused `adminId` (TS6133)                                 | trivial                                                        |
| `convex/ontology/institutions.ts:18`  | unused `internalMutation` (TS6133)                        | trivial                                                        |
| `convex/ontology/institutions.ts:312` | unsafe cast in `setInstitutionConfig` (TS2352)            | **real — institution config write path; clean before Phase 1** |
| `src/hooks/useAuth.tsx:17,18,158,159` | unused imports + `userRole` type widening (TS6133/TS2322) | low (role display)                                             |

UI-drift heavy spots (defer, document): `Reconciliation` (51), `UserManagement` (44),
`AdminDashboard/hooks` (30), `PaymentManagement` (26) — admin components not on the control-plane
path.

## Rule going forward

1. New control-plane modules: **zero** type errors (enforced by review).
2. `convex/ontology/institutions.ts:312` cast cleaned before Phase 1 (it's on the tenant-config
   write path).
3. Total must not exceed 527 in any control-plane PR.
4. Full burn-down → flip `tsc -b` to blocking CI — tracked separately, not a Phase 0/1 blocker.
