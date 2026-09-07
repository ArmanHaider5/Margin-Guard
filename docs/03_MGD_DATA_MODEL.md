# MGD Version 2 — Canonical Data Model

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Canonical Data Model |
| Version | 2.0 (Draft) |
| Status | **Frozen for review — pending approval. No implementation, schema design, or API contract may be produced against this document until sign-off.** |
| Scope | Conceptual business data model only. This is **not** a database schema, an API contract, or an object-oriented type system. It defines the business objects, their meaning, their relationships, and the rules that govern them — independent of storage technology, engine implementation, or programming language. |
| Prepared by | Office of the Chief Data Architect, Scope Optix |
| Related documents | [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) (approved — defines *what* MGD does; this document defines the *business language* that specification is written in) · [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) (engine architecture) · [ARCHITECTURE.md](ARCHITECTURE.md), [MODULES.md](MODULES.md), [TECH_DEBT.md](TECH_DEBT.md) (V1 baseline) |

This document defines every business object used inside MGD, what it means, who owns it, how it relates to every other object, and what rules govern its lifecycle, validation, versioning, and audit trail. It is written to be the **canonical business vocabulary of MGD**, and is intended to remain valid for at least ten years — through multiple generations of engine implementation, storage technology, and even product surface — because it describes what the business objects *are*, not how they are currently built. Where the Functional Specification says an engine "produces a Finding," this document defines precisely what a Finding *is*.

---

## Chapter 1 — Design Principles

Seven principles govern every object defined in this document. They are data-modeling restatements of the product principles in [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) Chapter 9, and every object entry in Chapter 2 is a direct application of them — not a separate design exercise per object.

**Single Source of Truth.** Every fact MGD holds exists in exactly one canonical object. A financial figure, a root cause definition, a benchmark threshold — each has exactly one authoritative representation. Nothing in this model permits the same fact to be represented twice in two different objects that could drift apart. Where V1 held four independent definitions of the same root cause under the same identifier, this model makes that structurally impossible: a Root Cause *definition* exists once, in the Knowledge Library (Chapter 6), and every Diagnostic that surfaces it references that one definition rather than copying it.

**Every object has one owner.** Every object defined in this model has exactly one accountable owner — a module, a role, or the platform itself — responsible for its creation and mutation. No object is jointly owned by two modules, and no object's authoritative state can be written by more than one owner. This is what makes "who is responsible for this fact being correct" always answerable in one step, not a debugging exercise across modules.

**Objects are immutable once versioned.** Once an object has been generated and included in a Diagnostic's evidentiary or conclusory chain, its content does not change in place. Correction, refinement, or re-analysis produces a new version; the prior version is retained, not overwritten. This is not a storage implementation detail — it is a business rule: a report a client received last year must remain exactly reproducible and explainable against the facts and knowledge state that produced it, permanently.

**Evidence before conclusions.** No object representing a conclusion — a Finding, a Root Cause, a Recommendation, an Opportunity — may exist without first being derivable from Evidence. This principle is not enforced by convention; it is enforced by the relationship rules in Chapter 4 and the mandatory chain in Chapter 5, which make an evidence-less conclusion an invalid object, not merely a discouraged one.

**Explainability by design.** Every object carries enough relationship data to answer, without exception, "what is this based on and who/what produced it." Explainability is not a report-formatting feature bolted on at the end — it is a property of the data model itself: if an object's relationships don't trace back to source evidence, the object is malformed under this model, regardless of what the presentation layer does with it.

**AI never owns business facts.** No object representing a business fact — a Finding, a Root Cause, a Recommendation, an Opportunity, a Metric, a Confidence score — may be owned by the AI Consultant. The only object the AI Consultant owns is the Narrative (Chapter 2.12), and even that object's content is constrained to reference, not originate, the facts held in every other object (Chapter 9 defines this boundary precisely).

**Knowledge is data, not code.** Every object in the Knowledge Library (Chapter 6) — a Root Cause definition, a Benchmark, an Industry Pack, a Rule of any kind — is a data record, versioned and administrable, never a hardcoded structure in engine logic. This model draws a hard line, carried through every chapter below, between **definition objects** (Knowledge Library content: reusable, platform-owned, industry-scoped) and **instance objects** (the occurrences of those definitions produced within one specific Diagnostic: Company-owned, evidence-linked, immutable once versioned). This distinction is introduced formally in Chapter 2.6 and used consistently for the rest of the document.

---

## Chapter 2 — Core Business Objects

### 2.0 A note on Definition Objects vs. Instance Objects

Before defining individual objects, this distinction must be established, because it disambiguates several object names that would otherwise be read two different ways (most importantly "Finding," "Root Cause," "Recommendation," "Opportunity," and "Benchmark," each of which names both a reusable library entry and a diagnostic-specific occurrence):

- A **Definition Object** is platform-owned, reusable knowledge — it does not belong to any Company, is not produced by running a Diagnostic, and exists independent of any specific client's data. Definition Objects live in the Knowledge Library (Chapter 6): a Root Cause *definition*, a Recommendation *definition*, a Benchmark *definition*, an Industry Pack, a Knowledge Rule.
- An **Instance Object** is Company-owned (via a Diagnostic), produced by running MGD's engines against a specific client's evidence, and immutable once versioned. An instance Finding, Root Cause, Recommendation, Opportunity, or Benchmark Alert is the *occurrence* of a Definition Object, populated with this specific client's evidence, confidence, and severity.

Every object entry below states explicitly whether it is a Definition Object, an Instance Object, or (for objects like Company and Diagnostic that are neither knowledge nor conclusion) a **Context Object** — the objects that establish who and what a Diagnostic is about.

---

### 2.1 Company

**Purpose.** Represents the business entity being diagnosed — the root of ownership for every other Instance Object in the model.

**Description.** A Company is the client organization (or, in future multi-product use per Chapter 10, any business entity) that MGD diagnoses. It is deliberately named "Company" rather than "Client" so the same object can be referenced by any Scope Optix product without implying a specific commercial relationship to MGD. A Company carries identity, industry classification (one or more, per [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §6.3's support for multi-industry clients), and organizational metadata, but no diagnostic content itself.

**Owner.** Administration (creation, industry classification, lifecycle) and Consultant (day-to-day association with engagements). Context Object.

**Relationships.** One Company has many Diagnostics (Chapter 4). One Company has many Documents. One Company has many Business Concerns and Consultant Observations. A Company references, but does not own, one or more Industry Packs via its industry classification.

**Lifecycle.** Onboarded → Active → Inactive/Archived. A Company is never hard-deleted while it owns any Diagnostic, Document, or Report — deletion requires those owned objects to be explicitly handled first (retained, transferred, or deleted under a documented data-retention decision), never an implicit cascade.

**Validation Rules.** A Company must have at least one industry classification before a Diagnostic can be initiated against it (required for Industry Intelligence to resolve applicable knowledge, per Functional Specification §3.12). A Company's identity is unique within the platform.

**Versioning Rules.** Profile-level changes (name, industry reclassification, organizational metadata) are versioned with an effective date; a Company's identity itself never changes across versions.

**Audit Requirements.** Every creation and profile change is logged with actor, timestamp, and prior value. Industry reclassification is audited with particular care, since it changes which knowledge applies to future Diagnostics without altering the explainability of past ones (past Diagnostics remain bound to the industry classification in effect when they ran).

---

### 2.2 Diagnostic

**Purpose.** Represents one complete, bounded execution of MGD's diagnostic process for a Company — the unit of work that produces a Report.

**Description.** A Diagnostic is the container for everything produced in service of answering "what is wrong, why, and what should be done" at one point in time for one Company. It is not the analysis logic itself (that is engine behavior, defined in the Functional Specification) — it is the record that scopes and owns every Evidence, Signal, Insight, Narrative, and Report produced during that execution.

**Owner.** Consultant (initiates and finalizes); the diagnostic engines (populate its contents during processing). Context Object.

**Relationships.** Belongs to exactly one Company. References the Document(s) selected for this run (many-to-many with Document, see Chapter 4). Owns all Evidence, Signal, and Insight instances produced during its execution. Owns exactly one lineage of Narrative and Report versions. May reference zero or more prior Diagnostics for the same Company (historical comparison, Chapter 8).

**Lifecycle.** Initiated → Processing → Draft (composed, editable, re-runnable) → Finalized (locked). A Finalized Diagnostic is a permanent historical record — MGD does not "supersede" a finalized Diagnostic in place; a later Diagnostic is always a new, additive record, per the Consultant Memory model (Chapter 8).

**Validation Rules.** A Diagnostic must be bound to exactly one Company before any processing may begin (Functional Specification §4, Step 1). A Diagnostic shall not be marked Finalized while it holds any Insight without a valid Evidence chain (Chapter 5).

**Versioning Rules.** A Diagnostic's Draft state may be re-run, producing new versions of its Evidence/Signal/Insight/Narrative/Report content; prior Draft versions are retained, not discarded, for audit purposes even though only the latest Draft is presented as "current." Once Finalized, no further versions are produced under the same Diagnostic — a correction is a new Diagnostic.

**Audit Requirements.** Initiation, every re-run, and finalization are logged with actor and timestamp. The set of Documents selected for the run is recorded as part of the audit trail, since it determines what evidence was and was not available to the analysis.

---

### 2.3 Document

**Purpose.** Represents one source file provided by or about a Company — the raw material every downstream fact ultimately traces back to.

**Description.** A Document is the structured record of an uploaded file: its classification (per Functional Specification Chapter 5), its extracted content, and its provenance. A Document is not itself evidence of anything — it is the substrate Evidence (2.4) is drawn from.

**Owner.** Consultant (uploads); Document Intelligence (classifies and extracts). Context Object.

**Relationships.** Belongs to exactly one Company (not to a single Diagnostic — see Chapter 4's explicit design decision on document reuse across Diagnostics). May be selected by many Diagnostics over time. Is the source of one or more Evidence records.

**Lifecycle.** Uploaded → Processing → Processed → (optionally) Reprocessed → Archived. Reprocessing (e.g. after an extraction-logic improvement) produces a new processed version; the original upload and its original extraction are retained.

**Validation Rules.** Must belong to exactly one Company. Must be one of the file types defined in Functional Specification Chapter 5. A Document that fails classification is still retained and flagged, never silently discarded (Functional Specification §5.3).

**Versioning Rules.** The uploaded file itself is immutable. Extraction/classification results are versioned per reprocessing event; the currently-referenced version is the one new Evidence is drawn from, but historical Evidence retains its link to the extraction version that was current when it was generated.

**Audit Requirements.** Upload (actor, timestamp, uploading Company/Diagnostic context), every reprocessing event, and every access by a role outside the owning Consultant/Company relationship (e.g. an Administrator viewing a client document for support purposes) are logged.

---

### 2.4 Evidence

**Purpose.** Represents a single, source-traceable fact drawn directly from a Document — the most primitive, concrete unit of proof in the entire model.

**Description.** Evidence is deliberately defined as the *most concrete* object in the chain: one Evidence record corresponds to one identifiable fact at one identifiable location in one Document (a specific figure on a specific statement line, a specific phrase in a specific report row). Evidence does not classify or interpret — that is Signal's role (2.5). Evidence simply asserts, with full provenance, "this is what the source document says."

**Owner.** Evidence Engine. Instance Object.

**Relationships.** Belongs to exactly one Diagnostic and traces to exactly one Document (and a specific location within it). Is referenced by one or more Signal records. May be referenced directly by an Insight in addition to via Signal, when a conclusion is drawn from a single, unambiguous fact without requiring signal-level classification.

**Lifecycle.** Generated during Diagnostic processing → Retained permanently as part of the Diagnostic's evidentiary record. Evidence is never edited after generation.

**Validation Rules.** Every Evidence record must resolve to a specific Document and a specific, retrievable location within it — an Evidence record with no source location is invalid under this model (this is the mechanical enforcement point for the Evidence Before Conclusions principle, Chapter 1).

**Versioning Rules.** Immutable once generated. If the same underlying Document fact is re-extracted in a later Diagnostic (e.g. because the client resubmitted an updated statement), a new Evidence record is created — the original is retained, tied to its original Diagnostic.

**Audit Requirements.** Generation timestamp, source Document and Diagnostic, and the extraction method/confidence that produced it are recorded for every Evidence record, since Evidence is the terminus every explainability query ultimately resolves to.

---

### 2.5 Signal

**Purpose.** Represents a normalized, categorized abstraction built from one or more Evidence records — the first point at which raw fact becomes a typed, business-meaningful observation.

**Description.** Where Evidence says "this document says X," a Signal says "this business dimension shows pattern Y" — classified against the platform's standard vocabulary (the 4M framework plus financial dimensions, per [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §5.2) and scoped by the active Industry Pack. A Signal may be built from a single Evidence record or may corroborate several.

**Owner.** Signal Engine. Instance Object.

**Relationships.** Belongs to exactly one Diagnostic. References one or more Evidence records (never zero — see Chapter 5). May contribute to one or more Insight instances.

**Lifecycle.** Generated during Diagnostic processing → Retained permanently.

**Validation Rules.** A Signal must reference at least one Evidence record. A Signal's category must be one recognized by the active Industry Pack's vocabulary (Chapter 6).

**Versioning Rules.** Immutable once generated, consistent with Evidence.

**Audit Requirements.** Generation timestamp, constituent Evidence references, and classification basis (which vocabulary/rule matched) are recorded.

> **Reconciliation note.** This chapter defines Evidence as conceptually prior to Signal — a Signal is derived *from* Evidence, never the reverse. This is a data-lineage/dependency statement, not a processing-order statement. The Functional Specification's engine workflow (§4, Steps 6–7) may compute Signals and validate Evidence in whatever technical sequence is most efficient for a given implementation, including producing candidate Signals before fully validating their supporting Evidence, as an engineering optimization. The data model's requirement is only that, in the final, persisted record, every Signal traceably references the Evidence that substantiates it — not that Evidence be computed first in wall-clock time. This decoupling of conceptual lineage from execution order is deliberate: it allows engine implementation to evolve over the next ten years without invalidating this document.

---

### 2.6 Insight (parent object)

**Purpose.** The common abstraction underlying every conclusion MGD draws — Finding, Root Cause, Recommendation, Opportunity, and Benchmark Alert. Defined in full in Chapter 3; introduced here as the sixth core object per the requested structure.

**Description.** Insight is not itself an object any Diagnostic produces directly — no Diagnostic ever holds a bare "Insight" with no more specific type. It is the shared shape and shared rule set that every conclusion-type object inherits, so that evidence-linkage, confidence, versioning, and audit behavior are defined once and applied uniformly across all five conclusion types, rather than five times with the risk of five different definitions drifting apart (precisely the failure mode documented for MGD V1 in [TECH_DEBT.md](TECH_DEBT.md) §1).

**Owner.** Abstract — ownership is defined per subtype (Finding Engine, Root Cause Engine, Recommendation Engine, Opportunity Engine, and the Benchmark/Confidence comparison logic that raises Benchmark Alerts). Instance Object (abstract).

**Relationships.** See Chapter 3 for the full common relationship set shared by all subtypes.

**Lifecycle, Validation, Versioning, Audit.** Defined once, in Chapter 3, and inherited without exception by all five subtypes — no subtype may define a looser rule than the parent Insight establishes.

---

### 2.7 Finding

**Purpose.** States what is observably happening in the business — the "what," prior to causal interpretation.

**Description.** A Finding is a discrete, human-readable statement of an observed condition (e.g. "collections cycle has lengthened over the past two quarters"), classified by category and severity. Findings are the first Insight subtype in the evidence chain (Chapter 5) and the input every Root Cause is derived from.

**Owner.** Finding Engine. Instance Object; Insight subtype.

**Relationships.** References one or more Signal and/or Evidence records (never zero). Is referenced by one or more Root Cause records. May be directly referenced by the Narrative.

**Lifecycle, Validation, Versioning, Audit.** Inherits the Insight parent's rules (Chapter 3) in full. No Finding-specific exceptions.

---

### 2.8 Root Cause

**Purpose.** States why the Findings are occurring — the causal layer that is MGD's principal analytical contribution.

**Description.** A Root Cause is a diagnosed causal explanation, classified as Primary, Secondary, or Contributing, matched against the Root Cause Library (Chapter 6) using the Company's Findings and evidence as input. Root Causes may hold causal relationships to other Root Causes (one driving another) where the Knowledge Library defines that relationship.

**Owner.** Root Cause Engine. Instance Object; Insight subtype.

**Relationships.** References one or more Finding records (never zero). References the Root Cause *definition* (Knowledge Library, Chapter 6) it instantiates. Is referenced by one or more Recommendation and Opportunity records. May reference other Root Cause instances via a causal relationship.

**Lifecycle, Validation, Versioning, Audit.** Inherits the Insight parent's rules. Additional validation: a Root Cause's classification (Primary/Secondary/Contributing) must be derived using the scoring rule defined in its Knowledge Library definition, applied consistently — the classification itself is not a free-text or ad hoc judgment.

---

### 2.9 Recommendation

**Purpose.** States what the business should do in response to a diagnosed Root Cause.

**Description.** A Recommendation is a prioritized, actionable guidance item, sequenced relative to other Recommendations where dependency exists (a roadmap relationship), and always traceable to the Root Cause(s) that justify it.

**Owner.** Recommendation Engine. Instance Object; Insight subtype.

**Relationships.** References one or more Root Cause records (never zero). References the Recommendation *definition* (Knowledge Library) it instantiates. Is referenced by one or more Opportunity records. May reference other Recommendation instances via a sequencing/dependency relationship.

**Lifecycle, Validation, Versioning, Audit.** Inherits the Insight parent's rules. A Recommendation with no Root Cause reference is an invalid object under this model — not merely undesirable, structurally disallowed.

---

### 2.10 Opportunity

**Purpose.** Quantifies the financial and/or operational value of acting on a Recommendation.

**Description.** An Opportunity states an estimated value range and the basis for that estimate — statement-derived (from canonical Financial Ratio data) or benchmark-derived (from industry Benchmark comparison) — with statement-derived estimates preferred wherever available, per Functional Specification §3.11.

**Owner.** Opportunity Engine. Instance Object; Insight subtype.

**Relationships.** References one or more Root Cause and/or Recommendation records (never zero). References the Metric, Financial Ratio, or Operational Ratio instances (2.18–2.21) that ground its estimate, and the Opportunity *definition* (Knowledge Library) it instantiates.

**Lifecycle, Validation, Versioning, Audit.** Inherits the Insight parent's rules. Additional validation: an Opportunity must declare its basis (statement-derived or benchmark-derived) as a first-class, always-visible property — this is not optional metadata.

---

### 2.11 Benchmark

**Purpose.** Defines the expected/target value for a Metric, KPI, or Ratio, scoped by industry — the reference point severity and Benchmark Alerts (Chapter 3) are computed against.

**Description.** A Benchmark, as a Core Business Object, is a **Definition Object** — the reusable, platform-owned target definition (e.g. "on-time delivery target: 95%, manufacturing"). It is distinct from a Benchmark Alert (Chapter 3), which is the Instance Object raised for a specific Diagnostic when an actual Metric breaches this definition. This distinction is critical and is restated wherever confusion is likely (Chapters 3 and 6).

**Owner.** Administration (Knowledge Library curation). Definition Object.

**Relationships.** Belongs to the Knowledge Library (Chapter 6). Is associated with one or more Industry Packs, with industry-specific target values. Is referenced by Metric, KPI, Financial Ratio, and Operational Ratio instances during severity evaluation, and by Benchmark Alert instances when breached.

**Lifecycle.** Draft → Published → Deprecated (superseded by a new version, old version retained for historical explainability) → Archived.

**Validation Rules.** A Benchmark must specify the Metric/KPI/Ratio type it applies to and at least one industry scope with a defined target value.

**Versioning Rules.** Explicitly versioned with an effective date. A Diagnostic's Benchmark Alert always records which Benchmark *version* was in effect when it was raised, so a historical report remains explainable even after the Benchmark target is later revised.

**Audit Requirements.** Every creation, target-value change, and deprecation is logged with the curating Administrator, timestamp, and rationale.

---

### 2.12 Narrative

**Purpose.** The composed, consulting-grade prose explanation of a Diagnostic's Insights — the sole object the AI Consultant owns.

**Description.** A Narrative is generated strictly from a Diagnostic's already-computed Insights, Confidence scores, and (per Chapter 9) a bounded set of additional context. It contains no fact that is not already present in another object — every substantive claim within it is required to cite the Insight or Evidence it is drawn from (Functional Specification §3.13).

**Owner.** AI Consultant. Instance Object.

**Relationships.** Belongs to exactly one Diagnostic. References every Insight it summarizes. Is included in exactly one Report (though a Diagnostic may regenerate its Narrative prior to finalization, producing a new version).

**Lifecycle.** Generated → (optionally) Regenerated during Draft state → Locked at Finalization.

**Validation Rules.** A Narrative shall not contain a claim that does not cite a specific Insight, Evidence, or Confidence reference it was generated from (the mechanical enforcement point for "AI never owns business facts," Chapter 1). If the AI Consultant is unavailable, the Narrative is instead produced by deterministic template composition (Functional Specification §3.13) — the object type and its validation rules are identical regardless of which mechanism produced it.

**Versioning Rules.** Every regeneration during Draft state produces a new version; prior versions are retained. Once the owning Diagnostic is Finalized, the Narrative is locked.

**Audit Requirements.** Generation mechanism (AI-generated vs. template-fallback), generation timestamp, and the exact set of Insight/Evidence references supplied as context (Chapter 9) are recorded for every version.

---

### 2.13 Report

**Purpose.** The single canonical, versioned deliverable object every output format (Executive Report, Presentation, Dashboard view, etc., per Functional Specification Chapter 6) is rendered from.

**Description.** A Report performs no computation or interpretation of its own — it is pure assembly of a Diagnostic's Insights, Confidence, and Narrative into one coherent, deliverable object. Every rendering (PDF, on-screen viewer, presentation slide, API response) derives from this one object, guaranteeing that no two delivered formats can ever disagree with each other.

**Owner.** Executive Report Composer (assembly); Consultant (review and finalization). Instance Object.

**Relationships.** Belongs to exactly one Diagnostic. References the Diagnostic's full Insight set, Confidence scores, and current Narrative version.

**Lifecycle.** Draft (editable, re-composable as the Diagnostic is re-run) → Finalized (locked). A correction to a Finalized Report produces a new Report version under the same or a new Diagnostic (per Functional Specification §4, Step 15) — never an in-place edit.

**Validation Rules.** A Report shall not be marked Finalized while it references any Insight lacking a valid Evidence chain, or any Narrative claim lacking citation.

**Versioning Rules.** Explicitly versioned; Finalized versions are immutable and permanently retained, satisfying the Auditability requirement in Functional Specification §8.6.

**Audit Requirements.** Composition, every Draft regeneration, and Finalization are logged with actor and timestamp. Access to a Finalized Report by any role is logged (Functional Specification Chapter 7's role model governs who may access which Report).

---

### 2.14 Industry Pack

**Purpose.** Scopes the Knowledge Library's definitions to a specific industry, without duplicating any definition.

**Description.** An Industry Pack is a set of applicability associations and parameter overrides against the shared Definition Objects in the Knowledge Library (Root Causes, Recommendations, Benchmarks, Ratios, vocabulary) — never a copy of them. Defined fully in Chapter 6.3.

**Owner.** Administration. Definition Object.

**Relationships.** Associates to Root Cause, Recommendation, Opportunity, Benchmark, KPI, Financial Ratio, and Operational Ratio definitions, and to Evidence Rules. Is referenced by a Company's industry classification and, transitively, by every Diagnostic run for that Company.

**Lifecycle.** Draft → Published → Deprecated → Archived, matching Benchmark's lifecycle model.

**Validation Rules.** An Industry Pack must associate to at least one Root Cause and at least one Symptom definition before it can be Published — an empty pack is not a valid, selectable industry scope.

**Versioning Rules.** Versioned with an effective date; a Diagnostic records which Industry Pack version was active when it ran.

**Audit Requirements.** Creation, every association change, and publication/deprecation are logged.

---

### 2.15 Knowledge Rule

**Purpose.** The general category of platform-authored logic-as-data used to compute or trigger Evidence, Signals, Metrics, and Insights — the parent concept behind Evidence Rules, Financial Rules, Operational Rules, and Risk Rules (Chapter 6).

**Description.** A Knowledge Rule is never expressed as engine source code. It is a data record describing a detection, computation, or triggering condition (e.g. "three or more overtime mentions in a 90-day window constitutes a Manpower signal of medium strength"), authored and versioned like any other Knowledge Library content.

**Owner.** Administration. Definition Object (abstract parent; see Chapter 6 for its specializations).

**Relationships.** Referenced by the Evidence Engine, Signal Engine, Financial Intelligence, Operational Intelligence, and Confidence Engine at run time. Associated with one or more Industry Packs where a rule is industry-specific rather than universal.

**Lifecycle, Validation, Versioning, Audit.** As defined per specialization in Chapter 6; the parent object establishes only that every specialization must be data, versioned, and administrable without a code change — no specialization may violate this.

---

### 2.16 Consultant Observation

**Purpose.** Captures human judgment, annotation, or override applied by a Consultant to a Diagnostic or a specific Insight — the explicit human-in-the-loop record.

**Description.** A Consultant Observation is always visibly distinct from system-generated content. It is never merged into or blended with a Finding, Root Cause, Recommendation, or Opportunity's system-computed content — it sits alongside it, clearly attributed, so a reader can always distinguish "what MGD concluded" from "what the consultant added or overrode."

**Owner.** Consultant. Instance Object (human-authored).

**Relationships.** Belongs to exactly one Diagnostic. May reference zero or more specific Insight instances it annotates or overrides, or may apply at the Diagnostic level generally.

**Lifecycle.** Authored → (optionally) Edited (each edit versioned, prior text retained) → Retained permanently, even if later superseded by a subsequent Observation.

**Validation Rules.** A Consultant Observation must be attributed to a specific Consultant identity and shall never be presented as system-generated content in any output.

**Versioning Rules.** Every edit produces a new version; prior versions retained for audit.

**Audit Requirements.** Authoring and every edit are logged with actor and timestamp.

---

### 2.17 Business Concern

**Purpose.** Captures the client's self-reported problem statement at diagnostic intake — the starting question a Diagnostic is run to answer.

**Description.** A Business Concern is client- or consultant-authored free text or structured intake data (e.g. "margins have been shrinking for two quarters") captured before or at the start of a Diagnostic. It is not evidence and never treated as one — per [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md)'s carried-forward V1 principle, stated concerns are priority signals for what a Diagnostic should focus on, not filters on what conclusions are permitted, and never substitute for Evidence in the chain defined in Chapter 5.

**Owner.** Client or Consultant (intake). Instance Object.

**Relationships.** Belongs to exactly one Company, and typically to the Diagnostic it seeded. May be referenced by the Narrative as context (subject to the AI Context Model's constraints, Chapter 9) but never by a Finding, Root Cause, Recommendation, or Opportunity as a substitute for Evidence.

**Lifecycle.** Captured at intake → Retained, immutable once the Diagnostic it seeded begins processing.

**Validation Rules.** A Business Concern shall never be used as the evidentiary basis for a Finding or Root Cause — only genuine Evidence (2.4) may serve that role.

**Versioning Rules.** Immutable once the associated Diagnostic begins processing; a later, revised concern is a new Business Concern record, not an edit.

**Audit Requirements.** Capture is logged with actor, timestamp, and source (client self-report vs. consultant-recorded).

---

### 2.18 Metric

**Purpose.** The general category of any single measured or computed value derived from a Company's data within a Diagnostic — the umbrella object that KPI, Financial Ratio, and Operational Ratio (2.19–2.21) specialize.

**Description.** A Metric is a computed numeric (or, where defined, qualitative) value with a defined computation method, a source (which Evidence/Document/statement it was computed from), and — where applicable — a Benchmark comparison result.

**Owner.** Financial Intelligence or Operational Intelligence, depending on source data. Instance Object.

**Relationships.** Belongs to exactly one Diagnostic. Traces to the Evidence/Document(s) it was computed from. May be compared against a Benchmark definition, producing a Benchmark Alert (Chapter 3) if breached. Is generalized by KPI, Financial Ratio, and Operational Ratio, each of which is a Metric carrying additional Knowledge Library linkage.

**Lifecycle.** Computed during Diagnostic processing → Retained permanently.

**Validation Rules.** A Metric must state its computation method and source data; a Metric with no traceable source is invalid under the explainability principle (Chapter 1).

**Versioning Rules.** Immutable once computed; a re-run Diagnostic computing an updated value produces a new Metric instance.

**Audit Requirements.** Computation timestamp, method, and source references are recorded.

---

### 2.19 KPI

**Purpose.** A Metric elevated to tracked, benchmarked significance because the Knowledge Library defines it as a Key Performance Indicator for the relevant Industry Pack.

**Description.** A KPI is a Metric (2.18) plus a reference to its KPI definition in the Knowledge Library and, typically, an associated Benchmark. Not every Metric is a KPI — a KPI is specifically one the Knowledge Library has designated as significant enough to track and compare against a target.

**Owner.** Operational Intelligence (most commonly) or Financial Intelligence. Instance Object; specializes Metric.

**Relationships.** Inherits all of Metric's relationships. Additionally references its KPI definition (Knowledge Library) and, where defined, a Benchmark.

**Lifecycle, Validation, Versioning, Audit.** As Metric (2.18), plus: a KPI must reference a valid, currently-Published KPI definition.

---

### 2.20 Financial Ratio

**Purpose.** A specialized Metric computed strictly from canonical Financial Statement data via a Financial Rule (Chapter 6).

**Description.** A Financial Ratio (e.g. current ratio, gross margin, days sales outstanding) is computed only from the canonical statement objects produced by Financial Intelligence (§3.2 of the Functional Specification), never from operational data directly.

**Owner.** Financial Intelligence. Instance Object; specializes Metric.

**Relationships.** Inherits Metric's relationships. Additionally traces to the specific canonical Financial Statement instance(s) it was computed from and to the Financial Rule (Knowledge Library) that defines its computation.

**Lifecycle, Validation, Versioning, Audit.** As Metric, plus: a Financial Ratio must reference at least one canonical Financial Statement object as its source — it may never be estimated from operational data alone (that would make it a benchmark-derived Opportunity estimate, not a Financial Ratio).

---

### 2.21 Operational Ratio

**Purpose.** A specialized Metric computed from operational (non-financial) signal data via an Operational Rule (Chapter 6).

**Description.** An Operational Ratio (e.g. scrap rate, staff turnover rate, maintenance backlog ratio) is the operational-data analog of a Financial Ratio, computed from Operational Intelligence's extracted data rather than financial statements.

**Owner.** Operational Intelligence. Instance Object; specializes Metric.

**Relationships.** Inherits Metric's relationships. Additionally traces to the operational Evidence/Signal data it was computed from and to the Operational Rule (Knowledge Library) that defines its computation.

**Lifecycle, Validation, Versioning, Audit.** As Metric.

---

### 2.22 Confidence

**Purpose.** Quantifies MGD's certainty in a specific object or in a Diagnostic as a whole — a first-class business object, not an incidental numeric field.

**Description.** Confidence is deliberately modeled as its own object, not a bare percentage attached to another record, because it has its own inputs, its own propagation logic, and its own explainability requirement — a reader must be able to ask "why is confidence at this level" and receive a specific answer, exactly as they can for a Finding or Root Cause. Defined fully in Chapter 7.

**Owner.** Confidence Engine. Instance Object.

**Relationships.** Attached to Signal, Finding, Root Cause, Recommendation, and Opportunity instances individually, and to the Diagnostic as a top-line classification. References the specific inputs (Chapter 7) that produced its score.

**Lifecycle.** Computed alongside the object it scores → Recomputed if the owning object is regenerated during a Draft re-run → Locked at Finalization.

**Validation Rules.** Every scored object must carry an associated Confidence record; an Insight with no Confidence is invalid under this model.

**Versioning Rules.** Recomputed and re-versioned whenever its owning object or any of its constituent inputs changes; historical Confidence values are retained alongside historical object versions.

**Audit Requirements.** The specific input values (Chapter 7) that produced a given Confidence score are retained, not just the final score — this is required for the score itself to be explainable, not only the conclusion it's attached to.

---

## Chapter 3 — Insight Model

### 3.1 Why this abstraction exists

MGD V1 implemented Finding, Root Cause, Recommendation, and Opportunity-equivalent concepts independently, up to three times each, across three engine generations — each with its own idea of what confidence, evidence-linkage, and versioning meant for that object type ([TECH_DEBT.md](TECH_DEBT.md) §1). The Insight abstraction exists to make that failure mode structurally impossible in V2: **evidence-linkage, confidence, industry scoping, lifecycle, versioning, and audit behavior are defined exactly once, at the Insight level, and every conclusion type inherits them without exception.** A future engineer adding a sixth conclusion type does not get to decide independently whether it needs evidence-linkage — Insight has already decided that for them.

A second reason: uniform querying. Consultant Memory (Chapter 8) and the AI Context Model (Chapter 9) both need to reason across "everything MGD concluded about this Company over time," regardless of conclusion type. A single Insight abstraction makes that a query over one shape, not five.

### 3.2 The inheritance structure

```
Insight (abstract — Chapter 2.6)
├── Finding                (Chapter 2.7)
├── Root Cause             (Chapter 2.8)
├── Recommendation         (Chapter 2.9)
├── Opportunity            (Chapter 2.10)
└── Benchmark Alert        (defined below — new in this chapter)
```

### 3.3 Benchmark Alert

Benchmark Alert is the fifth Insight subtype and is introduced formally here rather than in Chapter 2 because it cannot be defined without first distinguishing it from Benchmark (2.11) — a distinction important enough to warrant its own explanation.

**Purpose.** Represents the Insight raised when a specific Diagnostic's Metric, KPI, or Ratio breaches a Benchmark's target/threshold — the instance-level occurrence, as opposed to Benchmark's definition-level target itself.

**Description.** Where a Benchmark says "on-time delivery target is 95% for manufacturing" (a Definition Object, reusable across every manufacturing Diagnostic), a Benchmark Alert says "*this* Company's Diagnostic computed 71%, breaching the Benchmark, with this severity" — an Instance Object, scoped to one Diagnostic, evidence-linked back through the Metric that triggered it.

**Owner.** The comparison logic within Financial Intelligence, Operational Intelligence, or the Confidence Engine, depending on the Metric type involved.

**Relationships.** References the Metric/KPI/Ratio instance that breached the threshold (never zero — a Benchmark Alert with no triggering Metric is invalid) and the Benchmark definition (with its specific version) that was breached.

All other properties (Lifecycle, Validation, Versioning, Audit) are inherited from the Insight parent per §3.4 below, with no exceptions.

### 3.4 Common properties inherited by every subtype

Every Insight subtype — Finding, Root Cause, Recommendation, Opportunity, Benchmark Alert — carries the following properties and rules, without exception:

- **Identity** — a unique, stable identifier within its owning Diagnostic.
- **Category/type discriminator** — which subtype it is, and where applicable, which Definition Object (Knowledge Library entry) it instantiates.
- **Severity/priority** — a classification drawn from the rules its Definition Object specifies, never freely assigned.
- **Confidence** — a mandatory reference to a Confidence object (2.22); an Insight with no Confidence is invalid.
- **Evidence linkage** — a mandatory, non-empty reference chain back to Signal and/or Evidence (Chapter 5); an Insight that cannot trace to Evidence is invalid, with no exception for any subtype.
- **Industry applicability** — inherited from the Diagnostic's active Industry Pack(s), not independently assigned per Insight.
- **Lifecycle state** — Generated → (optionally) Annotated by a Consultant Observation → Included in Report → (on re-run) Superseded by a new version. Never silently deleted.
- **Version** — every regeneration produces a new version; prior versions retained.
- **Originating Diagnostic reference** — every Insight belongs to exactly one Diagnostic.
- **Narrative inclusion reference** — whether and how the Insight was referenced by the Diagnostic's Narrative, satisfying the citation requirement in 2.12.

No subtype may relax any of these — a Finding cannot opt out of evidence-linkage, and a Benchmark Alert cannot opt out of Confidence, even though the two subtypes have different domain content otherwise.

---

## Chapter 4 — Relationships

### 4.1 The primary relationship chain

```
Company
  │  1 : many
  ▼
Diagnostic
  │  many : many (selection, not ownership — see §4.2)
  ▼
Document
  │  1 : many
  ▼
Evidence
  │  many : many
  ▼
Signal
  │  many : many
  ▼
Insight  (Finding · Root Cause · Recommendation · Opportunity · Benchmark Alert)
  │  many : 1
  ▼
Narrative
  │  1 : 1 (per Diagnostic)
  ▼
Report
```

### 4.2 Cardinality and ownership, chain by chain

- **Company → Diagnostic (1 : many).** A Company accumulates Diagnostics over its lifetime; every Diagnostic belongs to exactly one Company. Ownership is direct: the Company is the accountable root for every Diagnostic run against it.

- **Company → Document (1 : many), Diagnostic ↔ Document (many : many).** This is a deliberate design decision, not an oversight: **a Document belongs to the Company, not to a single Diagnostic.** A Company's documents accumulate over time and are *selected into* one or more Diagnostics — the same P&L a consultant uploaded for Q1's Diagnostic may be reused, alongside newly uploaded documents, in Q2's Diagnostic for trend comparison (Chapter 8). Modeling Document as Diagnostic-owned would force needless re-upload and duplication every time a historical comparison is wanted, directly violating the Single Source of Truth principle. The association between a specific Diagnostic and the Documents it drew from is retained explicitly, so a historical Diagnostic remains explainable even as the Company's document set grows.

- **Document → Evidence (1 : many).** Every Evidence record traces to exactly one Document. A Document may yield many Evidence records across its lifetime (and across multiple Diagnostics that select it), but each Evidence record belongs to exactly one Diagnostic (Evidence is generated fresh per Diagnostic run against a Document's current processed state, per 2.4's Lifecycle).

- **Evidence ↔ Signal (many : many).** A Signal must reference at least one Evidence record, and may corroborate several. A single Evidence record may also contribute to more than one Signal (e.g. one financial fact substantiating both a margin signal and a liquidity signal).

- **Signal ↔ Insight (many : many).** An Insight (any subtype) must reference at least one Signal and/or Evidence record. A Signal may contribute to more than one Insight.

- **Insight → Narrative (many : 1).** A Diagnostic's full Insight set feeds exactly one current Narrative version. The Narrative references, but does not own, the Insights it summarizes — deleting or regenerating the Narrative never affects the underlying Insight records.

- **Narrative + Insight set → Report (1 : 1 per Diagnostic version).** A Report is the composed union of a Diagnostic's Insight set, Confidence scores, and current Narrative. A Diagnostic has exactly one *current* Report at any time, but (per 2.13's versioning rule) may accumulate multiple historical Report versions if re-composed prior to Finalization, and Finalization always produces a permanent, immutable Report version.

### 4.3 Ownership summary

Ownership is transitive down the chain but never sideways: a Company owns its Diagnostics, which own their Evidence/Signal/Insight/Narrative/Report content, which trace back to (but do not own) the Company's Documents. Definition Objects (Chapter 6) are never owned by a Company at any point in this chain — they are referenced, universally, by every Company's Diagnostics, which is precisely what makes the Knowledge Library a shared, non-duplicated resource rather than per-client copies of the same knowledge.

### 4.4 Dependencies vs. references

Two relationship types recur throughout this chapter and are worth distinguishing explicitly: an **ownership dependency** (the referenced object cannot outlive its owner — e.g. Evidence cannot exist without its owning Diagnostic) and a **reference relationship** (the referenced object is independent and may be pointed to by many owners — e.g. a Root Cause instance references, but does not own, its Root Cause definition in the Knowledge Library). Every relationship in §4.2 is one or the other, never ambiguous — this distinction is what makes the cascading-delete behavior specified for Company (2.1) and Client-isolation rules (Functional Specification Chapter 7) precisely determinable rather than a case-by-case judgment call.

---

## Chapter 5 — Evidence Chain

### 5.1 The mandatory chain

```
Evidence
  ↓
Signal
  ↓
Finding
  ↓
Root Cause
  ↓
Recommendation
  ↓
Opportunity
```

**No object in this chain may be produced by skipping a link.** A Root Cause may not exist without at least one Finding; a Finding may not exist without at least one Signal or Evidence; a Recommendation may not exist without at least one Root Cause; an Opportunity may not exist without at least one Root Cause or Recommendation. This is not a preference — it is a structural validity rule (Chapter 1, Chapter 3.4) that makes an object failing this chain a malformed object, not merely a low-quality one.

### 5.2 Why this rule is mandatory, not advisory

This chain is the data-model-level enforcement of the Functional Specification's Chapter 9 principles ("Evidence Before Findings," "Every Finding Must Have Supporting Evidence," "Every Recommendation Must Link to Root Cause," "Every Root Cause Must Link to Evidence"). Those principles are stated in the Functional Specification as product behavior requirements; this chapter is where they become checkable data facts — an automated validation pass over any Diagnostic's Insight set can mechanically confirm the chain holds for every single Insight, with no subjective judgment involved. This is the concrete difference between "MGD is designed to be explainable" and "MGD's data cannot represent an unexplainable conclusion."

### 5.3 Ultimate traceability

Because the chain is transitive and mandatory at every link, **every Recommendation and every Opportunity — no matter how many Root Causes or Findings sit between it and the source — is always fully traceable back to specific Evidence in a specific Document.** This is the property Confidence (Chapter 7) is computed from, the property the AI Consultant's citation requirement (2.12, Chapter 9) depends on, and the property that makes MGD's output usable by the external stakeholders described in the Functional Specification (lenders, investors, government agencies) who need to verify a conclusion's basis without re-running the analysis themselves.

### 5.4 Benchmark Alert's position in the chain

Benchmark Alert (Chapter 3.3) enters the chain at the Metric/KPI/Ratio level rather than through Finding — its evidentiary root is the Metric that breached a Benchmark, and that Metric in turn traces to Evidence/Document per 2.18's validation rule. A Benchmark Alert therefore satisfies the same "traces back to Evidence" requirement as every other Insight subtype, via a parallel path (Metric → Evidence) rather than the Finding → Root Cause path other conclusions follow. Both paths terminate at the same place: Evidence.

---

## Chapter 6 — Knowledge Library

### 6.1 Purpose

The Knowledge Library is the complete set of Definition Objects (Chapter 2.0) MGD's engines consult at run time. Every entry in this chapter is platform-owned, industry-scoped via Industry Pack association (never industry-forked), versioned, and administrable without a code change — the concrete fulfillment of the "Knowledge is data, not code" principle (Chapter 1).

### 6.2 The canonical knowledge objects

| Library | Contains | Consumed by | Notes |
|---|---|---|---|
| **Finding Library** | Finding definitions/templates: category, detection basis, severity rules | Finding Engine | Every instance Finding (2.7) references exactly one Finding Library entry |
| **Root Cause Library** | Root Cause definitions: category, description, causal relationships to other Root Cause definitions, classification (Primary/Secondary/Contributing) scoring rule | Root Cause Engine | The single, non-duplicated successor to V1's four independent root-cause libraries ([TECH_DEBT.md](TECH_DEBT.md) §2) |
| **Recommendation Library** | Recommendation definitions: action template, priority/timeframe guidance, sequencing/dependency rules, linked Root Cause definitions | Recommendation Engine | |
| **Opportunity Library** | Opportunity definitions: value type (cost reduction, margin recovery, revenue protection, working-capital improvement), estimation basis rules | Opportunity Engine | |
| **Benchmark Library** | Benchmark definitions (2.11): target values by industry, per Metric/KPI/Ratio type | Financial Intelligence, Operational Intelligence, Confidence Engine | |
| **Industry Library** | The full set of Industry Pack definitions (2.14) and their associations to every other library in this table | Industry Intelligence | |
| **Evidence Rules** | Definitions of how a signal or pattern of signals counts as evidence for a Symptom or Root Cause, including strength weighting and corroboration requirements | Evidence Engine | A Knowledge Rule (2.15) specialization |
| **Financial Rules** | Definitions of how canonical Financial Statement data computes into a Financial Ratio, and account-taxonomy mapping rules | Financial Intelligence | A Knowledge Rule specialization |
| **Operational Rules** | Definitions of how operational data computes into an Operational Ratio or KPI | Operational Intelligence | A Knowledge Rule specialization |
| **Risk Rules** | Definitions of how to classify a Root Cause, Finding, or Metric pattern into a risk category (e.g. going-concern risk, operational risk) — new in V2, added to serve the lender/investor/government-agency audience defined in the Functional Specification | Confidence Engine, Root Cause Engine | A Knowledge Rule specialization |
| **Best Practices** | Reference content describing exemplary (not merely average) performance for a given operational or financial dimension, used to phrase Recommendations meaningfully and to benchmark against excellence rather than only the industry mean | Recommendation Engine, AI Consultant (as cited context) | Distinct from Benchmark, which is typically an industry-average/target reference; Best Practices is aspirational reference content |
| **Regulatory References** | Citations/links to relevant regulatory or compliance frameworks associated with specific Root Causes, Recommendations, or Risk classifications | AI Consultant (as cited context), Recommendation Engine | MGD cites relevant regulatory context where the Knowledge Library defines the linkage; it does not itself perform legal or compliance determination |

Risk Rules, Best Practices, and Regulatory References are additions beyond what [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) enumerated, included here because they are a direct, foreseeable consequence of the Functional Specification's stated audience (Chapter 2.2: investors, lenders, government agencies) and are far cheaper to model now than to retrofit later — consistent with this document's ten-year durability requirement.

### 6.3 How Industry Packs extend the library without duplicating it

An Industry Pack (2.14) never contains a copy of a Root Cause, Recommendation, Benchmark, or Rule. It contains only:

1. **Applicability associations** — "this Root Cause definition applies to this industry."
2. **Parameter overrides** — "this Benchmark's target value, for this industry, is X" (the Benchmark definition itself is shared; only the industry-scoped target value varies).
3. **Weighting adjustments** — "this Root Cause is a Primary driver in this industry, but only Contributing in another" (the classification *rule* is shared; the industry-specific weighting input to that rule varies).
4. **Industry-specific vocabulary** — additional Evidence Rules or terminology scoped to one industry's document conventions, layered on top of, never replacing, the shared vocabulary.

Adding an industry is therefore an act of *authoring associations against existing definitions*, not writing new definitions — which is what makes it a data-authoring task rather than an engineering task, fulfilling [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §6's design intent at the data-model level.

---

## Chapter 7 — Confidence Model

### 7.1 Confidence as a business object, not a percentage

Confidence (2.22) is modeled as a first-class object precisely because a bare number cannot be explained. "62% confidence" answers nothing on its own; "62% confidence, driven by medium evidence quality, corroborated by two independent documents, but reduced by one contradictory signal in the maintenance log" is explainable, auditable, and actionable. Every Confidence object carries its inputs, not just its output.

### 7.2 Confidence inputs

| Input | What it captures |
|---|---|
| **Evidence quality** | How directly and unambiguously the underlying Evidence supports the conclusion — a precise statement-derived figure scores higher than an inferred pattern in loosely structured text. |
| **Evidence quantity** | How many independent Evidence records corroborate the Signal/Finding/Root Cause — a single mention scores lower than a pattern repeated across multiple documents or periods. |
| **Document completeness** | How much of the document set the active Industry Pack expects for a rigorous diagnosis was actually provided — a Diagnostic run on a partial document set carries lower confidence even if what was provided is high-quality. |
| **Contradictory evidence** | Whether any Evidence or Signal conflicts with the conclusion being drawn — a dedicated negative input; a contradiction is never silently dropped, it is recorded as a traceable fact and reduces confidence explicitly. |
| **Industry coverage** | Whether the active Industry Pack has complete Root Cause/Benchmark/Ratio coverage for the client's industry (per §6.3 and [TECH_DEBT.md](TECH_DEBT.md) §2's identified coverage gaps) — a Diagnostic run against an incompletely-covered industry carries a structurally lower ceiling on confidence, visibly, rather than presenting false certainty. |
| **Historical consistency** | Whether the current Diagnostic's Findings and Root Causes are consistent with, contradict, or diverge from the same Company's prior Diagnostics (Chapter 8) — an abrupt, unexplained reversal from a prior finding is a signal worth surfacing, not silently overwriting. |
| **Consultant validation** | Whether a Consultant Observation (2.16) has explicitly confirmed, adjusted, or overridden the system-computed conclusion — recorded as a distinct, additional input, never blended into or replacing the system-computed score itself. |

### 7.3 Propagation through the diagnostic chain

Confidence is computed at each level of the Evidence Chain (Chapter 5) and propagates upward, combining rather than simply averaging:

1. **Signal-level confidence** is computed first, from Evidence quality and quantity directly.
2. **Finding-level confidence** combines its constituent Signals' confidence, with a corroboration bonus where multiple independent Signals support the same Finding, and a penalty applied if Contradictory evidence exists.
3. **Root Cause-level confidence** combines its constituent Findings' confidence and the strength of the causal-chain match against the Root Cause Library definition.
4. **Recommendation and Opportunity-level confidence** derive from their originating Root Cause's confidence, adjusted by their own basis quality (an Opportunity's statement-derived estimate carries higher confidence than a benchmark-derived one, per 2.10's validation rule).
5. **Diagnostic-level (top-line) confidence** is a weighted aggregate across the full Insight set, further adjusted by Document completeness and Industry coverage — this is the single classification (e.g. reflecting whether the Diagnostic is substantiated by uploaded evidence or based on stated concerns alone) shown prominently on every output (Functional Specification Chapter 6).

Consultant validation, at any level, is recorded as an explicit, separately-attributed adjustment layer — visible alongside the system-computed score, never silently merged into it, so a reader can always see both what MGD computed and what a human consultant subsequently confirmed or changed.

---

## Chapter 8 — Consultant Memory

### 8.1 The model

A Company has many Diagnostics, accumulated over the lifetime of the relationship, and **nothing produced by any of them is ever overwritten.** Every Finding, Root Cause, Recommendation, Opportunity, and Report — from the very first Diagnostic onward — remains permanently retrievable, exactly as it was generated and versioned at the time.

### 8.2 What this enables

- **Historical Findings are retained, not replaced.** A later Diagnostic that reaches a different conclusion about the same underlying issue does not edit or delete the earlier Finding — it produces a new one. The relationship between them (does the new Finding confirm, contradict, or supersede the old one) is itself a recorded fact, not an implicit assumption.
- **Recommendations can be tracked across time.** A Recommendation instance from an earlier Diagnostic can be referenced by a later Diagnostic's Root Cause or Finding as still-open, addressed, in-progress, or recurring — allowing MGD to answer "did the business act on what we told them last time," which is central to demonstrating engagement value (Functional Specification Chapter 6, "Historical Comparison" output).
- **Operational maturity evolves visibly.** Because every Diagnostic's Insight set, Confidence, and Metrics are retained and comparable, a Company's trajectory — improving, stagnant, or deteriorating on a given dimension — is directly queryable across its full Diagnostic history, not reconstructed after the fact from separate reports.
- **Trend analysis is a direct consequence of the model, not a bolted-on feature.** Because Metric, KPI, Financial Ratio, and Operational Ratio instances are retained per Diagnostic with consistent definitions (Chapter 6), a time series across any of them for a given Company falls directly out of the data model — it requires no special-case historical-analysis object.

### 8.3 The governing rule

**Nothing is overwritten. Everything is versioned.** This is not merely Chapter 1's immutability principle restated — it is the specific reason Consultant Memory is possible at all. A data model that permitted in-place correction of a prior Diagnostic's Findings would make genuine trend analysis impossible to trust, because a reader could never be certain whether an apparent improvement was real or merely a retroactive edit. Every object in this document is designed, from Chapter 2 onward, to make that scenario structurally unavailable.

---

## Chapter 9 — AI Context Model

### 9.1 Purpose

This chapter defines, precisely, the boundary of what the AI Consultant (2.12, Narrative) may receive as input — the data-model-level enforcement of the Functional Specification's "AI Explains, Never Diagnoses" principle (Chapter 9) and this document's "AI never owns business facts" principle (Chapter 1).

### 9.2 What the AI Consultant receives

- **Evidence** — for grounding specific narrative claims in source-traceable fact.
- **Signals** — for narrative context on the classified patterns underlying a conclusion.
- **Insights** — the full set of Findings, Root Causes, Recommendations, Opportunities, and Benchmark Alerts for the current Diagnostic, which the Narrative is composed from.
- **Narratives** — prior Narrative versions or, where relevant, Narratives from the same Company's historical Diagnostics, for tonal and structural consistency across engagements.
- **Benchmarks** — the definition-level target values relevant to the current Diagnostic's industry, so the narrative can contextualize a Metric against its target without needing to independently look it up.
- **Historical diagnostics** — prior Diagnostics for the same Company (Chapter 8), so the Narrative can reference trend and trajectory where relevant.

### 9.3 What the AI Consultant must never invent

- **Evidence** — it may cite Evidence supplied to it; it may never assert a fact as evidenced when no corresponding Evidence object exists.
- **Metrics** — it may reference computed Metric/KPI/Ratio values supplied to it; it may never compute or state a figure that was not already produced by Financial or Operational Intelligence.
- **Financial figures** — the same constraint stated explicitly for financial data specifically, given its consequence for the lender/investor audience defined in the Functional Specification.
- **Root causes** — it may explain Root Causes supplied to it; it may never introduce a causal explanation the Root Cause Engine did not produce.
- **Recommendations** — it may explain and prioritize Recommendations supplied to it; it may never propose an action that does not correspond to a Recommendation instance already produced.

### 9.4 Objects deliberately excluded from the standard AI context

**Consultant Observation (2.16)** and **Business Concern (2.17)** are deliberately not included in the baseline AI Consultant input set above. This is a considered exclusion, not an oversight: both are human-authored, free-text-adjacent content that has not passed through the Evidence Chain (Chapter 5), and including them by default would risk the AI Consultant treating unvalidated human assertion as equivalent to system-validated fact — precisely the failure this chapter exists to prevent. A future extension may surface either as explicitly labeled, clearly attributed context (e.g. "the consultant noted the following, unverified, observation..."), but that is a deliberate future design decision requiring its own review, not a default behavior this baseline model permits.

### 9.5 Why this boundary is a data-model concern, not a prompting concern

This chapter's rules are stated as data-model constraints — *what objects the AI Consultant references* — rather than as instructions to whatever generative model implements it, because instructions can be bypassed, forgotten, or degraded by a model update; a data access boundary cannot. If the AI Consultant's implementation is ever changed, replaced, or upgraded, the objects available to it are still exactly the set defined in §9.2, and the objects forbidden to it are still structurally absent from its input — the guarantee survives implementation change, which is the same durability property this entire document is designed around.

---

## Chapter 10 — Future Compatibility

### 10.1 Design intent

This data model is designed to become **the canonical business language of the Scope Optix Platform**, not merely MGD's internal vocabulary. Every object name — Company, Evidence, Signal, Finding, Root Cause, Recommendation, Opportunity, Confidence, Narrative, Report — is deliberately chosen as general business language, not MGD-specific terminology, so that a second Scope Optix product (5MCS, YieldIQ, or a future one) can adopt the same model for its own diagnostic-shaped concerns rather than inventing a parallel vocabulary that would need reconciling later, exactly as MGD V1's four knowledge libraries needed reconciling ([TECH_DEBT.md](TECH_DEBT.md) §2).

### 10.2 What is shareable without modification

- **Company** is modeled as a Context Object independent of any MGD-specific concept from the outset (2.1) — a single canonical Company record can be referenced, by stable identity, by MGD, 5MCS, and YieldIQ alike, without any of them owning or duplicating it. Establishing one shared notion of "which business are we talking about" across the whole platform is the single highest-value piece of shareable model here.
- **The Insight abstraction** (Chapter 3) is domain-agnostic in shape — identity, category, severity, confidence, evidence linkage, lifecycle, versioning — and could be adopted by any future diagnostic-shaped product for its own conclusion types without requiring those conclusions to be MGD Findings or Root Causes specifically.
- **The Evidence Chain** (Chapter 5) and **Confidence Model** (Chapter 7) are general patterns — "a conclusion must trace to evidence" and "confidence is a modeled object with recorded inputs" — reusable by any product that needs to produce defensible, explainable conclusions from client data, not concepts specific to operational/financial diagnosis.
- **The Knowledge-as-Data pattern** (Chapter 6) — definitions as versioned, administrable data rather than code — is a reusable architectural pattern any future Scope Optix product's own knowledge domain could follow, even though each product's actual knowledge content (MGD's Root Causes are not YieldIQ's concern, and vice versa) remains separately owned.

### 10.3 What must not be shared, and why

Consistent with the non-dependency governing constraint established in [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) Chapter 10: sharing a **conceptual model** is not the same as creating a **runtime dependency**, and this document does not authorize the latter. MGD's Knowledge Library content, Evidence/Signal/Insight instances, and Diagnostic records remain owned exclusively by MGD. A future product adopting this same conceptual shape for its own domain does so by building its own instances of these concepts, referencing the shared Company by stable identity where relevant — never by reading MGD's Knowledge Library or instance data directly, and never in a way that would make MGD's availability a precondition for that product functioning. This is the same architectural discipline [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §9 specifies at the engineering level, restated here as a data-modeling constraint: **shared vocabulary, never shared ownership.**

### 10.4 Ten-year durability

This model is written at the level of business meaning — what a Finding *is*, what a Root Cause *is*, why Evidence must precede a conclusion — deliberately independent of any specific database technology, API framework, or engine implementation, all of which are expected to change one or more times over a ten-year horizon. The additions in Chapter 6.2 (Risk Rules, Best Practices, Regulatory References) beyond what today's engine architecture strictly requires are a direct application of this durability goal: they are included now, at negligible cost in a conceptual document, specifically so the model does not need to be broken and re-issued the first time MGD's audience (Chapter 2 of the Functional Specification) makes them necessary in practice.

---

*This is a conceptual data model. It defines the business objects, their relationships, and the rules that govern them — not a database schema, not an API contract, not engine implementation. No schema design, API contract, or implementation work is authorized against this document until it has been formally reviewed and signed off.*
