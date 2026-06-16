/**
 * Platform-staff authorization — the control-plane guards.
 *
 * Platform staff live in `platformAdmins`, deliberately OUTSIDE the tenant role model
 * (`userRoles`), so a tenant admin can never escalate into platform scope. These guards
 * protect Platform Console (`/platform/*`) functions.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Id } from '../_generated/dataModel';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

import { assertAuthenticated } from './auth';

const TENANT_ADMIN_ROLES = ['admin', 'tenant_admin'];
const TENANT_STAFF_ROLES = ['admin', 'tenant_admin', 'loan_officer'];

async function getPlatformAdmin(ctx: AnyCtx, userId: Id<'users'>) {
  return ctx.db
    .query('platformAdmins')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
}

async function getTenantRole(ctx: AnyCtx, userId: Id<'users'>): Promise<string | null> {
  const roleDoc = await ctx.db
    .query('userRoles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  return (roleDoc?.role as string | undefined) ?? null;
}

function isActivePlatformSupport(admin: Awaited<ReturnType<typeof getPlatformAdmin>>): boolean {
  return (
    !!admin &&
    admin.status === 'active' &&
    (admin.platformRole === 'platform_owner' || admin.platformRole === 'platform_support')
  );
}

function isActivePlatformOwner(admin: Awaited<ReturnType<typeof getPlatformAdmin>>): boolean {
  return !!admin && admin.status === 'active' && admin.platformRole === 'platform_owner';
}

/** Asserts the caller is an active `platform_owner`. */
export async function assertPlatformOwner(ctx: AnyCtx): Promise<Id<'users'>> {
  const userId = await assertAuthenticated(ctx);
  const admin = await getPlatformAdmin(ctx, userId);
  if (!isActivePlatformOwner(admin)) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires platform owner privileges.',
    });
  }
  return userId;
}

/**
 * Asserts the caller is active platform staff (owner OR support). Owner is a superset of
 * support, so owner passes this check too.
 */
export async function assertPlatformSupport(ctx: AnyCtx): Promise<Id<'users'>> {
  const userId = await assertAuthenticated(ctx);
  const admin = await getPlatformAdmin(ctx, userId);
  if (!isActivePlatformSupport(admin)) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires platform support privileges.',
    });
  }
  return userId;
}

/**
 * Allows either tenant staff (for existing `/admin/*` global/control-plane screens) OR active
 * platform staff (for the reused `/platform/*` control-plane screens).
 */
export async function assertStaffOrPlatformSupport(ctx: AnyCtx): Promise<Id<'users'>> {
  const userId = await assertAuthenticated(ctx);
  const [tenantRole, platformAdmin] = await Promise.all([
    getTenantRole(ctx, userId),
    getPlatformAdmin(ctx, userId),
  ]);

  if (
    (tenantRole && TENANT_STAFF_ROLES.includes(tenantRole)) ||
    isActivePlatformSupport(platformAdmin)
  ) {
    return userId;
  }

  throw new ConvexError({
    code: 'FORBIDDEN',
    message: 'This action requires staff or platform support privileges.',
  });
}

/**
 * Allows either tenant admins (for existing `/admin/*` behavior) OR active platform owners.
 * Platform support deliberately remains read-only.
 */
export async function assertAdminOrPlatformOwner(ctx: AnyCtx): Promise<Id<'users'>> {
  const userId = await assertAuthenticated(ctx);
  const [tenantRole, platformAdmin] = await Promise.all([
    getTenantRole(ctx, userId),
    getPlatformAdmin(ctx, userId),
  ]);

  if (
    (tenantRole && TENANT_ADMIN_ROLES.includes(tenantRole)) ||
    isActivePlatformOwner(platformAdmin)
  ) {
    return userId;
  }

  throw new ConvexError({
    code: 'FORBIDDEN',
    message: 'This action requires admin or platform owner privileges.',
  });
}

/** Returns the caller's platform role, or null if they are not platform staff. */
export async function getPlatformRole(
  ctx: AnyCtx,
  userId: Id<'users'>
): Promise<'platform_owner' | 'platform_support' | null> {
  const admin = await getPlatformAdmin(ctx, userId);
  if (!admin || admin.status !== 'active') return null;
  return admin.platformRole;
}
