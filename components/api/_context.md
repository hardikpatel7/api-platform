# components/api — Context

Components: `ApiCard`, `ApiForm`, `ApiDetailTabs`, `ApiDetailActions`, `ProjectActionBar`, `DiffView`

## What's Built
- **ApiCard** — method badge, name, status badge, version, endpoint, tags. Accepts `projectName?: string` (renders `data-testid="project-name-badge"` for cross-project search results) and `hasPendingSuggestion?: boolean` (renders amber "Pending review" badge).
- **ApiForm** — shared create/edit form used by new API page and the API detail edit mode. Accepts `submitLabel` prop so it can read "Save changes", "Create API", or "Submit Suggestion" depending on context. `onGenerate` prop is optional; omitted for suggesters.
- **ApiDetailTabs** — 6 tabs: Overview, Schema, MCP Config, Code Snippet, Notes, History. Copy-to-clipboard on Schema/MCP/Code Snippet in view mode.
- **ApiDetailActions** — renders Edit+Delete for `direct_edit` roles, Suggest Edit + Suggest Delete for `suggest` roles, null for viewers.
- **ProjectActionBar** — renders New API + Import (HAR/OpenAPI) for editors/admins; renders Suggest New API for suggesters.
- **DiffView** — field-by-field diff for edit suggestions; summary view for create/delete.

## Local Decisions
- `ApiCard.projectName` is only set during cross-project semantic search — not shown in normal project list view.
- `ApiCard.hasPendingSuggestion` is driven by a `pendingApiIds` Set in the project page, queried from all pending suggestions (not scoped to user). Only shown in non-search mode.
- `ApiForm.submitLabel` drives the submit button text. Caller (page) is responsible for passing the right label based on role.
- `ApiDetailActions` is a purely presentational component — it calls the callbacks passed to it, containing no business logic.

## Edge Cases
- When role is `null` (still loading), `ApiDetailActions` is not rendered — no flash of wrong buttons.
- `DiffView` handles the case where `original` or `payload` is null (delete type shows original, create type shows payload).

## Incomplete Items
- None — all components complete as of 2026-04-06.
