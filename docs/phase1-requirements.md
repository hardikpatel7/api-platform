# Phase 1 — Core Documentation Engine

## Status
> Update this section as work progresses.

- [x] Database migration — projects, api_entries, users tables + RLS stubs
- [x] Supabase Auth — sign-up and sign-in pages
- [x] Session guard in (platform) layout
- [x] Sidebar layout — project list + in-project filters
- [x] Project CRUD
- [x] API entry CRUD
- [x] API list view with cards
- [x] Group headers
- [x] Status filter
- [x] Tag filter
- [x] Overview tab
- [x] Schema tab (with JSON validation)
- [x] MCP Config tab (with JSON validation)
- [x] Code Snippet tab
- [x] Notes tab
- [x] Copy-to-clipboard on code blocks

---

## Design Decisions (Phase 1)

| Question | Decision |
|---|---|
| Auth in Phase 1? | Yes — Supabase Auth (sign-up/sign-in) wired from day one so `user.id` is real. Roles and RLS added in Phase 3. |
| Role checks in Phase 1? | `useRole` stub returns `editor` for all authenticated users. UI conditionals are written correctly now so Phase 3 just swaps the real role in. |
| Sidebar structure | Single sidebar: project list at top, status/tag filters below (visible only when inside a project). |
| New API entry UX | Dedicated page at `/projects/[projectId]/apis/new` — not a modal. |
| API detail UX | Single page at `/projects/[projectId]/apis/[apiId]` with toggled read/edit mode. Tabs visible in both modes; fields become inputs in edit mode. |

---

## Build Order

Build in this sequence — each step depends on the previous.

### Step 1 — Database & Auth foundation
- Migration `001_initial_schema.sql`: `users`, `projects`, `api_entries` tables
- Migration `002_rls_stub.sql`: RLS enabled on all tables, permissive policies for now (tightened in Phase 3)
- `lib/supabase/client.ts` and `lib/supabase/server.ts` — Supabase client setup
- `types/index.ts` — all Phase 1 types (`Project`, `ApiEntry`, `User`, `UserRole`)

### Step 2 — Auth pages
- `app/(auth)/login/page.tsx` — email + password sign-in form
- `app/(auth)/register/page.tsx` — name + email + password sign-up form
- On sign-up: insert row into `users` table with `role = 'editor'` (Phase 3 will add real role assignment)
- Redirect to `/(platform)` on success; redirect to `/login` if no session

### Step 3 — Platform shell
- `app/(platform)/layout.tsx` — server-side session check via `lib/supabase/server.ts`; redirect to `/login` if no session
- `components/layout/Sidebar.tsx` — renders project list + in-project filters
- `components/layout/Header.tsx` — app name, user name, sign-out button
- `hooks/useRole.ts` — stub returning `'editor'` for all authenticated users

### Step 4 — Project management
- `app/(platform)/page.tsx` — project list (home)
- Supabase queries: list projects, create project, delete project
- `store/projectStore.ts` — Zustand store for project list
- `components/layout/Sidebar.tsx` — project list with name + API count badge
- Create project modal (inline on home page)
- Delete project — Editor/Admin only (stub role check via `useRole`)
- On project creation: set `created_by` from session user

### Step 5 — API entry CRUD
- `app/(platform)/projects/[projectId]/page.tsx` — API list view
- `app/(platform)/projects/[projectId]/apis/new/page.tsx` — create form
- `app/(platform)/projects/[projectId]/apis/[apiId]/page.tsx` — detail + edit page
- Supabase queries: list APIs, get API, create API, update API, delete API
- `store/apiStore.ts` — Zustand store per project
- `components/api/ApiForm.tsx` — shared form used by new and edit pages

### Step 6 — API list view
- `components/api/ApiCard.tsx` — card with method badge, name, status badge, version, endpoint, tags
- Group headers: group APIs by `group` field, sort groups alphabetically, ungrouped last
- If no group is set on any API, omit headers entirely

### Step 7 — Sidebar filters
- Status filter chips (Stable / Beta / Deprecated / Internal) — toggle behavior
- Tag cloud chips — built from unique tags across current project's APIs
- Filters stack: both can be active simultaneously
- List subtitle reflects active filters: e.g. `"12 endpoints · #auth · Stable"`
- Clear all filters option

### Step 8 — API detail tabs
- `components/api/ApiDetailTabs.tsx` — tab shell with 5 tabs
- **Overview tab** — all fields from §2.1 (name, method, endpoint, version, status, group, tags, tool description)
- **Schema tab** — request + response schema editors with real-time JSON validation; red border + inline error on invalid JSON
- **MCP Config tab** — JSON editor with real-time validation; minimum shape enforced as a hint, not a hard constraint
- **Code Snippet tab** — freeform text editor, no language enforcement
- **Notes tab** — freeform text
- Copy-to-clipboard button on Schema, MCP Config, and Code Snippet tabs (view mode only); shows "Copied" for 2 seconds

---

## 1. Project Management

### 1.1 Create Project
- User provides a name (required) and description (optional)
- Projects are top-level containers grouping related API entries
- On creation, the user is set as `created_by`

### 1.2 List Projects
- All projects the user has access to are shown in the sidebar
- Each project shows its name and a count of API entries
- Clicking a project loads its API list in the main panel

### 1.3 Delete Project
- Available to Editor and Admin roles only
- Deletes the project and all its API entries (cascade)
- Viewer and Suggester roles do not see the delete option

---

## 2. API Entry Management

Each API entry stores documentation across five tabs.

### 2.1 Overview Tab
| Field | Type | Notes |
|---|---|---|
| Name | text | Required. e.g. "Get Inventory Items" |
| Method | enum | GET, POST, PUT, PATCH, DELETE, HEAD |
| Endpoint | text | URL path, e.g. `/api/v1/items` |
| Version | text | e.g. `v1`, `v2` |
| Status | enum | Stable, Beta, Deprecated, Internal |
| Group | text | Sub-section label, e.g. "Auth", "Inventory" |
| Tags | text[] | Free-form labels, e.g. `auth`, `read-only` |
| Tool Description | text | Natural language — what it does, when to use it, key behavior |

### 2.2 Schema Tab
- **Request Schema** — JSON Schema for request body or query parameters
- **Response Schema** — JSON Schema for the success response payload
- Both fields validate JSON in real time with inline error highlighting
- Border turns red on invalid JSON; error message shown below the field

### 2.3 MCP Config Tab
- Full MCP tool definition as a JSON block
- Minimum expected shape:
```json
{
  "name": "",
  "description": "",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```
- Real-time JSON validation, same behavior as Schema tab

### 2.4 Code Snippet Tab
- Freeform text editor for usage examples
- No language enforcement — supports Python, JavaScript, cURL, etc.

### 2.5 Notes Tab
- Freeform text for:
  - Authentication requirements
  - Rate limiting details
  - Known edge cases or caveats
  - Deprecation timelines

### 2.6 Copy to Clipboard
- Available on the Schema, MCP Config, and Code Snippet tabs in view mode only
- Button shows "Copied" confirmation for 2 seconds on success

### 2.7 Create / Edit / Delete
- Editor and Admin roles can create, edit, and delete API entries directly
- All direct saves are persisted to `api_entries` immediately
- Viewer and Suggester do not see create/edit/delete controls (Phase 3 adds Suggest flow)

---

## 3. API List View

### 3.1 Card Layout
Each API entry is displayed as a card showing:
- Method badge (color-coded per HTTP verb)
- API name
- Status badge (color-coded: Stable / Beta / Deprecated / Internal)
- Version badge
- Endpoint path (monospace)
- Tags as pill badges (if any)

**Method badge colors**
| Method | Color |
|---|---|
| GET | Blue |
| POST | Green |
| PUT | Orange |
| PATCH | Teal |
| DELETE | Red |
| HEAD | Purple |

**Status badge colors**
| Status | Color |
|---|---|
| Stable | Green |
| Beta | Amber |
| Deprecated | Red |
| Internal | Blue |

### 3.2 Group Headers
- APIs within a project are grouped by their `group` field
- Each group renders as a labeled section divider with an entry count
- Groups sorted alphabetically; ungrouped APIs appear last
- If no APIs have a group set, no headers are shown

### 3.3 Sidebar Filters

**Status filter**
- All four status values shown as clickable chips in the sidebar
- Clicking a chip filters the list to that status
- Clicking again deselects (toggle behavior)

**Tag cloud**
- All unique tags across the current project's APIs are shown as clickable chips
- Clicking a tag filters the list to APIs carrying that tag
- Tags appear only when at least one API in the project has tags

**Stacking**
- Status and tag filters can be applied simultaneously
- Active filter state is shown in the list view subtitle (e.g. "12 endpoints · #auth · Stable")
- A clear option resets all filters
