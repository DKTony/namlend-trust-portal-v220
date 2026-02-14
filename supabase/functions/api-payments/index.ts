/**
 * API Payments - Orchestration Layer
 * Centralized API for payment operations
 * 
 * Endpoints:
 * - GET    /list              - List payments with filters
 * - GET    /:id               - Get payment details
 * - POST   /record            - Record a payment (staff only)
 * - POST   /reverse           - Reverse a payment (admin only)
 * - GET    /loan/:loanId      - Get payments for a loan
 * - GET    /reconciliation    - Get reconciliation data (admin only)
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuth, verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, paymentSchema, paymentListSchema, paginationSchema } from '../_shared/validation.ts';
import { createAuditLog, logFinancialOperation } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-payments');

// Additional schemas
const paymentRecordSchema = z.object({
  loan_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['bank_transfer', 'mobile_money', 'cash', 'debit_order']),
  reference: z.string().max(100).optional(),
  payment_date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const paymentReversalSchema = z.object({
  payment_id: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

// GET /list - List payments with filters
router.get('/list', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, paymentListSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as { 
    page: number; 
    limit: number; 
    loan_id?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  const { page, limit, loan_id, status, startDate, endDate } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  // Get payments without join - use created_at column
  let query = supabase
    .from('payments')
    .select('*', { count: 'exact' });

  if (loan_id) query = query.eq('loan_id', loan_id);
  if (status) query = query.eq('status', status);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by user if client
  let filteredData = data;
  if (auth.user.role === 'client' && data) {
    // Get loan IDs for this user
    const { data: userLoans } = await supabase
      .from('loans')
      .select('id')
      .eq('user_id', auth.user.id);
    const userLoanIds = new Set(userLoans?.map(l => l.id) || []);
    filteredData = data.filter(p => userLoanIds.has(p.loan_id));
  }

  if (error) {
    return response.serverError(error.message);
  }

  return response.success(filteredData, {
    page,
    limit,
    total: filteredData?.length || 0,
    hasMore: (count || 0) > offset + limit
  });
});

// GET /:id - Get payment details
router.get('/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();
  
  // Get payment
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !payment) {
    return response.notFound('Payment not found');
  }

  // Get loan for access check
  const { data: loan } = await supabase
    .from('loans')
    .select('id, amount, user_id, status')
    .eq('id', payment.loan_id)
    .single();

  // Check access for clients
  if (auth.user.role === 'client' && loan?.user_id !== auth.user.id) {
    return response.forbidden('Access denied');
  }

  return response.success({ ...payment, loan });
});

// POST /record - Record a payment (staff only)
router.post('/record', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, paymentRecordSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    loan_id: string;
    amount: number;
    payment_method: string;
    reference?: string;
    payment_date?: string;
    notes?: string;
  };
  const { loan_id, amount, payment_method, reference, payment_date, notes } = data;

  const supabase = getServiceClient();

  // Verify loan exists and is active
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, status, outstanding_balance')
    .eq('id', loan_id)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  if (!['active', 'disbursed'].includes(loan.status)) {
    return response.conflict(`Cannot record payment for loan with status: ${loan.status}`);
  }

  // Call RPC for payment recording (handles schedule updates, ledger posting)
  const { data: paymentResult, error } = await supabase.rpc('record_payment', {
    p_loan_id: loan_id,
    p_amount: amount,
    p_payment_method: payment_method,
    p_reference: reference || null,
    p_payment_date: payment_date || new Date().toISOString(),
    p_notes: notes || null,
    p_recorded_by: auth.user.id
  });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'PAYMENT_RECORDED',
    'payments',
    paymentResult?.payment_id || loan_id,
    null,
    { loan_id, amount, payment_method, reference },
    req
  );

  return response.created({
    message: 'Payment recorded successfully',
    ...paymentResult
  });
});

// POST /reverse - Reverse a payment (admin only)
router.post('/reverse', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const validation = await validateBody(req, paymentReversalSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { payment_id, reason } = validation.data as { payment_id: string; reason: string };
  const supabase = getServiceClient();

  // Get original payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', payment_id)
    .single();

  if (paymentError || !payment) {
    return response.notFound('Payment not found');
  }

  if (payment.status === 'reversed') {
    return response.conflict('Payment already reversed');
  }

  // Call RPC for reversal (handles schedule rollback, ledger reversal)
  const { data: reversalResult, error } = await supabase.rpc('reverse_payment', {
    p_payment_id: payment_id,
    p_reason: reason,
    p_reversed_by: auth.user.id
  });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log - critical operation
  await logFinancialOperation(
    auth.user.id,
    'PAYMENT_REVERSED',
    'payments',
    payment_id,
    payment as Record<string, unknown>,
    { reason, reversed_at: new Date().toISOString() },
    req
  );

  return response.success({
    message: 'Payment reversed successfully',
    ...reversalResult
  });
});

// GET /loan/:loanId - Get payments for a specific loan
router.get('/loan/:loanId', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  // Verify loan access
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, user_id')
    .eq('id', params.loanId)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  // Check access for clients
  if (auth.user.role === 'client' && loan.user_id !== auth.user.id) {
    return response.forbidden('Access denied');
  }

  // Get payments
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', params.loanId)
    .order('payment_date', { ascending: false });

  if (error) {
    return response.serverError(error.message);
  }

  // Calculate summary
  const completedPayments = payments?.filter(p => p.status === 'completed') || [];
  const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return response.success({
    payments,
    summary: {
      total_payments: payments?.length || 0,
      completed_payments: completedPayments.length,
      total_amount_paid: totalPaid
    }
  });
});

// GET /reconciliation - Get reconciliation data (admin only)
router.get('/reconciliation', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = url.searchParams.get('endDate') || new Date().toISOString();

  const supabase = getServiceClient();

  // Get payment summary - use created_at column
  const { data: payments, error } = await supabase
    .from('payments')
    .select('amount, status, payment_method, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) {
    return response.serverError(error.message);
  }

  // Calculate reconciliation summary
  const byStatus: Record<string, { count: number; amount: number }> = {};
  const byMethod: Record<string, { count: number; amount: number }> = {};

  payments?.forEach(p => {
    // By status
    if (!byStatus[p.status]) {
      byStatus[p.status] = { count: 0, amount: 0 };
    }
    byStatus[p.status].count++;
    byStatus[p.status].amount += p.amount || 0;

    // By method
    if (!byMethod[p.payment_method]) {
      byMethod[p.payment_method] = { count: 0, amount: 0 };
    }
    byMethod[p.payment_method].count++;
    byMethod[p.payment_method].amount += p.amount || 0;
  });

  return response.success({
    period: { startDate, endDate },
    total_payments: payments?.length || 0,
    total_amount: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    by_status: byStatus,
    by_method: byMethod
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
