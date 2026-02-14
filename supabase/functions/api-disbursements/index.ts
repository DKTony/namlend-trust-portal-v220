/**
 * API Disbursements - Orchestration Layer
 * Centralized API for disbursement operations
 *
 * Endpoints:
 * - GET    /list              - List disbursements with filters
 * - GET    /pending           - List pending disbursements
 * - GET    /:id               - Get disbursement details
 * - POST   /approve           - Approve disbursement
 * - POST   /process           - Mark as processing
 * - POST   /complete          - Complete disbursement
 * - POST   /fail              - Mark disbursement as failed
 * - GET    /queue             - Get disbursement queue
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuth, verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, paginationSchema, disbursementSchema } from '../_shared/validation.ts';
import { createAuditLog, logFinancialOperation } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-disbursements');

// Schemas
const disbursementFilterSchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'processing', 'completed', 'failed']).optional(),
  loan_id: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const approveSchema = z.object({
  disbursement_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const processSchema = z.object({
  disbursement_id: z.string().uuid(),
  external_reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

const completeSchema = z.object({
  disbursement_id: z.string().uuid(),
  payment_reference: z.string().min(1).max(100),
  payment_method: z.enum(['bank_transfer', 'mobile_money', 'cash', 'ips']),
  notes: z.string().max(500).optional(),
});

const failSchema = z.object({
  disbursement_id: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

// GET /list - List disbursements with filters
router.get('/list', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, disbursementFilterSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as {
    page: number;
    limit: number;
    status?: string;
    loan_id?: string;
    startDate?: string;
    endDate?: string;
  };
  const { page, limit, status, loan_id, startDate, endDate } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('disbursements')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (loan_id) query = query.eq('loan_id', loan_id);
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

// GET /pending - List pending disbursements
router.get('/pending', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get pending and approved disbursements
  const { data, error } = await supabase
    .from('disbursements')
    .select('*')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: true });

  if (error) {
    return response.serverError(error.message);
  }

  // Get loan details for each disbursement
  const loanIds = [...new Set(data?.map(d => d.loan_id) || [])];
  const { data: loans } = await supabase
    .from('loans')
    .select('id, user_id, amount, status')
    .in('id', loanIds);

  const loanMap = new Map(loans?.map(l => [l.id, l]) || []);

  // Get user profiles
  const userIds = [...new Set(loans?.map(l => l.user_id) || [])];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, phone_number')
    .in('user_id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  // Enrich disbursements with loan and user data
  const enriched = data?.map(d => {
    const loan = loanMap.get(d.loan_id);
    const profile = loan ? profileMap.get(loan.user_id) : null;

    return {
      ...d,
      loan: loan ? {
        id: loan.id,
        amount: loan.amount,
        status: loan.status
      } : null,
      borrower: profile ? {
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        phone: profile.phone_number
      } : null
    };
  });

  return response.success({
    disbursements: enriched,
    summary: {
      pending: data?.filter(d => d.status === 'pending').length || 0,
      approved: data?.filter(d => d.status === 'approved').length || 0,
      total_amount: data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0
    }
  });
});

// GET /:id - Get disbursement details
router.get('/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();

  const { data: disbursement, error } = await supabase
    .from('disbursements')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !disbursement) {
    return response.notFound('Disbursement not found');
  }

  // Get loan details
  const { data: loan } = await supabase
    .from('loans')
    .select('id, user_id, amount, status, term_months')
    .eq('id', disbursement.loan_id)
    .single();

  // Check access for clients
  if (auth.user.role === 'client' && loan?.user_id !== auth.user.id) {
    return response.forbidden('Access denied');
  }

  // Get TigerBeetle entry if exists
  const { data: ledgerEntry } = await supabase
    .from('tigerbeetle_entries')
    .select('*')
    .eq('entity_type', 'disbursement')
    .eq('entity_id', params.id)
    .single();

  return response.success({
    ...disbursement,
    loan,
    ledger_entry: ledgerEntry
  });
});

// POST /approve - Approve disbursement
router.post('/approve', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, approveSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as { disbursement_id: string; notes?: string };
  const supabase = getServiceClient();

  // Get disbursement
  const { data: disbursement, error: disbError } = await supabase
    .from('disbursements')
    .select('*')
    .eq('id', data.disbursement_id)
    .single();

  if (disbError || !disbursement) {
    return response.notFound('Disbursement not found');
  }

  if (disbursement.status !== 'pending') {
    return response.conflict(`Cannot approve disbursement with status: ${disbursement.status}`);
  }

  // Update status
  const { error } = await supabase
    .from('disbursements')
    .update({
      status: 'approved',
      approved_by: auth.user.id,
      approved_at: new Date().toISOString(),
      notes: data.notes
    })
    .eq('id', data.disbursement_id);

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'DISBURSEMENT_APPROVED',
    'disbursements',
    data.disbursement_id,
    { status: 'pending' },
    { status: 'approved' },
    req
  );

  return response.success({
    message: 'Disbursement approved successfully',
    disbursement_id: data.disbursement_id
  });
});

// POST /process - Mark disbursement as processing
router.post('/process', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, processSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    disbursement_id: string;
    external_reference?: string;
    notes?: string;
  };
  const supabase = getServiceClient();

  // Get disbursement
  const { data: disbursement, error: disbError } = await supabase
    .from('disbursements')
    .select('*')
    .eq('id', data.disbursement_id)
    .single();

  if (disbError || !disbursement) {
    return response.notFound('Disbursement not found');
  }

  if (disbursement.status !== 'approved') {
    return response.conflict(`Cannot process disbursement with status: ${disbursement.status}`);
  }

  // Update status
  const { error } = await supabase
    .from('disbursements')
    .update({
      status: 'processing',
      external_reference: data.external_reference,
      processing_started_at: new Date().toISOString(),
      notes: data.notes
    })
    .eq('id', data.disbursement_id);

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'DISBURSEMENT_PROCESSING',
    table_name: 'disbursements',
    record_id: data.disbursement_id,
    old_data: { status: 'approved' },
    new_data: { status: 'processing' },
  });

  return response.success({
    message: 'Disbursement marked as processing',
    disbursement_id: data.disbursement_id
  });
});

// POST /complete - Complete disbursement
router.post('/complete', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, completeSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    disbursement_id: string;
    payment_reference: string;
    payment_method: string;
    notes?: string;
  };
  const supabase = getServiceClient();

  // Call RPC function for complete disbursement
  const { data: result, error } = await supabase.rpc('complete_disbursement', {
    p_disbursement_id: data.disbursement_id,
    p_payment_method: data.payment_method,
    p_payment_reference: data.payment_reference,
    p_notes: data.notes || null
  });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'DISBURSEMENT_COMPLETED',
    'disbursements',
    data.disbursement_id,
    null,
    { payment_method: data.payment_method, payment_reference: data.payment_reference },
    req
  );

  return response.success({
    message: 'Disbursement completed successfully',
    ...result
  });
});

// POST /fail - Mark disbursement as failed
router.post('/fail', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, failSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as { disbursement_id: string; reason: string };
  const supabase = getServiceClient();

  // Get disbursement
  const { data: disbursement, error: disbError } = await supabase
    .from('disbursements')
    .select('*')
    .eq('id', data.disbursement_id)
    .single();

  if (disbError || !disbursement) {
    return response.notFound('Disbursement not found');
  }

  if (disbursement.status === 'completed') {
    return response.conflict('Cannot fail a completed disbursement');
  }

  // Update status
  const { error } = await supabase
    .from('disbursements')
    .update({
      status: 'failed',
      failure_reason: data.reason,
      failed_at: new Date().toISOString()
    })
    .eq('id', data.disbursement_id);

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'DISBURSEMENT_FAILED',
    'disbursements',
    data.disbursement_id,
    { status: disbursement.status },
    { status: 'failed', reason: data.reason },
    req
  );

  return response.success({
    message: 'Disbursement marked as failed',
    disbursement_id: data.disbursement_id
  });
});

// GET /queue - Get disbursement queue with priorities
router.get('/queue', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get all pending/approved/processing disbursements
  const { data: queue, error } = await supabase
    .from('disbursements')
    .select('*')
    .in('status', ['pending', 'approved', 'processing'])
    .order('created_at', { ascending: true });

  if (error) {
    return response.serverError(error.message);
  }

  // Group by status
  const byStatus = {
    pending: queue?.filter(d => d.status === 'pending') || [],
    approved: queue?.filter(d => d.status === 'approved') || [],
    processing: queue?.filter(d => d.status === 'processing') || []
  };

  // Calculate totals
  const summary = {
    total_count: queue?.length || 0,
    total_amount: queue?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0,
    by_status: {
      pending: {
        count: byStatus.pending.length,
        amount: byStatus.pending.reduce((sum, d) => sum + (d.amount || 0), 0)
      },
      approved: {
        count: byStatus.approved.length,
        amount: byStatus.approved.reduce((sum, d) => sum + (d.amount || 0), 0)
      },
      processing: {
        count: byStatus.processing.length,
        amount: byStatus.processing.reduce((sum, d) => sum + (d.amount || 0), 0)
      }
    }
  };

  return response.success({
    queue,
    summary
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
