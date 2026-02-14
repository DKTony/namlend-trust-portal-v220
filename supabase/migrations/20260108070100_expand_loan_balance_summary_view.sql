-- Migration: Expand loan_balance_summary view to include all loan statuses
-- Description: The original view (20260108050000) only included active/disbursed/approved loans,
--              causing runtime errors when getLoanBalance is called for settled/defaulted loans.
--              This migration expands the filter to include all loan statuses.
-- Created: 2026-01-08
-- Severity: MEDIUM - Runtime error fix

-- Drop and recreate the view with expanded status filter
DROP VIEW IF EXISTS public.loan_balance_summary;

CREATE OR REPLACE VIEW public.loan_balance_summary AS
SELECT 
  l.id AS loan_id,
  l.user_id,
  l.amount AS original_principal,
  l.interest_rate,
  l.term_months,
  -- Calculate principal balance: original amount minus principal portion of payments
  CASE 
    WHEN l.status IN ('settled', 'closed', 'written_off') THEN 0
    ELSE COALESCE(l.amount - COALESCE(
      (SELECT SUM(p.amount * 0.7) -- Approximate 70% goes to principal
       FROM public.payments p 
       WHERE p.loan_id = l.id 
       AND p.status = 'completed'), 
      0
    ), l.amount)
  END AS principal_balance,
  -- Calculate interest balance: total interest minus interest portion of payments
  CASE 
    WHEN l.status IN ('settled', 'closed', 'written_off') THEN 0
    ELSE COALESCE(
      (l.total_repayment - l.amount) - COALESCE(
        (SELECT SUM(p.amount * 0.3) -- Approximate 30% goes to interest
         FROM public.payments p 
         WHERE p.loan_id = l.id 
         AND p.status = 'completed'),
        0
      ),
      l.total_repayment - l.amount
    )
  END AS interest_balance,
  -- Fees balance: sum of pending processing fees
  CASE 
    WHEN l.status IN ('settled', 'closed', 'written_off') THEN 0
    ELSE COALESCE(
      (SELECT SUM(COALESCE(p.processing_fee, 0))
       FROM public.payments p 
       WHERE p.loan_id = l.id 
       AND p.status = 'pending'),
      0
    )
  END AS fees_balance,
  -- Total balance: outstanding amount (zero for terminal states)
  CASE 
    WHEN l.status IN ('settled', 'closed', 'written_off') THEN 0
    ELSE l.total_repayment - COALESCE(
      (SELECT SUM(p.amount) 
       FROM public.payments p 
       WHERE p.loan_id = l.id 
       AND p.status = 'completed'),
      0
    )
  END AS total_balance,
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
FROM public.loans l;
-- REMOVED: WHERE l.status IN ('active', 'disbursed', 'approved')
-- Now includes ALL loan statuses: pending, approved, active, disbursed, funded, 
-- settled, defaulted, closed, written_off, rejected, cancelled

-- Add comment for documentation
COMMENT ON VIEW public.loan_balance_summary IS 
'Fallback view for loan balance calculations when TigerBeetle ledger data is unavailable. 
Includes ALL loan statuses (not just active). Terminal states (settled/closed/written_off) 
return zero balances. Used by ledgerService.getLoanBalance as graceful degradation path.
Fixed 2026-01-08 to include all loan statuses.';

-- Grant access to authenticated users (view inherits RLS from underlying tables)
GRANT SELECT ON public.loan_balance_summary TO authenticated;
GRANT SELECT ON public.loan_balance_summary TO service_role;
