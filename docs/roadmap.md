# Roadmap
## Features Beyond Phase 4

> These are **out of scope** for the current build. Do not implement any item from this file unless it has been explicitly moved into a phase requirements doc.

---

## Export & Integration

- Export a full project as a Markdown or JSON file
- One-click assembly of a `claude_desktop_config.json` block from selected APIs in a project
- Auto-sync project documentation to a GitHub Gist or Notion page
- Generate a shareable read-only public link to a project

---

## Advanced AI

- AI-generated code snippets in multiple languages (Python, JavaScript, cURL) derived from request/response schemas
- "Ask your API docs" — a conversational chat interface grounded in the saved documentation of a project
- Auto-detection of schema inconsistencies or missing required fields across a project
- Suggestions for related APIs within the same project based on semantic similarity

---

## API Versioning & Lifecycle

- Side-by-side diff between v1 and v2 of the same endpoint
- Version promotion workflow (Beta → Stable) with a single approval action
- Deprecation timeline tracking — set a deprecation date and surface warnings to viewers
- Automated reminders when a deprecation date is approaching

---

## Authentication Enhancements

- SSO / OAuth login (Google, GitHub)
- Passwordless / magic link login
- Invitation-based onboarding — Admin sends an invite link that pre-sets the user's role
- Audit log export as CSV or JSON for compliance purposes

---

## Collaboration Enhancements

- Inline comments on individual API fields (e.g. comment on the response schema)
- @mention support in suggestions and comments to notify specific users
- Per-project changelog feed — a timeline of all changes across the project
- Conflict detection when approving a suggestion that was based on a now-outdated API snapshot
- Suggestion templates — reusable suggestion structures for common change patterns
