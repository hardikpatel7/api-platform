# supabase/migrations — Context

SQL-only migration files. All schema changes go here — never use the Supabase dashboard to alter schema in production.

## Migration Files

| File | Purpose |
|---|---|
| `001_initial_schema.sql` | `users`, `projects`, `api_entries` tables with indexes |
| `002_rls_stub.sql` | RLS enabled on all Phase 1 tables; permissive policies for all authenticated users (replaced in 004) |
| `003_suggestions_history.sql` | `suggestions` + `history_events` tables; RLS enabled (policies in 004) |
| `004_rls_policies.sql` | Role-scoped RLS replacing the stubs from 002. Uses `current_user_role()` helper (security definer). Admins manage users; editors/admins mutate api_entries and projects; suggesters insert/withdraw suggestions; all roles read everything. |
| `005_triggers.sql` | (a) First-user admin trigger: first INSERT into `users` sets `role = 'admin'`. (b) History audit trigger: every INSERT/UPDATE/DELETE on `api_entries` writes a row to `history_events`, trims to 500 events per api_id. |

## Local Decisions
- History is append-only — no UPDATE or DELETE on `history_events`.
- RLS is required on every table — never disable it.
- `suggestions.api_id` is nullable for `create` type suggestions (no existing entry yet); back-filled on approval.
- `history_events.user_id` falls back to `auth.uid()` if `app.user_id` session config is not set by the application.
- First user trigger counts rows after insert (count = 1 means this is the first user).
- `current_user_role()` is a `SECURITY DEFINER` function — it bypasses RLS to read the role, preventing infinite recursion in policies.

## Edge Cases
- Migration 004 drops the stub policies from 002 before creating new ones — safe to run sequentially.
- The history trigger uses `set_config('app.user_id', ...)` context injected by the application before each mutation for accurate user attribution.
- `suggestions.api_id` ON DELETE SET NULL — if an API entry is deleted, the suggestion loses its `api_id` but is retained for audit purposes.
