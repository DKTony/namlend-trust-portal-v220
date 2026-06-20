/**
 * Seed mutations — called by seed.ts action.
 * Separate file because mutations cannot live in 'use node' files.
 */

import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';

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

/**
 * Seed a deterministic platform_owner test account (E2E only).
 *
 * AUTH-ACCOUNTS-FIRST: the password `authAccounts` row (providerAccountId === email) is the
 * single source of truth for the identity that login actually resolves to. We create-or-find
 * THAT exact userId and grant `platform_owner` to it. This is what makes the test robust: it can
 * never grant to a stale/duplicate `profiles` row whose userId diverges from the login identity
 * (the exact bug that blocked the manual /platform smoke). Idempotent — safe to re-run.
 *
 * The account keeps a non-staff tenant role (`client`) on purpose: a PURE platform_owner, so the
 * /platform test genuinely exercises the P1 guard-widening (assertAdminOrPlatformOwner /
 * assertStaffOrPlatformSupport) rather than passing via a tenant-admin path.
 */
export const seedPlatformOwnerForE2E = internalMutation({
  args: { ownerEmail: v.string(), hashedPassword: v.string() },
  handler: async (ctx, { ownerEmail, hashedPassword }) => {
    const now = Date.now();

    // 1. authAccounts is the login source of truth — find or create by it.
    const authAccount = await ctx.db
      .query('authAccounts')
      .filter((q) => q.eq(q.field('providerAccountId'), ownerEmail))
      .first();

    let userId: Id<'users'>;
    if (authAccount) {
      userId = authAccount.userId;
    } else {
      userId = await ctx.db.insert('users', {});
      await ctx.db.insert('authAccounts', {
        userId,
        provider: 'password',
        providerAccountId: ownerEmail,
        secret: hashedPassword,
      });
    }

    // 2. Ensure exactly one profile bound to this exact userId.
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (!profile) {
      await ctx.db.insert('profiles', {
        userId,
        email: ownerEmail,
        kycStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Ensure a tenant role (client — platform role is orthogonal to tenant role).
    const roleRow = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (!roleRow) {
      await ctx.db.insert('userRoles', { userId, role: 'client', createdAt: now });
    }

    // 4. Upsert platform_owner by the EXACT login userId (never by a divergent profile lookup).
    const existing = await ctx.db
      .query('platformAdmins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    if (existing) {
      if (existing.platformRole !== 'platform_owner' || existing.status !== 'active') {
        await ctx.db.patch(existing._id, { platformRole: 'platform_owner', status: 'active' });
      }
    } else {
      await ctx.db.insert('platformAdmins', {
        userId,
        platformRole: 'platform_owner',
        status: 'active',
        createdAt: now,
      });
    }

    console.log(`[seed] platform_owner ready for ${ownerEmail} (userId=${userId})`);
    return { userId, email: ownerEmail };
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

/** Seed a confirmed IPP alias for a test user so UI/E2E flows do not depend on live callbacks. */
export const seedConfirmedIpsAlias = internalMutation({
  args: {
    email: v.string(),
    aliasAddr: v.string(),
    idValue: v.string(),
    linkedBankBic: v.optional(v.string()),
    linkedAccountRef: v.optional(v.string()),
    accountHolderName: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { email, aliasAddr, idValue, linkedBankBic, linkedAccountRef, accountHolderName, isDefault }
  ) => {
    const profile = await ctx.db
      .query('profiles')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (!profile) {
      throw new Error(`No profile found for ${email}`);
    }

    const now = Date.now();
    const makeDefault = isDefault ?? true;
    const existing = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', aliasAddr))
      .first();

    if (makeDefault) {
      const userAliases = await ctx.db
        .query('ipsAliasDirectory')
        .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
        .collect();

      for (const alias of userAliases) {
        if (alias.addr !== aliasAddr && alias.isDefault) {
          await ctx.db.patch(alias._id, {
            isDefault: false,
            updatedAt: now,
          });
        }
      }
    }

    const confirmedAlias = {
      userId: profile.userId,
      addr: aliasAddr,
      entityType: 'PERSON' as const,
      idType: 'NUMERICID' as const,
      idValue,
      status: 'ACTIVE' as const,
      cmId: `CM-E2E-${aliasAddr}`,
      linkedAccountRef:
        linkedAccountRef ?? `E2E-${aliasAddr.replace(/[^a-z0-9]/gi, '').toUpperCase()}`,
      linkedBankBic: linkedBankBic ?? 'FIRNNANX',
      accountHolderName: accountHolderName ?? email.split('@')[0],
      syncedWithIps: true,
      lastSyncAt: now,
      syncError: undefined,
      isDefault: makeDefault,
      updatedAt: now,
    };

    if (existing) {
      if (existing.userId !== profile.userId) {
        throw new Error(`Alias ${aliasAddr} is already owned by another user.`);
      }

      await ctx.db.patch(existing._id, confirmedAlias);
      console.log(`[seed] Confirmed IPP alias ${aliasAddr} for ${email}`);
      return existing._id;
    }

    const aliasId = await ctx.db.insert('ipsAliasDirectory', {
      ...confirmedAlias,
      createdAt: now,
    });
    console.log(`[seed] Created confirmed IPP alias ${aliasAddr} for ${email}`);
    return aliasId;
  },
});

/** Seed settlement participants required for IPP inter-participant clearing E2E flows. */
export const seedSettlementParticipants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const participants = [
      {
        routingCode: 'NAMLEND',
        swiftBic: 'NAMLNANX',
        name: 'NamLend Trust',
        participantType: 'sponsored' as const,
        nissAccountRef: 'NISS-NAMLEND-E2E',
        isOperator: true,
      },
      {
        routingCode: 'FNB',
        swiftBic: 'FIRNNANX',
        name: 'First National Bank Namibia',
        participantType: 'direct' as const,
        nissAccountRef: 'NISS-FNB-E2E',
        isOperator: false,
      },
    ];

    for (const participant of participants) {
      const existing = await ctx.db
        .query('settlementParticipants')
        .withIndex('by_routingCode', (q) => q.eq('routingCode', participant.routingCode))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...participant,
          status: 'active',
          updatedAt: now,
        });
        console.log(`[seed] Updated settlement participant ${participant.routingCode}`);
      } else {
        await ctx.db.insert('settlementParticipants', {
          ...participant,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
        console.log(`[seed] Created settlement participant ${participant.routingCode}`);
      }
    }
  },
});
