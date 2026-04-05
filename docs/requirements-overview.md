# Requirements Overview
## API Documentation Platform

---

## 1. Project Overview

### Why
Teams building with AI and MCP lack a shared place to document APIs alongside tool configs and natural language descriptions. This platform fills that gap with collaboration, role-based access, and AI-assisted documentation built in.

### Goals
- Single source of truth for all API knowledge across a team
- AI-assisted documentation generation and semantic search
- Controlled collaboration through a role-based suggestion and approval workflow
- Rapid onboarding from existing specs (OpenAPI) or live traffic (HAR)
- Full audit trail of all documentation changes

### Target Users
- **Backend engineers** documenting APIs they build
- **AI/MCP developers** needing structured tool configs
- **Technical writers and PMs** reviewing and annotating API behavior
- **QA and integration teams** referencing schemas and notes

---

## 2. Architecture

### Tech Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Database | Supabase (Postgres + Realtime) |
| Auth | Supabase Auth |
| AI | Anthropic SDK (`claude-sonnet-4-5`) |
| Deployment | Vercel |

### Key Architectural Decisions
- All authenticated routes live under the `(platform)` route group with a shared layout that validates the Supabase session server-side
- The Anthropic SDK is called **only from server-side code** (Server Actions or Route Handlers) — never from the browser
- Supabase Realtime is used for live suggestion queue updates to Editor/Admin clients
- Role enforcement operates at two levels: UI (conditional rendering) and database (RLS policies). Neither is optional
- History is written via a Postgres trigger, not application-level code, to ensure it cannot be bypassed
- Supabase Auth is wired from Phase 1 so `user.id` is real across all phases — roles and RLS layer on in Phase 3 with no retrofitting

---

## 3. Data Model

### `projects`
```
id              uuid          PK, default gen_random_uuid()
name            text          NOT NULL
description     text
created_by      uuid          FK → users.id
created_at      timestamptz   default now()
```

### `api_entries`
```
id              uuid          PK, default gen_random_uuid()
project_id      uuid          FK → projects.id  ON DELETE CASCADE
name            text          NOT NULL
endpoint        text          NOT NULL
method          text          -- GET | POST | PUT | PATCH | DELETE | HEAD
version         text          -- e.g. "v1", "v2"
status          text          -- Stable | Beta | Deprecated | Internal
group           text          -- sub-section label within a project
tags            text[]        default '{}'
tool_description text
mcp_config      jsonb         -- stored as parsed object, not raw string
request_schema  jsonb
response_schema jsonb
code_snippet    text
special_notes   text
created_by      uuid          FK → users.id
created_at      timestamptz   default now()
updated_at      timestamptz   default now()
```

### `users`
```
id              uuid          PK  -- matches Supabase Auth user id
name            text          NOT NULL
role            text          -- viewer | suggester | editor | admin
created_at      timestamptz   default now()
```

### `suggestions`
```
id              uuid          PK, default gen_random_uuid()
type            text          -- edit | create | delete
project_id      uuid          FK → projects.id
project_name    text          -- denormalized at insert time
api_id          uuid          -- nullable for "create" type; back-filled on approval
api_name        text          -- denormalized at insert time
user_id         uuid          FK → users.id
user_name       text          -- denormalized at insert time
payload         jsonb         -- full api_entry shape (edit/create)
original        jsonb         -- snapshot at time of suggestion (edit only)
status          text          -- pending | approved | rejected
created_at      timestamptz   default now()
reviewed_by     uuid          -- nullable, FK → users.id
reviewer_name   text          -- denormalized at review time
reviewed_at     timestamptz
review_note     text
```
> **`api_id` on create suggestions:** null at submission. When approved, the new `api_entries` row is inserted first, then `suggestions.api_id` is back-filled with the new ID to preserve audit traceability.

### `history_events`
```
id              uuid          PK, default gen_random_uuid()
action          text          -- see Phase 4 for full action type list
project_id      uuid
project_name    text          -- denormalized at insert time
api_id          uuid          -- nullable
api_name        text          -- denormalized at insert time
user_id         uuid
user_name       text          -- denormalized at insert time
user_role       text          -- role at time of action
detail          text          -- human-readable summary
created_at      timestamptz   default now()
```
> History is append-only — rows are never updated or deleted. Capped at 500 entries per `api_id`; oldest entries are truncated when the cap is exceeded.

---

## 4. Roles & Permissions

| Role | Direct Edit | Suggest | Approve | Manage Users |
|---|---|---|---|---|
| `viewer` | — | — | — | — |
| `suggester` | — | Yes | — | — |
| `editor` | Yes | Yes | Yes | — |
| `admin` | Yes | Yes | Yes | Yes |

### Admin Bootstrap
- The user who **creates a project** is automatically set as `admin` for that project via a Postgres trigger
- This means the first user to create a project always has full access to it

---

## 5. Non-Functional Requirements

### Security
- Role enforcement at both UI level and Supabase RLS level — never UI alone
- Supabase Auth handles all session management and token validation
- Anthropic SDK called only server-side — API key never exposed to the browser
- HAR files may contain auth tokens — users warned in the import UI before proceeding

### Performance
- Storage reads/writes are async and non-blocking
- AI features show loading states during API calls
- History capped at 500 entries per `api_id` to prevent unbounded growth
- Realtime subscription scoped to the suggestion queue only

### Data Integrity
- Suggestions never mutate live API data until explicitly approved
- History is append-only — rows are never updated or deleted
- Denormalized display fields (names, roles) written at insert time, not joined at read time
- `mcp_config` stored as `jsonb` — AI output (string) is parsed before insert; serialized to string for display/copy

### Usability
- All badges (method, status, role) are color-coded consistently across all views
- Toast notifications confirm all save, delete, and approval actions
- Real-time JSON validation with inline error messages on all schema fields
- Active filters and search state are reflected in the list subtitle

---

## 6. Phase Overview

| Phase | Scope | Detail |
|---|---|---|
| **Phase 1** | Core documentation engine + Auth | Supabase Auth, projects, API entries, list view, group headers, tag + status filters |
| **Phase 2** | Import & AI | OpenAPI import, HAR/Network Tab import, AI generate, AI semantic search |
| **Phase 3** | Collaboration & access control | Roles, RLS, suggestion workflow, user management |
| **Phase 4** | Audit & history | History tab, action tracking, Postgres trigger, append-only log |

See `roadmap.md` for features beyond Phase 4.
