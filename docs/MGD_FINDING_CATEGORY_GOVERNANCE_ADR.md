# ADR — Finding Category Governance (MGD V1)

## Document Control

| Field | Value |
|---|---|
| Document | MGD V1 — Finding Category Governance Architecture Decision Record |
| Status | Accepted and implemented. |
| Scope | `server/mgd/*` only. Does not apply to `server/v2/*` (frozen, untouched) or the legacy RCI/bulk-analysis system (untouched). |
| Relationship to other MGD V1 ADRs | Directly implements the top-ranked recommendation of [MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md](MGD_DIAGNOSTIC_SCOPE_EVIDENCE_COVERAGE_ADR.md) §9/§18 (consolidate the duplicated `FINDING_CATEGORIES`-equivalent declarations), approved as CTO Decision A in that milestone's follow-up. Does **not** implement Decision B (human-selected scope domains, deferred) or change Decision C's behavior (`UNVALIDATED` as a legitimate epistemic state) — see [MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md](MGD_STRUCTURED_DIAGNOSTIC_SCOPE_ADR.md). |

---

## 1. What a Finding Category Is

A Finding Category is one of 9 fixed string identifiers (`inventory_visibility`, `logistics_coordination`, `warehouse_operations`, `manpower_dependency`, `financial_leakage`, `workflow_scalability`, `event_readiness`, `dispatch_operations`, `asset_management`) that classifies which operational domain a single `OperationalFinding` belongs to. It is produced exactly once, by the specific finding-detector function in `findings-engine.ts` that generated that finding, and is carried on `OperationalFinding.category` from that point through the rest of the pipeline (root-cause grouping, recommendation triggering, narrative theming, industry-rule evaluation, and the persisted `MGDReport`).

## 2. What It Is Not

- It is **not** a Recommendation Category (`REC_CATEGORIES` in `recommendation-engine.ts`) — a separate, independently-evolved 10-value vocabulary describing what *kind of corrective action* a recommendation proposes, not what evidence domain produced it.
- It is **not** a Consultant Note category (`Logistics`, `Inventory`, `Finance`, etc. in `consultant-notes-engine.ts`) — a capitalized, informal bucketing scheme for human-entered text, unrelated to and never compared against Finding Categories anywhere in the codebase.
- It is **not**, automatically, a Diagnostic Scope Domain. See §8.
- It is **not** a governed, product-facing ontology term. It remains exactly what it always was: an internal implementation detail of the MGD V1 analytical pipeline, now with one authoritative declaration instead of several.

## 3. Why Finding Categories Are Distinct From Recommendation Categories

Traced in the predecessor ADR and re-confirmed here: the two vocabularies share exactly one literal string (`warehouse_operations`) by coincidence, not by design — every other conceptually-adjacent pair uses a different string (`inventory_control` ≠ `inventory_visibility`; `logistics_optimization` ≠ `logistics_coordination`; `manpower_coordination` ≠ `manpower_dependency`; `profitability_protection` ≠ `financial_leakage`; `asset_recovery` ≠ `asset_management`; `event_readiness_control` ≠ `event_readiness`). This milestone's frozen boundaries (#8) explicitly forbid merging them, and the refactor performed here preserves that: `recommendation-engine.ts`'s `REC_CATEGORIES.WAREHOUSE_OPERATIONS = "warehouse_operations"` remains its own, untouched declaration — it is not re-pointed at `FINDING_CATEGORIES`, even though the string happens to coincide, because doing so would wrongly imply the two vocabularies are the same concept.

## 4. Why Finding Categories Are Distinct From Consultant Note Categories

`ConsultantNote.category` values (`Logistics`, `Inventory`, `Finance`, `Manpower`, `Sales`, `Operations`, `Procurement`, `Technology`, `Other`) are capitalized, English-word labels chosen for a consultant filling out a form — not machine identifiers. They are never compared, converted, or unified with `FINDING_CATEGORIES` anywhere in the codebase, and this milestone made no change that would make that comparison possible or tempting.

## 5. Why Root Causes Do Not Require a Single Category

Confirmed by direct inspection (unchanged, re-verified by this milestone's tests): `RootCause` has no `category` field. Root-cause detectors are explicitly cross-category syntheses — e.g. `detectReactiveOperations` fires only when `logistics_coordination`, `inventory_visibility`, **and** `manpower_dependency` findings are simultaneously present. A Root Cause is, by architectural design, the point at which "single domain" stops being a coherent concept — imposing one would misrepresent what the detector logic actually does.

## 6. The Authoritative Source of Finding Categories

**`server/mgd/finding-categories.ts`** — a new, single-purpose leaf module with zero imports, exporting `FINDING_CATEGORIES` (the `as const` object) and `FindingCategory` (its derived literal-union type).

**This was not the first design tried.** The initial approach kept the declaration inside `findings-engine.ts` (where it already lived) and had every other consumer import from there. This was implemented, and immediately caught by the full test suite (not by `npm run check`, which stayed silent): `findings-engine.ts` itself imports `evidence-engine.ts` (for `FindingEvidence`), and once `evidence-engine.ts` also needed to import `FINDING_CATEGORIES` from `findings-engine.ts`, a circular import was created. At module-load time, `evidence-engine.ts`'s top-level `DETECTORS` object literal evaluated before `findings-engine.ts` had finished initializing, so `FINDING_CATEGORIES` was `undefined` — a `TypeError: Cannot read properties of undefined` on every real pipeline run, silent at the type level. Extracting the vocabulary into its own dependency-free file eliminates the cycle entirely, for this and any future consumer. `findings-engine.ts` now imports and re-exports `FINDING_CATEGORIES`/`FindingCategory` from the new file, so `import { FINDING_CATEGORIES } from "./findings-engine"` (the pre-existing external import path, including this milestone's own test file) continues to work unchanged.

## 7. The Current Category List

```
inventory_visibility, logistics_coordination, warehouse_operations,
manpower_dependency, financial_leakage, workflow_scalability,
event_readiness, dispatch_operations, asset_management
```
Unchanged from before this milestone — no category renamed, added, or removed (frozen boundaries #4–#7), verified by regression test comparing the authoritative list against this exact, fixed expected array.

## 8. These Categories Are NOT Automatically Diagnostic Scope Domains

Consolidating the *implementation* of an existing internal vocabulary into one source of truth is a structural/hygiene change. It is explicitly **not** a decision that these 9 strings are ready to become user-facing, selectable Diagnostic Scope Domains (Decision B, still deferred). Doing so would require, at minimum: a product decision that this vocabulary (rather than some other framing) is the right one to expose to a consultant; UI work to let a human select a domain (§9); and acceptance that only 4 of the 9 categories currently have any `FindingEvidence` detector backing them — exposing all 9 as equally "selectable" today would overstate what the system can actually substantiate for 5 of them.

## 9. Conditions Required Before Any Future Category Can Become a User-Selectable Scope Domain

1. An explicit CTO/product decision (Decision B in the predecessor milestone) approving human-selected scope domains at all.
2. A UI/wizard change letting a consultant pick a domain when entering a Business Concern — not inferred from free text (frozen boundary #13, and the predecessor ADR's finding that inference requires prohibited matching).
3. A decision on what to do about the 5 categories with no `FindingEvidence` detector (`financial_leakage`, `workflow_scalability`, `event_readiness`, `dispatch_operations`, `asset_management`) — whether to build detectors for them first, or to expose only the 4 that already have one.
4. A decision on whether `SUPPORTED`/`NOT_SUPPORTED` should ever be earned by category-level presence alone, given the predecessor ADR's finding that category match ≠ topical match (a `dispatch_operations` finding about staffing does not "support" a concern specifically about delays).

None of these conditions were met or pursued in this milestone.

---

## Semantic Governance Table

| Category | Produced by (detector) | Has FindingEvidence support? | Consumed by Root Cause logic? | Consumed by Recommendation logic? | Appears in report? | User-facing? | Classification |
|---|---|---|---|---|---|---|---|
| `inventory_visibility` | 3 detectors in `findings-engine.ts` | Yes (`detectInventoryVisibility`) | Yes (multiple root-cause patterns) | Yes (`FC.INV`) | Yes (`finding.category`, narrative theming) | Indirectly (finding titles/narrative text) | **B** — implementation-level label, stable in usage |
| `logistics_coordination` | 3 detectors | Yes | Yes | Yes (`FC.LOG`) | Yes | Indirectly | **B** |
| `warehouse_operations` | 1 detector | Yes | Yes | Yes (`FC.WH`) | Yes | Indirectly | **B** |
| `manpower_dependency` | 1 detector | Yes | Yes | Yes (`FC.MAN`) | Yes | Indirectly | **B** |
| `financial_leakage` | 1 detector | **No** | Yes | Yes (`FC.FIN`) | Yes | Indirectly | **C** — usage-stable but structurally incomplete (no evidence detector) |
| `workflow_scalability` | 2 detectors | **No** | Yes | Yes (`FC.WFL`) | Yes | Indirectly | **C** |
| `event_readiness` | 2 detectors | **No** | Yes (EM patterns) | Yes (`FC_EM.READINESS`) | Yes | Indirectly | **C** |
| `dispatch_operations` | 3 detectors | **No** | Yes (EM patterns) | Yes (`FC_EM.DISPATCH`) | Yes | Indirectly | **C** |
| `asset_management` | 1 detector | **No** | Yes (EM patterns) | Yes (`FC_EM.ASSET`) | Yes | Indirectly | **C** |

No category is classified **A** (a stable, governed diagnostic concept ready for external/product exposure) — that status requires the conditions in §9, none of which this milestone met.

---

## Duplicate Declaration / Drift Analysis (Phase 3, as performed)

Six declaration/usage sites were found (three more than the two identified in the predecessor investigation):

1. `findings-engine.ts` — `FINDING_CATEGORIES` (the pre-existing authoritative-in-spirit source).
2. `root-cause-engine.ts` — local `CAT` object, same 9 values, abbreviated key names.
3. `recommendation-engine.ts` — local `FC`(6)/`FC_EM`(3) objects, same 9 values, abbreviated key names, explicitly labeled "Finding category constants" in a pre-existing code comment.
4. `executive-narrative-engine.ts` — `CATEGORY_LABEL`'s 9 keys, plus (discovered only once the full-file sweep and regression tests ran) 13 further freehand literal occurrences inside two `hasCategory(findings, "...")` call clusters and one direct `f.category === "..."` comparison.
5. `evidence-engine.ts` — `DETECTORS`'s 4 keys, plus 3 further freehand `source: "logistics_coordination"` tags inside `detectLogisticsCoordination` (found the same way).
6. `benchmark-engine.ts` and `industry-packs/event-management-pack.ts` — freehand literals with no local constant object.

**Value-set comparison**: byte-identical across all six — every occurrence, once located, used the exact same 9 strings. **Ordering**: identical in every declaration that has an inherent order (`findings-engine.ts`, `root-cause-engine.ts`'s `CAT`, `executive-narrative-engine.ts`'s `CATEGORY_LABEL`). **Consumption shape**: all as plain strings (`OperationalFinding.category: string`, `byCategory(...cats: string[])`, `Record<string, ...>` keys) — no consumer requires a literal-union type, so none was forced onto `OperationalFinding.category` itself (a materially larger, unrequested change). **Conclusion: genuinely, verifiably equivalent — safe to consolidate**, which is exactly what was done.

**Two important non-matches were found and deliberately left alone**: `benchmark-engine.ts`'s `"inventory_control"`/`"operational_health"` category values (its own distinct benchmark-labeling scheme, not Finding Categories despite `"inventory_control"` superficially resembling `inventory_visibility`), and `recommendation-engine.ts`'s `REC_CATEGORIES.WAREHOUSE_OPERATIONS` (§3). Treating either as a Finding Category duplicate would have been a real semantic error, not a safe consolidation.

## Backward Compatibility

No category was renamed, added, or removed. No `OperationalFinding`, `RootCause`, `OperationalRecommendation`, `BenchmarkResult`, or `MGDReport` field's type or shape changed. `import { FINDING_CATEGORIES } from "./findings-engine"` continues to resolve correctly via re-export. All behavioral-preservation regression tests (see the milestone report) pass, including an exact reproduction of a fixed 10-transaction fixture's finding/root-cause/recommendation counts and health score, matching every prior milestone's run of the same fixture.
