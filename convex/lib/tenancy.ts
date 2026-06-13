/**
 * Tenant context resolution — the data-plane tenancy boundary.
 *
 * Phase 0 (this file) only *resolves* the caller's tenant; it does NOT yet enforce
 * row-level isolation (that is Phase 1, where tenant-scoped data-access helpers will own
 * the `withIndex('by_institutionId', …)` so feature modules cannot write raw cross-tenant
 * queries). Resolution is tolerant of an unbound account during the transition.
 */

import { ConvexError } from 'convex/values';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { assertAuthenticated } from './auth';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export interface TenantContext {
  userId: Id<'users'>;
  role: string | null;
  /** Bound tenant, or null if the account is not yet bound (transition state). */
  institutionId: Id<'institutions'> | null;
}

/**
 * Resolve the caller's tenant context from `userRoles`. Never throws on a missing tenant
 * binding (Phase 0) — returns `institutionId: null` so callers can phase in enforcement.
 */
export async function getCallerInstitution(ctx: AnyCtx): Promise<TenantContext> {
  const userId = await assertAuthenticated(ctx);
  const roleDoc = await ctx.db
    .query('userRoles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  return {
    userId,
    role: (roleDoc?.role as string | undefined) ?? null,
    institutionId: roleDoc?.institutionId ?? null,
  };
}

/**
 * Like `getCallerInstitution` but requires a bound tenant. Use this in Phase 1+ on paths
 * that must be tenant-scoped. In Phase 0 most callers use the tolerant variant above.
 */
export async function requireTenantContext(
  ctx: AnyCtx
): Promise<TenantContext & { institutionId: Id<'institutions'> }> {
  const tenant = await getCallerInstitution(ctx);
  if (!tenant.institutionId) {
    throw new ConvexError({
      code: 'TENANT_CONTEXT_REQUIRED',
      message: 'Your account is not bound to a tenant.',
    });
  }
  return { ...tenant, institutionId: tenant.institutionId };
}
