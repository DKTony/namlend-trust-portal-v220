-- Migration: 20260108050100_fix_create_payment_idempotency
-- Purpose: Add unique_violation (23505) exception handler for true idempotency under concurrent requests
-- When two concurrent requests race past the pre-check, the unique index throws 23505
-- This fix catches that and returns the existing payment instead of an error

CREATE OR REPLACE FUNCTION public.create_payment(
  p_loan_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_processing_fee NUMERIC DEFAULT 25.00,
  p_idempotency_key VARCHAR(64) DEFAULT NULL,
  p_payer_vpa VARCHAR(100) DEFAULT NULL,
  p_payment_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_payment_id UUID;
  v_reference_number TEXT;
  v_loan_record RECORD;
  v_existing_payment RECORD;
  v_result JSONB;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check idempotency - return existing payment if key matches
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, reference_number, status, amount, processing_fee
    INTO v_existing_payment
    FROM public.payments
    WHERE idempotency_key = p_idempotency_key;
    
    IF v_existing_payment.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_existing_payment.id,
        'reference_number', v_existing_payment.reference_number,
        'status', v_existing_payment.status,
        'amount', v_existing_payment.amount,
        'processing_fee', v_existing_payment.processing_fee,
        'total_amount', v_existing_payment.amount + COALESCE(v_existing_payment.processing_fee, 0),
        'idempotent', true,
        'message', 'Payment already exists with this idempotency key'
      );
    END IF;
  END IF;

  -- Validate loan exists and belongs to user
  SELECT id, user_id, status, outstanding_balance
  INTO v_loan_record
  FROM public.loans
  WHERE id = p_loan_id;
  
  IF v_loan_record IS NULL THEN
    RAISE EXCEPTION 'Loan not found: %', p_loan_id;
  END IF;
  
  IF v_loan_record.user_id != v_user_id THEN
    -- Check if user has admin/loan_officer role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_user_id 
      AND role IN ('admin', 'loan_officer')
    ) THEN
      RAISE EXCEPTION 'Unauthorized: loan does not belong to user';
    END IF;
  END IF;
  
  -- Validate loan status
  IF v_loan_record.status NOT IN ('active', 'disbursed', 'approved') THEN
    RAISE EXCEPTION 'Cannot make payment on loan with status: %', v_loan_record.status;
  END IF;
  
  -- Validate payment method
  IF p_payment_method NOT IN ('bank_transfer', 'mobile_money', 'cash', 'debit_order', 'ips') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
  END IF;
  
  IF p_processing_fee < 0 THEN
    RAISE EXCEPTION 'Processing fee cannot be negative';
  END IF;

  -- Generate reference number
  v_reference_number := 'PAY' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || 
                        LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

  -- Attempt to create payment record with fee
  -- Use BEGIN/EXCEPTION block to handle concurrent unique_violation
  BEGIN
    INSERT INTO public.payments (
      loan_id,
      amount,
      processing_fee,
      payment_method,
      status,
      reference_number,
      idempotency_key,
      payer_vpa,
      payment_notes,
      created_at
    ) VALUES (
      p_loan_id,
      p_amount,
      p_processing_fee,
      p_payment_method,
      'pending',
      v_reference_number,
      p_idempotency_key,
      p_payer_vpa,
      p_payment_notes,
      NOW()
    )
    RETURNING id INTO v_payment_id;
    
  EXCEPTION WHEN unique_violation THEN
    -- 23505: Another concurrent request won the race
    -- Re-fetch the existing payment and return it (true idempotency)
    IF p_idempotency_key IS NOT NULL THEN
      SELECT id, reference_number, status, amount, processing_fee
      INTO v_existing_payment
      FROM public.payments
      WHERE idempotency_key = p_idempotency_key;
      
      IF v_existing_payment.id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'success', true,
          'payment_id', v_existing_payment.id,
          'reference_number', v_existing_payment.reference_number,
          'status', v_existing_payment.status,
          'amount', v_existing_payment.amount,
          'processing_fee', v_existing_payment.processing_fee,
          'total_amount', v_existing_payment.amount + COALESCE(v_existing_payment.processing_fee, 0),
          'idempotent', true,
          'message', 'Payment already exists (concurrent request resolved)'
        );
      END IF;
    END IF;
    -- If we can't find the payment, re-raise the exception
    RAISE;
  END;

  -- Log to audit trail
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    v_user_id,
    'create_payment',
    'payments',
    v_payment_id,
    NULL,
    jsonb_build_object(
      'loan_id', p_loan_id,
      'amount', p_amount,
      'processing_fee', p_processing_fee,
      'total_amount', p_amount + p_processing_fee,
      'payment_method', p_payment_method,
      'reference_number', v_reference_number
    ),
    NOW()
  );

  -- Queue TigerBeetle ledger event via outbox pattern
  INSERT INTO public.tigerbeetle_outbox (
    event_type,
    source_table,
    source_id,
    payload,
    status,
    created_at,
    updated_at
  ) VALUES (
    'payment_initiated',
    'payments',
    v_payment_id,
    jsonb_build_object(
      'payment_id', v_payment_id,
      'loan_id', p_loan_id,
      'user_id', v_user_id,
      'amount', p_amount,
      'processing_fee', p_processing_fee,
      'total_amount', p_amount + p_processing_fee,
      'payment_method', p_payment_method,
      'reference_number', v_reference_number,
      'currency', 'NAD',
      'ledger_id', 1
    ),
    'pending',
    NOW(),
    NOW()
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'reference_number', v_reference_number,
    'amount', p_amount,
    'processing_fee', p_processing_fee,
    'total_amount', p_amount + p_processing_fee,
    'status', 'pending',
    'idempotent', false,
    'message', 'Payment initiated successfully'
  );

  RETURN v_result;
END;
$$;

-- Update comment to document idempotency behavior
COMMENT ON FUNCTION public.create_payment IS 
'Creates a payment record with proper audit trail, TigerBeetle ledger event, and processing fee.
Supports true idempotency via idempotency_key parameter:
- Pre-check returns existing payment if idempotency key matches
- Handles concurrent race conditions (23505 unique_violation) by returning existing payment
- Always returns success with idempotent=true flag when returning existing payment';
