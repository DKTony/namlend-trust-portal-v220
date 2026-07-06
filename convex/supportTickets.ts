/**
 * Client support tickets — admin console CRUD with client notifications on
 * response/resolution. No hard deletes (tickets close, never disappear).
 */

import { GenericMutationCtx } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { DataModel, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertStaff } from './lib/auth';
import { applyTenantScope, resolveWriteInstitution, tenantReadScope } from './lib/tenancy';

const ticketCategory = v.union(
  v.literal('technical'),
  v.literal('billing'),
  v.literal('loan'),
  v.literal('account'),
  v.literal('general')
);
const ticketPriority = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
  v.literal('urgent')
);

async function staffName(ctx: GenericMutationCtx<DataModel>, staffId: Id<'users'>) {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', staffId))
    .first();
  return profile?.fullName || profile?.email?.split('@')[0] || 'Staff';
}

export const listTickets = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertStaff(ctx);
    const rows = applyTenantScope(
      await ctx.db
        .query('supportTickets')
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
        const assignee = row.assignedTo
          ? await ctx.db
              .query('profiles')
              .withIndex('by_userId', (q) => q.eq('userId', row.assignedTo!))
              .first()
          : null;
        return {
          ...row,
          clientName: profile?.fullName || profile?.email?.split('@')[0] || 'Unknown',
          assignedToName: assignee
            ? assignee.fullName || assignee.email?.split('@')[0] || 'Staff'
            : undefined,
        };
      })
    );
  },
});

export const createTicket = mutation({
  args: {
    userId: v.id('users'),
    subject: v.string(),
    description: v.string(),
    category: ticketCategory,
    priority: ticketPriority,
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    if (!args.subject.trim() || !args.description.trim()) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Subject and description are required.',
      });
    }
    const client = await ctx.db.get(args.userId);
    if (!client) throw new ConvexError({ code: 'NOT_FOUND', message: 'Client not found.' });

    const now = Date.now();
    const ticketId = await ctx.db.insert('supportTickets', {
      institutionId: await resolveWriteInstitution(ctx),
      userId: args.userId,
      subject: args.subject.trim(),
      description: args.description.trim(),
      category: args.category,
      priority: args.priority,
      status: 'open',
      responses: [],
      createdAt: now,
      updatedAt: now,
    });
    scheduleAuditLog(ctx, 'supportTickets', ticketId, 'CREATE', 'none', 'open');
    return ticketId;
  },
});

export const addTicketResponse = mutation({
  args: {
    ticketId: v.id('supportTickets'),
    message: v.string(),
  },
  handler: async (ctx, { ticketId, message }) => {
    const staffId = await assertStaff(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new ConvexError({ code: 'NOT_FOUND', message: 'Ticket not found.' });
    if (!message.trim()) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Response cannot be empty.' });
    }
    const now = Date.now();
    const byName = await staffName(ctx, staffId);
    await ctx.db.patch(ticketId, {
      responses: [
        ...ticket.responses,
        { byUserId: staffId, byName, message: message.trim(), at: now },
      ],
      status: ticket.status === 'open' ? 'in_progress' : ticket.status,
      updatedAt: now,
    });
    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId: ticket.userId,
        title: `Support update: ${ticket.subject}`,
        message: message.trim(),
        category: 'general' as const,
        priority: 'normal' as const,
      })
      .catch((err: unknown) => console.error('[supportTickets] notify failed:', err));
    scheduleAuditLog(ctx, 'supportTickets', ticketId, 'RESPOND', ticket.status, 'in_progress');
  },
});

export const resolveTicket = mutation({
  args: { ticketId: v.id('supportTickets') },
  handler: async (ctx, { ticketId }) => {
    await assertStaff(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new ConvexError({ code: 'NOT_FOUND', message: 'Ticket not found.' });
    if (ticket.status === 'resolved' || ticket.status === 'closed') return; // idempotent
    const now = Date.now();
    await ctx.db.patch(ticketId, { status: 'resolved', resolvedAt: now, updatedAt: now });
    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId: ticket.userId,
        title: `Resolved: ${ticket.subject}`,
        message: 'Your support ticket has been resolved. Contact us if you need further help.',
        category: 'general' as const,
        priority: 'normal' as const,
      })
      .catch((err: unknown) => console.error('[supportTickets] resolve notify failed:', err));
    scheduleAuditLog(ctx, 'supportTickets', ticketId, 'RESOLVE', ticket.status, 'resolved');
  },
});

export const assignTicket = mutation({
  args: {
    ticketId: v.id('supportTickets'),
    assigneeId: v.optional(v.id('users')),
  },
  handler: async (ctx, { ticketId, assigneeId }) => {
    const staffId = await assertStaff(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new ConvexError({ code: 'NOT_FOUND', message: 'Ticket not found.' });
    const now = Date.now();
    await ctx.db.patch(ticketId, {
      // Default: assign to the acting staff member ("Assign to me")
      assignedTo: assigneeId ?? staffId,
      status: ticket.status === 'open' ? 'in_progress' : ticket.status,
      updatedAt: now,
    });
    scheduleAuditLog(ctx, 'supportTickets', ticketId, 'ASSIGN', ticket.status, 'in_progress');
  },
});
