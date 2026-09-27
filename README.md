# Skill Gap Analyzer — Full-Stack Edition

A full-stack rebuild of the original Java Swing **Skill Gap Analyzer**: Next.js 15
(App Router) + TypeScript + Tailwind CSS v4. **No login, no required database** —
run `npm install && npm run dev` and the analyzer works immediately at
`http://localhost:3000`. Postgres (via Prisma) is entirely optional, only for
saved history and the company-management tools described below.

The scoring engine (`lib/scoring.ts`) is ported line-for-line from
`GapAnalyzer.java` / `ReportGenerator.java` / `CompanyDatabase.java` — same
weighted readiness formula, same recommendations, same month-by-month roadmap.

## What's included

- **Live analyzer** (`/`) — pick a company, rate 5 skills with sliders, enter
  projects/certifications, and watch the readiness score, skill-comparison
  chart, strengths/gaps, recommendations and roadmap update instantly. No
  sign-up, no login — it's the first thing you see.
- **Server-authoritative scoring** — the score you see live is computed in the
  browser for instant feedback, but every "saved" report is recomputed on the
  server before being written anywhere, so a saved report can't be tampered
  with client-side.
- **Analysis history** (`/dashboard/history`, optional) — with a database
  configured, every "Generate report" is persisted; open one to see the full
  report again or delete it. With no database, "Generate report" still works
  and shows the full report, it just isn't saved anywhere.
- **Company management** (`/admin/companies`, optional) — add, edit or remove
  dream companies and their skill benchmarks without touching code. Needs a
  database; without one, the analyzer still runs against the 10 built-in
  default companies.
- **Benchmark freshness** (optional) — keeps company skill bars reflecting
  real, current hiring demand instead of static guesses. See below.
- **Copy / Print** — the full text report (same layout as the original
  `.txt` export) can be copied to the clipboard or sent to your browser's
  print dialog to save as a PDF.

## No login, no required database — how that works

- **The analyzer itself never touches a database.** `lib/companies.ts`
  exports `getCompanies()`: with `DATABASE_URL` set it reads from Postgres,
  otherwise it returns the same 10 companies `CompanyDatabase.java` shipped
  with (`lib/scoring.ts`'s `DEFAULT_COMPANIES`). Either way, `/` renders.
- **There's no concept of a signed-in user any more.** Reports and interview
  reports still have a `userId` column in the schema (so the tables didn't
  need restructuring), but every save is attributed to one fixed local
  "Guest" row that's created automatically the first time something is
  actually saved (`lib/guest.ts`). Nothing gates who can do what — this is a
  single-user local tool, not a multi-account product.
- **Every route that needs Postgres checks first and degrades gracefully**
  (`lib/db-status.ts`'s `isDatabaseConfigured()`), instead of crashing:
  - Saving/loading history and managing companies show a plain "needs a
    database" message.
  - Submitting an interview report or generating a benchmark suggestion
    reports `{ error: "not_configured" }` (HTTP 501) — the same shape used
    for a missing `ANTHROPIC_API_KEY` or `RAPIDAPI_KEY` below, so the UI
    handles all three identically.
  - "Generate report" always works: with no database it returns the computed
    result with `saved: false`, and the UI shows "Preview only — no database
    configured" instead of an error.

If you never set `DATABASE_URL`, you'll never see a Postgres connection
attempted — `npm run dev` and every page load are unaffected by it existing
or not.

## Keeping company benchmarks current (optional, needs a database)

A hardcoded skill bar goes stale the moment a company changes its interview
bar. This project treats that as an ongoing process, not a one-time seed:

1. **Manual + cited.** Every company has an optional `sourceUrl` and a
   `lastVerifiedAt` timestamp (`/admin/companies`). Edit a benchmark by hand,
   link where the numbers came from, and the admin screen shows at a glance
   which companies haven't been checked in a while ("Verified 142d ago —
   getting stale").
2. **Crowdsourced from real interviews.** Anyone can open **Share interview
   experience** on the analyzer (`components/analyzer/InterviewReportModal.tsx`)
   to log what a real interview actually tested and what bar it felt like,
   via `POST /api/companies/:id/interview-reports`. This never changes a
   benchmark by itself.
3. **AI-researched suggestions (optional).** Click **Research with AI** on a
   company to ask Claude (via `@anthropic-ai/sdk`, `lib/ai-research.ts`) what
   that company's current hiring bar looks like. This is **off by default**
   — with no `ANTHROPIC_API_KEY` set, the button shows it isn't configured
   instead of failing.
4. **External jobs API (optional).** Click **Check job postings** to pull
   current, real job postings for that company via
   [JSearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) (a
   Google-for-Jobs search on RapidAPI) and estimate a benchmark from how
   often each skill actually shows up in those postings
   (`lib/external-jobs.ts`). Also **off by default**, same pattern as AI
   research. This is a blunt signal (a skill appearing in a job ad isn't the
   same as an interview bar, so scores cap at 9/10), which is exactly why it
   goes through the same review queue as everything else rather than writing
   directly to a company.

**None of the above ever touches live numbers by itself.** Every source —
manual notes aside — lands in a `BenchmarkSuggestion` review queue
(`/admin/companies`, the "Benchmark suggestions" panel at the top). Approving
one applies it to the `Company` row (stamping `sourceUrl`/`lastVerifiedAt`);
rejecting one discards it. This is what stops a bad crowd submission, an AI
hallucination, or a noisy job-posting read from ever silently overwriting
what students are scored against.

### Turning on the optional AI/jobs sources

Both are opt-in — the app is fully functional with neither set (and neither
does anything without `DATABASE_URL` set too, since suggestions live in Postgres).

**AI research (`ANTHROPIC_API_KEY`)**
1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys) and sign in (or create an account).
2. Add billing if you haven't already (API usage is metered, separate from any Claude.ai subscription).
3. Click **Create Key**, copy it.
4. Paste it into `.env` as `ANTHROPIC_API_KEY="sk-ant-..."` and restart the dev server (or redeploy).

**External jobs (`RAPIDAPI_KEY`)**
1. Create a free account at [rapidapi.com](https://rapidapi.com/).
2. Open the [JSearch API page](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) and subscribe to its free "Basic" plan (no card needed for the free tier at the time of writing — check current pricing on the page).
3. On that page's "Endpoints" tab, copy the `X-RapidAPI-Key` value shown in the code snippet — that's your key (it's shared across every API you subscribe to on RapidAPI, not JSearch-specific).
4. Paste it into `.env` as `RAPIDAPI_KEY="..."` and restart the dev server (or redeploy).

```
prisma/schema.prisma
  User               a single "Guest" row, not an auth table — see lib/guest.ts
  Company            + sourceUrl, lastVerifiedAt
  InterviewReport     one account of one real interview
  BenchmarkSuggestion the review queue every source writes into

app/api/companies/[id]/interview-reports/   POST · GET
app/api/companies/[id]/suggestions/
  from-reports/                             POST — averages InterviewReports into a suggestion
  research/                                 POST — asks Claude, or reports "not configured"
  external/                                 POST — checks JSearch, or reports "not configured"
app/api/suggestions/                        GET — list pending
app/api/suggestions/[id]/approve|reject/    POST

lib/ai-research.ts       researchCompanyBenchmark() + AiResearchNotConfiguredError
lib/external-jobs.ts     researchCompanyFromJobPostings() + ExternalJobsNotConfiguredError
components/analyzer/InterviewReportModal.tsx
components/admin/SuggestionsPanel.tsx
```

## Project structure

```
app/
  page.tsx                     The analyzer, directly at "/" — no login wall
  dashboard/history/           Saved reports list + detail view (optional, needs a database)
  admin/companies/             Company management + benchmark suggestions (optional, needs a database)
  api/companies/               GET list (DB or built-in defaults) / POST create (needs a database)
  api/companies/[id]/          PATCH / DELETE (needs a database)
  api/companies/[id]/interview-reports/       POST / GET
  api/companies/[id]/suggestions/from-reports/ POST — crowdsourced aggregation
  api/companies/[id]/suggestions/research/     POST — optional AI research
  api/companies/[id]/suggestions/external/     POST — optional job-postings check
  api/suggestions/              GET — pending benchmark suggestions
  api/suggestions/[id]/approve|reject/         POST
  api/reports/                 GET (history) / POST (analyze + save-if-configured)
  api/reports/[id]/            GET / DELETE a single saved report
components/
  analyzer/                    ProfileForm, ScoreGauge, SkillBars, Recommendations, Roadmap, ReportPanel, InterviewReportModal
  admin/CompanyManager.tsx     Company CRUD UI + per-company benchmark-freshness actions
  admin/SuggestionsPanel.tsx   Review queue for proposed benchmark changes
  history/DeleteReportButton.tsx
  layout/Navbar.tsx            No sign-in/out — just Analyze / History / Companies + theme toggle
lib/
  scoring.ts                   The whole analysis engine — pure functions, no DB/DOM
  companies.ts                 getCompanies() — Postgres if configured, else the built-in defaults
  db-status.ts                 isDatabaseConfigured() — the one place that checks for DATABASE_URL
  guest.ts                     The single local "Guest" user every save is attributed to
  ai-research.ts               Optional AI-research source for benchmark suggestions
  external-jobs.ts             Optional JSearch-backed job-postings source for benchmark suggestions
  prisma.ts                    Prisma client singleton (only ever queried when a database is configured)
prisma/
  schema.prisma                User (guest placeholder) + Company + Report + InterviewReport + BenchmarkSuggestion
  seed.ts                      Seeds the original 10 companies
```

## Runtime notes

- **Driver adapters**: `lib/prisma.ts` builds `PrismaClient` with `@prisma/adapter-pg`
  (`generator client { engineType = "client" }` in `schema.prisma`), so the
  query engine runs as bundled WASM and talks to Postgres directly through
  `pg` instead of a downloaded native binary. This is Prisma's recommended
  pattern for serverless/edge deploys (Vercel + Neon) — `prisma/seed.ts`
  uses the same adapter for consistency.
- **CLI commands** (`prisma generate`, `migrate dev`, `db push`) still use
  Prisma's standard native schema-engine binary, downloaded from Prisma's
  CDN on first run — completely normal, just needs the machine running
  these commands to have internet access (true of any dev machine or CI
  runner; only relevant if you're behind a restrictive corporate proxy).
  Note that `prisma generate` (run automatically by `npm install`'s
  `postinstall`) does **not** require `DATABASE_URL` to be set — it only
  needs to read `prisma/schema.prisma`.

## Setup

### 1. Install and run — this is all you need

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you're straight into the analyzer, no account,
no `.env` file, no database. Company benchmarks come from the 10 built-in
defaults.

### 2. (Optional) Add a database for history + company management

Any Postgres works — a free [Neon](https://neon.tech) project, Supabase, or
one running locally.

```bash
cp .env.example .env
```

Uncomment and fill in `DATABASE_URL` (Neon needs `?sslmode=require`), then:

```bash
npx prisma db push    # creates the tables
npm run db:seed       # seeds the 10 default companies
```

Restart `npm run dev`. `/dashboard/history` and `/admin/companies` now work;
everything you generated before still works exactly the same.

### 3. (Optional) Turn on AI research or job-postings checks

See "Turning on the optional AI/jobs sources" above — uncomment
`ANTHROPIC_API_KEY` and/or `RAPIDAPI_KEY` in `.env`. Both need `DATABASE_URL`
set too, since suggestions are stored in Postgres.

## Deploying

This is a standard Next.js app — deploys cleanly to **Vercel**, with or
without the database:

1. Push this repo to GitHub.
2. Import it in Vercel. If you want history/company-management, add
   `DATABASE_URL` (and optionally `ANTHROPIC_API_KEY`/`RAPIDAPI_KEY`) as
   environment variables — otherwise deploy with none set and the analyzer
   still works.
3. If you did add `DATABASE_URL`: after the first deploy, run
   `npx prisma db push` (e.g. locally against the prod URL) and
   `npm run db:seed` once to seed companies.

## Notes on the scoring engine

`lib/scoring.ts` has no framework or DOM dependency, so it's imported
directly by both:

- `components/analyzer/Analyzer.tsx` (client) — for the instant live preview
  as sliders move, no network round-trip needed.
- `app/api/reports/route.ts` (server) — the authoritative recalculation that
  actually gets persisted (or just returned, with no database configured),
  using the same Company data `getCompanies()` resolved.

If you ever add a second frontend (a mobile app, another dashboard), reuse
this file as-is rather than reimplementing the formula.
