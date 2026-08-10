# Authorization Matrix (control plane + data plane)

How each guard maps to roles, tenant scope, and entitlement. Phase 0 ships the guards; tenancy
and entitlement enforcement are wired in Phases 1–2.

## Identity planes

| Plane    | Stored in                      | Roles                                                       | Scope        |
| -------- | ------------------------------ | ----------------------------------------------------------- | ------------ |
| Tenant   | `userRoles` (+`institutionId`) | `tenant_admin` (≡ legacy `admin`), `loan_officer`, `client` | one tenant   |
| Platform | `platformAdmins`               | `platform_owner`, `platform_support`                        | cross-tenant |

## Guard reference

| Guard                                     | File                  | Passes for                               | Notes                                   |
| ----------------------------------------- | --------------------- | ---------------------------------------- | --------------------------------------- |
| `assertAuthenticated`                     | `lib/auth.ts`         | any signed-in user                       | —                                       |
| `assertOwner`                             | `lib/auth.ts`         | resource owner                           | strict, no staff bypass                 |
| `assertOwnerOrStaff`                      | `lib/auth.ts`         | owner OR staff                           | staff = loan_officer/admin/tenant_admin |
| `assertStaff`                             | `lib/auth.ts`         | loan_officer/admin/tenant_admin          | widened in Phase 0                      |
| `assertAdmin`                             | `lib/auth.ts`         | admin/tenant_admin                       | widened in Phase 0                      |
| `assertTenantRole(inst, roles)`           | `lib/auth.ts`         | role ∈ roles AND tenant match (if bound) | tenant-scoped                           |
| `assertTenantAdmin` / `assertTenantStaff` | `lib/auth.ts`         | tenant-scoped admin / staff              | —                                       |
| `assertPlatformOwner`                     | `lib/platformAuth.ts` | active `platform_owner`                  | control plane                           |
| `assertPlatformSupport`                   | `lib/platformAuth.ts` | active platform owner OR support         | control plane                           |
| `assertFeatureEnabled(inst, key)`         | `lib/entitlements.ts` | tenant entitled to key                   | **INERT in Phase 0** (kill-switch off)  |
| `requireTenantContext`                    | `lib/tenancy.ts`      | bound tenant user                        | enforced in Phase 1+                    |

## Console landing (frontend)

Where a signed-in identity is sent. Single source of truth: `src/lib/routing.ts`
(`getLandingRoute`) — the login page, the route guards and both shells all call it, so the
mapping cannot drift between them.

| Identity                                  | Lands on     |
| ----------------------------------------- | ------------ |
| `platform_owner` / `platform_support`     | `/platform`  |
| `tenant_admin` / `admin` / `loan_officer` | `/admin`     |
| `client`                                  | `/dashboard` |

**Platform wins over tenant.** The planes are separate, and the common case is a pure
`platform_owner` whose tenant role is `client`; resolving tenant-first would hide the console
they signed in for. A dual-role identity reaches `/admin` from the nav.

**Landing must wait for `authReady`.** `user` comes from `users.getMyProfile` while the role
flags come from `users.getMyRole` and `platform.admins.getMyPlatformRole` — three independent
subscriptions. Until all three settle, every role flag reads `false`, which is
indistinguishable from "this user is a client". `useAuth` exposes `authReady` for exactly this;
deciding a route before it is true silently downgrades staff to the client dashboard.

**`?next=` is untrusted on both sides.** `ProtectedRoute` writes it via `buildAuthRedirect`
(preserving query and hash) and the auth page re-validates on read via `sanitizeNextPath` —
the query string is user-controlled in between. A target the caller cannot open falls back to
their own console rather than a dead-end denial; `ProtectedRoute` remains the enforcement
point, `canAccessPath` only answers "should we send them there at all".

## Resolution order (target, Phase 2+)

```
caller → tenant context → tenant role → entitlement → platform guardrails → tenant-scoped data
```

## Phase 0 status

- Tenant guards **widened** (accept `tenant_admin`) — behavior-neutral.
- Platform guards **added** — not yet wired to any route (`/platform/*` is Phase 3).
- `assertFeatureEnabled` **allow-all** until `ENTITLEMENT_ENFORCEMENT` businessRule = true (Phase 2).
- `requireTenantContext` resolves but is not yet called on data-plane paths (Phase 1).

## Sensitive-surface rules (carry into later phases)

- Platform support ≠ tenant admin: support crosses tenants → `supportAccessAudit`, progressive
  L0–L3 access (blueprint §8).
- Platform guardrails (APR cap, retention, KYC min) are non-relaxable by tenants — server-enforced
  even if a tenant UI hides the field.
