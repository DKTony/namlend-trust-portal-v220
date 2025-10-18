-- Enhanced Client Profile Management System Migration
-- Date: September 21, 2025
-- Purpose: Extend profiles table with comprehensive client information architecture

-- Add comprehensive profile fields to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Namibia';

-- Employment information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_address_line2 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_contact_person TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employment_start_date DATE;

-- Banking information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'savings';

-- Document verification status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_document_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_statements_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payslip_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS documents_complete BOOLEAN DEFAULT false;

-- Profile completion tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loan_application_eligible BOOLEAN DEFAULT false;

-- Create enhanced KYC document types enum
CREATE TYPE public.kyc_document_type AS ENUM (
  'id_document',
  'bank_statement_1',
  'bank_statement_2', 
  'bank_statement_3',
  'payslip',
  'proof_of_residence',
  'employment_letter'
);

-- Create document verification requirements table
CREATE TABLE IF NOT EXISTS public.document_verification_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type kyc_document_type NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_submitted BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  submission_date TIMESTAMP WITH TIME ZONE,
  verification_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, document_type)
);

-- Enable RLS on document verification requirements
ALTER TABLE public.document_verification_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies for document verification requirements
CREATE POLICY "Users can view their own document requirements" ON public.document_verification_requirements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own document requirements" ON public.document_verification_requirements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document requirements" ON public.document_verification_requirements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to initialize document requirements for new users
CREATE OR REPLACE FUNCTION public.initialize_document_requirements()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert required document types for new user
  INSERT INTO public.document_verification_requirements (user_id, document_type, is_required)
  VALUES 
    (NEW.user_id, 'id_document', true),
    (NEW.user_id, 'bank_statement_1', true),
    (NEW.user_id, 'bank_statement_2', true),
    (NEW.user_id, 'bank_statement_3', true),
    (NEW.user_id, 'payslip', true),
    (NEW.user_id, 'proof_of_residence', false),
    (NEW.user_id, 'employment_letter', false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize document requirements when profile is created
CREATE TRIGGER initialize_document_requirements_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_document_requirements();

-- Create function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  completion_score INTEGER := 0;
  total_fields INTEGER := 20; -- Total number of profile fields to check
  profile_record RECORD;
  doc_count INTEGER;
BEGIN
  -- Get profile data
  SELECT * INTO profile_record FROM public.profiles WHERE user_id = user_uuid;
  
  IF profile_record IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Check basic profile fields (5 points each)
  IF profile_record.first_name IS NOT NULL AND profile_record.first_name != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.last_name IS NOT NULL AND profile_record.last_name != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.phone_number IS NOT NULL AND profile_record.phone_number != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  IF profile_record.id_number IS NOT NULL AND profile_record.id_number != '' THEN
    completion_score := completion_score + 5;
  END IF;
  
  -- Check address fields (3 points each)
  IF profile_record.address_line1 IS NOT NULL AND profile_record.address_line1 != '' THEN
    completion_score := completion_score + 3;
  END IF;
  
  IF profile_record.city IS NOT NULL AND profile_record.city != '' THEN
    completion_score := completion_score + 3;
  END IF;
  
  IF profile_record.postal_code IS NOT NULL AND profile_record.postal_code != '' THEN
    completion_score := completion_score + 3;
  END IF;
  
  -- Check employment fields (4 points each)
  IF profile_record.employer_name IS NOT NULL AND profile_record.employer_name != '' THEN
    completion_score := completion_score + 4;
  END IF;
  
  IF profile_record.employer_phone IS NOT NULL AND profile_record.employer_phone != '' THEN
    completion_score := completion_score + 4;
  END IF;
  
  IF profile_record.employment_status IS NOT NULL AND profile_record.employment_status != '' THEN
    completion_score := completion_score + 4;
  END IF;
  
  IF profile_record.monthly_income IS NOT NULL AND profile_record.monthly_income > 0 THEN
    completion_score := completion_score + 4;
  END IF;
  
  -- Check banking fields (4 points each)
  IF profile_record.bank_name IS NOT NULL AND profile_record.bank_name != '' THEN
    completion_score := completion_score + 4;
  END IF;
  
  IF profile_record.account_number IS NOT NULL AND profile_record.account_number != '' THEN
    completion_score := completion_score + 4;
  END IF;
  
  IF profile_record.branch_code IS NOT NULL AND profile_record.branch_code != '' THEN
    completion_score := completion_score + 4;
  END IF;
  
  -- Check document verification (10 points each for required docs)
  SELECT COUNT(*) INTO doc_count 
  FROM public.document_verification_requirements 
  WHERE user_id = user_uuid AND is_required = true AND is_verified = true;
  
  completion_score := completion_score + (doc_count * 10);
  
  -- Cap at 100%
  IF completion_score > 100 THEN
    completion_score := 100;
  END IF;
  
  RETURN completion_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check loan application eligibility
CREATE OR REPLACE FUNCTION public.check_loan_eligibility(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  profile_record RECORD;
  required_docs_count INTEGER;
  verified_docs_count INTEGER;
BEGIN
  -- Get profile data
  SELECT * INTO profile_record FROM public.profiles WHERE user_id = user_uuid;
  
  IF profile_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if basic profile information is complete
  IF profile_record.first_name IS NULL OR profile_record.first_name = '' OR
     profile_record.last_name IS NULL OR profile_record.last_name = '' OR
     profile_record.phone_number IS NULL OR profile_record.phone_number = '' OR
     profile_record.id_number IS NULL OR profile_record.id_number = '' OR
     profile_record.employer_name IS NULL OR profile_record.employer_name = '' OR
     profile_record.monthly_income IS NULL OR profile_record.monthly_income <= 0 OR
     profile_record.bank_name IS NULL OR profile_record.bank_name = '' OR
     profile_record.account_number IS NULL OR profile_record.account_number = '' THEN
    RETURN false;
  END IF;
  
  -- Check if all required documents are verified
  SELECT COUNT(*) INTO required_docs_count 
  FROM public.document_verification_requirements 
  WHERE user_id = user_uuid AND is_required = true;
  
  SELECT COUNT(*) INTO verified_docs_count 
  FROM public.document_verification_requirements 
  WHERE user_id = user_uuid AND is_required = true AND is_verified = true;
  
  -- Must have all required documents verified
  IF required_docs_count != verified_docs_count THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update profile completion and eligibility
CREATE OR REPLACE FUNCTION public.update_profile_status()
RETURNS TRIGGER AS $$
DECLARE
  completion_pct INTEGER;
  is_eligible BOOLEAN;
BEGIN
  -- Calculate completion percentage
  completion_pct := public.calculate_profile_completion(NEW.user_id);
  
  -- Check loan eligibility
  is_eligible := public.check_loan_eligibility(NEW.user_id);
  
  -- Update profile with calculated values
  UPDATE public.profiles 
  SET 
    profile_completion_percentage = completion_pct,
    loan_application_eligible = is_eligible,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update profile status
CREATE TRIGGER update_profile_status_on_profile_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_status();

CREATE TRIGGER update_profile_status_on_document_change
  AFTER INSERT OR UPDATE ON public.document_verification_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_status();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_completion ON public.profiles(profile_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_profiles_eligible ON public.profiles(loan_application_eligible);
CREATE INDEX IF NOT EXISTS idx_doc_requirements_user_id ON public.document_verification_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_requirements_type ON public.document_verification_requirements(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_requirements_verified ON public.document_verification_requirements(is_verified);

-- Update existing profiles to initialize document requirements
INSERT INTO public.document_verification_requirements (user_id, document_type, is_required)
SELECT 
  p.user_id,
  dt.doc_type,
  CASE 
    WHEN dt.doc_type IN ('id_document', 'bank_statement_1', 'bank_statement_2', 'bank_statement_3', 'payslip') THEN true
    ELSE false
  END as is_required
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('id_document'::kyc_document_type),
    ('bank_statement_1'::kyc_document_type),
    ('bank_statement_2'::kyc_document_type),
    ('bank_statement_3'::kyc_document_type),
    ('payslip'::kyc_document_type),
    ('proof_of_residence'::kyc_document_type),
    ('employment_letter'::kyc_document_type)
) AS dt(doc_type)
ON CONFLICT (user_id, document_type) DO NOTHING;

-- Update profile completion percentages for existing users
UPDATE public.profiles 
SET 
  profile_completion_percentage = public.calculate_profile_completion(user_id),
  loan_application_eligible = public.check_loan_eligibility(user_id);

COMMENT ON TABLE public.document_verification_requirements IS 'Tracks document verification requirements and status for each user';
COMMENT ON FUNCTION public.calculate_profile_completion(UUID) IS 'Calculates profile completion percentage based on filled fields and verified documents';
COMMENT ON FUNCTION public.check_loan_eligibility(UUID) IS 'Determines if user is eligible for loan application based on profile completeness and document verification';
