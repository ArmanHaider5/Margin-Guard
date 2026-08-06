# MGD Version 2 — Root Cause Methodology

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Root Cause Methodology |
| Version | 1.0 (Draft) |
| Status | **Frozen for review — pending approval.** Methodology and worked example only — no TypeScript interface, no registry, no code. Does not implement `brain/`; specifies the contract a future `brain/` architecture must honor when it is designed. |
| Scope | Defines what a Root Cause is under this platform's governance, how a Correlation Candidate relates to a Root Cause Definition, how contribution strength is classified deterministically, and precisely what `brain/` must and must not do when promoting a Correlation Candidate into an actual Root Cause Insight. |
| Prepared by | Office of the Chief Financial Architect, Scope Optix Platform |
| Related documents | Governed by [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md). Consumes [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md)'s Correlation Candidate and [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md)'s reasoning output. Restates and extends [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.17 and [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.8/§3.4/Chapter 5, and [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 10's explainability standard. Bound by ADR-006. |

---

## Chapter 1 — What a Root Cause Is, and Is Not

### 1.1 The canonical definition, restated exactly

[00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.17: *"States why the Findings are occurring... A diagnosed causal explanation, classified by contribution strength (e.g. primary, secondary, contributing), matched against Knowledge using an Organisation's Findings as input."* [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.8 adds: *"matched against the Root Cause Library... using the Company's Findings and evidence as input... References one or more Finding records (never zero)."*

This document defines no new Root Cause object — that object already exists, fully specified, in both documents above. This document's contribution is narrower and specific: **how Correlation Intelligence's output gets a Company from "independently-evidenced Financial and Operational Signals" to "a Root Cause that legitimately references one or more Findings," without ever itself constructing the Findings or the Root Cause** (ADR-006).

### 1.2 A Root Cause is not a restated symptom

[05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.1 names the specific failure this methodology exists to prevent: *"a plausible-sounding Root Cause that merely restates the Financial Finding in different words ('Root Cause: declining margin,' when margin decline is the symptom being explained, not an explanation of anything)."* A Correlation Candidate can only ever reference a Root Cause Definition whose Correlation Rule required an **independently-evidenced second-domain mechanism** ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2) — this is the structural guarantee that a Root Cause promoted from a Correlation Candidate is never merely a restated symptom, because a restated symptom, by definition, cites no independent second-domain evidence and therefore cannot satisfy any Correlation Rule's Domain B requirement.

### 1.3 What this methodology explicitly does not cover

Root Causes that are diagnosed from a single domain's Findings alone (e.g. a purely Operational Root Cause requiring no Financial corroboration) are outside this document's scope — they follow whatever methodology `operational-intelligence/`'s own Root Cause matching eventually specifies, unassisted by Correlation Intelligence, exactly as V1's `root-cause-engine.ts` already does today for purely-operational category co-occurrence. This document governs only the cross-domain case Correlation Intelligence exists to serve.

---

## Chapter 2 — The Three-Tier Relationship: Root Cause Definition, Correlation Rule, Correlation Candidate

```
Root Cause Definition                  Correlation Rule                  Correlation Candidate
(Knowledge Library §3.2)               (this document series, §3.18)     (this document series, Object Model §4.1)
────────────────────────               ─────────────────────             ──────────────────────
"What this cause MEANS,                "HOW we detect it                 "THIS client's actual
 in general, independent               mechanically, for any             evidence satisfies it,
 of any specific client."              client's data."                   specifically, today."

e.g. "Operational Efficiency Risk:     e.g. CR-002: Financial             e.g. this Diagnostic's own
labour-intensive manual process        margin-erosion pattern +           margin_compression Signal +
work is absorbing cost a more          Operational manual-process         this Diagnostic's own manual-
efficient process would not."          pattern, same period,              process Operational Signal,
                                        independent documents.             both real, both traced.
```

A Root Cause Definition is authored once and reused across every client that ever exhibits it — the same non-duplication discipline every Knowledge Object already follows ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 2). A Correlation Rule is the mechanical trigger logic bound to exactly one Root Cause Definition ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 1). A Correlation Candidate is the instance-level proof that one specific Diagnostic's actual data satisfies one specific rule. **`brain/` never invents which Root Cause Definition applies — that determination was already made, deterministically, the moment the Correlation Rule matched.** What `brain/` contributes is the act of constructing the Insight-shaped instance, per Chapter 5.

---

## Chapter 3 — Contribution-Strength Classification

### 3.1 The requirement

[00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.17 requires every Root Cause to be "classified by contribution strength (e.g. primary, secondary, contributing)," and [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.8 requires that classification be "derived using the scoring rule defined in its Knowledge Library definition, applied consistently — the classification itself is not a free-text or ad hoc judgment." This chapter specifies that deterministic procedure for Root Causes originating from a Correlation Candidate.

### 3.2 The procedure

1. **Primary.** A Correlation Candidate whose `confidence` (all three factors, [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 3) meets or exceeds the matched rule's own declared "primary" threshold (a rule-specific value, set during authoring — [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2, an addition to the minimum-confidence field for rules that distinguish primary from secondary contribution), **and** whose `contributingInputs` are not already fully subsumed by a higher-confidence candidate for the same Root Cause Definition, is classified Primary.
2. **Secondary.** A Correlation Candidate for the same Root Cause Definition as an existing Primary candidate, sharing at least one — but not all — of the Primary candidate's contributing inputs, is classified Secondary.
3. **Contributing.** A Correlation Candidate that meets its rule's minimum confidence but falls below the primary threshold, and shares no contributing input with any Primary/Secondary candidate for the same Root Cause Definition, is classified Contributing.

This procedure is entirely a function of already-computed, already-deterministic Correlation Candidate fields — no new judgment is introduced at this step. `brain/` executes it mechanically; it does not weigh evidence itself.

### 3.3 Why this belongs to Root Cause Methodology, not the Reasoning Framework

[08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) deliberately stops at Correlation Candidate emission and never classifies contribution strength — because that classification requires comparing candidates *across* a full Diagnostic's set, after Correlation Intelligence's per-pair reasoning is complete, and because "Primary/Secondary/Contributing" is explicitly an Insight-level property ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.17 states it as a Root Cause property, not a Correlation Candidate property). This is `brain/`'s mechanical step, performed on `correlation/`'s already-finished output — not a second, hidden reasoning stage inside Correlation Intelligence itself.

---

## Chapter 4 — Multiple Root Causes From Overlapping Evidence

A single `FinancialSignal` (e.g. one `margin_compression` Signal) may contribute to more than one `CorrelationCandidate`, if more than one `Approved` Correlation Rule's Domain A pattern matches it against different Operational-side patterns. Per [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 5, both candidates are emitted, and both are eligible for promotion into distinct Root Causes — **no forced single-cause selection.** This reflects business reality directly: a margin decline can genuinely have more than one simultaneous, independently-evidenced operational cause (e.g. both manual-process inefficiency *and* a distinct warehouse bottleneck), and a methodology that forced a single "the" Root Cause would be asserting false precision. This is the same "no semantic consolidation" discipline [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 4.4's summary table implicitly assumes, and the Reasoning Framework's Chapter 5 explicitly states, applied here at the Root Cause level.

---

## Chapter 5 — The Brain Handoff Contract

### 5.1 What `brain/` receives

`brain/` receives `CorrelationCandidate[]` filtered to `status: governed-match` only ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.2). A `novel-suggestion` candidate is never passed to this step — Chapter 7, below, states this as a hard prohibition, not merely the default filtering behavior.

### 5.2 The precise mechanical steps

For each `governed-match` Correlation Candidate, `brain/`'s promotion step performs, in order:

1. **Construct the Finding(s).** Per [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.8, a Root Cause must reference one or more existing Finding records — but Correlation Intelligence's contributing inputs are Signals, not yet Findings (financial-intelligence and operational-intelligence never construct Findings, per ADR-006). `brain/` therefore constructs, for each contributing domain, a Finding referencing that domain's Signal(s)/Evidence directly — satisfying [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.7's own validation rule ("References one or more Signal and/or Evidence records"). This construction is **mechanical**: the Finding's category, evidentiary basis, and severity are fully determined by the Signal(s) it wraps and — where applicable — the Financial Finding taxonomy [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §8.2 already specifies (referenced as descriptive metadata by the matched Correlation Rule, per [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) §2.1). `brain/` exercises no independent judgment about *whether* a Finding exists — the Correlation Candidate having matched a rule already settled that question for both domains simultaneously.
2. **Construct the Root Cause.** Referencing the Finding(s) just constructed (never zero, satisfying [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.8's validation rule), the Correlation Rule's `candidateRootCauseDefinitionId` ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2) as its Knowledge Library definition reference, and the contribution-strength classification from Chapter 3.
3. **Attach Confidence.** The Root Cause's Confidence object ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.22/§7) is derived directly from the Correlation Candidate's own three-factor confidence — `brain/` does not recompute confidence from scratch; it translates an already-computed, already-explainable value into the platform's standard Confidence object shape.
4. **Preserve full lineage.** Every Insight-level property [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §3.4 requires (Evidence linkage, Version, Originating Diagnostic reference) is populated directly from the Correlation Candidate's own already-complete `evidenceObjectIds`, `documentIds`, and rule-version fields — no new evidence is gathered, and no existing evidence is dropped, during promotion.

### 5.3 What `brain/` must never do during this step

`brain/` must never: substitute a different Root Cause Definition than the one the matched rule declared; adjust a Correlation Candidate's confidence factors based on its own independent assessment; promote a candidate whose Evidence Chain does not fully resolve (Chapter 6, below); or promote a `novel-suggestion` candidate under any circumstance (Chapter 7). Every one of these would reintroduce exactly the kind of undocumented, unauditable judgment call this entire document series exists to eliminate — the correlation determination is `correlation/`'s, made once, under governance; `brain/`'s only remaining act is the one ADR-006 reserves to it, construction of the Insight-shaped object itself.

---

## Chapter 6 — Explainability Requirement

### 6.1 Extending FIF's seven questions

[05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 10 requires every Financial Finding to answer seven questions on demand. A Root Cause promoted from a Correlation Candidate must answer all seven **plus two more**, specific to its cross-domain origin:

1–7. *(Documents, accounts, ratios, evidence, signals, confidence basis, recommendation basis — per FIF Chapter 10, restated here as still-binding for the Financial-side half of any cross-domain Root Cause.)*

8. **Which Correlation Rule, and which version?** Traceable to the exact `ruleId`/`ruleVersion` ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md)) that matched — never "a correlation was found," always "*this specific, approved rule*, approved by *this Approver* on *this date*, matched."
9. **Which independent Operational (and, where present, Consultant) evidence corroborated it?** Traceable to the specific Operational Signal/Evidence chain (and any corroborating Consultant Observation, clearly labeled as such per [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.16's "never merged into" rule) that satisfied the rule's Domain B (and optional Domain C) pattern.

### 6.2 Why this is checkable, not merely asserted

Because every field Chapter 5's promotion step populates is copied directly from an already-complete Correlation Candidate (never recomputed, never summarized), answering all nine questions for any promoted Root Cause is a direct field lookup, not a reconstruction. This is the same property [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) Chapter 7.1 already establishes at the architecture level, restated here as a concrete, per-Root-Cause audit checklist.

---

## Chapter 7 — What This Methodology Explicitly Forbids

- **No confidence-threshold-only promotion.** A Correlation Candidate must have matched an actual, approved rule's trigger pattern — scoring "high" on the three confidence factors is never, by itself, sufficient without a genuine rule match. There is no path by which sufficiently-correlated-looking data becomes a Root Cause without a human-approved rule naming that correlation in advance.
- **No AI-only causal assertion.** Restates [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) Chapter 7 and [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 7 as a binding methodology rule, not merely an architectural preference: a `novel-suggestion` Correlation Candidate must never be promoted into a Root Cause by `brain/`, under any confidence level, any framing, or any operator override — the *only* path from `novel-suggestion` to eligibility is the Knowledge governance workflow producing a newly-`Approved` rule, after which a **new**, `governed-match` candidate must be produced and promoted through the ordinary path.
- **No cross-client pattern learning feeding a specific client's Root Cause.** A statistical pattern observed across many clients' Diagnostics may, at most, seed a Draft Correlation Rule nomination ([08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 7) for future governance review. It may never be used directly as the evidentiary basis for any single client's Root Cause today — doing so would mean one client's diagnosis rests on other clients' data, which no object in this document series' Evidence Chain permits (every Correlation Candidate's `evidenceObjectIds` must resolve to *this* Diagnostic's own documents, per [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.1's validation rule).
- **No skipping the Finding-construction step.** `brain/` may never construct a Root Cause that references a Correlation Candidate directly instead of the Finding(s) Chapter 5.2 requires it to construct first — this would violate [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 5's mandatory, no-link-skipped Evidence Chain.

---

## Chapter 8 — Worked End-to-End Example (CR-002, Real Parts Clearly Marked)

This chapter traces one complete Root Cause, from raw Evidence to a promoted Insight, using CR-002 (Operational Efficiency Risk — [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) §4.2), chosen specifically because its Financial side is the one part of any starter rule that is fully real today.

| Step | Object | Status |
|---|---|---|
| 1 | `EvidenceObject`s extracted from a real P&L by `document-parser/` | **Real** — certified, frozen |
| 2 | `FinancialEvidence` of type `margin_erosion` classified by `FinancialEvidenceClassifier` | **Real** — certified, frozen |
| 3 | `FinancialSignal` of type `margin_compression` produced by `analyzeFinancialSignals()` | **Real** — certified, frozen |
| 4 | `EvidenceObject`s extracted from an operational process log | Designed, not real — `document-parser/` itself is real and could parse such a log today, but no Operational Intelligence module exists to interpret it |
| 5 | `OperationalEvidence`/`OperationalSignal` of a manual-process type | **Not real** — Operational Intelligence unbuilt; shape specified in [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) §4.2 |
| 6 | `CorrelationInput`×2, `CorrelationPair`, `CorrelationMatch` against CR-002 | Designed, not real — [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 9's mechanical trace, not an executed run |
| 7 | `CorrelationCandidate` — `status: governed-match`, `candidateRootCauseDefinitionId: "Operational Efficiency Risk"` | Designed, not real |
| 8 | `brain/` constructs Finding (Financial: "Margin Deterioration," referencing step 3) and Finding (Operational: manual-process finding, referencing step 5) | Designed, not real — `brain/` unbuilt |
| 9 | `brain/` constructs Root Cause "Operational Efficiency Risk," referencing both step-8 Findings, classified per Chapter 3's procedure, Confidence per step 7's three factors | Designed, not real |
| 10 | Root Cause included in the Diagnostic's Narrative and Report | Designed, not real — depends on step 9 |

Steps 1–3 are the only steps this worked example can point to as genuinely, presently true of this codebase — everything from step 4 onward is this document series' complete, ready-for-review design, honestly marked as design rather than fact. This table is the concrete demonstration of the same principle [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) Chapter 1.3 states at the outset: this architecture is complete; its implementation is not, and this document does not blur that line anywhere.

---

**Stop.** This document completes the five-document Correlation Intelligence v1.0 architecture series, together with [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md), [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md), [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md), and [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md). No implementation, interface, or registry work has been performed against any of them. They await executive architecture review.
