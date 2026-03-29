/**
 * User profile and role management.
 * Replaces: user_roles RPC functions + profiles table queries.
 *
 * Auth guards: every function checks authentication before returning data.
 * Role assignment requires assertAdmin().
 */

import { v, ConvexError } from 'convex/values';
import { query, mutation, internalQuery } from './_generated/server';
import { assertAuthenticated, assertAdmin, assertOwnerOrStaff } from './lib/auth';
import { scheduleAuditLog } from './lib/audit';
import { emitRelationship, deactivateRelationship } from './lib/relationshipEmitter';

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
    role: v.optional(v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { role, limit }) => {
    await assertAdmin(ctx);

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
        return { ...profile, role: roleDoc?.role ?? 'client' };
      })
    );

    if (role) {
      return result.filter((u) => u.role === role);
    }
    return result;
  },
});

// ---------------------------------------------------------------------------
// Profile mutations
// ---------------------------------------------------------------------------

/** Update own profile fields. */
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
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!profile) {
      await ctx.db.insert('profiles', {
        userId,
        email: '',
        ...args,
        kycStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(profile._id, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Ensure a profile exists for the current user.
 * Called from the frontend after first sign-in for graceful recovery.
 */
export const ensureProfile = mutation({
  args: {
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (existing) return existing._id;

    const profileId = await ctx.db.insert('profiles', {
      userId,
      email: args.email,
      fullName: args.fullName,
      kycStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const existingRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (!existingRole) {
      await ctx.db.insert('userRoles', {
        userId,
        role: 'client',
        createdAt: Date.now(),
      });
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
    role: v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin')),
  },
  handler: async (ctx, { targetUserId, role }) => {
    const adminId = await assertAdmin(ctx);

    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role, assignedBy: adminId });
    } else {
      await ctx.db.insert('userRoles', {
        userId: targetUserId,
        role,
        assignedBy: adminId,
        createdAt: Date.now(),
      });
    }
    emitRelationship(
      ctx,
      { type: 'users', id: targetUserId },
      { type: 'userRoles', id: existing?._id ?? targetUserId },
      'has_role',
      { role }
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
    role: v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin')),
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
    const adminId = await assertAdmin(ctx);

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

// ---------------------------------------------------------------------------
// KYC document upload
// ---------------------------------------------------------------------------

/** Generate a signed upload URL for KYC document upload. */
export const generateKycUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

/** Record a KYC document after file upload to Convex Storage. */
export const recordKycDocument = mutation({
  args: {
    documentType: v.string(),
    fileStorageId: v.id('_storage'),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const now = Date.now();

    const docId = await ctx.db.insert('kycDocuments', {
      userId,
      documentType: args.documentType,
      fileStorageId: args.fileStorageId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return docId;
  },
});

/** Get the current user's KYC documents. */
export const getMyKycDocuments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('kycDocuments')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
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
    await assertAdmin(ctx);
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
  },
});

/**
 * Admin: review (approve or reject) a KYC document.
 * On approval, automatically marks profiles.kycStatus = "verified" when ALL
 * of the user's documents are approved. On rejection, marks profile as "rejected".
 * Both changes are audit-logged.
 */
export const reviewKycDocument = mutation({
  args: {
    documentId: v.id('kycDocuments'),
    status: v.union(v.literal('approved'), v.literal('rejected')),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, status, reviewNotes }) => {
    const adminId = await assertAdmin(ctx);
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new ConvexError({ code: 'NOT_FOUND', message: 'KYC document not found.' });

    const oldStatus = doc.status;
    await ctx.db.patch(documentId, {
      status,
      reviewedBy: adminId,
      reviewNotes,
      updatedAt: Date.now(),
    });

    scheduleAuditLog(ctx, 'kycDocument', documentId, 'REVIEW_KYC', oldStatus, status, reviewNotes);

    // Fetch the user's profile for kycStatus update and notification
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', doc.userId))
      .first();

    if (status === 'approved') {
      // Check if ALL docs for this user are now approved
      const allDocs = await ctx.db
        .query('kycDocuments')
        .withIndex('by_userId', (q) => q.eq('userId', doc.userId))
        .collect();

      // This doc is already patched; treat it as approved in the check
      const allApproved =
        allDocs.length > 0 &&
        allDocs.every((d) => (d._id === documentId ? true : d.status === 'approved'));

      if (allApproved && profile && profile.kycStatus !== 'verified') {
        const prevKycStatus = profile.kycStatus;
        await ctx.db.patch(profile._id, { kycStatus: 'verified', updatedAt: Date.now() });
        scheduleAuditLog(ctx, 'profile', profile._id, 'KYC_VERIFIED', prevKycStatus, 'verified');
      }
    } else {
      // Rejected doc → mark profile as rejected unless it was already rejected
      if (profile && profile.kycStatus !== 'rejected') {
        const prevKycStatus = profile.kycStatus;
        await ctx.db.patch(profile._id, { kycStatus: 'rejected', updatedAt: Date.now() });
        scheduleAuditLog(ctx, 'profile', profile._id, 'KYC_REJECTED', prevKycStatus, 'rejected');
      }
    }
  },
});

/** Get role for any user (admin only). */
export const getUserRole = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await assertAdmin(ctx);
    const roleDoc = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    return roleDoc?.role ?? 'client';
  },
});
