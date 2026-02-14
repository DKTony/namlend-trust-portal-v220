-- Notification System Migration
-- Creates tables and functions for multi-channel notifications

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject_template TEXT, -- For email subject
  body_template TEXT NOT NULL, -- Template with {{variable}} placeholders
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'], -- 'in_app', 'sms', 'email', 'whatsapp', 'push'
  category TEXT NOT NULL DEFAULT 'general', -- 'loan', 'payment', 'kyc', 'account', 'marketing'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'in_app', 'sms', 'email', 'whatsapp', 'push'
  category TEXT NOT NULL, -- 'loan', 'payment', 'kyc', 'account', 'marketing'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, channel, category)
);

-- Notification queue for outbound notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  channel TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In-app notifications (user-visible)
-- Note: notifications table may already exist from earlier migration
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  action_url TEXT, -- Deep link to relevant page
  action_label TEXT, -- Button text like "View Loan", "Make Payment"
  metadata JSONB DEFAULT '{}', -- Additional data like loan_id, payment_id
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Auto-dismiss after this time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to existing notifications table if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read_at') THEN
    ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title') THEN
    ALTER TABLE public.notifications ADD COLUMN title TEXT;
    UPDATE public.notifications SET title = COALESCE(type, 'Notification') WHERE title IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE public.notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE public.notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_label') THEN
    ALTER TABLE public.notifications ADD COLUMN action_label TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'expires_at') THEN
    ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending 
  ON notification_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_user 
  ON notification_queue(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON notification_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can read active templates"
  ON notification_templates FOR SELECT
  USING (is_active = true);

-- System can manage queue (via service role)
CREATE POLICY "System can manage queue"
  ON notification_queue FOR ALL
  USING (true);

-- Function to create in-app notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'general',
  p_priority TEXT DEFAULT 'normal',
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, title, message, category, priority,
    action_url, action_label, metadata
  )
  VALUES (
    p_user_id, p_title, p_message, p_category, p_priority,
    p_action_url, p_action_label, p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = auth.uid() AND is_read = false;
  
  RETURN v_count;
END;
$$;

-- Function to queue a notification for sending
CREATE OR REPLACE FUNCTION queue_notification(
  p_user_id UUID,
  p_template_code TEXT,
  p_data JSONB DEFAULT '{}',
  p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template notification_templates%ROWTYPE;
  v_channel TEXT;
  v_pref_enabled BOOLEAN;
  v_queue_id UUID;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM notification_templates
  WHERE code = p_template_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_code;
  END IF;
  
  -- Queue for each channel
  FOREACH v_channel IN ARRAY v_template.channels
  LOOP
    -- Check user preference
    SELECT enabled INTO v_pref_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id 
      AND channel = v_channel 
      AND category = v_template.category;
    
    -- Default to enabled if no preference set
    IF v_pref_enabled IS NULL OR v_pref_enabled THEN
      INSERT INTO notification_queue (
        user_id, template_code, channel, data, scheduled_at
      )
      VALUES (
        p_user_id, p_template_code, v_channel, p_data, p_scheduled_at
      )
      RETURNING id INTO v_queue_id;
      
      -- If in_app channel, also create the notification immediately
      IF v_channel = 'in_app' THEN
        PERFORM create_notification(
          p_user_id,
          COALESCE(v_template.subject_template, v_template.name),
          v_template.body_template,
          v_template.category,
          'normal',
          p_data->>'action_url',
          p_data->>'action_label',
          p_data
        );
      END IF;
      
      RETURN NEXT v_queue_id;
    END IF;
  END LOOP;
END;
$$;

-- Insert default notification templates
INSERT INTO notification_templates (code, name, description, subject_template, body_template, channels, category) VALUES
  ('LOAN_SUBMITTED', 'Loan Application Submitted', 'Sent when a loan application is submitted', 
   'Your loan application has been received', 
   'Thank you for applying for a loan of N$ {{amount}}. Your application #{{loan_id}} is now being processed. We will notify you once a decision has been made.',
   ARRAY['in_app', 'email', 'sms'], 'loan'),
   
  ('LOAN_UNDER_REVIEW', 'Loan Under Review', 'Sent when loan moves to review stage',
   'Your loan application is under review',
   'Good news! Your loan application #{{loan_id}} is now being reviewed by our team. You can expect a decision within 24-48 hours.',
   ARRAY['in_app', 'email'], 'loan'),
   
  ('LOAN_APPROVED', 'Loan Approved', 'Sent when a loan is approved',
   'Congratulations! Your loan has been approved',
   'Great news! Your loan application #{{loan_id}} for N$ {{amount}} has been approved. The funds will be disbursed to your account shortly.',
   ARRAY['in_app', 'email', 'sms'], 'loan'),
   
  ('LOAN_REJECTED', 'Loan Rejected', 'Sent when a loan is rejected',
   'Update on your loan application',
   'We regret to inform you that your loan application #{{loan_id}} could not be approved at this time. Reason: {{reason}}. You may reapply after addressing the concerns.',
   ARRAY['in_app', 'email'], 'loan'),
   
  ('LOAN_DISBURSED', 'Loan Disbursed', 'Sent when funds are disbursed',
   'Your loan funds have been sent',
   'Your loan of N$ {{amount}} (Ref: {{payment_reference}}) has been disbursed via {{payment_method}}. The funds should reflect in your account within 1-2 business days.',
   ARRAY['in_app', 'email', 'sms'], 'loan'),
   
  ('PAYMENT_DUE_7_DAYS', 'Payment Due in 7 Days', 'Reminder 7 days before due date',
   'Payment reminder: Due in 7 days',
   'Reminder: Your loan payment of N$ {{amount}} is due on {{due_date}}. Please ensure you have sufficient funds available.',
   ARRAY['sms'], 'payment'),
   
  ('PAYMENT_DUE_3_DAYS', 'Payment Due in 3 Days', 'Reminder 3 days before due date',
   'Payment reminder: Due in 3 days',
   'Your loan payment of N$ {{amount}} is due in 3 days ({{due_date}}). Make your payment now to avoid late fees.',
   ARRAY['in_app', 'sms'], 'payment'),
   
  ('PAYMENT_DUE_1_DAY', 'Payment Due Tomorrow', 'Reminder 1 day before due date',
   'Payment due tomorrow',
   'Your loan payment of N$ {{amount}} is due TOMORROW ({{due_date}}). Pay now: {{payment_link}}',
   ARRAY['in_app', 'sms', 'whatsapp'], 'payment'),
   
  ('PAYMENT_OVERDUE', 'Payment Overdue', 'Sent when payment is overdue',
   'Urgent: Payment overdue',
   'Your loan payment of N$ {{amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue. A late fee of N$ {{late_fee}} may apply. Please pay immediately to avoid further charges.',
   ARRAY['in_app', 'email', 'sms', 'whatsapp'], 'payment'),
   
  ('PAYMENT_RECEIVED', 'Payment Received', 'Confirmation of payment',
   'Payment received - Thank you!',
   'We have received your payment of N$ {{amount}} for loan #{{loan_id}}. Reference: {{payment_reference}}. Your next payment of N$ {{next_amount}} is due on {{next_due_date}}.',
   ARRAY['in_app', 'sms'], 'payment'),
   
  ('LOAN_COMPLETED', 'Loan Fully Paid', 'Sent when loan is fully paid off',
   'Congratulations! Loan fully paid',
   'Congratulations! You have successfully paid off your loan #{{loan_id}}. Thank you for being a valued customer. Need another loan? Apply now!',
   ARRAY['in_app', 'email', 'sms'], 'loan'),
   
  ('KYC_APPROVED', 'KYC Approved', 'KYC documents approved',
   'KYC verification complete',
   'Your identity verification has been approved. You can now apply for loans up to N$ {{loan_limit}}.',
   ARRAY['in_app', 'email'], 'kyc'),
   
  ('KYC_REJECTED', 'KYC Rejected', 'KYC documents rejected',
   'Action required: KYC documents',
   'Unfortunately, we could not verify your identity with the documents provided. Reason: {{reason}}. Please upload new documents.',
   ARRAY['in_app', 'email'], 'kyc')
ON CONFLICT (code) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION queue_notification TO authenticated;
