# ADR — Diagnostic Scope & Evidence Coverage (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Diagnostic Scope & Evidence Coverage Architecture Decision Record |
| Status | **Accepted as a negative result.** This milestone investigated whether MGD can responsibly correlate a Business Concern to a specific evidence domain, and concluded **no** — no correlation mechanism was implemented. This ADR records that conclusion, the evidence for it, and the seam a future, separately-approved methodology could occupy. |
| Scope | `server/mgd/*` read-only investigation. No file under `server/v2/` or the legacy RCI/bulk-analysis system was modified or is in scope. |
| Relationship to other MGD V1 ADRs | Directly extends [MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md](MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md) (which defined `UNVALIDATED`/`INSUFFICIENT_EVIDENCE`/`SUPPORTED`/`NOT_SUPPORTED` and left the latter two unimplemented pending exactly this investigation) and [MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md](MGD_DIAGNOSTIC_CONTEXT_AND_EVIDENCE_PROVENANCE_ADR.md) (the four-information-class model). |

---

## What This Milestone Changed

**Nothing in analytical behavior.** No correlation logic, no `SUPPORTED`/`NOT_SUPPORTED` construction, no new fields beyond one documentation comment in `diagnostic-scope.ts` pointing here. This is a research milestone whose deliverable is this document plus regression tests proving the current, correct, conservative state is preserved.

## 1. Existing Analytical Domain Inventory (Phase 1)

| Domain concept | Where it lives | Values | Fed by | Feeds | Stable/documented, or implementation detail? | Safe as an evidence-coverage anchor? |
|---|---|---|---|---|---|---|
| **Finding category** (`FINDING_CATEGORIES`) | `server/mgd/findings-engine.ts` (exported `as const`) | 9 values: `inventory_visibility`, `logistics_coordination`, `warehouse_operations`, `manpower_dependency`, `financial_leakage`, `workflow_scalability`, `event_readiness`, `dispatch_operations`, `asset_management` | Transactions/documents via pattern detectors | `OperationalFinding.category`; consumed by `executive-narrative-engine.ts`'s `CATEGORY_LABEL` (identical 9 keys) and `root-cause-engine.ts`'s local `CAT` constant (identical 9 values, independently re-declared, not imported) | **Implementation detail** — confirmed by repo-wide search: zero references in `docs/` (no ontology or functional-spec document names, defines, or governs this list) | Partially — see §3 |
| **Recommendation category** (`REC_CATEGORIES`) | `server/mgd/recommendation-engine.ts` (exported `as const`) | 8 values: `inventory_control`, `logistics_optimization`, `manpower_coordination`, `operational_scalability`, `operational_visibility`, `profitability_protection`, `warehouse_operations`, `workflow_redesign` (+ `asset_recovery`, `event_readiness_control` seen in EM-specific recommendations) | Findings + root causes | `OperationalRecommendation.category` | Implementation detail, undocumented | No — see §1.1 |
| **Root Cause "domain"** | `server/mgd/root-cause-engine.ts` | *None* — `RootCause` has no `category` field | 2–3 findings, often from **different** categories simultaneously (e.g. `detectReactiveOperations` requires `logistics_coordination` **and** `inventory_visibility` **and** `manpower_dependency` findings all present) | `contributingFindings: string[]` (finding ids only) | N/A — deliberately cross-category by design | No — the concept doesn't exist here |
| **Evidence-detector category** (`evidence-engine.ts`'s `DETECTORS` map) | `server/mgd/evidence-engine.ts` | 4 of the 9 finding categories only: `inventory_visibility`, `logistics_coordination`, `manpower_dependency`, `warehouse_operations` | Transactions/documents | `FindingEvidence[]` attached to a finding | Implementation detail; **incomplete relative to `FINDING_CATEGORIES`** — 5 of 9 categories have no `FindingEvidence` detector at all | No — see §1.2 |
| **Consultant Note `category`** | `ConsultantNote.category` (`consultant-notes-engine.ts`) | Free string, informally bucketed by `OPERATIONAL_CATEGORIES`/`EXECUTIVE_CATEGORIES` (`Logistics`, `Inventory`, `Finance`, `Manpower`, `Sales`, `Operations`, `Procurement`, `Technology`, `Other`) | Consultant free entry | Display bucketing only (`consultantInsights`) | Implementation detail; a **fourth, independent** vocabulary (capitalized, different words) | No — not even value-comparable to the other three |
| **Business Concern "category"** | *(does not exist)* | `businessConcerns: string[]` has no category field at all | Free text | Nothing structured | N/A | N/A — there is nothing to anchor |

**§1.1** `REC_CATEGORIES` vs. `FINDING_CATEGORIES` share exactly **one** literal string: `warehouse_operations`. Every other conceptually-similar pair uses a different string (`inventory_control` ≠ `inventory_visibility`; `logistics_optimization` ≠ `logistics_coordination`; `manpower_coordination` ≠ `manpower_dependency`; `profitability_protection` ≠ `financial_leakage`; `asset_recovery` ≠ `asset_management`; `event_readiness_control` ≠ `event_readiness`). Verified by test (`evidence-coverage-architecture.test.ts`).

**§1.2** Even restricting to Finding categories alone: `dispatch_operations`, `event_readiness`, `asset_management`, `financial_leakage`, and `workflow_scalability` findings can exist in a report with **zero** attached `FindingEvidence` objects, because `evidence-engine.ts` has no detector for them. "A finding of category X exists" and "structured evidence citations for category X exist" are consequently two different, non-equivalent facts even within the one domain concept that does have real values.

## 2. Existing Evidence → Finding Architecture (Phase 2, traced, not changed)

`transactions`/`documents` → `generateOperationalFindings` (a fixed `DETECTORS` array of independent detector functions, each hardcoded to a single category) → `OperationalFinding[]` (each carrying exactly one `category`) → separately, `attachEvidenceToFindings` → `evidence-engine.ts`'s category-keyed `DETECTORS` map (only 4 of 9 categories, §1.2) attaches `FindingEvidence[]` post hoc → `generateRootCauses` (cross-category pattern detectors, §1's "Root Cause" row) → `generateOperationalRecommendations` (its own, different category vocabulary, §1.1). This pipeline is real, deterministic, and was **not modified** by this milestone. It does, however, confirm that "category" as a concept is authoritative and singular only at the Finding stage — it fragments into a different vocabulary one stage later (Recommendation) and disappears entirely at the Root Cause stage.

## 3. Scope Correlation Investigation (Phase 3)

| Approach | Deterministic? | Already implemented? | Reliable? | False-certainty risk? | Could safely populate SUPPORTED/NOT_SUPPORTED? | Additional contract required |
|---|---|---|---|---|---|---|
| **A. Exact structured category match** | Would be, if it existed | **No** — `businessConcerns` has no category field | N/A | N/A | No — nothing to match against | A category field on the concern itself, populated by a human, not inferred |
| **B. Existing ontology/category match** | N/A | **No** — no MGD V1 ontology document governs `FINDING_CATEGORIES`; it is undocumented, code-internal (§1) | N/A | High, if treated as authoritative when it isn't | No | Would require first promoting the category list to a governed concept |
| **C. Existing wizard category** | N/A | **No** — Step 3's `CONCERN_EXAMPLES` are plain quick-fill strings with no attached tag; clicking one inserts indistinguishable free text (verified by reading `mgd-diagnostic-wizard.tsx`) | N/A | N/A | No | A UI change to let the consultant pick a domain when adding a concern (see §6) |
| **D. Existing finding category** | Yes, as a value | Yes, but only for what it already does (labeling a finding) — never applied to a concern | Only 4/9 categories have real evidence detectors (§1.2); the 9 are undocumented and cross-file-duplicated (defined independently in 3 files with identical values but no shared import) | Yes — matching a concern to "the closest-sounding category" is itself an interpretive act, and the category a finding got depends on which of many overlapping detector functions happened to fire | No, not without a translation and matching step this milestone was told not to build | A single, imported, documented source of truth for the category enum, plus a real match step |
| **E. Existing evidence category** | Yes, as a value | Yes (`evidence-engine.ts`'s `DETECTORS` keys) | Weaker than D — a strict subset of D, missing 5 of 9 domains entirely | Same as D, worse (a "no evidence category" result could mean either "genuinely nothing" or "this domain has no detector at all," which are different facts today conflated by the module's return-`[]` behavior) | No | Same as D |
| **F. Plain-text concern, no structured category** | This is the actual, universal current case | Yes — this is simply what `businessConcerns: string[]` already is | Reliable as *text*, unusable as a *domain key* without matching | Using it as a domain key requires exactly the keyword/semantic matching this milestone (and its predecessors) explicitly prohibit | No | N/A — this is the honest baseline the current implementation already reflects |

**Conclusion of Phase 3: no approach above is safe today.** A/C require structural information that does not exist. B requires promoting an implementation detail to governed status first — a real but separate decision. D/E require either guessing (prohibited) or a human decision (§6) — and even with a category anchor in hand, D/E's own internal inconsistency (§1, §1.1, §1.2) means a match would carry more apparent certainty than the underlying category system itself possesses.

## 4. Evidence Coverage Definition (Phase 4)

Six distinct facts, none collapsible into another:

1. **Evidence exists somewhere in the report** — `metadata.evidence.level !== "NONE"`. Already computed, unrelated to any concern.
2. **Evidence exists that belongs to the scope domain** — **not computable today**, because (a) a concern has no domain, and (b) even a domain-tagged concern could only be checked against an evidence-detector category that covers 4 of 9 domains (§1.2).
3. **Evidence was analytically assessed** — a `Finding` of the relevant category exists in `report.findings`. Computable in principle (if a domain existed), but a Finding's existence already implies its own confidence/severity — it is a *stronger*, later fact than #2, not the same fact.
4. **A finding supports the concern** — requires the finding's *content*, not just its category, to actually address what the concern describes. A `dispatch_operations` finding titled "Dispatch Planning Dependency" (a staffing/process finding) does not support a concern about *delays* specifically, even though both are `dispatch_operations`. Category match ≠ topical match.
5. **A finding does not support the concern (i.e., positively refutes it)** — requires the same topical judgment as #4, in the negative direction; arguably harder, since an analytical engine finding *nothing wrong* in a domain is not proof the domain is fine, only that this run's detectors found nothing.
6. **The concern cannot be assessed** — the only fact MGD can state today, and does, via `UNVALIDATED` (evidence exists, not correlated) or `INSUFFICIENT_EVIDENCE` (no evidence at all).

**The current two-state model is sufficient for what MGD can honestly claim today.** It is not sufficient to ever express facts #2–#5 — but expressing them would require the missing structure/methodology this ADR declines to build, not a change to the enum itself (the enum's `SUPPORTED`/`NOT_SUPPORTED` members already reserve room for #4/#5 once that structure exists).

## 5. Evidence Existence vs. Evidence Relevance vs. Analytical Support

- **Evidence existence** = `metadata.evidence.level` — a report-wide, concern-independent fact. Already correct.
- **Evidence relevance** = "evidence of the specific kind this concern is about" — **not represented anywhere today**, and this milestone did not add a representation for it, because doing so requires exactly the domain-matching step shown unsafe in §3.
- **Analytical support** = a specific Finding/Root Cause whose content addresses the concern — strictly downstream of relevance, and therefore equally unrepresentable today.

## 6. Findings on SUPPORTED / NOT_SUPPORTED

**Not implemented, and this milestone found no existing deterministic contract that would make implementing them safe** — per Phase 7's explicit instruction, this is reported rather than acted on. The two-example epistemic test:

- *"Delivery delays are a problem" + 10 delivery records exist* → **No**, MGD cannot honestly say the concern is supported merely because delivery records exist. The records could show 10 on-time deliveries. Category-level (or even keyword-level) presence answers "is there data in the neighborhood of this topic," never "does the data show the specific problem stated." Only a real Finding whose *content* (not just category) matches would be evidence of support — and no mechanism determines that today without prohibited matching.
- *"Costs are too high" + revenue/expense data exists* → Same conclusion, compounded: MGD's closest categories (`financial_leakage`, `profitability_protection`) are about *leakage/erosion*, not "cost level" as a general concept, and "too high" is inherently relative to a benchmark or expectation the concern itself doesn't specify. Evidence presence here is even further from proving the claim than the delivery example.

## 7. Recommended Future Correlation Seam (Phase 6 — design only, not implemented)

The conceptually cleanest seam, **only where each step is actually supportable**:

```
Business Concern (free text, as today)
    ↓  ⟵ requires a NEW, human-populated field — not inferred
Structured Scope Domain (one of a governed, single-source-of-truth category enum)
    ↓  ⟵ requires unifying §1's three category vocabularies into one governed list first
Evidence Coverage (does a Finding of this domain exist? — computable once the above exists)
    ↓
Existing Analytical Findings (unchanged)
    ↓  ⟵ still cannot become "supports/refutes" without a content-level judgment MGD does not make today
Scope Status (SUPPORTED/NOT_SUPPORTED only reachable past that judgment)
```

Two honest options for the first arrow, neither implemented here:
- **(a) A human (the consultant) explicitly selects a domain when entering a concern** — deterministic, no guessing, but a wizard/UI change (out of scope this milestone) and a new required field on `businessConcerns`' shape (currently `string[]`, would need to become a structured type — a real, reviewable contract change).
- **(b) Leave every concern `UNVALIDATED` indefinitely** — the current, correct state, until (a) or an equivalent deliberate design is approved.

This milestone recommends **(b) remain the state** until a future milestone explicitly approves the wizard/contract change (a) requires — and explicitly recommends against ever attempting keyword/semantic inference as a substitute for (a), since §3 and §6 show why that would manufacture false certainty rather than genuine correlation.

## 8. Non-Goals

No AI, embeddings, keyword matching, fuzzy matching, or semantic classification of any kind. No change to findings, root causes, recommendations, benchmarks, health scoring, or Evidence Sufficiency. No unification of the three category vocabularies (a real, separate, non-trivial refactor — noted as a risk in §9, not undertaken). No change to `SUPPORTED`/`NOT_SUPPORTED`'s unreachability. No frontend change. No change to the legacy RCI/bulk-analysis system or any frozen V2 file.

## 9. Risks

- **Vocabulary drift**: `FINDING_CATEGORIES` is independently re-declared (same values) in `findings-engine.ts`, `root-cause-engine.ts` (as `CAT`), and `executive-narrative-engine.ts` (as `CATEGORY_LABEL`'s keys) — three copies, no shared import. A future edit to one without the others would silently break the *existing*, already-shipped category-labeling behavior (unrelated to scope) before it could ever break a future correlation feature. Worth a future small refactor (import from one source), not attempted here (out of scope, and would touch three files' existing, working behavior for a non-functional reason).
- **Temptation to "finish the enum"**: `SUPPORTED`/`NOT_SUPPORTED` sitting unused in the type can read as an oversight to a future contributor. This ADR is the explicit record that it is not one.

## 10. Backward Compatibility

No contract, type, or runtime behavior changed. All prior-milestone invariants (Business Concerns never affecting findings/root causes/recommendations/benchmarks/health score/evidence sufficiency; no concern ever becoming `FindingEvidence`; old reports without `diagnosticScope` remaining safely readable) are re-verified by this milestone's regression tests, unchanged.
