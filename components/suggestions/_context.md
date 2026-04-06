# components/suggestions — Context

Components: `SuggestionPanel`, `SuggestionCard`

## What's Built
- **SuggestionPanel** — tabbed view (Pending / Approved / Rejected) with counts. Accepts `currentUserId` prop passed down to each `SuggestionCard`.
- **SuggestionCard** — shows type badge, API name, project name, submitter name. Expand/collapse diff view. Action buttons: Approve + Reject (for editors/admins), Withdraw (for suggester on own pending suggestions). Reject shows inline note input.

## Local Decisions
- Withdraw button condition: `canDo(role, 'suggest') && !canDo(role, 'approve_reject') && isOwn`. This means editors who are also suggesters do NOT see Withdraw — they see Approve/Reject instead.
- `isOwn = currentUserId === suggestion.user_id`. If `currentUserId` is undefined (not yet loaded), Withdraw is never shown.
- `SuggestionPanel` does not fetch data — it receives `suggestions` as a prop. The parent page is responsible for fetching and passing `currentUserId`.

## Edge Cases
- `currentUserId` must be fetched from `supabase.auth.getUser()` in the parent page (suggestions/page.tsx) and passed down. Without it, Withdraw is always hidden.
- Approved/Rejected tabs show the same card layout without action buttons (actions only appear when `isPending`).

## Incomplete Items
- None — all components complete as of 2026-04-06.
