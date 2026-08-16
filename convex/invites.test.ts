/**
 * Tenant invite lifecycle (convex-test harness).
 *
 * Run: npm run test:convex -- convex/invites.test.ts
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { hashInviteToken } from './lib/inviteToken';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(
  t: ReturnType<typeof convexTest>,
  code: string
): Promise<Id<'institutions'>> {
  return t.run(async (ctx) =>
    ctx.db.insert('institutions', {
      name: code,
      shortCode: code,
      type: 'lender',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { role: string; institutionId?: Id<'institutions'>; email?: string }
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const email = opts.email ?? `${crypto.randomUUID()}@example.test`;
    const userId = await ctx.db.insert('users', { email });
    await ctx.db.insert('profiles', {
      userId,
      email,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      institutionId: opts.institutionId,
    });
    await ctx.db.insert('userRoles', {
      userId,
      role: opts.role as 'client' | 'loan_officer' | 'admin' | 'tenant_admin',
      institutionId: opts.institutionId,
      createdAt: Date.now(),
    });
    return userId;
  });
}

async function setInviteFlag(t: ReturnType<typeof convexTest>, enabled: boolean) {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query('businessRules')
      .withIndex('by_ruleCode', (q) => q.eq('ruleCode', 'TENANT_INVITES'))
      .collect();
    const now = Date.now();
    for (const row of existing) {
      if (row.effectiveTo === undefined) await ctx.db.patch(row._id, { effectiveTo: now });
    }
    await ctx.db.insert('businessRules', {
      ruleCode: 'TENANT_INVITES',
      category: 'platform',
      displayName: 'Tenant Email Invites',
      valueType: 'boolean',
      value: enabled ? 'true' : 'false',
      version: 1,
      effectiveFrom: now,
      createdAt: now,
    });
  });
}

describe('tenant invites — kill switch', () => {
  test('isEnabled is false when the rule is unset', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV0');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const status = await asUser(t, admin).query(api.invites.isEnabled, {});
    expect(status.enabled).toBe(false);
  });

  test('createInvite throws INVITE_DISABLED when the flag is off', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV1');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await expect(
      asUser(t, admin).mutation(api.invites.createInvite, {
        email: 'new.officer@example.test',
        intendedRole: 'loan_officer',
      })
    ).rejects.toMatchObject({ data: { code: 'INVITE_DISABLED' } });
  });
});

describe('tenant invites — authz', () => {
  test('loan officers cannot create invites', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV2');
    const officer = await seedUser(t, { role: 'loan_officer', institutionId: inst });
    await setInviteFlag(t, true);
    await expect(
      asUser(t, officer).mutation(api.invites.createInvite, {
        email: 'someone@example.test',
        intendedRole: 'client',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('cannot mint a platform role through intendedRole', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV3');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await setInviteFlag(t, true);
    await expect(
      asUser(t, admin).mutation(api.invites.createInvite, {
        email: 'owner@example.test',
        intendedRole: 'platform_owner' as never,
      })
    ).rejects.toThrow();
  });

  test('admin cannot revoke another tenant’s invite', async () => {
    const t = convexTest(schema, modules);
    const a = await seedInstitution(t, 'INVA');
    const b = await seedInstitution(t, 'INVB');
    const adminA = await seedUser(t, { role: 'tenant_admin', institutionId: a });
    const adminB = await seedUser(t, { role: 'tenant_admin', institutionId: b });
    await setInviteFlag(t, true);
    const created = await asUser(t, adminA).mutation(api.invites.createInvite, {
      email: 'cross@example.test',
      intendedRole: 'client',
    });
    await expect(
      asUser(t, adminB).mutation(api.invites.revokeInvite, { inviteId: created.inviteId })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
});

describe('tenant invites — lifecycle', () => {
  test('create, redeem, and land a staff invitee on /admin', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV4');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await setInviteFlag(t, true);

    const created = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'officer.new@example.test',
      intendedRole: 'loan_officer',
    });
    expect(created.token).toBeTruthy();
    expect(created.emailQueued).toBe(false);

    const storedHash = await t.run(async (ctx) => {
      const row = await ctx.db.get(created.inviteId);
      return row?.tokenHash;
    });
    expect(storedHash).toBe(await hashInviteToken(created.token!));
    expect(storedHash).not.toBe(created.token);

    const invitee = await seedUser(t, {
      role: 'client',
      institutionId: inst,
      email: 'officer.new@example.test',
    });
    const redeemed = await asUser(t, invitee).mutation(api.invites.redeemInvite, {
      token: created.token!,
    });
    expect(redeemed.landingRoute).toBe('/admin');
    expect(redeemed.intendedRole).toBe('loan_officer');

    const role = await t.run(async (ctx) => {
      const row = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', invitee))
        .first();
      return row?.role;
    });
    expect(role).toBe('loan_officer');
  });

  test('existing Google client is upgraded by a staff invite', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV5');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const client = await seedUser(t, {
      role: 'client',
      institutionId: inst,
      email: 'google.client@example.test',
    });
    await setInviteFlag(t, true);

    const created = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'google.client@example.test',
      intendedRole: 'tenant_admin',
    });
    const redeemed = await asUser(t, client).mutation(api.invites.redeemInvite, {
      token: created.token!,
    });
    expect(redeemed.landingRoute).toBe('/admin');
    const role = await t.run(async (ctx) => {
      const row = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', client))
        .first();
      return row?.role;
    });
    expect(role).toBe('tenant_admin');
  });

  test('staff invite cannot demote an existing tenant_admin', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV6');
    const admin = await seedUser(t, {
      role: 'tenant_admin',
      institutionId: inst,
      email: 'stay.admin@example.test',
    });
    await setInviteFlag(t, true);
    const created = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'stay.admin@example.test',
      intendedRole: 'client',
    });
    await expect(
      asUser(t, admin).mutation(api.invites.redeemInvite, { token: created.token! })
    ).rejects.toMatchObject({ data: { code: 'INVITE_INVALID' } });
    const role = await t.run(async (ctx) => {
      const row = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', admin))
        .first();
      return row?.role;
    });
    expect(role).toBe('tenant_admin');
  });

  test('email mismatch, revoke, and expiry all fail closed as INVITE_INVALID', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV7');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await setInviteFlag(t, true);

    const mismatch = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'target@example.test',
      intendedRole: 'client',
    });
    const stranger = await seedUser(t, {
      role: 'client',
      institutionId: inst,
      email: 'stranger@example.test',
    });
    await expect(
      asUser(t, stranger).mutation(api.invites.redeemInvite, { token: mismatch.token! })
    ).rejects.toMatchObject({ data: { code: 'INVITE_INVALID' } });

    const toRevoke = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'revoke.me@example.test',
      intendedRole: 'client',
    });
    await asUser(t, admin).mutation(api.invites.revokeInvite, { inviteId: toRevoke.inviteId });
    const invitee = await seedUser(t, {
      role: 'client',
      institutionId: inst,
      email: 'revoke.me@example.test',
    });
    await expect(
      asUser(t, invitee).mutation(api.invites.redeemInvite, { token: toRevoke.token! })
    ).rejects.toMatchObject({ data: { code: 'INVITE_INVALID' } });

    const toExpire = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'expired@example.test',
      intendedRole: 'client',
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(toExpire.inviteId, { expiresAt: Date.now() - 1 });
    });
    const expiredUser = await seedUser(t, {
      role: 'client',
      institutionId: inst,
      email: 'expired@example.test',
    });
    await expect(
      asUser(t, expiredUser).mutation(api.invites.redeemInvite, { token: toExpire.token! })
    ).rejects.toMatchObject({ data: { code: 'INVITE_INVALID' } });
  });

  test('createInvite is enumerate-resistant for a repeat email (rotates the pending row)', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INV8');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await setInviteFlag(t, true);
    const first = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'repeat@example.test',
      intendedRole: 'loan_officer',
    });
    const second = await asUser(t, admin).mutation(api.invites.createInvite, {
      email: 'repeat@example.test',
      intendedRole: 'loan_officer',
    });
    expect(second.inviteId).toBe(first.inviteId);
    expect(second.token).not.toBe(first.token);

    const listed = await asUser(t, admin).query(api.invites.listInvites, { status: 'pending' });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.email).toBe('repeat@example.test');
  });
});
