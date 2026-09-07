# ADR — Structured Diagnostic Scope (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Structured Diagnostic Scope Architecture Decision Record |
| Status | Accepted and implemented (minimal, additive form only — see §Implementation Scope). |
| Scope | `server/mgd/*` only. Does not apply to `server/v2/*` (frozen, inspected only) or the legacy RCI/bulk-analysis system (not modified). |
| Relationship to other MGD V1 ADRs | Builds directly on [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md) (the four-information-class model) and [MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md](MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md) (`NONE`/`PARTIAL`/`SUFFICIENT`). This ADR implements the provenance ADR's top-ranked future candidate (§13.1: per-item origin tagging) in its narrowest possible form. |

---

## Core Principle

**BUSINESS CONCERN ≠ EVIDENCE. SCOPE ≠ TRUTH.**

A Business Concern ("client is concerned about delivery delays") establishes only that the client wants a topic investigated. It never, by its own existence, establishes that the topic's underlying problem is real, and it never independently produces, weights, or qualifies a Finding, Root Cause, Recommendation, or piece of `FindingEvidence`. This ADR's entire design exists to make that boundary structural rather than a matter of code-review discipline.

## 1. Current Business Concern Flow (traced)

Wizard Step 3 ("What concerns does the client want reviewed?") collects `businessConcerns: string[]` → `mgd-routes.ts` forwards it unchanged into `runMGDPipeline` → `mgd-pipeline.ts` passes it, untouched, only to `composeMGDReport` (never to any analytical function) → `generateConsultantInsights` merges it into `consultantInsights.operationalConcerns`, indistinguishable from operational-category Consultant Notes → persisted as part of the composed `MGDReport` → Report Viewer renders `consultantInsights` as a display-only panel. No existing structure separately preserves a business concern's own identity or evidence relationship — confirmed in the previous milestone and unchanged until this one.

## 2. Proposed Structured Diagnostic Scope Contract

```ts
export type ScopeStatus =
  | "UNVALIDATED"           // evidence exists in the report, not correlated to this concern
  | "INSUFFICIENT_EVIDENCE" // no evidence exists in the report at all
  | "SUPPORTED"             // reserved — not produced today
  | "NOT_SUPPORTED";        // reserved — not produced today

export interface DiagnosticScopeItem {
  id: string;                    // deterministic (`scope-0`, `scope-1`, …), not random
  concernText: string;           // verbatim business concern text
  origin: "BUSINESS_CONCERN";    // the only origin this milestone produces
  status: ScopeStatus;
}
```

**Fields deliberately not included, and why:**
- **Requested investigation area/category** (from the milestone brief's candidate list) — determining this from free text ("delivery delays" → "Delivery Performance") requires keyword or semantic matching, explicitly forbidden. Not included.
- **Linkage to resulting findings** (`linkedFindingIds`) — would always be empty today, since no correlation mechanism exists; including an always-empty field would be speculative rather than justified by present behavior. Documented as a future seam (§4) instead of implemented.
- A `CONSULTANT_OBSERVATION` origin value — a Consultant Observation is "what was witnessed," not "what to investigate" (per the provenance ADR's four-class model); it is a different information class and out of this milestone's scope, which is framed entirely around Business Concerns.

## 3. Evidence Sufficiency Interaction

`buildDiagnosticScope` reads only `businessConcerns` and the already-computed, report-level `evidence.level` — it never recomputes, and can never change, `metadata.evidence`. The five required cases:

| Case | Concern? | Evidence level | `diagnosticScope` result |
|---|---|---|---|
| A | Yes | SUFFICIENT | `status: "UNVALIDATED"` — real evidence exists in the report, but was not (and is not) correlated specifically to this concern's topic |
| B | Yes | PARTIAL | `status: "UNVALIDATED"` — same reasoning; PARTIAL is not treated any differently from SUFFICIENT for scope-status purposes, since neither is correlated per-concern |
| C | Yes | NONE | `status: "INSUFFICIENT_EVIDENCE"` — honestly states nothing could possibly substantiate any concern |
| D | No | SUFFICIENT | `diagnosticScope` is `undefined` (empty concerns list) — nothing to report |
| E | No | NONE | `diagnosticScope` is `undefined` — nothing to report |

Verified by regression test: a Business Concern present alongside `SUFFICIENT` evidence produces `metadata.evidence` byte-identical to the same run without the concern — confirming the concern cannot raise `NONE → PARTIAL` or `PARTIAL → SUFFICIENT`, because it is never read by `computeEvidenceSufficiency` at all.

## 4. Scope Status Semantics and the Future Correlation Seam

Only two of the four `ScopeStatus` values are producible today, by design (§2). `SUPPORTED`/`NOT_SUPPORTED` are reserved for a future milestone that would need to define, deliberately, how a specific concern is deemed to correspond to specific findings/evidence — this ADR explicitly declines to guess that correspondence via keyword or semantic matching now, per the milestone's Phase 4 instruction: *"If the current engine cannot reliably determine whether a concern corresponds to a particular evidence domain, preserve the concern as an unvalidated scope item rather than guessing."* Declaring the full four-value enum now, while constructing only two of its members, avoids a breaking type change whenever that future mechanism is designed — implementing that mechanism is out of scope here and is not attempted even in a limited form.

## 5. Report Contract Implications

**Old shape:** `MGDReport` had no `diagnosticScope` field; Business Concerns were visible only inside `consultantInsights.operationalConcerns` (merged with Consultant Notes, no origin marker).

**New shape:** one new, top-level, optional field: `diagnosticScope?: DiagnosticScopeItem[]`, present only when at least one non-blank business concern exists, absent otherwise (mirroring `consultantInsights`'s own presence rule).

**Compatibility implications:** strictly additive. No existing field's shape, type, or value changed. `consultantInsights.operationalConcerns` still contains the same merged strings it always did — this is a second, additional, explicitly-labeled representation, not a replacement, preserving the milestone's explicit "existing display of concerns may be preserved for compatibility" instruction.

**Persistence implications:** none — `report-store.ts` persists whatever `MGDReport` JSON it is given; no schema migration needed. Verified by a round-trip regression test (save → get) of a report containing `diagnosticScope`.

**Viewer/Presentation/PDF implications:** **no rendering was added in this milestone.** The field is present in the data returned by `GET /api/mgd/reports/:id` and in the persisted JSON, but is not yet surfaced in any UI. `mgd-report-viewer.tsx`'s local `MGDReport` type mirror was updated to include it (type-accuracy only, matching the file's existing pattern for `metadata.evidence`), with an explicit comment that it is not yet rendered. `mgd-presentation-mode.tsx` and `mgd-report-page.tsx` do not mirror `consultantInsights` at all today and were left unchanged for the same reason — adding an unused type field to those files would be inconsistent with their own established "only mirror what this page actually renders" convention. `pdf-export.ts` imports the canonical `MGDReport` type directly and needed no change. Rendering `diagnosticScope` is a natural, small follow-up, explicitly deferred per the milestone's "do not implement a large frontend redesign" instruction — see Recommended Next Milestone in the accompanying report.

## Implementation Scope (what was actually built)

- `server/mgd/diagnostic-scope.ts` (new) — `ScopeStatus`, `DiagnosticScopeItem`, `buildDiagnosticScope()`.
- `server/mgd/report-composer.ts` — one new top-level optional `MGDReport` field, computed via one new function call inside `composeMGDReport`, using parameters (`businessConcerns`, `evidence`) it already received before this milestone. No change to `mgd-pipeline.ts` was needed.
- `client/src/pages/mgd-report-viewer.tsx` — type-only mirror addition, no rendering change.

No change was made to findings, root causes, recommendations, benchmarks, health scoring, evidence sufficiency calculation, `FindingEvidence`, `ConsultantNote`, or any frozen V2 file.

## 6. Non-Goals

- No AI, embeddings, keyword weighting, or semantic matching of any kind, at any point.
- No correlation of a specific concern to specific findings or evidence (§4).
- No change to the legacy RCI/bulk-analysis system.
- No change to V2 `EvidenceObject`/`FinancialEvidence` — inspected once more in this milestone and reconfirmed as an entirely separate, frozen concept with no relationship to this work.
- No frontend rendering of the new field.

## 7. Risks

- A future contributor could be tempted to populate `SUPPORTED`/`NOT_SUPPORTED` using a quick keyword heuristic "just to make the field useful" — this ADR records explicitly that doing so was considered and deliberately rejected for this milestone, and should be treated as a real methodology decision requiring its own review, not a natural next commit.
- The still-existing duplication (a concern appears both in `consultantInsights.operationalConcerns`, unlabeled, and in `diagnosticScope`, labeled) could look like redundant/conflicting data to a future reader of the report JSON if not documented — both are documented, in code comments and here, as intentional: one is the backward-compatible legacy display, the other is the new, explicitly-provenanced representation.

## 8. Backward Compatibility

`diagnosticScope` is optional; a report persisted before this milestone simply lacks it (`undefined`), handled correctly by any consumer that checks for its presence rather than assuming a shape. Verified by a regression test constructing an old-shaped report object and confirming safe, non-throwing access. No historical report was modified or backfilled.
