-- Collections System Migration
-- Creates tables and functions for collections management, promise-to-pay, and payment reminders

-- Promise to Pay tracking
CREATE TABLE IF NOT EXISTS promise_to_pay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promised_amount DECIMAL(12,2) NOT NULL,
  promised_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'kept', 'broken', 'cancelled')),
  notes TEXT,
  follow_up_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Collections interaction log
CREATE TABLE IF NOT EXISTS collections_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'sms', 'email', 'whatsapp', 'visit', 'note', 'system')),
  outcome TEXT CHECK (outcome IN ('contacted', 'no_answer', 'promised', 'refused', 'wrong_number', 'callback_requested', 'paid', 'escalated', 'other')),
  notes TEXT,
  next_action TEXT,
  next_action_date DATE,
  call_duration_seconds INTEGER,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment reminder schedule
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_schedule_id UUID, -- References payment_schedules if exists
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_7_days', 'due_3_days', 'due_1_day', 'due_today', 'overdue_1_day', 'overdue_3_days', 'overdue_7_days', 'overdue_14_days', 'overdue_30_days', 'custom')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME DEFAULT '09:00:00',
  channels TEXT[] NOT NULL DEFAULT ARRAY['sms'],
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled', 'skipped')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  amount_due DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reschedule requests from clients
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_due_date DATE NOT NULL,
  requested_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ptp_loan_status ON promise_to_pay(loan_id, status);
CREATE INDEX IF NOT EXISTS idx_ptp_promised_date ON promise_to_pay(promised_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_collections_loan ON collections_interactions(loan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_next_action ON collections_interactions(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON payment_reminders(scheduled_date, status) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_reminders_loan ON payment_reminders(loan_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_status ON reschedule_requests(status, created_at DESC);

-- Collections queue view with risk buckets
CREATE OR REPLACE VIEW collections_queue AS
SELECT 
  l.id as loan_id,
  l.user_id,
  p.first_name,
  p.last_name,
  p.phone_number,
  p.email,
  l.amount as loan_amount,
  l.monthly_payment,
  l.status as loan_status,
  l.created_at as loan_created_at,
  -- Calculate days overdue (simplified - would need payment_schedules in production)
  CASE 
    WHEN l.status = 'active' THEN 
      GREATEST(0, EXTRACT(DAY FROM NOW() - (l.disbursed_at + INTERVAL '30 days'))::INTEGER)
    ELSE 0
  END as days_overdue,
  -- Risk bucket assignment
  CASE 
    WHEN l.status != 'active' THEN 'not_applicable'
    WHEN EXTRACT(DAY FROM NOW() - (l.disbursed_at + INTERVAL '30 days'))::INTEGER <= 0 THEN 'current'
    WHEN EXTRACT(DAY FROM NOW() - (l.disbursed_at + INTERVAL '30 days'))::INTEGER <= 30 THEN 'bucket_1_30'
    WHEN EXTRACT(DAY FROM NOW() - (l.disbursed_at + INTERVAL '30 days'))::INTEGER <= 60 THEN 'bucket_31_60'
    WHEN EXTRACT(DAY FROM NOW() - (l.disbursed_at + INTERVAL '30 days'))::INTEGER <= 90 THEN 'bucket_61_90'
    ELSE 'bucket_90_plus'
  END as risk_bucket,
  -- Last contact info
  (SELECT MAX(created_at) FROM collections_interactions ci WHERE ci.loan_id = l.id) as last_contact_date,
  (SELECT interaction_type FROM collections_interactions ci WHERE ci.loan_id = l.id ORDER BY created_at DESC LIMIT 1) as last_contact_type,
  -- Promise to pay info
  (SELECT COUNT(*) FROM promise_to_pay ptp WHERE ptp.loan_id = l.id AND ptp.status = 'pending') as pending_promises,
  (SELECT promised_date FROM promise_to_pay ptp WHERE ptp.loan_id = l.id AND ptp.status = 'pending' ORDER BY promised_date ASC LIMIT 1) as next_promise_date,
  -- Contact attempts count
  (SELECT COUNT(*) FROM collections_interactions ci WHERE ci.loan_id = l.id AND ci.created_at > NOW() - INTERVAL '7 days') as contact_attempts_7_days
FROM loans l
JOIN profiles p ON l.user_id = p.user_id
WHERE l.status IN ('active', 'disbursed');

-- RLS Policies
ALTER TABLE promise_to_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

-- Promise to Pay policies
CREATE POLICY "Admins and loan officers can view all PTP"
  ON promise_to_pay FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

CREATE POLICY "Admins and loan officers can create PTP"
  ON promise_to_pay FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

CREATE POLICY "Admins and loan officers can update PTP"
  ON promise_to_pay FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

CREATE POLICY "Clients can view own PTP"
  ON promise_to_pay FOR SELECT
  USING (user_id = auth.uid());

-- Collections interactions policies
CREATE POLICY "Admins and loan officers can manage interactions"
  ON collections_interactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

CREATE POLICY "Clients can view own interactions"
  ON collections_interactions FOR SELECT
  USING (user_id = auth.uid());

-- Payment reminders policies
CREATE POLICY "Admins can manage all reminders"
  ON payment_reminders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can view own reminders"
  ON payment_reminders FOR SELECT
  USING (user_id = auth.uid());

-- Reschedule requests policies
CREATE POLICY "Admins and loan officers can manage reschedule requests"
  ON reschedule_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer')
    )
  );

CREATE POLICY "Clients can view own reschedule requests"
  ON reschedule_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Clients can create reschedule requests"
  ON reschedule_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to create a promise to pay
CREATE OR REPLACE FUNCTION create_promise_to_pay(
  p_loan_id UUID,
  p_promised_amount DECIMAL,
  p_promised_date DATE,
  p_notes TEXT DEFAULT NULL,
  p_follow_up_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ptp_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the loan's user_id
  SELECT user_id INTO v_user_id FROM loans WHERE id = p_loan_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Loan not found';
  END IF;
  
  INSERT INTO promise_to_pay (
    loan_id, user_id, promised_amount, promised_date, notes, follow_up_date, created_by
  )
  VALUES (
    p_loan_id, v_user_id, p_promised_amount, p_promised_date, p_notes, p_follow_up_date, auth.uid()
  )
  RETURNING id INTO v_ptp_id;
  
  -- Log the interaction
  INSERT INTO collections_interactions (
    loan_id, user_id, interaction_type, outcome, notes, next_action, next_action_date, created_by
  )
  VALUES (
    p_loan_id, v_user_id, 'note', 'promised', 
    'Promise to pay created: ' || p_promised_amount || ' on ' || p_promised_date,
    'Follow up on promise', COALESCE(p_follow_up_date, p_promised_date + 1),
    auth.uid()
  );
  
  RETURN v_ptp_id;
END;
$$;

-- Function to resolve a promise to pay
CREATE OR REPLACE FUNCTION resolve_promise_to_pay(
  p_ptp_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ptp promise_to_pay%ROWTYPE;
BEGIN
  SELECT * INTO v_ptp FROM promise_to_pay WHERE id = p_ptp_id;
  
  IF v_ptp.id IS NULL THEN
    RAISE EXCEPTION 'Promise to pay not found';
  END IF;
  
  IF v_ptp.status != 'pending' THEN
    RAISE EXCEPTION 'Promise to pay is not pending';
  END IF;
  
  UPDATE promise_to_pay
  SET status = p_status,
      notes = COALESCE(p_notes, notes),
      resolved_at = NOW(),
      resolved_by = auth.uid()
  WHERE id = p_ptp_id;
  
  -- Log the resolution
  INSERT INTO collections_interactions (
    loan_id, user_id, interaction_type, outcome, notes, created_by
  )
  VALUES (
    v_ptp.loan_id, v_ptp.user_id, 'note',
    CASE p_status WHEN 'kept' THEN 'paid' ELSE 'other' END,
    'Promise to pay ' || p_status || ': ' || COALESCE(p_notes, ''),
    auth.uid()
  );
  
  RETURN true;
END;
$$;

-- Function to log a collections interaction
CREATE OR REPLACE FUNCTION log_collections_interaction(
  p_loan_id UUID,
  p_interaction_type TEXT,
  p_outcome TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_next_action TEXT DEFAULT NULL,
  p_next_action_date DATE DEFAULT NULL,
  p_call_duration INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interaction_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the loan's user_id
  SELECT user_id INTO v_user_id FROM loans WHERE id = p_loan_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Loan not found';
  END IF;
  
  INSERT INTO collections_interactions (
    loan_id, user_id, interaction_type, outcome, notes, 
    next_action, next_action_date, call_duration_seconds, created_by
  )
  VALUES (
    p_loan_id, v_user_id, p_interaction_type, p_outcome, p_notes,
    p_next_action, p_next_action_date, p_call_duration, auth.uid()
  )
  RETURNING id INTO v_interaction_id;
  
  RETURN v_interaction_id;
END;
$$;

-- Function to create a reschedule request (for clients)
CREATE OR REPLACE FUNCTION request_payment_reschedule(
  p_loan_id UUID,
  p_original_due_date DATE,
  p_requested_date DATE,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_loan_user_id UUID;
BEGIN
  -- Verify the user owns this loan
  SELECT user_id INTO v_loan_user_id FROM loans WHERE id = p_loan_id;
  
  IF v_loan_user_id IS NULL OR v_loan_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You can only reschedule your own loans';
  END IF;
  
  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM reschedule_requests 
    WHERE loan_id = p_loan_id 
    AND original_due_date = p_original_due_date 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending reschedule request already exists for this payment';
  END IF;
  
  INSERT INTO reschedule_requests (
    loan_id, user_id, original_due_date, requested_date, reason
  )
  VALUES (
    p_loan_id, auth.uid(), p_original_due_date, p_requested_date, p_reason
  )
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Function to process a reschedule request (for admins)
CREATE OR REPLACE FUNCTION process_reschedule_request(
  p_request_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request reschedule_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM reschedule_requests WHERE id = p_request_id;
  
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Reschedule request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;
  
  UPDATE reschedule_requests
  SET status = p_status,
      admin_notes = p_admin_notes,
      processed_by = auth.uid(),
      processed_at = NOW()
  WHERE id = p_request_id;
  
  -- TODO: If approved, update the payment schedule
  
  RETURN true;
END;
$$;

-- Function to get collections statistics
CREATE OR REPLACE FUNCTION get_collections_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_overdue', (SELECT COUNT(*) FROM collections_queue WHERE risk_bucket != 'current' AND risk_bucket != 'not_applicable'),
    'bucket_1_30', (SELECT COUNT(*) FROM collections_queue WHERE risk_bucket = 'bucket_1_30'),
    'bucket_31_60', (SELECT COUNT(*) FROM collections_queue WHERE risk_bucket = 'bucket_31_60'),
    'bucket_61_90', (SELECT COUNT(*) FROM collections_queue WHERE risk_bucket = 'bucket_61_90'),
    'bucket_90_plus', (SELECT COUNT(*) FROM collections_queue WHERE risk_bucket = 'bucket_90_plus'),
    'pending_promises', (SELECT COUNT(*) FROM promise_to_pay WHERE status = 'pending'),
    'promises_due_today', (SELECT COUNT(*) FROM promise_to_pay WHERE status = 'pending' AND promised_date = CURRENT_DATE),
    'contacts_today', (SELECT COUNT(*) FROM collections_interactions WHERE created_at::DATE = CURRENT_DATE),
    'pending_reschedules', (SELECT COUNT(*) FROM reschedule_requests WHERE status = 'pending')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_promise_to_pay TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_promise_to_pay TO authenticated;
GRANT EXECUTE ON FUNCTION log_collections_interaction TO authenticated;
GRANT EXECUTE ON FUNCTION request_payment_reschedule TO authenticated;
GRANT EXECUTE ON FUNCTION process_reschedule_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_collections_stats TO authenticated;

-- Grant select on the view
GRANT SELECT ON collections_queue TO authenticated;
