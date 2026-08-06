# MGD V1 — Data Flow

There is **no single** upload-to-report pipeline in MGD V1 — there are three, sharing the same upload/parse/CIL front end but diverging completely after that point, with different analysis engines and different persistence targets. This document traces all three concretely, file:function by file:function, plus the standalone signal-based path used by the execution module.

See [MODULES.md](MODULES.md) for what each file does in isolation, and [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together.

## 0. Shared front end: upload → parse → CIL (always runs first, automatically)

Every document a consultant uploads goes through this path regardless of which analysis engine is used later.

1. **`POST /api/admin/clients/:clientId/documents`** (`server/system/routes.ts:732`) — `multer.diskStorage` writes each file to `<cwd>/uploads/<timestamp>-<rand>-<originalname>` (destination and 50MB limit configured at `routes.ts:119-137`). No cloud object storage — local disk only.
2. `detectFileType(file.originalname)` (`server/documents/document-parser.ts:7`) classifies the extension.
3. `storage.createClientDocument({..., filePath: file.path, status: "uploaded"})` (`routes.ts:748`) — inserts into Postgres `client_documents`.
4. `201` response is sent immediately; `processDocumentInBackground(doc.id)` is then invoked **fire-and-forget** (`routes.ts:761-763`) — not queued, just an un-awaited async call. No retry or dead-letter handling if the process crashes mid-parse.
5. `processDocumentInBackground` (`routes.ts:654`):
   - a. `status → "processing"` (`routes.ts:660`)
   - b. `parseDocument(doc.filePath, doc.fileType)` (`document-parser.ts:269`) reads the file off disk and dispatches to `parseExcelFile`/`parseWordFile`/`parsePdfFile`/`parsePowerPointFile`, returning `ExtractedDocumentData` — `rawText`, `tables[]` (flattened, for the legacy AI path), `sheets[]` (raw 2-D arrays, for CIL), `keyFindings`, `dates`, `amounts`, `issues`.
   - c. `status → "processed"`, `extractedData` written to the Postgres `jsonb` column `client_documents.extracted_data` (`routes.ts:696-701`).
   - d. `runCilPipeline(doc.id, doc.clientId, doc.fileName, extractedData)` (`server/cil/cil-pipeline.ts:76`, called at `routes.ts:706`): classify (`document-classifier.ts:250`) → detect blocks per sheet (`block-detector.ts:308`) → map columns per block (`column-mapper.ts:174`) → parse each row into 0–N transactions (`row-parser.ts:91`) → batch-insert (200/batch) into Postgres `cil_transactions` (`cil-pipeline.ts:400`).

**Persistence after step 0: 100% Postgres** (`client_documents`, `cil_transactions`). No flat files.

## 1. Path A — Legacy/AI bulk analyzer (main admin flow)

Triggered from `client/src/pages/admin/analysis-results.tsx` via the "Run Analysis" action.

6. `POST /api/admin/clients/:clientId/analyses` (`routes.ts:1116`) creates a `client_analyses` row with `status: "pending"` (`storage.createClientAnalysis`, `routes.ts:1128`).
7. `POST /api/admin/analyses/:id/run` (`routes.ts:1283`):
   - `storage.getClientDocuments(analysis.clientId)` (`routes.ts:1344`) pulls already-`processed` documents (with `extractedData` from step 5c).
   - `runBulkAnalysis({documents, industry, analysisType, clientName, mode, problemStatement, ...})` (`server/core/bulk-analyzer.ts`, invoked at `routes.ts:1351`) — `aggregateDocumentData()` reads the `rawText`/`issues`/`amounts`/`dates`/`tables` fields (the "legacy path" `document-parser.ts` built specifically for this consumer), feeds them into an OpenAI-driven analysis that also draws on Generation B's `unified-diagnostic-engine.ts` and knowledge Groups A/B/C (see [MODULES.md](MODULES.md) §6–7).
   - Result written back via `storage.updateClientAnalysis(analysis.id, {findings, summary, mgdAnalysis, status: "completed", ...})` — Postgres `client_analyses.findings`/`summary`/`mgd_analysis` `jsonb` columns.
8. Report: `GET /api/admin/analyses/:id/report` → `generateAnalysisReport()` (`server/reports/report-generator.ts`, pdfkit) streams a PDF directly in the response — no separate report-storage step.

**Persistence: Postgres only** (`client_analyses`).

## 2. Path B — MGD pipeline (current/primary diagnostic flow)

Triggered from `client/src/pages/mgd-diagnostic-wizard.tsx` and `client/src/pages/mgd-runner-page.tsx`.

9. `POST /api/mgd/run` (`server/routes/mgd-routes.ts:219`) accepts `selectedDocuments` (document IDs).
10. For each doc, `storage.getClientDocument(docId)` (`mgd-routes.ts:250`) loads the Postgres row. **Important divergence from Path A/CIL**: `mgd-routes.ts` does not read the already-persisted `cil_transactions` rows — it **re-runs** CIL's building blocks in-route (`detectBlocks` → `mapColumns` → `parseRow`, `mgd-routes.ts:273-412`) directly against `doc.extractedData.sheets`/`.tables`/`.rawRows`, plus its own flat-table fallback (`extractFlatTableTransactions`, `mgd-routes.ts:89`) for pivot/frequency sheets that block-detection can't handle. This means CIL extraction logic runs twice per document — once at upload time (step 5d, persisted) and again at MGD-run time (step 10, discarded after the request).
11. `runMGDPipeline({clientName, industry, transactions, documents, metrics, consultantNotes, businessConcerns})` (`server/mgd/mgd-pipeline.ts`, invoked at `mgd-routes.ts:440`) chains: `generateOperationalFindings` → `generateRootCauses` → severity calibration → `generateOperationalRecommendations` → `generateBenchmarkResults` → health-score → `generateExecutiveNarrative` → `composeMGDReport`, tracing every step (`startTrace`/`addTraceStep`, `server/mgd/pipeline-trace.ts`). Deterministic — no LLM calls anywhere in this generation.
12. Response sent immediately with the composed `MGDReport` (`mgd-routes.ts:461-466`).
13. **Fire-and-forget** `saveReport(...)` (`server/mgd/report-store.ts:89`, called at `mgd-routes.ts:469-475`) appends the report to `server/data/mgd-reports.json` — a mutex-protected, whole-file read-modify-write. `pipeline-trace.ts` similarly appends to `server/data/mgd-traces.json`.
14. `GET /api/mgd/reports`, `/reports/:id`, `/traces`, `/traces/:id` (`mgd-routes.ts:671-753`) read back **from these JSON files**, not from Postgres.
15. Report PDF: `POST /api/mgd/export-pdf` → `generateMGDPdfReport()` (`server/mgd/pdf-export.ts:647`, pdfkit) re-runs the pipeline and streams a PDF; independent of the stored-report JSON file.

**Persistence: Postgres in (source documents), flat JSON files out (report + trace).** This is the one flow in the codebase where final analysis output does not live in the database — see [TECH_DEBT.md](TECH_DEBT.md) for the operational risk this creates (not multi-instance safe, no transactional guarantee, not covered by DB backup/restore).

## 3. Path C — Signal-based diagnostic queue (execution module only)

Not part of the document-upload flow at all — takes `industry`/`signals`/`kpiData` directly in the request body, no document IDs.

16. `POST /api/execution/generate` (`src/modules/execution/routes/execution.routes.ts:15`, mounted at `routes.ts:144`) — reads `{rootCauseId, rootCauseTitle}`, calls `generateExecutionFromRootCause` (`services/ExecutionGenerator.ts`).
17. Separately, `POST /api/diagnostic-route` (`server/api/diagnostic-route.ts`) normalizes free-text signals and calls `queueDiagnosticJob({industry, signals, kpiData})` (`server/queues/diagnostic-queue.ts:8`) — an in-memory `p-queue` (concurrency 2, no Redis, no persistence; a process restart silently drops pending jobs). This wraps `runDiagnosticPipeline` → `runUnifiedDiagnostic` (Generation B). The caller blocks on the queued promise, so "queue" here only throttles concurrency — it does not decouple request from response.

**Persistence: none** — result is returned synchronously in the HTTP response and not stored anywhere.

## 4. Summary table — persistence surface per stage

| Stage | Storage | Path |
|---|---|---|
| Raw uploaded file bytes | Local disk (`uploads/`) | All |
| `client_documents` row + `extracted_data` jsonb | Postgres | All |
| `cil_transactions` rows | Postgres | Populated at upload time (step 5d); re-derived and discarded at MGD-run time (step 10) |
| `client_analyses` row (findings/summary/mgdAnalysis) | Postgres | Path A |
| MGD composed report | **`server/data/mgd-reports.json`** (flat file, mutex-protected) | Path B |
| MGD pipeline trace | **`server/data/mgd-traces.json`** (flat file, mutex-protected) | Path B |
| Execution pack / queued diagnostic result | None — synchronous HTTP response only | Path C |

## 5. Practical implications

- **A consultant analyzing the same client through both `/admin/analyses/:id` and `/mgd/run` gets two independently-computed, independently-stored diagnoses** with no cross-linking between them beyond sharing the same source `client_documents` rows. There is no reconciliation step.
- **Horizontal scaling would break Path B silently.** The in-process mutex in `report-store.ts`/`pipeline-trace.ts` only protects against concurrent writes within a single Node process; running two instances behind a load balancer risks lost writes or corrupted JSON on the flat files, and reports written to one instance's local disk would be invisible to the other.
- **CIL extraction runs twice per MGD analysis** (once at upload, once at run time) with no shared code path re-using the persisted `cil_transactions` rows — a straightforward efficiency and consistency fix (see [TECH_DEBT.md](TECH_DEBT.md)).
