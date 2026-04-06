-- 007_fix_rls.sql
-- Three RLS fixes found during post-build audit.

-- ============================================================
-- Fix 1: history_events_insert
-- The previous policy restricted inserts to editor/admin only.
-- Suggesters call logHistoryAction from submitSuggestionAction
-- (suggested_edit / suggested_create / suggested_delete) and
-- editors/admins call it from approve/reject/bulk-import actions.
-- All application-level inserts must be permitted; the trigger in
-- 005_triggers.sql handles api_entries mutations via SECURITY DEFINER
-- and bypasses RLS already.
-- ============================================================
drop policy if exists "history_events_insert" on public.history_events;
create policy "history_events_insert"
  on public.history_events for insert
  to authenticated
  with check (true);

-- ============================================================
-- Fix 2: suggestions_select
-- The previous policy exposed all suggestions to every role.
-- Suggesters must only see their own; editors/admins see all.
-- ============================================================
drop policy if exists "suggestions_select" on public.suggestions;
create policy "suggestions_select"
  on public.suggestions for select
  to authenticated
  using (
    public.current_user_role() in ('editor', 'admin')
    or user_id = auth.uid()
  );

-- ============================================================
-- Fix 3: users_delete — pre-registration cleanup on sign-up
-- register/page.tsx deletes the pre-registered slot (random UUID
-- row with the new user's email) after the real auth user signs up.
-- The existing users_delete policy requires admin, which the new
-- user is not. This policy allows deletion of the orphan slot only.
-- ============================================================
create or replace function public.current_user_email()
returns text language sql security definer stable as $$
  select email from auth.users where id = auth.uid()
$$;

create policy "users_delete_preregistered_self"
  on public.users for delete
  to authenticated
  using (email = public.current_user_email() and id != auth.uid());
