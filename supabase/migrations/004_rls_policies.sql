-- 004_rls_policies.sql
-- Role-scoped RLS policies replacing the permissive stubs in 002_rls_stub.sql
-- Reads user role from public.users joined on auth.uid()

-- Helper: get current user's role
create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.users where id = auth.uid()
$$;

-- ============================================================
-- Drop existing permissive stub policies
-- ============================================================
drop policy if exists "authenticated_all_users"       on public.users;
drop policy if exists "authenticated_all_projects"    on public.projects;
drop policy if exists "authenticated_all_api_entries" on public.api_entries;

-- ============================================================
-- users table
-- ============================================================

-- All authenticated users can read the users table (needed for name lookups)
create policy "users_select"
  on public.users for select
  to authenticated
  using (true);

-- Only admins can insert/update/delete users
create policy "users_insert"
  on public.users for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

create policy "users_update"
  on public.users for update
  to authenticated
  using (public.current_user_role() = 'admin');

create policy "users_delete"
  on public.users for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- Allow a user to insert their own row on sign-up (before role is assigned)
create policy "users_insert_self"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

-- ============================================================
-- projects table
-- ============================================================

-- All authenticated users can read projects
create policy "projects_select"
  on public.projects for select
  to authenticated
  using (true);

-- Editors and admins can create, update, delete projects
create policy "projects_insert"
  on public.projects for insert
  to authenticated
  with check (public.current_user_role() in ('editor', 'admin'));

create policy "projects_update"
  on public.projects for update
  to authenticated
  using (public.current_user_role() in ('editor', 'admin'));

create policy "projects_delete"
  on public.projects for delete
  to authenticated
  using (public.current_user_role() in ('editor', 'admin'));

-- ============================================================
-- api_entries table
-- ============================================================

-- All authenticated users can read api_entries
create policy "api_entries_select"
  on public.api_entries for select
  to authenticated
  using (true);

-- Editors and admins can directly create, update, delete
create policy "api_entries_insert"
  on public.api_entries for insert
  to authenticated
  with check (public.current_user_role() in ('editor', 'admin'));

create policy "api_entries_update"
  on public.api_entries for update
  to authenticated
  using (public.current_user_role() in ('editor', 'admin'));

create policy "api_entries_delete"
  on public.api_entries for delete
  to authenticated
  using (public.current_user_role() in ('editor', 'admin'));

-- ============================================================
-- suggestions table
-- ============================================================

-- All authenticated users can read suggestions
create policy "suggestions_select"
  on public.suggestions for select
  to authenticated
  using (true);

-- Suggesters, editors, admins can insert suggestions
create policy "suggestions_insert"
  on public.suggestions for insert
  to authenticated
  with check (public.current_user_role() in ('suggester', 'editor', 'admin'));

-- Editors and admins can update (approve/reject); suggesters can update their own (withdraw)
create policy "suggestions_update"
  on public.suggestions for update
  to authenticated
  using (
    public.current_user_role() in ('editor', 'admin')
    or (public.current_user_role() = 'suggester' and user_id = auth.uid())
  );

-- ============================================================
-- history_events table
-- ============================================================

-- All authenticated users can read history (audit trail is public within the app)
create policy "history_events_select"
  on public.history_events for select
  to authenticated
  using (true);

-- Only the server (via service role) should insert history events.
-- Application-level inserts use the service role key; this policy is a safety net.
create policy "history_events_insert"
  on public.history_events for insert
  to authenticated
  with check (public.current_user_role() in ('editor', 'admin'));
