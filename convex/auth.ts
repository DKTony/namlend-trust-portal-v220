/**
 * Convex Auth — runtime implementation.
 * Exports auth, signIn, signOut, store, isAuthenticated for use in http.ts.
 *
 * auth.config.ts (separate file) holds the platform-level default export
 * that the Convex analyzer reads. This file holds the actual runtime logic.
 */

import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import { internal } from './_generated/api';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    /**
     * Called after a new user is created OR an existing user's profile is updated
     * via Convex Auth. We use it to seed the `profiles` and `userRoles` tables on
     * first sign-up (existingUserId === null means brand-new user).
     */
    async afterUserCreatedOrUpdated(ctx: any, args: any) {
      // Only run on new user creation, not on profile updates
      if (args.existingUserId !== null) return;

      const userId = args.userId;
      const email: string = (args.profile?.email as string) ?? '';
      const now = Date.now();

      // Create profile row — fields must match schema.ts profiles table exactly
      await ctx.db.insert('profiles', {
        userId,
        email,
        kycStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      // Assign default role: client — fields must match schema.ts userRoles table
      await ctx.db.insert('userRoles', {
        userId,
        role: 'client',
        createdAt: now,
      });
    },
  },
});
