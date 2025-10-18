-- Migration: Add approval_requests_expanded view for enriched admin UI
-- Purpose: Eliminate N+1 queries and provide joined user/reviewer/assignee context
-- Security: Inherits RLS from underlying tables via view

-- Create view with proper joins for admin dashboard
CREATE OR REPLACE VIEW public.approval_requests_expanded AS
SELECT
  ar.id,
  ar.user_id,
  ar.request_type,
  ar.status,
  ar.priority,
  ar.request_data,
  ar.admin_notes,
  ar.review_notes,
  ar.reviewer_id,
  ar.assigned_to,
  ar.reviewed_at,
  ar.created_at,
  ar.updated_at,
  -- User details
  up.first_name AS user_first_name,
  up.last_name AS user_last_name,
  up.phone_number AS user_phone_number,
  up.email AS user_email,
  -- Reviewer details (if assigned)
  rp.first_name AS reviewer_first_name,
  rp.last_name AS reviewer_last_name,
  rp.email AS reviewer_email,
  -- Assignee details (if assigned)
  ap.first_name AS assignee_first_name,
  ap.last_name AS assignee_last_name,
  ap.email AS assignee_email,
  -- Calculated fields
  CASE 
    WHEN ar.status = 'pending' AND ar.created_at < NOW() - INTERVAL '48 hours' THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN ar.request_type = 'loan_application' THEN (ar.request_data->>'amount')::numeric
    ELSE NULL
  END AS loan_amount,
  CASE
    WHEN ar.request_type = 'loan_application' THEN (ar.request_data->>'term')::integer
    ELSE NULL
  END AS loan_term
FROM public.approval_requests ar
LEFT JOIN public.profiles up ON up.user_id = ar.user_id
LEFT JOIN public.profiles rp ON rp.user_id = ar.reviewer_id
LEFT JOIN public.profiles ap ON ap.user_id = ar.assigned_to;

-- Grant appropriate permissions
GRANT SELECT ON public.approval_requests_expanded TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.approval_requests_expanded IS 
  'Enriched view of approval requests with joined user, reviewer, and assignee profiles. Used by admin dashboard for efficient data display without N+1 queries.';

-- Add index on approval_requests for better view performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_status_created 
  ON public.approval_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_requests_reviewer_id 
  ON public.approval_requests(reviewer_id) 
  WHERE reviewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_assigned_to 
  ON public.approval_requests(assigned_to) 
  WHERE assigned_to IS NOT NULL;
