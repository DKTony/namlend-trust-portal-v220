-- Dashboard Performance Optimization
-- Run this in Supabase SQL Editor to improve dashboard loading times

-- 1. Add missing indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_loans_user_status_amount ON public.loans(user_id, status, amount);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_status_created ON public.loans(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_loan_created ON public.payments(loan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_amount_date ON public.payments(amount, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_user_completion ON public.profiles(user_id, profile_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_profiles_eligible_created ON public.profiles(loan_application_eligible, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);

-- 2. Create optimized dashboard data function
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_uuid UUID := auth.uid();
BEGIN
  -- Check authentication
  IF user_uuid IS NULL THEN
    RETURN '{"error": "Not authenticated"}'::JSON;
  END IF;

  -- Build dashboard summary efficiently
  SELECT json_build_object(
    'user_id', user_uuid,
    'profile_completion', COALESCE(p.profile_completion_percentage, 0),
    'loan_eligible', COALESCE(p.loan_application_eligible, false),
    'total_loans', COALESCE(loan_stats.total_loans, 0),
    'active_loans', COALESCE(loan_stats.active_loans, 0),
    'total_borrowed', COALESCE(loan_stats.total_borrowed, 0),
    'total_repaid', COALESCE(payment_stats.total_repaid, 0),
    'pending_documents', COALESCE(doc_stats.pending_docs, 0),
    'verified_documents', COALESCE(doc_stats.verified_docs, 0)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as total_loans,
      COUNT(*) FILTER (WHERE status IN ('approved', 'active', 'disbursed')) as active_loans,
      SUM(amount) as total_borrowed
    FROM public.loans 
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) loan_stats ON p.user_id = loan_stats.user_id
  LEFT JOIN (
    SELECT 
      l.user_id,
      SUM(pay.amount) as total_repaid
    FROM public.payments pay
    JOIN public.loans l ON pay.loan_id = l.id
    WHERE l.user_id = user_uuid
    GROUP BY l.user_id
  ) payment_stats ON p.user_id = payment_stats.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE is_required = true AND is_verified = false) as pending_docs,
      COUNT(*) FILTER (WHERE is_required = true AND is_verified = true) as verified_docs
    FROM public.document_verification_requirements
    WHERE user_id = user_uuid
    GROUP BY user_id
  ) doc_stats ON p.user_id = doc_stats.user_id
  WHERE p.user_id = user_uuid;

  RETURN COALESCE(result, '{"error": "Profile not found"}'::JSON);
END;
$$;

-- 3. Create admin dashboard summary function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN '{"error": "Access denied"}'::JSON;
  END IF;

  -- Build admin dashboard summary
  SELECT json_build_object(
    'total_clients', client_stats.total_clients,
    'active_clients', client_stats.active_clients,
    'total_loans', loan_stats.total_loans,
    'active_loans', loan_stats.active_loans,
    'total_portfolio_value', loan_stats.total_portfolio,
    'pending_approvals', approval_stats.pending_approvals,
    'pending_verifications', doc_stats.pending_verifications
  ) INTO result
  FROM (
    SELECT 
      COUNT(*) as total_clients,
      COUNT(*) FILTER (WHERE loan_application_eligible = true) as active_clients
    FROM public.profiles
  ) client_stats,
  (
    SELECT 
      COUNT(*) as total_loans,
      COUNT(*) FILTER (WHERE status IN ('approved', 'active', 'disbursed')) as active_loans,
      SUM(amount) as total_portfolio
    FROM public.loans
  ) loan_stats,
  (
    SELECT 
      COUNT(*) as pending_approvals
    FROM public.loans
    WHERE status = 'pending'
  ) approval_stats,
  (
    SELECT 
      COUNT(*) as pending_verifications
    FROM public.document_verification_requirements
    WHERE is_submitted = true AND is_verified = false
  ) doc_stats;

  RETURN result;
END;
$$;

-- 4. Analyze query performance
ANALYZE public.loans;
ANALYZE public.payments;
ANALYZE public.profiles;
ANALYZE public.document_verification_requirements;
ANALYZE public.user_roles;

-- 5. Show current table statistics
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 6. Show index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY idx_scan DESC;

-- Success message
SELECT 'Dashboard performance optimization completed!' as status;
