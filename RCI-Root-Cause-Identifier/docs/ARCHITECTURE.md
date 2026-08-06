# MGD V1 — Architecture

Status: production baseline (do not modify without a version bump). This document describes the system **as it actually runs today**, not as originally intended — where reality and the original design docs (`MGD_MASTER_ARCHITECTURE.md`, `MGD_BUILD_PLAYBOOK.md`) diverge, that divergence is called out explicitly, since it is one of the most important facts a new engineer needs to know.

## 1. What this repository is

`C:\Projects\ScopeOptix\MGD` is a Replit-originated workspace. The actual application lives one level down, in `RCI-Root-Cause-Identifier/`. Everything at the MGD repo root (`package.json`, `attached_assets/`, `zipFile.zip`, `.replit_integration_files/`) is workspace scaffolding or Replit-Agent residue, not part of the running app — see [TECH_DEBT.md](TECH_DEBT.md) and the "Replit-specific files" section below for the full inventory. All paths in this document are relative to `RCI-Root-Cause-Identifier/` unless stated otherwise.

The product is **RCI / Margin Guard Diagnostics (MGD)**, an AI-and-rules-assisted consulting platform: consultants upload a client's operational documents (spreadsheets, PDFs, Word docs), the platform extracts signals from them, matches those signals against curated root-cause knowledge libraries, and produces findings, root causes, cost-saving estimates, benchmarks, a narrative, and a PDF report.

## 2. Two brands, one codebase

The product has been rebranded at least twice during development without a full renaming pass:

- **RCI (Root Cause Identifier)** — the original name; still the directory name, the `.replit` workflow name, many file/class names (`rci-export-engine.tsx`, `RootCauseEntry`), and `replit.md`'s title.
- **Margin Guard (MGD)** — the current brand, "Scope Optix Platform." `replit.md` (app-level) documents this branding. MGD is also the name of the newest diagnostic pipeline (`server/mgd/*`), which is a different thing from "the product called MGD" — the pipeline predates full adoption of the brand name across the rest of the app.

Expect to see `RCI`, `MGD`, and `Margin Guard`/`Scope Optix` used interchangeably across file names, route prefixes, and UI copy. This is not a bug, but it is a source of confusion when reading code.

## 3. High-level shape

```
┌─────────────────────────────┐
│  React SPA (client/src)      │  Vite-bundled, wouter routing, TanStack Query,
│  3 role-branched route trees │  Shadcn/Radix UI, role read from /api/auth/user
└───────────────┬──────────────┘
                │ fetch (/api/*)
┌───────────────▼──────────────┐
│  Express app (server/)        │  single process, single port (5000)
│  server/app.ts (shared setup) │
│  index-dev.ts / index-prod.ts │  Vite middleware vs static file serving
└───────────────┬──────────────┘
                │
    ┌───────────┼─────────────────────────────┬───────────────────────┐
    ▼           ▼                             ▼                       ▼
Auth (Replit  Route handlers            Document pipeline        Diagnostic engines
 OIDC via      (server/system/routes.ts, (parser → CIL →          (3 parallel stacks —
 Passport)     server/routes/mgd-routes.ts,  Postgres)             see MODULES.md)
               server/api/*, src/modules/*)
    │                                          │                       │
    └──────────────────────┬───────────────────┴───────────┬───────────┘
                            ▼                               ▼
                   PostgreSQL (Drizzle ORM,           server/data/*.json
                   shared/schema.ts)                  (MGD reports + traces —
                                                       flat-file, NOT Postgres)
```

## 4. Frontend

- **Framework**: React 18 + TypeScript SPA, bundled with Vite. Entry: `client/index.html` → `client/src/main.tsx` → `client/src/App.tsx`.
- **Routing**: `wouter`. `App.tsx` does **not** define one route table — it renders one of three separate `<Switch>` trees depending on auth state and role (`unauthenticated`, `admin`, `client`), each with its own duplicated route definitions for shared pages like `/demo`, `/results/:sessionId`, `/history`. See [MODULES.md](MODULES.md) for the full route table.
- **Server state**: TanStack Query v5 (`client/src/lib/queryClient.ts`).
- **UI system**: Shadcn UI on Radix primitives, "new-york" style, Tailwind CSS, Inter font. `client/src/components/ui/*` is the full Shadcn component set (buttons, dialogs, tables, etc.) — standard, not customized in any load-bearing way.
- **Anomaly**: several live, routed page components physically live under `server/frontend/` (e.g. `server/frontend/mgd/mgd-dashboard.tsx`, routed at `/`, `/admin`, `/mgd`), reached via relative imports that climb out of `client/src`. Vite's dev-server filesystem access isn't restricted to the `client/` root, so this resolves and bundles at build time, but it is organizationally wrong — these are page-level React components, not server code. See [TECH_DEBT.md](TECH_DEBT.md).

## 5. Backend

- **Runtime**: Node.js + Express, TypeScript compiled/run via `tsx` (dev) and `esbuild` (prod bundle), ESM throughout.
- **Single shared Express app** (`server/app.ts`): configures JSON/urlencoded body parsing (with raw-body capture for potential signature verification), a request-timing logger for `/api/*`, and a global error handler. `runApp(setup)` calls `registerRoutes(app)` (mounts *all* API routes) **before** calling the dev/prod-specific `setup` callback (Vite middleware or static serving) — this ordering is deliberate so the SPA catch-all route never shadows an API route.
- **Dev vs prod**: `server/index-dev.ts` wires Vite in middleware mode with HMR against the same HTTP server and serves `client/index.html` transformed on every request. `server/index-prod.ts` serves a pre-built `server/public/` directory with an SPA fallback. Both are thin wrappers around the same `runApp`.
- **Port**: single port, default `5000`, bound to `0.0.0.0`, serving both API and client (a Replit-hosting assumption — see §8).
- **Route registration**: `server/system/routes.ts` (~1,780 lines) is the central registrar — it calls `setupAuth(app)`, mounts `/api/execution/*`, calls `registerMGDRoutes(app)` (mounts `/api/mgd/*`), and then defines the large majority of routes inline (auth, knowledge base, admin CRUD for clients/documents/analyses/cases, CIL debug endpoints, client-portal routes). Nothing is left unmounted; every route file found in the codebase is reachable. Full route inventory: [MODULES.md](MODULES.md).

## 6. Authentication

Replit OIDC via `openid-client` + Passport.js (`server/system/replitAuth.ts`), with session state stored in Postgres via `connect-pg-simple` (table `sessions`, 7-day TTL). `isAuthenticated` (exported from `replitAuth.ts`) gates most protected routes; `isAdmin` (defined inline in `routes.ts`) additionally gates all `/api/admin/*` routes by checking `storage.getUser(userId).role === "admin"`. First user to log in becomes admin automatically.

Two route groups are effectively **unauthenticated today**: all of `/api/mgd/*` (explicit comment in `mgd-routes.ts` notes auth was deliberately left off, "attach isAuthenticated in registerRoutes if you need it per-route") and `/api/execution/*` and `/api/diagnostic-route`. This is a real gap for a "production consulting platform" handling client business data — see [TECH_DEBT.md](TECH_DEBT.md).

This auth mechanism is a hard dependency on Replit's OIDC issuer (`https://replit.com/oidc`) and the `REPL_ID` environment variable — it is the single largest blocker to running this app outside Replit. See §8 and [V2_ROADMAP.md](V2_ROADMAP.md).

## 7. Data layer

- **Database**: PostgreSQL, accessed via `@neondatabase/serverless`-compatible `pg.Pool` + Drizzle ORM (`server/system/db.ts`). Single shared schema module `shared/schema.ts` (669 lines) defines every table and is imported by both server and (for types) client.
- **Storage abstraction**: `server/system/storage.ts` (739 lines) — a hand-written repository (`IStorage` interface, `DatabaseStorage` singleton) wrapping Drizzle queries per entity (users, diagnosticSessions, customProblems, clients, clientDocuments, clientAnalyses, diagnosticCases). Almost all routes go through `storage.*`; a handful of CIL debug routes in `routes.ts` query the `db` instance directly.
- **Institutional rule** (enforced at the schema/route level, per `replit.md`): every diagnostic artifact — document, analysis, case — must belong to a `Client`. There is no free-floating analysis.
- **Important exception**: the MGD pipeline (`server/mgd/*`) does **not** write its final report or execution trace to Postgres. It persists them as JSON blobs in `server/data/mgd-reports.json` / `server/data/mgd-traces.json`, guarded by an in-process mutex (`server/mgd/report-store.ts`, `server/mgd/pipeline-trace.ts`). This is not multi-instance-safe, has no transactional guarantees, and is not covered by the same backup/restore story as the database. This is the single most important data-layer fact for anyone planning to scale this app horizontally. See [DATAFLOW.md](DATAFLOW.md) and [TECH_DEBT.md](TECH_DEBT.md).

## 8. Replit coupling (summary — full inventory in TECH_DEBT.md)

The app has one **hard** runtime dependency on Replit: `server/system/replitAuth.ts` (OIDC issuer + `REPL_ID`). Everything else — three `@replit/vite-plugin-*` dev plugins, `.replit_integration_files/` (unused AI-integration scaffolding for audio/chat/image/batch), both `attached_assets/` directories (pasted Replit-Agent chat history), the root `zipFile.zip`, and a stray root-level `package.json` — is inert workspace residue with zero code-path connection to the running app, safe to delete immediately.

## 9. Design docs vs reality

`MGD_MASTER_ARCHITECTURE.md` and `MGD_BUILD_PLAYBOOK.md` (both at the `RCI-Root-Cause-Identifier/` root) describe an intended architecture — a single `/diagnostics` engine directory plus a single `/industry-models/{industry}` knowledge directory, with a strict rule that "the diagnostic engine remains unchanged" as industries are added. **This is not what was built.** In practice:

- There are **three parallel diagnostic-engine generations** (`server/core/*`, `server/modules/diagnostics/*`, `server/mgd/*`), two of which are simultaneously live in production today, not a single unified engine.
- There are **four parallel industry/root-cause knowledge locations** (`server/industries/`, `server/modules/industries/`, `shared/root-cause-library.ts` + siblings, and `server/mgd`'s own inline pattern library), not one `/industry-models` directory.

This divergence is the central architectural fact of MGD V1 and is the primary driver for the V2 roadmap. Full detail in [MODULES.md](MODULES.md) and [TECH_DEBT.md](TECH_DEBT.md).

## 10. Related documents

- [MODULES.md](MODULES.md) — every module/directory, what it does, and whether it's live or dead.
- [DATAFLOW.md](DATAFLOW.md) — concrete upload-to-report call chains for each of the three live analysis paths.
- [TECH_DEBT.md](TECH_DEBT.md) — duplication inventory, dead code, Replit-file inventory, security/data-hygiene gaps.
- [V2_ROADMAP.md](V2_ROADMAP.md) — proposed migration plan from this baseline to MGD V2.
