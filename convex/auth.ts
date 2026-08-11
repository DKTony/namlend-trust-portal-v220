/**
 * Convex Auth — runtime implementation.
 * Exports auth, signIn, signOut, store, isAuthenticated for use in http.ts.
 *
 * auth.config.ts (separate file) holds the platform-level default export
 * that the Convex analyzer reads. This file holds the actual runtime logic.
 *
 * WHY `createOrUpdateUser` AND NOT `afterUserCreatedOrUpdated`
 * ------------------------------------------------------------
 * Convex Auth invokes `afterUserCreatedOrUpdated` only from its *default*
 * `createOrUpdateUser`. Supplying our own — which cross-provider email linking
 * requires — short-circuits the default and that callback is never called again.
 * So this file owns the whole "identity → account" step, and delegates the
 * NamLend-specific part to `enrollUser`.
 */

import Google from '@auth/core/providers/google';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel, Doc, Id } from './_generated/dataModel';
import { allowedOrigins, resolveRedirect } from './lib/authRedirect';
import { enrollUser, resolveLinkTarget, type EnrollmentSource } from './lib/enrollment';

type MutCtx = GenericMutationCtx<DataModel>;

/** Columns `authTables.users` actually has. Anything else must not be written there. */
type AuthUserFields = Pick<Doc<'users'>, 'email' | 'name' | 'phone' | 'image'>;

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** Map a provider id onto the enrollment source recorded in the audit trail. */
function sourceForProvider(providerId: string): EnrollmentSource {
  return providerId === 'google' ? 'google' : 'password';
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      /**
       * Called for every Password flow. Without this, Convex Auth falls back to
       * `defaultProfile`, which keeps ONLY the email — silently discarding the name
       * and phone the sign-up form collects. That is why every profile row created
       * before this change has `fullName: undefined`.
       *
       * `name`/`phone` are absent on the signIn flow; the fill-not-clobber logic
       * below and in `enrollUser` means that is harmless.
       *
       * CAREFUL: `Password.authorize` invokes this BEFORE it branches on `flow`
       * (Password.js:56, branches at :61 onward), so it runs for every flow —
       * including `reset-verification`, which carries no email at all. Only the
       * account-bearing flows may demand one; throwing unconditionally would break
       * password reset the moment a `reset` provider is configured.
       */
      profile(params) {
        const email = str(params.email)?.toLowerCase();
        const flow = params.flow;
        if (!email && (flow === 'signUp' || flow === 'signIn')) {
          throw new Error('Email is required');
        }
        const profile = {} as AuthUserFields & { email: string; idNumber?: string };
        if (email) profile.email = email;
        const name = str(params.name);
        const phone = str(params.phone);
        const idNumber = str(params.idNumber);
        if (name) profile.name = name;
        if (phone) profile.phone = phone;
        // `idNumber` is NOT a `users` column, and this return type is declared as
        // users-shaped. Passing it anyway is safe *because* we own createOrUpdateUser
        // below: it writes `users` from an explicit field list, so idNumber never
        // reaches that table — it is forwarded to the `profiles` row instead.
        // Doing it here rather than in a follow-up client mutation is deliberate: the
        // client's auth handshake completes asynchronously after signIn() resolves, so
        // a follow-up call races it and fails UNAUTHENTICATED. This way the ID number
        // lands in the same transaction as the profile.
        if (idNumber) profile.idNumber = idNumber;
        return profile;
      },
    }),
    /**
     * Registered unconditionally, not gated on `process.env.AUTH_GOOGLE_ID`.
     * `convexAuth()` runs at module scope and provider registration decides which
     * HTTP routes get mounted, so conditional registration would tie the router's
     * shape to whichever isolate happened to observe the env var. Unconfigured, the
     * provider is inert — the sign-in page hides the button via
     * `authProviders.listEnabled`, and the route is only reachable with a freshly
     * minted verifier.
     *
     * `allowDangerousEmailAccountLinking` matches the deliberate one-email-one-identity
     * policy implemented in `createOrUpdateUser` below.
     */
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  callbacks: {
    /**
     * Where the browser lands after the OAuth handshake. See `lib/authRedirect.ts`
     * for why this must never throw and must return an absolute URL.
     */
    async redirect({ redirectTo }) {
      return resolveRedirect(redirectTo, allowedOrigins());
    },
    /**
     * Owns user creation, cross-provider linking, and NamLend enrollment.
     *
     * Linking policy: one email == one identity, but only when linking is SAFE.
     *
     * Direction 1 — Google sign-in onto an existing account: `resolveLinkTarget` links
     * when the target's email is verified and throws LINK_BLOCKED when the target is an
     * unverified password account (the pre-hijack shape — see lib/enrollment.ts). The
     * throw is caught by Convex Auth's callback handler, which logs it and redirects
     * the browser back with no session; Auth.tsx detects that via the `oauth=return`
     * sentinel and tells the user to sign in with their password.
     *
     * Direction 2 — password flows NEVER email-link (the `provider.id === 'google'`
     * gate below). A password sign-UP that linked by email would graft an
     * attacker-chosen password onto an existing verified Google identity — the same
     * takeover in reverse. A duplicate-email password signup therefore creates a
     * separate identity, exactly like Convex Auth's default behaviour.
     */
    async createOrUpdateUser(ctx, args) {
      // The library types ctx against AnyDataModel; narrow it to ours at this boundary.
      const db = ctx as unknown as MutCtx;

      const email = str(args.profile.email)?.toLowerCase();
      const name = str(args.profile.name);
      const phone = str(args.profile.phone);
      const image = str(args.profile.image);
      // Carried on the auth profile but deliberately NOT written to `users` — the
      // inserts/patches below name their fields explicitly, so this only ever reaches
      // the `profiles` row via enrollUser.
      const idNumber = str(args.profile.idNumber);

      // OAuth/OIDC providers assert the email; credentials providers do not.
      const emailVerified =
        args.profile.emailVerified ?? (args.type === 'oauth' && args.provider.type !== 'email');

      let userId: Id<'users'> | null = args.existingUserId;
      if (userId === null && args.provider.id === 'google') {
        userId = await resolveLinkTarget(db, email);
      }

      if (userId === null) {
        userId = await db.db.insert('users', {
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          ...(image ? { image } : {}),
          ...(emailVerified && email ? { emailVerificationTime: Date.now() } : {}),
        });
      } else {
        // Fill blanks only. A Google sign-in must not overwrite the name a user set,
        // and the signIn flow sends no name/phone at all.
        const current = await db.db.get(userId);
        const patch: Partial<Doc<'users'>> = {};
        if (email && !current?.email) patch.email = email;
        if (name && !current?.name) patch.name = name;
        if (phone && !current?.phone) patch.phone = phone;
        if (image && !current?.image) patch.image = image;
        if (emailVerified && email && !current?.emailVerificationTime) {
          patch.emailVerificationTime = Date.now();
        }
        if (Object.keys(patch).length > 0) await db.db.patch(userId, patch);
      }

      // Guarantees the profiles + userRoles rows the whole app reads from.
      await enrollUser(db, {
        userId,
        email,
        fullName: name,
        phone,
        idNumber,
        source: sourceForProvider(args.provider.id),
      });

      return userId;
    },
  },
});
