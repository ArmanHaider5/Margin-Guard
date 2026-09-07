# ADR — Finding Evidence & Provenance Architecture (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Finding Evidence & Provenance Architecture |
| Status | Accepted as an architectural review. No production behavior changed. No new evidence detectors built. No provenance fields added. |
| Scope | `server/mgd/*` only, read-only investigation plus documentation and preservation tests. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Directly extends [MGD_FINDING_ONTOLOGY_EVIDENCE_CONTRACT_ADR.md](MGD_FINDING_ONTOLOGY_EVIDENCE_CONTRACT_ADR.md) (which established `signals` as the primary evidentiary basis and classified all 9 categories A/B). Reconciles with [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md) (four-information-class model — this ADR's provenance model is a refinement *within* that model's "Analytical Conclusion" and "Documentary Evidence" classes, not a replacement for it). Confirms, unchanged, the conclusions of [MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md](MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md) and [MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md](MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md) and [MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md](MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md). |
| CTO decisions carried into this milestone | Do not build `FindingEvidence` detectors for the 5 uncovered categories. Do not build redundant raw-data detectors for the 3 EM categories. Do not extend `evidence-engine.ts` for `financial_leakage`/`workflow_scalability` yet. No category promoted to a Diagnostic Scope Domain. `UNVALIDATED` remains a permanent, legitimate epistemic state. Full Vitest suite is a mandatory gate. `server/v2/*` untouched. |

---

## 1. What Constitutes the Evidentiary Basis of a Finding

Confirmed unchanged from the predecessor ADR and re-verified here: a Finding's evidentiary basis is its `signals: string[]` field, populated inline by the producing detector from real, computed values — either `TxStats` (direct) or `EventSignals` (derived). This is sufficient, by itself, to establish that a Finding is analytically grounded: every entry in `signals` is a rendered statement of an actual computed number (a count, a percentage, a ratio) traceable to the exact `if` branch in the detector that produced it. What `signals` does **not** carry is *machine-readable* provenance — it is prose, not structured data, so a human or downstream consumer can read *what* was measured but cannot programmatically retrieve *which specific transactions or documents* contributed to that measurement, nor which exact `TxStats`/`EventSignals` field and threshold triggered it, without re-reading the detector's source code. That gap — human-readable analytical basis vs. machine-traceable provenance — is precisely the distinction this milestone exists to characterize, not to close by adding fields.

## 2. Role of `signals`

`signals` is the **primary evidentiary and analytical basis** of every Finding. It is required, never empty for a real (non-null) Finding, and computed by the same function, in the same pass, that determines severity and confidence — there is no separation between "compute the finding" and "compute its evidence" at this layer. `signals` answers "what was measured, and what did it show?" It does not, and is not designed to, answer "show me the exact source rows."

## 3. Role of `FindingEvidence`

`FindingEvidence` (`evidence-engine.ts`) is a **separate, optional, post-hoc structured-citation layer** — confirmed, unchanged, from the predecessor ADR. It independently re-normalizes the same raw transactions/documents through its own category-specific detector and attaches `{documentId?, documentName?, observation, source?, confidence?}` objects to matching findings by category, after Findings already exist. It is not consulted by, and does not feed into, Root Cause or Recommendation generation (§5 of this ADR) or health/severity scoring. Where it exists, it functions as **document-level citation material** — evidence that a specific document or transaction cluster is available to substantiate the finding's *domain*, in a form suited to UI/PDF display of "supporting evidence." It is not, and was never, the finding's actual evidentiary basis.

## 4. Evidence vs. Citation — the Distinction This Milestone Formalizes

Five genuinely distinct things exist in the codebase today, previously discussed under the single word "evidence":

1. **Evidence that exists** — the raw transactions/documents supplied to a pipeline run. Always present in some quantity; gated globally by Evidence Sufficiency (`NONE`/`PARTIAL`/`SUFFICIENT`), unchanged by this milestone.
2. **Evidence used to calculate a signal** — the specific subset of transactions/documents that fed into a `TxStats` field or an `EventSignals` rate. Exists implicitly (the aggregation functions read the full transaction array) but is not retained as a discrete reference — once `TxStats`/`EventSignals` is computed, the link back to which individual transaction rows contributed to which number is not preserved anywhere.
3. **Signal used to produce a Finding** — `TxStats`/`EventSignals` field values, read by name inside a detector's `if` branches. This link *is* traceable, but only by reading the detector's source code — there is no runtime data structure recording "this Finding fired because `dispatchFailureRate > 0.X`."
4. **Citation that explains the Finding** — `FindingEvidence`, where it exists (4 of 9 categories). A separate, independently-derived explanatory artifact, not a pointer into the calculation.
5. **The Finding itself** — `OperationalFinding`, carrying `signals` (prose evidentiary basis) and optionally `evidence` (citation).

**On what `FindingEvidence` should conceptually mean:** of the four options posed (raw documentary citation only / raw + computed signal citation / general provenance reference / something else), the codebase's actual, current behavior matches **(A) raw documentary citation only** — every existing `FindingEvidence` producer re-derives its observations from raw transactions/documents, never from `TxStats` or `EventSignals` values. It is not, today, a general provenance reference, and it does not carry computed-signal citations. This is a factual description of current behavior, not a naming judgment — the name `FindingEvidence` is not being changed, and no renaming is proposed (frozen boundary; also see §13 on what would be required before considering any change).

## 5. Direct Evidence Pathway

For `inventory_visibility`, `logistics_coordination`, `warehouse_operations`, `manpower_dependency`, `financial_leakage`, `workflow_scalability`:

```
raw transactions/documents → TxStats (computed once per run)
    → Finding detector (reads TxStats fields directly)
    → OperationalFinding.signals (prose rendering of the TxStats values that triggered it)
    → [optional, 4 of 6] FindingEvidence (independent re-normalization of the SAME raw
       transactions/documents, via evidence-engine.ts's own detector — does not read TxStats)
    → Root Cause (reads OperationalFinding.category/severity/confidence — never .signals or .evidence)
    → Recommendation (reads OperationalFinding.category/severity, and Root Cause linkage —
       never .signals or .evidence)
```

Confirmed by direct inspection of `recommendation-engine.ts`: its byCategory/linkage logic reads only `finding.category`, `finding.severity`, and root-cause linkage — `signals` and `evidence` are never read past the Finding stage. This means the prose evidentiary basis and the optional citation layer both terminate at the Finding; only the *classification* of a finding (category/severity/confidence) propagates forward into Root Causes and Recommendations.

## 6. EventSignals-Derived Pathway

For `event_readiness`, `dispatch_operations`, `asset_management`:

```
raw transactions → computeEventSignals() [event-signals.ts, ONE authoritative computation per run]
    → EventSignals (rates + composite scores + `assessed` gating flag)
    → Finding detector (reads params.eventSignals fields directly — never re-reads raw transactions)
    → OperationalFinding.signals (prose rendering of the EventSignals values that triggered it)
    → [none currently] FindingEvidence
    → Root Cause / Recommendation (same as §5 — category/severity/confidence only)
```

The critical architectural property here, confirmed by code inspection (`findings-engine.ts`'s three EM detectors and `event-signals.ts`), is that **`EventSignals` is computed exactly once per pipeline run** (`mgd-pipeline.ts` calls `computeEventSignals(transactions)` a single time, storing the result in `eventSignals`, which is passed by reference into every EM detector). No EM Finding detector, and no `FindingEvidence` producer, independently recalculates any dispatch/delay/substitution/damage rate. This is the "one analytical source of truth" property the milestone's most important principle requires, and it already holds today — this milestone's job was to confirm it, not to build it.

## 7. Provenance Requirements — the Smallest Model That Fits

Six concepts already exist in the architecture and require distinct treatment; no others are needed:

| Concept | Origin | Existing representation today | Epistemic status |
|---|---|---|---|
| **A. Documentary / Raw Evidence** | Uploaded documents / transaction rows | `transactions[]`, `documents[]` passed into the pipeline; counted in `TxStats`/`EventSignals`; cited by `documentId`/`documentName` in `FindingEvidence` where that layer exists | Directly observed |
| **B. Computed Transaction Signal** | Deterministic aggregation of A | `TxStats` fields (`stats.byEntity`, `stats.adjustments`, etc.) | Derived, deterministic, single computation per run |
| **C. Computed Event Signal** | Deterministic aggregation of A (EM-specific) | `EventSignals` fields, `computeEventSignals()` | Derived, deterministic, single computation per run, gated by `assessed` |
| **D. Finding** | B or C, read by exactly one detector | `OperationalFinding` (`signals` = prose basis, `evidence?` = optional citation) | Analytical conclusion |
| **E. Human Consultant Observation** | A consultant's own text entry | `ConsultantNote` (`consultant-notes-engine.ts`) | Human-origin, never Documentary Evidence (see §11) |
| **F. Business Concern** | A client's stated concern (wizard input) | `businessConcerns[]` → `DiagnosticScopeItem` (`diagnostic-scope.ts`), status `UNVALIDATED`/`INSUFFICIENT_EVIDENCE` | Human-origin, unvalidated by design (see §12) |

This is deliberately **not** a generic ontology or provenance graph. It models exactly the six node types the existing code already distinguishes, and exactly the relationships the existing code already implements (A→B, A→C, B→D, C→D — never B↔C, never E→D, never F→D). No new relationship types, no new node types, and no cross-links beyond what §5/§6 already trace are proposed. A→D directly (bypassing B/C) does not exist in the codebase and is not modeled, because no current Finding detector reads raw transactions without first passing through `TxStats` or `EventSignals`.

## 8. Why Redundant Detectors Are Prohibited

If a `FindingEvidence` detector were built for an EventSignals-derived category (`event_readiness`, `dispatch_operations`, `asset_management`) using `evidence-engine.ts`'s existing pattern (independent re-normalization of raw transactions), it would compute its own version of a rate (e.g., a dispatch-failure percentage) that `EventSignals` already computes once, authoritatively. Two independently-maintained computations of the same rate, with even slightly different normalization logic (as already observed for the 4 existing overlapping categories — the finding-side and evidence-side detectors for `warehouse_operations`/`inventory_visibility` check materially different criteria), create a genuine risk of the two numbers silently disagreeing in a report, undermining the "one analytical source of truth" principle. This is not a hypothetical risk — it is the exact failure mode `evidence-engine.ts`'s current design already exhibits for the 4 categories it does cover, and building three more instances of it in the EM domain — where the numbers are ratios/rates rather than one-off counts, and thus more visibly comparable side-by-side — would compound rather than fix the problem.

## 9. Treatment of the Five Currently Uncovered Categories

Reconfirmed from the predecessor ADR, refined here:

- **`financial_leakage`, `workflow_scalability`**: analytical basis exists (direct `TxStats`, real `signals`). `FindingEvidence` does not exist. Provenance beyond `signals` does not exist (no structured link from a `signals` string back to specific transaction rows). Citation does not exist. **What is actually missing**: only the citation layer (§4, item 4) — and per Decision 4, it is not being built this milestone. This remains, as classified previously, a historical gap in `evidence-engine.ts`'s coverage, not a defect in the Finding's evidentiary integrity.
- **`event_readiness`, `dispatch_operations`, `asset_management`**: analytical basis exists (derived `EventSignals`, real `signals`). `FindingEvidence` does not exist. Provenance beyond `signals` does not exist in a machine-readable form, though the *source* of the signal (`EventSignals`, computed once) is more tightly identifiable than for the raw-`TxStats` categories, because there is exactly one computation site (`computeEventSignals`) rather than many `TxStats` field reads scattered across detector logic. Citation does not exist. **What is actually missing** is not a document citation (§4 item 4) — it is a *reference from the Finding back to the specific `EventSignals` computation that produced it* (§10) — a different kind of provenance than what `FindingEvidence` currently provides for any category. This is not solved by building a `FindingEvidence` detector at all; it would require a different mechanism, which this milestone deliberately does not build (Decision 5's investigation, Decision 3's prohibition).

## 10. Future EventSignals-Native Citation Possibility

Could a citation mechanism represent the EM categories' analytical basis without recalculating `EventSignals`, duplicating rates, creating a second source of truth, or misrepresenting a computed rate as raw evidence? **Conceptually yes, but only in a form structurally different from `FindingEvidence` as it exists today.** Such a mechanism would need to:

- Reference the *already-computed* `EventSignals` object (or specific field names within it) by identity, not recompute anything — e.g., "this Finding's basis is `EventSignals.dispatchFailureRate` = 0.34, computed from this run's `totalDispatches`/`incompleteDispatches`."
- Preserve the numerator/denominator raw counts that `EventSignals` already retains (`totalDispatches`, `incompleteDispatches`, `totalMissingItems`, etc. are already present on the `EventSignals` object returned by `computeEventSignals` — see `event-signals.ts` "Raw counts (for trace and debug)" section) rather than re-deriving them from transactions.
- Be clearly labeled as a *computed-rate citation*, not a *document citation* — because `FindingEvidence.documentId`/`documentName` fields do not apply to a value derived from many transactions in aggregate, and forcing that shape onto an aggregate rate would misrepresent a computed signal as if it pointed to one physical document (the exact anti-pattern the milestone's principle prohibits).

This would very likely require either a new, distinct type from `FindingEvidence` (e.g., a hypothetical "signal citation" distinguishable from a "document citation"), or a materially different set of optional fields on `FindingEvidence` used only by EM categories — either of which is a real contract change requiring its own design and CTO approval, not an extension that fits today's shape. **This milestone does not propose that type or those fields.** It only confirms the possibility is architecturally coherent (§8's redundancy trap is avoidable) and identifies what such a mechanism would need to reference (`EventSignals`' existing raw-count fields) if a future milestone is authorized to build it.

## 11. Relationship to Consultant Observation Provenance

Reconfirmed, unchanged, per [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md)'s four-information-class model: a Consultant Observation (`ConsultantNote`) is human-origin text and must never silently become Documentary Evidence. Nothing in this milestone's provenance model changes that boundary — `ConsultantNote` (class E in §7's table) has no edge into `TxStats`, `EventSignals`, or `OperationalFinding.signals` in the current codebase, and none is proposed. If a future milestone introduces any citation mechanism that could reference a Consultant Observation alongside a Finding, that reference must be labeled distinctly (as human-origin corroboration) and must never be merged into, or presented indistinguishably from, `FindingEvidence`'s existing document-citation semantics. No human-origin evidence mechanism is implemented in this milestone.

## 12. Relationship to Diagnostic Scope

Reconfirmed, unchanged: a Business Concern (class F in §7's table) remains structurally separate from Finding Evidence. `DiagnosticScopeItem.status` remains `UNVALIDATED` or `INSUFFICIENT_EVIDENCE` only — `SUPPORTED`/`NOT_SUPPORTED` remain reserved and never constructed. Nothing in this milestone's provenance model creates, or makes it easier to later accidentally create, a path from "a Finding exists in a related operational area" to "the Business Concern is now evidenced." `UNVALIDATED` is confirmed here as a legitimate, permanent epistemic state — not a placeholder awaiting a future correlation feature — consistent with CTO Decision 7. No scope correlation is implemented.

## 13. Conditions Required Before Modifying `FindingEvidence`

1. An explicit CTO decision on which of the two uncovered-category sub-groups (§9) to address, and in what order.
2. For `financial_leakage`/`workflow_scalability`: confirmation that extending the existing `evidence-engine.ts` pattern (independent re-normalization of raw `TxStats`-shape data) remains acceptable despite the redundancy already tolerated for the 4 existing categories — or a decision to fix that redundancy pattern generally before extending it further.
3. For the 3 EM categories: an explicit decision to either (a) accept the redundancy risk described in §8 and build a raw-data detector anyway, or (b) approve design of a new computed-signal citation mechanism (§10) as its own milestone, with its own contract review — this ADR does not pre-approve either path.
4. In all cases: a regression-test plan proving the new detector(s) do not alter any existing Finding/Root Cause/Recommendation/health-score/evidence-sufficiency behavior, per the standing CTO Decision D (full Vitest suite as completion gate).

## 14. Conditions Required Before Introducing a New Provenance Structure

1. A concrete, code-evidenced use case that the current `signals`/`evidence` pair cannot serve — e.g., a UI requirement to show "which exact transaction rows produced this number" that `signals`' prose cannot satisfy today.
2. Confirmation that the new structure does not require recomputing `TxStats` or `EventSignals` a second time to populate itself (violating §8's prohibition).
3. Confirmation that the structure does not overlap with or duplicate any `server/v2/*` provenance/audit concept (frozen; not inspected in this milestone because no such overlap was suggested by anything found in `server/mgd/*`).
4. A decision on whether the structure is a graph (only justified if relationships are genuinely many-to-many and need traversal) or a simpler flat reference structure (sufficient for every relationship traced in §5–§7, none of which requires graph traversal — each is a single-hop reference: Finding→Signal-field, Signal→raw-count). **This milestone's finding is that a graph is not currently justified** — every relationship in §7's table is a single-hop, tree-shaped reference (A→B→D, A→C→D), not a network requiring multi-hop queries. A simple, typed reference field (e.g., "this Finding's basis reads `EventSignals.dispatchFailureRate`") would be sufficient if and when built — not a generalized provenance graph engine.

## 15. Frozen Boundaries Honored

No Finding Category identifier was added, removed, or renamed. No `FindingEvidence` detector (old or new) was built, and none was renamed despite this ADR's factual observation in §4 that its current behavior matches only one of four possible conceptual meanings. No finding, evidence, root-cause, recommendation, benchmark, health-scoring, evidence-sufficiency, or diagnostic-scope behavior was changed. `EventSignals` was not recalculated by any new code path. `server/v2/*` and the legacy RCI/bulk-analysis system were not touched. This document is purely descriptive of the architecture as it already exists, plus a conceptual (unbuilt) model for future citation work.
