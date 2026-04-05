# supabase/migrations — Context

SQL-only migration files. All schema changes go here — never use the Supabase dashboard to alter schema in production.

## Planned Files
- `001_initial_schema.sql` — tables: projects, api_entries, users, suggestions, history_events
- `002_rls_policies.sql` — row-level security for all tables
- `003_history_trigger.sql` — Postgres trigger to auto-log history on api_entries mutations

## Local Decisions
- History is append-only — no UPDATE or DELETE on history_events
- RLS is required on every table

## Incomplete Items
- No migrations written yet.
