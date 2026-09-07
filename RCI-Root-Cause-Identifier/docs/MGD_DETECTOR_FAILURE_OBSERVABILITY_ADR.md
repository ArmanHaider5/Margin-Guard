# ADR — Detector Failure Observability (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Detector Failure Observability |
| Status | Accepted and implemented. Additive only — no analytical behavior changed. |
| Scope | `server/mgd/findings-engine.ts`, `root-cause-engine.ts`, `recommendation-engine.ts`, `mgd-pipeline.ts`, `pipeline-trace.ts`. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Directly closes the observability gap recorded as item 12 in [TECH_DEBT.md](TECH_DEBT.md), itself written during the "Dispatch Planning Root Cause Defect" bugfix milestone. Trace-level only — does not touch [MGD_FINDING_ONTOLOGY_EVIDENCE_CONTRACT_ADR.md](MGD_FINDING_ONTOLOGY_EVIDENCE_CONTRACT_ADR.md) or [MGD_FINDING_EVIDENCE_PROVENANCE_ADR.md](MGD_FINDING_EVIDENCE_PROVENANCE_ADR.md)'s conclusions about Findings/Evidence — this is execution bookkeeping, not a third evidentiary layer. |
| CTO decisions carried into this milestone | Proceed with a narrowly-scoped Detector Failure Observability milestone. Defer EventSignals-native citation architecture, additional FindingEvidence coverage, Diagnostic Scope correlation, and any broad diagnostic ontology redesign. Full `npx vitest run` is a mandatory completion gate. TypeScript baseline is 152 errors. |

---

## 1. SUCCESS / 0 Is Distinct From FAILED

Every detector invocation across the three detector-loop engines (Findings, Root Causes, Recommendations) now produces exactly one `DetectorExecutionRecord` (`pipeline-trace.ts`): `{ detectorName, stage, status: "SUCCESS" | "FAILED", outputCount?, error? }`. A detector that runs to completion and returns `null` (or, for Recommendations, a result that does not clear the confidence threshold) is recorded as `status: "SUCCESS", outputCount: 0`. A detector that throws before returning is recorded as `status: "FAILED"`, and `outputCount` is never populated in that case. These two states are structurally distinguishable at the type level (`outputCount` vs. `error` are mutually exclusive by convention, never both populated on one record) and are asserted as distinct in [detector-failure-observability.test.ts](../server/mgd/__tests__/detector-failure-observability.test.ts).

## 2. Detector Failures Do Not Silently Become "No Finding"

Before this milestone, a thrown exception inside any of the 30+ registered detectors (across the three engines) was caught by that engine's per-detector `try/catch`, logged via `console.error`, and otherwise produced no trace of the fact — a permanently-broken detector (like the historical `strongDispatch` defect) was indistinguishable, at every level a human or API consumer could inspect, from a detector that legitimately found nothing. Every trace step's `metadata.detectorExecutions` array now records that failure explicitly, with the detector's name and error, alongside every other detector's outcome for that same run.

## 3. Pipeline Continuation Remains Permitted

No exception-handling behavior changed. The per-detector `try/catch` inside each engine still catches the exception, still logs it via `console.error`, and the loop still proceeds to the next detector exactly as before. The only addition is that the `catch` block now also appends a `FAILED` record to the local `executions` array before continuing. A thrown detector still contributes nothing to `outputCount` or to the final findings/root-causes/recommendations array — this milestone did not change what a failure does to pipeline output, only what becomes visible about the fact that it happened.

## 4. Failure Metadata Is Trace-Level, Not Analytical Output

`DetectorExecutionRecord[]` is carried under the existing, already-optional `PipelineTraceStep.metadata` field (`Record<string, unknown>`), keyed `detectorExecutions`, for the `Findings Generation`, `Root Cause Generation`, and `Recommendation Generation` steps only. It is not part of `OperationalFinding`, `RootCause`, `OperationalRecommendation`, or `MGDReport` — none of those interfaces were touched. It is retrievable only via the pre-existing `GET /api/mgd/traces` / `GET /api/mgd/traces/:id` routes (which return `PipelineTrace` objects as-is), never via any report-rendering or narrative path.

## 5. Detector Failure Does Not Alter Evidence Sufficiency

`evidence-sufficiency.ts` was not inspected or modified by this milestone, has no dependency on `pipeline-trace.ts`, and is computed once per run from transactions/documents/metrics only — entirely upstream of, and independent from, findings/root-cause/recommendation generation. A detector failure inside any of those three engines cannot and does not change the computed Evidence Sufficiency level.

## 6. Detector Failure Does Not Alter Diagnostic Scope

`diagnostic-scope.ts` was not inspected or modified by this milestone. `DiagnosticScopeItem`/`buildDiagnosticScope` operate on Business Concerns and are structurally unconnected to Finding/Root Cause/Recommendation detector execution — no detector failure can affect a scope item's `UNVALIDATED`/`INSUFFICIENT_EVIDENCE` status.

## 7. Detector Failure Does Not Become a Finding or Root Cause

A `FAILED` execution record is never converted into, or represented as, an `OperationalFinding`, a `RootCause`, or an `OperationalRecommendation`. The three engines' final output arrays are built exactly as before (a failed detector simply contributes nothing, same as pre-milestone behavior) — the execution ledger is a strictly parallel, side-channel record of what happened during generation, never merged into what was generated.

## 8. Historical Traces Remain Compatible

`PipelineTraceStep.metadata` was already `Record<string, unknown>` and optional before this milestone — no interface field was added, renamed, or made required. Every trace already persisted to `server/data/mgd-traces.json` simply has no `detectorExecutions` key inside its `metadata` object; nothing reads that key as required, and `getTrace`/`listTraces`/the trace API routes return whatever shape is on disk unmodified. No migration was performed or is required — verified directly in [detector-failure-observability.test.ts](../server/mgd/__tests__/detector-failure-observability.test.ts)'s backward-compatibility test, which constructs a pre-this-milestone-shaped step object and confirms it remains structurally valid with no required new field.

## 9. Full Test Suite Is Mandatory for Detector-Loop Structural Changes

Reconfirmed per standing CTO Decision D (first established during the Finding Category Governance milestone, after a circular-import bug was caught only by the full suite, not by `npm run check`): this milestone restructured the internals of all three detector-loop engines (extracting each into a shared internal `run*Detectors` function plus two exported wrappers). `npx vitest run` was executed as the first verification step, ahead of `npm run check`/`npm run build`, and all 421 tests (410 pre-existing + 11 new) pass unchanged.

## 10. Implementation Summary

Each of `findings-engine.ts`, `root-cause-engine.ts`, and `recommendation-engine.ts` now has an internal `run*Detectors(params, detectorsOverride?)` function containing the (behaviorally unchanged) detector loop, which builds both the existing result array and a new `DetectorExecutionRecord[]`. The pre-existing exported function (`generateOperationalFindings`, `generateRootCauses`, `generateOperationalRecommendations`) is now a one-line wrapper returning only the result array — identical signature, identical behavior, every pre-existing caller (including unit tests that call these directly) unaffected. A new export per engine (`generateOperationalFindingsWithExecutions`, `generateRootCausesWithExecutions`, `generateOperationalRecommendationsWithExecutions`) returns `{ results, executions }` and is used only by `mgd-pipeline.ts`, which threads `executions` into each step's `metadata.detectorExecutions`. Each `*WithExecutions` export also accepts an optional, clearly-labeled test-only detector-list override (never passed in any real call path) — the seam that let this milestone's regression tests inject a deliberately-throwing detector without ever modifying a real production detector function.

Detector names are captured via `detector.name` (the real, declared function name) for `root-cause-engine.ts` and `recommendation-engine.ts`, whose `DETECTORS` registries hold direct references to named function declarations. `findings-engine.ts`'s `DETECTORS` registry holds small inline arrow-function wrappers (needed to normalize mixed 2-/3-argument detector signatures), whose own `.name` is not reliably the wrapped detector's name — so that registry's shape changed from `DetectorFn[]` to `{ name: string; run: DetectorFn }[]`, an explicit name/wrapper pairing. This is the only structural change to a `DETECTORS` registry; no detector function itself, its logic, its thresholds, or its position in the array changed.

## 11. Frozen Boundaries Honored

No detector logic, threshold, Finding severity, Root Cause severity, Recommendation logic, health scoring, Evidence Sufficiency, Diagnostic Scope, or FindingEvidence behavior was changed — confirmed by all 410 pre-existing tests passing unchanged. No AI, semantic matching, dashboard, frontend UI, alerting, monitoring infrastructure, retry logic, or automatic detector recovery was added. `server/v2/*` and the legacy RCI/bulk-analysis system were not touched.
