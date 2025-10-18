-- NamLend migration: admin metrics RPC, disbursements ledger, performance indexes
-- Generated: 2025-09-28

begin;

-- Ensure required extensions
create extension if not exists pgcrypto;

-- 1) Disbursements ledger table
create table if not exists public.disbursements (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null check (status in ('pending','approved','processing','completed','failed')),
  method text,
  reference text unique,
  scheduled_at timestamptz,
  processed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at maintenance trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger disbursements_set_updated_at
before update on public.disbursements
for each row execute function public.set_updated_at();

-- Propagate completion to loans
create or replace function public.disbursement_completion_propagate()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT' and new.status = 'completed')
     or (tg_op = 'UPDATE' and new.status = 'completed' and (old.status is distinct from 'completed')) then
    update public.loans
    set status = 'disbursed',
        disbursed_at = coalesce(new.processed_at, now())
    where id = new.loan_id
      and (status is distinct from 'disbursed');
  end if;
  return new;
end;
$$;

create trigger disbursements_after_change
after insert or update on public.disbursements
for each row execute function public.disbursement_completion_propagate();

-- RLS policies for disbursements
alter table public.disbursements enable row level security;

-- Read: clients can read their own, admins/loan_officers can read all
create policy disbursements_read_own_client
on public.disbursements
for select
to authenticated
using (
  exists (
    select 1 from public.loans l 
    where l.id = disbursements.loan_id 
      and l.user_id = auth.uid()
  )
  or exists (
    select 1 from public.user_roles ur 
    where ur.user_id = auth.uid() 
      and ur.role in ('admin','loan_officer')
  )
);

-- Insert: admins/loan_officers only
create policy disbursements_insert_admin_officer
on public.disbursements
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur 
    where ur.user_id = auth.uid() 
      and ur.role in ('admin','loan_officer')
  )
);

-- Update: admins/loan_officers only
create policy disbursements_update_admin_officer
on public.disbursements
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur 
    where ur.user_id = auth.uid() 
      and ur.role in ('admin','loan_officer')
  )
)
with check (
  exists (
    select 1 from public.user_roles ur 
    where ur.user_id = auth.uid() 
      and ur.role in ('admin','loan_officer')
  )
);

-- (No delete policy: preserve audit trail)

-- Helpful indexes
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_loans_user_id on public.loans(user_id);
create index if not exists idx_loans_disbursed_at on public.loans(disbursed_at);

create index if not exists idx_payments_loan_id on public.payments(loan_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_paid_at on public.payments(paid_at);
create index if not exists idx_payments_created_at on public.payments(created_at);

create index if not exists idx_approval_requests_status on public.approval_requests(status);
create index if not exists idx_approval_requests_type on public.approval_requests(request_type);
create index if not exists idx_approval_requests_priority on public.approval_requests(priority);
create index if not exists idx_approval_requests_created_at on public.approval_requests(created_at);
create index if not exists idx_approval_requests_reviewed_at on public.approval_requests(reviewed_at);

-- 2) Admin metrics RPC
create or replace function public.get_admin_dashboard_summary()
returns table (
  total_clients integer,
  total_loans integer,
  total_disbursed numeric,
  total_repayments numeric,
  overdue_payments numeric,
  pending_amount numeric,
  rejected_amount numeric
)
language plpgsql
security definer
as $$
begin
  -- Enforce admin/loan_officer role
  if not exists (
    select 1 from public.user_roles ur 
    where ur.user_id = auth.uid() 
      and ur.role in ('admin','loan_officer')
  ) then
    raise exception 'insufficient_privilege';
  end if;

  return query
  select
    (select count(*) from public.profiles) as total_clients,
    (select count(*) from public.loans) as total_loans,
    coalesce((select sum(amount) from public.loans where status = 'disbursed'), 0)::numeric as total_disbursed,
    coalesce((select sum(amount) from public.payments where status = 'completed'), 0)::numeric as total_repayments,
    coalesce((select sum(amount) from public.payments where status = 'pending' and created_at < now() - interval '30 days'), 0)::numeric as overdue_payments,
    coalesce((select sum(amount) from public.loans where status = 'approved'), 0)::numeric as pending_amount,
    coalesce((select sum(amount) from public.loans where status = 'rejected'), 0)::numeric as rejected_amount
  ;
end;
$$;

grant execute on function public.get_admin_dashboard_summary() to authenticated;

commit;
