# MGD Version 2 — Knowledge Library

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Knowledge Library: Consulting Knowledge Architecture |
| Version | 2.0 (Draft) |
| Status | **Frozen for review — pending approval. No implementation, authoring tooling, or content migration may begin against this document until sign-off.** |
| Scope | Conceptual knowledge architecture only. Not implementation, not database design. This document defines the structure of MGD's consulting knowledge — the intellectual property every diagnostic draws from. |
| Prepared by | Office of the Chief Architect, Scope Optix Platform |
| Related documents | Governed by [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) (approved — Chapter 6 defines the platform-wide ontology of knowledge this document specializes for MGD) · Elaborates [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) (approved — Chapter 6 introduced the Knowledge Library's object catalog at data-model granularity; this document is its full architectural specification) · Implements the design intent of [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) (approved) and [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §5–§6 |

This document defines the complete consulting knowledge architecture of MGD Version 2. It is written on the understanding, stated plainly and meant literally, that **the Knowledge Library is the primary intellectual property of Scope Optix** — not any engine, not any codebase, not any user interface. Everything MGD's engines compute is mechanical execution of what this document's subject matter contains. This document is intended to remain the authoritative description of that subject matter for at least twenty years, independent of how many times the software that executes it is rewritten.

---

## Chapter 1 — Purpose

### 1.1 Why the Knowledge Library exists

Every diagnosis MGD produces is an act of applying accumulated expertise to a specific business's evidence. That expertise — what a reactive maintenance culture looks like, what a healthy current ratio is for a logistics company, what a 90-day remediation plan for a collections breakdown should contain — did not originate in software. It originates in consulting practice: pattern recognition built up over real engagements, financial and operational theory, industry research, and the accumulated judgment of people who have diagnosed businesses before. The Knowledge Library exists to give that expertise a permanent, structured, reusable home — one that MGD's engines consult, rather than one that is scattered across engine source code, rewritten from memory every time someone touches the diagnostic logic.

### 1.2 Why consulting knowledge is a structured business asset, not application code

MGD Version 1 is the cautionary case for what happens when this distinction is not enforced: four independent, code-based root-cause libraries, none reconciled with the others, none owned by anyone outside engineering, each degrading in a different direction as different developers touched different files under different deadlines ([TECH_DEBT.md](TECH_DEBT.md) §1–§2). None of that knowledge had an author of record, a review process, a version history, or an approval gate — it was simply whatever the last commit said, indistinguishable in status from a bug fix.

A Root Cause definition, a Benchmark, a Playbook are business assets in the same sense a consulting firm's proprietary methodology is a business asset: they have value independent of any particular piece of software, they require domain expertise to create and maintain correctly, they carry business risk if they are wrong, and they must be governed — authored, reviewed, approved, versioned — by people accountable for their accuracy, not by whoever happens to be editing the nearest engine file. This document treats every piece of MGD's consulting knowledge this way, without exception, and Chapter 10 defines the governance discipline that makes it real rather than aspirational.

### 1.3 Software executes knowledge; knowledge defines behaviour

MGD's engines — Signal, Evidence, Finding, Root Cause, Recommendation, Opportunity, and the rest ([MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §4) — are generic reasoning machinery. They contain no knowledge of what a reactive maintenance culture is, no opinion on what a healthy margin looks like, no awareness that Manufacturing and Professional Services weight the same root cause differently. All of that lives here. Run the identical engine code against two different Knowledge Library configurations and it will produce two different diagnoses — which is the concrete proof that MGD's actual intelligence is not in its engines. It is in this document's subject matter. The engines decide *how* to reason; the Knowledge Library decides *what is true about business*. This is the distinction the entire rest of this document is built to protect.

---

## Chapter 2 — Knowledge Architecture

### 2.1 The hierarchy

```
Knowledge Domain
  ↓
Industry Pack
  ↓
Knowledge Category
  ↓
Knowledge Object
  ↓
Knowledge Rule
  ↓
Evidence Rules
  ↓
Business Rules
  ↓
Output Objects
```

### 2.2 A necessary clarification before defining each level

This hierarchy has two different kinds of level in it, and reading it as a single strict containment tree — as if every Knowledge Object were physically owned by, and duplicated within, one Industry Pack — would directly contradict Chapter 4's governing rule that Industry Packs never duplicate knowledge. The correct reading is that this hierarchy describes two intersecting structures:

- **Domain → Category → Object → Rule → Output Objects** is the **content structure**: the universal, shared organization of what MGD knows, authored once, industry-agnostic by default.
- **Industry Pack** is a **scoping lens** applied across that content structure, not a container beneath which separate copies of it live. When this hierarchy is read top to bottom as a query path — "give me the Manufacturing view of Financial Knowledge" — Industry Pack determines which Categories, Objects, and Rules apply and with what parameters, without owning a private copy of any of them (Chapter 4 defines the precise mechanism: Inheritance, Override, Extension).

With that clarification, each level is defined below.

### 2.3 Each level

**Knowledge Domain.** The broadest classification of subject matter — Financial Knowledge (Chapter 5) and Operational Knowledge (Chapter 6) are the two primary Domains this document specifies, with Risk and Regulatory knowledge (introduced in [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §6.2) as further Domains. A Domain exists to give the Knowledge Library a top-level organizing principle independent of any industry — "financial knowledge" is a coherent, complete subject regardless of which industry it is later applied to.

**Industry Pack.** The scoping lens (§2.2) that determines which parts of every Domain apply to a given industry, and with what parameters. Fully specified in Chapter 4.

**Knowledge Category.** A grouping of related Knowledge Objects within a Domain — e.g. "Liquidity" within Financial Knowledge, or "Maintenance" within Operational Knowledge. A Category exists because a Domain is too broad a unit to author or govern coherently; Categories are the level at which a domain expert is typically assigned ownership and review responsibility.

**Knowledge Object.** The seventeen reusable definition types specified in Chapter 3 — Finding Definition, Root Cause Definition, Recommendation Definition, and so on. A Knowledge Object is the unit that gets versioned, reviewed, and approved as a discrete piece of content (Chapter 10).

**Knowledge Rule.** The operationalizing logic attached to a Knowledge Object — the condition under which it triggers, computes, or applies. A Knowledge Rule exists because a Knowledge Object's definition (what it *means*) and its triggering logic (*when* it applies) are conceptually distinct, and separating them is what allows the same Object to be governed for accuracy of meaning while its triggering logic is separately tuned for precision.

**Evidence Rules.** The specific class of Knowledge Rule that governs what evidence is required, supporting, or contradictory for a given conclusion (Chapter 7). Evidence Rules exist as their own level, distinct from Business Rules, because evidence-sufficiency logic ("is there enough proof") is a conceptually different question from domain-computation logic ("what does the proof mean"), and MGD's mandatory Evidence Chain ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 5) depends on that distinction being explicit and inspectable on its own.

**Business Rules.** The specific class of Knowledge Rule that governs domain computation and interpretation — a Financial Ratio's conceptual formula, a Benchmark's target derivation, a Maturity level's criteria. Business Rules exist as their own level because they encode the actual consulting/financial/operational expertise itself, separate from the evidentiary gatekeeping Evidence Rules provide.

**Output Objects.** The final, instance-level occurrences produced when a Diagnostic applies Knowledge Objects and Rules to a specific Organisation's Evidence — the Instance Objects defined in [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 2 (Finding, Root Cause, Recommendation, Opportunity, Risk, and the rest). This is the level at which the Knowledge Library's content stops being reusable, general-purpose expertise and becomes a specific, evidence-linked conclusion about one Organisation, in one Diagnostic.

---

## Chapter 3 — Knowledge Objects

Seventeen reusable object types compose the Knowledge Library's content layer. Each is specified with Purpose, Description, Relationships, Inputs, Outputs, Validation, Versioning, Approval, Deprecation, and Examples. Versioning, Approval, and Deprecation follow the single governance model defined in full in Chapter 10; each object's entry below states only what is specific to that object type, to avoid repeating the same governance mechanics seventeen times.

### 3.1 Finding Definition

**Purpose.** A reusable template for a class of observable business condition MGD can detect.

**Description.** Specifies the category, the detection basis (which Evidence Rule pattern(s) trigger it), default severity logic, and the narrative phrasing template used when this Finding is included in a Report.

**Relationships.** References one or more Evidence Rules; may be referenced by one or more Root Cause Definitions; may be scoped by one or more Industry Packs.

**Inputs.** Evidence Rule matches; Signal classifications.

**Outputs.** Instance-level Finding objects when trigger conditions are met within a Diagnostic.

**Validation.** Must reference at least one Evidence Rule before publication — an evidence-less Finding Definition cannot be approved, per the mandatory Evidence Chain.

**Versioning.** Per Chapter 10; changes to detection basis are versioned with an effective date.

**Approval.** Requires Reviewer and Approver sign-off before publication.

**Deprecation.** A deprecated Finding Definition stops triggering new instances but is never deleted; historical instances remain fully explainable against it.

**Examples.** "Declining collections efficiency"; "recurring unplanned machine downtime."

### 3.2 Root Cause Definition

**Purpose.** A reusable template for a diagnosed causal explanation.

**Description.** Specifies the causal narrative, the classification rule (primary/secondary/contributing), the Finding Definitions that support it, and causal relationships to other Root Cause Definitions.

**Relationships.** References one or more Finding Definitions; generates one or more Recommendation and Opportunity Definitions; may causally relate to other Root Cause Definitions; may be scoped by Industry Pack(s).

**Inputs.** Matched Finding instances within a Diagnostic.

**Outputs.** Instance-level Root Cause objects.

**Validation.** Must reference at least one Finding Definition; its classification rule must be explicit and consistently applied across every Diagnostic that uses it.

**Versioning.** Per Chapter 10.

**Approval.** Changes to classification rules require Approver sign-off given the downstream impact on every Diagnostic that references this definition.

**Deprecation.** Retained permanently; a superseding definition is a new version, not an edit.

**Examples.** "Reactive maintenance culture"; "collections process breakdown."

### 3.3 Recommendation Definition

**Purpose.** A reusable template for actionable guidance in response to a Root Cause.

**Description.** Specifies the action template, priority/timeframe guidance, sequencing dependencies on other Recommendation Definitions, and linked Playbook references (Chapter 9).

**Relationships.** References one or more Root Cause Definitions; references one or more Playbooks; generates Opportunity Definitions.

**Inputs.** Matched Root Cause instances.

**Outputs.** Instance-level Recommendation objects.

**Validation.** Must reference at least one Root Cause Definition — a cause-less Recommendation Definition cannot be approved.

**Versioning.** Per Chapter 10.

**Approval.** Standard Reviewer/Approver sign-off.

**Deprecation.** Retained permanently.

**Examples.** "Implement a preventive maintenance schedule"; "renegotiate payment terms with key suppliers."

### 3.4 Opportunity Definition

**Purpose.** A reusable template for quantifying the value of acting on a Recommendation.

**Description.** Specifies the value type (cost reduction, margin recovery, revenue protection, working-capital improvement), the estimation method, and the Financial Ratio, Operational Ratio, or Benchmark it draws from.

**Relationships.** References one or more Recommendation/Root Cause Definitions; references Financial Ratio, Operational Ratio, and/or Benchmark Definitions.

**Inputs.** Matched Root Cause/Recommendation instances plus computed Metric values.

**Outputs.** Instance-level Opportunity objects.

**Validation.** Must declare its estimation basis explicitly (statement-derived or benchmark-derived).

**Versioning.** Per Chapter 10.

**Approval.** Standard sign-off; estimation-method changes require Reviewer confirmation of continued financial soundness.

**Deprecation.** Retained permanently.

**Examples.** "Downtime reduction value estimation"; "receivables collection acceleration value estimation."

### 3.5 Benchmark Definition

**Purpose.** Defines the expected/target value for a Metric, scoped by industry.

**Description.** Specifies the Metric type it targets, the population or source the target was derived from, and industry-specific target values, applied via Industry Pack association rather than duplication (Chapter 4).

**Relationships.** Referenced by KPI, Financial Ratio, and Operational Ratio Definitions, and by Finding/Risk severity classification; scoped by Industry Pack.

**Inputs.** Aggregated industry performance data, published research, consultant expertise.

**Outputs.** Severity classifications and Benchmark Alert instances when a Metric breaches it.

**Validation.** Must state its Metric type, scope, and origin — per Chapter 8's explainability rule that every Benchmark must identify where it came from.

**Versioning.** Target-value changes are always versioned with an effective date, so historical Diagnostics remain explainable against the target in effect when they ran.

**Approval.** Requires Reviewer confirmation of the data source and Approver sign-off.

**Deprecation.** A superseded target value is never overwritten — retained as a prior version.

**Examples.** "On-time delivery target: 95%, manufacturing"; "current ratio healthy range: 1.5–3.0."

### 3.6 KPI Definition

**Purpose.** Defines a Metric elevated to tracked, benchmarked significance for a given domain or industry.

**Description.** Specifies the computation method, the data it requires, and its associated Benchmark Definition(s).

**Relationships.** Specializes Metric; references a Benchmark Definition; scoped by Industry Pack.

**Inputs.** Operational or financial Evidence.

**Outputs.** Instance-level KPI objects.

**Validation.** Must specify computation method and required source data.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** Overall Equipment Effectiveness (OEE); On-Time-In-Full delivery rate.

### 3.7 Financial Ratio Definition

**Purpose.** Defines a specialized Metric computed strictly from canonical financial statement data.

**Description.** Specifies the conceptual formula (not a literal implementation — this document specifies design, not computation code), required statement types, and associated Benchmark. See Chapter 5 for the financial knowledge this specializes.

**Relationships.** Specializes Metric; references Financial Statement knowledge; references Benchmark Definition.

**Inputs.** Canonical financial statement data.

**Outputs.** Instance-level Financial Ratio objects.

**Validation.** Must specify which statement type(s) it requires.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** Current ratio; gross margin; days sales outstanding.

### 3.8 Operational Ratio Definition

**Purpose.** Defines a specialized Metric computed from operational (non-financial) data.

**Description.** Specifies the conceptual formula, required operational data sources, and associated Benchmark. See Chapter 6 for the operational knowledge this specializes.

**Relationships.** Specializes Metric; references operational knowledge; references Benchmark Definition.

**Inputs.** Operational Evidence/Signals.

**Outputs.** Instance-level Operational Ratio objects.

**Validation.** Must specify required operational data sources.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** Scrap rate; staff turnover rate; maintenance backlog ratio.

### 3.9 Risk Definition

**Purpose.** A reusable template for a class of future business exposure.

**Description.** Specifies the risk category (going-concern, compliance, operational, and others), the Insight or Performance patterns that indicate it, and severity escalation rules.

**Relationships.** References one or more Root Cause/Finding Definitions or Performance-trend patterns; may reference Regulatory Reference entries.

**Inputs.** Matched Insight or Performance-trend instances.

**Outputs.** Instance-level Risk objects.

**Validation.** Must reference the specific Insight or Performance pattern basis it is derived from — an unsupported Risk Definition cannot be approved.

**Versioning.** Per Chapter 10.

**Approval.** Given its consequence for lender- and investor-facing output, Risk Definitions require sign-off from an Approver with recognized risk-domain authority, in addition to standard review.

**Deprecation.** Retained permanently.

**Examples.** "Going-concern risk indicator: deteriorating liquidity trend"; "compliance risk indicator: lapsed safety inspection cadence."

### 3.10 Best Practice

**Purpose.** Describes exemplary, not merely average, performance for a given operational or financial dimension.

**Description.** Aspirational reference content used to phrase Recommendations meaningfully and to benchmark against excellence rather than only the industry mean — distinguished from Benchmark per [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 6.

**Relationships.** Referenced by Recommendation Definitions and by Narrative generation as cited context.

**Inputs.** Consultant expertise, validated operational research, and customer engagement outcomes (Chapter 12).

**Outputs.** Contextual reference content included in Recommendations and Narratives.

**Validation.** Must cite its basis — published research, documented consultant expertise, or a validated engagement outcome.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** "Leading manufacturers achieve OEE above 85% through structured Total Productive Maintenance programmes."

### 3.11 Regulatory Reference

**Purpose.** Cites relevant regulatory or compliance frameworks associated with a Root Cause, Recommendation, or Risk.

**Description.** A citation and reference object, not enforcement logic — MGD cites relevant regulatory context where the Knowledge Library defines the linkage; it does not itself perform legal or compliance determination.

**Relationships.** Referenced by Root Cause, Recommendation, and Risk Definitions.

**Inputs.** Published regulatory or compliance frameworks relevant to an industry.

**Outputs.** Citations included in Narrative and Report output.

**Validation.** Must cite a specific, named external authority or framework — never asserted without a named, verifiable source.

**Versioning.** Per Chapter 10; particularly disciplined re-review is required whenever the underlying regulation changes.

**Approval.** Requires sign-off confirming the citation is current and correctly scoped.

**Deprecation.** A superseded regulatory citation is retained, marked clearly as no longer current, never silently removed.

**Examples.** A citation to a specific occupational safety regulation relevant to a maintenance-related Root Cause.

### 3.12 Evidence Rule

**Purpose.** Defines how a signal or pattern of signals counts as evidence for a Finding, Root Cause, or Risk.

**Description.** Specifies Required Evidence, Supporting Evidence, Contradictory Evidence, Minimum Confidence, Industry Dependencies, and Document Dependencies — fully specified in Chapter 7.

**Relationships.** Referenced by Finding, Root Cause, and Risk Definitions; scoped by Industry Pack.

**Inputs.** Signals and Evidence within a Diagnostic.

**Outputs.** Evidence validation results feeding Confidence computation.

**Validation.** Must specify Required Evidence at minimum — an Evidence Rule with no Required Evidence is not a valid gate.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** See Chapter 7 for a worked example.

### 3.13 Confidence Rule

**Purpose.** Defines how confidence is computed and propagated for a given class of Insight.

**Description.** Specifies the weighting given to each of the seven Confidence inputs defined in [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 7 (evidence quality, evidence quantity, document completeness, contradictory evidence, industry coverage, historical consistency, consultant validation), for a specific Insight type or Industry Pack context.

**Relationships.** Referenced by every Insight subtype's confidence computation; may be overridden per Industry Pack.

**Inputs.** The seven confidence inputs.

**Outputs.** Instance-level Confidence objects.

**Validation.** Must specify how each of the seven inputs is weighted; may not omit any without documented, approved justification.

**Versioning.** Per Chapter 10.

**Approval.** Requires the highest level of Approver sign-off among all Knowledge Object types — a Confidence Rule change affects the trust calibration of every Diagnostic that has ever run under it.

**Deprecation.** Retained permanently; a Confidence Rule change is always a new version, applied prospectively, with the effective date recorded.

**Examples.** "Financial Findings require statement-derived evidence to reach 'substantiated' confidence; text-mention evidence alone caps confidence at 'preliminary.'"

### 3.14 Industry Rule

**Purpose.** Defines an industry-specific interpretive adjustment applied on top of a shared Knowledge Object.

**Description.** The mechanism by which an Industry Pack (Chapter 4) contributes a weighting override, an applicability association, or industry-specific vocabulary — never a duplicate object, always an adjustment layered onto a shared, universal definition.

**Relationships.** Belongs to exactly one Industry Pack; references the shared Knowledge Object it adjusts.

**Inputs.** Domain expert authoring, industry research.

**Outputs.** Applicability and weighting adjustments applied at Diagnostic run time.

**Validation.** Must reference an existing, published shared Knowledge Object — an Industry Rule may never introduce a new Root Cause, Benchmark, or other Object under its own private definition; that would be duplication, which Chapter 4 prohibits.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** "Reactive maintenance culture is a Primary driver in Manufacturing but only a Contributing factor in Professional Services."

### 3.15 Maturity Rule

**Purpose.** Defines the criteria distinguishing one Maturity level from another for a given Process, Department, or dimension.

**Description.** Specifies observable Performance and Improvement patterns characteristic of each of the five Maturity levels (Chapter 8) for a specific dimension, optionally scoped by Industry Pack.

**Relationships.** Referenced by Maturity assessment logic; may be extended per Industry Pack.

**Inputs.** Historical Performance and Improvement data.

**Outputs.** Instance-level Maturity assessments.

**Validation.** Must define observable, evidence-derivable criteria for each level it covers — a Maturity Rule may not rely on subjective, non-evidenced judgment alone.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** "Maintenance function maturity: Foundational = no preventive maintenance schedule exists; Leading = predictive maintenance with sub-2% unplanned downtime."

### 3.16 Playbook

**Purpose.** Defines a structured, time-horizon-scoped implementation plan a Recommendation may reference.

**Description.** A sequence of concrete steps organized across the seven time horizons defined in Chapter 9, reusable across multiple Recommendation Definitions that share a similar remediation path.

**Relationships.** Referenced by one or more Recommendation Definitions; may be scoped by Industry Pack.

**Inputs.** Consultant expertise, validated engagement outcomes.

**Outputs.** Structured implementation guidance included in Report output.

**Validation.** Must specify at least one time-horizon-scoped step.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** "Preventive Maintenance Implementation Playbook."

### 3.17 Decision Rule

**Purpose.** Defines the criteria and guidance supporting how an Organisation should evaluate and act on a Recommendation.

**Description.** Distinct from a Playbook, which defines *how* to implement — a Decision Rule defines *how urgently and on what basis to decide whether to act*, given a Recommendation's priority, confidence, and quantified Opportunity, informing the Decision object an Organisation ultimately records ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.24).

**Relationships.** Referenced by Recommendation Definitions; informs decision-support content in Narrative and Report output.

**Inputs.** Recommendation priority, Confidence, Opportunity magnitude.

**Outputs.** Decision-support guidance (e.g. urgency framing, escalation criteria) included in Report output.

**Validation.** Must be derivable from Recommendation priority, Confidence, and Opportunity inputs — never asserted independently of them.

**Versioning, Approval, Deprecation.** Per Chapter 10.

**Examples.** "Escalate to immediate action if Opportunity value exceeds 5% of the Organisation's estimated annual revenue and Confidence is substantiated."

---

## Chapter 4 — Industry Packs

### 4.1 Industry Packs as plug-ins

An Industry Pack is a plug-in, not a fork. It attaches to the shared Knowledge Library defined in Chapter 3 and scopes, weights, and — where genuinely necessary — extends it for one industry. **Industry Packs must never duplicate engine logic**, and, per the resolution in §2.2, must never duplicate a Knowledge Object that already exists in universal, cross-industry form under a different name or a private copy. They contribute knowledge; they never reimplement reasoning.

### 4.2 What an Industry Pack may contribute

Every Industry Pack may define, or extend, any of the following: Benchmarks, KPIs, Evidence Rules, Findings, Root Causes, Recommendations, Opportunities, Financial Ratios, Operational Ratios, Risk Models, Playbooks, and Regulatory References — each as either an **Industry Rule** (§3.14, an adjustment to an existing shared Knowledge Object) or, where the underlying business reality has no cross-industry equivalent, a genuinely new, industry-specific Knowledge Object of the relevant type.

### 4.3 Inheritance, override, extension — the three-tier resolution model

- **Inheritance.** Every Industry Pack automatically inherits every universal (industry-unrestricted) Knowledge Object in the Library. A Diagnostic scoped to any industry always has access to the full set of universal Financial Ratios, general operational Findings, and cross-industry Root Causes without any Industry Pack needing to restate them.
- **Override.** Where a universal Knowledge Object applies differently in a given industry — a different Benchmark target, a different classification weight, industry-specific vocabulary — an Industry Rule (§3.14) is authored, referencing the shared Object and supplying the industry-specific parameter. The underlying Object remains singular and shared; only the parameter varies by Industry Pack.
- **Extension.** Where an industry has a genuinely unique business reality with no cross-industry equivalent — a healthcare-specific Root Cause about bed-occupancy patterns, an event-management-specific Finding about dispatch-day staffing shortfalls — the Industry Pack authors a wholly new Knowledge Object, scoped exclusively to that industry. This is not duplication, because no universal equivalent exists to duplicate; it is the addition of genuinely new knowledge the Library did not previously contain.

This three-tier model is what makes "adding an industry" a data-authoring exercise rather than an engineering one: authoring Industry Rules and, where warranted, new industry-specific Objects, never touching engine code and never re-authoring knowledge that already exists.

### 4.4 The fourteen industries

The following fourteen industries are the intended initial coverage set for MGD V2's Industry Pack framework. Each is listed with its primary knowledge emphasis — the Domain and Category combination (Chapters 5–6) that industry's Pack is expected to weight most heavily — not an exhaustive content specification, which is out of scope for this conceptual document.

| Industry | Primary emphasis |
|---|---|
| Manufacturing | Production, Maintenance, Quality, Inventory (Operational); Margins, Working Capital (Financial) |
| Construction | Projects, Procurement, Labour (Operational); Cash Flow, Working Capital (Financial) |
| Retail | Sales, Inventory, Warehouse (Operational); Margins, Efficiency (Financial) |
| Healthcare | Capacity, Utilisation, Service, Quality (Operational); Regulatory References weighted heavily |
| Hospitality | Service, Labour, Capacity (Operational); Margins, Cash Flow (Financial) |
| Professional Services | Workflow, Labour, Service (Operational); Working Capital, Efficiency (Financial) |
| Education | Capacity, Service, Workflow (Operational); Cash Flow (Financial); Regulatory References |
| Logistics | Dispatch, Warehouse, Asset Management (Operational); Efficiency, Working Capital (Financial) |
| Event Management | Dispatch, Labour, Procurement (Operational); Cash Flow (Financial) |
| Food & Beverage | Inventory, Quality, Labour (Operational); Margins (Financial); Regulatory References |
| Automotive | Production, Maintenance, Procurement (Operational); Efficiency, Margins (Financial) |
| Agriculture | Production, Asset Management, Inventory (Operational); Cash Flow, Working Capital (Financial) |
| Energy | Asset Management, Maintenance, Capacity (Operational); Leverage, Cash Flow (Financial); Regulatory References |
| Financial Services | Workflow, Service (Operational); the full Financial Knowledge Domain, with Regulatory References weighted heavily |

Manufacturing is the reference implementation — the industry against which the Knowledge Library's structure was first proven (per [MGD_MASTER_ARCHITECTURE.md](MGD_MASTER_ARCHITECTURE.md) and [MGD_BUILD_PLAYBOOK.md](MGD_BUILD_PLAYBOOK.md)'s V1-era intent) — and remains the benchmark other Industry Packs' completeness is measured against, per [TECH_DEBT.md](TECH_DEBT.md) §2's finding that most of V1's marketed industries never received matching engine-level coverage. This document's three-tier model is the structural fix that finding calls for.

---

## Chapter 5 — Financial Knowledge

This chapter is conceptual design only. No formulas, computation logic, or implementation detail are specified here — that belongs to engineering design following approval of this document.

### 5.1 Structure

Financial Knowledge is organized as: **Financial Statements** (the source data) → **Accounts** (the canonical taxonomy source data is mapped into) → **Ratios**, grouped into six sub-categories (**Liquidity, Profitability, Efficiency, Leverage, Cash Flow, Margins**), plus **Working Capital** as a closely related cross-cutting sub-category → **Benchmarks** (industry-scoped targets for every Ratio) → **Early Warning Indicators** and **Fraud Indicators** (composite, multi-signal categories built on top of Ratios and Trends) → **Trend Rules** (how movement over time, not just point-in-time value, is interpreted).

### 5.2 Each sub-domain

**Financial Statements.** The six source statement types defined in [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) Chapter 5.1 (Balance Sheet, Profit & Loss, Cash Flow, Trial Balance, General Ledger, Bank Statements, AR/AP Ageing) — the raw material every other sub-domain in this chapter ultimately derives from.

**Accounts.** Canonical account taxonomy knowledge — the reference categories (e.g. "Trade Receivables," "Cost of Goods Sold") that an arbitrary client chart-of-accounts is mapped into, so that Ratios and Benchmarks can be computed consistently regardless of how any specific Organisation happens to label its own accounts.

**Ratios.** The general knowledge category housing every Financial Ratio Definition, organized into the sub-categories below.

**Liquidity.** Knowledge concerning an Organisation's ability to meet short-term obligations — the current ratio family, quick ratio, and related measures.

**Profitability.** Knowledge concerning an Organisation's ability to generate returns relative to revenue, assets, or equity.

**Efficiency.** Knowledge concerning how effectively assets and resources convert into revenue — inventory turnover, receivables turnover, payables turnover, asset turnover.

**Leverage.** Knowledge concerning reliance on debt financing and the risk that reliance implies.

**Cash Flow.** Knowledge concerning actual cash movement, distinct from accrual-basis profitability — operating, investing, and financing cash flow.

**Working Capital.** The specific liquidity sub-domain concerned with short-term operating capital adequacy, closely tied to Accounts Receivable/Payable Ageing and Inventory knowledge.

**Margins.** Knowledge concerning the revenue-to-cost relationship at every level (gross, operating, net) — the primary financial lens for MGD's "Margin Guard" positioning specifically, and the sub-domain most directly connected to Operational Knowledge (Chapter 6) via the Opportunity Engine's cross-domain evidence linking.

**Benchmarks.** Industry-scoped target values for every Ratio and Indicator above, per the Benchmark Definition object (§3.5).

**Early Warning Indicators.** Composite, multi-ratio patterns — for example, simultaneous liquidity decline and leverage increase — that indicate emerging distress before any single Ratio alone would breach its Benchmark. This is a distinct knowledge category from simple Benchmark comparison precisely because it requires correlating multiple signals across Ratios and time, not evaluating any one in isolation.

**Fraud Indicators.** Patterns suggesting possible misstatement or irregularity — for example, unusual round-number transaction clustering, or inventory-to-cost-of-goods-sold mismatches inconsistent with reported activity. Fraud Indicators are treated with heightened evidentiary rigor and are always framed in output as warranting further investigation, never as an assertion of fraud — consistent with the Regulatory Reference object's (§3.11) stance that MGD cites and flags, but does not itself make legal or compliance determinations.

**Trend Rules.** Knowledge governing how a Ratio or Indicator's movement over two or more periods — not merely its current value — should be interpreted. A Trend Rule can produce a Finding even where the current-period value alone would not breach any Benchmark (e.g. "three consecutive quarters of margin decline exceeding a defined threshold constitutes a Trend-based Finding regardless of the current absolute margin level"), directly instantiating the Time concepts (Trend, Baseline, Regression) defined in [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 7.

---

## Chapter 6 — Operational Knowledge

Parallel in structure to Chapter 5, and equally conceptual — no computation logic specified here.

### 6.1 Structure

Operational Knowledge is organized around the Ontology's Process and Activity concepts, specialized into functional domains: Inventory, Production, Maintenance, Warehouse, Dispatch, Projects, Quality, Procurement, Sales, Service, Capacity, Utilisation, Labour, Asset Management, Workflow, and Scalability.

### 6.2 Each sub-domain

**Processes / Activities.** The foundational operational knowledge, inherited from [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 2–3, specialized below into functional domains — every sub-domain in this chapter is, conceptually, knowledge about specific classes of Process and Activity.

**Inventory.** Knowledge concerning stock levels, valuation, turnover, and obsolescence.

**Production.** Knowledge concerning throughput, scheduling, planning, and equipment effectiveness.

**Maintenance.** Knowledge concerning preventive maintenance compliance, breakdown patterns, and the reactive-versus-planned maturity spectrum (Chapter 8).

**Warehouse.** Knowledge concerning storage, picking, put-away, and space utilization.

**Dispatch.** Knowledge concerning delivery scheduling, on-time performance, and routing.

**Projects.** Knowledge concerning project delivery, timeline and budget variance, and milestone performance.

**Quality.** Knowledge concerning defect rates, rework, non-conformance, and the root causes of quality failure.

**Procurement.** Knowledge concerning supplier performance, lead time, and purchase-to-pay cycle efficiency.

**Sales.** Knowledge concerning pipeline, conversion, and order fulfillment.

**Service.** Knowledge concerning service delivery, response time, and customer satisfaction — particularly relevant to Hospitality, Professional Services, and Healthcare Industry Packs.

**Capacity.** Knowledge concerning the theoretical or practical throughput ceiling of a Process, Department, or asset.

**Utilisation.** Knowledge concerning how much of available Capacity is actually used — a distinct category from Capacity itself, since an Organisation can have ample Capacity and still perform poorly if Utilisation is low.

**Labour.** Knowledge concerning staffing levels, overtime, turnover, and productivity.

**Asset Management.** Knowledge concerning equipment lifecycle, condition-linked replacement planning, and depreciation relative to actual operating condition.

**Workflow.** Knowledge concerning cross-functional handoffs and bottlenecks — distinct from single-Process knowledge, since Workflow issues span multiple Processes and Departments and are frequently invisible to any single functional owner.

**Scalability.** Forward-looking knowledge about whether current Processes and Capacity can support growth without proportional degradation in cost or quality — the operational-domain parallel to Risk (§3.9) in the financial domain.

---

## Chapter 7 — Evidence Rules

### 7.1 The mandatory structure

Every Finding Definition — and, by extension, every Root Cause and Risk Definition built on top of Findings — must define its Evidence Rule using the following six-part structure. No Finding Definition may be approved (Chapter 10) without all six parts specified, at minimum stating that a given part is not applicable, explicitly, rather than silently omitting it.

- **Required Evidence.** The minimum evidentiary basis without which the Finding cannot be triggered at all — a hard gate, not merely a scoring input. If Required Evidence is absent, the Finding does not exist for this Diagnostic, regardless of how much Supporting Evidence is present.
- **Supporting Evidence.** Additional evidence that, if present, strengthens confidence but is not independently required to trigger the Finding.
- **Contradictory Evidence.** Evidence patterns that, if present, actively reduce confidence or suppress the Finding entirely — explicit negative-evidence handling, ensuring a Finding is never produced by ignoring evidence that argues against it.
- **Minimum Confidence.** The floor below which a Finding, even if technically triggered by Required Evidence, is not surfaced as a primary conclusion in a Report.
- **Industry Dependencies.** Which Industry Pack(s) this Evidence Rule is valid under — a rule tuned for one industry's document conventions and vocabulary may not apply, or may apply with different weighting, in another.
- **Document Dependencies.** Which Document types this Evidence Rule can draw evidence from — a rule requiring Accounts Receivable Ageing data cannot trigger if no such document was provided for the Diagnostic.

### 7.2 A worked example (illustrative, not literal implementation)

A Finding Definition for "Deteriorating Collections Efficiency" might specify: Required Evidence — Accounts Receivable Ageing data for at least two comparable periods showing an increasing proportion of receivables aged past 60 days; Supporting Evidence — a corresponding Cash Flow statement showing declining operating cash conversion, or operational notes referencing collections process changes; Contradictory Evidence — an explicit, documented one-time cause (e.g. a single large disputed invoice) that would explain the pattern without indicating a systemic issue; Minimum Confidence — "substantiated," given the direct financial consequence of surfacing this Finding to a lender-facing Report; Industry Dependencies — none (universal); Document Dependencies — Accounts Receivable Ageing (required), Cash Flow Statement (supporting).

### 7.3 How evidence quality affects confidence

Evidence Rule design is the concrete mechanism by which the Confidence Model's abstract inputs ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 7) become operational for a specific Finding. Required Evidence and Supporting Evidence directly determine the "evidence quality" and "evidence quantity" inputs to Confidence; Contradictory Evidence directly determines the "contradictory evidence" input; Document Dependencies, cross-referenced against what was actually provided for a Diagnostic, directly determine the "document completeness" input; Industry Dependencies, cross-referenced against Industry Pack coverage, directly determine the "industry coverage" input. Evidence Rules are, in effect, where the Confidence Model stops being an abstract formula and becomes a concrete, per-Finding specification — the same relationship Business Rules have to Financial and Operational Knowledge (Chapters 5–6), applied to the evidentiary layer instead of the domain-computation layer.

---

## Chapter 8 — Maturity Models

### 8.1 The five levels

Every Process, Department, or operational/financial dimension MGD assesses can be characterized against a universal, five-level maturity scale:

- **Foundational.** No formal system exists. Work is ad hoc and reactive, dependent on individual knowledge rather than documented process.
- **Developing.** Basic structure exists but is inconsistently followed. Some documentation exists; measurement is limited or absent.
- **Scaling.** A consistent process exists and is measured. The Organisation can reliably repeat performance, though it remains largely reactive to problems as they arise rather than anticipating them.
- **Advanced.** Management is proactive. Performance is measured, trended, and used to anticipate problems before they occur; continuous improvement is embedded in how the dimension is run.
- **Leading.** The Organisation operates at or near best-practice, industry-leading performance for this dimension, with predictive and preventive capability, and frequently contributes to what "best practice" itself means in its domain.

### 8.2 How Industry Packs contribute maturity criteria

The five-level scale itself is universal — deliberately so, because it is what allows a Maturity assessment to be compared across industries and across an Organisation's different dimensions in a consistent way (per [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.29). But the *specific, observable criteria* that distinguish one level from the next for a given dimension are industry-specific, and are supplied via Maturity Rules (§3.15) scoped by Industry Pack. "Leading" maintenance maturity in Manufacturing might mean predictive maintenance with sub-2% unplanned downtime; "Leading" collections maturity in Professional Services might mean automated dunning workflows sustaining under 30 days sales outstanding. The universal scale gives every product and every consultant a shared vocabulary for maturity; the Industry Pack's Maturity Rules make each assessment meaningful and evidence-derivable within its specific domain.

---

## Chapter 9 — Playbooks

### 9.1 The seven horizons

Every Playbook (§3.16) organizes its implementation steps across seven time horizons:

- **Immediate.** Actions requiring no significant investment or approval, executable within days — typically process or behavioral fixes.
- **30 Days.** Short-term actions requiring modest coordination or minor resource commitment, achievable within a single operating cycle.
- **60 Days.** Actions requiring cross-functional coordination or moderate investment, spanning roughly two months.
- **90 Days.** Actions warranting a structured project approach — the natural "first quarter" horizon for a new initiative.
- **6 Months.** Medium-term actions requiring sustained investment, process redesign, or system implementation.
- **12 Months.** Actions requiring a full budget cycle, significant capital commitment, or organisational change management.
- **Strategic.** Actions tied to the Organisation's longer-term direction — beyond a single budget cycle, often requiring leadership or board-level commitment (market repositioning, major capital investment, business model change).

### 9.2 Multiple playbooks per recommendation

Every Recommendation Definition may reference one or more Playbooks, and is not limited to a single time horizon. A Root Cause diagnosed as urgent might warrant an Immediate stopgap Playbook paired with a 12-Month Playbook addressing the underlying systemic issue — the two are not competing options but a phased implementation roadmap, and a Recommendation Definition is expected to reference such a sequence wherever a genuine phased approach applies, rather than being artificially confined to a single horizon.

---

## Chapter 10 — Governance

### 10.1 The universal governance record

Every Knowledge Object defined in Chapter 3 — without exception — shall carry the following governance record:

- **Version.** A sequential, dated identifier for this specific state of the object.
- **Author.** Who originally drafted or proposed this version.
- **Reviewer.** Who reviewed it for accuracy and consistency before approval — a role distinct from Author, so that no Knowledge Object is self-approved.
- **Approver.** Who holds the authority to publish this version into active use — a role distinct from Reviewer, preserving separation of duties for content that directly determines what every Diagnostic concludes.
- **Effective Date.** When this version becomes the version Diagnostics will use.
- **Superseded Date.** When this version stopped being the active version — left open for the current version.
- **Reason for Change.** A mandatory, recorded justification for why a new version was created. A Knowledge Object is never silently edited; every change has a stated reason, recorded permanently alongside it.

### 10.2 The governance workflow

Every Knowledge Object moves through the same lifecycle: **Draft → Under Review → Approved/Published → Deprecated → Archived (superseded but permanently retained).** This workflow operationalizes the governance record in §10.1 into an actual process — a Knowledge Object cannot skip from Draft directly to Published without passing through Reviewer sign-off, and cannot be Deprecated without a recorded Reason for Change.

### 10.3 The immutability rule

**No historical knowledge shall ever be deleted.** A superseded Version remains permanently retrievable, so that any historical Diagnostic that used it remains fully explainable against the exact knowledge state that produced it — the same principle established at the platform level in [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 7 and at the product level in [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 1, restated here as the Knowledge Library's own binding rule. **Knowledge evolves through versioning, never through erasure.**

---

## Chapter 11 — Future AI

### 11.1 What AI agents may do with the Knowledge Library

As AI capability grows over this document's twenty-year horizon, future AI agents will be given increasing access to the Knowledge Library. Four capabilities are anticipated and permitted:

- **AI may search.** An AI agent may query the Knowledge Library to locate Finding, Root Cause, Recommendation, or Benchmark Definitions relevant to a described situation — a retrieval capability, not a reasoning-origination capability.
- **AI may explain.** An AI agent may compose natural-language explanations of why a given Knowledge Object applies, or what it means, consistent with the "AI explains" principle ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 10) — every such explanation must cite the specific Knowledge Object or Evidence it is explaining, never inventing content beyond it.
- **AI may compare.** An AI agent may compare two or more Knowledge Objects, Diagnostics, or Organisations' Performance against each other or against a Benchmark — synthesis over existing, approved content.
- **AI may summarise.** An AI agent may condense a large set of Findings, Root Causes, or Recommendations into an executive-level summary — composition of existing, approved content, never generation of new fact.

### 11.2 What AI may never do

**AI may never modify approved knowledge.** No AI-generated content may directly alter, publish, approve, or delete a Knowledge Object, under any implementation, at any point in this platform's history. Where an AI agent identifies a pattern that appears to warrant a new or revised Knowledge Object — for example, noticing that a particular pattern recurs frequently across engagements without an existing Finding Definition to capture it — that observation may be surfaced as a clearly labeled, non-authoritative suggestion, routed through the identical Author → Reviewer → Approver governance workflow defined in Chapter 10 that any human-proposed change follows. AI proposes; it never publishes.

### 11.3 Why this boundary does not weaken as AI improves

This boundary is stated as an access rule — what a system is structurally permitted to write to — not as an instruction to any particular AI implementation. A future, far more capable AI agent than exists today is bound by exactly the same rule as the AI Consultant described in [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md), because the rule does not depend on the AI's capability level — it depends on preserving human accountability for what MGD asserts as business fact, regardless of how sophisticated the tool proposing changes becomes. This is the same durability discipline [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 9.5 applies to the AI Context Model, restated here for the Knowledge Library specifically: a capability boundary expressed as data access survives changes to the AI implementing it; an instruction to "please don't invent facts" does not.

---

## Chapter 12 — Vision

The Knowledge Library defined in this document is not a static reference manual, frozen at the moment of its approval. It is intended to grow continuously, for as long as Scope Optix operates, through three compounding sources: **consultant experience** — the pattern recognition a skilled consultant accumulates across real engagements, formally captured and reviewed rather than left as tacit, undocumented knowledge that leaves the firm when the consultant does; **validated operational research** — published financial and operational theory, industry benchmarking studies, and academic research, brought into the Library through the same governance discipline as any other addition; and **customer engagements** — the accumulated evidence of what actually worked when a Recommendation was acted on, feeding back into Playbooks, Best Practices, and Confidence Rules with ever-increasing precision the longer the platform operates.

Every one of these sources enters the Library the same way every other Knowledge Object does — authored, reviewed, and approved under Chapter 10's governance discipline, never auto-published from raw pattern-matching, never bypassing human accountability regardless of how the observation was surfaced. This is precisely what makes the compounding real rather than illusory: a Knowledge Library that grew by silently absorbing whatever an algorithm noticed would accumulate noise, not expertise. One that grows only through the deliberate, governed judgment of accountable people, informed by real evidence from real engagements, accumulates something a competitor cannot shortcut into existing — a twenty-year record of validated consulting judgment, structured so it never has to be rebuilt from scratch, and never has to be taken on faith, because every piece of it can still be explained, sourced, and audited on the day it is used, no matter how long ago it was written.

This is what [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 10 means when it says the platform's real asset is a reasoning discipline, not a codebase. This document is where that discipline has a body: the Knowledge Library is the consulting expertise of Scope Optix, made durable.

---

*This is a conceptual knowledge architecture. It defines the structure of MGD's consulting knowledge — not implementation, not database design. No authoring tooling, content migration, or engine integration work is authorized against this document until it has been formally reviewed and signed off.*
