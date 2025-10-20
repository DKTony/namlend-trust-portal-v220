-- Update complete_disbursement RPC to include payment_method parameter
-- This ensures backoffice disbursements use the same payment methods as client payments

CREATE OR REPLACE FUNCTION complete_disbursement(
  p_disbursement_id UUID,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_disbursement RECORD;
  v_loan RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: No active session'
    );
  END IF;
  
  -- Check role (admin or loan_officer only)
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_user_role NOT IN ('admin', 'loan_officer') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admin or loan_officer can complete disbursements'
    );
  END IF;
  
  -- Validate payment method
  IF p_payment_method NOT IN ('bank_transfer', 'mobile_money', 'cash', 'debit_order') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid payment method. Must be: bank_transfer, mobile_money, cash, or debit_order'
    );
  END IF;
  
  -- Get disbursement details
  SELECT * INTO v_disbursement
  FROM disbursements
  WHERE id = p_disbursement_id
  AND status IN ('pending', 'approved', 'processing');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Disbursement not found or already completed/failed'
    );
  END IF;
  
  -- Get associated loan
  SELECT * INTO v_loan
  FROM loans
  WHERE id = v_disbursement.loan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Associated loan not found'
    );
  END IF;
  
  -- Update disbursement record
  UPDATE disbursements
  SET 
    status = 'completed',
    method = p_payment_method,
    payment_reference = p_payment_reference,
    processing_notes = COALESCE(p_notes, processing_notes),
    processed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_disbursement_id;
  
  -- Update loan status and disbursed_at
  UPDATE loans
  SET 
    disbursed_at = NOW(),
    status = 'disbursed',
    updated_at = NOW()
  WHERE id = v_disbursement.loan_id;
  
  -- Create audit trail
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_user_id,
    'complete_disbursement',
    'disbursement',
    p_disbursement_id,
    jsonb_build_object(
      'disbursement_id', p_disbursement_id,
      'loan_id', v_disbursement.loan_id,
      'amount', v_disbursement.amount,
      'payment_method', p_payment_method,
      'payment_reference', p_payment_reference,
      'client_id', v_loan.user_id
    )
  );
  
  RETURN json_build_object(
    'success', true,
    'disbursement_id', p_disbursement_id,
    'loan_id', v_disbursement.loan_id,
    'amount', v_disbursement.amount,
    'status', 'completed',
    'payment_method', p_payment_method,
    'payment_reference', p_payment_reference,
    'message', 'Disbursement completed successfully'
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION complete_disbursement IS 'Complete a disbursement with payment method and reference. Updates loan status to disbursed and creates audit trail.';
