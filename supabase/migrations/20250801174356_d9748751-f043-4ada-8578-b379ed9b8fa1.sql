-- Drop the existing security definer views
DROP VIEW IF EXISTS public.financial_summary;
DROP VIEW IF EXISTS public.client_portfolio;

-- Create secure financial summary view (no SECURITY DEFINER)
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
  (SELECT COUNT(DISTINCT p.user_id) FROM public.profiles p) as total_clients,
  (SELECT COUNT(*) FROM public.loans l) as total_loans,
  (SELECT COALESCE(SUM(l.amount), 0) FROM public.loans l WHERE l.status = 'approved') as total_disbursed,
  (SELECT COALESCE(SUM(l.amount), 0) FROM public.loans l WHERE l.status = 'under_review') as pending_amount,
  (SELECT COALESCE(SUM(l.amount), 0) FROM public.loans l WHERE l.status = 'rejected') as rejected_amount,
  (SELECT COALESCE(SUM(p.amount), 0) FROM public.payments p WHERE p.status = 'completed') as total_repayments,
  (SELECT COUNT(*) FROM public.payments p WHERE p.is_overdue = true) as overdue_payments;

-- Create secure client portfolio view (no SECURITY DEFINER)
CREATE OR REPLACE VIEW public.client_portfolio AS
SELECT 
  p.user_id,
  p.first_name,
  p.last_name,
  p.phone_number,
  p.verified,
  p.credit_score,
  p.risk_category,
  p.monthly_income,
  COALESCE(loan_stats.total_loans, 0) as total_loans,
  COALESCE(loan_stats.total_borrowed, 0) as total_borrowed,
  COALESCE(payment_stats.total_repaid, 0) as total_repaid,
  COALESCE(loan_stats.total_borrowed, 0) - COALESCE(payment_stats.total_repaid, 0) as outstanding_balance,
  loan_stats.last_loan_date,
  COALESCE(payment_stats.overdue_payments, 0) as overdue_payments
FROM public.profiles p
LEFT JOIN (
  SELECT 
    l.user_id,
    COUNT(*) as total_loans,
    SUM(l.amount) as total_borrowed,
    MAX(l.created_at) as last_loan_date
  FROM public.loans l
  WHERE l.status = 'approved'
  GROUP BY l.user_id
) loan_stats ON p.user_id = loan_stats.user_id
LEFT JOIN (
  SELECT 
    l.user_id,
    SUM(p.amount) as total_repaid,
    COUNT(CASE WHEN p.is_overdue THEN 1 END) as overdue_payments
  FROM public.loans l
  JOIN public.payments p ON l.id = p.loan_id
  WHERE p.status = 'completed'
  GROUP BY l.user_id
) payment_stats ON p.user_id = payment_stats.user_id;