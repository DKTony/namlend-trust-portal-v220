/**
 * Enrollment tests (convex-test harness). Proves the guarantees `enrollUser` exists to
 * provide, each of which corresponds to a real failure mode:
 *  - IDEMPOTENT: calling on every sign-in never produces a second profile or role
 *  - SELF-HEALING: a user row with no profile gets one (otherwise useAuth().user is
 *    null forever and ProtectedRoute loops back to /auth)
 *  - FILL-NOT-CLOBBER: a Google sign-in cannot wipe details entered during KYC
 *  - NO ROLE DOWNGRADE: staff signing in via a new provider stay staff
 *  - LINKING: a Google sign-in resolves onto the pre-existing password account, so one
 *    person never ends up with two identities / two KYC records
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import type { Id } from './_generated/dataModel';
import { enrollUser, findLinkableUserByEmail, resolveLinkTarget } from './lib/enrollment';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function harness() {
  return convexTest(schema, modules);
}

type T = ReturnType<typeof harness>;

/** A bare auth user, as Convex Auth creates it before enrollment runs. */
async function seedAuthUser(t: T, email?: string): Promise<Id<'users'>> {
  return t.run(async (ctx) => ctx.db.insert('users', email ? { email } : {}));
}

/** A password account row — what login actually resolves against. */
async function seedPasswordAccount(t: T, userId: Id<'users'>, email: string) {
  await t.run(async (ctx) => {
    await ctx.db.insert('authAccounts', {
      userId,
      provider: 'password',
      providerAccountId: email,
      secret: 'hashed',
    });
  });
}

async function getProfiles(t: T, userId: Id<'users'>) {
  return t.run(async (ctx) =>
    ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()
  );
}

async function getRoles(t: T, userId: Id<'users'>) {
  return t.run(async (ctx) =>
    ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()
  );
}

describe('enrollUser', () => {
  test('creates exactly one profile and one client role', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);

    const result = await t.run(async (ctx) =>
      enrollUser(ctx, {
        userId,
        email: 'new@example.com',
        fullName: 'Jane Doe',
        phone: '+264811234567',
        source: 'password',
      })
    );

    expect(result.created).toBe(true);

    const profiles = await getProfiles(t, userId);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].email).toBe('new@example.com');
    expect(profiles[0].fullName).toBe('Jane Doe');
    expect(profiles[0].phone).toBe('+264811234567');
    expect(profiles[0].kycStatus).toBe('pending');

    const roles = await getRoles(t, userId);
    expect(roles).toHaveLength(1);
    expect(roles[0].role).toBe('client');
  });

  test('is idempotent — repeat calls never duplicate the profile or role', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    const input = { userId, email: 'repeat@example.com', source: 'password' as const };

    const first = await t.run(async (ctx) => enrollUser(ctx, input));
    const second = await t.run(async (ctx) => enrollUser(ctx, { ...input, source: 'google' }));
    const third = await t.run(async (ctx) => enrollUser(ctx, { ...input, source: 'self_heal' }));

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(third.created).toBe(false);
    expect(second.profileId).toBe(first.profileId);

    expect(await getProfiles(t, userId)).toHaveLength(1);
    expect(await getRoles(t, userId)).toHaveLength(1);
  });

  test('self-heals a user that has a session but no profile', async () => {
    const t = harness();
    // Simulates the stranded state: auth succeeded, enrollment never ran.
    const userId = await seedAuthUser(t, 'stranded@example.com');
    expect(await getProfiles(t, userId)).toHaveLength(0);

    await t.run(async (ctx) =>
      enrollUser(ctx, { userId, email: 'stranded@example.com', source: 'self_heal' })
    );

    expect(await getProfiles(t, userId)).toHaveLength(1);
    expect(await getRoles(t, userId)).toHaveLength(1);
  });

  test('fills blank fields but never clobbers populated ones', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('profiles', {
        userId,
        email: 'kept@example.com',
        phone: '+264810000000', // entered during KYC — must survive
        kycStatus: 'verified',
        createdAt: 1,
        updatedAt: 1,
      });
    });

    await t.run(async (ctx) =>
      enrollUser(ctx, {
        userId,
        email: 'google@example.com',
        fullName: 'From Google', // blank before — should land
        phone: '+264819999999', // already set — must be ignored
        idNumber: '90010100123', // blank before — should land
        source: 'google',
      })
    );

    const [profile] = await getProfiles(t, userId);
    expect(profile.email).toBe('kept@example.com');
    expect(profile.phone).toBe('+264810000000');
    expect(profile.fullName).toBe('From Google');
    expect(profile.idNumber).toBe('90010100123');
    expect(profile.kycStatus).toBe('verified');
  });

  test('treats whitespace-only input as absent', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);

    await t.run(async (ctx) =>
      enrollUser(ctx, { userId, email: 'ws@example.com', fullName: '   ', source: 'password' })
    );

    const [profile] = await getProfiles(t, userId);
    expect(profile.fullName).toBeUndefined();
  });

  test('password sign-up is complete on arrival — the gate never fires for it', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);

    await t.run(async (ctx) =>
      enrollUser(ctx, {
        userId,
        email: 'pw@example.com',
        phone: '+264811111111',
        idNumber: '90010100123',
        source: 'password',
      })
    );

    const [profile] = await getProfiles(t, userId);
    expect(profile.signupSource).toBe('password');
    expect(profile.onboardingCompletedAt).toEqual(expect.any(Number));
  });

  test('google sign-up is left incomplete — OAuth gives no phone or ID', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);

    await t.run(async (ctx) =>
      enrollUser(ctx, {
        userId,
        email: 'g@example.com',
        fullName: 'G User',
        source: 'google',
      })
    );

    const [profile] = await getProfiles(t, userId);
    expect(profile.signupSource).toBe('google');
    expect(profile.onboardingCompletedAt).toBeUndefined();
  });

  test('supplying phone + ID later closes the gate', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    await t.run(async (ctx) =>
      enrollUser(ctx, { userId, email: 'g2@example.com', source: 'google' })
    );

    await t.run(async (ctx) =>
      enrollUser(ctx, {
        userId,
        phone: '+264812222222',
        idNumber: '85050500456',
        source: 'self_heal',
      })
    );

    const [profile] = await getProfiles(t, userId);
    expect(profile.onboardingCompletedAt).toEqual(expect.any(Number));
    // The origin of the account is history — it must not be rewritten.
    expect(profile.signupSource).toBe('google');
  });

  test('ANTI-TRAP: a pre-existing profile is never retro-gated', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    // Exactly what every profile in the database looks like today: no signupSource,
    // no phone, no idNumber. These users must never be forced through the new step.
    await t.run(async (ctx) => {
      await ctx.db.insert('profiles', {
        userId,
        email: 'legacy@example.com',
        kycStatus: 'pending',
        createdAt: 1,
        updatedAt: 1,
      });
    });

    await t.run(async (ctx) =>
      enrollUser(ctx, { userId, email: 'legacy@example.com', source: 'self_heal' })
    );

    const [profile] = await getProfiles(t, userId);
    expect(profile.signupSource).toBeUndefined();
    expect(profile.onboardingCompletedAt).toBeUndefined();
  });

  test('never downgrades an existing role', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('userRoles', { userId, role: 'admin', createdAt: 1 });
    });

    // An admin signing in through a new provider must not be demoted to `client`.
    await t.run(async (ctx) =>
      enrollUser(ctx, { userId, email: 'admin@example.com', source: 'google' })
    );

    const roles = await getRoles(t, userId);
    expect(roles).toHaveLength(1);
    expect(roles[0].role).toBe('admin');
  });
});

describe('findLinkableUserByEmail', () => {
  test('resolves the password account — the identity login actually uses', async () => {
    const t = harness();
    // Mirrors seedMutations.createTestUser: no email on the `users` row at all.
    const userId = await seedAuthUser(t);
    await seedPasswordAccount(t, userId, 'linkme@example.com');

    const found = await t.run(async (ctx) => findLinkableUserByEmail(ctx, 'linkme@example.com'));
    expect(found).toBe(userId);
  });

  test('normalises case and whitespace', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    await seedPasswordAccount(t, userId, 'case@example.com');

    const found = await t.run(async (ctx) => findLinkableUserByEmail(ctx, '  Case@Example.com  '));
    expect(found).toBe(userId);
  });

  test('falls back to the users.email index when there is no password account', async () => {
    const t = harness();
    const userId = await seedAuthUser(t, 'oauthonly@example.com');

    const found = await t.run(async (ctx) => findLinkableUserByEmail(ctx, 'oauthonly@example.com'));
    expect(found).toBe(userId);
  });

  test('refuses to guess when the email is ambiguous', async () => {
    const t = harness();
    await seedAuthUser(t, 'dupe@example.com');
    await seedAuthUser(t, 'dupe@example.com');

    const found = await t.run(async (ctx) => findLinkableUserByEmail(ctx, 'dupe@example.com'));
    expect(found).toBeNull();
  });

  test('returns null for unknown or empty emails', async () => {
    const t = harness();
    expect(
      await t.run(async (ctx) => findLinkableUserByEmail(ctx, 'nobody@example.com'))
    ).toBeNull();
    expect(await t.run(async (ctx) => findLinkableUserByEmail(ctx, ''))).toBeNull();
    expect(await t.run(async (ctx) => findLinkableUserByEmail(ctx, undefined))).toBeNull();
  });
});

describe('resolveLinkTarget (Google → existing account, pre-hijack defence)', () => {
  test('links onto a password account whose email is verified', async () => {
    const t = harness();
    const userId = await t.run((ctx) =>
      ctx.db.insert('users', { email: 'safe@example.com', emailVerificationTime: Date.now() })
    );
    await seedPasswordAccount(t, userId, 'safe@example.com');

    const target = await t.run((ctx) => resolveLinkTarget(ctx, 'safe@example.com'));
    expect(target).toBe(userId);
  });

  test('BLOCKS linking onto an unverified password account — the takeover shape', async () => {
    const t = harness();
    // Attacker password-registered the victim's address first: no emailVerificationTime.
    const userId = await seedAuthUser(t, 'victim@example.com');
    await seedPasswordAccount(t, userId, 'victim@example.com');

    await expect(t.run((ctx) => resolveLinkTarget(ctx, 'victim@example.com'))).rejects.toThrowError(
      /LINK_BLOCKED|password account/
    );
  });

  test('links onto a verified user with no password account (prior Google sign-in)', async () => {
    const t = harness();
    const userId = await t.run((ctx) =>
      ctx.db.insert('users', { email: 'gprior@example.com', emailVerificationTime: Date.now() })
    );

    const target = await t.run((ctx) => resolveLinkTarget(ctx, 'gprior@example.com'));
    expect(target).toBe(userId);
  });

  test('refuses to merge into an unverified bare user — creates fresh instead of blocking', async () => {
    const t = harness();
    // Direct DB insert with no credential at all: nothing to fall back to, so a block
    // would dead-end the visitor. Fork, don't block, don't merge.
    await seedAuthUser(t, 'bare@example.com');

    const target = await t.run((ctx) => resolveLinkTarget(ctx, 'bare@example.com'));
    expect(target).toBeNull();
  });

  test('returns null for unknown emails', async () => {
    const t = harness();
    expect(await t.run((ctx) => resolveLinkTarget(ctx, 'nobody@example.com'))).toBeNull();
    expect(await t.run((ctx) => resolveLinkTarget(ctx, undefined))).toBeNull();
  });
});
