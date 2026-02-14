-- Migration: Fix approval RPC race condition with 23505 handler
-- Description: Add explicit unique_violation (23505) exception handler to process_approval_transaction
--              to handle concurrent calls gracefully with idempotent response
-- Created: 2026-01-08

-- Drop and recreate the function with proper 23505 handling
CREATE OR REPLACE FUNCTION public.process_approval_transaction(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_loan_id uuid;
  v_existing_loan RECORD;
  v_error_msg TEXT;
  v_user_role TEXT;
BEGIN
  -- Verify caller is authorized (admin or loan_officer)
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role IN ('admin', 'loan_officer', 'approver')
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Unauthorized: Only admins, loan officers, or approvers can process approvals'
    );
  END IF;

  -- Get the approval request
  SELECT ar.*, ar.user_id, ar.request_type, ar.request_data
  INTO v_request
  FROM public.approval_requests ar
  WHERE ar.id = p_request_id;

  IF v_request IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Approval request not found'
    );
  END IF;

  -- Only process loan applications
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

    -- RACE CONDITION FIX: Handle unique_violation (23505) for concurrent calls
    EXCEPTION 
      WHEN unique_violation THEN
        -- Another concurrent call already created the loan - return idempotent success
        SELECT id, amount, term_months, interest_rate, monthly_payment, status, created_at
        INTO v_existing_loan
        FROM public.loans 
        WHERE approval_request_id = p_request_id;
        
        IF v_existing_loan.id IS NOT NULL THEN
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
            'message', 'Loan already created by concurrent request'
          );
        ELSE
          -- Unexpected: unique violation but no loan found
          RETURN json_build_object(
            'success', false,
            'error', 'Concurrent modification detected, please retry'
          );
        END IF;
      
      WHEN OTHERS THEN
        -- Capture any other errors during loan creation
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RETURN json_build_object(
          'success', false,
          'error', format('Failed to create loan: %s', v_error_msg)
        );
    END;
  END;

END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.process_approval_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_approval_transaction(uuid) TO service_role;

COMMENT ON FUNCTION public.process_approval_transaction IS 
  'Processes an approved loan application and creates the loan record. 
   Includes idempotency protection and race condition handling (23505).
   Updated 2026-01-08 to fix concurrent call race condition.';
