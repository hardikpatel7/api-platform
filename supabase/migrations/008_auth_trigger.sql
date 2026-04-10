-- 008_auth_trigger.sql
-- Auto-create a public.users row whenever a new auth user signs up.
--
-- Previously, register/page.tsx inserted the row manually after signUp().
-- That breaks when Supabase email confirmation is enabled because the
-- browser client has no session yet, making auth.uid() NULL and failing
-- the users_insert_self RLS policy.
--
-- Moving the insert to a SECURITY DEFINER trigger on auth.users means
-- the row is created immediately and reliably, regardless of email
-- confirmation settings. The existing first_user_admin trigger on
-- public.users still fires after this insert and promotes the first
-- user to admin correctly.
--
-- Pre-registration cleanup (admin-invited slots) is also moved here.
-- The application layer no longer needs to manage public.users at signup.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pre_registered_role text;
  resolved_role        text;
begin
  -- Check for an admin-pre-registered slot with this email
  select role into pre_registered_role
  from public.users
  where email = new.email
  limit 1;

  resolved_role := coalesce(pre_registered_role, 'viewer');

  -- Remove the pre-registered slot so the unique email constraint
  -- doesn't block the real insert below
  if pre_registered_role is not null then
    delete from public.users where email = new.email;
  end if;

  -- Insert the real user row.
  -- Name comes from the metadata passed in signUp({ options: { data: { name } } }).
  -- Falls back to the local part of the email if no name was provided.
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    resolved_role
  );

  return new;
end;
$$;

-- Drop first in case this migration is re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
