'use node';

/**
 * Seed action — creates test users with hashed passwords.
 *
 * Usage:
 *   npx convex run seed:seedTestUsers
 *   (creates all 4 test users + assigns roles)
 */

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

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

    console.log('[seed] All test users seeded successfully');
  },
});
