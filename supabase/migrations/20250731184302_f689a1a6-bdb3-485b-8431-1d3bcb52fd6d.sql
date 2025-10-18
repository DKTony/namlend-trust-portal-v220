-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('client', 'loan_officer', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Add credit score to profiles
ALTER TABLE public.profiles ADD COLUMN credit_score INTEGER DEFAULT 600;
ALTER TABLE public.profiles ADD COLUMN risk_category TEXT DEFAULT 'medium';
ALTER TABLE public.profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

-- Create loan approval workflow table
CREATE TABLE public.loan_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  review_notes TEXT,
  auto_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loan officers can view all reviews" ON public.loan_reviews
  FOR SELECT USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Loan officers can insert reviews" ON public.loan_reviews
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Create payment tracking enhancements
ALTER TABLE public.payments ADD COLUMN is_overdue BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN days_overdue INTEGER DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN payment_notes TEXT;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'loan_approved', 'loan_rejected', 'payment_overdue', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create financial summary view
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
  COUNT(DISTINCT l.user_id) as total_clients,
  COUNT(l.id) as total_loans,
  COALESCE(SUM(CASE WHEN l.status = 'approved' THEN l.amount ELSE 0 END), 0) as total_disbursed,
  COALESCE(SUM(CASE WHEN l.status = 'pending' THEN l.amount ELSE 0 END), 0) as pending_amount,
  COALESCE(SUM(CASE WHEN l.status = 'rejected' THEN l.amount ELSE 0 END), 0) as rejected_amount,
  COALESCE(SUM(p.amount), 0) as total_repayments,
  COUNT(CASE WHEN p.is_overdue = true THEN 1 END) as overdue_payments
FROM public.loans l
LEFT JOIN public.payments p ON l.id = p.loan_id AND p.status = 'completed';

-- Create client portfolio view
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
  COUNT(l.id) as total_loans,
  COALESCE(SUM(CASE WHEN l.status = 'approved' THEN l.amount ELSE 0 END), 0) as total_borrowed,
  COALESCE(SUM(pay.amount), 0) as total_repaid,
  COALESCE(SUM(CASE WHEN l.status = 'approved' THEN l.amount ELSE 0 END), 0) - COALESCE(SUM(pay.amount), 0) as outstanding_balance,
  MAX(l.created_at) as last_loan_date,
  COUNT(CASE WHEN pay.is_overdue = true THEN 1 END) as overdue_payments
FROM public.profiles p
LEFT JOIN public.loans l ON p.user_id = l.user_id
LEFT JOIN public.payments pay ON l.id = pay.loan_id AND pay.status = 'completed'
GROUP BY p.user_id, p.first_name, p.last_name, p.phone_number, p.verified, p.credit_score, p.risk_category, p.monthly_income;

-- Update loans table policies for admin access
CREATE POLICY "Staff can view all loans" ON public.loans
  FOR SELECT USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update loan status" ON public.loans
  FOR UPDATE USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Update payments table policies for admin access
CREATE POLICY "Staff can view all payments" ON public.payments
  FOR SELECT USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update payments" ON public.payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Update profiles table policies for admin access
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Update KYC documents policies for admin access
CREATE POLICY "Staff can view all KYC documents" ON public.kyc_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update KYC status" ON public.kyc_documents
  FOR UPDATE USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically assess loan eligibility
CREATE OR REPLACE FUNCTION public.assess_loan_eligibility(loan_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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