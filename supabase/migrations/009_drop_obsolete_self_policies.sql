-- 009_drop_obsolete_self_policies.sql
-- Drop two RLS policies on public.users that became dead code after
-- migration 008 moved user-row creation into the on_auth_user_created
-- SECURITY DEFINER trigger.
--
-- users_insert_self (from 004):
--   Allowed any authenticated user to insert their own row (id = auth.uid()).
--   This was the application-level signup path. The trigger now handles all
--   inserts, so this policy is unused. More importantly it is unsafe: it has
--   no WITH CHECK constraint on the role column, meaning a user with a valid
--   session could POST directly to the REST API and insert a row with
--   role = 'admin'. Dropping it removes that surface entirely.
--
-- users_delete_preregistered_self (from 007):
--   Allowed an authenticated user to delete the orphan pre-registered slot
--   that register/page.tsx used to clean up manually. The trigger now handles
--   that cleanup via SECURITY DEFINER, so the application layer no longer
--   issues any delete against public.users at signup. Policy is dead code.
--   It was narrowly scoped (email match + id != auth.uid()) so posed no
--   security risk, but removing it keeps the policy set clean.

drop policy if exists "users_insert_self"              on public.users;
drop policy if exists "users_delete_preregistered_self" on public.users;
