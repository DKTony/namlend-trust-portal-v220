/**
 * API Collections - Orchestration Layer
 * Centralized API for collections and debt recovery operations
 *
 * Endpoints:
 * - GET    /queue             - Get collections work queue
 * - GET    /case/:loanId      - Get collection case details
 * - POST   /interaction       - Record interaction with borrower
 * - POST   /promise           - Create promise to pay
 * - PATCH  /promise/:id       - Update promise status
 * - POST   /escalate          - Escalate collection case
 * - GET    /reminders         - Get payment reminders
 * - POST   /reminder          - Schedule payment reminder
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, paginationSchema } from '../_shared/validation.ts';
import { createAuditLog } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-collections');

// Schemas
const queueFilterSchema = paginationSchema.extend({
  // Maps to risk_bucket in the collections_queue view
  priority: z.enum(['current', 'bucket_1_30', 'bucket_31_60', 'bucket_61_90', 'bucket_90_plus']).optional(),
  // Loan status filter
  loanStatus: z.enum(['active', 'disbursed']).optional(),
  minDaysOverdue: z.coerce.number().optional(),
  maxDaysOverdue: z.coerce.number().optional(),
});

const interactionSchema = z.object({
  loan_id: z.string().uuid(),
  interaction_type: z.enum(['call', 'sms', 'email', 'whatsapp', 'visit', 'note', 'system']),
  outcome: z.enum([
    'contacted',
    'no_answer',
    'promised',
    'refused',
    'wrong_number',
    'callback_requested',
    'paid',
    'escalated',
    'other'
  ]).optional(),
  notes: z.string().max(1000),
  follow_up_date: z.string().optional(),
});

const promiseSchema = z.object({
  loan_id: z.string().uuid(),
  promised_amount: z.number().positive(),
  promised_date: z.string(),
  notes: z.string().max(500).optional(),
});

const promiseUpdateSchema = z.object({
  status: z.enum(['pending', 'kept', 'broken', 'cancelled']),
  notes: z.string().max(500).optional(),
});

const escalateSchema = z.object({
  loan_id: z.string().uuid(),
  reason: z.string().min(10).max(500),
  escalation_level: z.enum(['supervisor', 'legal', 'write_off']),
});

const reminderSchema = z.object({
  loan_id: z.string().uuid(),
  reminder_type: z.enum([
    'due_7_days',
    'due_3_days',
    'due_1_day',
    'due_today',
    'overdue_1_day',
    'overdue_3_days',
    'overdue_7_days',
    'overdue_14_days',
    'overdue_30_days',
    'custom'
  ]),
  scheduled_date: z.string(),
  channel: z.enum(['sms', 'email', 'whatsapp', 'all']),
  message: z.string().max(500).optional(),
});

// GET /queue - Get collections work queue
router.get('/queue', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, queueFilterSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as {
    page: number;
    limit: number;
    priority?: string;
    loanStatus?: string;
    minDaysOverdue?: number;
    maxDaysOverdue?: number;
  };
  const { page, limit, priority, loanStatus, minDaysOverdue, maxDaysOverdue } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('collections_queue')
    .select('*', { count: 'exact' });

  // Filter by risk_bucket (maps from priority param)
  if (priority) query = query.eq('risk_bucket', priority);
  // Filter by loan_status
  if (loanStatus) query = query.eq('loan_status', loanStatus);
  if (minDaysOverdue !== undefined) query = query.gte('days_overdue', minDaysOverdue);
  if (maxDaysOverdue !== undefined) query = query.lte('days_overdue', maxDaysOverdue);

  const { data, error, count } = await query
    .order('days_overdue', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Collections queue query error:', error);
    return response.serverError(error.message);
  }

  // Calculate summary by risk bucket
  const summary = {
    total: count || 0,
    by_risk_bucket: {
      current: data?.filter(d => d.risk_bucket === 'current').length || 0,
      bucket_1_30: data?.filter(d => d.risk_bucket === 'bucket_1_30').length || 0,
      bucket_31_60: data?.filter(d => d.risk_bucket === 'bucket_31_60').length || 0,
      bucket_61_90: data?.filter(d => d.risk_bucket === 'bucket_61_90').length || 0,
      bucket_90_plus: data?.filter(d => d.risk_bucket === 'bucket_90_plus').length || 0,
    },
    total_loan_amount: data?.reduce((sum, d) => sum + (d.loan_amount || 0), 0) || 0
  };

  return response.success(data || [], {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
    summary
  });
});

// GET /case/:loanId - Get collection case details
router.get('/case/:loanId', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get loan details
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', params.loanId)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  // Get borrower profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', loan.user_id)
    .single();

  // Get collection queue entry
  const { data: queueEntry } = await supabase
    .from('collections_queue')
    .select('*')
    .eq('loan_id', params.loanId)
    .single();

  // Get interactions history
  const { data: interactions } = await supabase
    .from('collections_interactions')
    .select('*')
    .eq('loan_id', params.loanId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get promise to pay records
  const { data: promises } = await supabase
    .from('promise_to_pay')
    .select('*')
    .eq('loan_id', params.loanId)
    .order('promised_date', { ascending: false });

  // Get payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('loan_id', params.loanId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20);

  return response.success({
    loan,
    borrower: profile,
    collection_status: queueEntry,
    interactions,
    promises,
    payment_history: payments,
    summary: {
      total_interactions: interactions?.length || 0,
      total_promises: promises?.length || 0,
      kept_promises: promises?.filter(p => p.status === 'kept').length || 0,
      broken_promises: promises?.filter(p => p.status === 'broken').length || 0,
      last_payment: payments?.[0] || null,
      last_contact: interactions?.[0] || null
    }
  });
});

// POST /interaction - Record interaction with borrower
router.post('/interaction', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, interactionSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    loan_id: string;
    interaction_type: string;
    outcome?: string;
    notes: string;
    follow_up_date?: string;
  };
  const supabase = getServiceClient();

  // Verify loan exists
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, user_id')
    .eq('id', data.loan_id)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  // Create interaction record
  const { data: interaction, error } = await supabase
    .from('collections_interactions')
    .insert({
      loan_id: data.loan_id,
      user_id: loan.user_id,
      interaction_type: data.interaction_type,
      outcome: data.outcome,
      notes: data.notes,
      follow_up_date: data.follow_up_date,
      recorded_by: auth.user.id
    })
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Update collections queue with last contact
  await supabase
    .from('collections_queue')
    .update({
      last_contact: new Date().toISOString(),
      last_outcome: data.outcome,
      next_action_date: data.follow_up_date
    })
    .eq('loan_id', data.loan_id);

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'COLLECTION_INTERACTION_RECORDED',
    table_name: 'collections_interactions',
    record_id: interaction.id,
    new_data: data as Record<string, unknown>,
  });

  return response.created(interaction);
});

// POST /promise - Create promise to pay
router.post('/promise', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, promiseSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    loan_id: string;
    promised_amount: number;
    promised_date: string;
    notes?: string;
  };
  const supabase = getServiceClient();

  // Verify loan exists
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, user_id')
    .eq('id', data.loan_id)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  // Create promise record
  const { data: promise, error } = await supabase
    .from('promise_to_pay')
    .insert({
      loan_id: data.loan_id,
      user_id: loan.user_id,
      promised_amount: data.promised_amount,
      promised_date: data.promised_date,
      status: 'pending',
      notes: data.notes,
      recorded_by: auth.user.id
    })
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Record interaction
  await supabase
    .from('collections_interactions')
    .insert({
      loan_id: data.loan_id,
      user_id: loan.user_id,
      interaction_type: 'note',
      outcome: 'promised',
      notes: `Promise to pay N$ ${data.promised_amount} by ${data.promised_date}`,
      recorded_by: auth.user.id
    });

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'PROMISE_TO_PAY_CREATED',
    table_name: 'promise_to_pay',
    record_id: promise.id,
    new_data: data as Record<string, unknown>,
  });

  return response.created(promise);
});

// PATCH /promise/:id - Update promise status
router.patch('/promise/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, promiseUpdateSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as { status: string; notes?: string };
  const supabase = getServiceClient();

  // Get existing promise
  const { data: existing, error: existingError } = await supabase
    .from('promise_to_pay')
    .select('*')
    .eq('id', params.id)
    .single();

  if (existingError || !existing) {
    return response.notFound('Promise not found');
  }

  // Update promise
  const { data: promise, error } = await supabase
    .from('promise_to_pay')
    .update({
      status: data.status,
      notes: data.notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'PROMISE_TO_PAY_UPDATED',
    table_name: 'promise_to_pay',
    record_id: params.id,
    old_data: { status: existing.status },
    new_data: { status: data.status },
  });

  return response.success(promise);
});

// POST /escalate - Escalate collection case
router.post('/escalate', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, escalateSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    loan_id: string;
    reason: string;
    escalation_level: string;
  };
  const supabase = getServiceClient();

  // Update collections queue
  const { error } = await supabase
    .from('collections_queue')
    .update({
      status: 'escalated',
      escalation_level: data.escalation_level,
      escalation_reason: data.reason,
      escalated_at: new Date().toISOString(),
      escalated_by: auth.user.id
    })
    .eq('loan_id', data.loan_id);

  if (error) {
    return response.serverError(error.message);
  }

  // Get loan for user_id
  const { data: loan } = await supabase
    .from('loans')
    .select('user_id')
    .eq('id', data.loan_id)
    .single();

  // Record escalation interaction
  await supabase
    .from('collections_interactions')
    .insert({
      loan_id: data.loan_id,
      user_id: loan?.user_id,
      interaction_type: 'system',
      outcome: 'escalated',
      notes: `Escalated to ${data.escalation_level}: ${data.reason}`,
      recorded_by: auth.user.id
    });

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'COLLECTION_ESCALATED',
    table_name: 'collections_queue',
    record_id: data.loan_id,
    new_data: data as Record<string, unknown>,
  });

  return response.success({
    message: 'Collection case escalated successfully',
    loan_id: data.loan_id,
    escalation_level: data.escalation_level
  });
});

// GET /reminders - Get payment reminders
router.get('/reminders', async (req: Request) => {
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
    .from('payment_reminders')
    .select('*', { count: 'exact' })
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
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

// POST /reminder - Schedule payment reminder
router.post('/reminder', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, reminderSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    loan_id: string;
    reminder_type: string;
    scheduled_date: string;
    channel: string;
    message?: string;
  };
  const supabase = getServiceClient();

  // Verify loan exists
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, user_id')
    .eq('id', data.loan_id)
    .single();

  if (loanError || !loan) {
    return response.notFound('Loan not found');
  }

  // Create reminder
  const { data: reminder, error } = await supabase
    .from('payment_reminders')
    .insert({
      loan_id: data.loan_id,
      user_id: loan.user_id,
      reminder_type: data.reminder_type,
      scheduled_date: data.scheduled_date,
      channel: data.channel,
      message: data.message,
      status: 'pending',
      created_by: auth.user.id
    })
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  return response.created(reminder);
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
