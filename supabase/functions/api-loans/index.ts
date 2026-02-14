/**
 * API Loans - Orchestration Layer
 * Centralized API for loan operations
 * 
 * Endpoints:
 * - GET    /list              - List loans with filters
 * - GET    /:id               - Get loan details
 * - POST   /apply             - Submit loan application
 * - POST   /approve           - Approve loan (staff only)
 * - POST   /reject            - Reject loan (staff only)
 * - POST   /disburse          - Initiate disbursement (staff only)
 * - GET    /approval-requests - List approval requests
 * - GET    /schedules/:id     - Get payment schedule
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuth, verifyAuthWithRole, getServiceClient, type AuthUser } from '../_shared/auth.ts';
import { 
  validateBody, 
  validateQuery,
  loanListSchema, 
  loanApplicationSchema,
  loanApprovalSchema,
  disbursementSchema,
  paginationSchema,
  MAX_APR_NAMIBIA,
  validateAPR
} from '../_shared/validation.ts';
import { createAuditLog, logFinancialOperation } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';

const router = createRouter('/api-loans');

// GET /list - List loans with filters
router.get('/list', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, loanListSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { page, limit, status, user_id, assigned_officer_id, startDate, endDate } = validation.data;
  const supabase = getServiceClient();

  // Query loans without profile join - profiles are fetched separately if needed
  let query = supabase
    .from('loans')
    .select('*', { count: 'exact' });

  // Role-based filtering
  if (auth.user.role === 'client') {
    query = query.eq('user_id', auth.user.id);
  } else if (user_id) {
    query = query.eq('user_id', user_id);
  }

  if (status) query = query.eq('status', status);
  if (assigned_officer_id) query = query.eq('assigned_officer_id', assigned_officer_id);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const offset = (page - 1) * limit;
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

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

// GET /:id - Get loan details
router.get('/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();
  
  // Get loan with related data
  const { data: loan, error } = await supabase
    .from('loans')
    .select(`
      *,
      disbursements(*),
      payment_schedules(*)
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    return response.notFound('Loan not found');
  }

  // Check access
  if (auth.user.role === 'client' && loan.user_id !== auth.user.id) {
    return response.forbidden('Access denied');
  }

  // Log view for compliance
  await createAuditLog({
    user_id: auth.user.id,
    action: 'VIEW_LOAN',
    table_name: 'loans',
    record_id: params.id,
  });

  return response.success(loan);
});

// POST /apply - Submit loan application
router.post('/apply', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const validation = await validateBody(req, loanApplicationSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { amount, term_months, purpose, interest_rate, employment_status, monthly_income } = validation.data;

  // Validate APR against regulatory limit
  const aprCheck = validateAPR(interest_rate);
  if (!aprCheck.valid) {
    return response.unprocessable(aprCheck.error!);
  }

  const supabase = getServiceClient();

  // Create approval request
  const { data: approvalRequest, error: approvalError } = await supabase
    .from('approval_requests')
    .insert({
      user_id: auth.user.id,
      request_type: 'loan_application',
      status: 'pending',
      data: {
        amount,
        term_months,
        purpose,
        interest_rate,
        employment_status,
        monthly_income
      }
    })
    .select()
    .single();

  if (approvalError) {
    return response.serverError(approvalError.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'LOAN_APPLICATION_SUBMITTED',
    table_name: 'approval_requests',
    record_id: approvalRequest.id,
    new_data: { amount, term_months, interest_rate },
  });

  return response.created({ 
    approval_request_id: approvalRequest.id,
    message: 'Loan application submitted successfully'
  });
});

// POST /approve - Approve loan (staff only)
router.post('/approve', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer', 'approver']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, loanApprovalSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { loan_id, action, notes, approved_amount, approved_rate } = validation.data;

  if (action !== 'approve') {
    return response.badRequest('Use /reject endpoint for rejections');
  }

  // Validate APR if provided
  if (approved_rate) {
    const aprCheck = validateAPR(approved_rate);
    if (!aprCheck.valid) {
      return response.unprocessable(aprCheck.error!);
    }
  }

  const supabase = getServiceClient();

  // Call the RPC function for approval
  const { data, error } = await supabase.rpc('process_approval_transaction', {
    p_approval_id: loan_id,
    p_officer_id: auth.user.id,
    p_action: 'approve',
    p_notes: notes || null,
    p_approved_amount: approved_amount || null,
    p_approved_rate: approved_rate || null
  });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'LOAN_APPROVED',
    'loans',
    loan_id,
    null,
    { approved_amount, approved_rate, notes },
    req
  );

  return response.success({ 
    message: 'Loan approved successfully',
    loan_id: data?.loan_id || loan_id
  });
});

// POST /reject - Reject loan (staff only)
router.post('/reject', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer', 'approver']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, loanApprovalSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { loan_id, action, notes } = validation.data;

  if (action !== 'reject') {
    return response.badRequest('Use /approve endpoint for approvals');
  }

  const supabase = getServiceClient();

  // Call the RPC function for rejection
  const { data, error } = await supabase.rpc('process_approval_transaction', {
    p_approval_id: loan_id,
    p_officer_id: auth.user.id,
    p_action: 'reject',
    p_notes: notes || 'Application rejected'
  });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'LOAN_REJECTED',
    'loans',
    loan_id,
    null,
    { notes },
    req
  );

  return response.success({ message: 'Loan rejected', loan_id });
});

// POST /disburse - Initiate disbursement (staff only)
router.post('/disburse', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, disbursementSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { loan_id, payment_method, payment_reference, notes } = validation.data;

  const supabase = getServiceClient();

  // Call the RPC function for disbursement
  const { data, error } = await supabase.rpc('complete_disbursement', {
    p_disbursement_id: loan_id,
    p_payment_method: payment_method,
    p_payment_reference: payment_reference,
    p_notes: notes || null
  });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'DISBURSEMENT_COMPLETED',
    'disbursements',
    loan_id,
    null,
    { payment_method, payment_reference, notes },
    req
  );

  return response.success({ 
    message: 'Disbursement initiated successfully',
    ...data
  });
});

// GET /approval-requests - List approval requests (staff only)
router.get('/approval-requests', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer', 'approver']);
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

  const { page, limit } = validation.data;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('approval_requests')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
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

// GET /schedules/:id - Get payment schedule for a loan
router.get('/schedules/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  // First check loan access
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, user_id')
    .eq('id', params.id)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  // Check access for clients
  if (auth.user.role === 'client' && loan.user_id !== auth.user.id) {
    return response.forbidden('Access denied');
  }

  // Get payment schedule
  const { data: schedules, error } = await supabase
    .from('payment_schedules')
    .select('*')
    .eq('loan_id', params.id)
    .order('due_date', { ascending: true });

  if (error) {
    return response.serverError(error.message);
  }

  return response.success(schedules);
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
