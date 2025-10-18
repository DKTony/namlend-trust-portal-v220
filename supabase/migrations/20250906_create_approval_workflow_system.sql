-- Back Office Approval Workflow System
-- This migration creates a comprehensive approval workflow system for all user-initiated requests

-- Create approval_requests table for centralized workflow management
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'loan_application', 'kyc_document', 'profile_update', 'payment', 'document_upload'
    request_data JSONB NOT NULL, -- Store the actual request data
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'requires_info')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id), -- Admin user assigned to review
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES auth.users(id),
    review_notes TEXT,
    reference_id UUID, -- Reference to the original record (loan_id, document_id, etc.)
    reference_table VARCHAR(50), -- Table name for the referenced record
    auto_approve_eligible BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    compliance_flags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create approval_workflow_history for audit trail
CREATE TABLE IF NOT EXISTS public.approval_workflow_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    approval_request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    change_reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    additional_data JSONB DEFAULT '{}'::jsonb
);

-- Create approval_workflow_rules for automated decision making
CREATE TABLE IF NOT EXISTS public.approval_workflow_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL, -- JSON conditions for rule matching
    action VARCHAR(20) NOT NULL CHECK (action IN ('auto_approve', 'auto_reject', 'flag_review', 'assign_priority')),
    action_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create approval_notifications for tracking notifications
CREATE TABLE IF NOT EXISTS public.approval_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    approval_request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    notification_type VARCHAR(30) NOT NULL, -- 'new_request', 'status_update', 'assignment', 'reminder'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_user_id ON public.approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON public.approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_assigned_to ON public.approval_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON public.approval_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_approval_requests_priority ON public.approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_history_request_id ON public.approval_workflow_history(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_recipient ON public.approval_notifications(recipient_id, is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_approval_requests_updated_at 
    BEFORE UPDATE ON public.approval_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflow_rules_updated_at 
    BEFORE UPDATE ON public.approval_workflow_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for approval_requests
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own approval requests
CREATE POLICY "Users can view their own approval requests" ON public.approval_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all approval requests
CREATE POLICY "Admins can view all approval requests" ON public.approval_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can update approval requests
CREATE POLICY "Admins can update approval requests" ON public.approval_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- System can insert approval requests
CREATE POLICY "System can insert approval requests" ON public.approval_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for approval_workflow_history
ALTER TABLE public.approval_workflow_history ENABLE ROW LEVEL SECURITY;

-- Users can view history of their own requests
CREATE POLICY "Users can view their approval history" ON public.approval_workflow_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.approval_requests 
            WHERE id = approval_request_id 
            AND user_id = auth.uid()
        )
    );

-- Admins can view all history
CREATE POLICY "Admins can view all approval history" ON public.approval_workflow_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can insert history records
CREATE POLICY "Admins can insert approval history" ON public.approval_workflow_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for approval_workflow_rules
ALTER TABLE public.approval_workflow_rules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage workflow rules
CREATE POLICY "Only admins can manage workflow rules" ON public.approval_workflow_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for approval_notifications
ALTER TABLE public.approval_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.approval_notifications
    FOR SELECT USING (auth.uid() = recipient_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.approval_notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON public.approval_notifications
    FOR INSERT WITH CHECK (true);

-- Create function to automatically create workflow history
CREATE OR REPLACE FUNCTION create_approval_workflow_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history for status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.approval_workflow_history (
            approval_request_id,
            previous_status,
            new_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(NEW.reviewer_id, auth.uid()),
            NEW.review_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for automatic history creation
CREATE TRIGGER approval_status_change_history
    AFTER UPDATE ON public.approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_approval_workflow_history();

-- Insert default workflow rules
INSERT INTO public.approval_workflow_rules (request_type, rule_name, conditions, action, action_data, created_by) VALUES
-- Auto-approve small loans for verified users
('loan_application', 'Auto-approve small loans', 
 '{"amount": {"$lte": 5000}, "user_verified": true, "credit_score": {"$gte": 600}}', 
 'auto_approve', 
 '{"reason": "Small loan amount for verified user with good credit"}',
 (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)),

-- Flag high-value loans for manual review
('loan_application', 'Flag high-value loans', 
 '{"amount": {"$gte": 25000}}', 
 'flag_review', 
 '{"priority": "high", "reason": "High-value loan requires manual review"}',
 (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)),

-- Auto-approve KYC documents from trusted sources
('kyc_document', 'Auto-approve standard KYC', 
 '{"document_type": {"$in": ["id_card", "proof_income"]}, "file_size": {"$lte": 5242880}}', 
 'auto_approve', 
 '{"reason": "Standard KYC document within size limits"}',
 (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)),

-- Flag suspicious payment requests
('payment', 'Flag suspicious payments', 
 '{"amount": {"$gte": 10000}, "time_of_day": {"$between": ["22:00", "06:00"]}}', 
 'flag_review', 
 '{"priority": "urgent", "reason": "Large payment outside business hours"}',
 (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1));

-- Create function to evaluate workflow rules
CREATE OR REPLACE FUNCTION evaluate_approval_rules(
    p_request_type VARCHAR(50),
    p_request_data JSONB
) RETURNS TABLE (
    rule_id UUID,
    action VARCHAR(20),
    action_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.action,
        r.action_data
    FROM public.approval_workflow_rules r
    WHERE r.request_type = p_request_type
    AND r.is_active = true
    AND jsonb_path_exists(p_request_data, r.conditions::jsonpath);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to submit approval request
CREATE OR REPLACE FUNCTION submit_approval_request(
    p_request_type VARCHAR(50),
    p_request_data JSONB,
    p_reference_id UUID DEFAULT NULL,
    p_reference_table VARCHAR(50) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_rule RECORD;
    v_auto_approved BOOLEAN := FALSE;
BEGIN
    -- Insert the approval request
    INSERT INTO public.approval_requests (
        user_id,
        request_type,
        request_data,
        reference_id,
        reference_table,
        status
    ) VALUES (
        auth.uid(),
        p_request_type,
        p_request_data,
        p_reference_id,
        p_reference_table,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    -- Evaluate workflow rules
    FOR v_rule IN 
        SELECT * FROM evaluate_approval_rules(p_request_type, p_request_data)
    LOOP
        CASE v_rule.action
            WHEN 'auto_approve' THEN
                UPDATE public.approval_requests 
                SET 
                    status = 'approved',
                    auto_approve_eligible = true,
                    review_notes = COALESCE(v_rule.action_data->>'reason', 'Auto-approved by workflow rule'),
                    reviewed_at = NOW(),
                    reviewer_id = auth.uid()
                WHERE id = v_request_id;
                v_auto_approved := TRUE;
                
            WHEN 'auto_reject' THEN
                UPDATE public.approval_requests 
                SET 
                    status = 'rejected',
                    review_notes = COALESCE(v_rule.action_data->>'reason', 'Auto-rejected by workflow rule'),
                    reviewed_at = NOW(),
                    reviewer_id = auth.uid()
                WHERE id = v_request_id;
                
            WHEN 'flag_review' THEN
                UPDATE public.approval_requests 
                SET 
                    priority = COALESCE(v_rule.action_data->>'priority', 'high'),
                    status = 'under_review'
                WHERE id = v_request_id;
                
            WHEN 'assign_priority' THEN
                UPDATE public.approval_requests 
                SET priority = COALESCE(v_rule.action_data->>'priority', 'normal')
                WHERE id = v_request_id;
        END CASE;
    END LOOP;
    
    -- Create notification for admins if not auto-approved
    IF NOT v_auto_approved THEN
        INSERT INTO public.approval_notifications (
            approval_request_id,
            recipient_id,
            notification_type,
            title,
            message
        )
        SELECT 
            v_request_id,
            ur.user_id,
            'new_request',
            'New ' || p_request_type || ' request pending approval',
            'A new ' || p_request_type || ' request has been submitted and requires your review.'
        FROM public.user_roles ur
        WHERE ur.role = 'admin';
    END IF;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_workflow_history TO authenticated;
GRANT ALL ON public.approval_workflow_rules TO authenticated;
GRANT ALL ON public.approval_notifications TO authenticated;
