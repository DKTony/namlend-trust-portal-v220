-- =====================================================
-- Front Office Integrations Migration
-- Adds tables and functions for:
-- 1. Notification System
-- 2. Credit Scoring
-- 3. Payment Gateway Logging
-- 4. SMS/WhatsApp Communication Logs
-- =====================================================

-- =====================================================
-- 1. NOTIFICATION SYSTEM
-- =====================================================

-- Notification Templates (for reusable notification content)
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('loan', 'payment', 'kyc', 'account', 'general', 'marketing', 'collections')),
    channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
    subject VARCHAR(200),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    variables TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (in-app notifications for users)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('loan', 'payment', 'kyc', 'account', 'general', 'marketing', 'collections')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    metadata JSONB DEFAULT '{}'::JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences (user channel preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'sms', 'email', 'whatsapp', 'push')),
    category VARCHAR(30) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel, category)
);

-- Notification Queue (for async processing of SMS/Email/WhatsApp)
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp', 'push')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    template_code VARCHAR(50),
    template_data JSONB DEFAULT '{}'::JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    provider_message_id VARCHAR(255),
    provider_response JSONB,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_channel ON notification_queue(channel, status);

-- =====================================================
-- 2. CREDIT SCORING SYSTEM
-- =====================================================

-- Credit Scores (historical credit score records)
CREATE TABLE IF NOT EXISTS credit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    score_range VARCHAR(20) NOT NULL CHECK (score_range IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
    debt_to_income_ratio DECIMAL(5,2),
    affordability_score DECIMAL(5,2),
    max_approved_amount DECIMAL(15,2),
    suggested_interest_rate DECIMAL(5,2),
    factors JSONB DEFAULT '[]'::JSONB,
    recommendations TEXT[],
    input_data JSONB DEFAULT '{}'::JSONB,
    calculated_by VARCHAR(50) DEFAULT 'system',
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Score Factors (detailed breakdown)
CREATE TABLE IF NOT EXISTS credit_score_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_score_id UUID NOT NULL REFERENCES credit_scores(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    factor VARCHAR(100) NOT NULL,
    impact VARCHAR(20) NOT NULL CHECK (impact IN ('positive', 'negative', 'neutral')),
    weight INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for credit scores
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_loan_id ON credit_scores(loan_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_current ON credit_scores(user_id, is_current) WHERE is_current = true;

-- =====================================================
-- 3. PAYMENT GATEWAY LOGS
-- =====================================================

-- Payment Transactions (detailed payment tracking)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    reference_number VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NAD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_method VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    bank_account VARCHAR(50),
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    provider_request JSONB,
    provider_response JSONB,
    webhook_received_at TIMESTAMPTZ,
    webhook_data JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Webhooks (incoming webhook logs)
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    reference_number VARCHAR(100),
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    signature_valid BOOLEAN,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    processing_result JSONB,
    error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_loan_id ON payment_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_reference ON payment_webhooks(reference_number);

-- =====================================================
-- 4. COMMUNICATION LOGS (SMS/WhatsApp)
-- =====================================================

-- Communication Logs (all outbound communications)
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email', 'push', 'voice')),
    direction VARCHAR(10) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    recipient VARCHAR(255) NOT NULL,
    sender VARCHAR(255),
    subject VARCHAR(200),
    content TEXT NOT NULL,
    template_code VARCHAR(50),
    template_variables JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'rejected')),
    provider VARCHAR(50),
    provider_message_id VARCHAR(255),
    provider_status VARCHAR(50),
    cost DECIMAL(10,4),
    cost_currency VARCHAR(3) DEFAULT 'NAD',
    segments INTEGER DEFAULT 1,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Conversations (for tracking conversation state)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    wa_id VARCHAR(50),
    conversation_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
    last_message_at TIMESTAMPTZ,
    last_message_direction VARCHAR(10),
    context JSONB DEFAULT '{}'::JSONB,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for communication logs
CREATE INDEX IF NOT EXISTS idx_communication_logs_user_id ON communication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_loan_id ON communication_logs(loan_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_channel ON communication_logs(channel, status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_score_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Notification Templates (read by all, write by admin) - conditional creation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_templates' AND policyname = 'Anyone can read active templates') THEN
    CREATE POLICY "Anyone can read active templates" ON notification_templates FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_templates' AND policyname = 'Admins can manage templates') THEN
    CREATE POLICY "Admins can manage templates" ON notification_templates FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
  END IF;
  -- Notifications policies - conditional
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can read own notifications') THEN
    CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'System can insert notifications') THEN
    CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE POLICY "Admins can read all notifications" ON notifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Notification Preferences (users manage their own)
CREATE POLICY "Users can manage own preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Notification Queue (admin only)
CREATE POLICY "Admins can manage notification queue" ON notification_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
    );

-- Credit Scores (users can read own, admins can read all)
CREATE POLICY "Users can read own credit scores" ON credit_scores
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage credit scores" ON credit_scores
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
    );

-- Credit Score Factors (inherit from credit_scores)
CREATE POLICY "Users can read own score factors" ON credit_score_factors
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM credit_scores WHERE id = credit_score_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage score factors" ON credit_score_factors
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
    );

-- Payment Transactions (users can read own, admins all)
CREATE POLICY "Users can read own payment transactions" ON payment_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage payment transactions" ON payment_transactions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
    );

-- Payment Webhooks (admin only)
CREATE POLICY "Admins can manage webhooks" ON payment_webhooks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Communication Logs (users can read own, admins all)
CREATE POLICY "Users can read own communication logs" ON communication_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage communication logs" ON communication_logs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
    );

-- WhatsApp Conversations (users can read own, admins all)
CREATE POLICY "Users can read own conversations" ON whatsapp_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage conversations" ON whatsapp_conversations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'loan_officer'))
    );

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Function: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE user_id = auth.uid()
        AND is_read = false
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$;

-- Function: Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id
    AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Function: Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = auth.uid()
    AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Function: Queue notification from template
CREATE OR REPLACE FUNCTION queue_notification(
    p_user_id UUID,
    p_template_code VARCHAR(50),
    p_data JSONB DEFAULT '{}'::JSONB,
    p_scheduled_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template notification_templates%ROWTYPE;
    v_user_phone VARCHAR(20);
    v_user_email VARCHAR(255);
    v_channel TEXT;
    v_queue_ids UUID[] := ARRAY[]::UUID[];
    v_queue_id UUID;
    v_content TEXT;
BEGIN
    -- Get template
    SELECT * INTO v_template FROM notification_templates WHERE code = p_template_code AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_code;
    END IF;
    
    -- Get user contact info
    SELECT phone, email INTO v_user_phone, v_user_email
    FROM profiles WHERE user_id = p_user_id;
    
    -- Create in-app notification if channel includes it
    IF 'in_app' = ANY(v_template.channels) THEN
        INSERT INTO notifications (user_id, template_id, title, message, category, priority, action_url, action_label, metadata)
        VALUES (p_user_id, v_template.id, v_template.title, v_template.body, v_template.category, v_template.priority, v_template.action_url, v_template.action_label, p_data)
        RETURNING id INTO v_queue_id;
        v_queue_ids := array_append(v_queue_ids, v_queue_id);
    END IF;
    
    -- Queue other channels
    FOREACH v_channel IN ARRAY v_template.channels
    LOOP
        IF v_channel = 'sms' AND v_user_phone IS NOT NULL THEN
            INSERT INTO notification_queue (user_id, channel, recipient, subject, content, template_code, template_data, scheduled_at)
            VALUES (p_user_id, 'sms', v_user_phone, v_template.title, v_template.body, p_template_code, p_data, p_scheduled_at)
            RETURNING id INTO v_queue_id;
            v_queue_ids := array_append(v_queue_ids, v_queue_id);
        ELSIF v_channel = 'email' AND v_user_email IS NOT NULL THEN
            INSERT INTO notification_queue (user_id, channel, recipient, subject, content, template_code, template_data, scheduled_at)
            VALUES (p_user_id, 'email', v_user_email, v_template.subject, v_template.body, p_template_code, p_data, p_scheduled_at)
            RETURNING id INTO v_queue_id;
            v_queue_ids := array_append(v_queue_ids, v_queue_id);
        ELSIF v_channel = 'whatsapp' AND v_user_phone IS NOT NULL THEN
            INSERT INTO notification_queue (user_id, channel, recipient, subject, content, template_code, template_data, scheduled_at)
            VALUES (p_user_id, 'whatsapp', v_user_phone, v_template.title, v_template.body, p_template_code, p_data, p_scheduled_at)
            RETURNING id INTO v_queue_id;
            v_queue_ids := array_append(v_queue_ids, v_queue_id);
        END IF;
    END LOOP;
    
    RETURN v_queue_ids;
END;
$$;

-- Function: Calculate and store credit score
CREATE OR REPLACE FUNCTION calculate_credit_score(
    p_user_id UUID,
    p_loan_id UUID DEFAULT NULL,
    p_input_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_loan_count INTEGER;
    v_paid_count INTEGER;
    v_default_count INTEGER;
    v_late_count INTEGER;
    v_income_score INTEGER;
    v_dti_score INTEGER;
    v_employment_score INTEGER;
    v_history_score INTEGER;
    v_verification_score INTEGER;
    v_total_score INTEGER;
    v_credit_score INTEGER;
    v_score_range VARCHAR(20);
    v_risk_level VARCHAR(20);
    v_dti DECIMAL(5,2);
    v_max_amount DECIMAL(15,2);
    v_interest_rate DECIMAL(5,2);
    v_credit_score_id UUID;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Get loan history
    SELECT COUNT(*) INTO v_loan_count FROM loans WHERE user_id = p_user_id;
    SELECT COUNT(*) INTO v_paid_count FROM loans WHERE user_id = p_user_id AND status = 'completed';
    SELECT COUNT(*) INTO v_default_count FROM loans WHERE user_id = p_user_id AND status = 'defaulted';
    SELECT COUNT(*) INTO v_late_count FROM payments p 
        JOIN loans l ON p.loan_id = l.id 
        WHERE l.user_id = p_user_id AND p.status = 'late';
    
    -- Calculate income score (0-100)
    v_income_score := CASE 
        WHEN COALESCE(v_profile.monthly_income, 0) >= 20000 THEN 100
        WHEN COALESCE(v_profile.monthly_income, 0) >= 10000 THEN 80
        WHEN COALESCE(v_profile.monthly_income, 0) >= 5000 THEN 60
        WHEN COALESCE(v_profile.monthly_income, 0) >= 3000 THEN 40
        ELSE 20
    END;
    
    -- Calculate DTI score (0-100)
    v_dti := CASE WHEN COALESCE(v_profile.monthly_income, 0) > 0 
        THEN (COALESCE(v_profile.monthly_debt_payments, 0) / v_profile.monthly_income) * 100 
        ELSE 100 
    END;
    v_dti_score := CASE
        WHEN v_dti <= 20 THEN 100
        WHEN v_dti <= 30 THEN 80
        WHEN v_dti <= 40 THEN 50
        ELSE 20
    END;
    
    -- Calculate employment score (0-100)
    v_employment_score := CASE
        WHEN v_profile.employment_status IN ('employed', 'self_employed') AND COALESCE(v_profile.employment_duration, 0) >= 24 THEN 100
        WHEN v_profile.employment_status IN ('employed', 'self_employed') AND COALESCE(v_profile.employment_duration, 0) >= 12 THEN 80
        WHEN v_profile.employment_status IN ('employed', 'self_employed') THEN 50
        ELSE 20
    END;
    
    -- Calculate history score (0-100)
    v_history_score := CASE
        WHEN v_loan_count = 0 THEN 50
        WHEN v_default_count > 0 THEN GREATEST(0, 50 - (v_default_count * 30))
        WHEN v_paid_count > 0 THEN LEAST(100, 70 + (v_paid_count * 10))
        ELSE 50
    END - LEAST(30, v_late_count * 5);
    v_history_score := GREATEST(0, v_history_score);
    
    -- Calculate verification score (0-100)
    v_verification_score := 0;
    IF COALESCE(v_profile.verified, false) THEN v_verification_score := v_verification_score + 40; END IF;
    IF COALESCE(v_profile.address_verified, false) THEN v_verification_score := v_verification_score + 30; END IF;
    IF COALESCE(v_profile.employment_verified, false) THEN v_verification_score := v_verification_score + 30; END IF;
    
    -- Calculate total weighted score
    v_total_score := (v_income_score * 25 + v_dti_score * 20 + v_employment_score * 15 + v_history_score * 20 + v_verification_score * 10 + 50 * 10) / 100;
    
    -- Convert to credit score (300-850)
    v_credit_score := 300 + (v_total_score::DECIMAL / 100 * 550)::INTEGER;
    v_credit_score := GREATEST(300, LEAST(850, v_credit_score));
    
    -- Determine score range and risk level
    v_score_range := CASE
        WHEN v_credit_score >= 750 THEN 'EXCELLENT'
        WHEN v_credit_score >= 670 THEN 'GOOD'
        WHEN v_credit_score >= 580 THEN 'FAIR'
        ELSE 'POOR'
    END;
    
    v_risk_level := CASE
        WHEN v_credit_score >= 750 THEN 'low'
        WHEN v_credit_score >= 670 THEN 'medium'
        WHEN v_credit_score >= 580 THEN 'high'
        ELSE 'very_high'
    END;
    
    -- Calculate max amount and interest rate
    v_max_amount := COALESCE(v_profile.monthly_income, 0) * 6 * 
        CASE v_score_range 
            WHEN 'EXCELLENT' THEN 1.2
            WHEN 'GOOD' THEN 1.0
            WHEN 'FAIR' THEN 0.7
            ELSE 0.4
        END;
    v_max_amount := GREATEST(500, LEAST(50000, v_max_amount));
    
    v_interest_rate := CASE v_risk_level
        WHEN 'low' THEN 18
        WHEN 'medium' THEN 23
        WHEN 'high' THEN 28
        ELSE 32
    END;
    
    -- Mark previous scores as not current
    UPDATE credit_scores SET is_current = false WHERE user_id = p_user_id AND is_current = true;
    
    -- Insert new score
    INSERT INTO credit_scores (
        user_id, loan_id, score, score_range, risk_level,
        debt_to_income_ratio, affordability_score, max_approved_amount,
        suggested_interest_rate, input_data, is_current
    ) VALUES (
        p_user_id, p_loan_id, v_credit_score, v_score_range, v_risk_level,
        v_dti, v_total_score, v_max_amount,
        v_interest_rate, p_input_data, true
    ) RETURNING id INTO v_credit_score_id;
    
    -- Insert score factors
    INSERT INTO credit_score_factors (credit_score_id, category, factor, impact, weight, description)
    VALUES 
        (v_credit_score_id, 'Income', 'Monthly income level', 
            CASE WHEN v_income_score >= 60 THEN 'positive' WHEN v_income_score >= 40 THEN 'neutral' ELSE 'negative' END,
            v_income_score, 'Based on monthly income of N$' || COALESCE(v_profile.monthly_income, 0)),
        (v_credit_score_id, 'Debt', 'Debt-to-income ratio',
            CASE WHEN v_dti_score >= 60 THEN 'positive' WHEN v_dti_score >= 40 THEN 'neutral' ELSE 'negative' END,
            v_dti_score, 'DTI ratio of ' || ROUND(v_dti, 1) || '%'),
        (v_credit_score_id, 'Employment', 'Employment stability',
            CASE WHEN v_employment_score >= 60 THEN 'positive' WHEN v_employment_score >= 40 THEN 'neutral' ELSE 'negative' END,
            v_employment_score, 'Employment status: ' || COALESCE(v_profile.employment_status, 'unknown')),
        (v_credit_score_id, 'History', 'Payment history',
            CASE WHEN v_history_score >= 60 THEN 'positive' WHEN v_history_score >= 40 THEN 'neutral' ELSE 'negative' END,
            v_history_score, v_loan_count || ' previous loans, ' || v_paid_count || ' completed'),
        (v_credit_score_id, 'Verification', 'Identity verification',
            CASE WHEN v_verification_score >= 60 THEN 'positive' WHEN v_verification_score >= 40 THEN 'neutral' ELSE 'negative' END,
            v_verification_score, 'Verification status');
    
    RETURN v_credit_score_id;
END;
$$;

-- Function: Process payment webhook
CREATE OR REPLACE FUNCTION process_payment_webhook(
    p_provider VARCHAR(50),
    p_reference VARCHAR(100),
    p_status VARCHAR(20),
    p_provider_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction payment_transactions%ROWTYPE;
    v_payment_id UUID;
BEGIN
    -- Find the transaction
    SELECT * INTO v_transaction 
    FROM payment_transactions 
    WHERE reference_number = p_reference AND provider = p_provider;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found: %', p_reference;
    END IF;
    
    -- Update transaction
    UPDATE payment_transactions
    SET status = p_status,
        webhook_received_at = NOW(),
        webhook_data = p_provider_data,
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END,
        failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE NULL END,
        failure_reason = p_provider_data->>'failure_reason',
        updated_at = NOW()
    WHERE id = v_transaction.id;
    
    -- Update payment record if transaction completed
    IF p_status = 'completed' THEN
        UPDATE payments
        SET status = 'completed',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = v_transaction.payment_id;
        
        -- Update loan balance
        UPDATE loans
        SET current_balance = current_balance - v_transaction.amount,
            last_payment_date = NOW(),
            updated_at = NOW()
        WHERE id = v_transaction.loan_id;
    END IF;
    
    RETURN v_transaction.id;
END;
$$;

-- Function: Get user's current credit score
CREATE OR REPLACE FUNCTION get_current_credit_score(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    score INTEGER,
    score_range VARCHAR(20),
    risk_level VARCHAR(20),
    max_approved_amount DECIMAL(15,2),
    suggested_interest_rate DECIMAL(5,2),
    calculated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.score,
        cs.score_range,
        cs.risk_level,
        cs.max_approved_amount,
        cs.suggested_interest_rate,
        cs.created_at
    FROM credit_scores cs
    WHERE cs.user_id = COALESCE(p_user_id, auth.uid())
    AND cs.is_current = true
    ORDER BY cs.created_at DESC
    LIMIT 1;
END;
$$;

-- =====================================================
-- 7. SEED NOTIFICATION TEMPLATES
-- Note: Skipped - notification_templates schema differs from expected columns
-- The actual table has: code, name, description, subject_template, body_template, channels, category, is_active
-- =====================================================

-- =====================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_templates_updated_at') THEN
        CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_preferences_updated_at') THEN
        CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_queue_updated_at') THEN
        CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_transactions_updated_at') THEN
        CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_whatsapp_conversations_updated_at') THEN
        CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 9. ADD MISSING COLUMNS TO PROFILES (IF NEEDED)
-- =====================================================

DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_income') THEN
        ALTER TABLE profiles ADD COLUMN monthly_income DECIMAL(15,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_debt_payments') THEN
        ALTER TABLE profiles ADD COLUMN monthly_debt_payments DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employment_status') THEN
        ALTER TABLE profiles ADD COLUMN employment_status VARCHAR(30);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employment_duration') THEN
        ALTER TABLE profiles ADD COLUMN employment_duration INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'existing_debt') THEN
        ALTER TABLE profiles ADD COLUMN existing_debt DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address_verified') THEN
        ALTER TABLE profiles ADD COLUMN address_verified BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employment_verified') THEN
        ALTER TABLE profiles ADD COLUMN employment_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION queue_notification(UUID, VARCHAR, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_credit_score(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_credit_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment_webhook(VARCHAR, VARCHAR, VARCHAR, JSONB) TO service_role;

COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates';
COMMENT ON TABLE notification_queue IS 'Queue for async SMS/Email/WhatsApp delivery';
COMMENT ON TABLE credit_scores IS 'Historical credit score records';
COMMENT ON TABLE payment_transactions IS 'Detailed payment transaction logs';
COMMENT ON TABLE communication_logs IS 'All outbound communication logs';
