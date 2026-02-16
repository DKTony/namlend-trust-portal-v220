/**
 * Health Check Edge Function
 *
 * Unauthenticated endpoint for external uptime monitors (e.g. Uptime Robot,
 * Pingdom, Netlify health checks).
 *
 * Checks:
 * 1. Database connectivity — SELECT from loans table, measure latency
 * 2. Auth service — list 1 user via admin API
 * 3. Outbox backlog — count pending TigerBeetle entries (degraded if > 100)
 *
 * Response:
 *   200 — healthy or degraded
 *   503 — unhealthy (one or more critical checks failed)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store',
};

interface CheckResult {
  status: 'pass' | 'fail';
  latencyMs?: number;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const checks: Record<string, CheckResult> = {};

  // ── Check 1: Database ───────────────────────────────────────────
  try {
    const dbStart = performance.now();
    const { error } = await supabase.from('loans').select('id').limit(1);
    const dbLatency = Math.round(performance.now() - dbStart);

    if (error) {
      checks.database = { status: 'fail', latencyMs: dbLatency, message: error.message };
    } else {
      checks.database = { status: 'pass', latencyMs: dbLatency };
    }
  } catch (err) {
    checks.database = { status: 'fail', message: String(err) };
  }

  // ── Check 2: Auth Service ───────────────────────────────────────
  try {
    const authStart = performance.now();
    const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    const authLatency = Math.round(performance.now() - authStart);

    if (error) {
      checks.auth = { status: 'fail', latencyMs: authLatency, message: error.message };
    } else {
      checks.auth = { status: 'pass', latencyMs: authLatency };
    }
  } catch (err) {
    checks.auth = { status: 'fail', message: String(err) };
  }

  // ── Check 3: TigerBeetle Outbox Backlog ─────────────────────────
  try {
    const { count, error } = await supabase
      .from('tigerbeetle_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_sync');

    if (error) {
      checks.outbox = { status: 'fail', message: error.message };
    } else {
      const pendingCount = count ?? 0;
      checks.outbox = {
        status: pendingCount > 100 ? 'fail' : 'pass',
        message: `${pendingCount} pending entries`,
      };
    }
  } catch (err) {
    checks.outbox = { status: 'fail', message: String(err) };
  }

  // ── Determine overall status ────────────────────────────────────
  const failedChecks = Object.values(checks).filter((c) => c.status === 'fail');
  const criticalFailed = checks.database?.status === 'fail' || checks.auth?.status === 'fail';

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (criticalFailed) {
    status = 'unhealthy';
  } else if (failedChecks.length > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  const body = {
    status,
    checks,
    timestamp: new Date().toISOString(),
    version: '2.8.5',
  };

  return new Response(JSON.stringify(body), {
    status: status === 'unhealthy' ? 503 : 200,
    headers: corsHeaders,
  });
});
