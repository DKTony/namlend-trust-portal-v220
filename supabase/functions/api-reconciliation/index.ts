/**
 * API Reconciliation - Orchestration Layer
 * Centralized API for bank reconciliation operations
 *
 * Endpoints:
 * - GET    /runs              - List reconciliation runs
 * - GET    /runs/:id          - Get reconciliation run details
 * - POST   /runs              - Create new reconciliation run
 * - POST   /import            - Import bank transactions
 * - POST   /auto-match        - Auto-match transactions
 * - POST   /manual-match      - Manual match transaction
 * - GET    /unmatched         - Get unmatched transactions
 * - GET    /summary           - Get reconciliation summary
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, paginationSchema } from '../_shared/validation.ts';
import { createAuditLog, logFinancialOperation } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-reconciliation');

// Schemas
const runFilterSchema = paginationSchema.extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const importSchema = z.object({
  source: z.enum(['fnb', 'standard_bank', 'nedbank', 'bank_windhoek', 'csv', 'api', 'manual']),
  transactions: z.array(z.object({
    external_id: z.string(),
    amount: z.number(),
    date: z.string(),
    reference: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['credit', 'debit']).optional(),
  })),
  run_id: z.string().uuid().optional(),
});

const manualMatchSchema = z.object({
  transaction_id: z.string().uuid(),
  payment_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const createRunSchema = z.object({
  name: z.string().min(1).max(100),
  bank_account: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  notes: z.string().max(500).optional(),
});

// GET /runs - List reconciliation runs
router.get('/runs', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, runFilterSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as {
    page: number;
    limit: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  const { page, limit, status, startDate, endDate } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('reconciliation_runs')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
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

// GET /runs/:id - Get reconciliation run details
router.get('/runs/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get run details
  const { data: run, error } = await supabase
    .from('reconciliation_runs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !run) {
    return response.notFound('Reconciliation run not found');
  }

  // Get associated transactions
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('reconciliation_run_id', params.id)
    .order('transaction_date', { ascending: false });

  // Calculate summary
  const matched = transactions?.filter(t => t.status === 'matched') || [];
  const unmatched = transactions?.filter(t => t.status === 'unmatched') || [];

  return response.success({
    ...run,
    transactions,
    summary: {
      total_transactions: transactions?.length || 0,
      matched: matched.length,
      unmatched: unmatched.length,
      matched_amount: matched.reduce((sum, t) => sum + (t.amount || 0), 0),
      unmatched_amount: unmatched.reduce((sum, t) => sum + (t.amount || 0), 0)
    }
  });
});

// POST /runs - Create new reconciliation run
router.post('/runs', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const validation = await validateBody(req, createRunSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    name: string;
    bank_account?: string;
    start_date: string;
    end_date: string;
    notes?: string;
  };
  const supabase = getServiceClient();

  const { data: run, error } = await supabase
    .from('reconciliation_runs')
    .insert({
      name: data.name,
      bank_account: data.bank_account,
      period_start: data.start_date,
      period_end: data.end_date,
      status: 'pending',
      notes: data.notes,
      created_by: auth.user.id
    })
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'RECONCILIATION_RUN_CREATED',
    table_name: 'reconciliation_runs',
    record_id: run.id,
    new_data: data as Record<string, unknown>,
  });

  return response.created(run);
});

// POST /import - Import bank transactions
router.post('/import', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, importSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    source: string;
    transactions: Array<{
      external_id: string;
      amount: number;
      date: string;
      reference?: string;
      description?: string;
      type?: string;
    }>;
    run_id?: string;
  };
  const supabase = getServiceClient();

  // Prepare transactions for insert
  const records = data.transactions.map(t => ({
    external_id: t.external_id,
    amount: t.amount,
    transaction_date: t.date,
    transaction_type: t.type || 'credit',
    reference: t.reference,
    description: t.description,
    source: data.source,
    status: 'unmatched',
    reconciliation_run_id: data.run_id,
    imported_by: auth.user!.id,
    imported_at: new Date().toISOString(),
  }));

  const { data: imported, error } = await supabase
    .from('bank_transactions')
    .insert(records)
    .select();

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'BANK_TRANSACTIONS_IMPORTED',
    table_name: 'bank_transactions',
    new_data: { source: data.source, count: records.length } as Record<string, unknown>,
  });

  return response.created({
    imported_count: imported?.length || 0,
    transactions: imported
  });
});

// POST /auto-match - Auto-match transactions
router.post('/auto-match', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get unmatched bank transactions
  const { data: unmatched } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('status', 'unmatched')
    .eq('transaction_type', 'credit');

  // Get pending/unmatched payments
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, amount, reference_number, created_at')
    .in('status', ['pending', 'completed'])
    .is('bank_transaction_id', null);

  const matched: Array<{ transaction_id: string; payment_id: string }> = [];
  const paymentMap = new Map(
    pendingPayments?.map(p => [p.reference_number, p]) || []
  );

  // Match by reference number or amount
  for (const txn of unmatched || []) {
    // Try to match by reference from metadata
    const txnRef = txn.reference || txn.external_id;
    if (txnRef) {
      const payment = paymentMap.get(txnRef);
      if (payment && Math.abs(payment.amount - txn.amount) < 0.01) {
        matched.push({
          transaction_id: txn.id,
          payment_id: payment.id
        });
      }
    }
  }

  // Update matched transactions
  for (const match of matched) {
    const now = new Date().toISOString();
    await supabase
      .from('bank_transactions')
      .update({
        status: 'matched',
        matched_payment_id: match.payment_id,
        matched_at: now,
        matched_by: auth.user.id,
        match_confidence: 100
      })
      .eq('id', match.transaction_id);

    await supabase
      .from('payments')
      .update({ bank_transaction_id: match.transaction_id })
      .eq('id', match.payment_id);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'AUTO_MATCH_EXECUTED',
    table_name: 'bank_transactions',
    new_data: { matched_count: matched.length } as Record<string, unknown>,
  });

  return response.success({
    matched_count: matched.length,
    unmatched_remaining: (unmatched?.length || 0) - matched.length,
    matches: matched
  });
});

// POST /manual-match - Manual match transaction
router.post('/manual-match', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const validation = await validateBody(req, manualMatchSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const data = validation.data as {
    transaction_id: string;
    payment_id: string;
    notes?: string;
  };
  const supabase = getServiceClient();

  // Verify transaction exists and is unmatched
  const { data: txn, error: txnError } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', data.transaction_id)
    .single();

  if (txnError || !txn) {
    return response.notFound('Transaction not found');
  }

  if (txn.status !== 'unmatched') {
    return response.conflict('Transaction already matched or not eligible');
  }

  // Verify payment exists
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', data.payment_id)
    .single();

  if (paymentError || !payment) {
    return response.notFound('Payment not found');
  }

  const variance = Math.abs((payment.amount || 0) - (txn.amount || 0));
  const now = new Date().toISOString();

  // Update transaction
  await supabase
    .from('bank_transactions')
    .update({
      status: variance > 0 ? 'disputed' : 'matched',
      matched_payment_id: data.payment_id,
      matched_at: now,
      matched_by: auth.user.id,
      match_notes: data.notes,
      match_confidence: variance > 0 ? 80 : 100
    })
    .eq('id', data.transaction_id);

  await supabase
    .from('payments')
    .update({ bank_transaction_id: data.transaction_id })
    .eq('id', data.payment_id);

  // Audit log
  await logFinancialOperation(
    auth.user.id,
    'MANUAL_MATCH_CREATED',
    'bank_transactions',
    data.transaction_id,
    { status: 'unmatched' },
    { status: variance > 0 ? 'disputed' : 'matched', payment_id: data.payment_id },
    req
  );

  return response.success({
    message: 'Transaction matched successfully',
    transaction_id: data.transaction_id,
    payment_id: data.payment_id
  });
});

// GET /unmatched - Get unmatched transactions
router.get('/unmatched', async (req: Request) => {
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
    .from('bank_transactions')
    .select('*', { count: 'exact' })
    .eq('status', 'unmatched')
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  // Get suggested matches
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, amount, reference_number, loan_id, created_at')
    .in('status', ['pending', 'completed'])
    .is('bank_transaction_id', null);

  // Suggest matches for each unmatched transaction
  const withSuggestions = data?.map(txn => {
    const txnRef = txn.reference || txn.external_id;
    const suggestions = pendingPayments?.filter(p =>
      Math.abs(p.amount - txn.amount) < 0.01 ||
      (txnRef && p.reference_number?.includes(txnRef))
    ).slice(0, 3) || [];

    return {
      ...txn,
      suggested_matches: suggestions
    };
  });

  return response.success(withSuggestions, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  });
});

// GET /summary - Get reconciliation summary
router.get('/summary', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();

  // Get transaction stats
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('id, amount, status, source, transaction_date');

  // Get recent runs
  const { data: recentRuns } = await supabase
    .from('reconciliation_runs')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const matched = transactions?.filter(t => t.status === 'matched') || [];
  const unmatched = transactions?.filter(t => t.status === 'unmatched') || [];

  // Group by source
  const bySource: Record<string, { count: number; amount: number }> = {};
  transactions?.forEach(t => {
    const source = t.source || 'unknown';
    if (!bySource[source]) {
      bySource[source] = { count: 0, amount: 0 };
    }
    bySource[source].count++;
    bySource[source].amount += t.amount || 0;
  });

  return response.success({
    overview: {
      total_transactions: transactions?.length || 0,
      matched: matched.length,
      unmatched: unmatched.length,
      match_rate: transactions?.length
        ? (matched.length / transactions.length) * 100
        : 0,
      total_amount: transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      unmatched_amount: unmatched.reduce((sum, t) => sum + (t.amount || 0), 0)
    },
    by_source: bySource,
    recent_runs: recentRuns
  });
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
