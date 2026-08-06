# MGD Version 2 — Correlation Rulebook

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Correlation Rulebook |
| Version | 1.0 (Draft) |
| Status | **Frozen for review — pending approval.** Defines a governed content type and its starter content — knowledge specification, in the exact style [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 3 and Chapter 7 already use. No registry, no code, no TypeScript interface. |
| Scope | Formally defines **Correlation Rule** as a Knowledge Object, its mandatory structure, its governance workflow, and specifies the three starter rules — formalizing [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.3's worked examples as real, structured, ready-for-approval rule content. |
| Prepared by | Office of the Chief Financial Architect, Scope Optix Platform |
| Related documents | Specializes [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.15 (Knowledge Rule) and extends [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 3's seventeen-object catalog with an eighteenth. Referenced by [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.2. Matched against by [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md). Governs [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md)'s Root Cause Definition mapping. Every rule below cross-checked against the certified [Financial Intelligence Certification](../server/v2/financial-intelligence/FINANCIAL_INTELLIGENCE_CERTIFICATION.md)'s real, current Evidence and Signal coverage matrices — no rule in this document claims a Financial-side trigger that certification does not actually confirm exists. |

---

## Chapter 1 — Correlation Rule as a Knowledge Object

### 1.1 Formal definition, in the Knowledge Library's own catalog style

This entry is written to slot into [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 3 as object **§3.18**, immediately following the existing seventeen, upon that document's own governance approval of this addition. This document does not itself edit `04_MGD_KNOWLEDGE_LIBRARY.md` — the entry below is proposed content, cross-referenced from here until formally merged.

**§3.18 Correlation Rule**

**Purpose.** A reusable template pairing a specific Financial-domain pattern with a specific Operational-domain pattern (and, optionally, a Consultant-domain corroboration pattern), and declaring what Root Cause Definition their joint, independently-evidenced presence substantiates.

**Description.** Specializes Knowledge Rule ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.15) — the same "data, not code" family as Evidence Rules and Business Rules, applied across two Knowledge Domains simultaneously rather than within one. A Correlation Rule is the operational trigger mechanism that *detects* when a client's actual Signals satisfy a Root Cause Definition's *general* criteria; the Root Cause Definition ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §3.2) states what the cause *means*, independent of any specific client, while the Correlation Rule states *how the platform recognizes it mechanically*. See [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 2 for this relationship in full.

**Relationships.** References exactly one Root Cause Definition (never zero — an evidence-matching rule with nothing to substantiate is not a valid Correlation Rule). References Financial Evidence/Signal type(s) and Operational Evidence/Signal type(s) as its two trigger patterns; may optionally reference a Consultant Observation category as a corroborating (never load-bearing) third pattern. May be scoped by Industry Pack(s), per the same mechanism every other Knowledge Object uses (Chapter 4).

**Inputs.** A `CorrelationPair` ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §3.2), tested by [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md)'s Match stage.

**Outputs.** Instance-level `CorrelationCandidate` objects ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.1) when triggered.

**Validation.** Must reference at least one Financial-domain pattern, at least one Operational-domain pattern, and exactly one Root Cause Definition, before it can be approved. Must declare a minimum confidence threshold and a temporal alignment window explicitly — neither may be silently defaulted.

**Versioning, Approval, Deprecation.** Per [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 10, with the one addition Chapter 3 of this document specifies: dual-domain sign-off.

**Examples.** CR-001, CR-002, CR-003 — Chapter 4, below.

### 1.2 Why this is a specialization, not a new parent concept

[05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.2 already describes a Correlation Rule as "a specialization of Knowledge Rule" — this document makes that precise: Correlation Rule sits alongside Evidence Rule and Business Rule as a third specialization of [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.15's abstract parent, distinguished specifically by spanning two Knowledge Domains (Financial and Operational) rather than operating within one. It inherits every governance obligation §2.15's parent already imposes ("must be data, versioned, and administrable without a code change") — nothing about this specialization relaxes that.

---

## Chapter 2 — Mandatory Rule Fields

Every Correlation Rule, before it may leave Draft state, must specify all of the following — mirroring [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §7.1's "no silent omission, state not-applicable explicitly" discipline:

| Field | Meaning | Required? |
|---|---|---|
| **Rule ID** | Stable identifier (`CR-NNN`), never reused. | Always |
| **Name** | Human-readable name, matching the Root Cause Definition it substantiates where a 1:1 relationship exists. | Always |
| **Version** | Sequential, dated, per [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §10.1. | Always |
| **Status** | Draft / Under Review / Approved / Published / Deprecated / Archived — per §10.2. | Always |
| **Domain A pattern** | The Financial-side trigger: one or more `FinancialSignalType` and/or `FinancialEvidenceType` values. | Always |
| **Domain B pattern** | The Operational-side trigger: one or more (eventual) `OperationalSignalType`/`OperationalEvidenceType` values. | Always |
| **Domain C pattern (optional)** | A Consultant Observation category that may corroborate, never substitute for, Domain A or B. | Optional — state "none" explicitly if absent |
| **Minimum confidence threshold** | The floor below which a matching pair does not produce a `CorrelationCandidate` at all ([08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) §2.5). | Always |
| **Independence requirement** | Always mandatory, never optional per-rule — restated per rule only for auditability, never configurable to "off." | Always ("mandatory," no other value permitted) |
| **Temporal alignment window** | The rule-specific period-comparability rule (e.g. "same reporting period," "current ± 1 prior period"). | Always |
| **`candidateRootCauseDefinitionId`** | Which Knowledge Library Root Cause Definition ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §3.2) this rule's match substantiates. | Always, exactly one |
| **Directionality** | `financial→operational`, `operational→financial`, or `bidirectional` ([05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.6). | Always |
| **Rationale** | Human-readable justification for why this pairing substantiates this Root Cause — the concrete mechanism connecting them, not merely "these two things tend to co-occur." | Always — this is what makes the rule *explainable*, not merely *executable* |
| **Author / Reviewer / Approver / Effective Date / Superseded Date / Reason for Change** | Full governance provenance, per [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §10.1. | Always |
| **Financial Finding label (descriptive only)** | Where applicable, which of [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §8.2's ten named Financial Finding categories this rule's Domain A pattern corresponds to — **explainability metadata only, never a runtime dependency**, since no Financial Finding object is ever actually instantiated before `brain/` runs (§2.1, below). | Optional, but strongly recommended for cross-reference to FIF Chapter 8 |

### 2.1 Why "Financial Finding label" is metadata, not a dependency

[05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 8 names ten Financial Findings (Liquidity Risk, Margin Deterioration, Inventory Capital Lock-up, etc.) and maps each to specific Evidence/Signal type combinations. But per ADR-006, `financial-intelligence/` never constructs a Finding-typed object — only `brain/` may. A Correlation Rule's actual, mechanical trigger pattern (Domain A/B, above) is therefore always expressed in terms of `FinancialSignalType`/`FinancialEvidenceType` directly — the real, certified, currently-available contract — never in terms of an unconstructed Finding object. The Financial Finding label is included purely so a human reading this Rulebook can cross-reference FIF Chapter 8's own taxonomy for context; removing it would not change how any rule actually fires.

---

## Chapter 3 — Authoring, Review, and Approval Workflow

### 3.1 The lifecycle

Identical to every other Knowledge Object: **Draft → Under Review → Approved/Published → Deprecated → Archived** ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §10.2). No shortcut exists from Draft directly to Approved.

### 3.2 Dual-domain sign-off — the one genuinely new governance nuance

A Correlation Rule is the first Knowledge Object type that inherently spans two Knowledge Domains at once. Its Reviewer and Approver roles must therefore include, or explicitly consult, subject-matter authority in **both** Financial Knowledge ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 5) and Operational Knowledge (Chapter 6) — a rule reviewed only by a financial subject-matter expert, with no operational sign-off (or the reverse), has not satisfied this Rulebook's review requirement, regardless of how the underlying governance tooling records "Reviewer" as a single role. This is stated as an explicit rule here because no other Knowledge Object type in [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 3 has this cross-domain requirement — every other object type lives within one Domain.

### 3.3 What a Correlation Rule review must verify

- The Rationale (Chapter 2) genuinely states a plausible causal *mechanism*, not merely a coincidence of category names.
- Both Domain A and Domain B patterns reference real, currently-implemented Evidence/Signal types — or, where they do not (Chapter 4's disclosed gaps), the rule is explicitly approved in Draft/pending-dependency state, never silently approved as if fully operative.
- The minimum confidence threshold and temporal alignment window are independently justified, not copied from another rule without review.
- The rule does not duplicate an already-Approved rule's trigger pattern for a different Root Cause Definition without an explicit, reviewed reason (two rules may legitimately share a trigger pattern only where the Domain B/C side genuinely differs enough to justify two distinct causal conclusions).

---

## Chapter 4 — The v1.0 Starter Rulebook

The three rules below formalize [05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §9.3's worked examples in full, per the Chapter 2 schema. Each is presented with an honest, certification-cross-checked disclosure of exactly how much of it is real today.

### 4.1 CR-001 — Inventory Visibility Weakness

| Field | Value |
|---|---|
| Rule ID | CR-001 |
| Name | Inventory Visibility Weakness |
| Version | 1.0.0 (Draft) |
| Status | **Draft — cannot reach Approved with a live trigger; both sides currently unbuildable** |
| Domain A pattern (Financial) | `FinancialEvidenceType: inventory_accumulation`; `FinancialSignalType: inventory_build_up` |
| Domain B pattern (Operational) | Warehouse-domain pattern indicating put-away delay, misplaced stock, or picking inefficiency (no `OperationalSignalType` catalog exists yet — Operational Intelligence unbuilt) |
| Domain C pattern | None |
| Minimum confidence threshold | High (this Root Cause carries direct working-capital consequence) |
| Independence requirement | Mandatory |
| Temporal alignment window | Same reporting period |
| `candidateRootCauseDefinitionId` | "Inventory Visibility Weakness" |
| Directionality | `financial→operational` (financial condition explained by operational mechanism) |
| Rationale | Capital tied up in inventory is ambiguous alone (overordering, slowing sales, obsolescence, or a warehouse operations problem could each explain it). Independently-evidenced warehouse put-away/picking inefficiency corroborates the specific mechanism: the business cannot see or move its own inventory efficiently, so more accumulates than operations can process. |
| Financial Finding label (metadata) | "Inventory Capital Lock-up" ([05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §8.2) |

**Disclosed status, verified against the Financial Intelligence Certification.** Both `inventory_accumulation` (Evidence) and `inventory_build_up` (Signal) are confirmed **unimplemented** in `financial-intelligence/` v1.0 (certification §8, §9 — three Evidence types and two Signal types have no detection logic yet, and these are two of them). This rule's Financial side has no live trigger today, independent of Operational Intelligence's absence. This is the most heavily blocked of the three starter rules — fully specified, ready for governance review of its *rationale and structure*, but with zero possibility of producing a real `CorrelationCandidate` until both the Financial-side detection logic is built (a `financial-intelligence/` defect-fix-scale or new-milestone-scale addition, not a Correlation Intelligence concern) and Operational Intelligence exists.

### 4.2 CR-002 — Operational Efficiency Risk

| Field | Value |
|---|---|
| Rule ID | CR-002 |
| Name | Operational Efficiency Risk |
| Version | 1.0.0 (Draft) |
| Status | **Draft — Financial side fully real today; Operational side unbuildable** |
| Domain A pattern (Financial) | `FinancialEvidenceType: margin_erosion, cost_escalation`; `FinancialSignalType: margin_compression, operating_cost_inflation` |
| Domain B pattern (Operational) | Workflow/Process-domain pattern indicating manual, undocumented handoffs — evidenced from process-cycle-time data or an absence of system-driven Activity records where automation would normally leave a trail (no `OperationalSignalType` catalog exists yet) |
| Domain C pattern | Consultant Observation, category "process/workflow" — may corroborate the Operational side (e.g. direct field observation of manual work), never substitutes for it |
| Minimum confidence threshold | Medium-high |
| Independence requirement | Mandatory |
| Temporal alignment window | Same reporting period |
| `candidateRootCauseDefinitionId` | "Operational Efficiency Risk" |
| Directionality | `financial→operational` |
| Rationale | Profitability erosion alone does not indicate *why* cost is escalating. Independently-evidenced manual, labour-intensive process work corroborates the specific mechanism: cost is escalating because manual handoffs absorb cost a more efficient, automated process would not. |
| Financial Finding label (metadata) | "Margin Deterioration" ([05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §8.2) |

**Disclosed status, verified against the Financial Intelligence Certification.** `margin_erosion` and `cost_escalation` (Evidence) and `margin_compression` and `operating_cost_inflation` (Signal) are all **confirmed real and implemented** in `financial-intelligence/` v1.0 (certification §8, §9 — all four have working detection logic, multiple sources in the case of `margin_erosion`). This rule's Financial side could, today, produce a real, correctly-classified `CorrelationInput` on every Diagnostic where the underlying condition exists. This is the **only one of the three starter rules whose Financial side has zero remaining blocker** — it is blocked exclusively, and entirely, by Operational Intelligence's absence. It is the rule [08_CORRELATION_REASONING_FRAMEWORK.md](08_CORRELATION_REASONING_FRAMEWORK.md) Chapter 9's worked walkthrough uses for exactly this reason, and the one [10_ROOT_CAUSE_METHODOLOGY.md](10_ROOT_CAUSE_METHODOLOGY.md) Chapter 8 traces end to end.

### 4.3 CR-003 — Revenue Fulfilment Risk

| Field | Value |
|---|---|
| Rule ID | CR-003 |
| Name | Revenue Fulfilment Risk |
| Version | 1.0.0 (Draft) |
| Status | **Draft — Financial side partially real; Operational side unbuildable** |
| Domain A pattern (Financial) | `FinancialEvidenceType: receivable_ageing`; `FinancialSignalType: cash_conversion_deterioration, working_capital_deterioration` |
| Domain B pattern (Operational) | Dispatch-domain pattern indicating delivery confirmation delays or failed/incomplete dispatch events (no `OperationalSignalType` catalog exists yet) |
| Domain C pattern | None |
| Minimum confidence threshold | Medium-high |
| Independence requirement | Mandatory |
| Temporal alignment window | Same reporting period, or current period with dispatch evidence up to 30 days prior (dispatch precedes invoicing, which precedes the collections cycle the Financial side measures) |
| `candidateRootCauseDefinitionId` | "Revenue Fulfilment Risk" |
| Directionality | `financial→operational` |
| Rationale | Lengthening collection cycles alone suggest a collections-process problem, but may instead originate further upstream: invoicing and payment terms cannot start their clock until dispatch is confirmed. Independently-evidenced dispatch delivery-confirmation failures corroborate that the true mechanism is unreliable dispatch, not collections practice itself — a materially different, more actionable Root Cause. |
| Financial Finding label (metadata) | "Receivable Collection Weakness" ([05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) §8.2) |

**Disclosed status, verified against the Financial Intelligence Certification.** `receivable_ageing` (Evidence) is confirmed **unimplemented**. Of its two declared Signal types, `cash_conversion_deterioration` is confirmed **real and implemented**; `working_capital_deterioration` is confirmed **unimplemented** (certification §8, §9). This rule's Financial side is therefore partially live: a Diagnostic could today produce a real `cash_conversion_deterioration` Financial Signal, but the rule's own declared Evidence-level trigger (`receivable_ageing`) — the more precise of its two Financial-side anchors — has no detection logic behind it yet. This rule should be reviewed with that partial-reality disclosed explicitly, not glossed as "ready."

### 4.4 Summary of readiness

| Rule | Financial side | Operational side | Overall v1.0 readiness |
|---|---|---|---|
| CR-001 Inventory Visibility Weakness | Not implemented (both Evidence and Signal) | Not implemented (module unbuilt) | Fully blocked |
| CR-002 Operational Efficiency Risk | **Fully implemented** | Not implemented (module unbuilt) | Blocked only by Operational Intelligence |
| CR-003 Revenue Fulfilment Risk | Partially implemented (one of two Signal types; Evidence type unimplemented) | Not implemented (module unbuilt) | Blocked by both, more severely on the Financial side than CR-002 |

None of the three starter rules can produce a real `CorrelationCandidate` today. All three are fully specified and reviewable on their structure and rationale today. This table exists so no future reader mistakes "the Rulebook exists" for "the Rulebook is operative" — the two are deliberately, honestly different claims.

---

## Chapter 5 — Rule Versioning and Change Management

A change to any field in Chapter 2's schema — trigger pattern, Root Cause Definition mapping, confidence threshold, alignment window — produces a **new version**, never an in-place edit, per [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §10.3's immutability rule. The prior version is marked Superseded, never deleted. Every `CorrelationCandidate` ([07_CORRELATION_OBJECT_MODEL.md](07_CORRELATION_OBJECT_MODEL.md) §4.1) permanently records which specific rule *version* produced it, so a historical correlation remains fully explainable against the exact rule state that produced it even after the rule itself evolves — the identical guarantee [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §3.5 already gives Benchmark Definition, applied here to Correlation Rule.

---

## Chapter 6 — Anti-Patterns This Rulebook Forbids

Grounded directly in defects found in this repository's own V1 `root-cause-engine.ts` during this document series' research — each forbidden explicitly, by name, so a future rule author cannot reintroduce it unknowingly:

1. **Matching on an exact title string.** V1's `detectInventoryControlBreakdown` required the literal strings `"Inventory Visibility Weakness"` and `"Inventory Shortage Pattern"` to be present as Finding titles — a rule that breaks silently the moment either string is reworded. A Correlation Rule's trigger pattern must always reference a typed category (`FinancialSignalType`, `OperationalSignalType`, a Consultant Observation category), never a string literal of any Finding's display text.
2. **Hardcoded category co-occurrence checks outside the governed catalog.** V1's Root Cause detectors were private, in-code functions, not reviewable, versioned Knowledge Objects. Every Correlation Rule this platform ever evaluates must live in the governed catalog Chapter 3 specifies — no engine module may hardcode a private equivalent, per ADR-003 applied here directly.
3. **A rule with no independence requirement.** Independence is mandatory on every rule, with no per-rule override to weaken it (Chapter 2's table states this explicitly: the only permitted value is "mandatory").
4. **Single-reviewer approval of a cross-domain rule.** Per Chapter 3.2 — a Correlation Rule reviewed by only one Knowledge Domain's subject-matter authority has not satisfied this Rulebook's process, regardless of what a governance tool's audit log might otherwise show as "Reviewed."
5. **A rule whose Root Cause mapping the rule's own Rationale does not actually support.** A Rationale that merely restates "these two things co-occur" without stating the causal mechanism a Reviewer can independently evaluate is not an acceptable Rationale — this is the concrete, checkable form of "must never infer causality using AI alone," applied to human-authored rules too: a rule is not exempt from stating *why* just because a human, rather than an algorithm, proposed it.
