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

import { getAuthUserId } from '@convex-dev/auth/server';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Id } from '../_generated/dataModel';
import { internalQuery } from '../_generated/server';

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
 * Tenant-admin role set. `tenant_admin` is the multi-tenant successor to `admin`; both are
 * accepted during the additive Phase-0 transition so existing `admin` users are unaffected.
 */
const ADMIN_ROLES = ['admin', 'tenant_admin'];
/** Staff = any admin role plus loan_officer. */
const STAFF_ROLES = ['admin', 'tenant_admin', 'loan_officer'];

/**
 * Asserts the caller has a tenant-admin role (`admin` or `tenant_admin`).
 */
export async function assertAdmin(ctx: AnyCtx): Promise<Id<'users'>> {
  const { userId, role } = await getIdentityWithRole(ctx);
  if (!role || !ADMIN_ROLES.includes(role)) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires admin privileges.',
    });
  }
  return userId;
}

/**
 * Asserts the caller is loan_officer OR a tenant-admin role.
 */
export async function assertStaff(ctx: AnyCtx): Promise<Id<'users'>> {
  const { userId, role } = await getIdentityWithRole(ctx);
  if (!role || !STAFF_ROLES.includes(role)) {
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
  const isStaff = !!role && STAFF_ROLES.includes(role);
  if (!isOwner && !isStaff) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this resource.',
    });
  }
  return userId;
}

// ---------------------------------------------------------------------------
// Tenant-scoped role assertions (multi-tenant — Phase 0 additive)
// ---------------------------------------------------------------------------

/**
 * Returns the caller's userId, role, and bound institution (if any).
 */
async function getTenantIdentity(ctx: AnyCtx) {
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
 * Asserts the caller holds one of `roles` AND, if their account is already bound to a
 * tenant, that it matches `institutionId`. Tolerant of an unbound account during the
 * Phase-0/1 transition (binding becomes mandatory once tenancy is enforced in Phase 1).
 */
export async function assertTenantRole(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>,
  roles: string[]
): Promise<Id<'users'>> {
  const { userId, role, institutionId: bound } = await getTenantIdentity(ctx);
  if (!role || !roles.includes(role)) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have the required role for this action.',
    });
  }
  if (bound && bound !== institutionId) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this tenant.',
    });
  }
  return userId;
}

/** Tenant admin within a specific institution. */
export function assertTenantAdmin(ctx: AnyCtx, institutionId: Id<'institutions'>) {
  return assertTenantRole(ctx, institutionId, ADMIN_ROLES);
}

/** Tenant staff (admin or loan_officer) within a specific institution. */
export function assertTenantStaff(ctx: AnyCtx, institutionId: Id<'institutions'>) {
  return assertTenantRole(ctx, institutionId, STAFF_ROLES);
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

export const assertAdminForAction = internalQuery({
  args: {},
  handler: async (ctx) => {
    return assertAdmin(ctx);
  },
});
