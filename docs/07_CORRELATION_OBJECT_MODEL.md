# MGD Version 2 — Correlation Object Model

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Correlation Object Model |
| Version | 1.0 (Draft) |
| Status | **Frozen for review — pending approval.** Conceptual object specification only — Purpose/Description/Relationships/Validation prose, in the exact style [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 3 and [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 3 already use. No TypeScript interface, no registry, no code. |
| Scope | Defines every object Correlation Intelligence works with — which are reused verbatim from existing governance documents, which are new internal working shapes, and which single new shape crosses the module boundary to `brain/`. |
| Prepared by | Office of the Chief Financial Architect, Scope Optix Platform |
| Related documents | Governed by [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md). Reuses object definitions from [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.10 (Signal) and [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.4 (Evidence), §2.5 (Signal), §2.16 (Consultant Observation), §2.17 (Business Concern). Consumed by [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) and [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md). |

---

## Chapter 1 — Design Principles

### 1.1 Reuse before invention

This document follows one rule above all others: **no object is defined here if an approved definition of it already exists elsewhere.** Every one of Correlation Intelligence's inputs is a reused, canonical object — Financial Signal, Financial Evidence (per the certified [financial-intelligence/](../server/v2/financial-intelligence/README.md) module), Consultant Observation, Business Concern (both per [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.16–2.17). This document adds exactly two genuinely new shapes: an internal working representation (Chapter 3) Correlation Intelligence uses to reason across domains it did not itself produce, and one new public handoff shape, the **Correlation Candidate** (Chapter 4), that crosses the module boundary to `brain/`. Nothing else is new.

### 1.2 The internal/public distinction, per ADR-009

Following the exact precedent [document-parser/](../server/v2/document-parser/) established for `DocumentModel` vs. `StructuredDocument`, and [financial-intelligence/](../server/v2/financial-intelligence/README.md) established for its own internal Financial Object Model vs. its public `shared/contracts/` types: this document separates **internal working objects** (Chapter 3 — never exposed outside `correlation/`, freely reshaped as the module's own reasoning evolves) from the **one public output object** (Chapter 4 — versioned, stable, the only thing `brain/` ever sees). A future implementation must never export any Chapter 3 object from `correlation/index.ts`.

### 1.3 Style

Every object below is specified using the same ten-part structure [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) and [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) already use: Purpose, Description, Owner, Relationships, Lifecycle, Validation Rules, Versioning Rules, Audit Requirements, Examples (where illustrative). Where an object is reused rather than new, this document states only what is specific to *its role in correlation* — the object's full definition remains whichever document originally specified it, and this document never restates or drifts from that original.

---

## Chapter 2 — Reused Objects: Their Role in Correlation

### 2.1 Financial Signal / Financial Evidence

Defined in full by `shared/contracts/financial-signal.ts` and `shared/contracts/financial-evidence.ts`, certified real and frozen v1.0 by the [Financial Intelligence Certification](../server/v2/financial-intelligence/FINANCIAL_INTELLIGENCE_CERTIFICATION.md). Correlation Intelligence's role for these objects is strictly consumption — it reads `FinancialSignal[]`/`FinancialEvidence[]` from `analyzeFinancialSignals()`, never constructs, edits, or reinterprets one. A `FinancialSignal` participates in correlation exactly as-is: its `type` (one of the ten `FinancialSignalType` values) is what a Correlation Rule's financial-side trigger pattern matches against ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2), and its `financialEvidenceIds` are what an eventual Correlation Candidate's Evidence Chain resolves through.

### 2.2 Operational Signal / Operational Evidence

Not yet defined by any implemented code — specified conceptually, as a required future contract, in [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) Chapter 4.2, mirroring the Financial Signal/Evidence shape exactly. Once Operational Intelligence exists, its role in correlation is structurally identical to Financial Signal's role above — Correlation Intelligence consumes, never constructs.

### 2.3 Consultant Observation (§2.16, reused verbatim)

**Its role in correlation, specifically.** [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.16 already establishes that a Consultant Observation "may reference zero or more specific Insight instances it annotates or overrides, or may apply at the Diagnostic level generally," and that it is "never merged into or blended with" system-computed content. Correlation Intelligence extends this with one additional, correlation-specific constraint, stated fully in [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3.5: a Consultant Observation may serve as the **corroborating** side of a `CorrelationPair` (Chapter 3.2, below) whose other side is a genuine Signal, but it may never serve as *both* sides of a pair, and a Correlation Rule's trigger pattern may never be satisfied by Consultant Observations alone. This is the same discipline [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 9.4 already applies to the AI Consultant's input boundary, applied here to the correlation-reasoning boundary instead — a distinct but parallel enforcement point, not a restatement of the same one.

### 2.4 Business Concern (§2.17, reused verbatim)

**Its role in correlation, specifically.** Per §2.17's own validation rule ("shall never be used as the evidentiary basis for a Finding or Root Cause"), a Business Concern is never a `CorrelationPair` input at all. Its only role in this module is **prioritization**: when multiple Correlation Rules could be evaluated, a Business Concern captured at Diagnostic intake (e.g. "margins have been shrinking for two quarters") may be used to order or emphasize which Correlation Candidates are surfaced first to `brain/`, exactly as §2.17 already states for Diagnostic focus generally ("priority signals for what a Diagnostic should focus on, not filters on what conclusions are permitted"). This is presentation-order metadata, never a reasoning input — [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md)'s Match/Score/Emit steps (Chapter 2) never read a Business Concern.

---

## Chapter 3 — Internal Working Objects

These three objects exist only inside `correlation/`. None is ever exported from `correlation/index.ts`. Each mirrors a stage `financial-intelligence/`'s own internal Financial Object Model already established the value of naming explicitly, applied here across domains instead of within one.

### 3.1 Correlation Input

**Purpose.** A single, domain-agnostic normalized wrapper around one Financial Signal, one Operational Signal, or one Consultant Observation — the uniform shape every downstream correlation step reasons over, so that "pair a Financial thing with an Operational thing" does not require three-way special-casing at every step.

**Description.** Constructed by a normalization step at the very start of correlation processing (`08_CORRELATION_REASONING_FRAMEWORK.md` Chapter 2.1). Carries, regardless of which domain it wraps: a stable `id`; the `domain` it came from (`financial` | `operational` | `consultant`); its `type`/`category` within that domain (a `FinancialSignalType`, an eventual `OperationalSignalType`, or a Consultant Observation's category); a reference back to the original object it wraps (never a copy of its content); the `sourceDocumentId`(s) its evidence chain resolves to, where applicable (required for `financial`/`operational`, absent for `consultant`, since a Consultant Observation is not document-derived); a `period` or temporal marker, where determinable; and a `confidence` value, carried through unchanged from the wrapped object (a Financial Signal's own confidence, an eventual Operational Signal's own confidence, or — for a Consultant Observation, which has no computed confidence — a fixed, disclosed "human-attested" classification, never a fabricated numeric score).

**Owner.** `correlation/`'s internal normalization stage.

**Relationships.** Wraps exactly one Financial Signal, Operational Signal, or Consultant Observation. Is consumed only by the Pair stage (§3.2).

**Lifecycle.** Constructed fresh at the start of every correlation run; never persisted, never retained across runs (the objects it wraps are already persisted by their own owning module).

**Validation Rules.** A Correlation Input's `sourceDocumentId` set must be non-empty for `financial`/`operational` domain inputs (this is what makes the independence check in §3.3 possible at all) and must be explicitly absent, not empty-by-omission, for `consultant` domain inputs.

### 3.2 Correlation Pair

**Purpose.** A candidate pairing of exactly two Correlation Inputs from two *different* domains — the raw material a Correlation Rule is tested against.

**Description.** Generated by the Pair stage ([08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 2.2) as the cross-product of Correlation Inputs across domains — financial×operational, financial×consultant, operational×consultant — **never same-domain** (same-domain pattern detection is each domain module's own already-completed job; pairing two Financial Signals together would be redundant with what `financial-intelligence/` itself already does internally). Every pair is directionally aware where the eventual rule match requires it (per [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.6's bidirectionality) — see [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 4.

**Owner.** `correlation/`'s internal pairing stage.

**Relationships.** References exactly two Correlation Inputs, from two different domains. Is consumed only by the Match stage (§3.3).

**Lifecycle.** Constructed fresh per run; discarded once matching completes; never persisted on its own (a pair that produces no rule match leaves no trace — [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 6).

**Validation Rules.** Its two Correlation Inputs must be from different domains — a same-domain pair is not a valid object under this model and must never be constructed.

### 3.3 Correlation Match

**Purpose.** The result of testing one Correlation Pair against one Correlation Rule — whether it matched, and if so, the three confidence factors [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.5 requires.

**Description.** Carries: the `CorrelationPair` tested; the `CorrelationRule` (id + version) tested against; a boolean `matched`; and, when matched, the three factors computed deterministically from the pair's own metadata — **independence** (were the two inputs' `sourceDocumentId` sets disjoint?), **temporal alignment** (did the two inputs' periods fall within the rule's declared alignment window?), and **rule validation status** (was the matched rule `Approved`, or is this a `novel-suggestion` produced by the pathway [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 7 describes?). Full mechanics in [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3.

**Owner.** `correlation/`'s internal matching stage.

**Relationships.** References one Correlation Pair and one Correlation Rule. Feeds the Score and Emit stages, which construct a Correlation Candidate (Chapter 4) for every Correlation Match above the rule's declared minimum confidence.

**Lifecycle.** Constructed fresh per (pair, rule) test; a non-matching result is not retained (Chapter 6 of the Reasoning Framework); a matching result is retained only long enough to construct its Correlation Candidate.

**Validation Rules.** `matched: true` requires all three confidence factors to be present and computed, never partially populated.

---

## Chapter 4 — The Public Output Object: Correlation Candidate

### 4.1 Correlation Candidate

**Purpose.** The complete, governed, evidence-linked case that a specific Root Cause Definition is substantiated by a specific, independently-sourced pairing of Signals (and, optionally, corroborating Consultant Observations) — the one and only object `correlation/index.ts` ever exports, and the one and only input `brain/` ever receives from this module.

**Description.** A Correlation Candidate is deliberately **not** an Insight-shaped object (per ADR-006 and [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) Chapter 5.3) — it has no severity, no Narrative-citation reference, no Report inclusion. It carries everything `brain/` needs to construct a Root Cause deterministically, and nothing that would let `brain/`'s promotion step be anything other than mechanical:

| Field | Meaning |
|---|---|
| `id` | Content-derived (per ADR-010/Chapter 8 of the Architecture doc) from the matched rule's id+version and every contributing Signal/Evidence id — never random. |
| `ruleId`, `ruleVersion` | Which Correlation Rule matched, and which version of it — always non-null for a `governed-match` candidate. Never absent; see §4.2. |
| `candidateRootCauseDefinitionId` | Which Knowledge Library Root Cause Definition ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §3.2) this candidate substantiates — a reference, never a constructed Root Cause object itself. |
| `contributingInputs` | The full set of Correlation Inputs (§3.1) that satisfied the rule's trigger pattern — each independently traceable to its own domain's Signal and, through it, Evidence. |
| `evidenceObjectIds` | The complete, resolved set of source `EvidenceObject` ids underlying every contributing input, across *both* domains — genuinely stronger than either domain's own single-domain Evidence Chain, since it must independently resolve through two unrelated document lineages (Chapter 5, below). |
| `confidence` | The three-factor result from the Correlation Match that produced this candidate (§3.3) — independence, temporal alignment, rule validation status — carried through as distinct, inspectable fields, never collapsed into one opaque number (mirroring [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §7.1's "Confidence as a business object, not a percentage" principle, applied here). |
| `status` | `governed-match` or `novel-suggestion` — see §4.2. Never any third value. |
| `documentIds` | The distinct set of source documents involved, across both domains — the concrete, auditable record of the independence check having genuinely been satisfied. |
| `direction` | Which of the rule's declared directionalities fired — `financial→operational` (financial condition explained by operational mechanism), `operational→financial` (operational condition prioritized by financial consequence), or the rule fired in both directions independently, per [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.6. |

**Owner.** `correlation/`'s Emit stage ([08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 2.5). Instance Object — but explicitly **not** an Insight subtype, per ADR-006; it does not inherit [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §3.4's common Insight properties (no severity, no Narrative-inclusion reference, no Report reference).

**Relationships.** References two or more Correlation Inputs (never fewer — a Correlation Candidate with only one contributing domain is not a correlation, by definition), the Correlation Rule (id + version) that produced it, and the Root Cause Definition it candidates for. Is consumed exclusively by `brain/`.

**Lifecycle.** Generated per correlation run, per matching (pair, rule) combination above the rule's minimum confidence. Not retained by `correlation/` itself across runs — persistence, if any is needed, belongs to whichever module consumes it (`brain/`, or a future audit/history capability), the same "Correlation Intelligence stops at analysis, retention is a downstream concern" pattern `financial-intelligence/` already follows for its own output.

**Validation Rules.** Must reference at least two Correlation Inputs from at least two different domains (mirrors [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §3.4's "an Insight that cannot trace to Evidence is invalid" rule, one level removed — a Correlation Candidate that cannot trace to two independent domains is invalid). Must reference exactly one `ruleId` (a candidate matching multiple rules produces multiple candidates, per [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 5 — never one candidate with multiple rule references). `evidenceObjectIds` must be non-empty and every id must resolve to a real `EvidenceObject` in at least one of the two contributing domains' own already-validated Evidence Chain.

**Versioning Rules.** A Correlation Candidate is immutable once emitted — a re-run with the same inputs and the same rule-catalog version produces the identical candidate (same `id`), not an edited one, per Chapter 8 of the Architecture document. A rule version change produces a genuinely new candidate under a new `id`, the old one simply no longer being emitted on the next run — nothing is ever edited in place.

**Audit Requirements.** Every Correlation Candidate's full provenance — which rule version, which contributing inputs, which documents, which confidence factors — is exactly what §4.1's field table already carries; no separate audit log is needed because the object's own required fields *are* the audit record, the same principle [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §10.1 applies to Knowledge Objects generally.

**Examples.** A Correlation Candidate with `contributingInputs` = [a `margin_erosion`-typed `FinancialSignal`, a (future) manual-process-typed `OperationalSignal`], `candidateRootCauseDefinitionId` = "Operational Efficiency Risk," `status` = `governed-match` — the fully-real-today Financial side, paired with the not-yet-buildable Operational side, exactly as [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md)'s CR-002 specifies.

### 4.2 The `status` field, in full

- **`governed-match`** — the candidate's `ruleId` refers to a Correlation Rule whose lifecycle state ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 3) is `Approved`/`Published` at the time correlation ran. This is the only status `brain/` may promote into a Root Cause ([10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 5).
- **`novel-suggestion`** — the candidate arose from the pathway [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 7 describes (a statistical or AI-surfaced co-occurrence not yet backed by an approved rule). It carries the identical field shape as a `governed-match` candidate, with `ruleId` referring to a `Draft`-state rule, so that a human reviewer evaluating it has the same full evidence picture — but it is never treated as authoritative, never auto-promoted, and exists solely to seed the Knowledge governance workflow.

---

## Chapter 5 — Evidence Chain Requirements for a Correlation Candidate

A Correlation Candidate's Evidence Chain is strictly stronger than any single domain's own chain, because it must hold **independently in two places at once**:

```
EvidenceObject (financial document A)  →  FinancialEvidence  →  FinancialSignal  ─┐
                                                                                    ├─→ CorrelationCandidate
EvidenceObject (operational document B) →  OperationalEvidence →  OperationalSignal ─┘
                                                                    (+ optional: ConsultantObservation,
                                                                     corroborating, never load-bearing alone)
```

Both upstream chains (Financial: `EvidenceObject → FinancialEvidence → FinancialSignal`; Operational: the structural mirror, once built) are already independently mandatory and already independently verified within their own domains — `financial-intelligence/`'s certification proves this for the Financial side today. Correlation Intelligence's own additional obligation is narrower and specific to it alone: proving the two chains resolve to **genuinely different source documents** (the independence factor, [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3.1) — a check neither domain module could perform on its own, since neither ever sees the other's documents (ADR-007).

---

## Chapter 6 — Relationship Diagram

```
FinancialSignal ──┐                                   ┌── Finding (financial condition,
                   │                                   │   constructed by brain/ if one
OperationalSignal ─┼──→ CorrelationCandidate ──→ brain/─┤   does not already exist)
                   │      (governed-match only)         │
ConsultantObservation                                   └── Finding (operational mechanism,
   (corroborating only,                                     constructed by brain/ similarly)
    never load-bearing)                                          │
                                                                   ▼
                                                        Root Cause (references both Findings,
                                                        per the matched Correlation Rule's
                                                        candidateRootCauseDefinitionId)
```

See [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 5 for exactly why `brain/`'s promotion step may need to construct **two** Findings (one per contributing domain) before it constructs the Root Cause that references them — a precise mechanical requirement of [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.8's "References one or more Finding records (never zero)" rule, applied to a Correlation Candidate whose contributing inputs are Signals, not yet Findings.

---

## Chapter 7 — What This Object Model Deliberately Excludes

No object in this document is an Insight subtype. No object in this document has a `severity`, a `narrativeInclusionReference`, or a `reportId`. No object in this document is ever constructed outside `correlation/`'s own Emit stage (Chapter 3–4) or outside a domain module's already-frozen output (Chapter 2). No object in this document persists a Consultant Observation's content — it only ever references the existing §2.16 object by id. This chapter exists to make explicit, by exhaustive negative statement, that this document has introduced no shadow Insight model, no second Evidence Chain implementation, and no new persistence concern — every genuinely new thing in this document is the two shapes in Chapters 3–4, and nothing else.
