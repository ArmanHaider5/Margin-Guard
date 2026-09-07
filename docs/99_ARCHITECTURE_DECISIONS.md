# Architecture Decision Records — Scope Optix Platform

## Document Control

| Field | Value |
|---|---|
| Document | Scope Optix Platform — Architecture Decision Records |
| Status | **Living record.** New ADRs are appended, never inserted out of order; a superseded ADR is marked superseded, never deleted or renumbered. |
| Scope | Records the specific, load-bearing decisions made during MGD V2 implementation that are not fully spelled out by the conceptual architecture documents on their own, or that those documents' principles resolve to when applied to real code structure. |
| Related documents | [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md), [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md), [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md), [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md), [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md), [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md), [V2_ROADMAP.md](V2_ROADMAP.md), [TECH_DEBT.md](TECH_DEBT.md) |

Each record below follows the standard ADR shape: Status, Context, Decision, Consequences.

---

## ADR-001 — MGD V2 lives beside V1

**Status.** Accepted.

**Context.** MGD V1 (`server/core/`, `server/cil/`, `server/documents/`, `server/mgd/`, `server/modules/`, `server/industries/`, `shared/schema.ts`, and every existing route) is frozen production baseline. [TECH_DEBT.md](TECH_DEBT.md) documents how V1 itself accumulated three diagnostic engines by being extended and re-extended in place over time. [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §10 and [V2_ROADMAP.md](V2_ROADMAP.md) both specify a strangler-fig migration rather than an in-place rewrite.

**Decision.** All V2 code lives under `server/v2/`, structurally isolated from every V1 path. No file under `server/v2/` imports from a V1 path; no V1 file imports from `server/v2/`. The only narrow, inert exception is `server/v2/adapters/`, which may read a V1 type's shape for compatibility purposes but is never called by V1 at runtime until an explicit, separately approved cutover.

**Consequences.** V1 remains fully stable and unaffected by V2 development for the entire duration of the migration. V2 can be built, tested, and iterated on without any risk of regressing production. The cost is temporary duplication of concepts (e.g. document parsing exists in both `server/documents/` and `server/v2/document-parser/`) until the cutover in a future sprint retires the V1 path.

---

## ADR-002 — Business Ontology governs all products

**Status.** Accepted.

**Context.** [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) defines the canonical business language intended to underlie MGD, 5MCS, YieldIQ, and future Scope Optix products.

**Decision.** Every business concept named anywhere in `server/v2/` — a type, a normalized term, an event, a value object — must be traceable to a concept defined in the approved Ontology (or a document the Ontology governs, such as the Data Model's Financial Object Model). No module may invent a business term that has no such traceable origin. Concretely, this sprint's terminology normalization stage consults an Ontology-derived term registry rather than a standalone, arbitrary synonym list, and every emitted normalization carries an `ontologyReference`.

**Consequences.** Every canonical term MGD V2 ever surfaces can answer "which approved document defines this" on demand — a direct, code-level instance of the Ontology's own Explainability principle (Ontology Chapter 8). The cost is that adding a genuinely new business term requires updating the Ontology (or a document it governs) first, not just adding a string to a code file — this friction is intentional.

---

## ADR-003 — Knowledge is data, not code

**Status.** Accepted.

**Context.** [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 10 and [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 1 both state this as a governing principle, in direct response to V1's four independent, code-based root-cause libraries ([TECH_DEBT.md](TECH_DEBT.md) §2).

**Decision.** `server/v2/knowledge/` is the single, dedicated home for reusable, versioned domain knowledge (starting with the Ontology term registry this sprint). No engine module — `document-parser/`, and every future domain module — may hardcode a private copy of knowledge that belongs in `knowledge/`. Where a sprint's scope does not yet justify a full Knowledge Library implementation (e.g. this sprint's document-type classification rules, which are not yet a Knowledge System entity), that is recorded as a stated, flagged decision with an explicit promotion path, never left as silent inconsistency.

**Consequences.** Knowledge content can evolve — new terms, new rules — without an engine code change once the Knowledge Library is fully built out. In the interim, a small number of sprint-scoped, in-code rule tables exist by explicit exception, each documented as such.

---

## ADR-004 — Evidence precedes interpretation

**Status.** Accepted.

**Context.** [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 5 defines the mandatory Evidence Chain (Evidence → Signal → Finding → Root Cause → Recommendation → Opportunity) as a structural, not advisory, rule.

**Decision.** `document-parser/` produces `EvidenceObject[]` — source-traceable, uninterpreted candidate facts — and stops there. It does not classify a Signal, does not produce a Finding, and does not draw any conclusion. Every value carried by an `EvidenceObject` (`rawValue`, `observedValue`, `normalizedValue`) preserves its lineage back to an exact document location; nothing is asserted without that traceability.

**Consequences.** Interpretation (Signal classification, Finding generation) is deferred entirely to future modules (`operational-intelligence/`, `financial-intelligence/`, `brain/`), which keeps this sprint's scope honest and keeps the Evidence Chain enforceable at a single, well-defined boundary rather than something every module must independently re-implement.

---

## ADR-005 — Modules communicate only through public APIs

**Status.** Accepted.

**Context.** V1's accumulated coupling (documented across [TECH_DEBT.md](TECH_DEBT.md)) arose in part from modules reaching into each other's internals with no stable boundary.

**Decision.** Every top-level module under `server/v2/` (`document-parser/`, `financial-intelligence/`, `operational-intelligence/`, `correlation/`, `brain/`, `knowledge/`, `shared/`) exposes exactly one public entry point: its `index.ts`. Modules communicate only through their public `index.ts` entry point. Internal files are private implementation details and must never be imported directly, by another module or by cross-cutting test code outside that module's own test suite.

**Consequences.** Any module's internals can be refactored freely as long as its `index.ts` contract is preserved, with no risk of breaking a consumer that reached past the public surface. Enforcement is currently by convention and code review (no lint rule yet) — a future sprint may add automated enforcement (e.g. an ESLint boundary rule) without changing this decision.

---

## ADR-006 — Only the Diagnostic Brain may create Insight objects

**Status.** Accepted.

**Context.** [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 3 defines Insight (Finding, Root Cause, Recommendation, Opportunity, Risk, Benchmark Alert) as the platform's single conclusion abstraction, governed by the mandatory Evidence Chain (ADR-004).

**Decision.** `server/v2/brain/` is the only module in the V2 platform permitted to construct an Insight-shaped object. `document-parser/`, `financial-intelligence/`, `operational-intelligence/`, and `correlation/` may produce Evidence, Signals, and correlated candidates, but never a Finding, Root Cause, Recommendation, Opportunity, or Risk.

**Consequences.** The Evidence Chain's enforcement point is singular and auditable — there is exactly one place in the codebase where a conclusion is ever constructed, which makes "is this Insight properly evidenced" a question answerable by reviewing one module, not by auditing every module that happens to touch business data.

---

## ADR-007 — Financial Intelligence and Operational Intelligence remain independent until correlated

**Status.** Accepted.

**Context.** [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 9 (Operational Correlation) is described as the mechanism connecting financial symptoms to operational root causes — but the two domains' own reasoning must not be entangled before that point, or neither can be validated, extended, or reused independently.

**Decision.** `financial-intelligence/` and `operational-intelligence/` never import from each other, at any point in the V2 architecture. Both consume `document-parser/`'s `DocumentModel` independently. Where their findings need to be combined, that combination happens exclusively in `correlation/`, which is the one module permitted to depend on both.

**Consequences.** Either domain module can be built, tested, and even swapped out independently of the other. The correlation logic itself — the platform's highest-value reasoning, per [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 9 — is concentrated in one auditable place rather than scattered as ad hoc cross-references inside either domain module.

---

## ADR-008 — Adapters are the only permitted boundary between V1 and V2

**Status.** Accepted. **Amended** (direction corrected — see note below) during Sprint 1 close-out, after the adapter was actually built and its originally-assumed direction was found not to match what was implemented or needed.

**Context.** V2 modules (starting with `financial-intelligence/`, Sprint 2) need to be able to analyze documents V1 already parsed and stored (`client_documents.extracted_data`, shaped as V1's `ExtractedDocumentData`), without re-running extraction on the original file bytes — those bytes are frequently unavailable to a V2-only caller such as a backfill job operating purely against the database. This requires converting **V1's shape into V2's**, not the reverse. (An earlier draft of this ADR assumed the opposite direction — V2 output translated into V1's shape, for a future cutover where V1 routes call the new parser — before any adapter existed. That direction is not what was built and is not what current Sprint 2 needs; if a V2→V1 adapter is needed for an actual route cutover in a future sprint, it will be a separate, explicitly-scoped adapter file, documented on its own.)

**Decision.** `server/v2/adapters/`, namespaced per module (e.g. `adapters/document-parser/`), is the only location in the codebase permitted to reference both a V2 canonical shape and a V1 shape in the same file — and even there, only via `import type`, which TypeScript erases at compile time, so no V1 runtime code is ever pulled into `server/v2/`. The adapter built in Sprint 1, `adapters/document-parser/from-v1-extracted-document-data.ts`, is a pure, one-directional conversion function — **V1's `ExtractedDocumentData` in, V2's `StructuredDocument` + `EvidenceObject[]` out** — built and tested in isolation. It is not called by any V1 file, and it does not need to be: it is intended to be called by future V2 code (e.g. a `financial-intelligence/` backfill job) that has V1's stored data but not the original bytes.

**Consequences.** Every output of this adapter is explicitly self-marked as adapter-derived (a mandatory diagnostic, plus a distinct `pipelineVersion` string), so it is never mistaken for output that went through the real Document Parser pipeline — confidence and quality fields are documented fixed placeholders, not computed assessments. `adapters/` remains the single place V1 and V2 shapes are ever mentioned in the same file, satisfying the isolation rule (ADR-001) regardless of which direction a given adapter converts.

---

## ADR-009 — StructuredDocument is the public output of the Document Parser

**Status.** Accepted.

**Context.** `document-parser/` was originally designed with `DocumentModel` positioned as the universal, format-agnostic representation every downstream module would consume, per the stated purpose "Financial Intelligence must never care whether information originated from Excel, PDF, Word, CSV, OCR, API, SAP, Database." On review, exposing `DocumentModel` directly to consumers risks the opposite of its own intent: `DocumentModel` is document-parser's internal working representation, assembled mid-pipeline and reshaped freely as the pipeline's internal implementation evolves. If other modules imported it directly, it would become a de facto public contract without ever being versioned, tested, or governed as one — silently reintroducing the tight coupling this whole document series exists to prevent (per [TECH_DEBT.md](TECH_DEBT.md)).

**Decision.** **`StructuredDocument` is the public output of the Document Parser. `DocumentModel` remains an internal implementation detail.** `StructuredDocument` — versioned (`schemaVersion`), self-contained, and never referencing `DocumentModel`'s type — is the only shape `document-parser/index.ts` exposes as pipeline output. `DocumentModel` is defined and used exclusively inside `document-parser/` (never exported from its `index.ts`, never placed in `shared/contracts/`). Every future module (`financial-intelligence/`, `operational-intelligence/`, and beyond) consumes `StructuredDocument` only, and must never depend on `DocumentModel`, per the platform's Public Module API rule (ADR-005).

**Consequences.** `document-parser/`'s internal pipeline (how `DocumentModel` is built, what intermediate shape it takes) can be refactored freely without breaking any consumer, as long as `StructuredDocument`'s contract is preserved or deliberately versioned. This is the same guarantee ADR-005 already establishes at the module-boundary level, now stated explicitly for the one type that most tempted a shortcut.

---

## ADR-010 — Deterministic Document Processing

**Status.** Accepted.

**Context.** Determinism has been a stated design constraint since [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §4 and every content-hash-derived id, injectable clock, and first-registered-wins tie-break built during Sprint 1 exists in service of it. This ADR states the rule explicitly and makes it the platform's binding, testable definition of "deterministic," closing Sprint 1 on an unambiguous standard rather than an implied one.

**Decision.** Given (a) identical document bytes, (b) an identical parser version, and (c) an identical Ontology version, the Document Parser **MUST** always produce byte-for-byte identical `StructuredDocument` and `EvidenceObject` outputs. Random behaviour — random identifiers, wall-clock-derived values not routed through an injectable clock, non-deterministic iteration order, or any other source of run-to-run variation — is prohibited anywhere in the pipeline. This rule is verified directly by a repeatability regression test that runs the same input twice and asserts the two outputs are identical, not merely inferred from the absence of `Math.random()` in the source.

**Consequences.** Every future parser, service, or rule added to `document-parser/` inherits this obligation without exception — a contributor cannot introduce a timestamp, a random id, or an unordered iteration and remain compliant. Where a genuinely time-varying value is unavoidable (e.g. `ProcessingTrace.startedAt`), it must be derived from the pipeline's injectable clock, never read from the system clock directly, so that tests can hold it fixed and the rest of the output remains provably reproducible.
