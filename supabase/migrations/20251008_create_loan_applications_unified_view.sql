-- Migration: Create loan_applications_unified view
-- Purpose: Unify approval_requests (pending) and loans (approved/rejected/disbursed) into single queryable view
-- Security: SECURITY INVOKER - inherits RLS from underlying tables
-- Phase: v2.3.1 - Unified Data Model

-- Drop view if exists (for idempotency)
DROP VIEW IF EXISTS public.loan_applications_unified;

-- Create unified view combining approval workflow and loans
CREATE VIEW public.loan_applications_unified
WITH (security_invoker = true)
AS
-- Pending/under_review applications from approval_requests
SELECT
  ar.id,
  ar.user_id,
  'approval' AS source,
  ar.status,
  COALESCE((ar.request_data->>'amount')::numeric, 0) AS amount,
  COALESCE(ar.request_data->>'purpose', ar.request_data->>'loan_purpose', 'Not specified') AS purpose,
  ar.priority,
  NULL::integer AS term_months,
  NULL::numeric AS interest_rate,
  ar.created_at,
  ar.updated_at,
  -- User details from profiles
  CONCAT(p.first_name, ' ', p.last_name) AS applicant_name,
  CONCAT('user-', SUBSTRING(ar.user_id::text, 1, 8), '@namlend.com') AS applicant_email,
  p.employment_status,
  p.monthly_income
FROM public.approval_requests ar
LEFT JOIN public.profiles p ON p.user_id = ar.user_id
WHERE ar.request_type = 'loan_application'
  AND ar.status IN ('pending', 'under_review')

UNION ALL

-- Approved/rejected/disbursed loans from loans table
SELECT
  l.id,
  l.user_id,
  'loan' AS source,
  l.status,
  l.amount,
  COALESCE(l.purpose, 'Not specified') AS purpose,
  'normal'::text AS priority, -- Loans don't have priority, default to normal
  l.term_months,
  l.interest_rate,
  l.created_at,
  l.updated_at,
  -- User details from profiles
  CONCAT(p.first_name, ' ', p.last_name) AS applicant_name,
  CONCAT('user-', SUBSTRING(l.user_id::text, 1, 8), '@namlend.com') AS applicant_email,
  p.employment_status,
  p.monthly_income
FROM public.loans l
LEFT JOIN public.profiles p ON p.user_id = l.user_id
WHERE l.status IN ('approved', 'rejected', 'disbursed', 'active', 'completed', 'defaulted');

-- Grant SELECT to authenticated users (RLS will filter based on user_id)
GRANT SELECT ON public.loan_applications_unified TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.loan_applications_unified IS 
  'Unified view of loan applications combining approval_requests (pending/under_review) and loans (approved/rejected/disbursed). Uses SECURITY INVOKER to inherit RLS policies from underlying tables. Simplifies frontend queries by providing single source of truth for all application states.';

-- Create indexes on underlying tables for better view performance (if not already exist)
CREATE INDEX IF NOT EXISTS idx_approval_requests_loan_app_status 
  ON public.approval_requests(request_type, status, created_at DESC)
  WHERE request_type = 'loan_application';

CREATE INDEX IF NOT EXISTS idx_loans_status_created 
  ON public.loans(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id_employment 
  ON public.profiles(user_id) 
  INCLUDE (first_name, last_name, employment_status, monthly_income);
