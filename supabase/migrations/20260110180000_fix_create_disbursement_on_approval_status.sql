-- ============================================================================
-- Fix create_disbursement_on_approval RPC - Status Consistency
-- Version: 1.0.0
-- Created: January 10, 2026
-- Description: Updates the create_disbursement_on_approval RPC to create 
--              disbursements with 'approved' status instead of 'pending'
--              to maintain consistency with initiate_ips_disbursement expectations
-- ============================================================================

-- CONTEXT:
-- The initiate_ips_disbursement RPC expects disbursements to be in 'approved' status
-- but create_disbursement_on_approval was creating them with 'pending' status.
-- This caused IPS disbursements to fail with "Disbursement not found or not in approved status"

-- State machine alignment:
-- Loan Approval → create_disbursement_on_approval → status = 'approved'
-- IPS Initiation → initiate_ips_disbursement → expects status = 'approved' → status = 'processing'
-- IPS Completion → complete_ips_transaction → status = 'completed'

-- ============================================================================
-- 1. CREATE OR REPLACE THE RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_disbursement_on_approval(p_loan_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_loan RECORD;
  v_disbursement_id UUID;
  v_reference TEXT;
  v_existing_disbursement UUID;
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
      'error', 'Unauthorized: Only admin or loan_officer can create disbursements'
    );
  END IF;
  
  -- Get loan details
  SELECT * INTO v_loan
  FROM loans
  WHERE id = p_loan_id
  AND status IN ('approved', 'pending_disbursement');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Loan not found or not in approved/pending_disbursement status'
    );
  END IF;
  
  -- Check for existing disbursement (idempotency)
  SELECT id INTO v_existing_disbursement
  FROM disbursements
  WHERE loan_id = p_loan_id
  AND status NOT IN ('failed', 'cancelled')
  LIMIT 1;
  
  IF v_existing_disbursement IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'disbursement_id', v_existing_disbursement,
      'loan_id', p_loan_id,
      'message', 'Disbursement already exists for this loan'
    );
  END IF;
  
  -- Generate unique reference
  v_reference := 'DISB-' || to_char(NOW(), 'YYYYMMDD') || '-' || 
                 substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  
  -- Create disbursement with 'approved' status (FIXED: was 'pending')
  -- This ensures compatibility with initiate_ips_disbursement which expects 'approved'
  INSERT INTO disbursements (
    loan_id,
    amount,
    status,
    reference,
    scheduled_at,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_loan_id,
    v_loan.amount,
    'approved',  -- CRITICAL: Changed from 'pending' to 'approved'
    v_reference,
    NOW() + INTERVAL '1 day',
    v_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_disbursement_id;
  
  -- Create audit trail
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    new_values
  ) VALUES (
    v_user_id,
    'create_disbursement_on_approval',
    'disbursements',
    v_disbursement_id,
    jsonb_build_object(
      'loan_id', p_loan_id,
      'amount', v_loan.amount,
      'status', 'approved',
      'reference', v_reference,
      'note', 'Disbursement created with approved status for IPS compatibility'
    )
  );
  
  -- Log state transition
  INSERT INTO state_transitions (
    entity_type,
    entity_id,
    from_state,
    to_state,
    transition_reason,
    triggered_by,
    metadata
  ) VALUES (
    'disbursement',
    v_disbursement_id,
    NULL,
    'approved',
    'Disbursement created on loan approval',
    v_user_id::text,
    jsonb_build_object('loan_id', p_loan_id, 'amount', v_loan.amount)
  );
  
  RETURN json_build_object(
    'success', true,
    'disbursement_id', v_disbursement_id,
    'loan_id', p_loan_id,
    'amount', v_loan.amount,
    'status', 'approved',
    'reference', v_reference,
    'message', 'Disbursement created successfully with approved status'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_disbursement_on_approval(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_disbursement_on_approval IS 
'Creates a disbursement record when a loan is approved. 
Status is set to ''approved'' (not ''pending'') for compatibility with IPS disbursement flow.
This function is idempotent - calling it multiple times for the same loan returns the existing disbursement.';

-- ============================================================================
-- 2. FIX EXISTING STUCK DISBURSEMENTS
-- ============================================================================

-- Update any pending disbursements for approved loans to approved status
-- This fixes historical data created before this fix
UPDATE disbursements d
SET 
  status = 'approved',
  updated_at = NOW()
FROM loans l
WHERE d.loan_id = l.id
  AND l.status = 'approved'
  AND d.status = 'pending';

-- Log the fix for audit purposes
DO $$
DECLARE
  v_fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  
  IF v_fixed_count > 0 THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      new_values
    ) VALUES (
      NULL,  -- System action
      'migration_fix_disbursement_status',
      'disbursements',
      NULL,
      jsonb_build_object(
        'migration', '20260110180000_fix_create_disbursement_on_approval_status',
        'fixed_count', v_fixed_count,
        'description', 'Updated pending disbursements for approved loans to approved status'
      )
    );
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this change:
-- 1. Restore the original function with 'pending' status (not recommended)
-- 2. The state machine expects 'approved' for IPS compatibility
-- 3. Do not rollback unless you also update initiate_ips_disbursement to accept 'pending'
