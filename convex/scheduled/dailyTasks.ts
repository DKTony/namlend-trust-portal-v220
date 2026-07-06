/**
 * Daily maintenance tasks — runs at 02:00 UTC via crons.ts.
 * Replaces: supabase/functions/scheduled-tasks/index.ts
 *
 * Tasks:
 *   1. Mark overdue payment schedules
 *   2. Process notification queue (retry failed sends)
 *   3. Check promise-to-pay deadlines
 */

import { internal } from '../_generated/api';
import { internalAction, internalMutation } from '../_generated/server';

/** Mark payment schedule installments as overdue if past their due date. */
export const markOverduePayments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Get all scheduled installments (no compound index needed — small table scan ok for daily)
    const scheduled = await ctx.db.query('paymentSchedules').collect();

    let marked = 0;
    for (const s of scheduled) {
      // Note: 'partially_paid' is deliberately NOT flipped to 'overdue' — the
      // status is sticky so payment progress stays visible. Consumers that
      // surface overdue items (getOverduePayments, collections, analytics)
      // additionally check partially_paid rows with dueDate < now.
      if (s.status === 'scheduled' && s.dueDate < now) {
        await ctx.db.patch(s._id, { status: 'overdue' });
        marked++;
      }
    }

    console.log(`[dailyTasks] Marked ${marked} installments as overdue`);
    return marked;
  },
});

/** Check promises-to-pay that have passed their deadline without being kept. */
export const checkPromiseToPay = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db.query('promiseToPay').collect();

    let broken = 0;
    for (const p of pending) {
      if (p.status === 'pending' && p.promiseDate < now) {
        await ctx.db.patch(p._id, {
          status: 'broken',
          updatedAt: now,
        });
        broken++;
      }
    }

    console.log(`[dailyTasks] Marked ${broken} promises as broken`);
    return broken;
  },
});

/** Process the notification queue — dispatch pending items to SMS/WhatsApp. */
export const processNotificationQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('[dailyTasks] Processing notification queue');

    // Claim a batch of pending notifications (marks them as "processing")
    const pending = await ctx.runMutation(internal.notifications.claimPendingNotifications, {
      limit: 50,
    });

    let processed = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const content = item.content ?? '';
        if (item.channel === 'sms' && item.recipient) {
          await ctx.runAction(internal.actions.sendSms.sendSms, {
            to: [item.recipient],
            message: content,
            category: 'general',
            userId: item.userId,
          });
        } else if (item.channel === 'whatsapp' && item.recipient) {
          await ctx.runAction(internal.actions.sendWhatsapp.sendWhatsappText, {
            to: item.recipient,
            text: content,
            userId: item.userId,
          });
        }
        // Mark as sent
        await ctx.runMutation(internal.notifications.updateQueuedNotificationStatus, {
          queueId: item._id,
          status: 'sent',
        });
        processed++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        await ctx.runMutation(internal.notifications.updateQueuedNotificationStatus, {
          queueId: item._id,
          status: 'failed',
          errorMessage: msg,
        });
        failed++;
      }
    }

    console.log(`[dailyTasks] Notification queue: ${processed} sent, ${failed} failed`);
    return { processed, failed };
  },
});

/** Main daily tasks orchestrator — called by cron. */
export const runDailyTasks = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{ overdueCount: number; brokenPtpCount: number; durationMs: number }> => {
    const startTime = Date.now();
    console.log('[dailyTasks] Starting daily maintenance at', new Date().toISOString());

    const overdueCount: number = await ctx.runMutation(
      internal.scheduled.dailyTasks.markOverduePayments,
      {}
    );

    const brokenPtpCount: number = await ctx.runMutation(
      internal.scheduled.dailyTasks.checkPromiseToPay,
      {}
    );

    await ctx.runAction(internal.scheduled.dailyTasks.processNotificationQueue, {});

    const durationMs = Date.now() - startTime;
    console.log(
      `[dailyTasks] Completed in ${durationMs}ms: ${overdueCount} overdue, ${brokenPtpCount} broken PTP`
    );

    return { overdueCount, brokenPtpCount, durationMs };
  },
});
