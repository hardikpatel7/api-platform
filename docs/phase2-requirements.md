# Phase 2 — Import & AI Intelligence

## Status
> Update this section as work progresses.

- [x] OpenAPI / Swagger import
- [x] HAR / Network Tab import
- [x] AI Generate (tool description + MCP config)
- [x] AI Semantic Search

---

## 1. OpenAPI / Swagger Import

### 1.1 Supported Formats
- OpenAPI 3.0 (JSON)
- Swagger 2.0 (JSON)

### 1.2 What Gets Extracted
For each path + method combination in the spec:

| Source Field | Maps To |
|---|---|
| `summary` or `operationId` | `name` |
| Path string | `endpoint` |
| HTTP method | `method` |
| `tags[0]` | `group` |
| All `tags` (lowercased) | `tags[]` |
| `description` or `summary` | `tool_description` |
| Request body schema (3.0) or body parameter schema (2.0) | `request_schema` |
| Query + path parameter schemas | `request_schema` (if no body) |
| `responses.200` or `responses.201` schema | `response_schema` |

### 1.3 Import Flow
1. User opens the OpenAPI import modal
2. Pastes a JSON spec into the textarea
3. Clicks **Parse** — the spec is validated and a preview list is generated
4. Preview shows: method badge, endpoint, group for each detected API
5. User clicks **Import N APIs** to confirm
6. All imported entries are written to `api_entries` with `project_id` set to the current project
7. A single `bulk_import` history event is logged (not one per API)

### 1.4 Error Handling
- Invalid JSON → show parse error before any import
- No paths found → show "No API paths found" message
- Partial failures → skip invalid entries, import valid ones, report skip count

---

## 2. HAR / Network Tab Import

Captures real API traffic from a browser's DevTools Network tab.

### 2.1 How to Export a HAR File
Shown in the import modal UI:
- **Chrome/Edge** — DevTools → Network tab → use the app → click the Download icon (Export HAR)
- **Firefox** — Right-click any request → Save All as HAR
- Open the `.har` file, select all text, paste into the modal

### 2.2 Filtering
Before parsing, two toggles are available:

| Toggle | Default | Behavior |
|---|---|---|
| JSON responses only | On | Skips entries where `Content-Type` does not include `json` |
| Deduplicate endpoints | On | Keeps only the first occurrence of each method + normalized endpoint pair |

Static assets are always excluded regardless of toggles:
`.css`, `.js`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.map`, `.html`

### 2.3 Path Normalization
Dynamic segments are replaced with `{id}`:
- UUID patterns → `{id}`  (e.g. `/users/3f2a...` → `/users/{id}`)
- Numeric IDs → `{id}`  (e.g. `/orders/1042` → `/orders/{id}`)

### 2.4 Schema Inference
Schemas are inferred from actual payloads, not guessed.

**Request schema** — inferred from:
1. POST/PUT/PATCH JSON body (parsed if `Content-Type: application/json`)
2. Query string parameters (typed as `string` with `example` values)

**Response schema** — inferred from:
- JSON response body, up to 60KB, up to 4 levels deep

**Type inference rules**
| JS Type | JSON Schema Type |
|---|---|
| Integer number | `integer` |
| Float number | `number` |
| String | `string` |
| Boolean | `boolean` |
| Array | `array` with inferred `items` from first element |
| Object | `object` with inferred `properties` (max 20 keys) |
| null / undefined | `null` |

### 2.5 Metadata Extracted
- HTTP method and normalized endpoint
- Response status code
- `Authorization` header → auth scheme noted in `special_notes`
- `Cookie` header → "Cookie auth detected" noted in `special_notes`
- Full source URL and host stored in `special_notes` for traceability

### 2.6 Selection UI
Before importing, a filterable list of parsed entries is shown:

- **Host filter** dropdown — when HAR contains multiple domains, user filters to one
- **Checkbox list** — each entry can be individually selected/deselected
- **Select All / None** shortcuts
- Each row shows: checkbox, method badge, normalized endpoint, response status

### 2.7 Import Flow
1. User pastes HAR JSON
2. Sets toggle options
3. Clicks **Parse HAR**
4. Reviews filtered, deduplicated entry list
5. Selects/deselects entries
6. Clicks **Import N** to confirm
7. Selected entries written to `api_entries`; single `bulk_import` history event logged

---

## 3. AI Generate

Automatically fills `tool_description` and `mcp_config` for a single API entry.

### 3.1 Trigger
- Available in the API create/edit form for Editor and Admin roles only
- "AI Generate" button in the form header
- Disabled for Suggesters (suggestions go through approval; AI-assisted generation is an editor privilege)

### 3.2 Inputs Sent to Claude
- API name
- HTTP method
- Endpoint path
- Request schema (JSON)
- Response schema (JSON)

### 3.3 Outputs
| Field | Description |
|---|---|
| `tool_description` | 2–3 sentence natural language description of purpose and behavior |
| `mcp_config` | Complete MCP tool JSON with `name`, `description`, and `inputSchema` |

### 3.4 Implementation
- Model: `claude-sonnet-4-5`
- Called from a **Server Action** — never from the browser
- Response is parsed as raw JSON (no markdown fences)
- Fields are populated into the form; user can edit before saving
- Loading state shown on the button during generation

---

## 4. AI Semantic Search

Natural language search across all APIs the user has access to.

### 4.1 Trigger
- Search bar in the sidebar
- User types a query and presses Enter or clicks the search button

### 4.2 What Gets Searched
The index sent to Claude per API entry:
- `id`, `name`, `method`, `endpoint`, `tool_description`, `tags`, `group`, project name

### 4.3 Implementation
- Model: `claude-sonnet-4-5`
- Called from a **Server Action**
- Claude returns an ordered JSON array of matching `api_entry` IDs
- Results are fetched from Supabase by those IDs and displayed in the list view
- Results span across all projects (not scoped to current project)
- Each result card shows a project name badge for context

### 4.4 UI Behavior
- Loading state shown during the AI call
- Result count shown in the list subtitle: "8 results across all projects"
- A **Clear** button resets the view back to the current project list
- No results → show "No APIs match your search"
