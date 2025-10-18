-- Performance indexes for KYC eligibility and document verification
-- Following CEDF §8: Indexes for authoritative KYC status determination

-- Document verification requirements: speed lookups per user/type/status
CREATE INDEX IF NOT EXISTS idx_doc_req_user_type_status 
  ON public.document_verification_requirements (user_id, document_type, is_verified);

CREATE INDEX IF NOT EXISTS idx_doc_req_user_required 
  ON public.document_verification_requirements (user_id, is_required) 
  WHERE is_required = true;

CREATE INDEX IF NOT EXISTS idx_doc_req_user_submitted 
  ON public.document_verification_requirements (user_id, is_submitted, submission_date DESC) 
  WHERE is_submitted = true;

-- Unique constraint to prevent duplicate requirements per user/doc_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_req_user_type_unique
  ON public.document_verification_requirements (user_id, document_type);

-- KYC documents table (legacy fallback support)
CREATE INDEX IF NOT EXISTS idx_kyc_docs_user_status 
  ON public.kyc_documents (user_id, status) 
  WHERE status IS NOT NULL;

-- Profiles table: speed profile completion calculations
CREATE INDEX IF NOT EXISTS idx_profiles_user_completion 
  ON public.profiles (user_id, created_at DESC);

-- Loans table: speed eligibility checks based on loan history
CREATE INDEX IF NOT EXISTS idx_loans_user_status_amount 
  ON public.loans (user_id, status, amount DESC);

-- Payments table: speed repayment history calculations
CREATE INDEX IF NOT EXISTS idx_payments_loan_status_amount 
  ON public.payments (loan_id, status, amount DESC);

-- Composite index for loan-payment joins (used in admin client profile hook)
CREATE INDEX IF NOT EXISTS idx_payments_loans_user 
  ON public.payments (loan_id) 
  INCLUDE (amount, status, created_at);

-- Comments for maintenance
COMMENT ON INDEX idx_doc_req_user_type_status IS 'Speeds RPC eligibility checks by user/doc_type/verification status';
COMMENT ON INDEX idx_doc_req_user_type_unique IS 'Enforces SSOT: one requirement record per user/doc_type';
COMMENT ON INDEX idx_profiles_user_completion IS 'Speeds profile completion percentage calculations';
COMMENT ON INDEX idx_loans_user_status_amount IS 'Speeds loan history analysis for eligibility';
