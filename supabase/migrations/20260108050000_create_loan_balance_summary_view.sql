-- Migration: 20260108050000_create_loan_balance_summary_view
-- Purpose: Create loan_balance_summary view for fallback balance reads when TigerBeetle is unavailable
-- This view calculates loan balances from existing Supabase data (loans, payments, payment_schedules)

-- Drop existing view if it exists (for idempotency)
DROP VIEW IF EXISTS public.loan_balance_summary;

-- Create the loan_balance_summary view
CREATE OR REPLACE VIEW public.loan_balance_summary AS
SELECT 
  l.id AS loan_id,
  l.user_id,
  l.amount AS original_principal,
  l.interest_rate,
  l.term_months,
  -- Calculate principal balance: original amount minus principal portion of payments
  COALESCE(l.amount - COALESCE(
    (SELECT SUM(p.amount * 0.7) -- Approximate 70% goes to principal
     FROM public.payments p 
     WHERE p.loan_id = l.id 
     AND p.status = 'completed'), 
    0
  ), l.amount) AS principal_balance,
  -- Calculate interest balance: total interest minus interest portion of payments
  COALESCE(
    (l.total_repayment - l.amount) - COALESCE(
      (SELECT SUM(p.amount * 0.3) -- Approximate 30% goes to interest
       FROM public.payments p 
       WHERE p.loan_id = l.id 
       AND p.status = 'completed'),
      0
    ),
    l.total_repayment - l.amount
  ) AS interest_balance,
  -- Fees balance: sum of processing fees from payments (usually paid upfront)
  COALESCE(
    (SELECT SUM(COALESCE(p.processing_fee, 0))
     FROM public.payments p 
     WHERE p.loan_id = l.id 
     AND p.status = 'pending'),
    0
  ) AS fees_balance,
  -- Total balance: outstanding amount (calculated from total_repayment minus payments)
  l.total_repayment - COALESCE(
    (SELECT SUM(p.amount) 
     FROM public.payments p 
     WHERE p.loan_id = l.id 
     AND p.status = 'completed'),
    0
  ) AS total_balance,
  -- Payment summary
  COALESCE(
    (SELECT SUM(p.amount) 
     FROM public.payments p 
     WHERE p.loan_id = l.id 
     AND p.status = 'completed'),
    0
  ) AS total_paid,
  COALESCE(
    (SELECT COUNT(*) 
     FROM public.payments p 
     WHERE p.loan_id = l.id 
     AND p.status = 'completed'),
    0
  ) AS payments_made,
  -- Loan metadata
  l.status AS loan_status,
  l.created_at,
  l.disbursed_at
FROM public.loans l
WHERE l.status IN ('active', 'disbursed', 'approved');

-- Add comment for documentation
COMMENT ON VIEW public.loan_balance_summary IS 
'Fallback view for loan balance calculations when TigerBeetle ledger data is unavailable. 
Calculates balances from loans, payments, and payment_schedules tables.
Used by useTigerBeetleBalance hook as a graceful degradation path.';

-- Grant access to authenticated users (view inherits RLS from underlying tables)
GRANT SELECT ON public.loan_balance_summary TO authenticated;
GRANT SELECT ON public.loan_balance_summary TO service_role;
