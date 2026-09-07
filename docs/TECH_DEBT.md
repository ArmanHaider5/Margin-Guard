# MGD V1 — Technical Debt Inventory

This is a factual inventory, ranked roughly by impact, to inform [V2_ROADMAP.md](V2_ROADMAP.md). Nothing here has been changed — V1 remains untouched pending approval.

## 1. Three parallel diagnostic engines, two of them simultaneously live (highest impact)

**Finding**: `server/core/*` (Generation A, ~4,600 lines, OpenAI-driven), `server/modules/diagnostics/*` (Generation B, ~4,165 lines, embedded inside A), and `server/mgd/*` (Generation C, ~9,288 lines, deterministic/no-LLM) each independently implement: root-cause tree building, causal-chain/pattern detection, benchmark comparison, narrative generation, recommendation/roadmap generation, and (A/B only) cost-saving estimation and financial-impact estimation. Generation A is reached via `/admin/analyses/:id` → `POST /api/admin/analyses/:id/run`; Generation C is reached via `/mgd/*` → `POST /api/mgd/run`. **Both are live production paths today, run by the same consultants against the same clients, producing different, unreconciled results with incompatible data shapes** (the type name `RootCause` is reused with three different shapes across generations — a latent bug risk if any code ever cross-imports).

**Why this happened**: `MGD_MASTER_ARCHITECTURE.md`/`MGD_BUILD_PLAYBOOK.md` describe a single intended engine; Generation C (`server/mgd/`) appears to be a from-scratch rebuild (see `attached_assets/Pasted-Create-a-new-file-server-mgd-*` prompt files) that was never used to retire Generations A/B — it was added alongside them.

**Impact**: ~18,000 lines of overlapping logic to maintain; consultants can get two different diagnoses for the same client with no indication which is authoritative; every future root-cause/benchmark/narrative improvement has to be triaged into up to three places or it silently only fixes one engine.

**Remediation** is a product decision, not a mechanical refactor — see [V2_ROADMAP.md](V2_ROADMAP.md) Phase 2.

## 2. Four parallel industry/root-cause knowledge libraries

**Finding**: `server/industries/` (Group A), `server/modules/industries/` (Group B, 6 industries via `industry-registry.ts`), `shared/root-cause-library.ts` + siblings (Group C, self-declared "authoritative," 13-industry taxonomy, partly populated at runtime *from* Group B via `bulk-analyzer.ts`'s `registerManufacturingV2Data()` bridge), and `server/mgd/root-cause-engine.ts`'s inline 8-pattern library plus `industry-packs/event-management-pack.ts` (Group D). Manufacturing "reactive maintenance" root-cause knowledge alone is modeled redundantly in four places under the same ID (`mfg-maintenance-reactive`) with four different schemas.

**Confirmed dead**: `server/industries/manufacturing-root-cause-library.ts`, `server/industries/manufacturing-vocabulary.ts` (1-line re-export shims, zero importers), `shared/root-cause-expert-library.ts` (113 lines, zero importers, ID collisions with live groups). These three files are safe to delete immediately with no functional impact — the only pure "free" cleanup win in this category.

**Taxonomy mismatch**: Group B covers 6 industries (manufacturing, healthcare, logistics, retail, professional-services, event-management); Group C's `industry-problems.ts` covers a different 13 (construction, 5×F&B, healthcare, hospitality, hotels/Airbnb, logistics, manufacturing, oil & gas, property development). Only manufacturing/healthcare/logistics overlap. A client onboarded under `oil_gas` or `hospitality` gets problem-statement text but **no matching root-cause/benchmark/mapping data** anywhere in the codebase — this is a functional gap for roughly 10 of the 13 marketed industries, not just duplication.

**Remediation**: see [V2_ROADMAP.md](V2_ROADMAP.md) Phase 2 — this must be resolved together with item 1, since the knowledge libraries are scoped per-engine.

## 3. MGD report/trace storage bypasses Postgres

**Finding**: `server/mgd/report-store.ts` and `server/mgd/pipeline-trace.ts` persist final analysis output to `server/data/mgd-reports.json` / `server/data/mgd-traces.json` via an in-process mutex, not the database. Every other artifact in the system (documents, transactions, legacy analyses) lives in Postgres.

**Impact**: not safe for horizontal scaling (writes from one instance are invisible to others, and concurrent writes across instances can corrupt the file); no transactional guarantees; not covered by the same backup/restore/DR story as the rest of the data. For a "production consulting platform" this is a real operational risk, not a style nit — a lost `mgd-reports.json` file (disk failure, bad deploy, container recycle) means losing every MGD report ever generated, with no recovery path.

**Remediation**: migrate to a `mgd_reports`/`mgd_traces` Postgres table using the existing Drizzle/storage.ts pattern. Low-risk, mechanical change — recommended as an early V2 task independent of the engine-consolidation decision.

## 4. `server/frontend/` — React components living under `server/`

**Finding**: 11 `.tsx` files live under `server/frontend/`, reached from `client/src` via relative imports that climb out of the client root (e.g. `../../server/frontend/mgd/mgd-dashboard`). Works today only because Vite's dev-server filesystem access isn't restricted to `client/`. One file (`mgd-dashboard.tsx`) is live and routed at `/`, `/admin`, `/mgd`; five (`server/frontend/dashboard/*`) are transitively dead (only consumed by the orphaned `client/src/pages/admin/dashboard.tsx`); six more (`server/frontend/mgd/components/*` and `dashboard/dashboard.tsx`) have zero importers anywhere.

**Remediation**: move `mgd-dashboard.tsx` into `client/src/pages/`; delete the ten dead files alongside the orphaned `admin/dashboard.tsx`.

## 5. Four report-generation stacks, one of them fully dead UI over a live endpoint

**Finding**:
1. `server/reports/report-generator.ts` (1,316 lines, pdfkit) — live, legacy path.
2. `server/mgd/report-composer.ts` + `server/mgd/pdf-export.ts` (778 lines, pdfkit) — live, current/primary.
3. `client/src/features/reports/diagnostic-report-generator.ts` (62 lines, jsPDF, client-side) — live, plain-text-only, visually inconsistent with the two server-rendered PDFs.
4. `server/reports/export-pdf-generator.ts` (337 lines, pdfkit) + `rci-export-engine.tsx`/`export-preview.tsx`/`rci-cover-page.tsx` — backend route (`/api/admin/export/pdf`) still functions, but all three frontend components are orphaned (zero importers anywhere in `client/src`), so this entire "RCI Export Engine" boardroom-proposal feature is unreachable from the UI today.

**Remediation**: decide whether the RCI Export Engine (proposal-pack-style export) is a wanted feature — if yes, re-wire the UI; if no, delete the four files. Consolidate the other three onto Generation C's `pdf-export.ts` as part of the engine-consolidation work in item 1.

## 6. Unauthenticated production API surface

**Finding**: `/api/mgd/*` (all MGD routes, including report retrieval and PDF export) has **no auth middleware applied** — an explicit code comment in `mgd-routes.ts` notes this was left for later ("attach isAuthenticated in registerRoutes if you need it per-route") and was never done. `/api/execution/*` and `/api/diagnostic-route` are likewise unauthenticated.

**Impact**: for a platform whose stated audience is paying consulting clients and whose stored content is client-confidential business data (see item 8), any unauthenticated route that can read/generate reports or run analyses is a real exposure, not a theoretical one — anyone with the base URL can call `POST /api/mgd/run` or `GET /api/mgd/reports` today.

**Remediation**: high priority, low effort — wrap `registerMGDRoutes`'s router (and the execution/diagnostic-route handlers) with `isAuthenticated` (and `isAdmin` where appropriate) the same way `/api/admin/*` already is. Should not wait for V2 — recommend doing this against V1 as a hotfix once approved, independent of the broader migration.

## 7. Replit-specific files and coupling

| Item | Used by live app? | Removal risk |
|---|---|---|
| `MGD/.replit`, `RCI-Root-Cause-Identifier/.replit` (stale duplicate, different nix channel) | No — Replit hosting metadata only | Safe to delete once off Replit hosting |
| `MGD/.replit_integration_files/` (audio/batch/chat/image AI-integration scaffolding, 18 files) | No — zero imports found anywhere in `server/client/shared` | Safe to delete now |
| `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (devDependencies) | No — gated on `REPL_ID` env var, no-op outside Replit | Safe to delete now |
| `@replit/vite-plugin-runtime-error-modal` | Yes — loaded unconditionally in all builds including prod | Safe to remove/replace, low effort |
| `server/system/replitAuth.ts` (Replit OIDC + `REPL_ID` + `https://replit.com/oidc`) | **Yes — hard runtime dependency, gates nearly every route** | **Must keep until a replacement auth provider is built and cut over** — the single biggest blocker to running this app outside Replit |
| `@assets` Vite alias → `attached_assets/` | No — unused in `client/src` | Safe to remove |
| `MGD/attached_assets/` (79 pasted-prompt `.txt` files, ~1.6MB) and `RCI-Root-Cause-Identifier/attached_assets/` (16 files — reference `.docx`/screenshots, ~2.5MB) | No — zero references from app code | Safe to delete (optionally archive outside the repo for historical reference) |
| `MGD/zipFile.zip` (~39MB, a full snapshot of `RCI-Root-Cause-Identifier/` **including its own `.git/`**) | No | Safe to delete; also consider purging from git history for repo size |
| Root `MGD/package.json`/`package-lock.json` (`name: "workspace"`, unrelated/conflicting dependency versions from the real app's `package.json`) | No — deps not imported anywhere under `RCI-Root-Cause-Identifier` | Safe to delete after confirming nothing external references it |

**Bottom line**: everything except `replitAuth.ts` is inert and removable today with zero functional risk. `replitAuth.ts` requires a planned replacement (see [V2_ROADMAP.md](V2_ROADMAP.md) Phase 1).

## 8. `uploads/` — real client documents committed to git (data-hygiene / confidentiality risk)

**Finding**: `RCI-Root-Cause-Identifier/.gitignore` does not list `uploads/`, and the MGD repo root has no `.gitignore` at all. `git ls-files` confirms **89 files (~9MB) of real, multer-uploaded client business documents** are tracked in git history — client financial summaries, HR/turnover reports, and what appear to be genuine production customer files (e.g. `Harriston Factory Visit- Group Overview.pdf`, named client spreadsheets). These are also duplicated inside `zipFile.zip` (item 7).

**Impact**: this is a confidentiality issue independent of the Replit migration — anyone with repository access (including in git history, even if files are later deleted from the working tree) has these documents. Given the product's own promise of client confidentiality, this is worth flagging as the single most urgent non-architectural item in this document.

**Remediation**: (a) add `uploads/` to `.gitignore` immediately going forward; (b) move uploaded-file storage to external object storage (S3-compatible) as part of V2, since local disk was never durable on Replit's ephemeral filesystem anyway; (c) separately evaluate scrubbing historical client files from git history (a `git filter-repo`/BFG operation) — flagging for explicit user decision rather than doing unilaterally, since it rewrites history.

## 9. CIL extraction runs twice per MGD analysis

**Finding**: CIL's classify/detect-blocks/map-columns/parse-row pipeline runs once at document-upload time (persisted to `cil_transactions`) and again, independently, inside `mgd-routes.ts`'s `/api/mgd/run` handler (discarded after the request, not read from `cil_transactions`). See [DATAFLOW.md](DATAFLOW.md) §2 step 10.

**Impact**: wasted compute on every MGD run proportional to document size; a second source of truth for the same extraction that can drift from what's stored in `cil_transactions` (e.g. if CIL logic changes between upload and a later re-run).

**Remediation**: have `/api/mgd/run` read from `cil_transactions` when available, falling back to live extraction only for documents processed before CIL existed or where CIL extraction failed.

## 10. Minor items

- **Two "generic" document classifiers**: `server/cil/document-classifier.ts` and `server/mgd/document-classifier.ts` independently classify the same documents with different logic. Worth consolidating alongside item 9.
- **Duplicated route definitions in `App.tsx`**: `/demo`, `/results/:sessionId`, `/history` are defined identically in both the admin and client route trees instead of being factored into a shared sub-tree.
- **Verbose debug logging left in `replitAuth.ts`**: multiple `console.log` statements in the token-refresh path; harmless but should be removed or gated behind a debug flag before V2.
- **Error handler re-throws after responding** (`server/app.ts`): the global Express error handler sends a JSON response and then re-throws the error, which on an unhandled path can crash the Node process instead of just logging. Worth revisiting alongside a proper error-monitoring integration in V2.
- **Two `.replit` files with different nix channels** (`stable-25_05` at the workspace root vs `stable-24_05` inside `RCI-Root-Cause-Identifier/`) — cosmetic evidence of drift, no functional impact since only the root one is used for deploy, but confusing for anyone reading the repo.

## 11. Non-findings worth stating explicitly

To be clear about what is **not** broken: the core upload → parse → CIL → Postgres pipeline (item 0 in DATAFLOW.md) is coherent and has no duplication — it is a genuinely clean layer. The `storage.ts` repository pattern is consistently used. The client-bound-diagnostics institutional rule (every analysis must belong to a Client) is consistently enforced at the schema and route level. These are worth preserving as-is in V2, not just tolerated.

## 12. Root Cause detector failures are silently indistinguishable from legitimate "found nothing" (**remediated**)

**Closed defect (fixed in the "MGD Bugfix Milestone — Dispatch Planning Root Cause Defect")**: `detectDispatchPlanningDependency` (`server/mgd/root-cause-engine.ts`) referenced an undefined variable (`strongDispatch`) inside a diagnostic `console.log`. Because `generateRootCauses()`'s detector loop wraps every detector call in `try { ... } catch (err) { console.error("Detector error (skipped):", err); }`, this `ReferenceError` was thrown and silently swallowed on every single invocation of the function — meaning the "Dispatch Planning Dependency" root cause could never actually be produced in production, regardless of whether its documented trigger conditions (a "Dispatch Reliability Risk" finding, or 2+ dispatch/logistics-titled findings) were met. Fixed surgically: the log line now references the already-in-scope `logFinds.length` instead of the undefined identifier. Regression coverage: `server/mgd/__tests__/dispatch-planning-dependency.test.ts`. Side effect, expected and verified: the standard 10-transaction dispatch regression fixture now legitimately produces a 5th root cause and its health score moves from 30 to 22.

**Observability gap — remediated in the "MGD Milestone 11 — Detector Failure Observability"**: the underlying pattern (a detector that throws was indistinguishable, from any consumer's point of view, from a detector that ran cleanly and found nothing) is now closed for all three detector-loop engines. `generateOperationalFindingsWithExecutions`, `generateRootCausesWithExecutions`, and `generateOperationalRecommendationsWithExecutions` (new exports; the pre-existing plain exports are unchanged thin wrappers around the same shared loop) now return a `DetectorExecutionRecord[]` ledger alongside their normal result array, and `mgd-pipeline.ts` embeds it in each step's existing `metadata.detectorExecutions` field — additive, no `PipelineTrace`/`PipelineTraceStep` interface change, no migration needed for historical traces. Every `DetectorExecutionRecord` states `{ detectorName, stage, status: "SUCCESS" | "FAILED", outputCount? | error? }`, so a future defect of this exact shape (a typo, a bad refactor, a rename that misses one call site) in any detector across all three engines is now visible in the persisted trace (`GET /api/mgd/traces/:id`) as `status: "FAILED"` with the detector's name and error, rather than requiring someone to manually read server logs for a `console.error` line. See [MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md](MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md) and `server/mgd/__tests__/detector-failure-observability.test.ts`.

**Still out of scope, by design**: no dashboard, alerting, monitoring integration, retry logic, or automatic detector recovery was built on top of this — the trace data exists and is retrievable, but nothing yet consumes it proactively. That remains a separate, not-yet-scoped concern.

## 13. Report narrative cannot distinguish "no evidence" from "detectors failed" (**remediated**)

**Finding, confirmed in "MGD Milestone 12 — Diagnostic Completeness & Detector Failure Semantics"**: `executive-narrative-engine.ts`'s "insufficient data" fallbacks (Key Findings, Root Cause Summary, Priority Actions, and the shared `insufficientEvidenceSection` used by Operational Health/Strategic Direction/Final Conclusion) were keyed only on `findings.length === 0` / `rootCauses.length === 0` / `EvidenceLevel` — never on whether any Finding/Root Cause detector failed (`DetectorExecutionRecord.status === "FAILED"`, item 12 above). In the scenario where evidence is sufficient but a finding detector fails, the report would have rendered *"Insufficient operational data was available..."* or *"Operationally Stable"* — both false in that specific scenario, since the data was not insufficient and stability was never confirmed; the analysis of it did not complete.

**Fixed in "MGD Milestone 13 — Report Truthfulness: Detector Failure Disclosure"**: `mgd-pipeline.ts` now derives a single `hasIncompleteAnalysis: boolean` (OR-ed across the Findings/Root Cause/Recommendation steps' already-existing `detectorExecutions` ledgers) and passes it to `generateExecutiveNarrative`. When true, the pre-existing "zero results" fallback text is replaced with an honest "could not be completed" message (rather than "insufficient data"), and every section's normal content is prefixed with a single, narrow disclosure sentence — without suppressing, altering, or invalidating any successfully-produced finding, root cause, or recommendation, and without exposing any internal detector name, exception type, or message into user-facing text. See [MGD_DETECTOR_FAILURE_DISCLOSURE_ADR.md](MGD_DETECTOR_FAILURE_DISCLOSURE_ADR.md) and `server/mgd/__tests__/detector-failure-disclosure.test.ts`. The persisted report, report viewer, Presentation Mode, and PDF export all read the same computed `narrative` object, so all three consumers inherit the corrected language automatically with no further changes.

## 14. Business Concerns / Consultant Observations were analytically inert, and `diagnosticScope` had no frontend surface (**remediated**)

**Finding, confirmed in "MGD Milestone 14 — Diagnostic Intelligence Gap Reconnaissance"**: Business Concerns and Consultant Observations were collected correctly by a real 5-step wizard but never influenced findings/root causes/recommendations/health/narrative, and `diagnosticScope` — the one structured representation of "what the client asked about" — had a `diagnosticScope?:` type declared in `mgd-report-viewer.tsx` with zero actual JSX rendering anywhere. MGD ran a generic diagnostic alongside the client's stated concern rather than visibly addressing it.

**Fixed in "MGD Milestone 15 — Business Concern & Consultant Observation Correlation Architecture"**: a consultant may now explicitly select 0+ existing Finding Category areas for a concern or observation (never inferred from text — validated against the fixed vocabulary only). MGD cross-references those areas against its already-computed, unfiltered findings (`attachRelevantFindings` in `diagnostic-scope.ts`) and renders the result honestly in a new `DiagnosticScopeSection` in the report viewer, plus inline on Consultant Observation cards — without ever claiming a concern is "validated," without filtering which detectors run (Model A, not Model B — verified byte-identical findings/root-causes/recommendations with or without a selection), and without promoting either a concern or an observation to evidence. See [MGD_BUSINESS_CONCERN_CORRELATION_ADR.md](MGD_BUSINESS_CONCERN_CORRELATION_ADR.md) and `server/mgd/__tests__/business-concern-correlation.test.ts`.

**Still open**: Presentation Mode and PDF export do not yet render `diagnosticScope` or the extended consultant-note fields — only the primary report viewer does. Recorded as a small, separate follow-up, not blocking.
