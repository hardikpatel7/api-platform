# Vercel: Deep-Dive Analysis

## What Vercel Provides

Vercel is a cloud platform purpose-built for frontend frameworks, with first-class support for Next.js (which Vercel created and maintains). It handles the full deployment lifecycle — build, CDN distribution, serverless function hosting, and observability — with zero configuration for standard Next.js projects. Deployments are Git-driven: pushing to any branch triggers a build and produces a live URL. It is not a general-purpose cloud provider; it has no persistent compute, no managed databases, and no container runtime.

---

## Core Features

### Static + SSR Hosting

Vercel's build pipeline analyzes a Next.js project and automatically partitions it into static pages, SSR pages, ISR pages, and API routes — no manual configuration required. Static pages are pushed to Vercel's CDN edge network (backed by multiple PoPs globally) and served with cache headers. SSR pages are rendered on-demand by serverless functions collocated in a region you select (default: `iad1`, US East).

ISR (Incremental Static Regeneration) lets you set a `revalidate` interval on any page. After the interval expires, the next request triggers a background regeneration while the stale page is still served — no user-visible latency spike. ISR is the primary tool for reducing function invocations on read-heavy pages.

**Preview deployments** are created automatically for every Git branch and pull request. Each preview is a fully isolated deployment with its own URL (e.g., `project-git-feat-foo-org.vercel.app`). They persist until the branch is deleted or the project is removed. Environment variables can be scoped per environment (production, preview, development), so preview deployments can point at a staging Supabase project.

### Serverless Functions

Every file under `app/api/` and every server action in a Next.js 14 App Router project becomes a Vercel serverless function at deploy time. There is no separate configuration step.

**Runtimes:**
- **Node.js** (default): full Node.js runtime, npm packages, file system access (read-only `/tmp`, 512 MB)
- **Edge**: stripped-down runtime (see Edge Functions section below)

**Execution limits by plan:**

| Limit | Hobby | Pro | Enterprise |
|-------|-------|-----|------------|
| Max duration | 10 seconds | 60 seconds | 900 seconds |
| Memory | 1,024 MB | 1,024 MB | 3,008 MB |
| Max response size | 4.5 MB | 4.5 MB | Negotiable |
| Payload size (request body) | 4.5 MB | 4.5 MB | — |

**Concurrency:** Vercel scales serverless functions automatically — there is no fixed concurrency ceiling you configure. However, cold starts apply. A Node.js function that has not been invoked recently (typically idle for 5–15 minutes) incurs a cold start penalty of approximately 200–400 ms. Under sustained load, functions stay warm and cold starts disappear. There is no way to pin a function to a warm instance on Hobby or Pro.

### Edge Functions

Edge Functions run on Vercel's edge infrastructure (similar to Cloudflare Workers), distributed across all CDN PoPs. They are distinct from serverless functions in three ways: they start in ~0–50 ms (no cold starts), they run before the cache, and they are severely constrained.

**Constraints:**
- No Node.js APIs — only standard Web APIs (`fetch`, `Request`, `Response`, `URL`, `crypto`, etc.)
- 1 MB compressed size limit (total, including dependencies)
- No file system access
- No native npm modules (anything requiring a C binding)

**Appropriate use cases:**
- Auth middleware: validate a JWT or session cookie and redirect/rewrite before the origin is hit
- A/B testing: split traffic by cookie or header at the edge without a round-trip
- Geolocation routing: Vercel injects `x-vercel-ip-country` headers; edge functions can route based on them
- Simple request rewrites and redirects

Edge Functions are **not** appropriate for database queries, Anthropic SDK calls, or anything requiring Node.js APIs.

### Build System

Vercel's build runner executes `next build` in a managed environment. Build output is cached between deployments; only changed files trigger re-bundling. Monorepos are supported — you set the "Root Directory" in project settings to point at a specific workspace package, and Vercel builds from there.

**Build minute budgets:**

| Plan | Included build minutes/month |
|------|------------------------------|
| Hobby | 6,000 |
| Pro | 24,000 |

A typical Next.js build runs 1–3 minutes. At 6,000 minutes/month on Hobby, that is 2,000–6,000 deploys before hitting the cap — unlikely to be a constraint in practice.

---

## Free Tier (Hobby Plan) — Exact Limits

Figures are as of Vercel's published pricing (2024/2025):

| Resource | Hobby Limit |
|----------|------------|
| Bandwidth | 100 GB/month |
| Serverless function invocations | 100,000/month |
| Serverless function duration | 100 GB-hours/month |
| Edge function invocations | 1,000,000/month |
| Deployments | Unlimited |
| Team members | 1 (solo only) |
| Custom domains | Unlimited |
| Build minutes | 6,000/month |
| Preview deployments | Unlimited |
| Analytics | Basic (48-hour data retention) |

**Important ToS note:** The Hobby plan is explicitly restricted to non-commercial personal projects per Vercel's Terms of Service. Any project that generates revenue, is used by a paying customer base, or is deployed for a business must be on the Pro plan. Vercel does enforce this and has been known to suspend accounts found to be running commercial workloads on Hobby.

---

## Pro Plan — When It Starts Costing Money

- **Base price:** $20/month per team member
- **Included resources:** 1 TB bandwidth, 1,000,000 serverless function invocations, 1,000 GB-hours function duration
- **Overage rates:**

| Resource | Overage rate |
|----------|-------------|
| Bandwidth | $0.15/GB |
| Serverless invocations | $0.60/1M invocations |
| Function duration | $0.18/GB-hour |
| Edge function invocations | $2.00/1M (after 10M included) |

A team of three developers costs $60/month before any overages. At moderate traffic (500K function invocations/month, 200 GB bandwidth), the bill stays near $60. Overages become material when bandwidth exceeds 1 TB or when AI-heavy routes (slow, memory-intensive functions) accumulate GB-hours quickly.

---

## Strengths

- **Zero-config Next.js deployment.** `git push` is the entire deploy workflow. No Dockerfiles, no nginx config, no CI pipeline required to get a production deployment.
- **First-party Next.js support.** Vercel builds Next.js; new framework features (Server Components, Partial Prerendering, Server Actions) are supported on day one, often before the community has documented them.
- **Git-driven preview environments.** Every PR gets a live URL with environment-variable isolation. This is genuinely faster for review cycles than maintaining a staging server.
- **Automatic HTTPS and CDN.** TLS certificates are provisioned and renewed automatically. Static assets are served from edge PoPs without configuration.
- **Edge middleware for auth.** Middleware running at the edge validates sessions without hitting the origin, reducing latency and serverless invocation cost for protected routes.
- **Observability.** The dashboard surfaces function logs, execution durations, error rates, and a real-time request feed. Useful for diagnosing cold start issues and timeout violations without setting up a separate logging stack.
- **No ops burden.** There is no infrastructure to maintain. No patching, no capacity planning, no on-call for host failures.

---

## Weaknesses

- **Vendor lock-in.** Vercel's proprietary primitives — Edge Config (globally replicated key-value), Vercel KV (Redis-compatible), Vercel Blob (object storage), OG Image generation — create migration friction. Any code that imports `@vercel/kv` or `@vercel/edge-config` cannot be moved to another host without rewriting those integrations.
- **No persistent server.** Serverless functions die after the response is sent. This means no WebSocket connections, no in-memory caches that survive across requests, and no connection pooling to Postgres. Every function invocation opens a new database connection unless a pooler (e.g., Supabase's PgBouncer) is in the path.
- **Cost at scale.** The per-seat Pro pricing and bandwidth overage rates make Vercel expensive relative to alternatives once a team grows past 4–5 people or bandwidth exceeds 2–3 TB/month. At 10 TB/month, a self-hosted NGINX + Cloudflare setup is meaningfully cheaper.
- **Function cold starts.** Node.js serverless functions idle for more than ~10 minutes incur 200–400 ms cold starts. This is noticeable on low-traffic routes (e.g., admin-only API endpoints) and affects the first user after a quiet period.
- **Commercial ToS on Hobby.** The Hobby plan cannot legally be used for any commercial product. Teams sometimes discover this only when their account is flagged.
- **No background jobs.** There is no native job queue or scheduled task runner. Vercel Cron (a Pro/Enterprise feature) can trigger a serverless function on a schedule, but that function still has the same 60-second duration limit. Long-running background processes must run on a separate service.
- **10-second wall on Hobby.** Any API route that takes longer than 10 seconds is killed with a 504. This is a hard limit, not a soft warning.
- **Monorepo complexity.** Projects with `pnpm` workspaces or Turborepo setups require explicit root directory configuration and sometimes custom install commands. It works, but it is not as frictionless as a single-package repo.

---

## When Vercel Is the Right Choice

- The project is a Next.js app with standard SSR, ISR, or static rendering needs
- Team size is 1–3 developers (per-seat cost is manageable)
- Iteration speed and developer experience matter more than infrastructure cost
- No requirements for persistent server processes, WebSockets, or long-running jobs
- Monthly bandwidth stays under 500 GB
- Budget ceiling is in the $0–$60/month range

---

## When Vercel Becomes Limiting or Expensive

- **Large media files.** Serving video, high-resolution images, or large downloads through Vercel burns bandwidth at $0.15/GB. A project serving 5 TB/month in media pays $600/month in bandwidth overages alone.
- **WebSockets or long-lived connections.** Serverless functions cannot hold open connections. This rules out real-time features (chat, collaborative editing) without a separate service (e.g., Ably, Pusher, or a Fly.io instance).
- **Team growth.** At $20/user/month, a 10-person team costs $200/month before any resource usage. Railway or Fly.io with a shared deployment model can serve the same project for a flat $20–$50/month.
- **Background jobs.** If the project needs scheduled tasks, queue workers, or async processing beyond what fits in a 60-second function, a separate worker runtime is required (Railway, Fly.io, Render).
- **Avoiding vendor lock-in.** If infrastructure portability is a requirement — the ability to move to AWS, GCP, or self-hosted without rewriting application code — Vercel-specific APIs should be avoided entirely.
- **High-volume AI inference.** AI generation endpoints that call third-party APIs (Anthropic, OpenAI) can run 5–15 seconds, are memory-intensive, and accumulate GB-hours quickly. At scale, these are better routed to a dedicated service with predictable pricing.

---

## Cost Minimization Strategy on Vercel

1. **Offload static assets to Cloudflare R2.** R2 has zero egress cost. Serve all images, fonts, and file attachments from R2 via a custom domain rather than through Vercel. This directly protects the 100 GB Hobby bandwidth limit and avoids $0.15/GB overages on Pro.

2. **Use ISR aggressively.** Project list pages, API detail pages, and any read-heavy route should use `revalidate` values (e.g., 60–300 seconds) to serve cached responses from the CDN. Each cache hit is not a function invocation.

3. **Route auth through Edge Middleware.** Validating the Supabase session cookie in `middleware.ts` runs at the edge (fast, separate invocation budget) instead of spinning up a Node.js function for every protected page request.

4. **Avoid Vercel-specific primitives.** Do not use `@vercel/kv`, `@vercel/edge-config`, or `@vercel/blob`. Use Supabase Storage for files, Supabase for config values, and Redis/Upstash for caching if needed. This keeps the migration path to other hosts open.

5. **Route heavy compute off Vercel.** AI inference (Anthropic SDK calls), image processing, and bulk import parsing should run on a dedicated service (Railway, Fly.io) with its own pricing rather than consuming Vercel's GB-hour budget. A 10-second Anthropic call in a 1 GB function consumes ~0.00278 GB-hours per invocation. At 10,000 monthly AI calls, that is 27.8 GB-hours — noticeable against the 100 GB-hour Hobby ceiling.

6. **Monitor function duration in the Vercel dashboard.** The Functions tab shows p50/p99 durations. Any function consistently near the timeout limit (10s Hobby, 60s Pro) should be profiled and optimized or moved off Vercel before it starts producing 504 errors in production.

---

## This Project on Vercel

This project (Next.js 14 App Router + Supabase + Anthropic SDK) is a good fit for Vercel during early development and at small team sizes. The core rendering model — SSR API detail pages, static project list with ISR — maps naturally to what Vercel does best, and Supabase's PgBouncer connection pooler resolves the most significant serverless weakness (connection exhaustion). The main risk is the AI generation routes: `lib/ai/generate.ts` and `lib/ai/search.ts` both make synchronous Anthropic SDK calls that can take 5–15 seconds depending on input size. On the Hobby plan, these routes will hit the 10-second hard limit and return 504 errors for non-trivial inputs; the Pro plan's 60-second limit provides adequate headroom, but each call is memory-intensive and will accumulate GB-hours faster than standard API routes. As usage grows, these two endpoints are the first candidates to extract into a separate service — a lightweight Railway or Fly.io worker that accepts the same inputs and proxies to Anthropic — leaving Vercel to handle only routing, SSR, and lightweight API calls.
