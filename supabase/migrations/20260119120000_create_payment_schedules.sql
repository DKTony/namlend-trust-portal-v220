-- Payment Schedules Migration
-- Adds payment_schedules table for installment tracking and overdue calculations

CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id),
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount DECIMAL(12,2) NOT NULL,
  interest_amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) DEFAULT 0,
  late_fee_applied DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  days_overdue INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(loan_id, installment_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_schedules_loan_id ON public.payment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON public.payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON public.payment_schedules(status);

-- Enable Row Level Security
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Clients can view their own schedules via loans
CREATE POLICY "Clients can view own payment schedules"
  ON public.payment_schedules FOR SELECT
  USING (
    auth.uid() = (
      SELECT l.user_id FROM public.loans l WHERE l.id = payment_schedules.loan_id
    )
  );

-- Staff access
CREATE POLICY "Staff can view payment schedules"
  ON public.payment_schedules FOR SELECT
  USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can insert payment schedules"
  ON public.payment_schedules FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can update payment schedules"
  ON public.payment_schedules FOR UPDATE
  USING (public.has_role(auth.uid(), 'loan_officer') OR public.has_role(auth.uid(), 'admin'));

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to payment schedules"
  ON public.payment_schedules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_payment_schedules_updated_at ON public.payment_schedules;
CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.payment_schedules IS 'Installment schedule for loans with overdue tracking';
