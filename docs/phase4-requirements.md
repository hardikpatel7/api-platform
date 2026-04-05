# Phase 4 — Audit & History

## Status
> Update this section as work progresses.

- [x] `history_events` table and migration — supabase/migrations/003_history_trigger.sql
- [x] Postgres trigger for direct API mutations — trigger in migration file
- [x] Application-level logging for suggestion actions and bulk imports — lib/logHistory.ts + wired into all server actions
- [x] History tab on API detail view — ApiDetailTabs 6th tab, HistoryFeed component
- [x] Action type color coding — lib/history.ts getActionColor()

---

## 1. Overview

Every mutation to an API entry produces a history record. The history system provides a full, tamper-proof audit trail of who changed what and when, accessible directly from each API's detail view.

History is **append-only**. Rows in `history_events` are never updated or deleted.

---

## 2. Trigger-Based Logging

Direct mutations to `api_entries` (INSERT, UPDATE, DELETE) are captured by a **Postgres trigger** defined in `supabase/migrations/003_history_trigger.sql`.

This ensures history cannot be bypassed at the application level — even direct database edits are captured.

The trigger writes a row to `history_events` with:
- The action type (`created`, `edited`, `deleted`)
- The `api_id`, `api_name`, `project_id`, `project_name`
- The `user_id` and `user_name` from the current session context
- The `user_role` at the time of the action
- A human-readable `detail` string (e.g. "Edited: Get Inventory Items")
- `created_at` timestamp

---

## 3. Application-Level Logging

The following actions cannot be captured by a DB trigger and are logged from application code (Server Actions):

| Action | Logged When |
|---|---|
| `suggested_edit` | Suggester submits an edit suggestion |
| `suggested_create` | Suggester submits a create suggestion |
| `suggested_delete` | Suggester submits a delete suggestion |
| `suggestion_approved` | Editor/Admin approves a suggestion |
| `suggestion_rejected` | Editor/Admin rejects a suggestion |
| `bulk_import` | OpenAPI or HAR import adds multiple APIs |

For `bulk_import`, one history event is logged per import action (not one per API entry imported).

---

## 4. Action Types Reference

| Action | Color | Trigger |
|---|---|---|
| `created` | Green | Direct create by Editor/Admin |
| `edited` | Blue | Direct edit by Editor/Admin |
| `deleted` | Red | Direct delete by Editor/Admin |
| `suggested_edit` | Amber | Suggester submits edit suggestion |
| `suggested_create` | Amber | Suggester submits create suggestion |
| `suggested_delete` | Amber | Suggester submits delete suggestion |
| `suggestion_approved` | Green | Editor/Admin approves a suggestion |
| `suggestion_rejected` | Red | Editor/Admin rejects a suggestion |
| `bulk_import` | Purple | OpenAPI or HAR bulk import |

---

## 5. History Tab (API Detail View)

### 5.1 Location
Sixth tab in the API detail view, labeled **"History"**.

Available to all roles (Viewer, Suggester, Editor, Admin).

### 5.2 Display
- Events shown in reverse chronological order (newest first)
- Up to 50 events shown per API
- Each event card shows:
  - Colored dot matching the action type color
  - Action label (human-readable, spaces instead of underscores)
  - Role badge of the acting user
  - User's display name
  - Detail string
  - Timestamp (full locale string)

### 5.3 Empty State
- "No history recorded yet." shown when no events exist for the API

---

## 6. Storage & Retention

- History stored in the shared `history_events` table in Supabase Postgres
- Capped at **500 events per API entry** — oldest events trimmed when the cap is exceeded
- Cap is enforced by the Postgres trigger and application-level logging functions
- No manual deletion of history events is permitted via the UI
