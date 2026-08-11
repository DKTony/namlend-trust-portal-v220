/**
 * User profile and role management.
 * Replaces: user_roles RPC functions + profiles table queries.
 *
 * Auth guards: every function checks authentication before returning data.
 * Role assignment requires assertAdmin().
 */

import { ConvexError, v } from 'convex/values';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalQuery, mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAdmin, assertAuthenticated, assertOwnerOrStaff, assertStaff } from './lib/auth';
import { kycDocumentTypeValidator } from './lib/documentPolicy';
import { emitDomainEvent } from './lib/domainEvents';
import { enrollUser } from './lib/enrollment';
import { deactivateRelationship, emitRelationship } from './lib/relationshipEmitter';
import { applyTenantScope, tenantReadScope } from './lib/tenancy';

// ---------------------------------------------------------------------------
// Profile queries
// ---------------------------------------------------------------------------

/** Get the current user's profile. Used immediately after sign-in. */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
  },
});

/** Get the current user's role. Frontend reads this to determine admin/staff UI. */
export const getMyRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const roleDoc = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    return roleDoc?.role ?? 'client';
  },
});

/** Get any user's profile (owner or staff). */
export const getUserProfile = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await assertOwnerOrStaff(ctx, userId);
    return ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
  },
});

/** List all user profiles with roles (admin only). */
export const listUsers = query({
  args: {
    role: v.optional(
      v.union(
        v.literal('client'),
        v.literal('loan_officer'),
        v.literal('admin'),
        v.literal('tenant_admin')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { role, limit }) => {
    await assertStaff(ctx);
    const scope = await tenantReadScope(ctx);

    const profiles = await ctx.db
      .query('profiles')
      .order('desc')
      .take(limit ?? 100);

    const result = await Promise.all(
      profiles.map(async (profile) => {
        const roleDoc = await ctx.db
          .query('userRoles')
          .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
          .first();
        return {
          ...profile,
          role: roleDoc?.role ?? 'client',
          institutionId: roleDoc?.institutionId,
        };
      })
    );

    // Tenant scope (profiles have no own institutionId — derive from the role row).
    // No-op while enforcement is off; null-institution rows treated as the caller's tenant.
    const scoped = applyTenantScope(result, scope);

    if (role) {
      return scoped.filter((u) => u.role === role);
    }
    return scoped;
  },
});

// ---------------------------------------------------------------------------
// Profile mutations
// ---------------------------------------------------------------------------

/**
 * Update own profile fields.
 *
 * `idNumber` is intentionally NOT accepted here: a client with `kycStatus: 'verified'`
 * could otherwise silently swap their national ID out from under the verified
 * documents. The ID lands set-once via `completeEnrollment` (audited); changing it
 * afterwards is a staff action.
 */
export const updateMyProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    employmentStatus: v.optional(v.string()),
    monthlyIncome: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    let profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!profile) {
      // Route the create path through enrollUser so the `userRoles` row is created
      // too — inserting the profile alone leaves the user without a role.
      const { profileId } = await enrollUser(ctx, { userId, source: 'self_heal' });
      profile = await ctx.db.get(profileId);
      if (!profile) throw new ConvexError({ code: 'ENROLLMENT_FAILED' });
    }

    await ctx.db.patch(profile._id, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Finish enrolling the signed-in user.
 *
 * Serves two callers with one implementation:
 *  1. the "complete your profile" step, which collects the details an OAuth provider
 *     can't give us (phone, ID number) — Google returns only email/name/avatar;
 *  2. password sign-up, which sends the ID number here because `idNumber` is not a
 *     column on the auth `users` table and so cannot ride the auth profile.
 *
 * It also doubles as the self-heal path: if the enrollment that normally runs during
 * sign-in was ever missed, this recreates the profile and role rather than leaving the
 * user stranded with `useAuth().user === null`.
 *
 * Idempotent, and fill-not-clobber — see `enrollUser`.
 */
export const completeEnrollment = mutation({
  args: {
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
    idNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    // This is the ONLY client-reachable write path for `idNumber` (updateMyProfile
    // deliberately does not accept it): enrollUser's fill-not-clobber semantics make
    // the national ID set-once, and setting it is identity-relevant → audit it.
    const before = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    const { profileId } = await enrollUser(ctx, { userId, ...args, source: 'self_heal' });

    const idNumberLanded = args.idNumber?.trim() && !before?.idNumber?.trim();
    if (idNumberLanded) {
      scheduleAuditLog(
        ctx,
        'user',
        userId,
        'identity_id_number_set',
        'unset',
        'set',
        'Set via profile completion (set-once; changes require staff)'
      );
    }
    return profileId;
  },
});

// ---------------------------------------------------------------------------
// Role mutations (admin only)
// ---------------------------------------------------------------------------

/**
 * Assign a role to a user. Replaces the `assign_role` RPC.
 * Only admins can call this.
 */
export const assignRole = mutation({
  args: {
    targetUserId: v.id('users'),
    // Mirrors the `userRoles.role` union in schema.ts. `tenant_admin` is the multi-tenant
    // successor to `admin` and is what the backoffice guards already treat as primary;
    // without it here the User Management UI cannot assign it at all.
    role: v.union(
      v.literal('client'),
      v.literal('loan_officer'),
      v.literal('admin'),
      v.literal('tenant_admin')
    ),
  },
  handler: async (ctx, { targetUserId, role }) => {
    const adminId = await assertAdmin(ctx);

    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();

    const previousRole = existing?.role ?? 'none';
    let roleDocId: Id<'userRoles'>;
    if (existing) {
      await ctx.db.patch(existing._id, { role, assignedBy: adminId });
      roleDocId = existing._id;
    } else {
      roleDocId = await ctx.db.insert('userRoles', {
        userId: targetUserId,
        role,
        assignedBy: adminId,
        createdAt: Date.now(),
      });
    }

    // Privilege changes are compliance-relevant: write the auditLogs trail
    // (mirrors removeRole), not just the domain event.
    scheduleAuditLog(ctx, 'userRole', roleDocId, 'ASSIGN_ROLE', previousRole, role);

    emitRelationship(
      ctx,
      { type: 'users', id: targetUserId },
      { type: 'userRoles', id: roleDocId },
      'has_role',
      { role }
    );
    emitDomainEvent(
      ctx,
      'user.role_assigned',
      'users',
      targetUserId,
      {
        role,
        assignedBy: adminId,
      },
      { actorId: adminId, actorType: 'user' }
    );
  },
});

/**
 * Remove a role from a user (downgrades to client).
 * Regulatory: Users cannot be deleted (7-year data retention).
 */
export const removeRole = mutation({
  args: {
    targetUserId: v.id('users'),
    role: v.union(
      v.literal('client'),
      v.literal('loan_officer'),
      v.literal('admin'),
      v.literal('tenant_admin')
    ),
  },
  handler: async (ctx, { targetUserId, role }) => {
    const adminId = await assertAdmin(ctx);

    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();

    if (!existing) return; // no role record = already effectively "client"
    if (existing.role !== role) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `User's current role is '${existing.role}', not '${role}'.`,
      });
    }
    // Downgrade to client — never delete the role record
    await ctx.db.patch(existing._id, { role: 'client', assignedBy: adminId });
    scheduleAuditLog(ctx, 'userRole', existing._id, 'REMOVE_ROLE', role, 'client');
    deactivateRelationship(
      ctx,
      { type: 'users', id: targetUserId },
      { type: 'userRoles', id: existing._id },
      'has_role'
    );
  },
});

/**
 * Deactivate a user (soft-delete). Sets profile status to "deactivated".
 * Regulatory: Cannot hard-delete — 7-year data retention on all financial records.
 */
export const deactivateUser = mutation({
  args: {
    targetUserId: v.id('users'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { targetUserId, reason }) => {
    await assertAdmin(ctx);

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        status: 'deactivated',
        updatedAt: Date.now(),
      });
      scheduleAuditLog(ctx, 'profiles', profile._id, 'DEACTIVATE', 'active', 'deactivated', reason);
    }
  },
});

/**
 * Get a user's profile by userId.
 * INTERNAL — used by processLoanApplication action for credit scoring inputs.
 */
export const getProfileByUserId = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
  },
});

/**
 * Admin: update another user's profile fields (fullName, phone).
 * Role changes must use assignRole separately.
 * Only admins can call this.
 */
export const adminUpdateProfile = mutation({
  args: {
    targetUserId: v.id('users'),
    fullName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { targetUserId, fullName, phone }) => {
    await assertStaff(ctx);
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();
    if (!profile) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Profile not found for this user.' });
    }
    await ctx.db.patch(profile._id, {
      ...(fullName !== undefined && { fullName }),
      ...(phone !== undefined && { phone }),
      updatedAt: Date.now(),
    });
    emitDomainEvent(ctx, 'user.profile_updated', 'profiles', profile._id, {
      userId: targetUserId,
      ...(fullName !== undefined && { fullName }),
      ...(phone !== undefined && { phone }),
    });
  },
});

/** Get role for any user (staff). */
export const getUserRole = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await assertStaff(ctx);
    const roleDoc = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    return roleDoc?.role ?? 'client';
  },
});

// ---------------------------------------------------------------------------
// Deprecated KYC shims — DELETE once the deployed frontend has been rebuilt
// ---------------------------------------------------------------------------

/**
 * BACKWARD-COMPATIBILITY ONLY. Do not call from new code.
 *
 * The KYC upload functions moved from this file into `convex/kycDocuments.ts`
 * (versioned documents, server-side file validation, per-document review). A Convex
 * backend push is instant while the browser bundle on Netlify is whatever was last
 * built — so between those two events the live `KYC-*.js` chunk was still calling
 * `users:generateKycUploadUrl` / `users:recordKycDocument` and getting
 * "Could not find public function", i.e. clients could not upload KYC documents at all.
 *
 * These two names are the ENTIRE overlap: all 42 chunks of the deployed bundle were
 * scanned, and only the KYC chunk referenced anything removed. `getMyKycDocuments`,
 * `reviewKycDocument` and `ensureProfile` are unreferenced and deliberately not shimmed.
 *
 * They delegate to the new implementation rather than reproducing the old one, so
 * uploads from the old bundle still get versioning, validation and KYC reopening.
 *
 * REMOVAL: safe to delete once Netlify has rebuilt from a commit containing the new
 * `src/pages/KYC.tsx`, which calls `kycDocuments.*` directly.
 */
export const generateKycUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

/** @deprecated See `generateKycUploadUrl` above. Delegates to `kycDocuments.recordDocument`. */
export const recordKycDocument = mutation({
  args: {
    documentType: kycDocumentTypeValidator,
    fileStorageId: v.id('_storage'),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  // Explicit return type is REQUIRED, not stylistic: calling `api.kycDocuments.*` from a
  // file that `api` itself includes makes the inferred type circular (TS7022/TS7023), and
  // the resulting `any` leaks out through the generated API into consumer components.
  handler: async (ctx, args): Promise<Id<'kycDocuments'>> => {
    // `recordDocument` guards too, but the house rule is that every public function
    // asserts for itself — a delegate is not a substitute for a visible guard.
    await assertAuthenticated(ctx);
    // `fileSize` is intentionally dropped: the new path reads the real size from
    // storage metadata rather than trusting a client-supplied number.
    return ctx.runMutation(api.kycDocuments.recordDocument, {
      documentType: args.documentType,
      fileStorageId: args.fileStorageId,
      fileName: args.fileName ?? 'document',
    });
  },
});
