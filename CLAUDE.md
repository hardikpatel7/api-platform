# CLAUDE.md
> This file is read automatically by Claude Code at the start of every session.
> It defines the project-wide rules, conventions, and context that apply everywhere.

---

## Project Overview
An API documentation platform for teams building with AI and MCP. It solves the problem of having no shared place to document APIs alongside tool configs and natural language descriptions — with collaboration, role-based access control, and AI-assisted documentation built in.

---

## Requirements & Docs
All product requirements live in the `/docs` folder. Read these before working on any feature.

| File | Contents |
|---|---|
| `docs/requirements-overview.md` | Full PRD, data model, architecture decisions |
| `docs/phase1-requirements.md` | Core documentation engine (projects, API entries, filters) |
| `docs/phase2-requirements.md` | Import (HAR, OpenAPI) and AI features (generate, search) |
| `docs/phase3-requirements.md` | Roles, user management, suggestion/approval workflow |
| `docs/phase4-requirements.md` | History system, audit trail, action types |
| `docs/roadmap.md` | Future phases (export, advanced AI, versioning, real auth) |

**Always check the relevant phase doc before implementing a feature. Do not infer requirements — read them.**

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript — strict mode, no `any` |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand (one store per domain) |
| Database | Supabase (Postgres + Realtime) |
| Auth | Supabase Auth |
| AI | Anthropic SDK (`claude-sonnet-4-5`) |
| Deployment | Vercel |

---

## Folder Structure & Responsibilities

```
/
├── app/
│   ├── (auth)/               # Login, register — no session required
│   └── (platform)/           # All authenticated routes — session checked in layout.tsx
│       ├── layout.tsx         # Sidebar + header shell + session guard
│       ├── page.tsx           # Home / project list
│       ├── projects/[projectId]/
│       │   ├── page.tsx       # API list view
│       │   └── apis/
│       │       ├── new/
│       │       └── [apiId]/   # Detail + edit
│       ├── suggestions/       # Global suggestion queue (Editor/Admin)
│       └── settings/users/    # Admin-only user management
│
├── components/
│   ├── ui/                   # shadcn primitives only — no business logic here
│   ├── layout/               # Sidebar, Header
│   ├── api/                  # ApiCard, ApiForm, ApiDetailTabs, DiffView
│   ├── suggestions/          # SuggestionPanel, SuggestionCard
│   ├── import/               # HARImportModal, OpenAPIImportModal
│   └── history/              # HistoryFeed
│
├── lib/
│   ├── supabase/             # client.ts (browser), server.ts (RSC), middleware.ts
│   ├── ai/                   # generate.ts (tool desc + MCP), search.ts (semantic)
│   ├── parsers/              # har.ts, openapi.ts — pure functions, no side effects
│   └── utils.ts
│
├── store/                    # Zustand stores — one file per domain
├── types/                    # index.ts — all shared TypeScript types
├── hooks/                    # useRole.ts, useSupabaseRealtime.ts
│
└── supabase/
    └── migrations/           # SQL only — schema, RLS, triggers in numbered files
```

### Feature Context Files
Each major feature folder contains a `_context.md` with local decisions, edge cases, and incomplete items. **Read it before editing that feature.**

```
components/api/_context.md
components/suggestions/_context.md
components/import/_context.md
lib/parsers/_context.md
lib/ai/_context.md
supabase/migrations/_context.md
```

---

## Roles & Permissions
The platform has four roles enforced at both the UI and Supabase RLS level.

| Role | Direct Edit | Suggest | Approve | Manage Users |
|---|---|---|---|---|
| `viewer` | — | — | — | — |
| `suggester` | — | Yes | — | — |
| `editor` | Yes | Yes | Yes | — |
| `admin` | Yes | Yes | Yes | Yes |

- **Never skip RLS.** Every table must have row-level security policies. See `supabase/migrations/004_rls_policies.sql`.
- Role is stored on the `users` table and read via `useRole.ts` hook.
- UI gating alone is not enough — always verify role server-side for mutations.

---

## Suggestion Workflow
Suggestions are the core collaboration primitive. Understand this before touching anything in `components/suggestions/` or the `suggestions` table.

1. Suggester submits → creates a row in `suggestions` with `status: pending`. **Live API data is not touched.**
2. Editor/Admin reviews → sees field-level diff (original vs payload).
3. On **Approve** → payload is written to the `apis` table + history entry logged.
4. On **Reject** → status updated to `rejected`, reviewer note stored. API unchanged.
5. Suggester can **Withdraw** their own pending suggestion.

Suggestion types: `edit` | `create` | `delete`

---

## History System
Every mutation to an API entry must produce a history record. This is enforced via a Postgres trigger in `005_triggers.sql` — do not rely on application-level logging alone.

Tracked actions: `created` | `edited` | `deleted` | `suggested_edit` | `suggested_create` | `suggested_delete` | `suggestion_approved` | `suggestion_rejected` | `bulk_import`

History is append-only. Never update or delete history rows.

---

## AI Features

### Generate (per API)
- File: `lib/ai/generate.ts`
- Input: name, method, endpoint, requestSchema, responseSchema
- Output: `toolDescription` (string) + `mcpConfig` (JSON string)
- Model: `claude-sonnet-4-5`
- Call only from server actions or API routes — never from the client directly

### Semantic Search
- File: `lib/ai/search.ts`
- Input: natural language query + serialized API index
- Output: ordered array of matching API IDs
- Scope: searches across all projects the user has access to

---

## Supabase Conventions
- Use `lib/supabase/server.ts` in Server Components and Route Handlers
- Use `lib/supabase/client.ts` in Client Components
- All schema changes go through numbered migration files — never use the Supabase dashboard to alter schema in production
- Realtime subscriptions live in `hooks/useSupabaseRealtime.ts` — used for suggestion queue live updates

---

## TypeScript Conventions
- All shared types defined in `types/index.ts` — import from there, never redefine locally
- Key types: `Project`, `ApiEntry`, `User`, `UserRole`, `Suggestion`, `SuggestionType`, `HistoryEntry`, `HistoryAction`
- Use `UserRole = 'viewer' | 'suggester' | 'editor' | 'admin'` — never use raw strings for roles
- Prefer `type` over `interface` for data shapes; use `interface` for component props

---

## Naming Conventions
- **Components** — PascalCase (`ApiCard.tsx`)
- **Hooks** — camelCase with `use` prefix (`useRole.ts`)
- **Store files** — camelCase with `Store` suffix (`projectStore.ts`)
- **DB tables** — snake_case plural (`api_entries`, `suggestions`, `history_events`)
- **Tailwind** — utility classes only; no custom CSS unless Tailwind cannot do it

---

## Build Status
**All 4 phases complete** (as of 2026-04-06). 358 tests across 43 test files.

| Phase | Status |
|---|---|
| 1 — Core engine | ✅ Projects, API entries, CRUD, sidebar filters, all 6 detail tabs |
| 2 — Import & AI | ✅ OpenAPI + HAR import, AI Generate, Semantic Search (cross-project) |
| 3 — Collaboration | ✅ Roles, RLS, suggestion workflow, user management |
| 4 — History/audit | ✅ history_events, HistoryFeed tab, Postgres trigger, app-level logging |

### Post-build RLS audit fixes (2026-04-06, migration 007)
- `history_events_insert` policy expanded to all authenticated roles — suggesters were silently blocked from logging `suggested_*` events
- `suggestions_select` policy restricted so suggesters only see their own suggestions
- `users_delete_preregistered_self` policy added — new signups can now clean up the orphan pre-registered slot during sign-up
- `rejectSuggestionAction` now always fetches the suggestion and logs history (previously relied on optional caller-supplied context that was never passed)
- `approveSuggestionAction` now back-fills `api_id` on the suggestion row when approving a create-type suggestion

When starting new work, check the relevant phase doc and the feature's `_context.md` for local decisions and edge cases.

The following are roadmap items and **out of scope until explicitly instructed**. Do not implement them.

- Export to Markdown / JSON
- `claude_desktop_config.json` one-click copy
- GitHub Gist / Notion sync
- AI-generated code snippets (multi-language)
- "Ask your API docs" chat interface
- Deprecation timeline tracking
- Inline comments per API field
- @mention notifications

---

## 6. Glossary

| Term | Definition |
|---|---|
| **API Entry** | A single documented endpoint with all its associated metadata |
| **Project** | A named container grouping related API entries |
| **Group** | A sub-section within a project for organizing APIs (e.g. "Auth", "Inventory") |
| **Tag** | A free-form label applied to APIs for cross-cutting filtering |
| **MCP Config** | A JSON block defining an API as a Model Context Protocol tool |
| **Tool Description** | A natural language paragraph describing an API's purpose and usage |
| **Suggestion** | A proposed change submitted by a Suggester, pending Editor/Admin review |
| **HAR** | HTTP Archive — a JSON file format exported from browser DevTools capturing network traffic |
| **Schema Inference** | Automatically deriving a JSON Schema from a sample request or response payload |

