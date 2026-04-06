# lib/ai — Context

Files: `generate.ts` (tool desc + MCP config), `search.ts` (semantic search)

## What's Built
- **generate.ts** — `generateApiDocs(input)` calls Claude (`claude-sonnet-4-5`) with name, method, endpoint, requestSchema, responseSchema. Returns `{ tool_description: string, mcp_config: object }`. Called only from `app/actions/generate.ts` (server action).
- **search.ts** — `semanticSearch(query, apiIndex)` calls Claude with a serialized index of all API entries (id, name, method, endpoint, tool_description, tags, group, project name). Returns ordered array of matching API IDs. Cross-project: the index spans all projects. Called from `app/actions/search.ts` (server action).

## Local Decisions
- Model: `claude-sonnet-4-5` for both generate and search.
- Both functions are pure server-side — never imported on the client.
- `generateApiDocs` is exposed via `generateApiDocsAction` (server action) and passed as a prop to `ApiForm`. The `onGenerate` prop is set to `undefined` for suggesters (AI generation is editor/admin-only per spec §3.1).
- `semanticSearch` is exposed via `semanticSearchAction`. It searches all projects, not just the current one. The result IDs are then fetched from Supabase (`.in('id', ids)`) to get the actual entries.

## Edge Cases
- Search results from other projects: the project page detects cross-project results (`entry.project_id !== projectId`) and passes `projectName` to `ApiCard` for the badge.
- If Claude returns IDs not in the DB (stale index), the `.in('id', ids)` query simply returns no row for that ID — no error.

## Incomplete Items
- None — all AI helpers complete as of 2026-04-06.
