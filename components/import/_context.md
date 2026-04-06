# components/import — Context

Components: `HARImportModal`, `OpenAPIImportModal`

## What's Built
- **OpenAPIImportModal** — textarea to paste JSON spec → Parse button validates and shows preview list (method, endpoint, group) → Import N APIs button calls `onImport`. Handles OpenAPI 3.0 and Swagger 2.0.
- **HARImportModal** — textarea to paste HAR JSON → Parse HAR button → host filter dropdown (multi-domain HAR) → filterable checkbox list → Import N button calls `onImport`. JSON-only toggle and dedup toggle wired.

## Local Decisions
- Both modals accept `onImport: (entries) => void` — the actual Supabase write is done in `bulkImportAction` (server action) called by the parent page, not inside the modal.
- `onClose` prop closes the modal without importing.
- Partial failures: invalid entries are skipped; valid ones proceed. Skip count reported.
- Both modals are rendered conditionally in the project page (`showOpenAPI`, `showHAR` state).

## Edge Cases
- HAR dedup: keyed on `${method}:${normalizedEndpoint}`. First occurrence wins.
- HAR static asset filtering runs before dedup — `.js`, `.css`, images, fonts, etc. are excluded regardless of toggles.
- Large HAR files: response schema inference caps at 60KB and 4 levels deep.

## Incomplete Items
- None — all components complete as of 2026-04-06.
