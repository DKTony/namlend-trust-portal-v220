'use node';
/**
 * Multi-channel notification dispatcher.
 * Replaces the send-notification Supabase edge function.
 *
 * Checks user preferences before dispatching to each channel.
 * Always creates an in-app notification; SMS/WhatsApp are conditional.
 */

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';

export const sendNotification = internalAction({
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
    // Optional channels override — if not provided, respects user preferences
    channels: v.optional(
      v.array(
        v.union(v.literal('in_app'), v.literal('sms'), v.literal('whatsapp'), v.literal('email'))
      )
    ),
    // For SMS/WhatsApp
    phone: v.optional(v.string()),
    templateCode: v.optional(v.string()),
    templateVars: v.optional(v.record(v.string(), v.string())),
    loanId: v.optional(v.id('loans')),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, unknown> = {};

    // 1. Always create in-app notification
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: args.userId,
      title: args.title,
      message: args.message,
      category: args.category,
      priority: args.priority,
      actionUrl: args.actionUrl,
      actionLabel: args.actionLabel,
      metadata: args.metadata,
    });
    results.in_app = 'created';

    // 2. Get user preferences
    const prefs = await ctx.runQuery(internal.notifications.getPreferencesForUser, {
      userId: args.userId,
    });

    type Channel = 'in_app' | 'sms' | 'whatsapp' | 'email';
    const isChannelEnabled = (channel: Channel): boolean => {
      // If explicit channels provided, use those
      if (args.channels) return args.channels.includes(channel);
      // Otherwise check user prefs; default to enabled if no pref set
      const pref = prefs.find((p) => p.channel === channel && p.category === args.category);
      return pref ? pref.enabled : true;
    };

    // 3. SMS channel
    if (args.phone && isChannelEnabled('sms' as const)) {
      try {
        if (args.templateCode) {
          await ctx.runAction(internal.actions.sendSms.sendTemplateSms, {
            templateCode: args.templateCode,
            to: [args.phone],
            variables: args.templateVars ?? {},
            userId: args.userId,
            loanId: args.loanId,
          });
        } else {
          await ctx.runAction(internal.actions.sendSms.sendSms, {
            to: [args.phone],
            message: `${args.title}: ${args.message}`,
            category: args.category === 'loan' ? 'loan_notification' : 'general',
            userId: args.userId,
            loanId: args.loanId,
          });
        }
        results.sms = 'sent';
      } catch (error) {
        console.error('[sendNotification] SMS failed:', error);
        results.sms = 'failed';
      }
    }

    // 4. WhatsApp channel
    if (args.phone && isChannelEnabled('whatsapp' as const) && args.templateCode) {
      try {
        await ctx.runAction(internal.actions.sendWhatsapp.sendWhatsappTemplate, {
          to: args.phone,
          templateCode: args.templateCode,
          variables: args.templateVars ?? {},
          userId: args.userId,
          loanId: args.loanId,
        });
        results.whatsapp = 'sent';
      } catch (error) {
        console.error('[sendNotification] WhatsApp failed:', error);
        results.whatsapp = 'failed';
      }
    }

    console.log(`[sendNotification] userId=${args.userId} category=${args.category}`, results);
    return results;
  },
});

// ---------------------------------------------------------------------------
// Internal query used by sendNotification to fetch user prefs
// ---------------------------------------------------------------------------
// (Exported from notifications.ts as getPreferencesForUser — stub needed here
// because internal.notifications doesn't yet have that key. We add the query.)
