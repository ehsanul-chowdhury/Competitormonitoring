# IntelFlock

Competitor intelligence that reports what changed, why it matters, and what to do about it.

IntelFlock watches your competitors' public pages, filters out the noise, and turns real changes into a short briefing. Instead of checking pricing pages by hand or drowning in "something on this page changed" alerts, you get a prioritized feed of what actually moved.

## What it does

Add a competitor by domain. IntelFlock finds their important pages, watches them on a schedule, and compares each scan against the last snapshot. Changes that survive the noise filter are analyzed and written up, then collected into a per-workspace feed your whole team can read.

- Automatic page discovery per competitor, with manual overrides
- Scheduled scanning with content hashing to skip unchanged pages, backed by a BullMQ queue with retries and no double-processing
- Word-level diffing with a noise filter for rotating and templated content
- Change briefings with an impact rating and recommended next steps
- Per-page scan and change history
- Full-text search across competitors and changes
- An assistant that answers questions from your workspace's tracked activity
- Multi-workspace teams with role-based access

## Why it is different

Most tools in this space fall into two camps. Generic page-change monitors tell you that a page changed, then leave you to work out whether it mattered. Enterprise competitive intelligence suites are thorough but heavy, expensive, and slow to set up. IntelFlock is built around four choices that close that gap.

**It finds the pages for you.** Point it at a domain and it reads `robots.txt`, walks the declared sitemaps, falls back to scraping homepage links when there is no sitemap, then ranks and classifies what it finds into pricing, product, customer story, integration, positioning, homepage, and blog. Ambiguous candidates get an extra content fetch to confirm the category. You are not pasting in URLs one at a time.

**It stays quiet unless something matters.** Noise is the reason change monitoring gets abandoned. IntelFlock drops noise in two stages: content hashing discards unchanged pages before anything is diffed, then the word-level diff filters rotating and templated content. Short edits are treated as noise unless they contain a digit, so a plan moving from $29 to $39 survives while a rotating testimonial does not.

**The analysis is written against your product, not in a vacuum.** The analyzer is told what your own team sells, so the briefing explains the commercial consequence for you specifically rather than describing the diff. Every change comes back as a concrete summary, why it matters, an impact rating from low to critical, and two to four next steps. Output that does not match the expected shape is rejected rather than partly trusted, because a half-parsed analysis still reads as authoritative.

**Your competitive research stays on your own infrastructure.** The whole stack runs from this repository against your own Postgres and Redis. Nothing about which competitors you watch, or what you concluded, sits with a third-party vendor.

## Architecture

Two services share one Postgres database.

- **`/` (repository root)** is the Next.js frontend. It owns auth (Better Auth) and the browser session. Every page and API route either renders UI or proxies to the API below, and holds no business logic of its own.
- **`apps/api`** is the NestJS backend. It owns all business data (workspaces, competitors, tracked pages, scans, change events) and the scan and crawl pipeline, including the BullMQ queue that drives scanning.

The two talk over plain HTTP. The Next.js app mints a short-lived internal JWT per request to prove who the signed-in user is, and calls the Nest API with it. Nest never sees a session cookie, and re-checks workspace membership from the database on every request rather than trusting the token beyond identity. See `lib/backend-client.ts` and `apps/api/src/auth/jwt-auth.guard.ts`.

Tenant isolation is enforced at the query layer: `apps/api/src/prisma/scoped-db.ts` injects the active `workspaceId` into every read and write on tenant-owned models, and refuses the singular Prisma operations that would let an unscoped lookup through.

Outbound fetches in the scan pipeline go through an SSRF guard that resolves DNS and validates the resolved address at connection time, so a hostname cannot be repointed to a private address between the check and the request. See `apps/api/src/scan/lib/url-safety.ts`.

The Prisma schema at `prisma/schema.prisma` is the single source of truth for migrations. `apps/api/prisma/schema.prisma` is a mirror used only to generate that service's Prisma Client, so never run `prisma migrate` from `apps/api`.

## Stack

Next.js (App Router) and NestJS, TypeScript throughout, Prisma with PostgreSQL, BullMQ with Redis, Better Auth, Tailwind with shadcn/ui, Vitest.

## Setup

Requires Node 20+, pnpm, Docker (for Redis), and a PostgreSQL database.

```bash
pnpm install
cp .env.example .env.local              # database URL and auth secret
cp apps/api/.env.example apps/api/.env  # same DATABASE_URL, same INTERNAL_API_SECRET
pnpm prisma migrate dev
pnpm dev
```

`pnpm dev` starts Redis, the Nest API, and the Next.js dev server together. On a cold start the API takes a few seconds longer to compile than Next.js, so if the very first page load errors, reload once.

`INTERNAL_API_SECRET` must be identical in `.env.local` and `apps/api/.env`. It signs the internal JWT, and the API rejects any request it cannot verify.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Redis, the Nest API, and the Next.js dev server together |
| `pnpm dev:web` | Start only the Next.js dev server |
| `pnpm dev:api` | Start only the Nest API in watch mode |
| `pnpm redis` | Start just the Redis container, detached |
| `pnpm build` | Production build of the Next.js app |
| `pnpm test` | Run the test suite |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm lint` | Lint the codebase |

The API has its own scripts under `apps/api`, for example `pnpm --filter api build` and `pnpm --filter api test`.

## Layout

```
app/              Next.js routes (UI pages and thin proxy API routes)
components/       UI, grouped by feature
lib/              Auth, backend client, validation, shared helpers
prisma/           Schema and migrations (source of truth)
apps/api/         NestJS service
  src/scan/       Crawl, discovery, extraction, diffing, SSRF guard
  src/scan-queue/ BullMQ producer and worker
  src/ai/         Change analysis and the workspace assistant
  src/workspaces/ Membership and role guards
```
