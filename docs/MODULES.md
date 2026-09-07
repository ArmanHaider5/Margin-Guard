# MGD V1 — Modules

Catalog of every major directory/module in `RCI-Root-Cause-Identifier/`, what it does, and — critically, given how much duplication exists in this codebase — whether it is **live** (reachable from a route that the shipped frontend actually calls) or **dead/orphaned**. See [ARCHITECTURE.md](ARCHITECTURE.md) for how these fit together and [TECH_DEBT.md](TECH_DEBT.md) for remediation recommendations.

Legend: 🟢 Live · 🟡 Live but effectively unreachable (route exists, no UI caller) · 🔴 Dead/orphaned

---

## 1. Entry points

| File | Role |
|---|---|
| `server/app.ts` | Shared Express app: body parsing, request logger, error handler, `runApp(setup)` bootstrap |
| `server/index-dev.ts` | Dev entrypoint — Vite middleware mode, HMR, on-the-fly `index.html` transform |
| `server/index-prod.ts` | Prod entrypoint — serves pre-built `server/public/`, SPA fallback |
| `client/src/main.tsx`, `client/src/App.tsx` | React SPA entry and role-branched routing |

## 2. Routing layer

| File | Mounts | Notes |
|---|---|---|
| `server/system/routes.ts` | `/api/auth/*`, `/api/problems`, `/api/analyze`, `/api/sessions*`, `/api/knowledge/*`, `/api/industry-problems`, `/api/industries`, `/api/admin/*`, `/api/client/*`, `/api/diagnostic-route` | 🟢 Central registrar (~1,780 lines); also mounts the two files below |
| `server/routes/mgd-routes.ts` | `/api/mgd/*` (health, run, estimate-health, findings, root-causes, recommendations, benchmarks, narrative, export-pdf, reports, traces) | 🟢 **No auth middleware applied** — effectively public |
| `server/api/diagnostic-route.ts` | `POST /api/diagnostic-route` | 🟢 Single handler, normalizes free-text signals, calls the in-memory diagnostic queue. No auth. |
| `src/modules/execution/routes/execution.routes.ts` | `POST /api/execution/generate` | 🟢 Mounted at `/api/execution`; generates an "execution pack" from a root cause. Isolated module, no auth. Lives under the app's own `src/` tree (not `server/`), which is easy to miss. |

Full per-endpoint tables are not reproduced here; see route source files directly — they are the source of truth and change frequently.

## 3. Authentication & session

| File | Role |
|---|---|
| `server/system/replitAuth.ts` | 🟢 Replit OIDC + Passport + Postgres session store. Exports `setupAuth`, `isAuthenticated`. `isAdmin` is defined inline in `routes.ts`, not here. Hard Replit dependency (see ARCHITECTURE.md §6, §8). |

## 4. Data layer

| File | Role |
|---|---|
| `shared/schema.ts` | 🟢 Single Drizzle schema for the whole app (users, clients, clientDocuments, clientAnalyses, diagnosticSessions, diagnosticCases, customProblems, cilTransactions, sessions, …) |
| `server/system/db.ts` | 🟢 Drizzle + `pg.Pool` bootstrap from `DATABASE_URL` |
| `server/system/storage.ts` | 🟢 `IStorage`/`DatabaseStorage` repository — the interface almost every route uses instead of raw Drizzle calls |

## 5. Document ingestion pipeline

| File | Role |
|---|---|
| `server/documents/document-parser.ts` | 🟢 Byte-level extraction: xlsx/csv (via `xlsx`), docx (via `mammoth`), pdf (via `pdf-parse`); pptx is a stub. Produces `ExtractedDocumentData` with two parallel shapes in one pass: `sheets`/raw rows (for CIL) and `tables`/flattened text (for the legacy AI analyzer). |
| `server/cil/document-classifier.ts` | 🟢 Classifies a parsed document into a type (`sales_sheet`, `invoice`, `movement_log`, …) via weighted header/keyword/money-density scoring |
| `server/cil/column-mapper.ts` | 🟢 Maps arbitrary column headers to canonical fields via a synonym table |
| `server/cil/block-detector.ts` | 🟢 Finds repeating "operational blocks" inside a single sheet (handles Malaysian SME spreadsheet conventions, including Malay keywords) |
| `server/cil/pdf-extractor.ts` | 🟢 Converts PDF plain text into a pseudo-table so PDFs can flow through the same column-mapper/row-parser as Excel |
| `server/cil/row-parser.ts` | 🟢 Converts one row into 0–N standardized `ParsedTransaction` objects, tags transaction type, carries a debug trace |
| `server/cil/cil-pipeline.ts` | 🟢 Orchestrator: classify → detect blocks → map columns → parse rows → batch-insert into Postgres `cil_transactions`. Additive/read-only w.r.t. `document-parser.ts`'s output — this is the "Core Intelligence Layer," a structured-transaction layer built **on top of** the byte-level parser, not a competitor to it. |
| `server/cil/cil-validator.ts` | 🟢 QA layer: recomputes classification/mapping and scores a 0–100 health score against already-persisted transactions. Used by `/api/admin/documents/:id/cil-validate`. |
| `server/queues/diagnostic-queue.ts` | 🟢 In-memory `p-queue` (concurrency 2), no persistence, no Redis. Feeds `/api/execution/generate` only — **not** part of the document-upload/CIL/MGD flow. |

## 6. Diagnostic engines — three parallel generations

This is the largest single source of complexity in the codebase (~18,000 lines total, see [TECH_DEBT.md](TECH_DEBT.md) for the full duplication map). Summary:

### Generation A — `server/core/` (legacy AI-driven)

| File | Role |
|---|---|
| `server/core/bulk-analyzer.ts` | 🟢 **4,336 lines — the largest file in the codebase.** Powers `POST /api/admin/analyses/:id/run`, the main admin "Run Analysis" flow. Calls OpenAI (GPT), pulls from all three knowledge-library groups (§7), and internally invokes Generation B's `unified-diagnostic-engine.ts` and forwards its output as `mgdAnalysis` in its own response. |
| `server/core/ai-analyzer.ts` | 🟢 287 lines. Powers `POST /api/analyze` (single-symptom quick diagnosis, used by the `/demo` page). Uses Generation A's own manufacturing library (`server/industries/`), independent of `bulk-analyzer.ts`'s sourcing. |

### Generation B — `server/modules/diagnostics/`

| File | Role |
|---|---|
| `services/unified-diagnostic-engine.ts` | 🟢 135 lines, the real orchestrator. Chains 11 engines (financial impact → root-cause tree → confidence → causal chains → pattern detection → benchmarks → health score → cost savings → roadmap → narrative → next actions). **Not independently reachable from the UI** — its only live callers are `bulk-analyzer.ts` (Generation A, called twice) and its own `run-diagnostic-pipeline.ts`. |
| `pipelines/run-diagnostic-pipeline.ts` | 🟡 28-line pass-through to `unified-diagnostic-engine.ts`. Reachable via `/api/diagnostic-route`, which has no shipped frontend caller. |
| `engines/*.ts` (16 files) | 🟢 Individual engines: `root-cause-tree-engine`, `causal-chain-engine`, `consulting-narrative-engine`, `cost-saving-engine`, `financial-impact-engine`, `industry-benchmark-engine`, `next-actions-engine`, `operational-health-score-engine`, `root-cause-confidence-engine`, `root-cause-expert-engine`, `root-cause-pattern-engine`, `root-cause-scorer`, `root-cause-severity`, `root-cause-tree-engine`, `transformation-roadmap-engine`, `transformation-roadmap-templates`. All reachable only through `unified-diagnostic-engine.ts`. |

### Generation C — `server/mgd/` (current/primary, deterministic, no LLM)

| File | Role |
|---|---|
| `mgd-pipeline.ts` | 🟢 631 lines. `runMGDPipeline()` — fixed 7-step sequence (findings → root causes → severity → recommendations → benchmarks → health score → narrative → compose report), fully traced, never throws. Powers `POST /api/mgd/run`, called from `mgd-diagnostic-wizard.tsx` and `mgd-runner-page.tsx`. |
| `findings-engine.ts` | 🟢 1,591 lines — largest file in this generation. Generates `OperationalFinding[]` from transactions/signals. |
| `recommendation-engine.ts` | 🟢 1,404 lines — root-cause → recommendation detector registry with priority/timeframe/confidence. |
| `root-cause-engine.ts` | 🟢 994 lines — inline 8-pattern root-cause library (e.g. "Reactive Operational Coordination Model"), fully self-contained, does not import from `shared/` or `server/modules/industries/`. |
| `evidence-engine.ts` | 🟢 612 lines — evidence signal extraction feeding findings/root-causes. |
| `benchmark-engine.ts` | 🟢 687 lines — rate-metric threshold bands (`HEALTHY/WATCHLIST/ELEVATED/CRITICAL`). |
| `executive-narrative-engine.ts` | 🟢 745 lines — 7-section narrative report generator. |
| `industry-engine.ts` | 🟢 Pulls from `industry-packs/event-management-pack.ts` (414 lines) — a fourth, independent knowledge source, separate from all three groups in §7. |
| `event-signals.ts` | 🟢 Event-Management-specific signal vocabulary. |
| `consultant-notes-engine.ts` | 🟢 Incorporates free-text consultant notes into the pipeline. |
| `document-classifier.ts` | 🟡 A second, MGD-local document classifier, distinct from `server/cil/document-classifier.ts`. |
| `report-composer.ts` | 🟢 480 lines — assembles all engine outputs into the final `MGDReport` (`reportVersion: "MGD-V1"`). |
| `pdf-export.ts` | 🟢 778 lines — pdfkit-based PDF generator for the composed report. |
| `pipeline-trace.ts` | 🟢 300 lines — step-by-step execution tracing, persisted to `server/data/mgd-traces.json`. |
| `report-store.ts` | 🟢 JSON-file-backed persistence for composed reports, `server/data/mgd-reports.json`. **Not Postgres** — see [DATAFLOW.md](DATAFLOW.md). |

### Standalone

| File | Role |
|---|---|
| `server/diagnostics/diagnostic-export.ts` | 🟢 422 lines. PDF exporter for Generation A/B's output (PERNAS-format), mounted at `/api/admin/diagnostic-export`. |
| `server/diagnostics/diagnostic-matrix.ts` | 🔴 24 lines, zero importers anywhere. Dead. |

**Which one is "the" engine?** None — Generation A and Generation C are both live, user-reachable, and independently maintained today (A behind `/admin/analyses/:id`, C behind `/mgd/*`). Generation B is live only as an internal library consumed by A. See [TECH_DEBT.md](TECH_DEBT.md) for the consolidation decision this implies.

## 7. Industry & root-cause knowledge libraries — four parallel sources

| Group | Location | Authoritative for |
|---|---|---|
| **A** | `server/industries/` (`manufacturing-root-causes.ts` 1,397 lines, `manufacturing-diagnostic-chains.ts`, `manufacturing-kpis.ts`, `industry-profiles.ts`, `industryDetection.ts`) | Generation A's `ai-analyzer.ts` path (`/api/analyze`, `/demo`) only. Two files in this group (`manufacturing-root-cause-library.ts`, `manufacturing-vocabulary.ts`) are 1-line re-export shims to Group B with **zero importers** — dead. |
| **B** | `server/modules/industries/` — `industry-registry.ts` aggregating 6 industries (manufacturing, healthcare, logistics, retail, professional-services, event-management), each with `-root-causes.ts`/`-signals.ts`/`-benchmarks.ts`/`-mappings.ts` | Generation A's `bulk-analyzer.ts` path for signal→root-cause **scoring**, and Generation B's `unified-diagnostic-engine.ts` |
| **C** | `shared/root-cause-library.ts` (2,010 lines, self-declared "AUTHORITATIVE source"), `problem-library.ts`, `industry-problems.ts` (13-industry taxonomy: construction, 5×F&B variants, healthcare, hospitality, hotels/Airbnb, logistics, manufacturing, oil & gas, property development), `recommendation-archetypes.ts`, `root-cause-signal-map.ts`, `signal-library.ts` | The consulting-grade root-cause records (`whyItMatters`, `interventionDirection`, `archetypeIds`) rendered in the admin Knowledge UI and client-facing pages. Partly **populated at runtime from Group B** via `bulk-analyzer.ts`'s `registerManufacturingV2Data()` bridge — not fully independent data. `shared/root-cause-expert-library.ts` (113 lines) is a dead duplicate with zero importers, IDs colliding with Groups A and B. |
| **D** | `server/mgd/root-cause-engine.ts` (inline 8-pattern library) + `server/mgd/industry-packs/event-management-pack.ts` | Generation C's MGD pipeline exclusively. Shares no code or IDs with Groups A/B/C. |

Groups B and C's industry taxonomies only overlap on `manufacturing`, `healthcare`, `logistics` — a client selecting e.g. `oil_gas` or `hospitality` gets problem-statement text from Group C but no matching root-cause/benchmark/mapping data in Group B. This taxonomy mismatch is a functional gap, not just tech debt. Full detail and remediation options in [TECH_DEBT.md](TECH_DEBT.md).

## 8. Report generation — four parallel stacks

| Stack | Files | Status |
|---|---|---|
| Legacy consulting PDF | `server/reports/report-generator.ts` (1,316 lines, pdfkit) | 🟢 Live — `GET /api/admin/analyses/:id/report`, used by `admin/analysis-results.tsx` |
| MGD PDF (current/primary) | `server/mgd/report-composer.ts` (data assembly) + `server/mgd/pdf-export.ts` (778 lines, pdfkit) | 🟢 Live — `POST /api/mgd/export-pdf`, used by MGD pages |
| Client-side summary PDF | `client/src/features/reports/diagnostic-report-generator.ts` (62 lines, jsPDF) | 🟢 Live — used by `results.tsx` (legacy `/results/:sessionId` flow) |
| "RCI Export Engine" | `server/reports/export-pdf-generator.ts` (337 lines, pdfkit) + `client/src/components/rci-export-engine.tsx`, `export-preview.tsx`, `rci-cover-page.tsx` | 🟡 Backend route (`/api/admin/export/pdf`) still works; all three frontend components are orphaned (zero importers) — dead UI over a live-but-unreachable endpoint |

## 9. Frontend structure

- `client/src/App.tsx` — three role-branched `<Switch>` route trees (unauthenticated, admin/counsellor, client portal), plus a management (`/management/*`) read-only view. Full route table below.
- `client/src/pages/` — one file per page; `admin/`, `client/`, `management/`, `clients/` subfolders plus top-level `mgd-*.tsx` pages.
- `client/src/components/` — shared components; `components/ui/` is the full Shadcn set.
- `client/src/features/` — `benchmarks/`, `diagnostics/`, `reports/`, `root-cause/` — all live, imported from `results.tsx` and `analysis-results.tsx`.
- `client/src/hooks/`, `client/src/lib/`, `client/src/contexts/` — auth hook, query client, case-memory helper, role context.
- **Anomaly**: `server/frontend/` contains 11 live-and-dead-mixed `.tsx` files (see §10).

### Route table

| Path | Component | Group |
|---|---|---|
| `/` (unauthenticated) | `Landing` | Public |
| `/demo` | `Diagnose` | Public — quick demo mode, Generation A `ai-analyzer` path |
| `/` , `/admin` | `MGDDashboard` (`server/frontend/mgd/mgd-dashboard.tsx`) | Admin home |
| `/admin/clients`, `/new`, `/:id/edit`, `/:id` | `AdminClients`, `ClientForm`, `ClientDetail` | Admin — client CRUD |
| `/clients/:clientId/diagnostics/new` | `ClientDiagnosticsNew` | Admin — canonical "start a diagnostic" entry point |
| `/admin/analyses/:id` | `AnalysisResults` | Admin — Generation A/B results view |
| `/admin/knowledge` | `AdminKnowledge` | Admin — knowledge library browser |
| `/admin/cases`, `/:id` | `CasesPage`, `CaseDetailPage` | Admin — Case Memory |
| `/admin/documents/:id` | `DocumentDetail` | Admin |
| `/mgd`, `/mgd/reports`, `/mgd/report`, `/mgd/diagnostic`, `/mgd/run`, `/mgd/present` | `MGDDashboard`, `MGDReportArchive`, `MGDReportViewer`, `MGDDiagnosticWizard`, `MGDRunnerPage`, `MGDPresentationMode` | MGD (Generation C) flow |
| `/management`, `/management/clients/:id`, `/management/cases/:id` | `ManagementDashboard`, `ManagementClientDetail`, `ManagementCaseDetail` | Read-only oversight view |
| `/results/:sessionId`, `/history` (both admin and client trees) | `Results`, `History` | Legacy/shared — duplicated in both trees rather than factored out |
| `/`, `/client`, `/client/issues`, `/client/analyses/:id` | `ClientDashboard`, `ClientIssues`, `ClientAnalysisDetail` | Client portal |
| `/knowledge` (client tree) | `Knowledge` | Client portal |
| `*` | `NotFound` | Fallback |

Orphaned pages (imported in `App.tsx` but never routed): `client/src/pages/admin/dashboard.tsx` (superseded by `MGDDashboard`), `client/src/pages/mgd-report-page.tsx` (reachable only as an embedded sub-component of `mgd-runner-page.tsx`, not its own route).

## 10. `server/frontend/` anomaly

Eleven React `.tsx` files live under `server/frontend/` instead of `client/src/`:

- **Live**: `server/frontend/mgd/mgd-dashboard.tsx` — routed at `/`, `/admin`, `/mgd`.
- **Transitively dead**: `server/frontend/dashboard/{health-score-cards,risk-heatmap,root-cause-panel,benchmark-table,roadmap-panel}.tsx` — only consumed by the orphaned `admin/dashboard.tsx`.
- **Fully orphaned**: `server/frontend/dashboard/dashboard.tsx` and all five files in `server/frontend/mgd/components/`.

This works today because Vite's dev-server filesystem access isn't restricted to `client/`, but it is a structural mistake, not an intentional server/client split. Relocation is recommended before V2. See [TECH_DEBT.md](TECH_DEBT.md).

## 11. Execution module

`src/modules/execution/` (inside `RCI-Root-Cause-Identifier/`, note: **not** `server/`) — `models/` (ExecutionTask, ExecutionRisk, ExecutionConsequence, ExecutionEvidence), `services/ExecutionGenerator.ts`, `services/ConsequenceEvaluator.ts`, `services/permissions.ts`, `routes/execution.routes.ts`. Self-contained, explicitly designed not to touch existing analysis routes. Mounted at `/api/execution/generate`, converts a root cause into an "execution pack" (tasks/risks/consequences). No auth applied. Low usage signal from the rest of the app — worth confirming with product whether this is an active feature or an abandoned experiment before V2 planning.
