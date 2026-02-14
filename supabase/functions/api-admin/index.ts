/**
 * API Admin - Orchestration Layer
 * Centralized API for administrative operations
 * 
 * Endpoints:
 * - GET    /dashboard         - Admin dashboard stats
 * - GET    /audit-logs        - View audit logs
 * - GET    /system-health     - System health check
 * - POST   /bulk-approve      - Bulk approve loans
 * - GET    /compliance-report - Compliance report
 * - GET    /collections       - Collections overview
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, paginationSchema } from '../_shared/validation.ts';
import { createAuditLog } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-admin');

// Schemas
const auditLogFilterSchema = paginationSchema.extend({
  action: z.string().optional(),
  table_name: z.string().optional(),
  user_id: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const bulkApproveSchema = z.object({
  loan_ids: z.array(z.string().uuid()).min(1).max(50),
  notes: z.string().max(500).optional(),
});

// GET /dashboard - Admin dashboard statistics
router.get('/dashboard', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Parallel queries for dashboard stats
  const [
    loansResult,
    pendingResult,
    disbursementsResult,
    collectionsResult,
    recentActivityResult
  ] = await Promise.all([
    // Total loans by status
    supabase
      .from('loans')
      .select('status', { count: 'exact' })
      .then(r => r),
    
    // Pending approvals
    supabase
      .from('approval_requests')
      .select('id', { count: 'exact' })
      .eq('status', 'pending'),
    
    // Today's disbursements
    supabase
      .from('disbursements')
      .select('amount')
      .eq('status', 'completed')
      .gte('completed_at', new Date().toISOString().split('T')[0]),
    
    // Active collections
    supabase
      .from('collections_queue')
      .select('id', { count: 'exact' })
      .eq('status', 'active'),
    
    // Recent activity
    supabase
      .from('audit_logs')
      .select('action, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  // Calculate loan stats by status
  const loansByStatus: Record<string, number> = {};
  if (loansResult.data) {
    loansResult.data.forEach((l: { status: string }) => {
      loansByStatus[l.status] = (loansByStatus[l.status] || 0) + 1;
    });
  }

  // Calculate today's disbursement total
  const todayDisbursements = disbursementsResult.data?.reduce(
    (sum: number, d: { amount: number }) => sum + (d.amount || 0), 
    0
  ) || 0;

  return response.success({
    loans: {
      by_status: loansByStatus,
      total: loansResult.count || 0
    },
    pending_approvals: pendingResult.count || 0,
    today_disbursements: {
      count: disbursementsResult.data?.length || 0,
      total_amount: todayDisbursements
    },
    active_collections: collectionsResult.count || 0,
    recent_activity: recentActivityResult.data || []
  });
});

// GET /audit-logs - View audit logs
router.get('/audit-logs', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, auditLogFilterSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as {
    page: number;
    limit: number;
    action?: string;
    table_name?: string;
    user_id?: string;
    startDate?: string;
    endDate?: string;
  };
  const { page, limit, action, table_name, user_id, startDate, endDate } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      profiles!audit_logs_user_id_fkey(first_name, last_name, email)
    `, { count: 'exact' });

  if (action) query = query.ilike('action', `%${action}%`);
  if (table_name) query = query.eq('table_name', table_name);
  if (user_id) query = query.eq('user_id', user_id);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  return response.success(data, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  });
});

// GET /system-health - System health check
router.get('/system-health', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const supabase = getServiceClient();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Database health
  const dbStart = Date.now();
  const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
  checks.database = {
    status: dbError ? 'unhealthy' : 'healthy',
    latency_ms: Date.now() - dbStart,
    ...(dbError && { error: dbError.message })
  };

  // TigerBeetle outbox check
  const { data: outboxData, error: outboxError } = await supabase
    .from('tigerbeetle_outbox')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');
  
  checks.tigerbeetle_outbox = {
    status: outboxError ? 'unhealthy' : 'healthy',
    ...(outboxData && { pending_items: outboxData.length })
  };

  // Overall status
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

  return response.success({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  });
});

// POST /bulk-approve - Bulk approve loans
router.post('/bulk-approve', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const validation = await validateBody(req, bulkApproveSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { loan_ids, notes } = validation.data as { loan_ids: string[]; notes?: string };
  const supabase = getServiceClient();

  const results: Array<{ loan_id: string; success: boolean; error?: string }> = [];

  // Process each loan
  for (const loan_id of loan_ids) {
    const { error } = await supabase.rpc('process_approval_transaction', {
      p_approval_id: loan_id,
      p_officer_id: auth.user.id,
      p_action: 'approve',
      p_notes: notes || 'Bulk approved'
    });

    results.push({
      loan_id,
      success: !error,
      ...(error && { error: error.message })
    });
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'BULK_APPROVE',
    table_name: 'loans',
    new_data: { 
      loan_ids, 
      approved_count: results.filter(r => r.success).length 
    },
  });

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return response.success({
    message: `Bulk approval completed: ${successCount} approved, ${failCount} failed`,
    results
  });
});

// GET /compliance-report - Compliance report
router.get('/compliance-report', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate') || 
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = url.searchParams.get('endDate') || new Date().toISOString();

  const supabase = getServiceClient();

  // APR compliance check
  const { data: aprData } = await supabase
    .from('loans')
    .select('id, interest_rate')
    .gt('interest_rate', 0.32) // Exceeds 32% limit
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // KYC compliance
  const { data: kycData } = await supabase
    .from('loans')
    .select(`
      id,
      profiles!loans_user_id_fkey(kyc_status)
    `)
    .neq('profiles.kyc_status', 'verified')
    .in('status', ['active', 'disbursed'])
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Audit trail completeness
  const { count: auditCount } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact' })
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  return response.success({
    period: { startDate, endDate },
    apr_compliance: {
      violations: aprData?.length || 0,
      status: (aprData?.length || 0) === 0 ? 'compliant' : 'violation'
    },
    kyc_compliance: {
      unverified_active_loans: kycData?.length || 0,
      status: (kycData?.length || 0) === 0 ? 'compliant' : 'warning'
    },
    audit_trail: {
      entries_in_period: auditCount || 0,
      status: 'active'
    },
    generated_at: new Date().toISOString(),
    generated_by: auth.user.id
  });
});

// GET /collections - Collections overview
router.get('/collections', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get collections queue
  const { data: collections, error } = await supabase
    .from('collections_queue')
    .select(`
      *,
      loans!collections_queue_loan_id_fkey(
        id,
        amount,
        outstanding_balance,
        profiles!loans_user_id_fkey(first_name, last_name, phone)
      )
    `)
    .in('status', ['active', 'escalated'])
    .order('days_overdue', { ascending: false })
    .limit(50);

  if (error) {
    return response.serverError(error.message);
  }

  // Summary by severity
  const summary = {
    total: collections?.length || 0,
    by_severity: {
      low: collections?.filter(c => c.days_overdue <= 7).length || 0,
      medium: collections?.filter(c => c.days_overdue > 7 && c.days_overdue <= 30).length || 0,
      high: collections?.filter(c => c.days_overdue > 30 && c.days_overdue <= 60).length || 0,
      critical: collections?.filter(c => c.days_overdue > 60).length || 0
    },
    total_outstanding: collections?.reduce(
      (sum, c) => sum + (c.loans?.outstanding_balance || 0), 
      0
    ) || 0
  };

  return response.success({
    collections,
    summary
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
