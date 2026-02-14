-- Migration: Add process_approval_transaction RPC for atomic loan processing
-- Purpose: Ensure data consistency when processing approved loan applications
-- Security: SECURITY DEFINER with strict validation and role checks

-- Add approval_request_id column to loans table for idempotency tracking
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS approval_request_id UUID REFERENCES public.approval_requests(id);

-- Create UNIQUE index for idempotency enforcement (database-level constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_approval_request_id_unique 
ON public.loans(approval_request_id) 
WHERE approval_request_id IS NOT NULL;

COMMENT ON INDEX idx_loans_approval_request_id_unique IS 
'Ensures one loan per approval request for idempotency. Partial index excludes NULL values to allow loans without approval requests.';

-- Create function for atomic approval transaction processing
CREATE OR REPLACE FUNCTION public.process_approval_transaction(
  p_request_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_loan_id UUID;
  v_existing_loan RECORD;
  v_user_role TEXT;
  v_error_msg TEXT;
BEGIN
  -- Verify caller has appropriate role
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

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'loan_officer') THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Insufficient permissions to process approvals'
    );
  END IF;

  -- Lock and fetch the approval request
  SELECT * INTO v_request
  FROM public.approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Validate request exists and is in correct state
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Approval request not found'
    );
  END IF;

  IF v_request.status != 'approved' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Request must be in approved status to process'
    );
  END IF;

  IF v_request.request_type != 'loan_application' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'This function only processes loan applications'
    );
  END IF;

  -- Validate required fields in request_data
  IF v_request.request_data->>'amount' IS NULL OR 
     (v_request.request_data->>'term_months' IS NULL AND v_request.request_data->>'term' IS NULL) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Missing required loan data (amount or term)'
    );
  END IF;

  -- IDEMPOTENCY CHECK: Return existing loan details directly if already created
  SELECT id, amount, term_months, interest_rate, monthly_payment, status, created_at
  INTO v_existing_loan
  FROM public.loans 
  WHERE approval_request_id = p_request_id;
  
  IF v_existing_loan.id IS NOT NULL THEN
    -- Return full loan details directly as JSON (no UUID cast issues)
    RETURN json_build_object(
      'success', true,
      'loan_id', v_existing_loan.id,
      'amount', v_existing_loan.amount,
      'term_months', v_existing_loan.term_months,
      'interest_rate', v_existing_loan.interest_rate,
      'monthly_payment', v_existing_loan.monthly_payment,
      'status', v_existing_loan.status,
      'created_at', v_existing_loan.created_at,
      'idempotent', true,
      'message', 'Loan already created for this approval request'
    );
  END IF;

  -- Begin transaction processing
  BEGIN
    -- Extract and validate loan data
    DECLARE
      v_amount NUMERIC := (v_request.request_data->>'amount')::numeric;
      v_term INTEGER := COALESCE(
        (v_request.request_data->>'term_months')::integer,
        (v_request.request_data->>'term')::integer
      );
      v_interest_rate NUMERIC := COALESCE(
        (v_request.request_data->>'interest_rate')::numeric,
        (v_request.request_data->>'interestRate')::numeric,
        32 -- Default to max APR if not specified
      );
      v_monthly_payment NUMERIC := COALESCE(
        (v_request.request_data->>'monthly_payment')::numeric,
        (v_request.request_data->>'monthlyPayment')::numeric,
        0
      );
      v_total_repayment NUMERIC := COALESCE(
        (v_request.request_data->>'total_repayment')::numeric,
        (v_request.request_data->>'totalRepayment')::numeric,
        0
      );
      v_purpose TEXT := COALESCE(
        v_request.request_data->>'purpose',
        v_request.request_data->>'loanPurpose',
        'Personal'
      );
    BEGIN
      -- Validate APR limit (32% for Namibian regulations)
      IF v_interest_rate > 32 THEN
        RETURN json_build_object(
          'success', false, 
          'error', 'Interest rate exceeds regulatory limit of 32% APR'
        );
      END IF;

      -- Insert loan record
      INSERT INTO public.loans (
        user_id, 
        amount, 
        term_months, 
        interest_rate, 
        monthly_payment, 
        total_repayment, 
        purpose, 
        status,
        approved_at,
        approved_by,
        approval_request_id
      ) VALUES (
        v_request.user_id,
        v_amount,
        v_term,
        v_interest_rate,
        v_monthly_payment,
        v_total_repayment,
        v_purpose,
        'approved',
        NOW(),
        auth.uid(),
        p_request_id
      ) RETURNING id INTO v_loan_id;

      -- Update approval request with processing info
      UPDATE public.approval_requests
      SET 
        review_notes = COALESCE(review_notes || E'\n', '') || 
          format('[%s] Loan created: %s', TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI'), v_loan_id::text),
        updated_at = NOW()
      WHERE id = p_request_id;

      -- Create workflow history entry (using correct column names)
      INSERT INTO public.approval_workflow_history (
        approval_request_id,
        previous_status,
        new_status,
        changed_by,
        change_reason,
        additional_data
      ) VALUES (
        p_request_id,
        'approved',
        'approved',
        auth.uid(),
        'Loan created from approved application',
        jsonb_build_object('loan_id', v_loan_id)
      );

      -- Create notification for user (using correct column names)
      INSERT INTO public.approval_notifications (
        approval_request_id,
        recipient_id,
        notification_type,
        title,
        message,
        metadata,
        sent_at
      ) VALUES (
        p_request_id,
        v_request.user_id,
        'loan_created',
        'Loan Created',
        format('Your loan application was processed. Loan ID: %s, Amount: N$%s', 
          v_loan_id::text, 
          TO_CHAR(v_amount, 'FM999,999,999.00')
        ),
        jsonb_build_object('loan_id', v_loan_id, 'amount', v_amount, 'term_months', v_term),
        NOW()
      );

      -- Return success with loan details
      RETURN json_build_object(
        'success', true,
        'loan_id', v_loan_id,
        'amount', v_amount,
        'term_months', v_term,
        'interest_rate', v_interest_rate,
        'monthly_payment', v_monthly_payment,
        'message', 'Loan successfully created from approved application'
      );

    EXCEPTION WHEN OTHERS THEN
      -- Capture any errors during loan creation
      GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
      RETURN json_build_object(
        'success', false,
        'error', format('Failed to create loan: %s', v_error_msg)
      );
    END;
  END;

EXCEPTION WHEN OTHERS THEN
  -- Capture any outer errors
  GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
  RETURN json_build_object(
    'success', false,
    'error', format('Transaction failed: %s', v_error_msg)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS will handle role checks internally)
GRANT EXECUTE ON FUNCTION public.process_approval_transaction(UUID) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION public.process_approval_transaction(UUID) IS 
  'Atomically processes an approved loan application by creating the loan record, updating approval status, and generating notifications. Enforces 32% APR limit and requires admin or loan_officer role.';

-- Add columns to loans table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'loans' 
    AND column_name = 'approved_at') THEN
    ALTER TABLE public.loans ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'loans' 
    AND column_name = 'approved_by') THEN
    ALTER TABLE public.loans ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
END $$;
