# MGD Version 2 — Correlation Reasoning Framework

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Correlation Reasoning Framework |
| Version | 1.0 (Draft) |
| Status | **Frozen for review — pending approval.** Describes a deterministic procedure in prose, not an algorithm implementation — no pseudocode function signatures, no TypeScript, no registry. |
| Scope | Defines precisely *how* Correlation Intelligence reasons — the ordered stages a set of Financial Signals, Operational Signals, and Consultant Observations pass through to become Correlation Candidates — and, just as importantly, the exact, narrow boundary at which AI is permitted to participate at all. |
| Prepared by | Office of the Chief Financial Architect, Scope Optix Platform |
| Related documents | Governed by [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md). Operates on the objects defined in [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md). Matches against the rule catalog defined in [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md). Feeds [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md). |

---

## Chapter 1 — Reasoning Is Matching, Not Inference

### 1.1 The founding constraint

Every step in this framework is **procedural rule evaluation against a pre-approved, versioned rule set.** None is a statistical model, a learned weighting, or a similarity score with a tunable threshold. This is not a limitation adopted reluctantly — it is the direct, mechanical answer to the requirement that Correlation Intelligence must never infer causality using AI alone: if the entire reasoning procedure is rule evaluation, there is structurally nothing for an AI model to infer *into*. Chapter 7 defines the one, narrowly-scoped place AI may still participate.

### 1.2 Precedent, and where this framework improves on it

The repository's own V1 code (`server/mgd/root-cause-engine.ts`) already implements a version of this instinct — a Root Cause is synthesized only when specific *combinations* of Finding categories are simultaneously present, never from a single isolated signal, and its own doc comment states the principle directly: *"Root causes emerge from combinations of findings, NOT isolated signals."* This framework generalizes that same instinct across domains (Financial + Operational + Consultant, not just Operational-internal categories) and closes the two gaps V1's implementation had: its pattern library was **hardcoded** (a private, in-code list of category combinations, not a governed Knowledge Object), and at least one detector matched on a Finding's **exact title string** (`detectInventoryControlBreakdown` requiring the literal strings `"Inventory Visibility Weakness"` and `"Inventory Shortage Pattern"`) — a fragile coupling this framework explicitly forbids ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 6). Every pattern this framework matches against is a versioned, approved Correlation Rule referencing typed categories (`FinancialSignalType`, an eventual `OperationalSignalType`), never a string literal.

---

## Chapter 2 — The Reasoning Pipeline

Five ordered stages, run once per correlation request (one Diagnostic's full Financial + Operational + Consultant input set against the currently-approved Correlation Rule catalog):

### 2.1 Normalize

Every `FinancialSignal`, every (eventual) `OperationalSignal`, and every `ConsultantObservation` supplied for this run is wrapped into a `CorrelationInput` ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §3.1) — a single, domain-agnostic shape carrying its domain, type/category, source document(s), period, and confidence. This stage performs no filtering and no judgment; it is a pure, lossless wrapping step. Iteration order is the stable order the inputs were supplied in — never re-sorted by any computed value, so that identical input always visits every later stage in the identical order (Chapter 8).

### 2.2 Pair

Every `CorrelationInput` is paired with every `CorrelationInput` from a *different* domain — financial×operational, financial×consultant, operational×consultant — producing the full `CorrelationPair` ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §3.2) cross-product. Same-domain pairs are never constructed (§1.1 of the Object Model). This is deliberately exhaustive, not pre-filtered by any heuristic guess at relevance — relevance is entirely the Correlation Rule's job to determine in the next stage, not this stage's job to pre-judge. A large input set produces a large number of pairs; this is an accepted, disclosed performance characteristic (mirroring `financial-intelligence/`'s own disclosed FIO-001 "recomputes rather than optimizes" precedent), not a correctness concern.

### 2.3 Match

Every `CorrelationPair` is tested against every currently-`Approved` Correlation Rule in the catalog, in the catalog's stable registration order. A rule "fires" — produces a `CorrelationMatch` with `matched: true` ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §3.3) — when the pair's two `CorrelationInput`s satisfy the rule's declared trigger pattern: one input's `(domain, type)` matches the rule's Domain A pattern, the other's matches Domain B ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2). A pair may match zero, one, or several rules — each is evaluated independently, with no early exit on first match (Chapter 5).

### 2.4 Score

For every `CorrelationMatch` with `matched: true`, the three confidence factors ([05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.5) are computed, in full, per Chapter 3 below — deterministically, from the pair's own already-known metadata, never from an external score.

### 2.5 Emit

For every scored `CorrelationMatch` whose computed confidence meets or exceeds the matched rule's declared minimum confidence threshold ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2), a `CorrelationCandidate` ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.1) is constructed and added to this run's output. A match scoring below the threshold produces no candidate and leaves no trace (Chapter 6) — falling short of a threshold is not itself informative content worth persisting; it is simply the absence of a substantiated correlation.

---

## Chapter 3 — The Three Confidence Factors

Restating [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.5 at the level of mechanical procedure, not merely principle:

### 3.1 Independence

**Procedure.** Compare the two `CorrelationInput`s' `sourceDocumentId` sets. If they are disjoint (share no document), independence holds in full. If they overlap at all — even partially — independence fails, and per §9.5's own text ("two readings of one document is corroboration of nothing"), the match is disqualified outright, not merely down-weighted. This is a hard gate, not a scoring input, mirroring the "Required Evidence" hard-gate concept [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §7.1 already establishes for Evidence Rules generally.

**Consultant Observation special case.** A Consultant Observation has no `sourceDocumentId` (it is not document-derived — [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §3.1). When one side of a pair is a Consultant Observation, independence is evaluated instead against **authorship**: the Consultant Observation's author must be a distinct evidentiary source from whatever produced the other side's Signal (trivially true, since one is a human judgment and the other is a document-derived computation) — independence in this case is a structural given, not a computed check, and is recorded as such.

### 3.2 Temporal alignment

**Procedure.** Compare the two inputs' `period` markers against the matched rule's declared alignment window ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2 — e.g. "same reporting period" or "current period ± one prior period"). Alignment holds if both periods fall within that window relative to each other; fails otherwise, disqualifying the match.

**Disclosed limitation, inherited honestly.** `financial-intelligence/`'s own certification discloses (backlog items PC-003/GR-001) that this platform has no reliable, general-purpose date/period-boundary detection — Growth's own period comparison is itself a disclosed row-sequence proxy, not a validated date range. Correlation Intelligence's temporal alignment check inherits this same limitation rather than papering over it: where a genuine `Period` (with real date boundaries) is available for both sides of a pair, alignment is computed precisely; where one or both sides carry only a row-sequence-proxy period (or no period marker at all), the rule's alignment window is evaluated against whatever periodicity information is genuinely available, and the resulting `CorrelationMatch` is never presented as more temporally precise than its actual inputs support. This is not a design defect this framework introduces — it is an honest inheritance of a gap the certified Financial Intelligence module already disclosed, carried forward rather than hidden.

### 3.3 Rule validation status

**Procedure.** Read the matched rule's lifecycle state directly ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 3). `Approved`/`Published` yields the highest confidence tier and a `governed-match` candidate status. Any other state a rule could theoretically be tested against (see Chapter 7 for why only Draft rules reach this path at all, and only via the novel-suggestion pathway) yields a `novel-suggestion` candidate status and a confidence tier that is never permitted to be scored higher than the lowest `Approved`-tier rule's floor — an unapproved rule can never out-rank an approved one, regardless of how strong its independence/temporal-alignment factors are.

### 3.4 Combining the three factors

The three factors are never averaged or blended into one opaque number. A `CorrelationCandidate.confidence` (per [07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.1) carries all three as distinct, inspectable fields — consistent with [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §7.1's "Confidence as a business object, not a percentage" principle. Any single-number confidence a future Report layer might display is a presentation-layer aggregation of these three, computed by whichever layer needs a single number for display purposes — never computed or stored by `correlation/` itself.

### 3.5 The Consultant Observation ceiling

A `CorrelationPair` in which *neither* input is a genuine, Evidence-Chain-traceable Signal (i.e., both sides are Consultant Observations, or one side is a Consultant Observation and the pairing rule has no genuine Signal-typed alternative) **never produces a `governed-match` candidate, regardless of how the three factors score.** This is a structural rule, not a confidence-threshold outcome: at least one side of any pair that reaches Emit (§2.5) with `status: governed-match` must trace to a document-derived, already-Evidence-linked Signal. A Consultant Observation may corroborate; it may never solely carry a correlation. This directly operationalizes [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) §4.3's stated constraint.

---

## Chapter 4 — Bidirectionality

Per [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.6, correlation is not a one-way "operations explains finance" service. The Pair stage (§2.2) does not privilege either domain as the "source" and the other as the "explanation" — a `CorrelationPair`'s two inputs are unordered at construction. Directionality is determined entirely by which side of a *rule* they satisfy: a rule declares which of its two trigger patterns is Domain A and which is Domain B, and — where a rule is authored as bidirectional ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2's `directionality` field) — the Match stage tests the pair against the rule in both orientations independently, potentially producing two distinct `CorrelationMatch` results (one `financial→operational`, one `operational→financial`) from the same pair and the same rule, each scored on its own merits. This uses the identical Match/Score/Emit logic already specified in Chapter 2 — bidirectionality is not a special case requiring separate machinery, only a second, symmetric application of the same one.

---

## Chapter 5 — Multiple Simultaneous Matches

A single `CorrelationPair` may satisfy more than one `Approved` Correlation Rule. When this happens, **each matching rule produces its own, independent `CorrelationCandidate`** — never a single merged candidate, and never a forced "pick the best one" selection. This is a deliberate, direct reuse of the exact precedent `financial-intelligence/`'s own certified Orchestrator already established and disclosed (FIO-002 — "no semantic consolidation of same-type Evidence/Signals across packs"): two genuinely independent conclusions about the same underlying facts are kept as two genuinely independent records, because collapsing them would require a judgment call about which one is "more correct" that this framework has no deterministic basis for making. `brain/`, or a human reviewer downstream, may reasonably conclude that two candidates both explain related aspects of the same business reality — that synthesis is a legitimate act of judgment, but it is explicitly `brain/`'s to make (within the mechanical bounds [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 5 sets), never this framework's.

---

## Chapter 6 — No-Match Behavior

A `CorrelationPair` that matches no `Approved` rule, and a `CorrelationInput` that appears in no `CorrelationPair` reaching Emit, produce **no output and no record.** This is stated explicitly because its absence is easy to misread as a failure: it is not. A Financial Signal with no correlating Operational counterpart remains fully available at its own domain's level — nothing about Correlation Intelligence's silence removes it from `FinancialSignal[]`, and nothing prevents `brain/` (or a human) from considering it on its own, uncorrelated terms, exactly as the platform already permits before Correlation Intelligence exists at all. Correlation Intelligence's only claim is about what it *can* substantiate under governance — it makes no claim, positive or negative, about signals it does not correlate.

---

## Chapter 7 — The Novel-Suggestion Pathway: Where AI May Participate, and Where It May Not

### 7.1 The boundary, stated once, precisely

An optional, clearly-separated future capability may allow a statistical process or an AI model to observe that a Financial-domain pattern and an Operational-domain pattern co-occur across a body of Diagnostics **more often than an approved rule set currently explains.** This observation is never permitted to become a `CorrelationCandidate` with `status: governed-match`. It may only ever produce one of two outcomes:

1. **Nothing** — if the observation is too weak, too narrow, or the AI process chooses (per its own, separately-governed policy, out of scope for this document) not to surface it.
2. **A Draft Correlation Rule nomination** — a fully-formed candidate rule, in the exact shape [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 2 requires, submitted into the identical Author → Reviewer → Approver workflow ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 10) any human-authored rule follows. It carries an explicit `author: AI-nominated` marker so a Reviewer knows its provenance, mirroring [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §11.2's platform-wide rule: *"AI proposes; it never publishes."*

Only after a human Reviewer and Approver ratify that nomination — becoming a genuinely new `Approved` Correlation Rule, versioned and governed identically to CR-001/002/003 ([09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 4) — does the pattern it describes become capable of producing `governed-match` candidates on future runs. Until then, re-running correlation against the same input produces, at most, the same `novel-suggestion` observation again, never an escalation in status through repetition alone. **Frequency of occurrence is never, by itself, a path to authority.**

### 7.2 Why `novel-suggestion` candidates still use the full Correlation Candidate shape

A `novel-suggestion` candidate ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.2) is deliberately built using the identical field shape as a `governed-match` one — same `contributingInputs`, same `evidenceObjectIds`, same three confidence factors — so that a human Reviewer evaluating it has exactly the same evidentiary picture a genuine correlation would present, and can judge the proposed rule on its merits rather than on a degraded or summarized preview. What differs is exclusively `status`, and the consequence that follows from it: a `novel-suggestion` is never returned to `brain/`, is never eligible for Root Cause promotion ([10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 7), and exists solely as governance-workflow input.

### 7.3 What this pathway explicitly forbids

- An AI process may never directly write to the Correlation Rule catalog, at any confidence level, under any framing (mirrors [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §11.2 exactly).
- An AI process may never cause a `novel-suggestion` candidate to be relabeled `governed-match` — only a human Approver's action on the underlying rule (§7.1) changes that status, and only for future runs, never retroactively for the candidate that prompted the nomination.
- This pathway may never be the *only* way a given Financial↔Operational pairing is ever evaluated — every pairing this pathway nominates is also, from that point forward, subject to the identical deterministic Match/Score/Emit procedure (Chapter 2) as every other rule, with no special-cased "AI rules run differently" logic anywhere in this framework.

---

## Chapter 8 — Determinism Guarantees

Restating [06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md](06_CORRELATION_INTELLIGENCE_ARCHITECTURE.md) Chapter 8 at the procedural level:

- **Stage order is fixed.** Normalize → Pair → Match → Score → Emit, always in this order, never reordered or parallelized in a way that could change which candidates are produced (parallel execution for performance is permitted only where it provably cannot affect the output set — the same standard `financial-intelligence/`'s own certified Orchestrator already meets).
- **Iteration order is fixed.** Correlation Inputs are processed in supplied order; Correlation Rules are evaluated in catalog registration order; no step re-sorts by a computed value (confidence, timestamp, or otherwise) before continuing.
- **Every id is content-derived.** A `CorrelationCandidate.id` is derived from its matched rule's `(id, version)` and every contributing input's own id — never randomly generated, never wall-clock-derived.
- **Rule catalog version is pinned per run.** A correlation run reads one specific, named version of the Correlation Rule catalog; a rule approved mid-run does not retroactively affect that run's output — the same "identical versions ⇒ identical output" standard ADR-010 already established for `document-parser/`.
- **Verification standard.** Exactly as `financial-intelligence/`'s certification did not accept "no `Math.random()` in the source" as sufficient proof of determinism, a future Correlation Intelligence implementation must verify this chapter's guarantees with an actual repeatability test — running identical input through the pipeline twice and asserting byte-identical output — not merely infer it from code review.

---

## Chapter 9 — Worked Walkthrough (Mechanical Trace, Not a Real Run)

This chapter traces the five stages against one illustrative input set, to make the procedure concrete. It is a paper walkthrough, not a report of an actual system run — Operational Intelligence does not exist yet, so step 2 onward is necessarily hypothetical, clearly marked as such.

1. **Input.** One `FinancialSignal` of type `margin_compression` (real — certified, producible today by `analyzeFinancialSignals()` whenever `margin_erosion` evidence is present). One hypothetical `OperationalSignal` of type `manual_process_prevalence` (illustrative only — no such type exists yet; Operational Intelligence is unbuilt).
2. **Normalize.** Two `CorrelationInput`s are constructed: one `domain: financial, type: margin_compression`, sourced from Document A (a P&L); one `domain: operational, type: manual_process_prevalence`, sourced from Document B (a process observation log) — genuinely different documents.
3. **Pair.** Exactly one cross-domain pair is formed (financial × operational; no consultant input supplied in this example).
4. **Match.** The pair is tested against every `Approved` rule. CR-002 ("Operational Efficiency Risk," [09_CORRELATION_RULEBOOK.md](09_CORRELATION_RULEBOOK.md) Chapter 4) declares Domain A = `margin_erosion`/`margin_compression`-family Financial patterns, Domain B = manual-process-indicating Operational patterns. The pair satisfies both sides — `matched: true`.
5. **Score.** Independence: Document A ≠ Document B — holds. Temporal alignment: both within the rule's declared "same reporting period" window — holds. Rule validation status: CR-002 is `Approved` — highest tier.
6. **Emit.** A `CorrelationCandidate` is constructed: `ruleId: CR-002`, `candidateRootCauseDefinitionId: "Operational Efficiency Risk"`, `status: governed-match`, `contributingInputs`: the two inputs above, `evidenceObjectIds`: the full resolved set from both domains' Evidence Chains.
7. **Handoff.** This candidate is returned to `brain/`, which — per [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 5 — mechanically constructs the two underlying Findings (if not already present) and the Root Cause instance referencing both.

Steps 1–6 for the Financial side, and CR-002's rule definition itself, are real and specifiable today. Step 1's Operational side, and therefore the actual execution of steps 2–7, cannot happen until Operational Intelligence exists — this walkthrough demonstrates the *procedure*, not a claim that it has been run.
