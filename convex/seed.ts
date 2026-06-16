'use node';

/**
 * Seed action — creates test users with hashed passwords.
 *
 * Usage:
 *   npx convex run seed:seedTestUsers
 *   (creates all 4 test users + assigns roles)
 */

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

/**
 * Seed all 4 test users. Idempotent — safe to run multiple times.
 *   npx convex run seed:seedTestUsers
 */
export const seedTestUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    // Hash the test password using Scrypt (same as @convex-dev/auth Password provider)
    const { Scrypt } = await import('lucia');
    const scrypt = new Scrypt();
    const hashedPassword = await scrypt.hash('Test1234!');

    const testUsers = [
      { email: 'client1@test.namlend.com', role: 'client' as const },
      { email: 'client2@test.namlend.com', role: 'client' as const },
      { email: 'admin@test.namlend.com', role: 'admin' as const },
      { email: 'loan_officer@test.namlend.com', role: 'loan_officer' as const },
    ];

    for (const user of testUsers) {
      await ctx.runMutation(internal.seedMutations.createTestUser, {
        email: user.email,
        hashedPassword,
        role: user.role,
      });
    }

    // Seed KYC documents for client1 to enable loan application E2E tests
    console.log('[seed] Seeding KYC documents for client1...');
    try {
      await ctx.runMutation(internal.seedMutations.seedKycDocuments, {
        email: 'client1@test.namlend.com',
      });
      console.log('[seed] KYC documents seeded successfully');
    } catch (error) {
      console.error('[seed] Failed to seed KYC documents:', error);
      throw error;
    }

    console.log('[seed] Seeding confirmed IPP aliases for E2E users...');
    await ctx.runMutation(internal.seedMutations.seedConfirmedIpsAlias, {
      email: 'client1@test.namlend.com',
      aliasAddr: 'client1@namlend',
      idValue: '1002003001',
      accountHolderName: 'Client One',
      isDefault: false,
    });
    await ctx.runMutation(internal.seedMutations.seedConfirmedIpsAlias, {
      email: 'client1@test.namlend.com',
      aliasAddr: 'client1@fnb',
      idValue: '1002003001',
      linkedBankBic: 'FIRNNANX',
      linkedAccountRef: 'E2E-CLIENT1-FNB',
      accountHolderName: 'Client One',
      isDefault: true,
    });
    await ctx.runMutation(internal.seedMutations.seedConfirmedIpsAlias, {
      email: 'client2@test.namlend.com',
      aliasAddr: 'client2@namlend',
      idValue: '1002003002',
      accountHolderName: 'Client Two',
    });
    console.log('[seed] IPP aliases seeded successfully');

    console.log('[seed] Seeding settlement participants...');
    await ctx.runMutation(internal.seedMutations.seedSettlementParticipants, {});
    console.log('[seed] Settlement participants seeded successfully');

    console.log('[seed] All test users seeded successfully');
  },
});
