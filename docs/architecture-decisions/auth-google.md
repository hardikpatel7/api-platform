# Architecture Decision: Adding Google OAuth

**Date:** 2026-04-12
**Status:** Proposed
**Audience:** Engineering team evaluating implementation options

---

## Overview

Google OAuth 2.0 allows users to sign in with their existing Google account instead of creating a new username and password. Teams add it to reduce friction at signup, eliminate password resets, and inherit Google's security infrastructure for credential management. This document evaluates all viable options for adding Google OAuth to this project (Next.js 14 + Supabase + Vercel) and makes a concrete recommendation based on cost, complexity, and the existing stack.

---

## How Google OAuth 2.0 Works

When a user clicks "Sign in with Google," your app redirects them to `accounts.google.com` with a set of query parameters: your client ID, the requested permission scopes (at minimum `openid` and `email`), a redirect URI pointing back to your app, and a `state` parameter you generate to prevent CSRF attacks. Google presents its own consent screen. If the user approves, Google redirects back to your app's callback URL with a short-lived `code` in the query string.

Your server then exchanges that `code` for tokens by making a POST request to `https://oauth2.googleapis.com/token`, sending the code, your client ID, your client secret, and the same redirect URI. Google responds with an `access_token` (short-lived, used to call Google APIs) and an `id_token` (a signed JWT containing the user's identity — sub, email, name, picture). The `id_token` is what you actually care about for authentication: verify its signature against Google's public keys, extract the user's identity, and create or look up your own session.

The `code` is single-use and expires in minutes. Your server is the only party that ever sees the client secret. The browser receives only the final session token your app creates — it never touches the OAuth tokens directly. This is the authorization code flow, and it is the only flow appropriate for web apps with a server component. Implicit flow (tokens returned directly to the browser) is deprecated by Google and must not be used.

---

## Implementation Options

### Option 1: Supabase Auth (Google Provider)

#### Architecture overview
Supabase Auth already handles authentication in this project. Adding Google is a configuration task: create OAuth credentials in Google Cloud Console, paste the client ID and secret into the Supabase dashboard under Authentication > Providers > Google, and add the Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`) to the Google OAuth app's authorized redirect URIs. On the frontend, call `supabase.auth.signInWithOAuth({ provider: 'google' })`. Supabase handles the redirect, code exchange, JWT issuance, and session management. The user row already exists in your `auth.users` table from Supabase's perspective — Google login creates or links the same row.

#### Setup complexity
**Low.** No new dependencies. No new API routes. The only code change is replacing or augmenting the existing email/password sign-in button with an OAuth call. Google Cloud Console setup takes approximately 10 minutes.

#### Maintenance effort
Supabase manages token refresh, session cookies, and security patches to the OAuth layer. Your responsibility is keeping the Google Cloud OAuth credentials active (they do not expire, but you must keep the consent screen verified if your app leaves "Testing" status). Zero ongoing maintenance in normal operation.

#### Vendor lock-in risk
**Medium.** You are already locked into Supabase for auth. Adding the Google provider deepens that dependency but does not add a new vendor. If you ever migrate away from Supabase, you would need to re-implement the Google flow elsewhere — but you would be migrating auth regardless.

#### Free tier
50,000 MAU free on Supabase's free plan. This is across all auth methods combined, not per-provider.

#### Scaling cost
- **1k MAU:** Free.
- **10k MAU:** Free (under 50k limit).
- **100k MAU:** Supabase Pro plan ($25/month) includes 100,000 MAU. Beyond that, $0.00325 per MAU. At 100k MAU: $25/month flat.
- Cost scales gradually. Supabase Pro at 100k MAU is $25/month total, not per-feature.

---

### Option 2: NextAuth.js (Auth.js v5)

#### Architecture overview
NextAuth.js runs as a Next.js API route handler at `/api/auth/[...nextauth]`. You configure it with the Google provider (client ID + secret from Google Cloud Console) and a session strategy (JWT for stateless, or a database adapter for persistent sessions). On sign-in, NextAuth handles the redirect and callback internally. You call `signIn('google')` from the client. If you use a database adapter for sessions, NextAuth needs its own session tables — separate from Supabase's `auth` schema, meaning two sources of truth for user identity.

#### Setup complexity
**Medium.** Installing and configuring Auth.js v5 alongside an existing Supabase setup creates dual auth systems. You must either abandon Supabase Auth entirely (and update all RLS policies that rely on `auth.uid()`) or route only Google logins through NextAuth while keeping Supabase Auth for email/password — which creates a fragmented identity model. Neither path is trivial.

#### Maintenance effort
Self-hosted means you own security patches. Auth.js v5 is still in active development and has had breaking changes between betas. You maintain the session database schema and handle token rotation logic through the adapter.

#### Vendor lock-in risk
**Low.** Open source, self-hosted. You own the code and the data. Migrating away means replacing the library, not exporting from a vendor.

#### Free tier
No cost for the library. Hosting costs only (API routes run on Vercel — included in free tier within usage limits). Session database (if used) incurs whatever your DB charges.

#### Scaling cost
- **1k–100k MAU:** Effectively free if using JWT sessions (stateless, no DB reads per request). Database-backed sessions add read load to your DB at scale.
- The library itself has no per-user cost at any scale.

---

### Option 3: Firebase Authentication

#### Architecture overview
Firebase Auth is a standalone auth service from Google. You initialize the Firebase SDK in your Next.js app, call `signInWithPopup(provider)` or `signInWithRedirect(provider)` with a `GoogleAuthProvider`, and Firebase returns a Firebase ID token. You verify that token server-side using the Firebase Admin SDK. User identity lives in Firebase's user store, separate from Supabase. Supabase RLS policies that depend on `auth.uid()` would not recognize Firebase tokens without a custom JWT integration — meaning you either replace Supabase Auth or maintain a bridge.

#### Setup complexity
**High** in the context of this project. Firebase Auth works well as a standalone auth system, but bolting it onto an existing Supabase Auth setup requires either replacing Supabase Auth (touching every RLS policy) or writing a custom JWT claim bridge so Supabase can trust Firebase tokens. Neither is a small change.

#### Maintenance effort
Firebase manages everything auth-related: token refresh, revocation, security patches. The SDK is stable and well-documented. Maintenance burden is low for auth itself, but you now have two Google Cloud projects to manage (Firebase project + OAuth credentials).

#### Vendor lock-in risk
**High.** Firebase is a Google-managed, proprietary service. User data lives in Firebase's user store. Migrating off requires exporting users (possible via Firebase Admin SDK) and re-linking them to a new auth system — manageable but nontrivial at scale.

#### Free tier
Spark plan (free): unlimited MAU for Google sign-in. Firebase Authentication has no MAU cap on the free tier for OAuth providers.

#### Scaling cost
- **1k–100k MAU:** Free for authentication. Firebase pricing for auth is based on phone auth SMS; OAuth sign-in with Google has no additional cost at any MAU level.
- Cost is zero for the auth feature itself at all realistic scales for this project.

---

### Option 4: Auth0

#### Architecture overview
Auth0 is a managed identity platform. You create an Auth0 application, configure the Google social connection in the Auth0 dashboard, and integrate via the Auth0 Next.js SDK. Auth0 handles the full OAuth flow, issues its own JWTs (Auth0 tokens, not Google tokens), and provides a universal login page. Your app trusts Auth0 tokens. Integrating with Supabase requires configuring Supabase to accept Auth0 JWTs as a custom auth provider — possible but requires generating a custom JWT secret and configuring Supabase's JWT settings.

#### Setup complexity
**High.** Auth0 is an additional vendor with its own SDK, its own concept of users and organizations, and its own management dashboard. Wiring Auth0 JWTs into Supabase's RLS requires overriding Supabase's default JWT configuration. This is documented but non-trivial and adds a configuration dependency that can break silently on key rotation.

#### Maintenance effort
Auth0 manages all auth infrastructure. Your maintenance responsibility is primarily around Auth0 application configuration, key rotation policies, and monitoring the Auth0 dashboard. Low operational burden, high vendor management overhead.

#### Vendor lock-in risk
**High.** Auth0 stores users, connection settings, rules/actions (custom auth logic), and audit logs. Migrating off requires exporting users via the Management API, re-implementing any Auth0 Actions in your new system, and updating all JWT verification logic. Auth0 intentionally makes their feature set broad to increase switching costs.

#### Free tier
25,000 MAU free. After that, pricing starts at the Essentials plan: $35/month for up to 500 MAU additional (pricing is tiered and published at auth0.com/pricing — verify current pricing before committing).

#### Scaling cost
- **1k MAU:** Free.
- **10k MAU:** Paid tier required. Approximately $240/month at 10k MAU on the Professional plan (as of 2026).
- **100k MAU:** Enterprise pricing, typically $1,000–$3,000+/month depending on features and negotiation.
- Auth0 is significantly more expensive than alternatives at scale. It is priced for enterprises that need its compliance and organizational features.

---

### Option 5: Custom OAuth (Google APIs Directly)

#### Architecture overview
You implement the OAuth 2.0 authorization code flow yourself. Create a Next.js route handler that redirects to `accounts.google.com/o/oauth2/v2/auth` with your parameters. Create a callback route handler that receives the `code`, exchanges it for tokens at `https://oauth2.googleapis.com/token`, verifies the `id_token` signature against Google's JWKS endpoint, extracts the user identity, creates or updates a user record in Supabase, and issues your own session. You manage the `state` parameter for CSRF protection, implement PKCE if needed, store refresh tokens securely, and handle token revocation on sign-out.

#### Setup complexity
**High.** Every step of the OAuth flow is your code. This includes: generating cryptographically secure `state` values, validating the `state` on callback, making the token exchange server-side, fetching and caching Google's JWKS for signature verification, handling clock skew on token expiry checks, securely storing the client secret, and writing session management. A correct implementation is 200–400 lines of security-sensitive code.

#### Maintenance effort
Highest of all options. You own every layer: token refresh logic, JWKS cache invalidation when Google rotates keys, security patches when OAuth vulnerabilities are disclosed, and session store maintenance. This is ongoing work, not a one-time cost.

#### Vendor lock-in risk
**Low.** No third-party auth vendor. You own all code and all data. Switching identity providers means replacing the Google-specific OAuth endpoints with another provider's endpoints — the session management layer is reusable.

#### Free tier
No cost beyond Google Cloud (OAuth credentials are free). No MAU limits. Infrastructure cost only.

#### Scaling cost
- **1k–100k MAU:** Effectively free. The OAuth endpoints are Google-side; your only cost is compute for the callback route handler (negligible on Vercel).
- Cost is near-zero at all scales, paid entirely in engineering time.

---

## Comparison Table

| Option | Complexity | Free Tier | Cost at 10k MAU | Scalability | Lock-in | Recommended For |
|---|---|---|---|---|---|---|
| Supabase Auth (Google) | Low | 50,000 MAU | Free | Excellent | Medium | Projects already on Supabase |
| NextAuth.js v5 | Medium | Unlimited | Free | Excellent | Low | New projects or Supabase-free stacks |
| Firebase Auth | High (in context) | Unlimited | Free | Excellent | High | Projects not using Supabase Auth |
| Auth0 | High | 25,000 MAU | ~$240/month | Excellent | High | Enterprises needing compliance/MFA |
| Custom OAuth | High | Unlimited | Free | Excellent | Low | Teams with specific compliance needs |

---

## Recommendation

### Lowest cost at scale: Supabase Auth with Google provider

For a project already running Supabase Auth, enabling the Google provider is the only option that adds Google OAuth with zero new dependencies, zero new vendors, and near-zero code changes. It remains free up to 50,000 MAU and scales at $25/month flat up to 100,000 MAU on the Pro plan. Every alternative either introduces a parallel identity system that conflicts with Supabase's `auth.uid()`-based RLS policies, or costs significantly more at scale. The correct answer here is not a tradeoff — it is the obvious choice given the existing stack.

### When NOT to choose each option

- **Supabase Auth (Google):** Do not use this if you are planning to migrate off Supabase within the next 12 months. Deepening the auth dependency makes that migration harder.
- **NextAuth.js:** Do not use this alongside Supabase Auth without fully replacing Supabase Auth first. Running two auth systems creates two user identity stores and breaks RLS policies that rely on `auth.uid()`.
- **Firebase Auth:** Do not use this if your authorization model depends on Supabase RLS. The JWT mismatch between Firebase tokens and Supabase's expected JWT format requires a custom integration that adds a new failure point.
- **Auth0:** Do not use this if cost matters at scale. At 10k MAU it costs ~$240/month for a feature that Supabase provides free. Only justified if you need Auth0-specific features like enterprise SSO, fine-grained authorization (FGA), or SOC 2 compliance reports.
- **Custom OAuth:** Do not use this unless you have a security engineer on staff or a specific compliance requirement that rules out all managed options. The implementation surface for mistakes is large and the maintenance cost is permanent.

---

## Decision for This Project

This project uses Next.js 14, Supabase Auth, and Vercel. The correct choice is **Option 1: Supabase Auth with the Google provider**. To enable it: (1) go to the Google Cloud Console, create OAuth 2.0 credentials for a web application, and add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI; (2) in the Supabase dashboard under Authentication > Providers, enable Google and paste in the client ID and secret; (3) in your sign-in UI, add a button that calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`; (4) ensure your existing `(auth)/` routes handle the OAuth callback redirect correctly — Supabase handles this automatically as long as the session is initialized in your layout. No schema changes, no new migrations, and no RLS policy changes are required.
