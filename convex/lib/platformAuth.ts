/**
 * Platform-staff authorization — the control-plane guards.
 *
 * Platform staff live in `platformAdmins`, deliberately OUTSIDE the tenant role model
 * (`userRoles`), so a tenant admin can never escalate into platform scope. These guards
 * protect Platform Console (`/platform/*`) functions.
 */

import { ConvexError } from 'convex/values';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

import { assertAuthenticated } from './auth';

async function getPlatformAdmin(ctx: AnyCtx, userId: Id<'users'>) {
  return ctx.db
    .query('platformAdmins')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
}

/** Asserts the caller is an active `platform_owner`. */
export async function assertPlatformOwner(ctx: AnyCtx): Promise<Id<'users'>> {
  const userId = await assertAuthenticated(ctx);
  const admin = await getPlatformAdmin(ctx, userId);
  if (!admin || admin.status !== 'active' || admin.platformRole !== 'platform_owner') {
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
  if (
    !admin ||
    admin.status !== 'active' ||
    (admin.platformRole !== 'platform_owner' && admin.platformRole !== 'platform_support')
  ) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires platform support privileges.',
    });
  }
  return userId;
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
