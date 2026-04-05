-- 005_triggers.sql
-- (a) First-user admin trigger
-- (b) History audit trigger for direct api_entries mutations

-- ============================================================
-- (a) First-user admin trigger
-- On INSERT into public.users, if this is the very first row,
-- set role = 'admin' so the first sign-up gets full access.
-- ============================================================

create or replace function public.assign_first_user_admin()
returns trigger language plpgsql security definer as $$
begin
  -- Count existing rows BEFORE this insert (the trigger fires after insert,
  -- so count = 1 means this is the first user)
  if (select count(*) from public.users) = 1 then
    update public.users set role = 'admin' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger first_user_admin
  after insert on public.users
  for each row execute function public.assign_first_user_admin();

-- ============================================================
-- (b) History audit trigger
-- Fires on INSERT, UPDATE, DELETE to public.api_entries.
-- Writes a row to history_events capturing who did what.
-- Relies on app_user_id / app_user_name / app_user_role being set
-- via set_config() in the application before each mutation.
-- Falls back to auth.uid() if session config is not set.
-- ============================================================

create or replace function public.log_api_entry_history()
returns trigger language plpgsql security definer as $$
declare
  v_action      text;
  v_api_id      uuid;
  v_api_name    text;
  v_project_id  uuid;
  v_project_name text;
  v_user_id     uuid;
  v_user_name   text;
  v_user_role   text;
begin
  -- Determine action type
  if    TG_OP = 'INSERT' then v_action := 'created';
  elsif TG_OP = 'UPDATE' then v_action := 'edited';
  elsif TG_OP = 'DELETE' then v_action := 'deleted';
  end if;

  -- Use OLD for DELETE, NEW for INSERT/UPDATE
  if TG_OP = 'DELETE' then
    v_api_id   := OLD.id;
    v_api_name := OLD.name;
    v_project_id := OLD.project_id;
  else
    v_api_id   := NEW.id;
    v_api_name := NEW.name;
    v_project_id := NEW.project_id;
  end if;

  -- Look up project name
  select name into v_project_name from public.projects where id = v_project_id;

  -- Look up acting user from session context or fall back to auth.uid()
  v_user_id := coalesce(
    (nullif(current_setting('app.user_id', true), ''))::uuid,
    auth.uid()
  );

  select name, role into v_user_name, v_user_role
  from public.users where id = v_user_id;

  v_user_name := coalesce(v_user_name, 'Unknown');
  v_user_role := coalesce(v_user_role, 'editor');

  insert into public.history_events (
    action, api_id, api_name,
    project_id, project_name,
    user_id, user_name, user_role,
    detail
  ) values (
    v_action, v_api_id, v_api_name,
    v_project_id, coalesce(v_project_name, ''),
    coalesce(v_user_id, '00000000-0000-0000-0000-000000000000'),
    v_user_name, v_user_role,
    initcap(v_action) || ': ' || v_api_name
  );

  -- Trim history to 500 events per API entry
  delete from public.history_events
  where id in (
    select id from public.history_events
    where api_id = v_api_id
    order by created_at desc
    offset 500
  );

  return coalesce(NEW, OLD);
end;
$$;

create trigger api_entries_history
  after insert or update or delete on public.api_entries
  for each row execute function public.log_api_entry_history();
