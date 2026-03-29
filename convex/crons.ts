/**
 * Convex Cron Jobs — replaces Supabase pg_cron + scheduled edge functions.
 *
 * Registered crons:
 *   - TigerBeetle outbox worker: every 30 seconds
 *   - Daily maintenance: 02:00 UTC daily
 *   - End-of-day portfolio snapshot: 23:30 UTC daily (Ontology Phase 1)
 *   - Rail health monitor: every 5 minutes (Ontology Phase 5)
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

/**
 * Mandate executor — processes due mandates (debit executions + expiry).
 * Runs at 06:00 UTC daily. Part of Ontology Engine Phase 2 (Mandates).
 * The "hard path" for collections — complements soft reminders/PTP.
 */
crons.daily(
  'mandate-executor',
  { hourUTC: 6, minuteUTC: 0 },
  internal.scheduled.mandateExecutor.processDueMandates
);

/**
 * End-of-day portfolio snapshot — captures aggregate lending portfolio state.
 * Runs at 23:30 UTC daily. Part of Ontology Engine Phase 1 (Temporal Foundation).
 */
crons.daily(
  'eod-snapshot',
  { hourUTC: 23, minuteUTC: 30 },
  internal.scheduled.snapshotGenerator.generateEndOfDaySnapshot
);

/**
 * Rail health monitor -- checks payment rail availability.
 * Runs every 5 minutes. Part of Ontology Engine Phase 5 (Payment Rails).
 */
crons.interval(
  'rail-health-monitor',
  { minutes: 5 },
  internal.scheduled.railHealthMonitor.checkRailHealth
);

export default crons;
