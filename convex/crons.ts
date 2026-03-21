/**
 * Convex Cron Jobs — replaces Supabase pg_cron + scheduled edge functions.
 *
 * Registered crons:
 *   - TigerBeetle outbox worker: every 30 seconds
 *   - Daily maintenance: 02:00 UTC daily
 *
 * cronJobs() is called once at deploy time — no external scheduler needed.
 * All jobs are Convex Actions (no 1-second time limit).
 */

import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

/**
 * TigerBeetle outbox processor — replaces tigerbeetle-outbox-worker edge fn.
 * Claims pending entries every 30 seconds and posts to localhost:3001.
 */
crons.interval(
  'tb-outbox-worker',
  { seconds: 30 },
  internal.scheduled.tigerBeetleOutboxWorker.processOutbox
);

/**
 * Daily maintenance tasks — replaces scheduled-tasks edge fn.
 * Runs at 02:00 UTC: overdue marking, notification queue, PTP checks.
 */
crons.daily(
  'daily-maintenance',
  { hourUTC: 2, minuteUTC: 0 },
  internal.scheduled.dailyTasks.runDailyTasks
);

export default crons;
