# ADR — Business Concern & Consultant Observation Correlation Architecture (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Business Concern & Consultant Observation Correlation Architecture |
| Status | Accepted and implemented (Model A — scoping/display only). No AI, embeddings, keyword matching, or inference introduced anywhere. |
| Scope | `server/mgd/diagnostic-scope.ts`, `consultant-notes-engine.ts`, `report-composer.ts`, `mgd-pipeline.ts`, `server/routes/mgd-routes.ts`, `client/src/pages/mgd-diagnostic-wizard.tsx`, `client/src/pages/mgd-report-viewer.tsx`. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Directly implements the recommendation of the Milestone 14 reconnaissance report ("MGD currently runs a generic operational diagnostic ALONGSIDE the client's stated concern rather than diagnosing the concern itself"). Extends, without contradicting, [MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md](MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md) and [MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md](MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md) (both of which concluded no *inferred* correlation is safe — reaffirmed here for concern *text*; only a *human-selected* area is new). Reuses, without changing, the vocabulary from [MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md](MGD_FINDING_CATEGORY_GOVERNANCE_ADR.md). Preserves the four-class model in [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md). |

---

## 1. The Problem This Milestone Solves

Confirmed by the Milestone 14 reconnaissance and reconfirmed here by code trace: a Business Concern and a Consultant Observation could be collected by a real, complete 5-step wizard, persisted, and partially displayed — but neither ever participated in analysis, and the one structured representation of "what the client asked about" (`diagnosticScope`) had no frontend surface at all. A business owner reading a report had no way to see whether, or how, MGD addressed their actual concern.

## 2. What Changed, In One Sentence

A consultant may now explicitly select 0+ existing Finding Category areas for a Business Concern or a Consultant Observation; MGD cross-references those areas against the findings its **unmodified, unfiltered, already-running** detectors produced, and displays that cross-reference honestly — without ever inferring an area from text, without ever filtering which detectors run, and without ever claiming a concern is "validated."

## 3. Current Contract (Traced, Not Assumed)

- **Business Concerns**: entered in wizard Step 3, previously `string[]` end-to-end (wizard state → `POST /api/mgd/run` body → `MGDRunParams.businessConcerns` → `composeMGDReport` → `buildDiagnosticScope`). No per-item ID existed pre-milestone; `DiagnosticScopeItem.id` was synthesized from array position (`scope-${index}`), which remains true.
- **Consultant Observations**: entered in wizard Step 4 as `ConsultantNote{id, title, observation, category}` — already had a real, stable `id` (a `crypto.randomUUID()`), unlike concerns. `category` is a separate, informal, 9-word vocabulary (Logistics/Inventory/Finance/…) used only by `generateConsultantInsights`'s keyword-bucketing, confirmed untouched and unrelated to Finding Categories.
- **Smallest safe insertion point**: `DiagnosticScopeItem` (a small, already-isolated, already-"never evidence" interface) and `ConsultantNote` (already carrying free-form fields with zero analytical consumers). Both accept new *optional* fields with zero risk to any existing consumer, since every existing consumer of either type already tolerates fields it doesn't recognize (structural typing, no strict-object validation anywhere in the chain).

## 4. Human-Confirmed Contract

```
BusinessConcernInput = string | { text: string; selectedAreas?: string[] }
```

A plain string remains fully valid forever (used by every existing caller, every historical report, every test written before this milestone). The richer form is additive. `selectedAreas` is validated — not inferred — against the fixed, authoritative Finding Category set (`Object.values(FINDING_CATEGORIES)`) at two independent points (`mgd-routes.ts`'s `safeAreas`, and `diagnostic-scope.ts`'s own internal filter as defense in depth): any value not in that exact set is silently dropped, never guessed at, never partially matched. `ConsultantNote.relatedArea?: string` follows the identical pattern, one area instead of a list (an observation describes one witnessed thing; a concern may reasonably span several).

**Why not `selectedDiagnosticAreas` as literally proposed in the milestone brief**: `selectedAreas` was chosen as the shorter, equally-clear name actually used in the shipped code; no semantic difference was intended or introduced.

## 5. Diagnostic Area Vocabulary Decision

**Finding Category is the vocabulary used**, and no new ontology was created. Reasoning, traced from code:

- It is the *only* vocabulary Findings themselves are actually tagged with (`OperationalFinding.category`) — so "show findings relevant to the selected area" is a trivial, honest, `===` comparison, not a new correlation mechanism.
- It is already the single, governed, authoritative vocabulary in the codebase (`finding-categories.ts`, consolidated in the Finding Category Governance milestone) — reusing it is strictly less risky than introducing a competing list.
- The alternatives were traced and rejected: Consultant Note categories (Logistics/Inventory/…) are a *different*, already-confirmed-distinct vocabulary with no mapping to Findings at all — repurposing it would require inventing exactly the unsafe inference this milestone forbids. Recommendation Categories are downstream of, and only one literal overlaps with, Finding Categories. Event Management "areas" are simply three of the nine Finding Categories under a different name.

**This is explicitly not a promotion of Finding Category to a governed product ontology.** The Finding Category Governance ADR's conclusion — that these 9 strings remain implementation-level vocabulary, not yet approved as a complete diagnostic ontology — is unchanged. What's new is a narrow, human-facing *reuse* of that stable vocabulary as a picklist label set, nothing more.

## 6. Meaning of Correlation — the Five Classes, Kept Distinct

| Class | What it is | Where it lives now |
|---|---|---|
| A. Client Concern | What management is worried about, in their own words | `DiagnosticScopeItem.concernText` — verbatim, unmodified |
| B. Diagnostic Scope | What the consultant explicitly asked MGD to examine | `DiagnosticScopeItem.selectedAreas` — human-selected only |
| C. Evidence | What the underlying data actually shows | `TxStats`/`EventSignals` — untouched by this milestone |
| D. Finding | What MGD detected | `OperationalFinding[]` — untouched, unfiltered, unfilterable by scope |
| E. Analytical Conclusion | What MGD concludes from evidence | Root Causes/Recommendations/Narrative — untouched |

The new `relevantFindingIds` cross-reference is a *display-layer bridge* from B to D — it never touches C or E, and it never collapses B into "this is now evidence" or D into "this finding is now proof of A."

## 7. Model A (Scoping) Chosen Over Model B (Filtering) — With Evidence

**Model A implemented; Model B rejected outright, not merely deferred.** Verified directly: `runMGDPipeline`'s Findings/Root Cause/Recommendation steps take no `selectedAreas` parameter anywhere in their call signatures — `generateOperationalFindingsWithExecutions`, `generateRootCausesWithExecutions`, `generateOperationalRecommendationsWithExecutions` are byte-identical to their pre-milestone selves. `attachRelevantFindings` runs strictly *after* `sortedFindings` already exists in `report-composer.ts`, reading it, never feeding back into it. Test 7 and Test 8 in the new regression suite assert this directly: findings/rootCauses/recommendations/health/evidence are byte-for-byte identical whether or not a concern selected an area, and every cross-domain category the fixture produces remains present regardless of which single area was selected. The CTO's stated reasoning — a business owner may name inventory while the real cause is manpower or dispatch — is honored structurally, not just by policy.

## 8. DiagnosticScopeItem Status Decision — VALIDATED Remains Unsafe

Investigated and explicitly rejected. Even with a human-selected area **and** a real, evidence-backed Finding in that exact category, `status` remains `UNVALIDATED` — never a new `VALIDATED` value. Reasoning: the finding's specific content is not deterministically checked against the concern's specific wording — only against the human-chosen *category*. A finding in `dispatch_operations` does not prove or specifically address whatever the client actually said about dispatch; it only shares a domain label. Claiming "validated" here would be exactly the semantic shortcut the CTO's brief explicitly prohibited. `SUPPORTED`/`NOT_SUPPORTED` remain reserved, unconstructed — see `diagnostic-scope.ts`'s updated header comment for the full, re-examined reasoning. What *is* now possible, honestly: `relevantFindingIds` — a factual "these specific findings share your requested area" statement, which the report renders with an explicit "not proof" caveat every time it's shown (both in `DiagnosticScopeSection` and in the Consultant Observations note cards).

## 9. Consultant Observation Boundary — Reconfirmed, Not Weakened

`ConsultantNote.relatedArea` and its resulting `relevantFindingIds` never enter `attachEvidenceToFindings`, never appear inside any `FindingEvidence.observation`, and never reach `evidence-sufficiency.ts` (which has zero import of `consultant-notes-engine.ts` or `diagnostic-scope.ts`, unchanged). Verified directly in the new regression suite (Test 9/10): a unique marker string placed in an observation's `observation` field, tagged with a `relatedArea` that a real finding shares, never appears inside any finding's `signals`/`evidence`, and Evidence Sufficiency is byte-identical with or without the tagged note. A consultant statement remains a consultant statement, always.

## 10. Frontend Scope Surface — Implemented, Minimally

`diagnosticScope` is now rendered (`DiagnosticScopeSection` in `mgd-report-viewer.tsx`) — the concrete gap Milestone 14 flagged as "a fully-built backend feature no one can see" is closed. The section shows, per concern: the concern text verbatim, an honest status badge (never "confirmed"/"validated" wording), the requested area(s) if any, and either the relevant findings (severity-dotted, title only) or an explicit "no findings in this area — this does not mean the concern is disproven" sentence. Consultant Observation cards gained the same treatment inline. Presentation Mode and PDF export were **not** touched in this milestone — both already read from the same persisted `report.narrative`/`report.findings`/etc., but neither currently reads `report.diagnosticScope` or the new `consultantInsights.notes` fields; this is recorded as a remaining gap (§14), not silently left undocumented.

## 11. Report Truthfulness Rules — Verified, Not Just Stated

Every rule from the milestone brief is implemented and tested:
- Concern ≠ evidence, Observation ≠ evidence: never written into any `FindingEvidence`, `signals`, or the evidence-sufficiency computation (Tests 9/10).
- No relevant evidence → the existing, honest `INSUFFICIENT_EVIDENCE` status (unchanged mechanism — Test 13).
- Relevant evidence but no finding → `UNVALIDATED` with an explicit "does not mean disproven" sentence, never a "disproven"/negative status (Test 12).
- A relevant finding → shown as "relevant to the requested area," never as confirmation (Test 11, §8).
- A root cause is never referenced by scope at all — `RootCause` has no `category` field by design (unchanged since the Finding Ontology milestone), so no cross-reference to root causes was attempted; this is a deliberate omission, not an oversight.

## 12. Implementation Summary

**Backend**: `diagnostic-scope.ts` gained `BusinessConcernInput`, `selectedAreas`/`relevantFindingIds` on `DiagnosticScopeItem`, and a new pure, read-only `attachRelevantFindings` function (mirrors `evidence-engine.ts`'s established "separate enrichment pass" shape). `consultant-notes-engine.ts` gained `ConsultantNote.relatedArea` (zero change to `generateConsultantInsights`'s logic). `report-composer.ts` widened `businessConcerns`'s type, extracts plain text for the unchanged `generateConsultantInsights` call, and calls `attachRelevantFindings` after `sortedFindings` exists. `mgd-pipeline.ts` widened one type alias. `mgd-routes.ts` gained `safeAreas`/`parseBusinessConcerns` validators.

**Frontend**: `mgd-diagnostic-wizard.tsx`'s concern state changed from `string[]` to `{text, areas}[]`; Step 3 gained a per-concern area-chip toggle row; Step 4 gained a "Related diagnostic area" select. `mgd-report-viewer.tsx` gained `DiagnosticScopeSection` and extended `ConsultantObservationsSection`'s note cards.

Verified live in the running dev app (not just unit tests): a concern tagged "Logistics Coordination" with zero evidence correctly rendered `INSUFFICIENT EVIDENCE` and the honest "no findings… does not mean disproven" sentence; a Consultant Observation tagged the same area rendered its dual category/area badges correctly alongside the same honest fallback.

## 13. Backward Compatibility

No migration performed or required. `selectedAreas`/`relevantFindingIds`/`relatedArea` are optional everywhere; a historical report or a legacy plain-string `businessConcerns` array produces the exact same output as before this milestone (Test 14). `buildDiagnosticScope`/`attachRelevantFindings` never throw and degrade to their pre-milestone behavior on any malformed input.

## 14. Remaining Gaps (Explicitly Out of Scope for This Milestone)

- Presentation Mode and PDF export do not yet render `diagnosticScope` or the extended consultant-note fields — only the primary report viewer does.
- No mechanism exists (nor was one proposed) for a concern to be revisited/re-tagged after a report is generated — areas are chosen once, at wizard time.
- Root Cause-level scope correlation remains architecturally out of reach (no category field on `RootCause`, unchanged, by design) — noted, not solved.

## Frozen Boundaries Honored

No AI, LLM, embeddings, semantic similarity, or keyword matching was used anywhere. No Finding Category was added, removed, or renamed. No detector logic, threshold, Evidence Sufficiency rule, Root Cause logic, or Recommendation logic was changed — verified by the full pre-existing test suite passing unchanged. No benchmarking, industry-pack expansion, financial valuation, or monitoring/alerting was built. `server/v2/*` and the legacy RCI/bulk-analysis system were not touched.
