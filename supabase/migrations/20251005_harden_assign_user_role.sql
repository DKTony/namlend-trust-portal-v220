-- Harden assign_user_role with admin guard and restricted EXECUTE privileges
-- Date: 2025-10-05
-- Change type: SECURITY

begin;

-- Ensure has_role helper is available (expected to exist per project types)
-- create or replace function public.has_role(_user_id uuid, _role public.app_role)
-- returns boolean language sql stable as $$
--   select exists (
--     select 1 from public.user_roles ur where ur.user_id = _user_id and ur.role = _role
--   );
-- $$;

create or replace function public.assign_user_role(
  target_user_id uuid,
  target_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Unauthenticated';
  end if;

  if not public.has_role(auth.uid(), 'admin') then
    raise insufficient_privilege using message = 'Only admins may assign roles';
  end if;

  -- idempotent delete-then-insert
  delete from public.user_roles
   where user_id = target_user_id
     and role = target_role;

  insert into public.user_roles(user_id, role)
  values (target_user_id, target_role);
end;
$$;

-- Restrict EXECUTE privileges to authenticated only (remove PUBLIC)
revoke execute on function public.assign_user_role(uuid, public.app_role) from public;
grant execute on function public.assign_user_role(uuid, public.app_role) to authenticated;

commit;
