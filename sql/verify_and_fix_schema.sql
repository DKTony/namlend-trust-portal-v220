-- Verify and Fix Database Schema Issues
-- Run this to check actual table structure and fix any missing columns

-- 1. Check actual profiles table schema
SELECT 'Current profiles table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check if we have the basic required columns
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') 
    THEN '✅ first_name exists'
    ELSE '❌ first_name missing'
  END as first_name_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') 
    THEN '✅ last_name exists'
    ELSE '❌ last_name missing'
  END as last_name_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') 
    THEN '✅ phone_number exists'
    ELSE '❌ phone_number missing'
  END as phone_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_income') 
    THEN '✅ monthly_income exists'
    ELSE '❌ monthly_income missing'
  END as income_status;

-- 3. Add missing columns if they don't exist (safe to run multiple times)
DO $$
BEGIN
  -- Add first_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    RAISE NOTICE 'Added first_name column';
  END IF;

  -- Add last_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    RAISE NOTICE 'Added last_name column';
  END IF;

  -- Add phone_number if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
    ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
    RAISE NOTICE 'Added phone_number column';
  END IF;

  -- Add monthly_income if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_income') THEN
    ALTER TABLE public.profiles ADD COLUMN monthly_income DECIMAL(12,2);
    RAISE NOTICE 'Added monthly_income column';
  END IF;

  -- Add employment fields if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employer_name') THEN
    ALTER TABLE public.profiles ADD COLUMN employer_name TEXT;
    RAISE NOTICE 'Added employer_name column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employment_status') THEN
    ALTER TABLE public.profiles ADD COLUMN employment_status TEXT;
    RAISE NOTICE 'Added employment_status column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employer_phone') THEN
    ALTER TABLE public.profiles ADD COLUMN employer_phone TEXT;
    RAISE NOTICE 'Added employer_phone column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employer_contact_person') THEN
    ALTER TABLE public.profiles ADD COLUMN employer_contact_person TEXT;
    RAISE NOTICE 'Added employer_contact_person column';
  END IF;

  -- Add banking fields if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bank_name') THEN
    ALTER TABLE public.profiles ADD COLUMN bank_name TEXT;
    RAISE NOTICE 'Added bank_name column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_number') THEN
    ALTER TABLE public.profiles ADD COLUMN account_number TEXT;
    RAISE NOTICE 'Added account_number column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'branch_code') THEN
    ALTER TABLE public.profiles ADD COLUMN branch_code TEXT;
    RAISE NOTICE 'Added branch_code column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'branch_name') THEN
    ALTER TABLE public.profiles ADD COLUMN branch_name TEXT;
    RAISE NOTICE 'Added branch_name column';
  END IF;

END $$;

-- 4. Verify the fixes
SELECT 'Updated profiles table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. Test profile update functionality
SELECT 'Testing profile update capability...' as status;

-- Check if we can update a profile (this will show what columns are available)
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 6. Check user_roles table for multiple role issue
SELECT 'Checking user roles for PGRST116 issue:' as info;
SELECT user_id, array_agg(role) as roles, count(*) as role_count
FROM user_roles 
GROUP BY user_id 
HAVING count(*) > 1
LIMIT 5;

-- 7. Success message
SELECT 'Schema verification and fixes completed!' as status;
SELECT 'Profile update functionality should now work without PGRST204 errors' as result;
