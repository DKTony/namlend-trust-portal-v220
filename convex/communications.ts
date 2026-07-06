/**
 * Staff→client communications (admin Communication Center).
 *
 * in_app messages are DELIVERED through the existing notifications pipeline
 * (the client sees them in their notification center); email/sms/call entries
 * are logged records of communication that happened through those channels.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertStaff } from './lib/auth';
import { applyTenantScope, resolveWriteInstitution, tenantReadScope } from './lib/tenancy';

const communicationType = v.union(
  v.literal('email'),
  v.literal('sms'),
  v.literal('call'),
  v.literal('in_app')
);
const communicationPriority = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('urgent')
);

/** List recent communications with recipient names for the admin console. */
export const listCommunications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertStaff(ctx);
    const rows = applyTenantScope(
      await ctx.db
        .query('communications')
        .order('desc')
        .take(limit ?? 200),
      await tenantReadScope(ctx)
    );
    return Promise.all(
      rows.map(async (row) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', row.userId))
          .first();
        return {
          ...row,
          clientName: profile?.fullName || profile?.email?.split('@')[0] || 'Unknown',
        };
      })
    );
  },
});

/**
 * Send (or log) a communication to a client. in_app messages are delivered
 * via the notifications pipeline and marked 'delivered'; other channels are
 * recorded as 'sent' logs of out-of-band communication.
 */
export const sendCommunication = mutation({
  args: {
    userId: v.id('users'),
    type: communicationType,
    subject: v.string(),
    message: v.string(),
    priority: v.optional(communicationPriority),
    inReplyTo: v.optional(v.id('communications')),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    if (!args.subject.trim() || !args.message.trim()) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Subject and message are required.',
      });
    }
    const recipient = await ctx.db.get(args.userId);
    if (!recipient) throw new ConvexError({ code: 'NOT_FOUND', message: 'Recipient not found.' });

    const now = Date.now();
    const institutionId = await resolveWriteInstitution(ctx);
    const isInApp = args.type === 'in_app';

    const communicationId = await ctx.db.insert('communications', {
      institutionId,
      userId: args.userId,
      sentBy: staffId,
      type: args.type,
      subject: args.subject.trim(),
      message: args.message.trim(),
      status: isInApp ? 'delivered' : 'sent',
      priority: args.priority ?? 'medium',
      inReplyTo: args.inReplyTo,
      createdAt: now,
      updatedAt: now,
    });

    if (isInApp) {
      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: args.userId,
          title: args.subject.trim(),
          message: args.message.trim(),
          category: 'general' as const,
          priority: args.priority === 'urgent' || args.priority === 'high' ? 'high' : 'normal',
        })
        .catch((err: unknown) => console.error('[communications] notify failed:', err));
    }

    // Mark the original as replied when this is a reply thread.
    if (args.inReplyTo) {
      const original = await ctx.db.get(args.inReplyTo);
      if (original && original.status !== 'replied') {
        await ctx.db.patch(args.inReplyTo, { status: 'replied', updatedAt: now });
      }
    }

    scheduleAuditLog(ctx, 'communications', communicationId, 'SEND', 'none', 'sent');
    return communicationId;
  },
});

/** Re-send a failed communication (creates a fresh entry, keeps the failed log). */
export const resendCommunication = mutation({
  args: { communicationId: v.id('communications') },
  handler: async (ctx, { communicationId }) => {
    const staffId = await assertStaff(ctx);
    const original = await ctx.db.get(communicationId);
    if (!original)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Communication not found.' });

    const now = Date.now();
    const isInApp = original.type === 'in_app';
    const newId = await ctx.db.insert('communications', {
      institutionId: original.institutionId,
      userId: original.userId,
      sentBy: staffId,
      type: original.type,
      subject: original.subject,
      message: original.message,
      status: isInApp ? 'delivered' : 'sent',
      priority: original.priority,
      inReplyTo: original.inReplyTo,
      createdAt: now,
      updatedAt: now,
    });
    if (isInApp) {
      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: original.userId,
          title: original.subject,
          message: original.message,
          category: 'general' as const,
          priority: 'normal' as const,
        })
        .catch((err: unknown) => console.error('[communications] resend notify failed:', err));
    }
    scheduleAuditLog(ctx, 'communications', newId, 'RESEND', 'failed', 'sent');
    return newId;
  },
});
