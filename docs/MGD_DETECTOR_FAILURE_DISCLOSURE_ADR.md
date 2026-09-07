# ADR — Report Truthfulness: Detector Failure Disclosure (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Report Truthfulness: Detector Failure Disclosure |
| Status | Accepted and implemented. Additive only — no analytical output, threshold, Evidence Sufficiency rule, or Finding Category changed. |
| Scope | `server/mgd/mgd-pipeline.ts`, `server/mgd/executive-narrative-engine.ts`. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Closes the gap identified in [MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md](MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md) §5/§8/§9 and TECH_DEBT.md item 13, consuming the `DetectorExecutionRecord` contract established in [MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md](MGD_DETECTOR_FAILURE_OBSERVABILITY_ADR.md) exactly as that ADR's §9 anticipated a future consumer would. Preserves, unchanged, [MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md](MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md)'s NONE/PARTIAL/SUFFICIENT model and [MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md](MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md)'s vocabulary. |

---

## 1. Why FAILED Must Not Equal SUCCESS/0 in Report Language

[MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md](MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md) proved that, at the analytical-output level (the `findings`/`rootCauses` arrays consumed by health scoring and narrative), a `FAILED` detector and a `SUCCESS/0` detector are byte-identical — both simply omit a result. `estimateOperationalHealth` and every narrative section that reads those arrays therefore cannot, on their own, tell the two apart. Left uncorrected, this meant a run where evidence was sufficient but every finding detector failed would render `Operational Health Classification: Operationally Stable` and `Insufficient operational data was available to generate specific findings` — both literally false in that specific scenario, since the data was not insufficient and the operation was not confirmed stable; the relevant analysis simply did not finish. This milestone's rule: report language may only claim "no issue was found" when a `SUCCESS` execution actually supports that claim.

## 2. Why Detector Failure Is Local (Reconfirmed, Not Re-Proven)

[MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md](MGD_DETECTOR_FAILURE_SEMANTICS_ADR.md) §3/§7 already proved, architecturally and empirically, that no detector in any of the three engines reads another detector's output — a failure can never cascade. This milestone relies on that proof rather than re-deriving it: the disclosure introduced here is a single, run-wide `hasIncompleteAnalysis: boolean` precisely *because* per-detector or per-category attribution was already investigated and rejected as unsafe (Semantics ADR §6) — there is no reliable failed-detector → category → narrative-section mapping to build a narrower disclosure from. A global, narrowly-worded caveat ("some analytical checks could not be completed") is the most specific claim the architecture can honestly support without inventing an unjustified attribution scheme.

## 3. Why Report Language Must Distinguish Incomplete Analysis From No Finding

A consultant or client reading "Operationally Stable" or "no high-priority recommendations were generated" is entitled to read that as a completed, clean assessment. Silently allowing a processing failure to produce that exact same sentence would make MGD's own explainability standard (established across every prior evidence/provenance milestone in this series) inconsistent with its most consequential output — the report a client actually reads. The fix is deliberately narrow: existing confident language is preserved exactly as-is whenever it is actually warranted (Case B — real `SUCCESS/0`), and is only ever supplemented (never replaced with alarm, never suppressing real conclusions) when `hasIncompleteAnalysis` is true.

## 4. Why Internal Detector Error Details Are Never Exposed

`DetectorExecutionRecord.error` (`{name, message}`, e.g. `ReferenceError: strongDispatch is not defined`) remains exactly where Milestone 11 put it — inside `PipelineTraceStep.metadata`, retrievable only via the internal `GET /api/mgd/traces(/:id)` routes. No detector name, exception type, exception message, stack frame, or file path is passed into `executive-narrative-engine.ts` or included in any report section's `content`. The narrative receives only a boolean (`hasIncompleteAnalysis`) — the *fact* that something failed, never *what* failed or *how*. This is verified directly: [detector-failure-disclosure.test.ts](../server/mgd/__tests__/detector-failure-disclosure.test.ts)'s "no internal error detail leaks" test asserts the narrative text never contains the injected detector's name, exception type, or message, nor any stack-trace-shaped substring.

## 5. Why No New Completeness Schema Was Introduced

Per this milestone's own charter and the prior Semantics ADR's conclusion: the existing `DetectorExecutionRecord` ledger already carries everything needed. The only new piece of information — `hasIncompleteAnalysis: boolean` — is a *derived*, in-memory value computed once in `mgd-pipeline.ts` (`executions.some(e => e.status === "FAILED")`, OR-ed across the three engines' steps) and threaded as a plain parameter into `generateExecutiveNarrative`. It is not a new persisted table, not a new trace-step shape, not a new report field beyond one optional boolean folded into the narrative's own pre-existing `metadata` object (itself already used this way for `operationalHealthScore`, `industry`, etc.) and into the `NARRATIVE_GENERATION` trace step's existing freeform `metadata`. No second execution/completeness/status architecture exists anywhere in the codebase after this milestone.

## 6. Why Evidence Sufficiency Remains Separate

Unchanged, and re-verified: `hasIncompleteAnalysis` is computed strictly *after* `computeEvidenceSufficiency(...)` in `mgd-pipeline.ts`'s call order (a fact already true before this milestone — see Semantics ADR §4) and is passed to the narrative as an entirely independent parameter alongside, never instead of, `evidenceLevel`. `withEvidenceCaveat` (evidence-driven) and `withIncompleteAnalysisCaveat` (execution-driven) are two small, separately-named, separately-triggered helpers that can both apply to the same section's content (chained, e.g. in Operational Health/Strategic Direction/Final Conclusion) without either one changing the other's condition or wording. Evidence Sufficiency's NONE/PARTIAL/SUFFICIENT thresholds and implementation were not touched.

## 7. Implementation Summary

`mgd-pipeline.ts` accumulates `hasIncompleteAnalysis` (a single `let`, OR-ed across the Findings/Root Cause/Recommendation steps' already-computed `executions` arrays) and passes it to `generateExecutiveNarrative(...)`. `executive-narrative-engine.ts` adds one optional parameter (`hasIncompleteAnalysis?: boolean`, default `false`) to `NarrativeParams` and to all 7 section-generator functions, plus two small helpers: `withIncompleteAnalysisCaveat` (prepends a fixed disclosure sentence to a section's normal content — used identically to the pre-existing `withEvidenceCaveat`) and `incompleteAnalysisFallback` (an honest zero-result message used only when a section's own result count is 0 **and** `hasIncompleteAnalysis` is true — the pre-existing "insufficient data" fallback text for the legitimate `SUCCESS/0` case is completely untouched). `ExecutiveNarrativeReport.metadata` gains one optional `hasIncompleteAnalysis: boolean` field for consumers that want it without parsing prose.

## 8. Case-by-Case Verification

| Case | Behavior | Verified by |
|---|---|---|
| A — no evidence | Unchanged; evidence-level fallback takes precedence; detector failure cannot occur (Semantics ADR Case F) | Test 1 |
| B — evidence + SUCCESS/0 | Unchanged, byte-for-byte, from before this milestone | Test 2 |
| C — evidence + FAILED | Honest fallback used instead of "insufficient data"; health classification prefixed with disclosure, never presented unqualified | Test 3 |
| D — evidence + failed sibling + successful finding | Successful finding renders in full, unsuppressed; disclosure appended | Test 4 |
| E — mixed success/failure | No section claims total diagnostic failure; successful content preserved; single non-alarmist caveat applied | Test 5 |

## 9. Persistence, Viewer, Presentation Mode, and PDF Export

`narrative: ExecutiveNarrativeReport` is computed once, in `mgd-pipeline.ts`, and stored as-is inside the persisted `MGDReport` (`report-composer.ts`). The report viewer (`mgd-report-viewer.tsx`), Presentation Mode (`mgd-presentation-mode.tsx`), and PDF export (`pdf-export.ts`) all read `report.narrative.<section>.content` directly from that single persisted object — none of them recompute narrative independently. The disclosure therefore reaches every consumer automatically, with no additional code change required in any of the three, confirmed by direct inspection of each file's narrative-consumption call sites.

## 10. Backward Compatibility

`hasIncompleteAnalysis` is optional everywhere it was added (`NarrativeParams`, every section generator's parameter list, `ExecutiveNarrativeReport.metadata`) and defaults to `false`, reproducing today's exact pre-milestone behavior for any caller that does not pass it. Historical persisted reports/traces have no `hasIncompleteAnalysis` key anywhere and require no migration or backfill — absence of the field is never treated as evidence of failure, only as "this report predates the field," which is functionally identical to "no failure occurred" for narrative purposes (the pre-existing wording is exactly what such a report already contains).

## Frozen Boundaries Honored

No detector logic, threshold, Finding Category vocabulary, Evidence Sufficiency implementation/thresholds, health-scoring formula, or `DetectorExecutionRecord` shape was changed. No successful finding, root cause, or recommendation was suppressed or altered. No AI, embeddings, keyword matching, or semantic classification was introduced. No dashboard, alert, or monitoring UI was built. `server/v2/*` and the legacy RCI/bulk-analysis system were not touched.
