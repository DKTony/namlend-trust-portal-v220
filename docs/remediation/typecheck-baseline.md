# TypeScript Baseline (Production-Safe Hardening)

> Snapshot of the real type-check gate. The previously-cited `npx tsc --noEmit`
> compiles **zero files** (root `tsconfig.json` has `"files": []` and ignores
> project references without `-b`), so it always "passed" falsely. The real gate
> is `tsc -b`, added as `npm run typecheck`.

## Command

```bash
npm run typecheck          # tsc -b
npm run typecheck:baseline # tsc -b --pretty false  (machine-readable)
```

## Snapshot

- **Timestamp:** 2026-06-12
- **Command:** `npx tsc -b --pretty false`
- **Total errors:** **530**
- **Status of the gate:** runnable, **non-blocking** in CI until burn-down completes (see plan Phase 4 / conditional release gate).

## Top error categories

| Count | Code                     | Meaning                                                                                   |
| ----: | ------------------------ | ----------------------------------------------------------------------------------------- |
|   234 | TS6133                   | Declared but never used (strict `noUnusedLocals`/`noUnusedParameters`)                    |
|   126 | TS7006                   | Parameter implicitly has `any` type                                                       |
|    50 | TS2322                   | Type not assignable (mostly `strictNullChecks` — possibly-undefined Convex query results) |
|    28 | TS2339                   | Property does not exist on type                                                           |
|    14 | TS2345                   | Argument type not assignable                                                              |
|    12 | TS7053                   | Implicit `any` element access                                                             |
|     9 | TS7022 / TS6196 / TS2304 | Implicit any (self-ref) / unused type / cannot find name                                  |

## Highest-density directories

| Count | Directory                                               |
| ----: | ------------------------------------------------------- |
|    51 | `src/pages/AdminDashboard/components/Reconciliation`    |
|    44 | `src/pages/AdminDashboard/components/UserManagement`    |
|    30 | `src/pages/AdminDashboard/hooks`                        |
|    27 | `src/hooks`                                             |
|    26 | `src/pages/AdminDashboard/components/PaymentManagement` |
|    25 | `src/utils` (legacy Supabase utilities)                 |
|    13 | `convex/ips`                                            |

## Invariant for ongoing work

Each hardening change must be re-checked with `npm run typecheck`; the total
**must not exceed 530** (no new errors). The financial-backend changes in this
program introduced **0** new errors (the headline approval refactor reduced the
count from 546 → 530).

## Known characteristics / false-positive-ish

- The bulk (TS6133 + TS7006 = 360) is concentrated in legacy Supabase utilities
  (`src/utils/*`) and admin UI components untouched by this program. These are
  burn-down candidates, not correctness regressions introduced here.
- Once burn-down reaches 0, flip CI to **blocking** so new TS errors fail the build.
