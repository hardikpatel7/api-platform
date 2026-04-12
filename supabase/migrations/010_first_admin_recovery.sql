-- 010_first_admin_recovery.sql
-- Provides a self-service admin recovery path.
-- If no admin user exists in the system (e.g. after a DB wipe),
-- the calling authenticated user can claim admin status.
-- Safe: only acts when no admin is present.

create or replace function public.promote_if_no_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where role = 'admin') then
    update public.users set role = 'admin' where id = auth.uid();
    return true;
  end if;
  return false;
end;
$$;

-- Restrict to authenticated users only (PostgreSQL defaults to PUBLIC)
revoke execute on function public.promote_if_no_admin() from public;
grant  execute on function public.promote_if_no_admin() to authenticated;

-- Explain the function's purpose
comment on function public.promote_if_no_admin() is
  'Break-glass: promotes the calling user to admin if no admin user exists. '
  'Callable only by authenticated users. Safe to expose via RPC.';
