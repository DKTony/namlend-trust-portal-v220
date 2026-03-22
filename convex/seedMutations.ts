/**
 * Seed mutations — called by seed.ts action.
 * Separate file because mutations cannot live in 'use node' files.
 */

import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

/** Elevate a user's role by email. */
export const elevateRole = internalMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin')),
  },
  handler: async (ctx, { email, role }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error(`No profile found for ${email}. Sign up via the app first.`);
    }

    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role });
      console.log(`[seed] Updated ${email} role to '${role}'`);
    } else {
      await ctx.db.insert('userRoles', {
        userId: profile.userId,
        role,
        createdAt: Date.now(),
      });
      console.log(`[seed] Created ${email} role as '${role}'`);
    }
  },
});

/** Insert a single test user directly into auth tables + profiles + userRoles. */
export const createTestUser = internalMutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    role: v.union(v.literal('client'), v.literal('loan_officer'), v.literal('admin')),
  },
  handler: async (ctx, { email, hashedPassword, role }) => {
    // Check if user already exists
    const existingProfile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();
    if (existingProfile) {
      console.log(`[seed] User ${email} already exists, skipping`);
      const existingRole = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', existingProfile.userId))
        .first();
      if (existingRole && existingRole.role !== role) {
        await ctx.db.patch(existingRole._id, { role });
        console.log(`[seed] Updated ${email} role to '${role}'`);
      }
      return;
    }

    const now = Date.now();

    // 1. Create user in Convex Auth users table
    const userId = await ctx.db.insert('users', {});

    // 2. Create auth account (password provider)
    await ctx.db.insert('authAccounts', {
      userId,
      provider: 'password',
      providerAccountId: email,
      secret: hashedPassword,
    });

    // 3. Create profile
    await ctx.db.insert('profiles', {
      userId,
      email,
      kycStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    // 4. Create role
    await ctx.db.insert('userRoles', {
      userId,
      role,
      createdAt: now,
    });

    console.log(`[seed] Created user ${email} with role '${role}'`);
  },
});

/** Seed approved KYC documents for a test user (for E2E testing). */
export const seedKycDocuments = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error(`No profile found for ${email}`);
    }

    const now = Date.now();

    // Check if KYC docs already exist
    const existingDocs = await ctx.db
      .query('kycDocuments')
      .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
      .collect();

    const hasIdCard = existingDocs.some((d) => d.documentType === 'id_card');
    const hasProofIncome = existingDocs.some((d) => d.documentType === 'proof_income');

    // Create ID card document if missing
    if (!hasIdCard) {
      await ctx.db.insert('kycDocuments', {
        userId: profile.userId,
        documentType: 'id_card',
        documentNumber: 'TEST-ID-001',
        status: 'approved',
        createdAt: now,
        updatedAt: now,
      });
      console.log(`[seed] Created approved ID card for ${email}`);
    }

    // Create proof of income document if missing
    if (!hasProofIncome) {
      await ctx.db.insert('kycDocuments', {
        userId: profile.userId,
        documentType: 'proof_income',
        status: 'approved',
        createdAt: now,
        updatedAt: now,
      });
      console.log(`[seed] Created approved proof of income for ${email}`);
    }

    // Update profile KYC status to verified
    await ctx.db.patch(profile._id, {
      kycStatus: 'verified',
      updatedAt: now,
    });

    console.log(`[seed] KYC documents seeded for ${email}`);
  },
});
