/**
 * User enrollment — the single routine that turns an authenticated identity into a
 * usable NamLend account (a `profiles` row + a `userRoles` row).
 *
 * WHY THIS IS A SHARED HELPER AND NOT AN AUTH CALLBACK
 * ----------------------------------------------------
 * `@convex-dev/auth` runs `afterUserCreatedOrUpdated` only from its *default*
 * `createOrUpdateUser` implementation. The moment you supply your own
 * `createOrUpdateUser` (which cross-provider email linking requires), the default
 * short-circuits and `afterUserCreatedOrUpdated` is never invoked again — see
 * `@convex-dev/auth/dist/server/implementation/users.js`, `defaultCreateOrUpdateUser`.
 * Keeping enrollment here means every sign-in path calls it explicitly and none of
 * them can silently stop working.
 *
 * The frontend derives `useAuth().user` from the `profiles` row, so a user with a
 * valid session but no profile is stranded: `user` stays null forever and
 * `ProtectedRoute` bounces them back to `/auth`. `enrollUser` is therefore written to
 * be safe to call on *every* sign-in, so a missed enrollment self-heals.
 */

import { GenericMutationCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { scheduleAuditLog } from './audit';
import { resolveWriteInstitution } from './tenancy';

type MutCtx = GenericMutationCtx<DataModel>;

/** Which sign-in path triggered enrollment. Recorded on the audit trail. */
export type EnrollmentSource = 'password' | 'google' | 'self_heal';

export interface EnrollUserInput {
  userId: Id<'users'>;
  /** Best-known email. Only used when the profile has none yet. */
  email?: string;
  fullName?: string;
  phone?: string;
  idNumber?: string;
  source: EnrollmentSource;
}

export interface EnrollUserResult {
  profileId: Id<'profiles'>;
  /** True only when this call created the profile row (first enrollment). */
  created: boolean;
}

/** Treat empty/whitespace-only strings as absent — forms submit '' rather than undefined. */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Resolve the `users` row an incoming sign-in should attach to, by email.
 *
 * Used to link a Google sign-in onto a pre-existing password account so one person
 * has one identity, one KYC record and one loan history. Convex Auth will not do this
 * itself: its built-in linking only matches users whose `emailVerificationTime` is set,
 * and password sign-ups never set it.
 *
 * Resolution order matters. `authAccounts` is authoritative because it is what login
 * actually resolves against, and because seeded/test users are inserted as
 * `db.insert('users', {})` with no email column at all — only `profiles.email` is set.
 * The `users.email` index is the fallback for accounts created through the normal
 * password flow.
 */
export async function findLinkableUserByEmail(
  ctx: MutCtx,
  email: string | undefined
): Promise<Id<'users'> | null> {
  const normalized = clean(email)?.toLowerCase();
  if (!normalized) return null;

  // 1. Authoritative: the password account keyed by email.
  const passwordAccount = await ctx.db
    .query('authAccounts')
    .withIndex('providerAndAccountId', (q) =>
      q.eq('provider', 'password').eq('providerAccountId', normalized)
    )
    .unique();
  if (passwordAccount) return passwordAccount.userId;

  // 2. Fallback: a unique `users` row carrying this email. Ambiguous matches (>1) are
  //    left unlinked rather than guessed at — linking the wrong identity is worse than
  //    creating a new one.
  const byEmail = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', normalized))
    .take(2);
  return byEmail.length === 1 ? byEmail[0]._id : null;
}

/**
 * Decide which `users` row a **Google** sign-in may attach to — or refuse.
 *
 * `findLinkableUserByEmail` answers "who claims this email"; this answers "is it safe
 * to merge into them". The distinction is the pre-hijack attack: password sign-ups are
 * never email-verified, so the password account claiming victim@gmail.com may belong
 * to an attacker who registered it first. Silently merging the real owner's Google
 * sign-in into that account hands the attacker (who keeps the password) the victim's
 * KYC documents and loan history.
 *
 * Policy:
 *  - target's email is verified            → link (both sides proved ownership)
 *  - unverified + password credential       → throw LINK_BLOCKED; the UI tells the user
 *    to sign in with their password instead. If the password holder IS the same person,
 *    that path costs them one sign-in; if not, the takeover is dead.
 *  - unverified + no password credential    → don't merge, don't block: return null and
 *    let a fresh identity be created. Blocking would dead-end the user (there is no
 *    password to fall back to), and this shape only occurs for direct DB inserts.
 *
 * Google-only by design: the caller must NOT invoke this for password flows. A password
 * sign-UP that email-links would graft an attacker-chosen credential onto an existing
 * verified Google identity — the same takeover from the other direction.
 */
export async function resolveLinkTarget(
  ctx: MutCtx,
  email: string | undefined
): Promise<Id<'users'> | null> {
  const normalized = clean(email)?.toLowerCase();
  if (!normalized) return null;

  const candidate = await findLinkableUserByEmail(ctx, normalized);
  if (candidate === null) return null;

  const user = await ctx.db.get(candidate);
  if (user?.emailVerificationTime) return candidate;

  const passwordAccount = await ctx.db
    .query('authAccounts')
    .withIndex('providerAndAccountId', (q) =>
      q.eq('provider', 'password').eq('providerAccountId', normalized)
    )
    .unique();
  if (passwordAccount) {
    throw new ConvexError({
      code: 'LINK_BLOCKED',
      message: 'This email already has a password account. Sign in with your password instead.',
    });
  }
  return null;
}

/**
 * Onboarding is complete once we hold the two things OAuth can't give us.
 * Password sign-ups satisfy this at creation; Google sign-ups do not.
 */
function isComplete(phone: string | undefined, idNumber: string | undefined): boolean {
  return Boolean(clean(phone) && clean(idNumber));
}

/**
 * Build the patch that fills blank profile fields without overwriting existing data.
 * A Google sign-in must never clear a phone number the user entered during KYC.
 */
function buildBackfill(profile: Doc<'profiles'>, input: EnrollUserInput): Partial<Doc<'profiles'>> {
  const patch: Partial<Doc<'profiles'>> = {};
  if (!clean(profile.email) && clean(input.email)) patch.email = clean(input.email);
  if (!clean(profile.fullName) && clean(input.fullName)) patch.fullName = clean(input.fullName);
  if (!clean(profile.phone) && clean(input.phone)) patch.phone = clean(input.phone);
  if (!clean(profile.idNumber) && clean(input.idNumber)) patch.idNumber = clean(input.idNumber);

  // Close the completion gate as soon as the profile actually has both fields —
  // whether they arrived just now or were already there.
  if (!profile.onboardingCompletedAt) {
    const phone = patch.phone ?? profile.phone;
    const idNumber = patch.idNumber ?? profile.idNumber;
    if (isComplete(phone, idNumber)) patch.onboardingCompletedAt = Date.now();
  }
  return patch;
}

/**
 * Ensure `userId` has a profile and a role. Idempotent: safe to call repeatedly and
 * concurrently-ish, and safe to call on every sign-in.
 *
 * Guarantees:
 *  - exactly one `profiles` row per user (never a second one)
 *  - exactly one `userRoles` row per user, and an existing role is NEVER downgraded —
 *    without this, an admin signing in with Google once would be demoted to `client`
 *  - blank identity fields get backfilled; populated ones are left alone
 *  - an audit entry on first enrollment only, so repeat sign-ins don't spam the trail
 */
export async function enrollUser(ctx: MutCtx, input: EnrollUserInput): Promise<EnrollUserResult> {
  const { userId, source } = input;
  const now = Date.now();

  const existing = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();

  let profileId: Id<'profiles'>;
  let created = false;

  if (existing) {
    const patch = buildBackfill(existing, input);
    // Bind a tenant if the profile predates tenancy stamping.
    if (!existing.institutionId) {
      const institutionId = await resolveWriteInstitution(ctx, { userId });
      if (institutionId) patch.institutionId = institutionId;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, { ...patch, updatedAt: now });
    }
    profileId = existing._id;
  } else {
    profileId = await ctx.db.insert('profiles', {
      userId,
      institutionId: await resolveWriteInstitution(ctx, { userId }),
      email: clean(input.email) ?? '',
      fullName: clean(input.fullName),
      phone: clean(input.phone),
      idNumber: clean(input.idNumber),
      signupSource: source,
      // Password sign-ups arrive with both fields and skip the gate entirely.
      ...(isComplete(input.phone, input.idNumber) ? { onboardingCompletedAt: now } : {}),
      kycStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    created = true;
  }

  // Role: create the default `client` role only when the user has none. Patching an
  // existing row here would silently strip staff privileges on their next sign-in.
  const existingRole = await ctx.db
    .query('userRoles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  if (!existingRole) {
    await ctx.db.insert('userRoles', {
      userId,
      role: 'client',
      institutionId: await resolveWriteInstitution(ctx, { userId }),
      createdAt: now,
    });
  }

  if (created) {
    scheduleAuditLog(
      ctx,
      'user',
      userId,
      'enroll',
      'none',
      existingRole?.role ?? 'client',
      `Enrolled via ${source}`
    );
  }

  return { profileId, created };
}
