# ADR — Diagnostic Completeness & Detector Failure Semantics (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Diagnostic Completeness & Detector Failure Semantics |
| Status | Accepted. **No new production contract introduced** — this milestone concluded the existing Milestone 11 contract is already sufficient and minimal; a category/domain-level rollup was investigated and rejected as unsafe to construct from current code. |
| Scope | Investigation and documentation across `server/mgd/findings-engine.ts`, `root-cause-engine.ts`, `recommendation-engine.ts`, `mgd-pipeline.ts`, `pipeline-trace.ts`, `evidence-sufficiency.ts`, `diagnostic-scope.ts`, `executive-narrative-engine.ts`. Zero production files modified. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Builds directly on [MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md](MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md) (the `DetectorExecutionRecord` contract this milestone confirms is sufficient), [MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md](MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md) (Evidence Sufficiency, confirmed here to be architecturally independent of detector execution), [MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md](MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md) (the 9-category vocabulary, confirmed here to have a non-uniform, many-to-many relationship to detectors that forecloses a safe category-level completeness rollup), and [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md) (Business Concern / Consultant Observation boundaries, reconfirmed untouched by detector failure). |
| CTO position preserved | "A detector failure is not automatically an evidence failure" — confirmed true by architecture, not merely by policy (§4). |

---

## 1. Evidence Sufficiency vs. Analytical Execution Completeness

These are two distinct concepts, confirmed structurally separate by the codebase itself, not merely by convention:

- **Evidence Sufficiency** (`evidence-sufficiency.ts`) answers: *is there enough raw input data (transactions/documents/metrics) to attempt a diagnostic at all?* Computed once, early in `mgd-pipeline.ts`, strictly before Findings generation ever runs. The module has **zero imports** — no awareness of `findings-engine.ts`, `root-cause-engine.ts`, `recommendation-engine.ts`, or `pipeline-trace.ts` exists, or is possible without a structural change.
- **Analytical Execution Completeness** answers a different question: *did the analytical code that was supposed to run on that data actually run to completion?* This is exactly what Milestone 11's `DetectorExecutionRecord` (`SUCCESS`/`FAILED` per detector) already represents.

Of the four candidate concepts posed at the start of this milestone (A. Evidence Sufficiency, B. Analytical Execution Completeness, C. Diagnostic Confidence, D. Diagnostic Result Quality): **A and B are real, and already architecturally distinct** (§4 proves this via call-order and import-graph evidence, not assumption). **C already exists in the codebase in a narrower form** — `confidence: number` on individual `OperationalFinding`/`RootCause`/`OperationalRecommendation` objects — but that is per-*produced-item* certainty, not a domain-was-assessed-at-all signal; a `FAILED` detector has no confidence value because it produced no item, so C is not a substitute for B. **D was not found to be needed anywhere in the current architecture** and is not introduced — inventing it would add a fourth, overlapping status system without a concrete consumer requiring it (Phase 8's explicit "prefer one small contract" instruction, and the general instruction not to invent terminology the codebase does not need).

## 2. The Meaning of Detector Failure

A detector `FAILED` execution means: *the specific analytical check that detector performs was not completed for this run.* It does not mean "no finding exists in this domain," and it does not mean "the input evidence was insufficient." It is a statement about the analytical engine's own execution, not about the world the engine was analyzing.

## 3. Local, Not Global — With Evidence, Not Assumption

**Failure is local to the individual detector, never global to the diagnostic (Option B, not Option A).** This is proven, not assumed, by three independent architectural facts:

1. **No detector reads another detector's output within the same engine.** Every Root Cause detector and every Recommendation detector receives only the shared, already-computed `findings`/`rootCauses` arrays — never another detector's individual result. One detector throwing cannot corrupt or block any other detector's ability to run, because none of them depend on each other.
2. **The per-detector `try/catch` (Milestone 11, unchanged here) isolates failures at the call site.** A thrown exception is caught immediately after that one detector's invocation and never propagates to the loop or to sibling detectors.
3. **Verified empirically** in [detector-failure-semantics.test.ts](../server/mgd/__tests__/detector-failure-semantics.test.ts) (Case D): a deliberately-failing test detector alongside an independently-succeeding one produces the succeeding detector's full, valid, untouched output — for both the Findings engine and the Root Cause engine.

**Option C (operationally visible, no diagnostic semantic consequence) is what the codebase does *today*, and this milestone's central finding is that this is only partially correct** — see §5. It is operationally visible (Milestone 11), but §5 shows it is not entirely without diagnostic semantic consequence once the report-generation layer is considered, because that layer cannot see the trace at all.

## 4. Detector Failure and Evidence Sufficiency Do Not Interact — By Construction

Confirmed via `mgd-pipeline.ts`'s call order: `computeEvidenceSufficiency({transactions, documents, metrics})` executes and its result is bound before `generateOperationalFindingsWithExecutions(...)` is ever called. Evidence Sufficiency cannot be affected by a detector failure that has not happened yet at the point it is computed. This is a hard sequencing guarantee inside one synchronous function body, not a policy that could be silently violated by a future edit that reorders the code without anyone noticing — though it is still worth stating explicitly as an invariant to protect (§ Preserved Invariants below). The existing Evidence Sufficiency thresholds and implementation were not touched.

## 5. Report Truthfulness: A Real, But Narrow, Gap — Documented, Not Fixed

Inspection of `executive-narrative-engine.ts` (built in the Evidence Sufficiency & Diagnostic Truthfulness milestone) shows its "insufficient data" fallbacks are keyed **only** on `findings.length === 0` / `rootCauses.length === 0` / the (detector-failure-independent) `EvidenceLevel` — never on whether any detector failed. This produces a real, code-confirmed truthfulness gap:

- If **all** finding detectors for a run happen to fail (evidence being otherwise sufficient), `generateKeyFindingsNarrative` falls back to: *"Insufficient operational data was available to generate specific findings at this time."* This sentence is **false** in that scenario — the data was not insufficient; the analysis of it did not complete. [detector-failure-semantics.test.ts](../server/mgd/__tests__/detector-failure-semantics.test.ts) Case B proves the underlying mechanism: the final `findings` array is byte-identical whether a detector returned `null` (SUCCESS/0) or threw (FAILED), and `estimateOperationalHealth` — which reads only that array — produces an identical score either way.
- If **some** detectors fail and others succeed (Case D), the report proceeds confidently on the successful detectors' output with no disclosure that other checks did not complete — not "false," but incomplete in a way the reader cannot detect.

**This is not fixed in this milestone.** Wiring narrative generation (or health scoring, or report composition) to consult the `detectorExecutions` ledger is a *consumer* of Milestone 11's observability data, and Phase 10 of this milestone's own charter explicitly defers building consumers ("dashboard badges, admin monitoring UI, alerting, ... those are future consumers. This milestone should determine what those consumers would eventually consume."). This ADR determines exactly that: a future consumer wiring report truthfulness to detector failure would consume the existing `PipelineTraceStep.metadata.detectorExecutions` array — no new field is needed to enable it.

## 6. Finding Category Coverage Is Not Uniform — No Category-Level Rollup Is Safe

Traced from code (not inferred from names), the 16 Finding detectors map to the 9 categories as follows:

| Category | Detector count | Detectors |
|---|---|---|
| `inventory_visibility` | 4 | `detectInventoryStrain`, `detectEMInventoryVisibilityWeakness`, `detectInventoryShortageExposure`, `detectInventoryShortagePattern` |
| `dispatch_operations` | 3 | `detectRecurringDispatchFailure`, `detectLogisticsReliabilityDegradation`, `detectDispatchReliabilityRisk` |
| `workflow_scalability` | 2 | `detectWorkflowScalabilityRisk`, `detectClientConcentration` |
| `event_readiness` | 2 | `detectEventReadinessRisk`, `detectEventReadinessExposure` |
| `logistics_coordination` | 1 | `detectLogisticsPressure` |
| `warehouse_operations` | 1 | `detectWarehouseOperations` |
| `manpower_dependency` | 1 | `detectManualDependency` |
| `financial_leakage` | 1 | `detectFinancialLeakage` |
| `asset_management` | 1 | `detectAssetDamageRecoveryLeakage` |

**A naming trap confirmed in the wild**: `detectLogisticsReliabilityDegradation` — despite its name — is registered under `dispatch_operations`, not `logistics_coordination`. This is exactly the milestone's own warning ("do not infer semantic domains from detector names") proven necessary by a real example already in production.

Five of nine categories have exactly one detector — for those, that detector's failure means the category is **completely** unassessed for that run, with no other detector to provide even partial coverage. Four categories have 2–4 detectors, but those detectors check *different, complementary* conditions within the category (confirmed by reading each — e.g., `detectEventReadinessRisk` and `detectEventReadinessExposure` read different `EventSignals` sub-rates) rather than being interchangeable/redundant checks of the same thing. This means even a "well-covered" category does not have a clean, justifiable way to compute "X% assessed" — there is no principled weight to assign each detector's contribution to a category-level completeness score without inventing an arbitrary formula the code does not support.

**Conclusion: a category-level (or domain-level) completeness rollup is not safely constructible today**, and this milestone does not build a speculative one. The only granularity the current architecture honestly supports is **per-detector** — which Milestone 11 already delivers in full.

## 7. Findings, Root Causes, and Recommendations — Distinct but Structurally Similar Semantics

- **Findings**: a detector's failure means its specific check did not run. Whether this leaves the wider category "unassessed" depends entirely on how many other detectors cover that category (§6) — never assume any one finding detector's failure is compensated for by another unless the map above shows a real, code-confirmed overlap.
- **Root Causes**: failure never prevents causal synthesis by other detectors — proven architecturally (§3) and empirically (Case D). A Root Cause detector consumes the `findings` array, not other Root Cause detectors' output, so isolation is unconditional here, not overlap-dependent as with Findings.
- **Recommendations**: identical isolation to Root Causes (each of the 20 recommendation detectors reads only `(findings, rootCauses)`). Recommendations can and do legitimately exist despite a failed sibling detector — the successful 19 (or however many) are exactly as valid as if the 20th detector had never existed as a concept. What is lost is only whatever recommendation that specific detector might have proposed, invisibly, from the report's perspective.

## 8. Proposed Contract: None New

No new field is added to `PipelineTrace`, `PipelineTraceStep`, `MGDReport`, `OperationalFinding`, `RootCause`, `OperationalRecommendation`, `EvidenceSufficiency`, or `DiagnosticScopeItem`. The existing `DetectorExecutionRecord` (Milestone 11) already carries everything a future consumer would need: `detectorName` (which specific check), `stage` (which engine), `status` (did it complete), `outputCount`/`error` (what happened). Anything more granular (e.g., a category-level summary) would require the unsafe rollup rejected in §6; anything coarser (e.g., a single pipeline-wide "complete"/"incomplete" flag) would misrepresent the proven-local nature of failure (§3) as if it were global.

## 9. Why a Monitoring Consumer Is Deferred

Building anything that *acts* on `detectorExecutions` (a report-narrative caveat, a health-score adjustment, an admin dashboard, an alert) is a downstream design decision requiring its own scoped review — e.g., deciding exactly what sentence should appear in a report when detectors failed, and where, is a report-truthfulness design question distinct from confirming the underlying data model is sufficient to answer it. This milestone's charter explicitly separates "determine what a consumer would eventually consume" (this milestone) from "build the consumer" (future work), and this ADR's §5/§8 conclusion is that the former is complete and the latter has everything it needs to begin.

## Preserved Invariants (verified, not merely asserted)

1. `SUCCESS/0 ≠ FAILED` — verified in [detector-failure-semantics.test.ts](../server/mgd/__tests__/detector-failure-semantics.test.ts) Cases A/B.
2. Detector failure never silently becomes "the detector found nothing" **at the trace level** — it remains `FAILED`, always distinguishable from `SUCCESS`. (It *is* indistinguishable at the analytical-output/findings-array level — §5 — which is exactly the gap this ADR documents as future work, not a violated invariant of Milestone 11's own contract.)
3. Pipeline continuation is intact — unchanged from Milestone 11, reverified by the full suite.
4. A detector failure cannot alter Evidence Sufficiency — proven architecturally (§4).
5. A Business Concern remains a Business Concern — `buildDiagnosticScope` takes only `businessConcerns` and the (detector-failure-independent) evidence level; no parameter exists through which a detector failure could reach it. Verified in [detector-failure-semantics.test.ts](../server/mgd/__tests__/detector-failure-semantics.test.ts).
6. A Consultant Observation remains a Consultant Observation — `consultant-notes-engine.ts` was not touched and has no dependency on detector execution.
7. No Analytical Conclusion (Finding/Root Cause/Recommendation) claims stronger certainty than its own successful execution supports — each item's `confidence` is computed solely from its own detector's real logic; nothing about a *different*, failed detector inflates it.
8. Historical traces remain readable — no interface change was made in this milestone (none was needed).

## Frozen Boundaries Honored

No detector logic, threshold, Finding Category vocabulary, Evidence Sufficiency implementation, or Diagnostic Scope behavior was changed. No AI, embeddings, keyword matching, or semantic classification was introduced. `server/v2/*` and the legacy RCI/bulk-analysis system were not touched. Zero production files were modified — this is a pure investigation-and-documentation milestone, confirmed by `git diff --stat` showing changes only to the new test file and new/updated documentation.
