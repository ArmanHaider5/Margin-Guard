# ADR — Evidence Sufficiency & Diagnostic Truthfulness (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Evidence Sufficiency & Diagnostic Truthfulness Architecture Decision Record |
| Status | Accepted and implemented. |
| Scope | `server/mgd/*` (the canonical MGD V1 diagnostic pipeline) only. Does **not** apply to, and does not modify, `server/v2/*` (frozen) or the legacy RCI/bulk-analysis system (`server/core/bulk-analyzer.ts`, `server/modules/diagnostics/*`), which remain architecturally separate. |
| Relationship to `docs/99_ARCHITECTURE_DECISIONS.md` | That log is explicitly scoped to decisions made during MGD **V2** implementation (its own Document Control states this). This is a V1 decision and is recorded separately for that reason, not appended there. |
| Related documents | [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md), [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) |

---

## 1. Problem

An investigation (the preceding "Canonical Diagnostic Input Integrity" milestone) established that the canonical MGD pipeline (`runMGDPipeline` → `MGDReport`) could produce a fully-formed, confident-reading diagnostic report from a client and an industry alone, with zero real transactions or documents behind it:

- `estimateOperationalHealth`'s baseline of 85 ("no detected issues = stable") is returned identically whether zero issues were found because none exist, or because nothing was analyzed at all.
- `computeEventSignals`'s neutral zero-transaction default reports `eventReadinessScore: 100`, `dispatchReliabilityScore: 100`, `assetAccountabilityScore: 100`, and every failure/delay/damage rate at 0% — numerically indistinguishable from a real measurement of excellent performance.
- Three of the seven executive-narrative sections (Operational Health, Strategic Direction, Final Conclusion) generated confident, evidence-sounding prose unconditionally — with no gate on whether any finding, root cause, or recommendation actually existed — unlike the other four sections (Executive Overview, Key Findings, Root Cause Summary, Priority Actions), which already had honest empty-evidence behavior.

None of this was literal fabrication (no fictional client names, no random values, no hardcoded findings) — it was legitimate default-value engineering whose zero-evidence case was never given its own explicit representation.

## 2. Why Numeric Neutral Defaults Are Insufficient

A neutral numeric default (85, 100, 0%) is chosen so that downstream arithmetic (subtracting penalties, computing rates with a zero denominator) never breaks. But once that number leaves the engine and reaches a report, a reader — or a re-used template, a PDF, a slide — cannot tell "the meter reads 100 because it measured excellence" from "the meter reads 100 because no measurement was ever taken." A numeric-only contract structurally cannot carry this distinction; a second, explicit signal is required.

## 3. Evidence Sufficiency Semantics

`server/mgd/evidence-sufficiency.ts` defines `EvidenceLevel = "NONE" | "PARTIAL" | "SUFFICIENT"`, computed once per pipeline run from data `runMGDPipeline` already receives (`transactions`, `documents`, `metrics`) — no new route-level bookkeeping was added.

- **NONE** — zero usable transactions were extracted, regardless of why (no documents supplied, or documents supplied but none parseable).
- **PARTIAL** — some transactions exist, but either below `MIN_SUFFICIENT_TRANSACTIONS` (currently 5 — a deliberately conservative, explicitly provisional threshold, not a scientifically derived cutoff) or one or more supplied documents contributed nothing at all.
- **SUFFICIENT** — at or above the transaction floor, and every supplied document that was successfully retrieved contributed at least one transaction.

This is explicitly **not** a diagnostic-quality or confidence score. 100 transactions from one narrow document type is a large amount of data but may still provide insufficient analytical coverage for certain conclusions — that judgement remains the job of each engine's own `confidence` fields on individual findings/root causes/recommendations. Evidence sufficiency only answers the narrower, prior question: was there meaningfully more than nothing to analyze at all.

A separate, smaller signal — `metricsSupplied` / `benchmarksAvailable` — tracks KPI/metrics evidence (which drives `benchmarks` only) independently of transactional evidence, since it is a structurally distinct input stream with no natural relationship to transaction count.

## 4. Evidence Provenance

`EvidenceSufficiency` also carries `documentStatus: "NONE_SUPPLIED" | "ALL_PARSED" | "PARTIALLY_PARSED" | "ALL_UNPARSEABLE"`, distinguishing document outcomes that the tri-level `level` alone would otherwise collapse:

- **"No documents supplied"** and **"documents supplied but completely unparseable"** both currently resolve to `level: "NONE"` (correctly — the analytical engines have zero transactions either way), but are now visibly different reasons via `documentStatus` and the human-readable `reasons[]` array, intended for logs/traces/debugging.

**Scope of "documents supplied":** this module counts a document as "supplied" once it has been successfully retrieved and handed to `runMGDPipeline`'s `documents` array. A document that failed retrieval at the route layer (`storage.getClientDocument` returned nothing) never reaches that array and is out of scope here — that failure is a route-level `[AUDIT]` log concern (`server/routes/mgd-routes.ts`), not an evidence-sufficiency concept. This is a deliberate scope-narrowing, not an oversight: the pipeline can only ever reason about what it actually received.

## 5. No-Evidence Behavior

- `runMGDPipeline` STEP 5 does not call `estimateOperationalHealth` at all when `evidence.level === "NONE"` (unless the caller explicitly provided a score via `metrics.operationalHealthScore`, which is always honoured — an explicit external assertion, not a derived estimate). `operationalHealthScore` is `null`, `healthScoreSource` is `"not_assessed"`.
- `report-composer.ts`'s pre-existing `operationalHealthScore == null → "Not Assessed"` branch in `buildVisualMetrics` — previously dead code, since the pipeline never actually produced `null` before this change — is now reachable. `operationalRiskLevel` is also set to `"Not Assessed"` in this case (previously it would default to `"Controlled"` from a zero critical-finding count, which is the same class of misrepresentation).
- `eventDiagnostics` is omitted from the report entirely (not populated with the neutral defaults) when `eventSignals.assessed` is `false`.
- Operational Health, Strategic Direction, and Final Conclusion narrative sections are replaced with an honest, section-specific "insufficient evidence" message (mirroring the pattern Key Findings/Root Cause Summary/Priority Actions already used) — via one shared mechanism (`insufficientEvidenceSection` + the `evidenceLevel` gate at the top of each function), not three separate ad hoc patches.

## 6. Partial-Evidence Behavior

Findings/root causes/recommendations/health score are computed normally (evidence above `NONE` means there is at least something real to analyze). Operational Health, Strategic Direction, and Final Conclusion prepend one shared caveat sentence (`withEvidenceCaveat`) communicating that the assessment is provisional. Benchmarks remain governed purely by whether `metrics` were supplied (unrelated to transactional partial/sufficient status — see §11).

## 7. Sufficient-Evidence Behavior

Unchanged from before this ADR. `evidenceLevel` defaults to `"SUFFICIENT"` when omitted, so any future caller that does not yet pass it gets today's unconstrained behavior — verified by a regression test asserting byte-identical narrative output between an explicit `"SUFFICIENT"` and an omitted `evidenceLevel`.

## 8. Relationship to Health Score

See §5–7. The score itself (`estimateOperationalHealth`'s formula: baseline 85, penalties per finding/root-cause/benchmark severity) is **unchanged** — this ADR only changes *whether it is computed and presented at all*, never its arithmetic. A caller-provided score (`metrics.operationalHealthScore`) always bypasses evidence-level gating, since it is an explicit external assertion the pipeline has no basis to override.

## 9. Relationship to Event Diagnostics

`EventSignals` gained one field, `assessed: boolean`, set from `totalDispatches > 0` — computed on the real, already-existing dispatch-detection logic inside `computeEventSignals`, not a new heuristic. This correctly distinguishes the early "no transactions at all" return path from the case where real transactions exist but none of them are dispatch-shaped (e.g. a purely inventory/logistics dataset) — both previously produced the same misleading perfect-scores object; both now correctly report `assessed: false`. `report-composer.ts` gates inclusion of the entire `eventDiagnostics` block on this flag, following the same "included only when there is something to say" pattern already used for `industryInsights`/`consultantInsights`.

## 10. Relationship to Narrative

See §5–7. The gating mechanism is deliberately minimal: one shared helper (`insufficientEvidenceSection`) for the NONE case and one shared helper (`withEvidenceCaveat`) for the PARTIAL case, applied identically to all three previously-ungated functions. The narrative engine was not otherwise rewritten.

## 11. Relationship to Benchmarks

The canonical wizard supplies no KPI metrics (`metrics: {}` always), so `generateBenchmarkResults` — which already silently suppresses any undefined metric rather than fabricating a value — correctly returns an empty `benchmarks` array for every wizard-originated run. This ADR does not change that function or add a benchmark-specific status field; it exposes the *reason* (`evidence.metricsSupplied === 0`, `evidence.benchmarksAvailable === false`) through the shared evidence object instead of inventing a second, redundant signal. Whether the wizard should gain a metrics-entry step is an explicit, separate product decision, out of scope here.

## 12. Backward Compatibility

`MGDReport.metadata.evidence` is optional (`evidence?: EvidenceSufficiency`). A report persisted before this change simply lacks the field; every consumer must treat its absence as **unknown**, never as `SUFFICIENT` and never reconstructed retroactively — no code in this change attempts to infer evidence sufficiency for an old report from its other fields. `EventSignals.assessed` and the narrative `evidenceLevel` parameter are handled the same way: `evidenceLevel` defaults to `"SUFFICIENT"` (preserving old unconstrained behavior) when a caller omits it, which is the only backward-compatible default that does not retroactively judge old callers. `healthScoreSource` gained a third value (`"not_assessed"`) additively — any existing equality check against `"provided"`/`"estimated"` continues to behave correctly for the cases it already handled.

## 13. Future Role of Consultant Observations

Explicitly unchanged and out of scope for this milestone. Consultant Observations remain what they were: human-provided **context**, rendered in `MGDReport.consultantInsights`, entirely independent of the Evidence Sufficiency computed here (verified by a regression test: identical evidence level and health score with or without consultant notes present, even at zero transactions). A future milestone could, in principle, treat a specific category of consultant observation (e.g. "Consultant personally verified inventory discrepancy on-site") as a distinct evidence provenance — genuinely human-origin evidence, as opposed to a stated concern that merely asserts a belief — but that requires a deliberate methodology decision (how much weight, what verification, what data model) that this ADR does not make. The conceptual boundary this ADR establishes — Documentary/System Evidence (transactions, documents) vs. Consultant-Provided Context (concerns, observations) vs. Analytical Conclusions (findings, root causes, recommendations) — is the seam a future milestone would extend, not replace.

## 14. Future Role of Business Concerns

Same boundary and same non-goal as §13. A stated concern ("management is concerned about inventory losses") is never treated as proof that inventory losses exist — it is not documentary evidence, and this ADR does not change that. It remains routed exclusively to `consultantInsights` via `generateConsultantInsights`, never to any analytical engine.

## 15. Explicit Non-Goals

- No AI, LLM, semantic embedding, or probabilistic classification of any kind — evidence sufficiency is computed by simple, deterministic counting and threshold comparison.
- No new report schema — `MGDReport` remains the sole canonical MGD report contract; evidence sufficiency is one new optional field on its existing `metadata`.
- No wiring of Business Concerns or Consultant Observations into findings/root-cause/recommendation scoring.
- No changes to the legacy RCI/bulk-analysis system (`runBulkAnalysis`, `server/modules/diagnostics/engines/*`) or to `/clients/:clientId/diagnostics/new` — that system's own evidence-sufficiency architecture, if pursued, is a distinct future consideration, not addressed here.
- No changes to `estimateOperationalHealth`'s scoring formula, `generateBenchmarkResults`'s suppression logic, or any analytical engine's detection logic — only whether/when their outputs are computed and how their absence is represented.
- No changes to any file under `server/v2/`.
