/**
 * API Audit - Orchestration Layer
 * Centralized API for audit log operations
 *
 * Endpoints:
 * - GET    /logs              - List audit logs with filters
 * - GET    /logs/:id          - Get audit log details
 * - GET    /financial         - Get financial operation logs
 * - GET    /user/:userId      - Get audit logs for specific user
 * - GET    /table/:tableName  - Get audit logs for specific table
 * - GET    /export            - Export audit logs (CSV format)
 * - GET    /summary           - Get audit summary statistics
 * - GET    /actions           - Get list of all action types
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateQuery, paginationSchema } from '../_shared/validation.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-audit');

// Schemas
const auditFilterSchema = paginationSchema.extend({
  action: z.string().optional(),
  table_name: z.string().optional(),
  user_id: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

const exportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  action: z.string().optional(),
  table_name: z.string().optional(),
  format: z.enum(['csv', 'json']).optional(),
});

// Financial action types for filtering
const FINANCIAL_ACTIONS = [
  'LOAN_APPROVED',
  'LOAN_REJECTED',
  'LOAN_DISBURSED',
  'PAYMENT_RECORDED',
  'PAYMENT_REVERSED',
  'DISBURSEMENT_APPROVED',
  'DISBURSEMENT_COMPLETED',
  'DISBURSEMENT_FAILED',
  'MANUAL_MATCH_CREATED',
  'AUTO_MATCH_EXECUTED',
];

// GET /logs - List audit logs with filters
router.get('/logs', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, auditFilterSchema);
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
    search?: string;
  };
  const { page, limit, action, table_name, user_id, startDate, endDate, search } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (action) query = query.eq('action', action);
  if (table_name) query = query.eq('table_name', table_name);
  if (user_id) query = query.eq('user_id', user_id);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (search) query = query.or(`action.ilike.%${search}%,table_name.ilike.%${search}%`);

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

// GET /logs/:id - Get audit log details
router.get('/logs/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const supabase = getServiceClient();

  const { data: log, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !log) {
    return response.notFound('Audit log not found');
  }

  // Get user info if available
  let userInfo = null;
  if (log.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', log.user_id)
      .single();
    userInfo = profile;
  }

  return response.success({
    ...log,
    user_info: userInfo
  });
});

// GET /financial - Get financial operation logs
router.get('/financial', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, paginationSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as { page: number; limit: number };
  const { page, limit } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .in('action', FINANCIAL_ACTIONS)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  // Calculate summary by action type
  const { data: actionSummary } = await supabase
    .from('audit_logs')
    .select('action')
    .in('action', FINANCIAL_ACTIONS);

  const summary: Record<string, number> = {};
  actionSummary?.forEach(log => {
    summary[log.action] = (summary[log.action] || 0) + 1;
  });

  return response.success(data, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
    action_summary: summary
  });
});

// GET /user/:userId - Get audit logs for specific user
router.get('/user/:userId', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, paginationSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const paginationParams = validation.data as { page: number; limit: number };
  const { page, limit } = paginationParams;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('user_id', params.userId)
    .single();

  const { data, error, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  return response.success({
    user: profile,
    logs: data
  }, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  });
});

// GET /table/:tableName - Get audit logs for specific table
router.get('/table/:tableName', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, paginationSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const paginationParams = validation.data as { page: number; limit: number };
  const { page, limit } = paginationParams;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('table_name', params.tableName)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  // Get action distribution for this table
  const { data: actionData } = await supabase
    .from('audit_logs')
    .select('action')
    .eq('table_name', params.tableName);

  const actionDistribution: Record<string, number> = {};
  actionData?.forEach(log => {
    actionDistribution[log.action] = (actionDistribution[log.action] || 0) + 1;
  });

  return response.success({
    table_name: params.tableName,
    logs: data,
    action_distribution: actionDistribution
  }, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  });
});

// GET /export - Export audit logs
router.get('/export', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const format = url.searchParams.get('format') || 'json';

  if (!startDate || !endDate) {
    return response.badRequest('startDate and endDate are required');
  }

  const supabase = getServiceClient();

  let query = supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const action = url.searchParams.get('action');
  const table_name = url.searchParams.get('table_name');

  if (action) query = query.eq('action', action);
  if (table_name) query = query.eq('table_name', table_name);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(10000); // Max 10k records for export

  if (error) {
    return response.serverError(error.message);
  }

  if (format === 'csv') {
    // Convert to CSV
    const headers = ['id', 'created_at', 'user_id', 'action', 'table_name', 'record_id', 'ip_address', 'user_agent'];
    const csvRows = [headers.join(',')];

    data?.forEach(log => {
      const row = headers.map(h => {
        const value = log[h as keyof typeof log];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit_logs_${startDate}_${endDate}.csv"`,
      },
    });
  }

  return response.success({
    period: { startDate, endDate },
    total_records: data?.length || 0,
    logs: data
  });
});

// GET /summary - Get audit summary statistics
router.get('/summary', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get all logs for analysis
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('id, action, table_name, created_at');

  if (error) {
    return response.serverError(error.message);
  }

  // Calculate statistics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const byAction: Record<string, number> = {};
  const byTable: Record<string, number> = {};
  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  logs?.forEach(log => {
    // Count by action
    byAction[log.action] = (byAction[log.action] || 0) + 1;

    // Count by table
    byTable[log.table_name] = (byTable[log.table_name] || 0) + 1;

    // Time-based counts
    const logDate = new Date(log.created_at);
    if (logDate >= today) todayCount++;
    if (logDate >= thisWeek) weekCount++;
    if (logDate >= thisMonth) monthCount++;
  });

  // Get top 10 actions
  const topActions = Object.entries(byAction)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));

  // Get top 10 tables
  const topTables = Object.entries(byTable)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([table, count]) => ({ table, count }));

  // Recent activity (last 24 hours by hour)
  const hourlyActivity: Record<string, number> = {};
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  logs?.filter(log => new Date(log.created_at) >= last24Hours)
    .forEach(log => {
      const hour = new Date(log.created_at).getHours();
      const key = `${hour}:00`;
      hourlyActivity[key] = (hourlyActivity[key] || 0) + 1;
    });

  return response.success({
    overview: {
      total_logs: logs?.length || 0,
      today: todayCount,
      this_week: weekCount,
      this_month: monthCount
    },
    top_actions: topActions,
    top_tables: topTables,
    hourly_activity: hourlyActivity,
    financial_operations: logs?.filter(l =>
      FINANCIAL_ACTIONS.includes(l.action)
    ).length || 0
  });
});

// GET /actions - Get list of all action types
router.get('/actions', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('action')
    .order('action');

  if (error) {
    return response.serverError(error.message);
  }

  // Get unique actions with counts
  const actionCounts: Record<string, number> = {};
  data?.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  const actions = Object.entries(actionCounts)
    .map(([action, count]) => ({
      action,
      count,
      is_financial: FINANCIAL_ACTIONS.includes(action)
    }))
    .sort((a, b) => a.action.localeCompare(b.action));

  return response.success({
    actions,
    financial_actions: FINANCIAL_ACTIONS
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
