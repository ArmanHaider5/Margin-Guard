# ADR — Finding Ontology & Evidence Contract Review (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Finding Ontology & Evidence Contract Architectural Review |
| Status | Accepted as an architectural review. No production behavior changed. No new evidence detectors built. |
| Scope | `server/mgd/*` only, read-only investigation. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Builds directly on [MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md](MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md) (the authoritative 9-value vocabulary this ADR classifies), [MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md](MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md) (concluded scope↔evidence correlation is not currently possible — reconfirmed here per-category in §7), [MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md](MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md) (`UNVALIDATED`/`INSUFFICIENT_EVIDENCE` scope states, unaffected), and [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md) (the four-information-class model; this ADR sits entirely inside that model's "Analytical Conclusion" class). |
| CTO decisions carried into this milestone | (A) Do not build `FindingEvidence` detectors for the five uncovered categories. (B) Finding Categories are not currently a product-ready Diagnostic Scope ontology. (C) All nine Finding Categories remain implementation-level until governance-ADR conditions are satisfied. (D) The full MGD Vitest suite is a mandatory completion gate for structural work. (E) `server/v2/*` remains untouched. |

---

## 1. What a Finding Actually Is

An `OperationalFinding` (`findings-engine.ts`) is the output of exactly one detector function, produced from one of two evidentiary inputs — never both, never neither:

- **`TxStats`** — the deterministic, per-run aggregation of raw transactions/documents (entity counts, adjustments, missing refs/values, `byEntity`/`byDate` maps, etc.), computed once per pipeline run and passed to every non-EM detector; or
- **`EventSignals`** (`event-signals.ts`) — a deterministic, transaction-derived intermediate aggregation object (dispatch/delay/substitution/missing-item rates, damage-recovery rate, composite scores), computed once per pipeline run and passed to the three Event-Management detectors via `params.eventSignals`.

Every detector, regardless of which input it reads, returns the same fixed shape:

```ts
export interface OperationalFinding {
  id:                string;
  title:             string;
  severity:          "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category:          string;
  findingPriority:   FindingPriorityValue;
  department?:       string;
  summary:           string;
  signals:           string[];
  evidence?:         FindingEvidence[];
  operationalImpact?: string;
  confidence:        number;  // 0–100
}
```

`signals: string[]` is **required** and is populated *inline, by the same function* that computed severity/confidence — it is not a separate pass, not optional, and never fabricated: every entry is a direct textual rendering of a real, computed statistic (counts, percentages, ratios) from `TxStats` or `EventSignals`. A Finding cannot exist without `signals` — every detector either returns `null` (when its confidence falls below `CONFIDENCE_THRESHOLD`) or returns a fully-populated finding with real, computed evidence in `signals`. There is no code path that produces a Finding with empty or placeholder signals.

`evidence?: FindingEvidence[]` is **optional** and, when present, comes from a wholly separate module (`evidence-engine.ts`) applied as a post-hoc enrichment pass (`attachEvidenceToFindings`) — see §3.

**Conclusion on detector uniformity:** different detectors do **not** produce structurally different kinds of Findings — every detector returns the identical `OperationalFinding` shape. They do, however, follow two distinct *evidentiary provenance pathways* (direct-stats vs. derived-signal — see §5), which is a real architectural distinction even though the output type does not encode it.

## 2. Evidence vs. Finding: Two Non-Identical Concepts

"Evidence" is used for two different things in this codebase, and this milestone's central task was to stop conflating them:

1. **A Finding's own `signals`** — the finding's real, primary, built-in evidentiary reasoning. Always present. Computed directly by the detector from real transaction-derived data.
2. **`FindingEvidence` objects** (`evidence-engine.ts`) — a *separate*, optional, structured-citation enrichment layer: `{ documentId?, documentName?, observation, source?, confidence? }`. Built by independently re-normalizing the *same* raw transactions/documents (`normaliseTx`/`normaliseDoc`) through a second, category-specific detector function, and attached to matching findings by category after the fact (`attachEvidenceToFindings`, which spreads `{...finding, evidence}` — it never reads or modifies `signals`).

These two layers are **decoupled and redundant, not layered**: `evidence-engine.ts`'s detectors do not read `TxStats` or `EventSignals` at all — they re-derive their own counts from raw transactions/documents independently. A Finding Category having no `FindingEvidence` detector does not mean the Finding lacks evidence; it means this *second, additional* citation layer has not been built for that category. The two layers can and do disagree in method (confirmed in Milestone 8: `evidence-engine.ts`'s `detectInventoryVisibility` checks different specific criteria than `findings-engine.ts`'s `detectInventoryStrain` for the same category) precisely because they are parallel implementations, not a single pipeline.

## 3. Finding Category vs. Evidence Category

A Finding Category (one of the 9 values in `finding-categories.ts`) is not an "evidence category" — it is a label on the *output* of a detector, chosen by that detector, describing which operational domain the finding concerns. It says nothing, by itself, about how the finding was substantiated. Two findings in the same category can be substantiated by entirely different mechanisms (as `warehouse_operations` demonstrates: the finding-side detector and the evidence-side detector compute different statistics from different re-derivations of the same input). The evidence *contract* that actually backs a Finding Category has to be determined per-category by reading the producing detector's code — never inferred from the category name. That per-category classification is §5 and the Decision Matrix in §9.

## 4. Does an "Evidence Signal" Concept Already Exist Implicitly? — Yes

`EventSignals` (`event-signals.ts`, `computeEventSignals()`) already functions as an implicit Evidence Signal layer for the three Event-Management Finding Categories. It is:

- Computed once per pipeline run, deterministically, directly from raw transactions (no AI/LLM, no external input).
- An intermediate aggregation — not raw data, not a Finding — carrying rates (`dispatchFailureRate`, `dispatchDelayRate`, `substitutionRate`, `missingItemRate`, `damageRecoveryRate`, …) and composite scores (`eventReadinessScore`, `dispatchReliabilityScore`, `assetAccountabilityScore`) plus a gating flag (`assessed: boolean`, added in the Milestone 4 evidence-sufficiency work) that tells consumers whether these numbers reflect real measurement or a "nothing to measure" neutral default.
- Read directly by `detectEventReadinessRisk`, `detectEventReadinessExposure`, `detectDispatchReliabilityRisk`, and `detectAssetDamageRecoveryLeakage` as their *sole* evidentiary input — none of these four detectors reads raw `TxStats` at all.

No equivalent named/typed intermediate exists for the other six categories — their detectors read `TxStats` directly. This is not a gap: those six categories' statistics (entity concentration, adjustment counts, date-clustering, coefficient of variation, etc.) do not need a second aggregation step to be meaningful, whereas the EM categories' rates (a failure *rate*, a delay *rate*) are inherently ratios that only make sense computed once, consistently, across the whole transaction set — which is exactly what `EventSignals` exists to do.

## 5. Evidence Relationship Per Category (Summary — see §9 for the full matrix)

Two, and only two, evidentiary pathways exist across all nine categories:

- **Direct**: `TxStats` → detector → `signals` → Finding. Used by `inventory_visibility`, `logistics_coordination`, `warehouse_operations`, `manpower_dependency`, `financial_leakage`, `workflow_scalability`.
- **Derived-via-signal**: raw transactions → `EventSignals` (single shared aggregation) → detector → `signals` → Finding. Used by `event_readiness`, `dispatch_operations`, `asset_management`.

No category's Finding-side detector synthesizes across *other Finding Categories* — that kind of cross-category synthesis is reserved exclusively for Root Causes (§6). Both pathways above are equally "real" evidence: every value cited in `signals` is a real, computed number from real transaction-derived data in both cases. Category membership in one pathway vs. the other reflects the *shape of the underlying statistic* (a raw count/ratio vs. a domain-specific rate that benefits from one shared computation), not a difference in evidentiary rigor.

**This directly answers the milestone's central question.** Finding Category ≠ Evidence Category: a Finding Category is a domain label on a detector's output; the evidence *contract* behind it is determined by which of the two pathways above (or, for the four categories in §3, an additional independent citation pass) that specific detector uses — and that can only be determined by reading the code, not the name.

## 6. Why Root Causes Remain Cross-Category Analytical Constructs (Unaffected)

Reconfirmed, unchanged: `RootCause` (`root-cause-engine.ts`) has no `category` field. Root-cause detectors require findings from multiple, specifically different Finding Categories simultaneously — e.g. `detectReactiveOperations` fires only when `logistics_coordination`, `inventory_visibility`, **and** `manpower_dependency` findings are all present at once (`byCategory(findings, CAT.LOG)`, `CAT.INV`, `CAT.MAN`). This is the one place in the pipeline where genuine cross-category analytical synthesis happens, and it is architecturally distinct from anything at the Finding level: no Finding-level detector reads another Finding Category's output. This milestone changed nothing here and confirms the existing design remains correct — a Root Cause is, by definition, the point at which "single Finding Category" stops being a coherent unit, and that boundary should not be blurred by pushing cross-category logic down into individual Finding detectors.

## 7. Diagnostic Scope Implications — No Category Is Scope-Ready

Per [MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md](MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md), a Business Concern cannot be deterministically correlated to a Finding Category without prohibited fuzzy/semantic matching. This milestone's per-category evidence classification does not change that conclusion — it sharpens *why* it remains true even for the categories with the strongest evidentiary backing: even `inventory_visibility` (direct `TxStats`-backed, plus a `FindingEvidence` detector) has no structured link from a wizard-entered Business Concern to that category; the link would have to be inferred from free text, which every prior milestone in this series has ruled out as a semantic-matching operation MGD does not perform. No category — regardless of A/B/C/D/E classification below — currently satisfies the conditions in [MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md](MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md) §9 for becoming a user-selectable Diagnostic Scope Domain. Default answer remains NO for all nine.

## 8. Why a Missing `FindingEvidence` Detector Does Not Mean Missing Functionality

Restated precisely because it is the milestone's most important guardrail: the five categories without a `FindingEvidence` detector (`financial_leakage`, `workflow_scalability`, `event_readiness`, `dispatch_operations`, `asset_management`) all have fully-functional, real, transaction-derived Finding detectors that populate `signals` from genuine computed statistics (§5). The missing piece is only the *second, additional, structured-citation* layer (§2) — a UI/PDF-export enrichment mechanism, not the finding's evidentiary basis. Treating "5 of 9 categories lack a `FindingEvidence` detector" as "5 of 9 categories lack evidence" would be a category error, and building detectors reflexively to fix an apparent gap would be solving the wrong problem — potentially the wrong architecture entirely for three of the five (see Decision Matrix, §9, `event_readiness`/`dispatch_operations`/`asset_management`).

## 9. Decision Matrix

Evidence Contract Classification legend: **A** = DIRECT_EVIDENCE_BACKED, **B** = DERIVED_EVIDENCE_BACKED, **C** = CROSS_CATEGORY_ANALYTICAL, **D** = IMPLEMENTATION_LABEL, **E** = UNCLEAR.

| Finding Category | Evidence Relationship | Evidence Contract | `FindingEvidence` Detector? | Evidence Source | Finding Producer(s) | Analytical or Direct | Scope-Ready? | Action |
|---|---|---|---|---|---|---|---|---|
| `inventory_visibility` | `TxStats` → detector → `signals` | A | Yes | Raw transactions (re-normalized) | `detectInventoryStrain` | Direct | No | PRESERVE |
| `logistics_coordination` | `TxStats` → detector → `signals` | A | Yes | Raw transactions (re-normalized) | `detectLogisticsPressure` | Direct | No | PRESERVE |
| `warehouse_operations` | `TxStats` → detector → `signals` | A | Yes | Raw transactions (re-normalized) | `detectWarehouseOperations` | Direct | No | PRESERVE |
| `manpower_dependency` | `TxStats` → detector → `signals` | A | Yes | Raw transactions (re-normalized) | `detectManualDependency` | Direct | No | PRESERVE |
| `financial_leakage` | `TxStats` → detector → `signals` | A | **No** | `TxStats` only | `detectFinancialLeakage` | Direct | No | NEEDS_FUTURE_REVIEW |
| `workflow_scalability` | `TxStats` (composite) → detector → `signals` | A | **No** | `TxStats` only | `detectWorkflowScalabilityRisk` | Direct (composite of several stats) | No | NEEDS_FUTURE_REVIEW |
| `event_readiness` | Transactions → `EventSignals` → detector → `signals` | B | **No** | `EventSignals` (shared aggregation) | `detectEventReadinessRisk`, `detectEventReadinessExposure` | Derived | No | NEEDS_FUTURE_REVIEW |
| `dispatch_operations` | Transactions → `EventSignals` → detector → `signals` | B | **No** | `EventSignals` (shared aggregation) | `detectDispatchReliabilityRisk` | Derived | No | NEEDS_FUTURE_REVIEW |
| `asset_management` | Transactions → `EventSignals` → detector → `signals` | B | **No** | `EventSignals` (shared aggregation) | `detectAssetDamageRecoveryLeakage` | Derived | No | NEEDS_FUTURE_REVIEW |

No category classified C, D, or E: none of the nine Finding Categories synthesize across other Finding Categories at the Finding level (C is reserved for Root Causes, §6); none are bare implementation labels without a real, computed evidentiary basis (D); and none are ambiguous enough to require an UNCLEAR classification (E) — every category's evidentiary path was confirmed by direct code reading, not inferred from its name, satisfying this milestone's explicit instruction not to force every category into A while also not manufacturing ambiguity that the code does not actually contain.

**On `NEEDS_FUTURE_REVIEW` vs. `NEEDS_EVIDENCE_CONTRACT`:** none of the five received `NEEDS_EVIDENCE_CONTRACT` because that label would imply the Finding itself lacks an evidence contract — it does not (§8). `NEEDS_FUTURE_REVIEW` is used instead to mean: *a decision about whether to extend the secondary `FindingEvidence` citation layer to this category* is future work, not a defect requiring immediate correction. See §10 for what should precede that decision, split by sub-group.

## 10. Recommended Future Evidence Architecture (Conceptual Only — Nothing Implemented)

The five `NEEDS_FUTURE_REVIEW` categories split into two sub-groups with different implications:

**`financial_leakage`, `workflow_scalability`** — both are Direct (A), `TxStats`-backed, using the exact same statistical primitives (`stats.byEntity`, `stats.adjustments`, counts/ratios) as the four categories that already have a `FindingEvidence` detector. Extending `evidence-engine.ts`'s existing `normaliseTx`/`normaliseDoc` + per-category-detector pattern to these two would be architecturally consistent with the current design — a straightforward, low-risk addition *if and when* a product decision is made to prioritize it. This is a **historical gap**: `evidence-engine.ts`'s `DETECTORS` map simply was never extended past its original 4 entries; nothing about these two categories' evidentiary nature makes them unsuitable for the existing contract.

**`event_readiness`, `dispatch_operations`, `asset_management`** — these are Derived (B), backed by `EventSignals`, a single shared, rate-based aggregation. `evidence-engine.ts`'s existing detector pattern does not read `EventSignals` at all — it independently re-derives its own counts from raw transactions/documents. Naively adding detectors for these three in the *existing* pattern would create a **third, parallel, potentially-inconsistent re-computation** of the same dispatch/damage statistics already computed once in `event-signals.ts` — a real risk of the two layers silently disagreeing (as already observed within the 4-category overlap in Milestone 8, §2 above, but with materially higher stakes given these are aggregate rates rather than one-off counts). The alternative — a `FindingEvidence` detector that reads `EventSignals` directly instead of re-normalizing raw data — would require inventing a new evidence-contract *shape*, since `FindingEvidence`'s current fields (`documentId`/`documentName`/`observation`/`source`) are modeled around citing a specific document or transaction cluster, not citing a pre-computed aggregate rate. Deciding which of these two approaches (or whether to build anything at all here) is correct is exactly the kind of decision this milestone's STOP conditions require surfacing rather than resolving by assumption — see the CTO Decisions Required section of the milestone report.

No new production layer is proposed. The existing two-pathway model (§5) is sufficient to explain current behavior and does not require a redesign.

## 11. Frozen Boundaries Honored

No Finding Category identifier was added, removed, or renamed. No evidence detector (old or new) was built or modified. No finding, evidence, root-cause, recommendation, benchmark, health-scoring, evidence-sufficiency, or diagnostic-scope behavior was changed. `server/v2/*` and the legacy RCI/bulk-analysis system were not touched. This document is purely descriptive of the architecture as it already exists.
