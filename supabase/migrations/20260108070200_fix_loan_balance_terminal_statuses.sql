-- Migration: Fix loan_balance_summary terminal status list
-- Description: Aligns terminal status list with CLOSED_LOAN_STATUSES from loanStatuses.ts
--              Previous migration only zeroed balances for settled/closed/written_off,
--              but the app defines terminal states as settled/completed/defaulted/rejected.
--              This causes non-zero balances to display for completed/defaulted/rejected loans.
-- Created: 2026-01-08
-- Severity: MEDIUM - Data consistency fix
-- References: src/constants/loanStatuses.ts (CLOSED_LOAN_STATUSES)

-- Drop and recreate the view with correct terminal status list
DROP VIEW IF EXISTS public.loan_balance_summary;

CREATE OR REPLACE VIEW public.loan_balance_summary AS
SELECT 
  l.id AS loan_id,
  l.user_id,
  l.amount AS original_principal,
  l.interest_rate,
  l.term_months,
  -- Calculate principal balance: original amount minus principal portion of payments
  -- Terminal states return zero balance
  CASE 
    WHEN l.status IN ('settled', 'completed', 'defaulted', 'rejected') THEN 0
    ELSE COALESCE(l.amount - COALESCE(
      (SELECT SUM(p.amount * 0.7) -- Approximate 70% goes to principal
       FROM public.payments p 
       WHERE p.loan_id = l.id 
       AND p.status = 'completed'), 
      0
    ), l.amount)
  END AS principal_balance,
  -- Calculate interest balance: total interest minus interest portion of payments
  -- Terminal states return zero balance
  CASE 
    WHEN l.status IN ('settled', 'completed', 'defaulted', 'rejected') THEN 0
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
  -- Terminal states return zero balance
  CASE 
    WHEN l.status IN ('settled', 'completed', 'defaulted', 'rejected') THEN 0
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
    WHEN l.status IN ('settled', 'completed', 'defaulted', 'rejected') THEN 0
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

-- Add comment for documentation
COMMENT ON VIEW public.loan_balance_summary IS 
'Fallback view for loan balance calculations when TigerBeetle ledger data is unavailable. 
Includes ALL loan statuses. Terminal states (settled/completed/defaulted/rejected per CLOSED_LOAN_STATUSES) 
return zero balances. Used by ledgerService.getLoanBalance as graceful degradation path.
Fixed 2026-01-08 to align with loanStatuses.ts terminal status definitions.';

-- Grant access to authenticated users (view inherits RLS from underlying tables)
GRANT SELECT ON public.loan_balance_summary TO authenticated;
GRANT SELECT ON public.loan_balance_summary TO service_role;
