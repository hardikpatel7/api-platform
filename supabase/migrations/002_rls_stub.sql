-- 002_rls_stub.sql
-- RLS enabled on all tables with permissive policies.
-- Phase 3 replaces these with role-scoped policies.

alter table public.users       enable row level security;
alter table public.projects    enable row level security;
alter table public.api_entries enable row level security;

-- Permissive: any authenticated user can do anything
-- Phase 3 tightens these per role
create policy "authenticated_all_users"
  on public.users for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_api_entries"
  on public.api_entries for all
  to authenticated
  using (true)
  with check (true);
