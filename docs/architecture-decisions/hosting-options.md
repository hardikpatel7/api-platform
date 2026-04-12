# Hosting Options

Hosting a Next.js 14 + Supabase + AI app involves three separate concerns: the frontend/API layer, the database/auth layer, and (for AI features) external API calls billed separately. This document maps the main hosting categories, their real costs, and when each makes sense for a small team.

---

## Hosting Categories

### 1. Serverless / JAMstack

**How it works.** You push code; the platform builds a static bundle and deploys it to a CDN. Dynamic routes and API routes run as short-lived serverless functions spun up per request. There is no server process you own or manage.

**Providers**

| Provider | Notes |
|---|---|
| Vercel | Best-in-class Next.js support (same company). Free tier is generous for hobby/small-team use. |
| Netlify | Comparable feature set; slightly weaker Next.js adapter for App Router edge cases. |
| Cloudflare Pages | Fastest global CDN; functions run on Workers runtime (not Node.js — some npm packages break). |

**Cold starts.** A cold start happens when no instance of your function is already warm. On Vercel's free tier, functions with no recent traffic can add 200–800 ms to the first request. Warm functions respond in single-digit milliseconds. For this app, cold starts affect AI generate routes and import routes more than read-heavy pages.

**Backend limitations.** Functions are stateless and short-lived. The default max execution time on Vercel's free tier is 10 seconds (Hobby) or 60 seconds (Pro). No persistent TCP connections — this matters if you try to run a WebSocket server or a persistent queue worker. Supabase sidesteps this because the DB connection is managed by Supabase's own connection pooler.

**Free tier reality (Vercel Hobby)**
- 100 GB bandwidth/month
- 100,000 function invocations/month
- 10-second function timeout
- 1 concurrent build

**When cost explodes.** Exceeding 100 GB bandwidth, running functions that loop or time out repeatedly, or deploying to a team account (requires Pro at $20/user/month) will trigger billing immediately.

---

### 2. VPS / Traditional Server

**How it works.** You get a Linux VM. You install Node.js, run `next start` (or PM2), and own the process lifecycle. The server runs continuously.

**Providers with starting prices**

| Provider | Cheapest plan | RAM | Storage |
|---|---|---|---|
| Hetzner | €4/month | 2 GB | 20 GB SSD |
| DigitalOcean | $6/month | 1 GB | 25 GB SSD |
| AWS EC2 (t3.micro) | ~$8/month | 1 GB | EBS extra |
| Linode (Akamai) | $5/month | 1 GB | 25 GB SSD |

**Pros.**
- Predictable flat cost — no per-invocation surprises.
- No cold starts. The process is always running.
- Persistent connections: run WebSocket servers, background workers, or cron jobs natively.
- Hetzner is the cheapest serious option in the market at €4/month for a 2 GB ARM instance.

**Cons.**
- You manage OS updates, TLS certificates (Caddy or Certbot), deployment scripts, and restarts.
- Manual scaling: if traffic spikes, you resize the Droplet or add a load balancer manually.
- No zero-config CI/CD — you wire GitHub Actions or similar yourself.

**When VPS beats serverless on cost.** If your app has steady traffic (not bursty), runs long background tasks, or needs a worker process alongside the web server, a $6/month Droplet will be cheaper than a serverless plan by month two.

---

### 3. Backend-as-a-Service (BaaS)

**How it works.** BaaS providers handle the database, auth, storage, and sometimes the runtime so you only write application code. This project already uses Supabase as a BaaS for Postgres + Auth + RLS.

**Supabase free tier (what this project runs on)**
- 500 MB database storage
- 5 GB bandwidth
- 50,000 monthly active users
- 2 projects max
- Projects pause after 1 week of inactivity (free tier only)

**Railway** runs full-stack deploys (Next.js + any server) alongside managed Postgres. Pricing: $5/month base + usage ($0.000463/vCPU-minute, $0.000231/GB-memory-minute). For a low-traffic app, real cost is typically $5–$15/month.

**Render** offers a similar model. Free tier spins down services after 15 minutes of inactivity (same problem as cold starts, worse than Vercel). Paid starts at $7/month for a persistent web service.

**How BaaS changes the equation.** Because Supabase already handles the hardest parts (schema, RLS, auth, connection pooling), the hosting decision for this app is really only about where Next.js runs — not where the database lives. That reduces the VPS burden significantly.

**Free tier watch items.**
- Supabase pauses inactive free projects. Running a cron job or using `pg_cron` keeps the project alive.
- Row limits are not enforced; storage limits are. 500 MB covers hundreds of thousands of API entries, but binary storage (e.g. imported HAR files stored as blobs) can consume it fast.

---

### 4. Container-Based Hosting

**How it works.** You build a Docker image of your Next.js app and push it to a platform that runs containers. Unlike serverless functions, containers run a full OS process and can be configured to stay warm permanently.

**Fly.io**
- Free tier: 3 shared-CPU VMs (256 MB RAM each), 3 GB persistent storage, 160 GB outbound bandwidth.
- Paid: $0.0000022/second per shared CPU (~$1.94/month for one VM running 24/7).
- Great for apps that need persistent processes or need to run in specific regions.

**Railway**
- $5/month base + usage metering (see BaaS section above).
- Supports Dockerfile deploys alongside managed services.

**Google Cloud Run**
- Pay-per-request: first 2 million requests/month free, then $0.40 per million.
- CPU only allocated during request processing — closer to serverless than a persistent container.
- Very cheap at low scale; cost is near zero for a small internal team.
- Cold starts exist but are faster than Lambda (~100–300 ms for a Node container).

**The middle ground.** Containers give you the familiarity of `docker run` locally matching what runs in production, without managing a full VM. Fly.io and Cloud Run are strong choices if you want persistent behavior and a lower ops burden than a VPS.

---

## Comparison Table

| Platform | Starting Cost | Free Tier | Cold Starts | Scaling | Control | Best For |
|---|---|---|---|---|---|---|
| Vercel | $0 / $20 pro | Yes (generous) | Yes | Automatic | Low | Next.js apps, fast deploys |
| Netlify | $0 / $19 pro | Yes | Yes | Automatic | Low | Static + light functions |
| Cloudflare Pages | $0 / $20 pro | Yes | Minimal (Workers) | Automatic | Low | High-traffic static + edge |
| DigitalOcean Droplet | $6/month | No | No | Manual | High | Steady-traffic apps, workers |
| Hetzner VPS | €4/month | No | No | Manual | High | Cost-sensitive, EU-based teams |
| AWS EC2 | ~$8/month | 750 hrs/yr (t2.micro) | No | Manual/Auto | Very high | Enterprises already on AWS |
| Railway | $5/month + usage | Trial credits only | No (persistent) | Semi-auto | Medium | Full-stack with managed DB |
| Render | $7/month | Yes (sleeps) | Yes (free tier) | Semi-auto | Medium | Simple deploys, Heroku replacement |
| Fly.io | $0 (3 VMs) | Yes | Minimal | Semi-auto | Medium | Container apps, multi-region |
| Google Cloud Run | $0 (2M req/mo) | Yes | Yes (~200 ms) | Automatic | Medium | Low-traffic, bursty workloads |

---

## Free Tier Strategy

**The zero-cost stack for this project: Vercel + Supabase + Cloudflare.**

| Service | Free allowance | What you get |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth, 100K invocations | Next.js hosting, CI/CD, preview deploys |
| Supabase free | 500 MB DB, 5 GB bandwidth, 50K MAU | Postgres, Auth, RLS, realtime (limited) |
| Cloudflare free | Unlimited requests on proxied domains | DDoS protection, DNS, caching |

**Combined monthly cost: $0** for a small team app with moderate traffic.

**What triggers billing.**

- Vercel: exceeding 100 GB bandwidth, adding a second team member (Team plan required), or functions running longer than 10 seconds.
- Supabase: exceeding 500 MB storage (most commonly from blob/file storage, not row data). The row count itself is not limited on free.
- Supabase project pausing: free projects pause after 7 days with no activity. Mitigation: a weekly cron ping or an uptime monitor.
- Anthropic API (AI features): not a hosting cost, but Claude usage is billed per token regardless of hosting tier. Budget separately.

**Practical limits for a small team.** The free stack comfortably supports a 5–10 person team with daily active use, up to ~100,000 API entries, and several hundred AI generations per month. The first cost pressure is typically Vercel's 10-second function timeout being too short for large OpenAPI import jobs or slow AI responses, not bandwidth or DB storage.

---

## Cost Explosion Risks

**Serverless function loops.** A misconfigured retry mechanism that calls your `/api/generate` route in a loop can exhaust 100,000 monthly invocations in hours and hit Vercel's rate limits — or run up an Anthropic bill with no cap if you haven't set usage limits in the Anthropic console.

**Bandwidth overages on media-heavy apps.** This app serves JSON and text, so 100 GB/month is safe. If you add file upload/download (e.g. storing HAR files in Supabase Storage), a single 50 MB HAR file served 2,000 times consumes your entire free Vercel bandwidth budget.

**Database connection limits.** Supabase free tier allows 60 direct connections. Serverless functions open a new connection per cold start. Under high concurrency without PgBouncer (Supabase's built-in pooler), you hit connection limits. Fix: always use the Supabase client with pooling mode enabled. This is not a billing issue but causes downtime that forces an upgrade.

**Cold start + retry storms.** A slow first response (800 ms cold start) combined with an impatient client that retries after 1 second can generate 3–5x the expected function invocations. Set a minimum timeout of 5 seconds on any client fetch before retrying.

**Supabase egress.** The free tier includes 5 GB egress. If you build a public-facing API that proxies Supabase queries directly, 5 GB goes fast. Keep Supabase queries server-side and cache responses at the edge.

---

## Recommendation by Use Case

| Use Case | Recommended Platform | Reason |
|---|---|---|
| Solo project / prototype | Vercel + Supabase free | Zero cost, zero config, instant deploys |
| Small team SaaS (this project) | Vercel Hobby + Supabase free | Stays free under normal team usage; upgrade path is clear |
| Growing startup (>10 users, background jobs) | Railway or Fly.io + Supabase Pro | Persistent workers, predictable cost, no cold start issues |
| Cost-sensitive, EU team | Hetzner VPS (€4) + Supabase free | Lowest possible infra cost; worth the DevOps overhead at this price |
| Enterprise / existing AWS infra | AWS EC2 + RDS | Stays within existing contracts, IAM, and compliance tooling |
