-- 001_initial_schema.sql
-- Creates: users, projects, api_entries tables

-- users — mirrors Supabase Auth, stores role and display name
create table if not exists public.users (
  id          uuid        primary key,  -- matches auth.users.id
  name        text        not null,
  role        text        not null default 'editor'
                          check (role in ('viewer', 'suggester', 'editor', 'admin')),
  created_at  timestamptz not null default now()
);

-- projects
create table if not exists public.projects (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  description  text,
  created_by   uuid        not null references public.users(id),
  created_at   timestamptz not null default now()
);

-- api_entries
create table if not exists public.api_entries (
  id               uuid        primary key default gen_random_uuid(),
  project_id       uuid        not null references public.projects(id) on delete cascade,
  name             text        not null,
  endpoint         text        not null,
  method           text        not null
                               check (method in ('GET','POST','PUT','PATCH','DELETE','HEAD')),
  version          text,
  status           text        check (status in ('Stable','Beta','Deprecated','Internal')),
  "group"          text,
  tags             text[]      not null default '{}',
  tool_description text,
  mcp_config       jsonb,
  request_schema   jsonb,
  response_schema  jsonb,
  code_snippet     text,
  special_notes    text,
  created_by       uuid        not null references public.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- auto-update updated_at on api_entries
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger api_entries_updated_at
  before update on public.api_entries
  for each row execute function public.set_updated_at();
