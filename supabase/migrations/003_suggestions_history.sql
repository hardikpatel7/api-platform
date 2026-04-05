-- 003_suggestions_history.sql
-- Creates: suggestions, history_events tables

-- suggestions — proposed changes from suggesters, pending editor/admin review
create table if not exists public.suggestions (
  id             uuid        primary key default gen_random_uuid(),
  type           text        not null check (type in ('edit', 'create', 'delete')),
  project_id     uuid        not null references public.projects(id) on delete cascade,
  project_name   text        not null,
  api_id         uuid        references public.api_entries(id) on delete set null,
  api_name       text        not null,
  user_id        uuid        not null references public.users(id),
  user_name      text        not null,
  payload        jsonb,
  original       jsonb,
  status         text        not null default 'pending'
                             check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid        references public.users(id),
  reviewer_name  text,
  reviewed_at    timestamptz,
  review_note    text,
  created_at     timestamptz not null default now()
);

-- history_events — append-only audit trail for every API mutation
create table if not exists public.history_events (
  id            uuid        primary key default gen_random_uuid(),
  action        text        not null check (action in (
                              'created', 'edited', 'deleted',
                              'suggested_edit', 'suggested_create', 'suggested_delete',
                              'suggestion_approved', 'suggestion_rejected',
                              'bulk_import'
                            )),
  api_id        uuid,
  api_name      text,
  project_id    uuid        not null,
  project_name  text        not null,
  user_id       uuid        not null,
  user_name     text        not null,
  user_role     text        not null check (user_role in ('viewer', 'suggester', 'editor', 'admin')),
  detail        text,
  created_at    timestamptz not null default now()
);

-- enable RLS (policies added in 004)
alter table public.suggestions    enable row level security;
alter table public.history_events enable row level security;
