-- Fix Critical System Errors
-- Run this in Supabase SQL Editor to resolve critical issues

-- 1. Check if document_verification_requirements table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'document_verification_requirements'
) as table_exists;

-- 2. If table doesn't exist, create it manually
CREATE TABLE IF NOT EXISTS public.document_verification_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_submitted BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  submission_date TIMESTAMPTZ,
  verification_date TIMESTAMPTZ,
  rejection_reason TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.document_verification_requirements ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own document requirements" ON public.document_verification_requirements;
CREATE POLICY "Users can view their own document requirements" ON public.document_verification_requirements
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own document requirements" ON public.document_verification_requirements;
CREATE POLICY "Users can update their own document requirements" ON public.document_verification_requirements
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own document requirements" ON public.document_verification_requirements;
CREATE POLICY "Users can insert their own document requirements" ON public.document_verification_requirements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all document requirements" ON public.document_verification_requirements;
CREATE POLICY "Admins can view all document requirements" ON public.document_verification_requirements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_verification_user_type_verified 
  ON public.document_verification_requirements(user_id, document_type, is_verified);

CREATE INDEX IF NOT EXISTS idx_doc_verification_user_type_unique 
  ON public.document_verification_requirements(user_id, document_type);

-- 6. Fix role fetching issue - Update useAuth to handle multiple roles
-- This query shows users with multiple roles (for debugging)
SELECT user_id, array_agg(role) as roles, count(*) as role_count
FROM user_roles 
GROUP BY user_id 
HAVING count(*) > 1;

-- 7. Create or replace RPC functions
CREATE OR REPLACE FUNCTION public.check_loan_eligibility()
RETURNS TABLE (
  eligible BOOLEAN,
  required_docs INTEGER,
  verified_docs INTEGER,
  profile_completion_percentage INTEGER,
  missing_required_docs TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID := auth.uid();
  req_count INTEGER := 0;
  ver_count INTEGER := 0;
  completion INTEGER := 0;
  missing_docs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check if user exists
  IF user_uuid IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0, ARRAY['user_not_authenticated']::TEXT[];
    RETURN;
  END IF;

  -- Get document counts
  SELECT 
    COUNT(*) FILTER (WHERE is_required = true),
    COUNT(*) FILTER (WHERE is_required = true AND is_verified = true)
  INTO req_count, ver_count
  FROM public.document_verification_requirements 
  WHERE user_id = user_uuid;

  -- Get missing documents
  SELECT array_agg(document_type)
  INTO missing_docs
  FROM public.document_verification_requirements 
  WHERE user_id = user_uuid 
    AND is_required = true 
    AND is_verified = false;

  -- Get profile completion (fallback to 0 if profiles table doesn't have the field)
  BEGIN
    SELECT COALESCE(profile_completion_percentage, 0)
    INTO completion
    FROM public.profiles 
    WHERE user_id = user_uuid;
  EXCEPTION WHEN OTHERS THEN
    completion := 0;
  END;

  -- Determine eligibility
  RETURN QUERY SELECT 
    (req_count > 0 AND ver_count = req_count AND completion >= 80) as eligible,
    req_count,
    ver_count,
    completion,
    COALESCE(missing_docs, ARRAY[]::TEXT[]);
END;
$$;

-- 8. Create admin version
CREATE OR REPLACE FUNCTION public.check_loan_eligibility_admin(target_user_id UUID)
RETURNS TABLE (
  eligible BOOLEAN,
  required_docs INTEGER,
  verified_docs INTEGER,
  profile_completion_percentage INTEGER,
  missing_required_docs TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_count INTEGER := 0;
  ver_count INTEGER := 0;
  completion INTEGER := 0;
  missing_docs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get document counts for target user
  SELECT 
    COUNT(*) FILTER (WHERE is_required = true),
    COUNT(*) FILTER (WHERE is_required = true AND is_verified = true)
  INTO req_count, ver_count
  FROM public.document_verification_requirements 
  WHERE user_id = target_user_id;

  -- Get missing documents
  SELECT array_agg(document_type)
  INTO missing_docs
  FROM public.document_verification_requirements 
  WHERE user_id = target_user_id 
    AND is_required = true 
    AND is_verified = false;

  -- Get profile completion
  BEGIN
    SELECT COALESCE(profile_completion_percentage, 0)
    INTO completion
    FROM public.profiles 
    WHERE user_id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    completion := 0;
  END;

  -- Return eligibility data
  RETURN QUERY SELECT 
    (req_count > 0 AND ver_count = req_count AND completion >= 80) as eligible,
    req_count,
    ver_count,
    completion,
    COALESCE(missing_docs, ARRAY[]::TEXT[]);
END;
$$;

-- 9. Initialize document requirements for existing users who don't have them
INSERT INTO public.document_verification_requirements (user_id, document_type, is_required)
SELECT 
  p.user_id,
  doc_type,
  true
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('id_document'),
    ('bank_statement_1'),
    ('bank_statement_2'),
    ('bank_statement_3'),
    ('payslip')
) AS docs(doc_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_verification_requirements dvr
  WHERE dvr.user_id = p.user_id AND dvr.document_type = docs.doc_type
)
ON CONFLICT DO NOTHING;

-- 10. Performance check - Show slow queries
SELECT 
  'document_verification_requirements' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('public.document_verification_requirements')) as table_size
FROM public.document_verification_requirements
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('public.profiles')) as table_size
FROM public.profiles;

-- Success message
SELECT 'Critical errors fixed successfully!' as status;
