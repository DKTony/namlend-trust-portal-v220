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
