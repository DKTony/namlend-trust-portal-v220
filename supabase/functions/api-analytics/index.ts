/**
 * API Analytics - Orchestration Layer
 * Centralized API for analytics and reporting operations
 *
 * Endpoints:
 * - GET    /portfolio         - Portfolio summary statistics
 * - GET    /loan-performance  - Loan performance metrics
 * - GET    /collections-stats - Collections statistics
 * - GET    /disbursement-stats - Disbursement statistics
 * - GET    /risk-analysis     - Risk analysis report
 * - GET    /trends            - Trend analysis over time
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateQuery, paginationSchema } from '../_shared/validation.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-analytics');

// Schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', '365d', 'all']).optional().default('30d'),
});

const trendSchema = dateRangeSchema.extend({
  metric: z.enum(['loans', 'disbursements', 'payments', 'collections']).optional().default('loans'),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

// Helper to calculate date range from period
function getDateRange(period: string): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString();
  let startDate: Date;

  switch (period) {
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '365d':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date('2020-01-01');
  }

  return { startDate: startDate.toISOString(), endDate };
}

// GET /portfolio - Portfolio summary statistics
router.get('/portfolio', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get all loans with relevant data
  const { data: loans, error } = await supabase
    .from('loans')
    .select('id, amount, outstanding_balance, status, interest_rate, created_at');

  if (error) {
    return response.serverError(error.message);
  }

  // Calculate portfolio metrics
  const totalLoans = loans?.length || 0;
  const activeLoans = loans?.filter(l => ['active', 'disbursed'].includes(l.status)) || [];
  const completedLoans = loans?.filter(l => l.status === 'completed') || [];
  const defaultedLoans = loans?.filter(l => l.status === 'defaulted') || [];

  const totalDisbursed = loans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0;
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstanding_balance || l.amount || 0), 0);
  const avgLoanSize = totalLoans > 0 ? totalDisbursed / totalLoans : 0;
  const avgInterestRate = totalLoans > 0
    ? (loans?.reduce((sum, l) => sum + (l.interest_rate || 0), 0) || 0) / totalLoans
    : 0;

  // Calculate status distribution
  const statusDistribution: Record<string, number> = {};
  loans?.forEach(l => {
    statusDistribution[l.status] = (statusDistribution[l.status] || 0) + 1;
  });

  return response.success({
    overview: {
      total_loans: totalLoans,
      active_loans: activeLoans.length,
      completed_loans: completedLoans.length,
      defaulted_loans: defaultedLoans.length,
      total_disbursed: totalDisbursed,
      total_outstanding: totalOutstanding,
      average_loan_size: avgLoanSize,
      average_interest_rate: avgInterestRate
    },
    status_distribution: statusDistribution,
    health: {
      default_rate: totalLoans > 0 ? (defaultedLoans.length / totalLoans) * 100 : 0,
      completion_rate: totalLoans > 0 ? (completedLoans.length / totalLoans) * 100 : 0
    }
  });
});

// GET /loan-performance - Loan performance metrics
router.get('/loan-performance', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, dateRangeSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as { startDate?: string; endDate?: string; period?: string };
  const { startDate, endDate } = params.startDate && params.endDate
    ? { startDate: params.startDate, endDate: params.endDate }
    : getDateRange(params.period || '30d');

  const supabase = getServiceClient();

  // Get approval requests for the period
  const { data: approvals } = await supabase
    .from('approval_requests')
    .select('id, status, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get disbursements for the period
  const { data: disbursements } = await supabase
    .from('disbursements')
    .select('id, amount, status, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate);

  // Get payments for the period
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, status, created_at')
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const totalApprovals = approvals?.length || 0;
  const approvedCount = approvals?.filter(a => a.status === 'approved').length || 0;
  const rejectedCount = approvals?.filter(a => a.status === 'rejected').length || 0;

  const totalDisbursed = disbursements?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  const totalCollected = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return response.success({
    period: { startDate, endDate },
    applications: {
      total: totalApprovals,
      approved: approvedCount,
      rejected: rejectedCount,
      approval_rate: totalApprovals > 0 ? (approvedCount / totalApprovals) * 100 : 0
    },
    disbursements: {
      count: disbursements?.length || 0,
      total_amount: totalDisbursed,
      average_amount: disbursements?.length ? totalDisbursed / disbursements.length : 0
    },
    collections: {
      payment_count: payments?.length || 0,
      total_collected: totalCollected,
      collection_rate: totalDisbursed > 0 ? (totalCollected / totalDisbursed) * 100 : 0
    }
  });
});

// GET /collections-stats - Collections statistics
router.get('/collections-stats', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get overdue loans
  const { data: overdueLoans } = await supabase
    .from('loans')
    .select('id, amount, outstanding_balance, status')
    .in('status', ['active', 'disbursed']);

  // Get collections queue
  const { data: collectionsQueue } = await supabase
    .from('collections_queue')
    .select('id, loan_id, days_overdue, status, priority');

  // Get promise to pay records
  const { data: promises } = await supabase
    .from('promise_to_pay')
    .select('id, status, promised_amount')
    .gte('promised_date', new Date().toISOString().split('T')[0]);

  // Calculate aging buckets
  const agingBuckets = {
    current: 0,
    '1-30_days': 0,
    '31-60_days': 0,
    '61-90_days': 0,
    'over_90_days': 0
  };

  collectionsQueue?.forEach(c => {
    if (c.days_overdue <= 0) agingBuckets.current++;
    else if (c.days_overdue <= 30) agingBuckets['1-30_days']++;
    else if (c.days_overdue <= 60) agingBuckets['31-60_days']++;
    else if (c.days_overdue <= 90) agingBuckets['61-90_days']++;
    else agingBuckets['over_90_days']++;
  });

  const promiseStats = {
    pending: promises?.filter(p => p.status === 'pending').length || 0,
    kept: promises?.filter(p => p.status === 'kept').length || 0,
    broken: promises?.filter(p => p.status === 'broken').length || 0,
    total_promised: promises?.reduce((sum, p) => sum + (p.promised_amount || 0), 0) || 0
  };

  return response.success({
    overview: {
      total_in_collections: collectionsQueue?.length || 0,
      active_cases: collectionsQueue?.filter(c => c.status === 'active').length || 0,
      escalated_cases: collectionsQueue?.filter(c => c.status === 'escalated').length || 0,
      total_outstanding: overdueLoans?.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0) || 0
    },
    aging_buckets: agingBuckets,
    promise_to_pay: promiseStats
  });
});

// GET /disbursement-stats - Disbursement statistics
router.get('/disbursement-stats', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, dateRangeSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as { startDate?: string; endDate?: string; period?: string };
  const { startDate, endDate } = params.startDate && params.endDate
    ? { startDate: params.startDate, endDate: params.endDate }
    : getDateRange(params.period || '30d');

  const supabase = getServiceClient();

  // Get disbursements for the period
  const { data: disbursements } = await supabase
    .from('disbursements')
    .select('id, loan_id, amount, status, disbursement_method, created_at, completed_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Calculate by status
  const byStatus: Record<string, { count: number; amount: number }> = {};
  const byMethod: Record<string, { count: number; amount: number }> = {};

  disbursements?.forEach(d => {
    // By status
    if (!byStatus[d.status]) {
      byStatus[d.status] = { count: 0, amount: 0 };
    }
    byStatus[d.status].count++;
    byStatus[d.status].amount += d.amount || 0;

    // By method
    if (d.disbursement_method) {
      if (!byMethod[d.disbursement_method]) {
        byMethod[d.disbursement_method] = { count: 0, amount: 0 };
      }
      byMethod[d.disbursement_method].count++;
      byMethod[d.disbursement_method].amount += d.amount || 0;
    }
  });

  const completed = disbursements?.filter(d => d.status === 'completed') || [];
  const totalDisbursed = completed.reduce((sum, d) => sum + (d.amount || 0), 0);

  return response.success({
    period: { startDate, endDate },
    overview: {
      total_count: disbursements?.length || 0,
      completed_count: completed.length,
      total_disbursed: totalDisbursed,
      average_disbursement: completed.length > 0 ? totalDisbursed / completed.length : 0
    },
    by_status: byStatus,
    by_method: byMethod
  });
});

// GET /risk-analysis - Risk analysis report
router.get('/risk-analysis', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const supabase = getServiceClient();

  // Get loans with user data
  const { data: loans } = await supabase
    .from('loans')
    .select('id, amount, outstanding_balance, status, interest_rate, user_id')
    .in('status', ['active', 'disbursed', 'defaulted']);

  // Get user profiles for credit scores
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, credit_score, risk_category');

  // Create lookup map
  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  // Calculate risk distribution
  const riskDistribution = {
    low: { count: 0, amount: 0 },
    medium: { count: 0, amount: 0 },
    high: { count: 0, amount: 0 },
    very_high: { count: 0, amount: 0 }
  };

  loans?.forEach(l => {
    const profile = profileMap.get(l.user_id);
    const riskCategory = profile?.risk_category || 'medium';

    if (riskDistribution[riskCategory as keyof typeof riskDistribution]) {
      riskDistribution[riskCategory as keyof typeof riskDistribution].count++;
      riskDistribution[riskCategory as keyof typeof riskDistribution].amount += l.outstanding_balance || l.amount || 0;
    }
  });

  // Calculate concentration risk (top 10 borrowers)
  const borrowerExposure: Record<string, number> = {};
  loans?.forEach(l => {
    borrowerExposure[l.user_id] = (borrowerExposure[l.user_id] || 0) + (l.outstanding_balance || l.amount || 0);
  });

  const topBorrowers = Object.entries(borrowerExposure)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([user_id, exposure]) => ({ user_id, exposure }));

  const totalExposure = loans?.reduce((sum, l) => sum + (l.outstanding_balance || l.amount || 0), 0) || 0;
  const top10Exposure = topBorrowers.reduce((sum, b) => sum + b.exposure, 0);

  return response.success({
    risk_distribution: riskDistribution,
    concentration_risk: {
      top_10_exposure: top10Exposure,
      top_10_percentage: totalExposure > 0 ? (top10Exposure / totalExposure) * 100 : 0,
      total_exposure: totalExposure
    },
    default_metrics: {
      defaulted_loans: loans?.filter(l => l.status === 'defaulted').length || 0,
      defaulted_amount: loans?.filter(l => l.status === 'defaulted')
        .reduce((sum, l) => sum + (l.outstanding_balance || l.amount || 0), 0) || 0
    }
  });
});

// GET /trends - Trend analysis over time
router.get('/trends', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, trendSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as {
    startDate?: string;
    endDate?: string;
    period?: string;
    metric?: string;
    groupBy?: string;
  };
  const { startDate, endDate } = params.startDate && params.endDate
    ? { startDate: params.startDate, endDate: params.endDate }
    : getDateRange(params.period || '30d');

  const supabase = getServiceClient();
  const metric = params.metric || 'loans';

  let data: Array<{ date: string; count: number; amount: number }> = [];

  if (metric === 'loans') {
    const { data: loans } = await supabase
      .from('loans')
      .select('id, amount, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    // Group by date
    const grouped: Record<string, { count: number; amount: number }> = {};
    loans?.forEach(l => {
      const date = l.created_at.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { count: 0, amount: 0 };
      }
      grouped[date].count++;
      grouped[date].amount += l.amount || 0;
    });

    data = Object.entries(grouped).map(([date, values]) => ({
      date,
      count: values.count,
      amount: values.amount
    }));
  } else if (metric === 'payments') {
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    const grouped: Record<string, { count: number; amount: number }> = {};
    payments?.forEach(p => {
      const date = p.created_at.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { count: 0, amount: 0 };
      }
      grouped[date].count++;
      grouped[date].amount += p.amount || 0;
    });

    data = Object.entries(grouped).map(([date, values]) => ({
      date,
      count: values.count,
      amount: values.amount
    }));
  }

  return response.success({
    period: { startDate, endDate },
    metric,
    data
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
