-- Normalize and enforce canonical payment_method values
-- Date: 2025-10-05
-- Change type: DATA + CONSTRAINT

begin;

-- Preflight (informational): uncomment to inspect prior to migration
-- select distinct payment_method from public.payments order by 1;

-- Map legacy variants to canonical set
update public.payments
   set payment_method = 'debit_order'
 where payment_method in ('card','card_payment','credit_card','debit_card');

-- Add CHECK constraint to enforce canonical set
-- Note: drop existing constraint first if it exists with the same name
alter table public.payments
  add constraint payment_method_valid
  check (payment_method in ('bank_transfer','mobile_money','cash','debit_order'));

commit;
