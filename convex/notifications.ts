/**
 * Notifications — in-app notifications, preferences, and queue.
 * Replaces notificationService.ts Supabase calls.
 */

import { v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { scheduleAuditEntry } from './lib/audit';
import { assertAuthenticated, assertOwnerOrStaff, assertStaff } from './lib/auth';
import { resolveWriteInstitution } from './lib/tenancy';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMyNotifications = query({
  args: {
    category: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, isRead, limit }) => {
    const userId = await assertAuthenticated(ctx);

    let results = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit ?? 50);

    if (category !== undefined) {
      results = results.filter((n) => n.category === category);
    }
    if (isRead !== undefined) {
      results = results.filter((n) => n.isRead === isRead);
    }

    return results;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const all = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    return all.filter((n) => !n.isRead).length;
  },
});

export const getMyNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('notificationPreferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const listNotificationTemplates = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query('notificationTemplates').collect();
  },
});

export const adminGetNotificationQueue = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    let results = await ctx.db
      .query('notificationQueue')
      .order('desc')
      .take(limit ?? 100);
    if (status) {
      results = results.filter((q) => q.status === status);
    }
    return results;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const markNotificationRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification) throw new Error('Notification not found');
    await assertOwnerOrStaff(ctx, notification.userId);

    await ctx.db.patch(notificationId, {
      isRead: true,
      readAt: Date.now(),
    });
    scheduleAuditEntry(ctx, {
      entityType: 'notifications',
      entityId: notificationId,
      action: 'MARK_READ',
      newState: { isRead: true },
    });
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const now = Date.now();
    const toMark = unread.filter((n) => !n.isRead);
    await Promise.all(toMark.map((n) => ctx.db.patch(n._id, { isRead: true, readAt: now })));
    if (toMark.length > 0) {
      scheduleAuditEntry(ctx, {
        entityType: 'notifications',
        entityId: userId,
        action: 'MARK_ALL_READ',
        newState: { markedCount: toMark.length },
        userId,
      });
    }
  },
});

export const updateNotificationPreference = mutation({
  args: {
    channel: v.union(
      v.literal('in_app'),
      v.literal('sms'),
      v.literal('email'),
      v.literal('whatsapp'),
      v.literal('push')
    ),
    category: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, { channel, category, enabled }) => {
    const userId = await assertAuthenticated(ctx);

    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const pref = existing.find((p) => p.channel === channel && p.category === category);

    if (pref) {
      await ctx.db.patch(pref._id, { enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert('notificationPreferences', {
        userId,
        institutionId: await resolveWriteInstitution(ctx, { userId }),
        channel,
        category,
        enabled,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    scheduleAuditEntry(ctx, {
      entityType: 'notificationPreferences',
      entityId: userId,
      action: 'UPDATE_PREFERENCE',
      newState: { channel, category, enabled },
      userId,
    });
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (called from actions, not exposed to browser)
// ---------------------------------------------------------------------------

/**
 * Create an in-app notification for a user.
 * Called from actions/sendNotification.ts after successful delivery.
 */
export const createNotification = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    message: v.string(),
    category: v.union(
      v.literal('loan'),
      v.literal('payment'),
      v.literal('kyc'),
      v.literal('account'),
      v.literal('general'),
      v.literal('marketing')
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('normal'),
      v.literal('high'),
      v.literal('urgent')
    ),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    metadata: v.optional(v.any()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('notifications', {
      ...args,
      institutionId: await resolveWriteInstitution(ctx, { userId: args.userId }),
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Enqueue a notification for async delivery via the daily task runner.
 */
export const enqueueNotification = internalMutation({
  args: {
    userId: v.id('users'),
    channel: v.string(),
    recipient: v.string(),
    subject: v.string(),
    content: v.string(),
    scheduledAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('notificationQueue', {
      ...args,
      status: 'pending',
      retryCount: 0,
      scheduledAt: args.scheduledAt ?? Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Internal query — called by sendNotification action to check preferences
// ---------------------------------------------------------------------------

export const getPreferencesForUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query('notificationPreferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

/**
 * Mark queued notifications as sent/failed (called from processNotificationQueue action).
 */
export const updateQueuedNotificationStatus = internalMutation({
  args: {
    queueId: v.id('notificationQueue'),
    status: v.union(v.literal('sent'), v.literal('failed')),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { queueId, status, errorMessage }) => {
    const item = await ctx.db.get(queueId);
    if (!item) return;

    await ctx.db.patch(queueId, {
      status,
      sentAt: status === 'sent' ? Date.now() : undefined,
      retryCount: (item.retryCount ?? 0) + (status === 'failed' ? 1 : 0),
      errorMessage,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Claim a batch of pending notifications for processing.
 */
export const claimPendingNotifications = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const pending = await ctx.db
      .query('notificationQueue')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('asc')
      .take(limit ?? 50);

    // Mark as processing to prevent double-delivery
    const now = Date.now();
    await Promise.all(
      pending.map((item) => ctx.db.patch(item._id, { status: 'processing', updatedAt: now }))
    );

    return pending;
  },
});
