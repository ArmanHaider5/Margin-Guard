# MGD Version 2 — Correlation Intelligence Architecture

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Correlation Intelligence Architecture |
| Version | 1.0 (Draft) |
| Status | **Frozen for review — pending approval. No implementation, interface design, or registry work may begin against this document until sign-off.** This document, and the four documents it governs ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md), [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md), [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md), [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md)), are architecture only — no TypeScript interface, no registry, no executable code exists anywhere in this series. |
| Scope | Conceptual correlation reasoning architecture only. Defines how Financial Intelligence, Operational Intelligence, Consultant Observations, and the Knowledge Library combine into governed, deterministic correlations — and precisely where that combination stops, handing off to the Diagnostic Brain. |
| Prepared by | Office of the Chief Financial Architect, Scope Optix Platform |
| Related documents | Governed by [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md), [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md), [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) (all approved), and [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 9 (Operational Correlation — approved; this document is that chapter's full architectural specification, generalized to a third input stream, Consultant Observations, that Chapter 9 did not itself scope). Bound by [99_ARCHITECTURE_DECISIONS.md](99_ARCHITECTURE_DECISIONS.md) ADR-002, 003, 004, 005, 006, 007, 009, 010. Consumes the certified [`server/v2/financial-intelligence/FINANCIAL_INTELLIGENCE_CERTIFICATION.md`](../server/v2/financial-intelligence/FINANCIAL_INTELLIGENCE_CERTIFICATION.md) (Version 1.0, Architecturally Frozen) as its one currently-real input source. |

This document defines the complete Correlation Intelligence architecture of MGD Version 2 — the module that takes independently-produced Financial Signals, Operational Signals, and Consultant Observations, and determines, under governance rather than inference, what they jointly substantiate. It does not itself draw conclusions. It prepares everything a conclusion would need, and stops one step short of drawing it.

---

## Chapter 1 — Purpose

### 1.1 The problem this module exists to solve

[05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 1 establishes financial analysis alone as structurally insufficient: a financial statement is a reflection of business behaviour, never its cause, so a Financial Signal can state *that* something is wrong but almost never *why*. The "why" lives in operational reality that never appears on a financial statement — and, just as often, in the professional judgment of a consultant who has walked the floor, seen the process, and formed an observation no document will ever contain. Correlation Intelligence exists to bring these separately-sourced streams of evidence together, under the same governance discipline every other conclusion-bearing content in this platform already answers to, and to determine — deterministically, explainably, and only ever from evidence — what their joint presence substantiates.

### 1.2 The governing objective

**Correlation Intelligence exists to combine independently-evidenced signals from separate domains into governed, explainable correlation candidates — never to infer causality on its own authority.** Every chapter that follows, and every document this one governs, is in service of that single objective. A correlation is either backed by a pre-authored, approved rule matched deterministically against real evidence, or it is not published as a correlation at all — there is no third option, and there is no path by which a statistical pattern or an AI-surfaced hunch becomes a correlation without first becoming a governed rule.

### 1.3 What "Version 1.0" means for this document

Financial Intelligence reached Version 1.0, Architecturally Frozen, before this document was written — every fact in it about Financial Intelligence's real, current public output is drawn from that certification, not from aspiration. Operational Intelligence does not exist yet — only a specification ([02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) §3.3) and an empty stub (`server/v2/operational-intelligence/index.ts`). This document is therefore, honestly, an architecture for a module that **cannot be fully implemented today** — one of its two mandatory domain inputs does not yet exist. That is not a flaw in this document; it is the correct order of operations. A module permitted to depend on two other modules (ADR-007) should have its contract designed before either dependency is assumed to be ready, precisely so that when Operational Intelligence is eventually built, it is built against a public contract this document already specifies (Chapter 4), rather than being shaped ad hoc by whatever Correlation Intelligence happens to need at the time.

---

## Chapter 2 — Governing Precedent

Correlation Intelligence introduces no new architectural principle. Every rule in this document is a direct application of a decision the platform has already made, extended to a module that did not previously exist in enough detail to apply it to. This chapter states, explicitly, which existing decision governs which part of this design, so that no part of Correlation Intelligence's architecture can be mistaken for a novel exception.

| Existing decision | What it already established | How Correlation Intelligence applies it |
|---|---|---|
| **ADR-002** — Business Ontology governs all products | No module may invent an untraceable business term. | Correlation Intelligence introduces exactly one new business concept — **Correlation Candidate** — and it is deliberately *not* proposed as a new Ontology object (Chapter 5 explains why); every other term this document uses (Signal, Evidence, Finding, Root Cause, Consultant Observation, Business Concern, Knowledge Rule) is reused verbatim from the Ontology and Data Model, never redefined. |
| **ADR-003** — Knowledge is data, not code | `knowledge/` is the single home for reusable, versioned domain knowledge; no engine hardcodes a private copy. | Correlation Rules (the pattern this module matches against) are Knowledge Objects, authored, reviewed, and approved exactly like every other Knowledge Object — see [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md). Correlation Intelligence's own code, when eventually written, will contain a rule-matching *mechanism*, never a rule *table*. |
| **ADR-004** — Evidence precedes interpretation | `document-parser/` stops at Evidence; interpretation is deferred. | Correlation Intelligence performs interpretation across two already-interpreted domains (Financial Signals, Operational Signals are themselves interpretations of Evidence) — it never reaches back past those domains to raw Evidence itself; it consumes their already-classified output, per Chapter 4. |
| **ADR-005** — Modules communicate only through public APIs | Every module exposes exactly one public entry point, its `index.ts`. | `correlation/index.ts` will be the only file any other module may import from. It consumes `financial-intelligence/index.ts` and (once built) `operational-intelligence/index.ts` — never any internal file of either. |
| **ADR-006** — Only the Diagnostic Brain may create Insight objects | `brain/` alone constructs Finding, Root Cause, Recommendation, Opportunity, Risk. | This is the single most load-bearing rule for this document. Correlation Intelligence produces **Correlation Candidates**, never a Finding or a Root Cause. Chapter 5 and [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 5 specify exactly what `brain/` still has to do with a Correlation Candidate before a Root Cause exists. |
| **ADR-007** — Financial Intelligence and Operational Intelligence remain independent until correlated | Neither domain module may import the other; `correlation/` is the one module permitted to depend on both. | This is Correlation Intelligence's own founding rule, named directly. Chapter 6 restates it as this module's own boundary obligation, not merely something it benefits from. |
| **ADR-009** — Public output type, never internal working model | `StructuredDocument`, not `DocumentModel`, is what a downstream module consumes. | Correlation Intelligence must consume `FinancialSignal`/`FinancialEvidence` (Financial Intelligence's actual public contract) and a to-be-built `OperationalSignal`/`OperationalEvidence` pair — never any internal type of either domain. Chapter 4 specifies the required Operational Intelligence public contract using this exact pattern, so that when Operational Intelligence is built, it does not have to design this boundary from nothing. |
| **ADR-010** — Deterministic processing | Identical input + identical versions ⇒ byte-identical output, mechanically verified. | Chapter 8 restates this rule for Correlation Intelligence specifically: identical Signal sets + identical Correlation Rule version set ⇒ byte-identical Correlation Candidates. |
| **[05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 9** — Operational Correlation | Correlation Rule defined; three worked examples; three confidence factors (independence, temporal alignment, rule validation status); bidirectionality. | This entire document series is that chapter's full architectural specification — see [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) for the mechanics and [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) for the worked examples formalized as governed rules. |
| **[03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.16 / §2.17** — Consultant Observation, Business Concern | Both already exist as canonical objects; §2.16 is never merged into system-computed content; §2.17 is never evidentiary. | Correlation Intelligence is the first module to formally consume Consultant Observation as a correlation input alongside Financial and Operational Signals — see Chapter 4 and [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) Chapter 2 for the exact, constrained role it plays. |

No new ADR is strictly required to build what this document specifies — every rule above already exists. Chapter 11 nonetheless proposes one candidate addition to [99_ARCHITECTURE_DECISIONS.md](99_ARCHITECTURE_DECISIONS.md), for a genuinely new decision this document makes that the existing ADR set does not yet cover.

---

## Chapter 3 — Position in the Platform Pipeline

```
Document Parser
   │
   ├──────────────┬──────────────────────┐
   ▼              ▼                      ▼
Financial      Operational          Consultant
Intelligence   Intelligence         Observation
(v1.0, frozen) (not yet built)      (§2.16, Data Model —
   │              │                  human-authored, not
   │              │                  document-derived)
   │  FinancialSignal[]              │
   │  FinancialEvidence[]            │
   │              │  OperationalSignal[]
   │              │  OperationalEvidence[]
   │              │                      │
   └──────────────┴──────────────────────┘
                  ▼
          Correlation Intelligence
        (this document series — v1.0
         design; not yet implementable
         until Operational Intelligence
         ships its own public contract)
                  │
                  │  CorrelationCandidate[]
                  ▼
          Diagnostic Brain (`brain/`)
        (not yet built — ADR-006's sole
         constructor of Finding, Root
         Cause, Recommendation, Opportunity)
                  │
                  ▼
        Finding · Root Cause · Recommendation
              (Insight subtypes)
                  │
                  ▼
              Narrative → Report
```

Correlation Intelligence sits at exactly one point in this pipeline: after both domain modules have finished their own independent reasoning, and before `brain/` constructs anything. It is the **only** module in the platform, by ADR-007, permitted to see both Financial and Operational output in the same process — and, per this document, the only module besides `brain/` permitted to see Consultant Observations as a structured reasoning input rather than mere narrative context (contrast [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 9.4, which deliberately excludes Consultant Observation from the AI Consultant's default input set for exactly the reason this document's Chapter 7 restates: unvalidated human assertion must never be silently treated as equivalent to system-validated fact).

---

## Chapter 4 — Inputs

Correlation Intelligence consumes exactly three domain input streams and one governance input. No other input is permitted.

### 4.1 Financial Intelligence — real today

Per the [Financial Intelligence Certification](../server/v2/financial-intelligence/FINANCIAL_INTELLIGENCE_CERTIFICATION.md), `financial-intelligence/index.ts`'s public entry point, `analyzeFinancialSignals(document, evidence)`, returns exactly `{ financialEvidence: FinancialEvidence[], financialSignals: FinancialSignal[] }`. **This is the real, frozen, v1.0 contract Correlation Intelligence must design against — not the richer per-Capability-Pack output** (Financial Metric, Financial Ratio, Financial Observation instances), which remains internal to `financial-intelligence/`'s Orchestrator and is not exposed through the public entry point. This is a genuine, disclosed constraint, not an oversight: [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.2 itself defines a Correlation Rule as pairing "a specific Financial Signal or Finding pattern" — Signal-level, not Ratio-level — so designing Correlation Rules against `FinancialSignalType`/`FinancialEvidenceType` is textually correct, not a workaround.

### 4.2 Operational Intelligence — required future public contract, specified here

Operational Intelligence does not exist. This document specifies, as a precondition for Correlation Intelligence's own implementation, the shape its public output must take — by direct structural mirror of Financial Intelligence's own certified pattern, per ADR-009's "versioned public output type, never internal working model" rule:

- **`OperationalEvidence`** — the Operational-domain analogue of `FinancialEvidence`: a classified, source-traceable pattern detected from operational document data (production logs, maintenance records, dispatch confirmations, staffing rosters), carrying `evidenceObjectIds` tracing back to real `EvidenceObject`s, exactly as `FinancialEvidence` does today.
- **`OperationalSignal`** — the Operational-domain analogue of `FinancialSignal`: a classified pattern built from one or more `OperationalEvidence` records, carrying `evidenceIds` (or equivalent) for full traceability, exactly as `FinancialSignal` does today.
- A single public entry point, structurally analogous to `analyzeFinancialSignals()`, returning both arrays.

Until Operational Intelligence ships this contract, Correlation Intelligence's design is complete but its implementation cannot begin for the Financial↔Operational pairing — see Chapter 9.

### 4.3 Consultant Observation — reused canonical object, constrained role

Correlation Intelligence consumes [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.16 Consultant Observation directly — **no new object is defined for this**. Its role is deliberately constrained (fully specified in [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) Chapter 2 and [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3): a Consultant Observation may **corroborate** a Financial↔Operational pairing that already has a genuine, Evidence-Chain-traceable Signal on at least one side, but a Correlation Rule can never fire on two Consultant Observations alone, or on a Consultant Observation standing in for a missing Signal. This directly extends the same discipline [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.17 already states for Business Concern ("never substitute for Evidence") to the correlation layer.

### 4.4 The Knowledge Library — governance input, read-only

Correlation Intelligence reads the approved Correlation Rule catalog ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md)) at whatever point in its own lifecycle `knowledge/` eventually exposes it. It never writes to the Knowledge Library, never approves a rule, and never proposes a rule change on its own authority (Chapter 7).

### 4.5 What is never an input

Correlation Intelligence never consumes raw `EvidenceObject[]` or `StructuredDocument` directly (ADR-004 — that interpretation belongs to the domain modules, already done before Correlation Intelligence sees anything). It never consumes another product's data. It never consumes a prior Diagnostic's Insight set as a reasoning input to a new correlation (Consultant Memory, [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 8, is `brain/`'s and the Narrative's concern, not this module's).

---

## Chapter 5 — Outputs

### 5.1 What Correlation Intelligence produces

Exactly one new kind of object: the **Correlation Candidate** — fully specified in [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) Chapter 4. A Correlation Candidate is never itself a conclusion. It is the complete, governed, evidence-linked case that a specific Root Cause Definition is substantiated by a specific pairing of independently-sourced Signals — everything `brain/` needs to construct the actual Insight, and nothing more.

### 5.2 Why "Correlation Candidate" is not a new Ontology object

ADR-002 requires every business term to trace to the Ontology. [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 3's 32-object catalog has no "Correlation" entry — deliberately, per this document's own research: correlation is treated, consistently across ADR-006, ADR-007, and FIF §9.2, as a **mechanism** (a Knowledge Rule specialization plus a process step), not a new conclusion type sitting alongside Finding and Root Cause. Introducing "Correlation Candidate" as a full Ontology object would require amending the Ontology itself — a heavier, cross-product governance action, since the Ontology governs 5MCS and YieldIQ as well as MGD, not just this module. This document therefore positions Correlation Candidate as an **internal-to-`correlation/`-and-`brain/` handoff shape**, analogous in spirit to `document-parser/`'s `DocumentModel` (ADR-009) — real, necessary, precisely specified, but not a platform-wide Ontology object. If a future product beyond MGD needs to consume Correlation Candidates directly, that is the trigger for revisiting this decision, not something this document pre-empts.

### 5.3 What Correlation Intelligence never produces

Per ADR-006, restated here with no exception: Correlation Intelligence never constructs a Finding, a Root Cause, a Recommendation, an Opportunity, a Risk, or a Benchmark Alert. It never writes prose intended for a Report. It never assigns final severity or priority in the sense those terms carry for an Insight (a Correlation Candidate carries a *confidence*, computed per [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3 — this is not the same thing as an Insight's severity/priority classification, which [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 3 shows is a separate, later, still-deterministic step `brain/` performs).

---

## Chapter 6 — Module Boundary Rules

Restating ADR-005 and ADR-007 as this module's own specific obligations, not merely inherited benefits:

- `correlation/index.ts` is the only file another module may import. Internal files (rule-matching logic, the internal object model of [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) Chapter 3) are never imported directly by `brain/` or anything else.
- `correlation/` may depend on `financial-intelligence/index.ts` and `operational-intelligence/index.ts`. It may depend on `knowledge/index.ts` for the approved Correlation Rule catalog. It depends on nothing else under `server/v2/`.
- `financial-intelligence/` and `operational-intelligence/` must never depend on `correlation/`, directly or transitively — the dependency direction is strictly one-way, downstream.
- `brain/` may depend on `correlation/index.ts`. `correlation/` must never depend on `brain/` — Correlation Intelligence has no need to know what `brain/` does with a Correlation Candidate, and designing it as if it did would reintroduce exactly the coupling ADR-005 exists to prevent.
- No V1 path is ever imported, per ADR-001, with no exception carved out for this module.

---

## Chapter 7 — The "Never AI Alone" Principle: Architectural Enforcement

The user-facing requirement — *Correlation Intelligence must never infer causality using AI alone* — is not treated in this architecture as a policy statement to be honored in good faith. It is enforced structurally, the same way [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 9.5 argues the AI Context Model's boundary must be a data-model concern rather than a prompting concern: *"instructions can be bypassed, forgotten, or degraded by a model update; a data access boundary cannot."*

The enforcement points, precisely:

1. **A Correlation Candidate can only ever be constructed by matching a `CorrelationPair` against an approved Correlation Rule** ([08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 2). There is no code path in this architecture by which a statistical score, a similarity metric, or a model's output directly becomes a Correlation Candidate's `ruleId`.
2. **A Correlation Rule is Knowledge, not code** (ADR-003) — authored, reviewed, and approved by named, accountable people ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 3), under the identical Draft → Under Review → Approved/Published → Deprecated → Archived lifecycle every other Knowledge Object already follows ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 10). An AI process, if one is ever used anywhere near this module, has exactly the same three permissions [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 11 already grants it platform-wide — search, explain, compare, summarise — plus one narrowly-scoped fourth capability unique to this module: it may **nominate** a candidate rule draft for human governance, when a Financial↔Operational co-occurrence pattern recurs without an approved rule to explain it. That nomination is never itself a Correlation Candidate. It is routed through the identical Author → Reviewer → Approver workflow as any human-proposed rule, and only becomes capable of producing a real, governed-match Correlation Candidate once approved — exactly the mechanism [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.5 already specifies for a "novel, AI-surfaced candidate correlation." See [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 7 for the full mechanics of this boundary.
3. **A Correlation Candidate always carries its `status`** — `governed-match` (an approved rule matched, deterministically) or `novel-suggestion` (unapproved, non-authoritative). A `novel-suggestion` candidate is never returned to `brain/` as equivalent to a `governed-match` one, and [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 7 states explicitly that `brain/` must never promote a `novel-suggestion` candidate into a Root Cause.

### 7.1 Why "explainable, evidence-backed, deterministic, and traceable" are one requirement, not four

The four qualities named in this module's brief are not independent checkboxes; each is a consequence of the others as this architecture is built:

- **Deterministic** — a rule either matches a pair or it does not; there is no scoring function with a tunable threshold that could produce a different answer on a re-run with identical input and identical rule versions (Chapter 8).
- **Evidence-backed** — a Correlation Candidate's confidence (independence, temporal alignment, rule validation status — [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3) is computed entirely from the pair's own already-evidenced metadata, never from an external or learned signal.
- **Traceable** — because determinism and evidence-backing both hold, every Correlation Candidate can be walked back, mechanically, to the exact Signals, Evidence, rule, and rule version that produced it ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) Chapter 5).
- **Explainable** — because traceability holds, an explanation is never composed prose reconstructing a black-box decision; it is a direct readout of the same facts the matching process itself used ([10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 6).

---

## Chapter 8 — Determinism Requirements

Restating ADR-010 for this module: given (a) an identical set of `FinancialSignal[]`/`FinancialEvidence[]`, `OperationalSignal[]`/`OperationalEvidence[]`, and `ConsultantObservation[]`, and (b) an identical, pinned version of the approved Correlation Rule catalog, Correlation Intelligence **must** always produce a byte-for-byte identical `CorrelationCandidate[]`. No `Math.random()`, no wall-clock-derived value outside an injectable clock, no unordered iteration, no dependency on which order Signals happen to arrive in. Every `CorrelationCandidate.id` is content-derived from its constituent Signal/Evidence ids and the matched rule's id+version, mirroring the `deriveCompositeId` discipline already established and certified throughout `financial-intelligence/`. This is not a new determinism standard — it is the same one, applied one layer up.

---

## Chapter 9 — Dependencies and What v1.0 Defers

This document's own scope is architecture, not implementation (Document Control, above). Beyond that instruction, three genuine, disclosed preconditions must be satisfied before Correlation Intelligence's design can become real code:

1. **Operational Intelligence must ship its own public contract** (Chapter 4.2). Until then, the Financial↔Operational half of Correlation Intelligence has nothing real to consume. This is the load-bearing blocker.
2. **Certain Financial Intelligence Evidence/Signal types remain unimplemented** even on the Financial side alone — per the Financial Intelligence Certification's Evidence and Signal coverage matrices, `inventory_accumulation`, `receivable_ageing`, and `payable_ageing` (Evidence) and `inventory_build_up` and `working_capital_deterioration` (Signal) have no detection logic yet. [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 4 discloses exactly which of the three starter Correlation Rules this blocks, and how much.
3. **`knowledge/` must expose a Correlation Rule catalog.** Today `knowledge/` contains only an Ontology term registry. The governed rule catalog [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) specifies has no home to live in yet.

None of these preconditions block *this document's* completion — an architecture is allowed to describe a system whose dependencies are not yet ready, provided it says so honestly, which this chapter does.

---

## Chapter 10 — Relationship to the Diagnostic Brain

`brain/` is out of scope for this document series to design in full — it is a separate, not-yet-scoped module. This chapter states only the minimum Correlation Intelligence must guarantee so that a future `brain/` architecture document can be written against a stable contract, the same discipline this document itself follows toward Operational Intelligence (Chapter 4.2).

`brain/` receives `CorrelationCandidate[]` with `status: "governed-match"` (never `"novel-suggestion"` — Chapter 7) from `correlation/index.ts`. For each one, per [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 5, `brain/`'s job is a mechanical, auditable promotion — constructing the Finding(s) the Correlation Candidate's contributing Signals imply (if they do not already exist as Insight-level Findings) and the Root Cause that references them, per the Correlation Rule's declared `candidateRootCauseDefinitionId`. `brain/` exercises no independent judgment about *whether* the correlation holds — that determination was already made, deterministically and under governance, by `correlation/`. What `brain/` alone contributes is the act ADR-006 reserves to it: constructing the Insight-shaped object itself.

---

## Chapter 11 — Candidate ADR-011 (Proposed, Not Yet Ratified)

This document identifies exactly one genuinely new architectural decision not already covered by the existing ADR set (Chapter 2). It is proposed here as candidate content for [99_ARCHITECTURE_DECISIONS.md](99_ARCHITECTURE_DECISIONS.md), to be ratified — or amended — by whoever holds that document's approval authority. This document does not itself edit `99_ARCHITECTURE_DECISIONS.md`.

> **Candidate ADR-011 — Correlation Candidate is a handoff shape, not an Insight or a new Ontology object.**
>
> **Context.** ADR-006 establishes that only `brain/` may construct an Insight-shaped object. ADR-002 requires every business term to trace to the Ontology. Correlation Intelligence's terminal output needs a name and a precise shape, but is neither a Finding nor a Root Cause, and the Ontology defines no "Correlation" object (Chapter 5.2, above).
>
> **Decision.** **Correlation Candidate** is defined as an internal handoff shape between `correlation/` and `brain/`, specified in [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md), never exported as a platform-wide Ontology object, and never constructed anywhere except `correlation/index.ts`.
>
> **Consequences.** `brain/` can be designed against a stable, precisely-specified input shape without the Ontology needing to be reopened for a single-module concept. If a future product beyond MGD needs to consume Correlation Candidates directly, promoting it to a full Ontology object becomes a deliberate, separately-scoped decision at that time — not a default this document assumes.

---

**Stop.** This document, together with [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md), [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md), [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md), and [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md), constitutes the complete Correlation Intelligence v1.0 architecture. No implementation, interface, or registry work has been performed against it. It awaits executive architecture review.
