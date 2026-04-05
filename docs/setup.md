# Setup & Running Guide

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Comes with Node |
| Supabase account | — | [supabase.com](https://supabase.com) — free tier is fine |
| Anthropic API key | — | [console.anthropic.com](https://console.anthropic.com) |

---

## 1. Clone and Install

```bash
git clone <your-repo-url>
cd "API Platform"
npm install
```

---

## 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your **Project URL** and **anon public key** (Settings → API)
3. Note your **service role key** if you plan to run migrations via CLI

---

## 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ANTHROPIC_API_KEY=sk-ant-...
```

> `ANTHROPIC_API_KEY` is used server-side only (AI Generate + Semantic Search). It is never exposed to the browser.

---

## 4. Run Database Migrations

All schema, RLS policies, and triggers live in `supabase/migrations/`. Run them in order against your Supabase project.

### Option A — Supabase CLI (recommended)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B — SQL Editor (manual)

Open your Supabase project → **SQL Editor** and run each file in order:

| Order | File | What it creates |
|---|---|---|
| 1 | `supabase/migrations/001_initial_schema.sql` | `users`, `projects`, `api_entries` tables + `updated_at` trigger |
| 2 | `supabase/migrations/002_rls_stub.sql` | Enables RLS; permissive policies (any authenticated user) |
| 3 | `supabase/migrations/003_suggestions_history.sql` | `suggestions` and `history_events` tables |
| 4 | `supabase/migrations/004_rls_policies.sql` | Role-scoped RLS policies (viewer/suggester/editor/admin) |
| 5 | `supabase/migrations/005_triggers.sql` | First-user admin trigger + history audit trigger |

> **Note:** Migrations 003–005 are not yet written — see [Pending Work](#pending-work) below.

---

## 5. Configure Supabase Auth

In your Supabase project dashboard:

1. **Authentication → Providers** — ensure **Email** is enabled
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your Vercel URL (prod)
   - Redirect URLs: add `http://localhost:3000/**`

---

## 6. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## 7. First-Time User Setup

The first user to sign up should automatically become `admin` (enforced by the Postgres trigger in migration 005 — see Pending Work below).

**Until migration 005 is applied**, manually set the first user's role in the Supabase SQL editor:

```sql
update public.users set role = 'admin' where id = '<your-user-id>';
```

Find your user ID in **Authentication → Users** in the Supabase dashboard.

---

## 8. Running Tests

```bash
# Run all tests once
npm run test:run

# Watch mode
npm test

# UI mode (browser test explorer)
npm run test:ui
```

Tests use Vitest + React Testing Library with jsdom. No database connection required — all external dependencies are mocked.

---

## 9. Building for Production

```bash
npm run build
npm start
```

Or deploy to Vercel:

```bash
npm install -g vercel
vercel
```

Set the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`) in your Vercel project settings.

---

## Pending Work

The following items are **not yet implemented** and are required before the app is fully functional:

### Database Migrations (must be written)

| Migration | What's needed |
|---|---|
| `003_suggestions_history.sql` | `suggestions` table (type, project_id, api_id, user_id, payload, original, status, review fields) and `history_events` table (action, api_id, api_name, project_id, project_name, user_id, user_name, user_role, detail, created_at) |
| `004_rls_policies.sql` | Role-scoped RLS: viewers read-only, suggesters insert suggestions, editors full CRUD on apis + approve/reject suggestions, admins everything |
| `005_triggers.sql` | (a) First-user admin trigger: on `INSERT` to `users`, if table was previously empty set `role = 'admin'`; (b) History audit trigger: on INSERT/UPDATE/DELETE to `api_entries`, write a row to `history_events` |

### Pages (wiring needed)

| Page | What's needed |
|---|---|
| `/suggestions` route | A page that fetches all suggestions from Supabase and renders `SuggestionPanel` with `approveSuggestionAction`, `rejectSuggestionAction`, `withdrawSuggestionAction` wired in |
| `/settings/users` route | A page that fetches all users and renders `UserManagementModal` (or inline equivalent) with role-change and delete handlers |

### Minor gaps

- The home page (`/`) "New project" button is not yet role-gated — viewers and suggesters should not see it (requires `useRole` + `canDo('direct_edit')` check)
- `historyEvents` prop on `ApiDetailTabs` is not yet fetched from Supabase on the API detail page — the History tab renders empty until it is wired up

---

## Project Structure (quick reference)

```
app/
  (auth)/           login, register
  (platform)/       all authenticated routes (session guard in layout.tsx)
    page.tsx         project list + create
    projects/[projectId]/
      page.tsx       API list
      apis/new/      create API
      apis/[apiId]/  view + edit API

components/
  api/              ApiCard, ApiForm, ApiDetailTabs, ApiDetailActions, ProjectActionBar
  layout/           Sidebar, Header
  suggestions/      SuggestionPanel, SuggestionCard, DiffView
  import/           OpenAPIImportModal, HARImportModal
  history/          HistoryFeed
  settings/         UserManagementModal

lib/
  supabase/         client.ts, server.ts
  ai/               generate.ts, search.ts
  parsers/          openapi.ts, har.ts
  permissions.ts    canDo(role, action) — pure role checker
  diff.ts           diffApiEntries() — field-level diff
  history.ts        getActionColor(), getActionLabel()
  logHistory.ts     logHistoryAction() — server-side history insert

app/actions/
  generate.ts       AI Generate server action
  search.ts         Semantic Search server action
  submitSuggestion.ts
  approveSuggestion.ts
  rejectSuggestion.ts
  withdrawSuggestion.ts
  bulkImport.ts

supabase/migrations/
  001_initial_schema.sql
  002_rls_stub.sql
  003–005 (pending — see above)
```
