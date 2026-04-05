# Phase 3 — Collaboration & Access Control

## Status
> Update this section as work progresses.

- [x] Supabase Auth (sign up, login, session guard) — wired Phase 1
- [x] User table + first-user admin trigger — migration in supabase/migrations
- [x] Role definitions and RLS policies — lib/permissions.ts + useRole.ts
- [x] Role-based UI enforcement — ApiDetailActions, ProjectActionBar
- [x] Suggestion submission (edit, create, delete) — app/actions/submitSuggestion.ts
- [x] Suggestions queue view (Editor/Admin) — SuggestionPanel component
- [x] Diff view — DiffView component + lib/diff.ts
- [x] Approve flow — app/actions/approveSuggestion.ts
- [x] Reject flow (with note) — app/actions/rejectSuggestion.ts
- [x] Withdraw flow (suggester) — app/actions/withdrawSuggestion.ts
- [x] User management (Admin) — UserManagementModal component

---

## 1. Authentication

### 1.1 Sign Up
- Email and password via Supabase Auth
- On successful sign-up, a row is inserted into the `users` table with the Supabase Auth user ID
- Display name is set during the sign-up flow and stored in `users.name`
- A Postgres trigger checks if this is the first user in the `users` table; if so, assigns `role = 'admin'`
- All other new users default to `role = 'viewer'`

### 1.2 Login
- Email and password via Supabase Auth
- On success, redirected to the platform home

### 1.3 Session Guard
- The `(platform)` layout validates the Supabase session server-side on every request
- Unauthenticated requests are redirected to `/login`
- No client-side-only session checks — server validation is the source of truth

### 1.4 Sign Out
- Available from the user chip in the sidebar
- Calls `supabase.auth.signOut()` and redirects to `/login`

---

## 2. Roles

### 2.1 Role Definitions

| Role | Description |
|---|---|
| `viewer` | Read-only — can browse all projects, APIs, and history |
| `suggester` | Can submit suggestions for create, edit, and delete; can view own pending suggestions |
| `editor` | Can directly create, edit, and delete APIs; can approve and reject suggestions |
| `admin` | All editor capabilities plus user management (add, change role, delete users) |

### 2.2 Permissions Matrix

| Action | Viewer | Suggester | Editor | Admin |
|---|---|---|---|---|
| Browse projects and APIs | ✓ | ✓ | ✓ | ✓ |
| View history | ✓ | ✓ | ✓ | ✓ |
| Submit suggestions | — | ✓ | ✓ | ✓ |
| Direct create / edit / delete API | — | — | ✓ | ✓ |
| Direct create / delete project | — | — | ✓ | ✓ |
| View all pending suggestions | — | Own only | ✓ | ✓ |
| Approve / reject suggestions | — | — | ✓ | ✓ |
| Manage users | — | — | — | ✓ |

### 2.3 Enforcement
Role is enforced at two levels — both are required:

**UI level** — buttons and routes render conditionally based on the user's role. Prevents accidental misuse.

**Database level (RLS)** — Supabase Row Level Security policies enforce permissions on every read and write. A user cannot bypass UI restrictions to perform unauthorized mutations — the database rejects them regardless.

RLS policies are defined in `supabase/migrations/002_rls_policies.sql`.

---

## 3. Role-Based UI

### 3.1 Viewer
- No create, edit, delete, or import buttons visible anywhere
- No access to the Suggestions panel
- No access to User Management

### 3.2 Suggester
- Sees **"Suggest Edit"** and **"Suggest Delete"** on the API detail view instead of Edit/Delete
- Sees **"+ Suggest New API"** in the project API list header
- Can access the Suggestions panel to view and withdraw their own pending submissions
- Sidebar shows a badge with their personal pending suggestion count
- No access to User Management

### 3.3 Editor
- Full create, edit, delete on API entries and projects
- Access to import (OpenAPI, HAR) and AI Generate
- Suggestions panel shows all pending suggestions with approve/reject controls
- Sidebar badge shows total pending count across all projects

### 3.4 Admin
- All Editor capabilities
- **"Users (N)"** button visible in the sidebar footer → opens User Management modal
- Can change any user's role
- Can add new users
- Can delete users (cannot delete own account)

---

## 4. Suggestion Workflow

### 4.1 Suggestion Types
| Type | Trigger | Effect on Approval |
|---|---|---|
| `edit` | Suggester edits an existing API | Payload replaces the live API entry |
| `create` | Suggester proposes a new API | Payload is inserted as a new API entry |
| `delete` | Suggester proposes removing an API | API entry is deleted |

### 4.2 Submitting a Suggestion
1. Suggester opens the edit form (pre-filled with current data for edit/delete; blank for create)
2. Form header shows a **"Suggestion"** badge; save button reads **"Submit Suggestion"**
3. On submit:
   - A row is inserted into `suggestions` with `status = 'pending'`
   - For `edit` type: `original` is set to a snapshot of the current API entry at submission time
   - For `delete` type: `original` is set to the current API entry; `payload` is null
   - The live API entry is **not modified**
4. A `pending` badge appears on the API card in the list view
5. History event logged: `suggested_edit`, `suggested_create`, or `suggested_delete`

### 4.3 Suggestions Panel
Accessible from the sidebar footer for Editors, Admins, and Suggesters (own items only).

**Tabs:** Pending | Approved | Rejected (each with count)

Each suggestion card shows:
- Type badge (edit / create / delete)
- API name
- Project name
- Submitter name and timestamp
- Expand/collapse toggle for the diff view

### 4.4 Diff View
Shown when a suggestion card is expanded.

**For `edit` type:**
- Field-by-field comparison for text fields:
  - Original value in red
  - Suggested value in green
  - Fields compared: `name`, `method`, `endpoint`, `version`, `status`, `group`, `tool_description`, `special_notes`
- JSON fields (`request_schema`, `response_schema`, `mcp_config`, `code_snippet`) show a "modified" label with the suggested value rendered below
- If no text fields changed (e.g. only tags updated), show "Only tags/JSON fields changed"

**For `create` type:**
- Shows the proposed API name, method, and endpoint

**For `delete` type:**
- Shows the name, method, and endpoint of the API to be removed

### 4.5 Approve Flow
1. Editor/Admin clicks **Approve**
2. Mutation applied to `api_entries` based on suggestion type
3. Suggestion row updated: `status = 'approved'`, `reviewed_by`, `reviewer_name`, `reviewed_at` set
4. History event logged: `suggestion_approved`

### 4.6 Reject Flow
1. Editor/Admin clicks **Reject**
2. An inline text input appears for an optional rejection reason
3. Editor clicks **Confirm**
4. Suggestion row updated: `status = 'rejected'`, `review_note` set
5. API entry is **not modified**
6. History event logged: `suggestion_rejected`
7. Rejection note is visible in the expanded card for the submitter

### 4.7 Withdraw Flow
- Suggester can withdraw their own pending suggestion from the Suggestions panel
- Sets `status = 'rejected'`, `review_note = 'Withdrawn by author'`
- Available only while `status = 'pending'`

---

## 5. User Management (Admin Only)

### 5.1 User List
- All registered users shown with name, role badge, and join date
- Current user is marked "(you)" and cannot be edited or deleted by themselves

### 5.2 Change Role
- Admin selects a new role from a dropdown next to any user
- Change is saved immediately to `users.role`
- RLS policies take effect on the user's next request

### 5.3 Add User
- Admin enters a name and selects a role
- A new row is created in `users` (not in Supabase Auth — the user must still sign up via the auth flow to get credentials)
- This pre-registers a user slot with a role, so when they sign up their role is already set

### 5.4 Delete User
- Admin can delete any user except themselves
- Deletes the `users` row; the Supabase Auth account is not deleted
- Existing history events and suggestions referencing the user are retained (denormalized names preserved)
