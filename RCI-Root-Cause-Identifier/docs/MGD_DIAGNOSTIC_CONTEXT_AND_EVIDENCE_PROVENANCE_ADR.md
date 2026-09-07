# ADR — Diagnostic Context & Evidence Provenance (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Diagnostic Context & Evidence Provenance Architecture Decision Record |
| Status | Accepted as an architectural design. **No production behavior changed by this ADR** — it documents the current architecture, the epistemic boundary between four information classes, and future implementation candidates. See §12 (Non-Goals) and §15 (Backward Compatibility). |
| Scope | `server/mgd/*` (the canonical MGD V1 diagnostic pipeline) only. Does not apply to `server/v2/*` (frozen — inspected, not modified; see §7) or the legacy RCI/bulk-analysis system (`server/core/bulk-analyzer.ts`, `server/modules/diagnostics/*`), referenced once in §7 as prior art, not migrated. |
| Relationship to other MGD V1 ADRs | Builds directly on [MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md](MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md) (evidence sufficiency: NONE/PARTIAL/SUFFICIENT) and the investigation preceding it (input-consumption tracing). Not appended to `docs/99_ARCHITECTURE_DECISIONS.md`, which is explicitly scoped to MGD V2. |

---

## 1. Problem

MGD collects four kinds of information that are structurally different in what they prove, but the current architecture only distinguishes two of them (analytical engines vs. everything else) rather than four. Left unaddressed, any future intelligence work risks doing exactly what this ADR exists to prevent: quietly converting *"management is worried about X"* into *"X is true,"* or *"the consultant said they saw Y"* into *"the system proved Y."* This ADR names the four classes precisely, states what the codebase already does correctly, and identifies exactly where a future, carefully-scoped implementation would need to add structure — without doing that work now.

## 2. Four Information Classes

1. **Documentary/System Evidence** — a transaction record, invoice, inventory report, dispatch record, or other structured extraction from an uploaded document. Machine-derived, source-traceable.
2. **Consultant Observation** — a first-person claim by the consultant about what they personally witnessed ("observed three manual inventory adjustments during the visit"). Human-origin, but asserted as a direct account of a real, specific event.
3. **Business Concern** — a statement of what management is worried about or wants examined ("management is concerned about inventory shrinkage"). Human-origin, but a *belief or priority*, not a claim of having witnessed anything.
4. **Analytical Conclusion** — a Finding, Root Cause, or Recommendation: MGD's own synthesis, currently derived exclusively from class 1.

## 3. Epistemic Distinction

The four classes differ along one axis that matters more than any other for a diagnostic platform's credibility: **what would have to be false for the statement to be wrong.** Documentary Evidence is wrong only if the document was misread or the source system is itself wrong. A Consultant Observation is wrong only if the consultant misremembered or misrepresented what they saw. A Business Concern is not "wrong" at all in that sense — it is a report of a mental state ("I am worried"), true by definition regardless of whether the underlying fact is true. Collapsing these into one bucket (as the current `consultantInsights.operationalConcerns` array does — see §6) discards exactly the information a future corroboration model would need.

## 4. Business Concern Semantics

- **Provenance**: a plain string, contributed by whoever is running the diagnostic wizard (typically the consultant, relaying what the client said) — no author/actor field exists today (see §7).
- **Confidence semantics**: none apply. A concern is not a measurement; it has no confidence to express.
- **Can it become evidence?** No — by design, and this ADR does not propose changing that.
- **Can it directly influence scoring?** No, today or in any near-term proposal (§9, §12 explicitly forbid this).
- **Can it trigger investigation?** This is its one plausible future role — see §10 ("diagnostic scope," not evidence).
- **Can it support a finding?** No — a finding must remain evidence-derived.
- **Can it appear in the final report?** Yes, today, as context (`consultantInsights.operationalConcerns`).
- **Requires corroboration?** N/A for display; **yes**, absolutely, before it could ever inform a scope decision that shapes what MGD looks for (§10).

## 5. Consultant Observation Semantics

- **Provenance**: a structured `ConsultantNote { title, category, observation }` — no id, timestamp, or author field today (see §7).
- **Confidence semantics**: none today. A future model could treat this as lower-confidence-than-documentary but higher-provenance-than-a-stated-concern, since it claims a direct account of an event.
- **Can it become evidence?** Not today. Architecturally plausible in the future as a distinct, explicitly-labeled evidence *class* (human-origin), never silently merged with documentary evidence (§11).
- **Can it directly influence scoring?** No (§9, §12).
- **Can it trigger investigation?** Plausible, same as a Business Concern, but with a stronger prior — a direct claim of witnessing something is more specific than a general worry.
- **Can it support a finding?** Only ever as *labeled, corroborating* context alongside real documentary evidence — never alone (§8).
- **Can it appear in the final report?** Yes, today, as context (`consultantInsights.executiveObservations` / `.operationalConcerns`, and separately preserved in full in `.notes`).
- **Requires corroboration?** Yes, before it could support any analytical conclusion.

## 6. Documentary Evidence Semantics

- **Provenance**: `FindingEvidence { documentId?, documentName?, observation, source?, confidence? }` (`server/mgd/evidence-engine.ts`) — attached to findings via category-specific pattern detectors (`detectInventoryVisibility`, `detectLogisticsCoordination`, etc.), all operating on parsed transactions/documents only. `confidence` is deliberately bounded 50–95 ("never 0 or 100 — always a measured estimate").
- **Can it become evidence?** It already is the evidence.
- **Can it directly influence scoring?** Yes — this is the only class that does, today.
- **Requires corroboration?** No — it is itself the corroborating layer for everything else.

## 7. Analytical Conclusion Semantics, and the EvidenceObject/Provenance Gap

- **Provenance**: a Finding/Root Cause/Recommendation is provenanced only indirectly, via `contributingFindings`/`relatedRootCauses` id arrays linking it back to the Findings that produced it, which are in turn linked to `FindingEvidence`.
- **Requires corroboration?** By definition — a conclusion IS the corroborated output of the evidence chain.

**On "EvidenceObject": traced and found to be an entirely separate, frozen concept.** `EvidenceObject` and `FinancialEvidence` (as literally named) are defined in `server/v2/shared/contracts/evidence-object.ts` and `financial-evidence.ts` — part of the frozen Financial Intelligence Framework, governed by V2's own ADR-004 ("Evidence precedes interpretation"). They are not imported by, and share no code with, MGD V1's pipeline. **Not inspected further and not modified**, per the frozen boundary. The provenance architecture actually relevant to this ADR is MGD V1's own `FindingEvidence` (§6), which is a materially simpler shape.

**Gap identified in `FindingEvidence`:** it has no field capable of expressing *source type* (system-extracted vs. human-observed vs. asserted-belief), no timestamp, and no author/actor. Today this is not a real gap in practice, because every current `FindingEvidence` producer operates exclusively on parsed transactions/documents — the field is simply never populated from a human-origin source. It becomes a gap only if a future milestone tries to let a Consultant Observation become evidence (§11) — at that point, `FindingEvidence` would need at minimum a `sourceType` field to avoid silently looking identical to documentary evidence. **This ADR does not add that field now** — no current code path would set it, so adding it today would be speculative, not "a very small change clearly justified by inspection." It is recorded as the smallest concrete future candidate (§13.1).

## 8. Future Corroboration Architecture (seam only, not implemented)

The architectural seam this ADR proposes: a future analytical conclusion's presentation could carry a `supportedBy` list distinguishing *which classes* contributed to it, e.g.:

```
Root Cause: "Inventory control weakness"
  supportedBy:
    - documentary_evidence: [finding f1 (inventory adjustment records show discrepancies)]
    - consultant_observation: [note n1 ("warehouse reconciliation is performed manually")]
```

Critically, the root cause's *existence and severity* would still be derived exclusively from `documentary_evidence` — the consultant observation's role would be to appear alongside it as corroborating color, never as an independent trigger. This is the difference between *"supported by X and Y"* and *"X and Y together imply the conclusion,"* and it is exactly the distinction §3's epistemic-status principle demands. No `supportedBy` field, join logic, or correlation engine is implemented in this milestone.

## 9. Evidence Sufficiency Interaction

`metadata.evidence.level` ([MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md](MGD_V1_EVIDENCE_SUFFICIENCY_ADR.md)) is computed **exclusively** from `transactions`/`documents`/`metrics` — Business Concerns and Consultant Observations play no role in it today, verified by regression test (§15). The four combinations and their correct future meanings:

| Business Concern present? | Evidence level | Correct meaning |
|---|---|---|
| Yes | NONE | "A concern was recorded, but no documentary evidence exists to validate or refute it." |
| Yes | SUFFICIENT | "A concern was recorded; documentary evidence exists and could in principle be examined against it — MGD does not yet do this correlation." |
| No | NONE | "No evidence, no stated concern — a fully unassessed diagnostic." |
| No | SUFFICIENT | Today's normal case — evidence-driven findings with no consultant framing. |

The corresponding rule for Consultant Observation is the one this ADR's "most important principle" exists to enforce: **a Consultant Observation existing must never be read as, or presented as, evidence existing.** `metadata.evidence.level` must remain computed from documentary sources only, permanently — this ADR does not propose ever blending consultant-origin information into that computation, only into a separate, clearly-labeled `supportedBy`-style annotation on a conclusion (§8).

## 10. Business Concerns as Diagnostic Scope (future candidate, not implemented)

A Business Concern could, in principle, safely become a **scope/priority signal** — "the client mentioned inventory, so surface inventory-related findings more prominently, or explicitly check whether documentary evidence for that area exists" — without becoming evidence itself. The critical guardrail: if MGD is prompted to "investigate inventory" by a concern and finds nothing, it must say *"No documentary evidence was available to validate the concern"* — not stay silent (which would look like "nothing to see here") and not fabricate a finding to satisfy the concern. This distinction (concern shaping *what MGD looks at* vs. *what MGD claims is true*) is answerable today: **yes, architecturally safe in principle**, but not implemented — no current code path uses `businessConcerns` to alter which detectors run or which findings are surfaced, and this ADR does not add one.

## 11. Consultant Observations as Human-Origin Evidence (future candidate, not implemented)

The minimal structure a future `ConsultantNote`-as-evidence would need, if ever pursued: an explicit `sourceType: "CONSULTANT_OBSERVATION"` tag (never silently reusing `sourceType: "DOCUMENT"`), plus enough of `FindingEvidence`'s existing shape (`observation`, `confidence`) to render alongside documentary evidence without being mistaken for it. This ADR identifies the shape but does not add it — no current detector would ever populate it, so building it now would be a speculative, unused type, which §16 of the brief explicitly discourages ("Do NOT introduce a parallel evidence system").

## 12. Non-Goals (this milestone)

- No keyword weighting, free-text scoring, semantic embedding, or AI of any kind.
- No change to finding, root-cause, recommendation, benchmark, or health scoring.
- No new `EvidenceObject`, `FinancialEvidence`, or second `MGDReport` contract.
- No change to `FindingEvidence`, `ConsultantNote`, or `businessConcerns`' existing shapes.
- No migration of the legacy RCI/bulk-analysis system's context model (§7 references it as prior art only — see below).
- No change to `MIN_SUFFICIENT_TRANSACTIONS = 5`, which remains an explicitly provisional engineering threshold, not a scientific claim.
- No change to any file under `server/v2/`.

**Prior art noted, not migrated:** the legacy RCI/bulk-analysis system (`server/core/bulk-analyzer.ts`) already lets its analogous inputs — `diagnosticContexts` and `selectedSymptoms` — directly boost root-cause scoring (`CONTEXT_BOOST`) and re-weight findings (`applySymptomAlignmentGuardrail`) from free-text/tag input. This is exactly the kind of blending §3 warns against, and it is **not** a model to replicate — it is recorded here only because it is relevant precedent that already exists elsewhere in the codebase, confirming this is a real, live architectural tension the industry-adjacent legacy system resolved in the opposite direction from what this ADR recommends. Not touched, per the frozen-legacy instruction.

## 13. Future Implementation Candidates (ranked, smallest first)

1. **Add `source: "concern" | "consultant_note"` per-item tagging inside `consultantInsights.operationalConcerns`** (currently a flat `string[]` merging both — see §6/§4 investigation), so the report can at least visually distinguish a stated worry from an observed operational note, without touching any analytical engine. Smallest possible change; still a `MGDReport` contract change (string[] → object[]), so deferred to a dedicated, reviewed milestone rather than made here under "do not redesign the entire report."
2. Add `metadata.diagnosticScope: string[]` (or similar) recording which areas a Business Concern flagged, purely descriptive, with no engine behavior attached — a pure labeling step before any actual scope-driven detector logic exists.
3. Add `sourceType` to `FindingEvidence` (§7, §11) — only once a real producer of human-origin evidence exists to populate it.
4. Design the `supportedBy` corroboration annotation (§8) on Root Cause / Recommendation — the largest and last of these, since it depends on 1–3 already existing.

## 14. Risks

- **Gradual scope creep toward AI-style inference** if a future milestone conflates "let concerns shape scope" (§10, explicitly framed as safe) with "let concerns shape conclusions" (explicitly never safe) — the two are adjacent in the UI and easy to blur in implementation.
- **Silent provenance loss** if a future contributor adds a new `FindingEvidence` producer without setting a `sourceType` once one exists (§7) — mitigated only by code review discipline, not by any current enforcement mechanism.
- **False confidence from corroboration UI** — a `supportedBy` list (§8) that visually lists "documentary evidence" and "consultant observation" side by side, with equal visual weight, could look to a reader like two equally strong proofs rather than one proof and one piece of context. Any future implementation of §8 must design the presentation to avoid this, not just the data model.

## 15. Backward Compatibility

No type, contract, or runtime behavior changed by this ADR. `ConsultantNote`, `businessConcerns: string[]`, `FindingEvidence`, and `MGDReport.consultantInsights` are all unchanged. Confirmed by regression tests (§17 of the milestone report) that findings/root causes/recommendations/health score/evidence level are byte-identical with and without Business Concerns/Consultant Observations present, both at zero-evidence and real-evidence levels, and that no `FindingEvidence` entry is ever derived from consultant-origin text.
