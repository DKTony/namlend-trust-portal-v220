# Supabase MCP Migration Workflow (v2.3.2)

Version: 2.3.2 | Date: 2025-10-06 | Status: ✅ Live SQL applied via MCP

## Purpose

Safe alternative to local CLI linking for applying production SQL changes using Supabase MCP. Use when `supabase link` is blocked or local environment is constrained.

## Scope (v2.3.2)

- Fix ambiguous column reference and search behavior in `public.get_profiles_with_roles_admin(...)` (SECURITY DEFINER)
- Recreate `public.profiles_with_roles` view with aggregated roles and convenience flags
- Drop legacy 0-arg overload of `get_profiles_with_roles_admin()` to avoid RPC ambiguity

## SQL Changes (apply in order)

```sql
-- 1) Drop legacy zero-arg overload to avoid RPC ambiguity
DROP FUNCTION IF EXISTS public.get_profiles_with_roles_admin();

-- 2) Recreate profiles_with_roles to expose aggregated roles and flags
DROP VIEW IF EXISTS public.profiles_with_roles;
CREATE OR REPLACE VIEW public.profiles_with_roles AS
SELECT
  p.user_id,
  p.first_name,
  p.last_name,
  p.phone_number,
  p.employment_status,
  p.monthly_income,
  p.created_at,
  p.updated_at,
  COALESCE(
    ARRAY_AGG(ur.role ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'loan_officer' THEN 2 WHEN 'client' THEN 3 ELSE 4 END)
      FILTER (WHERE ur.role IS NOT NULL),
    ARRAY[]::app_role[]
  ) AS roles,
  COALESCE((ARRAY_AGG(ur.role ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'loan_officer' THEN 2 WHEN 'client' THEN 3 ELSE 4 END)
      FILTER (WHERE ur.role IS NOT NULL))[1], 'client'::app_role) AS primary_role,
  BOOL_OR(ur.role = 'admin') AS is_admin,
  BOOL_OR(ur.role = 'loan_officer') AS is_loan_officer,
  BOOL_OR(ur.role = 'client') AS is_client,
  CASE WHEN COUNT(ur.role) > 0 THEN 'active' ELSE 'inactive' END AS account_status,
  NULL::text AS email
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
GROUP BY p.user_id, p.first_name, p.last_name, p.phone_number, p.employment_status, p.monthly_income, p.created_at, p.updated_at;

-- 3) Fix ambiguous column in SECURITY DEFINER RPC and enhance search
CREATE OR REPLACE FUNCTION public.get_profiles_with_roles_admin(
  p_search_term text DEFAULT NULL,
  p_role_filter public.app_role DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  roles public.app_role[],
  primary_role public.app_role,
  is_admin boolean,
  is_loan_officer boolean,
  is_client boolean,
  account_status text,
  created_at timestamptz,
  updated_at timestamptz,
  monthly_income numeric,
  employment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_role text;
BEGIN
  SELECT ur.role INTO v_user_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'loan_officer' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin','loan_officer') THEN
    RAISE insufficient_privilege USING MESSAGE = 'Insufficient permissions to access user profiles';
  END IF;

  RETURN QUERY
  SELECT
    pwr.user_id,
    pwr.first_name,
    pwr.last_name,
    COALESCE(pwr.email, u.email) AS email,
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
  LEFT JOIN auth.users u ON u.id = pwr.user_id
  WHERE (
    p_search_term IS NULL OR (
      pwr.first_name ILIKE '%' || p_search_term || '%' OR
      pwr.last_name ILIKE '%' || p_search_term || '%' OR
      COALESCE(pwr.email, u.email) ILIKE '%' || p_search_term || '%' OR
      pwr.phone_number ILIKE '%' || p_search_term || '%' OR
      pwr.user_id::text ILIKE '%' || p_search_term || '%'
    )
  )
  AND (p_role_filter IS NULL OR p_role_filter = ANY(pwr.roles))
  ORDER BY pwr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profiles_with_roles_admin(text, public.app_role, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profiles_with_roles_admin(text, public.app_role, integer, integer) TO authenticated;
```

## Verification

```sql
-- Verify view columns
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles_with_roles';

-- Verify RPC signature exists
SELECT p.oid::regprocedure::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.proname='get_profiles_with_roles_admin' AND n.nspname='public';
```

## Security & RLS

- RPC uses SECURITY DEFINER with staff guard via `public.user_roles`
- `search_path` pinned to `public`
- EXECUTE restricted to `authenticated`

## Operational Notes

- Prefer Edge Function `admin-assign-role` for writes; `assign_user_role` (SECURITY DEFINER) as fallback
- For local dev, set `VITE_RUN_DEV_SCRIPTS=false` to avoid auth interference
