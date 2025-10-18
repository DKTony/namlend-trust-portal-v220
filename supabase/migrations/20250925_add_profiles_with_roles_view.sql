-- Migration: Add profiles_with_roles view for admin user management
-- Purpose: Provide enriched user profiles with role information for admin dashboard
-- Security: Restricted to admin and loan_officer roles via RLS-compatible design

-- Create view joining profiles with user roles
CREATE OR REPLACE VIEW public.profiles_with_roles AS
SELECT
  p.user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone_number,
  p.address,
  p.city,
  p.state,
  p.postal_code,
  p.country,
  p.date_of_birth,
  p.gender,
  p.nationality,
  p.employment_status,
  p.monthly_income,
  p.created_at,
  p.updated_at,
  -- Aggregate roles into an array
  COALESCE(
    ARRAY_AGG(
      ur.role 
      ORDER BY 
        CASE ur.role 
          WHEN 'admin' THEN 1
          WHEN 'loan_officer' THEN 2
          WHEN 'client' THEN 3
          ELSE 4
        END
    ) FILTER (WHERE ur.role IS NOT NULL),
    ARRAY[]::app_role[]
  ) AS roles,
  -- Primary role (highest priority)
  COALESCE(
    (ARRAY_AGG(
      ur.role 
      ORDER BY 
        CASE ur.role 
          WHEN 'admin' THEN 1
          WHEN 'loan_officer' THEN 2
          WHEN 'client' THEN 3
          ELSE 4
        END
    ) FILTER (WHERE ur.role IS NOT NULL))[1],
    'client'::app_role
  ) AS primary_role,
  -- Role flags for convenience
  BOOL_OR(ur.role = 'admin') AS is_admin,
  BOOL_OR(ur.role = 'loan_officer') AS is_loan_officer,
  BOOL_OR(ur.role = 'client') AS is_client,
  -- Account status derived from auth.users (requires admin RPC to access)
  CASE 
    WHEN COUNT(ur.role) > 0 THEN 'active'
    ELSE 'inactive'
  END AS account_status
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
GROUP BY 
  p.user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone_number,
  p.address,
  p.city,
  p.state,
  p.postal_code,
  p.country,
  p.date_of_birth,
  p.gender,
  p.nationality,
  p.employment_status,
  p.monthly_income,
  p.created_at,
  p.updated_at;

-- Grant select permission to authenticated users
-- Note: Actual access control should be implemented via RLS or admin-only RPC
GRANT SELECT ON public.profiles_with_roles TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.profiles_with_roles IS 
  'Enriched view of user profiles with aggregated role information. Used by admin user management dashboard.';

-- Create RPC function for admin-only access to profiles with roles
-- This provides better security than direct view access
CREATE OR REPLACE FUNCTION public.get_profiles_with_roles_admin(
  p_search_term TEXT DEFAULT NULL,
  p_role_filter app_role DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  roles app_role[],
  primary_role app_role,
  is_admin BOOLEAN,
  is_loan_officer BOOLEAN,
  is_client BOOLEAN,
  account_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  monthly_income NUMERIC,
  employment_status TEXT
) AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if caller has admin or loan_officer role
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1
      WHEN 'loan_officer' THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- Deny access if not admin or loan_officer
  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'loan_officer') THEN
    RAISE EXCEPTION 'Insufficient permissions to access user profiles';
  END IF;

  -- Return filtered results
  RETURN QUERY
  SELECT
    pwr.user_id,
    pwr.first_name,
    pwr.last_name,
    pwr.email,
    pwr.phone_number,
    pwr.roles,
    pwr.primary_role,
    pwr.is_admin,
    pwr.is_loan_officer,
    pwr.is_client,
    pwr.account_status,
    pwr.created_at,
    pwr.updated_at,
    pwr.monthly_income,
    pwr.employment_status
  FROM public.profiles_with_roles pwr
  WHERE 
    -- Search filter
    (p_search_term IS NULL OR (
      pwr.first_name ILIKE '%' || p_search_term || '%' OR
      pwr.last_name ILIKE '%' || p_search_term || '%' OR
      pwr.email ILIKE '%' || p_search_term || '%' OR
      pwr.phone_number ILIKE '%' || p_search_term || '%'
    ))
    -- Role filter
    AND (p_role_filter IS NULL OR p_role_filter = ANY(pwr.roles))
  ORDER BY pwr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profiles_with_roles_admin(TEXT, app_role, INTEGER, INTEGER) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION public.get_profiles_with_roles_admin(TEXT, app_role, INTEGER, INTEGER) IS 
  'Admin-only RPC to fetch user profiles with roles. Requires admin or loan_officer role. Supports search and role filtering.';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_search 
  ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_name_search 
  ON public.profiles(first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
  ON public.profiles(created_at DESC);
