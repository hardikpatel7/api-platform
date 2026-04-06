# lib/parsers — Context

Files: `har.ts`, `openapi.ts` — pure functions, no side effects.

## What's Built
- **openapi.ts** — `parseOpenAPI(json)` accepts OpenAPI 3.0 or Swagger 2.0 JSON. Returns `Partial<ApiEntry>[]`. Maps paths/methods to entries: name from summary/operationId, group from tags[0], request/response schema extracted from spec schemas.
- **har.ts** — `parseHAR(json, options)` accepts HAR JSON. Options: `jsonOnly` (default true), `dedup` (default true). Returns `Partial<ApiEntry>[]`. Normalizes dynamic path segments to `{id}`. Infers request/response schemas from actual payloads (type inference, max 4 levels, max 20 object keys, max 60KB response).

## Local Decisions
- Both parsers are pure functions — no Supabase calls, no side effects. They only transform JSON → `Partial<ApiEntry>[]`.
- The actual DB write happens in `bulkImportAction` (server action), which calls these parsers then inserts the results.
- HAR static asset filtering: extensions `.css .js .png .jpg .jpeg .gif .svg .ico .woff .woff2 .ttf .eot .map .html` are excluded unconditionally.
- Schema inference type mapping: integer numbers → `integer`, floats → `number`, null/undefined → `null`, arrays recurse into first element for `items`.

## Edge Cases
- `parseOpenAPI`: if both `summary` and `operationId` are absent, falls back to `${method} ${path}` as the name.
- `parseHAR`: Authorization header detected → notes auth scheme in `special_notes`. Cookie auth → "Cookie auth detected" in `special_notes`. Source URL and host also stored in `special_notes`.

## Incomplete Items
- None — all parsers complete as of 2026-04-06.
