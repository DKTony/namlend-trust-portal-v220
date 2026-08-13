import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedUser(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: `${userId}@example.test`,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return userId;
  });
}

async function seedPlatformUser(
  t: ReturnType<typeof convexTest>,
  platformRole: 'platform_owner' | 'platform_support'
) {
  const userId = await seedUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert('platformAdmins', {
      userId,
      platformRole,
      status: 'active',
      createdAt: Date.now(),
    });
  });
  return userId;
}

describe('TigerBeetle global monitoring authorization', () => {
  test('tenant staff cannot read cross-tenant outbox totals', async () => {
    const t = convexTest(schema, modules);
    const tenantAdmin = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('userRoles', {
        userId: tenantAdmin,
        role: 'tenant_admin',
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser(t, tenantAdmin).query(api.tigerbeetle.outbox.getOutboxStats, {})
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('platform support retains read-only global monitoring access', async () => {
    const t = convexTest(schema, modules);
    const support = await seedPlatformUser(t, 'platform_support');

    await expect(
      asUser(t, support).query(api.tigerbeetle.outbox.getOutboxStats, {})
    ).resolves.toEqual({ pending: 0, failed: 0, deadLetter: 0 });
  });

  test('tenant staff cannot read or write global reconciliation records', async () => {
    const t = convexTest(schema, modules);
    const tenantAdmin = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert('userRoles', {
        userId: tenantAdmin,
        role: 'tenant_admin',
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser(t, tenantAdmin).query(api.tigerbeetle.reconciliation.listReconciliations, {})
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, tenantAdmin).mutation(api.tigerbeetle.reconciliation.recordReconciliation, {
        runDate: '2026-08-13',
        tbBalance: 100,
        dbBalance: 100,
        variance: 0,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('platform support can read reconciliations but cannot create them', async () => {
    const t = convexTest(schema, modules);
    const support = await seedPlatformUser(t, 'platform_support');

    await expect(
      asUser(t, support).query(api.tigerbeetle.reconciliation.listReconciliations, {})
    ).resolves.toEqual([]);
    await expect(
      asUser(t, support).mutation(api.tigerbeetle.reconciliation.recordReconciliation, {
        runDate: '2026-08-13',
        tbBalance: 100,
        dbBalance: 99,
        variance: 1,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('platform owners can create and read reconciliation records', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedPlatformUser(t, 'platform_owner');

    const reconciliationId = await asUser(t, owner).mutation(
      api.tigerbeetle.reconciliation.recordReconciliation,
      {
        runDate: '2026-08-13',
        tbBalance: 100,
        dbBalance: 99,
        variance: 1,
      }
    );

    const records = await asUser(t, owner).query(
      api.tigerbeetle.reconciliation.listReconciliations,
      {}
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      _id: reconciliationId,
      status: 'variance_detected',
      variance: 1,
    });
  });
});
