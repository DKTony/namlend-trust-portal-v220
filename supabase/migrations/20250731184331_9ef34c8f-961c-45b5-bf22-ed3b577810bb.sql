-- Fix security definer function search path
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fix loan eligibility function search path
CREATE OR REPLACE FUNCTION public.assess_loan_eligibility(loan_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  loan_record RECORD;
  profile_record RECORD;
  approval_status TEXT;
BEGIN
  -- Get loan details
  SELECT * INTO loan_record FROM public.loans WHERE id = loan_id;
  
  -- Get profile details
  SELECT * INTO profile_record FROM public.profiles WHERE user_id = loan_record.user_id;
  
  -- Auto-approval logic
  IF profile_record.credit_score >= 700 AND 
     profile_record.verified = true AND
     loan_record.amount <= (profile_record.monthly_income * 3) AND
     loan_record.amount <= 50000 THEN
    approval_status := 'approved';
  ELSIF profile_record.credit_score < 500 OR
        loan_record.amount > (profile_record.monthly_income * 5) OR
        profile_record.verified = false THEN
    approval_status := 'rejected';
  ELSE
    approval_status := 'under_review';
  END IF;
  
  -- Update loan status
  UPDATE public.loans 
  SET status = approval_status, updated_at = now()
  WHERE id = loan_id;
  
  -- Log the review
  INSERT INTO public.loan_reviews (loan_id, previous_status, new_status, auto_approved, review_notes)
  VALUES (loan_id, loan_record.status, approval_status, true, 'Auto-assessed based on credit score and income');
  
  RETURN approval_status;
END;
$$;