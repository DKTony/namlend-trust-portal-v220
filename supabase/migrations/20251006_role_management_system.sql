-- Role Management System with Hierarchy Validation
-- Date: 2025-10-06
-- Change type: FEATURE
-- Description: Add role removal and comprehensive role management with hierarchy rules

begin;

-- Role hierarchy validation function
create or replace function public.validate_role_hierarchy(
  target_user_id uuid,
  new_roles public.app_role[]
)
returns boolean
language plpgsql
stable
as $$
declare
  has_admin boolean := 'admin' = any(new_roles);
  has_loan_officer boolean := 'loan_officer' = any(new_roles);
  has_client boolean := 'client' = any(new_roles);
  role_count integer := array_length(new_roles, 1);
begin
  -- Rule 3: Admin can have any combination (admin + loan_officer + client)
  if has_admin then
    return true; -- Admin can have any roles
  end if;
  
  -- Rule 2: Loan Officer can be loan_officer + client, but NOT admin
  if has_loan_officer and not has_admin then
    -- Can only have loan_officer and/or client
    return not has_admin;
  end if;
  
  -- Rule 1: Client can only be client (no multiple roles) when not admin/loan_officer
  if has_client and not has_admin and not has_loan_officer then
    return role_count = 1; -- Only client role allowed
  end if;
  
  -- Default: allow single valid roles
  return role_count = 1 and (has_admin or has_loan_officer or has_client);
end;
$$;

-- Remove role function
create or replace function public.remove_user_role(
  target_user_id uuid,
  target_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_roles public.app_role[];
begin
  -- Authentication check
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Unauthenticated';
  end if;

  -- Admin authorization check
  if not public.has_role(auth.uid(), 'admin') then
    raise insufficient_privilege using message = 'Only admins may remove roles';
  end if;

  -- Get remaining roles after removal
  select array_agg(role) into remaining_roles
  from public.user_roles 
  where user_id = target_user_id 
    and role != target_role;

  -- Ensure user has at least one role (default to client)
  if remaining_roles is null or array_length(remaining_roles, 1) = 0 then
    remaining_roles := array['client'::public.app_role];
  end if;

  -- Validate hierarchy rules for remaining roles
  if not public.validate_role_hierarchy(target_user_id, remaining_roles) then
    raise exception 'Role removal would violate hierarchy rules. Remaining roles: %', remaining_roles;
  end if;

  -- Remove the specific role
  delete from public.user_roles
  where user_id = target_user_id
    and role = target_role;

  -- Ensure user has at least client role if no roles remain
  if not exists (select 1 from public.user_roles where user_id = target_user_id) then
    insert into public.user_roles(user_id, role)
    values (target_user_id, 'client');
  end if;
end;
$$;

-- Enhanced assign role function with hierarchy validation
create or replace function public.assign_user_role_with_validation(
  target_user_id uuid,
  target_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_roles public.app_role[];
  new_roles public.app_role[];
begin
  -- Authentication check
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Unauthenticated';
  end if;

  -- Admin authorization check
  if not public.has_role(auth.uid(), 'admin') then
    raise insufficient_privilege using message = 'Only admins may assign roles';
  end if;

  -- Get current roles
  select array_agg(role) into current_roles
  from public.user_roles 
  where user_id = target_user_id;

  -- Calculate new roles after addition
  if current_roles is null then
    new_roles := array[target_role];
  else
    -- Add role if not already present
    if not (target_role = any(current_roles)) then
      new_roles := current_roles || target_role;
    else
      new_roles := current_roles; -- Role already exists
    end if;
  end if;

  -- Validate hierarchy rules
  if not public.validate_role_hierarchy(target_user_id, new_roles) then
    raise exception 'Role assignment would violate hierarchy rules. Current: %, Adding: %', current_roles, target_role;
  end if;

  -- Idempotent insert (only if role doesn't exist)
  insert into public.user_roles(user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- Bulk role management function
create or replace function public.set_user_roles(
  target_user_id uuid,
  target_roles public.app_role[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Authentication check
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Unauthenticated';
  end if;

  -- Admin authorization check
  if not public.has_role(auth.uid(), 'admin') then
    raise insufficient_privilege using message = 'Only admins may set roles';
  end if;

  -- Validate hierarchy rules
  if not public.validate_role_hierarchy(target_user_id, target_roles) then
    raise exception 'Role set would violate hierarchy rules: %', target_roles;
  end if;

  -- Remove all existing roles
  delete from public.user_roles where user_id = target_user_id;

  -- Insert new roles
  insert into public.user_roles(user_id, role)
  select target_user_id, unnest(target_roles);
end;
$$;

-- Get user roles function
create or replace function public.get_user_roles(
  target_user_id uuid
)
returns table(role public.app_role, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Authentication check
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Unauthenticated';
  end if;

  -- Admin authorization check (or user checking their own roles)
  if not (public.has_role(auth.uid(), 'admin') or auth.uid() = target_user_id) then
    raise insufficient_privilege using message = 'Insufficient permissions to view roles';
  end if;

  return query
  select ur.role, ur.created_at
  from public.user_roles ur
  where ur.user_id = target_user_id
  order by ur.role;
end;
$$;

-- Grant execute permissions
grant execute on function public.remove_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.assign_user_role_with_validation(uuid, public.app_role) to authenticated;
grant execute on function public.set_user_roles(uuid, public.app_role[]) to authenticated;
grant execute on function public.get_user_roles(uuid) to authenticated;
grant execute on function public.validate_role_hierarchy(uuid, public.app_role[]) to authenticated;

-- Update the original assign_user_role to use validation
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
  -- Use the new validation function
  perform public.assign_user_role_with_validation(target_user_id, target_role);
end;
$$;

commit;
