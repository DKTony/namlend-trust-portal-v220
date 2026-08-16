/**
 * Tenant-admin email invites.
 *
 * Gated by the independent TENANT_INVITES business rule (default false). A catalog
 * feature key alone is not enough: FeatureGate is open while ENTITLEMENT_ENFORCEMENT
 * is off, so this kill-switch is what keeps production inert.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { MutationCtx, QueryCtx, internalMutation, mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAdmin, assertAuthenticated } from './lib/auth';
import { DOMAIN_EVENTS, emitDomainEvent } from './lib/domainEvents';
import { enrollUser } from './lib/enrollment';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import {
  hashInviteToken,
  INVITE_RATE_LIMIT_PER_HOUR,
  INVITE_TTL_MS,
  mintInviteToken,
  normalizeInviteEmail,
} from './lib/inviteToken';
import { getBooleanRule } from './lib/ruleEvaluator';
import { getCallerInstitution, resolveWriteInstitution } from './lib/tenancy';

const intendedRoleValidator = v.union(
  v.literal('client'),
  v.literal('loan_officer'),
  v.literal('tenant_admin')
);

const inviteStatusValidator = v.union(
  v.literal('pending'),
  v.literal('redeemed'),
  v.literal('revoked'),
  v.literal('expired')
);

const inviteListItemValidator = v.object({
  _id: v.id('tenantInvites'),
  email: v.string(),
  intendedRole: intendedRoleValidator,
  status: inviteStatusValidator,
  expiresAt: v.number(),
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
  redeemedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
});

type IntendedRole = 'client' | 'loan_officer' | 'tenant_admin';
type AnyCtx = QueryCtx | MutationCtx;

function inviteDisabled(): never {
  throw new ConvexError({
    code: 'INVITE_DISABLED',
    message: 'Tenant invites are not enabled.',
  });
}

function inviteInvalid(): never {
  throw new ConvexError({
    code: 'INVITE_INVALID',
    message: 'This invite is not valid.',
  });
}

async function requireInvitesEnabled(ctx: AnyCtx): Promise<void> {
  if (!(await getBooleanRule(ctx, 'TENANT_INVITES', false))) {
    inviteDisabled();
  }
}

async function requireCallerInstitution(ctx: AnyCtx): Promise<Id<'institutions'>> {
  const caller = await getCallerInstitution(ctx);
  if (caller.institutionId) return caller.institutionId;
  throw new ConvexError({
    code: 'TENANT_CONTEXT_REQUIRED',
    message: 'Your account is not bound to a tenant.',
  });
}

async function resolveInviteInstitution(ctx: MutationCtx): Promise<Id<'institutions'>> {
  const caller = await getCallerInstitution(ctx);
  if (caller.institutionId) return caller.institutionId;
  const fallback = await resolveWriteInstitution(ctx);
  if (!fallback) {
    throw new ConvexError({
      code: 'TENANT_CONTEXT_REQUIRED',
      message: 'Your account is not bound to a tenant.',
    });
  }
  return fallback;
}

async function assertInviteTenant(
  ctx: MutationCtx,
  invite: Doc<'tenantInvites'>
): Promise<Id<'institutions'>> {
  const institutionId = await resolveInviteInstitution(ctx);
  if (invite.institutionId !== institutionId) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'This action requires admin privileges.',
    });
  }
  return institutionId;
}

function isStaffRole(role: string | undefined | null): boolean {
  return role === 'loan_officer' || role === 'admin' || role === 'tenant_admin';
}

async function expireIfStale(
  ctx: MutationCtx,
  invite: Doc<'tenantInvites'>,
  now: number
): Promise<Doc<'tenantInvites'>> {
  if (invite.status !== 'pending' || invite.expiresAt > now) return invite;
  await ctx.db.patch(invite._id, { status: 'expired' });
  scheduleAuditLog(ctx, 'tenantInvites', invite._id, 'INVITE_EXPIRE', 'pending', 'expired');
  emitDomainEvent(ctx, DOMAIN_EVENTS.INVITE_EXPIRED, 'tenantInvites', invite._id, {
    intendedRole: invite.intendedRole,
  });
  return { ...invite, status: 'expired' };
}

async function findPendingForEmail(
  ctx: AnyCtx,
  email: string,
  institutionId: Id<'institutions'>,
  intendedRole: IntendedRole
): Promise<Doc<'tenantInvites'> | null> {
  const rows = await ctx.db
    .query('tenantInvites')
    .withIndex('by_email', (q) => q.eq('email', email))
    .collect();
  return (
    rows.find(
      (row) =>
        row.institutionId === institutionId &&
        row.intendedRole === intendedRole &&
        row.status === 'pending'
    ) ?? null
  );
}

async function countRecentPending(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>,
  now: number
): Promise<number> {
  const pending = await ctx.db
    .query('tenantInvites')
    .withIndex('by_institutionId_and_status', (q) =>
      q.eq('institutionId', institutionId).eq('status', 'pending')
    )
    .take(INVITE_RATE_LIMIT_PER_HOUR + 5);
  const hourAgo = now - 60 * 60 * 1000;
  return pending.filter((row) => row.createdAt >= hourAgo).length;
}

async function callerEmail(ctx: AnyCtx, userId: Id<'users'>): Promise<string | null> {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();
  const fromProfile = profile?.email?.trim().toLowerCase();
  if (fromProfile) return fromProfile;
  const user = await ctx.db.get(userId);
  const fromUser =
    user && 'email' in user
      ? String(user.email ?? '')
          .trim()
          .toLowerCase()
      : '';
  return fromUser || null;
}

async function queueInviteEmail(
  ctx: MutationCtx,
  args: {
    inviteId: Id<'tenantInvites'>;
    token: string;
    to: string;
    intendedRole: IntendedRole;
    institutionId: Id<'institutions'>;
  }
): Promise<boolean> {
  const institution = await ctx.db.get(args.institutionId);
  await ctx.scheduler.runAfter(0, internal.actions.sendInviteEmail.send, {
    inviteId: args.inviteId,
    token: args.token,
    to: args.to,
    intendedRole: args.intendedRole,
    tenantName: institution?.name ?? 'NamLend Trust',
  });
  return Boolean(process.env.RESEND_API_KEY);
}

async function mintAndPersistToken(
  ctx: MutationCtx,
  args: {
    existing: Doc<'tenantInvites'> | null;
    institutionId: Id<'institutions'>;
    email: string;
    intendedRole: IntendedRole;
    invitedBy: Id<'users'>;
    now: number;
  }
): Promise<{ inviteId: Id<'tenantInvites'>; token: string; rotated: boolean }> {
  const token = mintInviteToken();
  const tokenHash = await hashInviteToken(token);
  const expiresAt = args.now + INVITE_TTL_MS;

  if (args.existing) {
    await ctx.db.patch(args.existing._id, {
      tokenHash,
      expiresAt,
      status: 'pending',
      lastError: undefined,
    });
    return { inviteId: args.existing._id, token, rotated: true };
  }

  const inviteId = await ctx.db.insert('tenantInvites', {
    institutionId: args.institutionId,
    email: args.email,
    intendedRole: args.intendedRole,
    tokenHash,
    expiresAt,
    createdAt: args.now,
    status: 'pending',
    invitedBy: args.invitedBy,
  });
  return { inviteId, token, rotated: false };
}

export const isEnabled = query({
  args: {},
  returns: v.object({ enabled: v.boolean() }),
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return { enabled: await getBooleanRule(ctx, 'TENANT_INVITES', false) };
  },
});

export const createInvite = mutation({
  args: {
    email: v.string(),
    intendedRole: intendedRoleValidator,
  },
  returns: v.object({
    inviteId: v.id('tenantInvites'),
    emailQueued: v.boolean(),
    token: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireInvitesEnabled(ctx);
    const adminId = await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantInvites');

    const email = normalizeInviteEmail(args.email);
    if (!email) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Enter a valid email address.',
      });
    }

    const institutionId = await resolveInviteInstitution(ctx);
    const now = Date.now();
    const existing = await findPendingForEmail(ctx, email, institutionId, args.intendedRole);

    if (!existing) {
      const recent = await countRecentPending(ctx, institutionId, now);
      if (recent >= INVITE_RATE_LIMIT_PER_HOUR) {
        throw new ConvexError({
          code: 'RATE_LIMITED',
          message: 'Too many invites were sent recently. Try again later.',
        });
      }
    }

    const minted = await mintAndPersistToken(ctx, {
      existing,
      institutionId,
      email,
      intendedRole: args.intendedRole,
      invitedBy: adminId,
      now,
    });

    scheduleAuditLog(
      ctx,
      'tenantInvites',
      minted.inviteId,
      minted.rotated ? 'INVITE_RESEND' : 'INVITE_CREATE',
      minted.rotated ? 'pending' : 'none',
      'pending'
    );
    emitDomainEvent(
      ctx,
      minted.rotated ? DOMAIN_EVENTS.INVITE_RESENT : DOMAIN_EVENTS.INVITE_CREATED,
      'tenantInvites',
      minted.inviteId,
      { intendedRole: args.intendedRole },
      { actorId: adminId, actorType: 'user' }
    );

    const emailQueued = await queueInviteEmail(ctx, {
      inviteId: minted.inviteId,
      token: minted.token,
      to: email,
      intendedRole: args.intendedRole,
      institutionId,
    });

    return {
      inviteId: minted.inviteId,
      emailQueued,
      token: emailQueued ? undefined : minted.token,
    };
  },
});

export const listInvites = query({
  args: {
    status: v.optional(inviteStatusValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(inviteListItemValidator),
  handler: async (ctx, args) => {
    await requireInvitesEnabled(ctx);
    await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantInvites');
    const institutionId = await requireCallerInstitution(ctx);
    const status = args.status ?? 'pending';
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 50);
    const rows = await ctx.db
      .query('tenantInvites')
      .withIndex('by_institutionId_and_status', (q) =>
        q.eq('institutionId', institutionId).eq('status', status)
      )
      .take(limit);
    return rows.map((row) => ({
      _id: row._id,
      email: row.email,
      intendedRole: row.intendedRole,
      status: row.status,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      redeemedAt: row.redeemedAt,
      revokedAt: row.revokedAt,
    }));
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id('tenantInvites') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireInvitesEnabled(ctx);
    await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantInvites');
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) inviteInvalid();
    await assertInviteTenant(ctx, invite);
    const now = Date.now();
    const current = await expireIfStale(ctx, invite, now);
    if (current.status !== 'pending') inviteInvalid();
    await ctx.db.patch(invite._id, { status: 'revoked', revokedAt: now });
    scheduleAuditLog(ctx, 'tenantInvites', invite._id, 'INVITE_REVOKE', 'pending', 'revoked');
    emitDomainEvent(ctx, DOMAIN_EVENTS.INVITE_REVOKED, 'tenantInvites', invite._id, {
      intendedRole: invite.intendedRole,
    });
    return null;
  },
});

export const resendInvite = mutation({
  args: { inviteId: v.id('tenantInvites') },
  returns: v.object({
    inviteId: v.id('tenantInvites'),
    emailQueued: v.boolean(),
    token: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireInvitesEnabled(ctx);
    const adminId = await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'tenantInvites');
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) inviteInvalid();
    const institutionId = await assertInviteTenant(ctx, invite);
    const now = Date.now();
    const current = await expireIfStale(ctx, invite, now);
    if (current.status !== 'pending') inviteInvalid();

    const minted = await mintAndPersistToken(ctx, {
      existing: current,
      institutionId,
      email: current.email,
      intendedRole: current.intendedRole,
      invitedBy: adminId,
      now,
    });

    scheduleAuditLog(ctx, 'tenantInvites', minted.inviteId, 'INVITE_RESEND', 'pending', 'pending');
    emitDomainEvent(
      ctx,
      DOMAIN_EVENTS.INVITE_RESENT,
      'tenantInvites',
      minted.inviteId,
      { intendedRole: current.intendedRole },
      { actorId: adminId, actorType: 'user' }
    );

    const emailQueued = await queueInviteEmail(ctx, {
      inviteId: minted.inviteId,
      token: minted.token,
      to: current.email,
      intendedRole: current.intendedRole,
      institutionId,
    });

    return {
      inviteId: minted.inviteId,
      emailQueued,
      token: emailQueued ? undefined : minted.token,
    };
  },
});

export const redeemInvite = mutation({
  args: { token: v.string() },
  returns: v.object({
    landingRoute: v.union(v.literal('/admin'), v.literal('/dashboard')),
    intendedRole: intendedRoleValidator,
  }),
  handler: async (ctx, args) => {
    await requireInvitesEnabled(ctx);
    const userId = await assertAuthenticated(ctx);
    const token = args.token.trim();
    if (!token) inviteInvalid();

    const tokenHash = await hashInviteToken(token);
    const invite = await ctx.db
      .query('tenantInvites')
      .withIndex('by_tokenHash', (q) => q.eq('tokenHash', tokenHash))
      .first();
    if (!invite) inviteInvalid();

    const now = Date.now();
    const current = await expireIfStale(ctx, invite, now);
    if (current.status !== 'pending') inviteInvalid();

    const email = await callerEmail(ctx, userId);
    if (!email || email !== invite.email) inviteInvalid();

    await enrollUser(ctx, { userId, email, source: 'self_heal' });

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();
    const roleRow = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (
      isStaffRole(roleRow?.role) &&
      roleRow?.institutionId &&
      roleRow.institutionId !== invite.institutionId
    ) {
      inviteInvalid();
    }

    if (invite.intendedRole === 'client' && isStaffRole(roleRow?.role)) {
      inviteInvalid();
    }

    if (profile) {
      await ctx.db.patch(profile._id, {
        institutionId: invite.institutionId,
        updatedAt: now,
      });
    }

    if (invite.intendedRole !== 'client') {
      if (!roleRow || roleRow.role === 'client') {
        if (roleRow) {
          await ctx.db.patch(roleRow._id, {
            role: invite.intendedRole,
            institutionId: invite.institutionId,
            assignedBy: invite.invitedBy,
          });
        } else {
          await ctx.db.insert('userRoles', {
            userId,
            role: invite.intendedRole,
            institutionId: invite.institutionId,
            assignedBy: invite.invitedBy,
            createdAt: now,
          });
        }
      } else if (roleRow) {
        await ctx.db.patch(roleRow._id, { institutionId: invite.institutionId });
      }
    } else if (roleRow) {
      await ctx.db.patch(roleRow._id, { institutionId: invite.institutionId });
    }

    await ctx.db.patch(invite._id, {
      status: 'redeemed',
      redeemedAt: now,
      redeemedUserId: userId,
    });

    scheduleAuditLog(ctx, 'tenantInvites', invite._id, 'INVITE_REDEEM', 'pending', 'redeemed');
    emitDomainEvent(
      ctx,
      DOMAIN_EVENTS.INVITE_REDEEMED,
      'tenantInvites',
      invite._id,
      { intendedRole: invite.intendedRole },
      { actorId: userId, actorType: 'user' }
    );

    return {
      landingRoute:
        invite.intendedRole === 'client' ? ('/dashboard' as const) : ('/admin' as const),
      intendedRole: invite.intendedRole,
    };
  },
});

export const markInviteSent = internalMutation({
  args: {
    inviteId: v.id('tenantInvites'),
    lastError: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== 'pending') return null;
    await ctx.db.patch(args.inviteId, {
      sentAt: Date.now(),
      lastError: args.lastError,
    });
    scheduleAuditLog(ctx, 'tenantInvites', args.inviteId, 'INVITE_SENT', 'pending', 'pending');
    return null;
  },
});
