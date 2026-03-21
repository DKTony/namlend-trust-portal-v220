/**
 * Authorization guard functions — replaces ALL 40+ Supabase RLS policies.
 *
 * Every query and mutation that returns user data MUST call one of these
 * guards before accessing the database. These functions throw ConvexError
 * with code "FORBIDDEN" or "UNAUTHENTICATED" so the frontend can display
 * meaningful error messages.
 *
 * Mapping from old RLS to new guards:
 *   USING (user_id = auth.uid())       → assertOwnerOrStaff(ctx, resource.userId)
 *   USING (is_staff(auth.uid()))       → assertStaff(ctx)
 *   USING (is_admin(auth.uid()))       → assertAdmin(ctx)
 *   SERVICE_ROLE edge functions        → internalMutation / internalAction (not callable from client)
 */

import { ConvexError } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

// ---------------------------------------------------------------------------
// Core identity assertions
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated userId or throws UNAUTHENTICATED.
 * Call this at the top of every query / mutation that touches user data.
 */
export async function assertAuthenticated(ctx: AnyCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({
      code: 'UNAUTHENTICATED',
      message: 'You must be signed in to perform this action.',
    });
  }
  return userId as Id<'users'>;
}

/**
 * Returns the authenticated userId and their role.
 */
async function getIdentityWithRole(ctx: AnyCtx) {
  const userId = await assertAuthenticated(ctx);
  const roleDoc = await ctx.db
    .query('userRoles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  return { userId, role: (roleDoc?.role as string | undefined) ?? null };
}

// ---------------------------------------------------------------------------
// Role-based assertions
// ---------------------------------------------------------------------------

/**
 * Asserts the caller has the 'admin' role.
 */
export async function assertAdmin(ctx: AnyCtx): Promise<Id<'users'>> {
  const { userId, role } = await getIdentityWithRole(ctx);
  if (role !== 'admin') {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires admin privileges.',
    });
  }
  return userId;
}

/**
 * Asserts the caller is loan_officer OR admin.
 */
export async function assertStaff(ctx: AnyCtx): Promise<Id<'users'>> {
  const { userId, role } = await getIdentityWithRole(ctx);
  if (role !== 'loan_officer' && role !== 'admin') {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires staff privileges.',
    });
  }
  return userId;
}

/**
 * Asserts the caller either owns the resource OR is staff.
 * Equivalent to: USING (user_id = auth.uid() OR is_staff(auth.uid()))
 */
export async function assertOwnerOrStaff(
  ctx: AnyCtx,
  resourceUserId: string | Id<'users'>
): Promise<Id<'users'>> {
  const { userId, role } = await getIdentityWithRole(ctx);
  const isOwner = userId === resourceUserId;
  const isStaff = role === 'loan_officer' || role === 'admin';
  if (!isOwner && !isStaff) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this resource.',
    });
  }
  return userId;
}

/**
 * Asserts the caller owns the resource (strict — no staff bypass).
 */
export async function assertOwner(
  ctx: AnyCtx,
  resourceUserId: string | Id<'users'>
): Promise<Id<'users'>> {
  const userId = await assertAuthenticated(ctx);
  if (userId !== resourceUserId) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this resource.',
    });
  }
  return userId;
}
