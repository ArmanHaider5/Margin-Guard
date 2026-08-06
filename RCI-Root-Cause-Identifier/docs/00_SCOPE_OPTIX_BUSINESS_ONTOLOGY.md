# Scope Optix Business Ontology

## Document Control

| Field | Value |
|---|---|
| Document | Scope Optix Platform — Business Ontology |
| Version | 1.0 (Draft) |
| Status | **Foundational — governs every product built on the Scope Optix Platform. Frozen for review; pending approval. No product specification, data model, schema, or implementation may contradict this document once approved.** |
| Scope | Conceptual business ontology only. This document is not an implementation document, not a database schema, and not specific to any single product. It defines how every business concept in the Scope Optix Platform relates to every other concept, independent of which product observes or reasons about them. |
| Prepared by | Office of the Chief Architect, Scope Optix Platform |
| Related documents | This ontology sits above, and governs, every product-level document in the platform, including [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) (approved), [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) (approved), and [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md). Where a product-level document uses different terminology for the same underlying concept (see the terminology note in Chapter 3), this document is authoritative for the concept, and the product document is authoritative only for the product-specific name applied to it. |

This document defines the canonical business language of the Scope Optix Platform — the vocabulary and relationships that every product built under the Scope Optix name must speak, regardless of what that product does, what industry it serves, or what technology implements it. It is written to remain valid for at least twenty years: through every future generation of software architecture, every new product Scope Optix builds, and every change in how those products happen to be implemented. Nothing in this document is implementation. Everything in it is a claim about how business reality actually works.

---

## Chapter 1 — Purpose

### 1.1 Why this ontology exists

A platform that intends to build more than one product faces a choice, whether it makes that choice deliberately or by accident: either every product agrees, once, on what a "finding" is, what "evidence" means, what a "decision" is and how it differs from a "recommendation" — or every product invents its own answer, and those answers quietly diverge until the platform can no longer compare, combine, or reason across its own products without a translation layer nobody designed on purpose.

MGD Version 1 lived this failure inside a single product: three diagnostic engines and four knowledge libraries, each with its own idea of what a root cause is, none of them agreeing with the others ([TECH_DEBT.md](TECH_DEBT.md) §1–§2). MGD Version 2's data model ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md)) was built specifically to prevent that from happening again — inside MGD. This ontology exists to prevent the same failure from happening one level up: **across MGD, 5MCS, YieldIQ, and every product Scope Optix builds after them.** It is cheaper, by an enormous margin, to agree on the language before three products exist than to reconcile it after they do.

### 1.2 One business language, many products

Every product in the Scope Optix Platform must speak the same business language, even though no two products need to do the same thing. MGD diagnoses operational and financial root causes. 5MCS and YieldIQ, whatever their specific purposes turn out to be in detail, will still — because they operate on real businesses — encounter Organisations, Documents, Evidence, Metrics, Decisions, and Performance. A platform-wide ontology means that when 5MCS says "Decision," MGD does not need to guess whether that means the same thing its own model means by the word; it already does, because both products are instances of the same underlying business language, not independent inventions that happen to overlap.

This is not a claim that every product must use every concept in this ontology. Chapter 9 explains explicitly that different products will operate primarily at different levels of the hierarchy in Chapter 2, and that this is by design, not a compatibility gap. The requirement is not that every product uses everything — it is that when two products do use the same concept, they mean the same thing by it, without exception.

### 1.3 Why business concepts are independent of software implementation

An Organisation, a Process, a Decision, a Root Cause — none of these were invented by Scope Optix, and none of them require software to exist. A business had Departments and ran Processes long before anyone diagnosed them with a computer; a Decision is a human and organisational act, not a database write. Software — MGD, 5MCS, YieldIQ, and whatever follows them — exists to **observe, record, and reason about** these pre-existing business realities. It does not create the reality it reasons about.

This is the reason this document is written entirely in business language and contains no implementation detail: a data model, an API, a database schema — all of these are choices about *how* to build a system that observes business reality, and all of them are expected to change, more than once, over the life of the platform. The business reality itself — what a Process is, why Evidence must precede a conclusion, what a Decision is as distinct from a Recommendation — does not change on the same timescale, if it changes at all. A twenty-year document must be written at the level that does not change. This chapter, and every chapter after it, is written at that level.

---

## Chapter 2 — Business Reality

### 2.1 The hierarchy

Business reality, as the Scope Optix Platform models it, is a fifteen-level hierarchy, from the most abstract framing of what a business is, down through how it operates, down through what can be observed about it, down through what can be concluded, decided, and acted on, and finally to whether any of it actually worked.

```
Business
  ↓
Organisation
  ↓
Departments
  ↓
Processes
  ↓
Activities
  ↓
Transactions
  ↓
Documents
  ↓
Evidence
  ↓
Signals
  ↓
Knowledge
  ↓
Insights
  ↓
Decisions
  ↓
Actions
  ↓
Performance
  ↓
Improvement
```

### 2.2 Each level, and why it exists

No level in this hierarchy is decorative. Each one exists because collapsing it into its neighbor would destroy something the platform needs to be able to say precisely.

**Business.** The general concept of organized economic activity oriented toward producing value. This is the outermost frame — it exists to distinguish the domain the ontology is *about* (business, in the abstract) from the platform that reasons about it (software). Nothing at this level is diagnosable; it is the field the rest of the hierarchy operates within.

**Organisation.** A specific, identifiable business entity — a company, an agency, an institution. This level exists because "business" in the abstract cannot be diagnosed, measured, or improved; only a specific, named Organisation can be. Everything beneath this level in the hierarchy is, transitively, about exactly one Organisation.

**Departments.** Functional subdivisions of an Organisation's work. This level exists because Organisations are not monolithic — almost everything worth knowing about a business (a bottleneck, a cost, a risk) is scoped to a specific function, and attributing a conclusion correctly requires this level to exist as a distinct concept from the Organisation as a whole.

**Processes.** Repeatable sequences of work a Department carries out to accomplish its function. This level exists because a Department is an area of accountability, not a mechanism — Departments don't directly produce outcomes, the Processes they operate do. Diagnostic reasoning fundamentally targets Process-level breakdowns, not Department-level labels; without this level, "operations is underperforming" could never be sharpened into "order-to-cash is underperforming," which is the level at which a business can actually act.

**Activities.** The discrete steps that compose a Process. This level exists because a Process is still an abstraction — a named sequence — and Activities are where work is actually, concretely performed, and where inefficiency or failure concretely originates. A Process "breaks down" only in the sense that specific Activities within it are failing.

**Transactions.** The recorded, discrete events resulting from Activities being carried out. This level exists because Activities happen in time and then are gone — Transactions are the durable record that an Activity occurred, and are the first level in the hierarchy with a persistent, referenceable identity that can be examined after the fact.

**Documents.** The artifacts that carry Transactions, and other business facts, into a form that can be captured, stored, and later examined. This level exists because a Transaction, once it has occurred, needs a durable carrier for its detail to survive long enough to be analyzed — Documents are the primary bridge between business reality as it happened and anything a Scope Optix product can actually reason about.

**Evidence.** The specific, source-traceable facts extracted from within a Document. This level exists because a Document as a whole is too coarse a unit to reason over — Evidence is the atomic grain of proof, tied to an exact location within an exact Document, that every conclusion drawn above it is ultimately built from.

**Signals.** Normalized, classified abstractions built from one or more pieces of Evidence. This level exists because raw Evidence is unclassified and cannot be meaningfully compared across different sources or formats until it has been interpreted into a shared, business-relevant vocabulary — a Signal is where isolated fact becomes a recognized pattern.

**Knowledge.** The accumulated, curated understanding — rules, benchmarks, industry patterns, best practices — of what patterns of Signals and Evidence actually mean. This level exists because Signals alone cannot produce a conclusion about a specific Organisation; something must supply the interpretive lens that turns "this pattern occurred" into "this pattern means X." Knowledge is deliberately modeled as its own level, not folded into Signal or Insight, because it is the one level in this hierarchy that is *not* specific to any one Organisation — it is reusable, curated, and platform-owned (Chapter 6).

**Insights.** Conclusions drawn by applying Knowledge to a specific Organisation's Signals and Evidence. This level exists because Knowledge in the abstract — a rule, a benchmark — says nothing about any particular business until it has been applied to that business's actual data; Insight is where general knowledge becomes a specific, evidenced conclusion about this Organisation.

**Decisions.** A choice made by accountable people in response to an Insight. This level exists because an Insight, however well-evidenced, does not act on its own — a human or organisational choice must be made about whether and how to respond, and that choice is itself a distinct, recordable business fact, separable from the Insight that informed it (an Organisation can, and often does, receive an Insight and decide not to act — that non-action is itself meaningful and must be representable).

**Actions.** The concrete steps taken to execute a Decision. This level exists because a Decision is an intent, not an execution — the two must be distinguished because a Decision can be made and then only partially, or never, acted on, and the gap between intent and execution is itself business-relevant information a platform serious about explainability cannot afford to lose.

**Performance.** The measurable state of the Organisation, or a scoped part of it, resulting from — or entirely independent of — Actions taken. This level exists because the entire hierarchy above it exists in service of ultimately changing Performance; without this level, there is no way to close the loop and determine whether anything that happened above it actually mattered.

**Improvement.** The change in Performance, specifically attributed, where evidence supports it, to Actions taken in response to Decisions. This is the final level, and it exists because it is the only level that validates every level beneath it — an Improvement traceable back through Action → Decision → Insight → Knowledge → Signal → Evidence → Document → Transaction → Activity → Process → Department → Organisation is proof that the entire hierarchy functioned as intended, from raw business reality all the way back to a measurable, attributable change in that same reality.

---

## Chapter 3 — Business Objects

### 3.0 A terminology note

**Organisation**, defined below, is this ontology's name for the business entity every Scope Optix product examines. [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) names the same underlying concept **Company** — a product-facing alias chosen for MGD's own domain, not a competing definition. Wherever a product-level document uses a different name for a concept defined in this chapter, this document's definition governs the concept, and the product document's name is understood as an alias, never a divergence. The same applies to **Consultant**, **Diagnostic**, and **Report** below, each of which this ontology defines generically so that MGD, 5MCS, and YieldIQ can each apply their own product-specific name to the same underlying concept (Chapter 9).

Every object below states Purpose, Meaning, Relationships, Lifecycle, Ownership, Validation, and Examples.

### 3.1 Organisation

**Purpose.** The business entity every other object in this ontology is, directly or transitively, about.

**Meaning.** Any legally or operationally distinct business — a company, a firm, an agency, a nonprofit, an institution — capable of being examined, diagnosed, or measured as a whole.

**Relationships.** Owns Department(s), Business Unit(s), and Location(s); owns Document(s); is the subject of Diagnostic(s) and Report(s).

**Lifecycle.** Established → Active → Dormant/Divested → Archived. History is retained regardless of current operating status.

**Ownership.** An Organisation is owned by no other object — it is the ontology's root. Every product references it by stable identity rather than owning a private copy.

**Validation.** Must be uniquely identifiable across the platform. Must exist before any Department, Process, or Diagnostic can be attributed to it.

**Examples.** A manufacturing SME; a hospital group; a logistics operator; a government agency being evaluated for programme impact.

### 3.2 Department

**Purpose.** Represents a functional subdivision of an Organisation's work.

**Meaning.** A named area of accountability within an Organisation — Finance, Operations, Sales, Human Resources, Quality, Maintenance — through which Processes are organized and Performance can be attributed.

**Relationships.** Belongs to exactly one Organisation or Business Unit; performs one or more Processes; may itself decompose into sub-departments.

**Lifecycle.** Formed → Active → Restructured/Merged → Dissolved. Restructuring is recorded, never overwritten, so historical Performance remains attributable to the Department as it existed at the time.

**Ownership.** Owned by the Organisation or Business Unit it belongs to.

**Validation.** Must belong to exactly one owning Organisation or Business Unit at any point in time.

**Examples.** Finance; Maintenance; Warehouse Operations; Quality Assurance.

### 3.3 Business Unit

**Purpose.** Represents a semi-autonomous operating segment of an Organisation, broader than a Department, often with its own strategic or financial identity.

**Meaning.** A grouping used when an Organisation is too large or diversified for Department alone to meaningfully scope Processes and Performance — separate product lines, regional divisions, or subsidiaries operating under one Organisation.

**Relationships.** Belongs to exactly one Organisation; owns one or more Departments and Locations; may itself be the subject of its own Diagnostic, scoped narrower than the whole Organisation.

**Lifecycle.** Established → Active → Divested/Merged → Archived.

**Ownership.** Owned by the Organisation.

**Validation.** Must belong to exactly one Organisation. Not every Organisation requires this level — small Organisations may go directly to Department.

**Examples.** A manufacturing group's separate regional plants; a conglomerate's distinct operating divisions.

### 3.4 Location

**Purpose.** Represents the physical or operational site at which Processes and Activities are carried out.

**Meaning.** A named place — a factory, a branch, a warehouse, a site — that scopes *where* business reality is happening, distinct from the functional/organisational scoping Department and Business Unit provide.

**Relationships.** Belongs to an Organisation or Business Unit; hosts the Activities of one or more Departments; Transactions and Documents may be attributed to a Location.

**Lifecycle.** Opened → Active → Closed/Divested → Archived.

**Ownership.** Owned by the Organisation or Business Unit.

**Validation.** Must belong to exactly one owning Organisation or Business Unit.

**Examples.** A specific factory floor; a regional distribution warehouse; a branch office.

### 3.5 Process

**Purpose.** Represents a repeatable, named sequence of work a Department carries out to accomplish its function.

**Meaning.** The level at which business reality becomes structured and repeatable rather than a one-off occurrence — order-to-cash, procure-to-pay, hire-to-retire, plan-produce-deliver.

**Relationships.** Belongs to one or more Departments; is composed of one or more Activities; is the primary unit Root Cause analysis ultimately attributes operational breakdowns to.

**Lifecycle.** Designed → Active → Revised (versioned) → Retired.

**Ownership.** Owned by the Department(s) that perform it.

**Validation.** Must decompose into at least one Activity to be meaningfully analyzable.

**Examples.** Procure-to-pay; production scheduling; customer order fulfillment; preventive maintenance scheduling.

### 3.6 Activity

**Purpose.** Represents a discrete step within a Process — the level at which work is actually performed.

**Meaning.** The atomic unit of "doing" inside a Process — issuing a purchase order, inspecting incoming goods, reconciling an invoice — where inefficiency, delay, or failure concretely occurs.

**Relationships.** Belongs to exactly one Process; produces or is evidenced by one or more Transactions.

**Lifecycle.** Performed (occurs in time; not itself a long-lived record) → recorded via its resulting Transaction(s).

**Ownership.** Owned by the Process it belongs to, and by extension the performing Department.

**Validation.** Must belong to exactly one Process.

**Examples.** Issuing a purchase order; performing a machine inspection; approving an invoice.

### 3.7 Transaction

**Purpose.** Represents the recorded, discrete event resulting from an Activity — the first level in the hierarchy with a persistent, referenceable identity.

**Meaning.** A sale, a payment, a shipment, a work order, a maintenance log entry — the durable record that an Activity occurred, at a specific time, with specific parties and values.

**Relationships.** Results from exactly one Activity (or is otherwise attributable to one); is carried into one or more Documents; may be examined directly as a source of Evidence.

**Lifecycle.** Recorded → Immutable. A correction to a recorded Transaction is a new, linked Transaction, never an edit — consistent with standard accounting and audit practice.

**Ownership.** Owned by the Organisation, attributed to the Department/Process/Activity that produced it.

**Validation.** Must be attributable to an owning Organisation and, where known, to the Activity/Process that produced it.

**Examples.** An invoice being issued; a payment being received; a unit being shipped; a machine downtime event being logged.

### 3.8 Document

**Purpose.** Represents the artifact that carries Transactions and other business facts into a form that can be captured, stored, and later examined.

**Meaning.** An invoice, a financial statement, a report, a log, a spreadsheet — the primary bridge between business reality and anything a Scope Optix product can analyze.

**Relationships.** Belongs to an Organisation; may record one or more Transactions; is the source of Evidence.

**Lifecycle.** Received/Uploaded → Processed → Archived. Reprocessing produces a new processed version; the original is retained.

**Ownership.** Owned by the Organisation.

**Validation.** Must belong to exactly one Organisation.

**Examples.** A profit & loss statement; a maintenance log; a sales report; a bank statement.

### 3.9 Evidence

**Purpose.** Represents a specific, source-traceable fact extracted from within a Document — the atomic grain of proof everything above it in the reasoning chain is built from.

**Meaning.** One identifiable fact at one identifiable location in one Document — a figure on a statement line, a phrase in a report row — asserted with full provenance, without interpretation.

**Relationships.** Traces to exactly one Document; is the basis for one or more Signals; may be cited directly by an Insight.

**Lifecycle.** Generated during analysis → Retained permanently, immutable.

**Ownership.** Owned by whichever product's analytical process extracted it, scoped to the Diagnostic that produced it.

**Validation.** Must resolve to a specific Document and location within it.

**Examples.** "Q1 gross margin per the P&L is 18%"; "the maintenance log records 14 unplanned stoppages in March."

### 3.10 Signal

**Purpose.** Represents a normalized, classified abstraction built from one or more pieces of Evidence.

**Meaning.** The point at which raw fact becomes a typed, business-meaningful observation — a declining margin trend, recurring machine downtime, elevated staff turnover — classified against a shared vocabulary.

**Relationships.** References one or more Evidence records; contributes to one or more Insights.

**Lifecycle.** Generated during analysis → Retained permanently, immutable.

**Ownership.** Owned by the analytical process that classified it.

**Validation.** Must reference at least one Evidence record.

**Examples.** A margin-decline signal; a maintenance-backlog signal; a collections-delay signal.

### 3.11 Metric

**Purpose.** Represents any single measured or computed value derived from an Organisation's data.

**Meaning.** The general category of quantification. KPI, Financial Ratio, and Operational Ratio (below) are all specialized Metrics carrying additional Knowledge linkage.

**Relationships.** Traces to the Evidence/Transaction(s)/Document(s) it was computed from; may be compared against a Benchmark.

**Lifecycle.** Computed → Retained permanently, immutable. A later recomputation produces a new Metric instance, not an edit.

**Ownership.** Owned by the analytical process that computed it.

**Validation.** Must state its computation basis and source.

**Examples.** Revenue; on-time delivery rate; days sales outstanding.

### 3.12 KPI

**Purpose.** Represents a Metric elevated to tracked, benchmarked significance by Knowledge.

**Meaning.** Not every Metric matters equally — a KPI is one Knowledge has designated significant enough to track and compare against a target for a given industry or Process.

**Relationships.** Specializes Metric; references a Knowledge-defined KPI definition and, typically, a Benchmark.

**Lifecycle, Ownership, Validation.** As Metric, plus: must reference a valid, current KPI definition.

**Examples.** Overall Equipment Effectiveness (OEE); on-time-in-full delivery rate.

### 3.13 Financial Ratio

**Purpose.** Represents a specialized Metric computed strictly from financial statement data.

**Meaning.** A ratio — current ratio, gross margin, days payable outstanding — computed via a Knowledge Rule from canonical financial statement facts, never from operational data directly.

**Relationships.** Specializes Metric; traces specifically to financial-statement Evidence/Documents.

**Lifecycle, Ownership, Validation.** As Metric, plus: must trace to financial statement source data specifically.

**Examples.** Current ratio; gross margin; days sales outstanding.

### 3.14 Operational Ratio

**Purpose.** Represents a specialized Metric computed from operational (non-financial) data.

**Meaning.** The operational analog of Financial Ratio — scrap rate, staff turnover rate, maintenance backlog ratio — computed via a Knowledge Rule from operational Evidence.

**Relationships, Lifecycle, Ownership, Validation.** As Metric, tracing to operational source data specifically.

**Examples.** Scrap rate; staff turnover rate; maintenance backlog ratio.

### 3.15 Knowledge Rule

**Purpose.** Represents platform-authored logic-as-data used to detect, compute, or trigger Evidence-, Signal-, Metric-, or Insight-level facts.

**Meaning.** Never expressed as software source code — a data record describing a detection or computation condition, authored and versioned like any other knowledge content. The general parent term for more specific rule types (evidence rules, financial rules, operational rules, risk rules — see [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 6 for MGD's product-level instantiation).

**Relationships.** Referenced at run time by whichever product's analytical process needs it; associated with industry/domain scoping.

**Lifecycle.** Draft → Published → Deprecated → Archived.

**Ownership.** Owned by the platform's knowledge-curation function — domain experts and administrators — never by a single product's engineering team.

**Validation.** Must be expressed as data, never hardcoded logic, under any circumstance.

**Examples.** "Three or more overtime mentions within a 90-day window constitutes a medium-strength Manpower signal."

### 3.16 Finding

**Purpose.** States what is observably happening in the business.

**Meaning.** A discrete, evidenced statement of an observed condition, prior to causal interpretation.

**Relationships.** References one or more Signal/Evidence records; supports one or more Root Causes; is an Insight subtype (Chapter 3, [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 3).

**Lifecycle.** Generated → Retained, versioned.

**Ownership.** Owned by the analytical process that generated it, scoped to a Diagnostic.

**Validation.** Must reference at least one Signal or Evidence record — an evidence-less Finding is not a valid object under this ontology.

**Examples.** "Collections cycle has lengthened over two consecutive quarters."

### 3.17 Root Cause

**Purpose.** States why the Findings are occurring.

**Meaning.** A diagnosed causal explanation, classified by contribution strength (e.g. primary, secondary, contributing), matched against Knowledge using an Organisation's Findings as input.

**Relationships.** References one or more Findings; references a Knowledge-defined library entry; generates one or more Recommendations and Opportunities; may causally relate to other Root Causes.

**Lifecycle.** Generated → Retained, versioned.

**Ownership.** Owned by the analytical process that produced it.

**Validation.** Must reference at least one Finding.

**Examples.** "Reactive maintenance culture"; "collections process breakdown."

### 3.18 Recommendation

**Purpose.** States what the Organisation should do in response to a Root Cause.

**Meaning.** Prioritized, actionable guidance, sequenced where dependency exists, always traceable to the Root Cause(s) justifying it.

**Relationships.** References one or more Root Causes; is an Insight subtype; may become a Decision.

**Lifecycle.** Generated → Retained, versioned.

**Ownership.** Owned by the analytical process that produced it.

**Validation.** Must reference at least one Root Cause — a cause-less Recommendation is not a valid object under this ontology.

**Examples.** "Implement a preventive maintenance schedule"; "tighten receivables collection cadence."

### 3.19 Opportunity

**Purpose.** Quantifies the value of acting on a Recommendation.

**Meaning.** An estimated value range — cost reduction, margin recovery, revenue protection, working-capital improvement — with a stated, declared basis.

**Relationships.** References one or more Root Causes/Recommendations; references Metric/Financial Ratio/Operational Ratio and Benchmark instances that ground its estimate.

**Lifecycle.** Generated → Retained, versioned.

**Ownership.** Owned by the analytical process.

**Validation.** Must declare its estimation basis (statement-derived vs. benchmark-derived, or the product-specific equivalent).

**Examples.** "Estimated annual recovery of 120,000–350,000 from reduced downtime."

### 3.20 Risk

**Purpose.** Represents a potential future adverse event or exposure identified from Insight, Knowledge, or Performance patterns.

**Meaning.** Distinct from Root Cause, which explains a present condition — Risk characterizes exposure to a *future* condition (going-concern risk, compliance risk, operational risk), classified via Knowledge Rules.

**Relationships.** May be derived from one or more Root Cause, Finding, or Performance trend; referenced by Narrative and Decision; is an Insight subtype.

**Lifecycle.** Identified → Retained, versioned; re-assessed as new Diagnostics for the same Organisation occur.

**Ownership.** Owned by the analytical process; underlying rule definitions owned by Knowledge.

**Validation.** Must reference the Insight(s) or Performance pattern(s) it is derived from — a Risk asserted with no underlying basis is not a valid object under this ontology.

**Examples.** "Elevated going-concern risk given a deteriorating liquidity trend"; "compliance risk from a lapsed safety inspection cadence."

### 3.21 Benchmark

**Purpose.** Defines the expected or target value for a Metric, scoped by industry or a comparable population.

**Meaning.** A Knowledge-owned reference point — e.g. "on-time delivery target: 95%, manufacturing" — that Performance and Metrics are compared against to determine severity.

**Relationships.** Belongs to Knowledge; scoped to industry/domain; referenced by Metric/KPI/Ratio comparisons and by Insight severity classification.

**Lifecycle.** Draft → Published → Deprecated → Archived, versioned with an effective date.

**Ownership.** Owned by Knowledge curation.

**Validation.** Must specify the Metric type and scope it applies to.

**Examples.** Industry-average inventory turnover; target on-time-in-full rate.

### 3.22 Insight

**Purpose.** The parent abstraction for every conclusion type this ontology defines — Finding, Root Cause, Recommendation, Opportunity, Risk, and any future conclusion type a product introduces.

**Meaning.** The common shape and common rules — evidence linkage, confidence, versioning, audit — shared across every conclusion type, so that no product independently reinvents what "a conclusion" means, and so that a conclusion produced by one product is structurally recognizable and traceable by another.

**Relationships.** Abstract parent; every conclusion object listed above is a specialization of it.

**Lifecycle, Ownership, Validation.** Defined once, at this level, and inherited by every subtype without exception — no subtype may relax evidence-linkage, confidence, or versioning requirements.

**Examples.** Not directly instantiated — see Finding, Root Cause, Recommendation, Opportunity, and Risk for concrete examples.

### 3.23 Narrative

**Purpose.** The composed, natural-language explanation of a set of Insights.

**Meaning.** Prose generated strictly from already-computed Insight content — the only object a product's AI explanation layer owns, and only in composition, never in invention (Chapter 8).

**Relationships.** References the Insight(s) it explains; is included in a Report.

**Lifecycle.** Generated → Regenerated (versioned) → Locked at finalization.

**Ownership.** Owned by the product's explanation layer (MGD names this the AI Consultant; other products may name their own equivalent while remaining the same ontological object).

**Validation.** Every claim within it must cite a specific Insight or Evidence reference.

**Examples.** An executive summary explaining a diagnosed margin decline and its recommended remedy.

### 3.24 Decision

**Purpose.** Represents a choice made by accountable people in response to an Insight.

**Meaning.** The point at which an Organisation, informed by an Insight, commits — or explicitly declines to commit — to a course of action. A distinct, recordable business fact, separate from the Insight that informed it.

**Relationships.** Typically references one or more Recommendations/Insights it responds to; belongs to the Organisation; precedes zero or more Actions.

**Lifecycle.** Made → Retained permanently, immutable. A changed course of action is a new Decision, never an edit to the prior one.

**Ownership.** Owned by the accountable person or role within the Organisation, or by the Consultant acting explicitly on their behalf — never owned by the system itself, since a Decision is inherently a human and organisational act.

**Validation.** Should reference the Insight(s)/Recommendation(s) it responds to where one exists; an Organisation may also record Decisions made independent of any Scope Optix Insight.

**Examples.** "Approved: implement a preventive maintenance program within Q3."

### 3.25 Action

**Purpose.** Represents the concrete step(s) taken to execute a Decision.

**Meaning.** The execution layer, deliberately distinguished from Decision — a Decision can be made without being fully acted on, and that gap is itself business-relevant information a serious platform cannot afford to lose.

**Relationships.** References the Decision it executes; produces or influences subsequent Transactions and, ultimately, Performance.

**Lifecycle.** Planned → In Progress → Completed/Abandoned. Status changes are recorded, never overwritten.

**Ownership.** Owned by whoever within the Organisation is accountable for execution.

**Validation.** Should reference the Decision it executes.

**Examples.** "Preventive maintenance schedule implemented on Line 3, effective April."

### 3.26 Outcome

**Purpose.** Represents the observed result of an Action, prior to being interpreted as a Performance change.

**Meaning.** A recorded, factual consequence directly attributable to an Action — the missing link between "we did something" and "did it work," distinct from the broader, aggregated Performance measure it feeds into.

**Relationships.** References the Action it resulted from; feeds into Performance measurement.

**Lifecycle.** Observed → Retained, versioned as further data accumulates.

**Ownership.** Owned by the analytical process that observed and recorded it, or reported directly by the Organisation.

**Validation.** Should reference the Action it is attributed to, where attribution is possible.

**Examples.** "Unplanned downtime reduced from 22h/week to 9h/week following the maintenance program's implementation."

### 3.27 Performance

**Purpose.** Represents the measurable state of the Organisation, or a scoped part of it, at a point in time.

**Meaning.** The aggregated, ongoing measure of how well the business, or a scoped part of it, is operating — built from Metric/KPI/Ratio history over time, independent of whether a specific Action caused the current state.

**Relationships.** Computed from Metric/KPI/Ratio history; compared against Benchmark; the basis Improvement (below) is measured against.

**Lifecycle.** Continuously measured, snapshotted per Diagnostic or reporting period; historical snapshots retained permanently, never overwritten.

**Ownership.** Owned by the analytical process measuring it.

**Validation.** Must be time-scoped — a Performance statement with no time reference is incomplete under this ontology.

**Examples.** "Q2 on-time delivery: 82%, up from 71% in Q1."

### 3.28 Improvement

**Purpose.** Represents the change in Performance specifically attributed, where evidence supports it, to Action(s) taken in response to Decision(s).

**Meaning.** The closing-the-loop object. Improvement validates the entire ontology by tracing a measurable Performance change back through Action → Decision → Insight → Knowledge → Signal → Evidence → Document → Transaction → Activity → Process → Department → Organisation.

**Relationships.** Compares two or more Performance snapshots over time; references the Action(s)/Decision(s) plausibly responsible.

**Lifecycle.** Assessed once sufficient subsequent Performance data exists; retained, and re-versioned as more data accumulates or attribution confidence changes.

**Ownership.** Owned by the analytical process assessing it.

**Validation.** Must reference at least two Performance snapshots and, where attribution is claimed, the Action(s) held responsible, with attribution confidence stated explicitly rather than asserted as certain (see also Regression, Chapter 7).

**Examples.** "Downtime-related cost reduced by an estimated 180,000 annually following the Q3 maintenance program."

### 3.29 Maturity

**Purpose.** Represents an Organisation's, or a scoped part of it's, accumulated operational and financial sophistication over time, derived from its history of Performance and Improvement.

**Meaning.** A longer-horizon characterization — is this Organisation reactive or proactive in how it manages a given Process or Department, and how has that changed — distinct from any single Performance snapshot.

**Relationships.** Derived from the full history of an Organisation's Performance and Improvement records across multiple Diagnostics.

**Lifecycle.** Re-assessed as new Diagnostics and Performance data accumulate; historical Maturity assessments retained.

**Ownership.** Owned by the analytical process, typically as a longitudinal aggregate (see [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 8, "Consultant Memory," for MGD's product-level instantiation of this concept).

**Validation.** Must be derivable from a documented history of Performance/Improvement data, never asserted without it.

**Examples.** "Maintenance function has progressed from reactive to planned-preventive over three engagements."

### 3.30 Consultant

**Purpose.** Represents the accountable human professional operating a Scope Optix product's analytical process on behalf of, or in service to, an Organisation.

**Meaning.** The human-in-the-loop role — reviews, annotates, and is accountable for what a product ultimately delivers. This ontology's generic term, of which MGD's "Consultant" role is one product-specific instantiation; other products may name their own analogous role (advisor, analyst) while remaining the same ontological concept.

**Relationships.** Operates Diagnostics on behalf of an Organisation; authors product-specific human-observation records (see [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.16, "Consultant Observation"); may be accountable for Decisions made on the Organisation's behalf where explicitly authorized.

**Lifecycle.** Assigned to an engagement → Active → Reassigned/Completed.

**Ownership.** Owned by the platform's user and role administration function.

**Validation.** Must be uniquely identifiable and scoped to the Organisation(s) they are authorized to work with.

**Examples.** A Margin Guard consultant running an MGD engagement; an analyst operating a future product on a client's behalf.

### 3.31 Diagnostic

**Purpose.** Represents a bounded analytical engagement in which an Organisation's business reality is examined to produce Insights.

**Meaning.** This ontology's generic term for "a complete, scoped run of a product's analytical process." MGD's Diagnostic is one instantiation; a future YieldIQ yield assessment or 5MCS engagement is another — each sharing the same ontological shape (bounded, evidence-driven, produces Insights, versioned, never overwritten) without being required to share implementation.

**Relationships.** Belongs to exactly one Organisation; references the Document(s)/Transaction(s) selected for it; owns the Evidence, Signal, and Insight instances produced within it; produces a Narrative and a Report.

**Lifecycle.** Initiated → Processing → Draft → Finalized (a permanent historical record).

**Ownership.** Owned by the Consultant who initiates and operates it, scoped to the Organisation.

**Validation.** Must be bound to exactly one Organisation before processing begins.

**Examples.** An MGD operational/financial diagnostic engagement; a future YieldIQ margin assessment.

### 3.32 Report

**Purpose.** The single canonical, versioned deliverable assembled from a Diagnostic's Insights and Narrative.

**Meaning.** Pure assembly, no independent computation — every delivered format (document, presentation, dashboard) renders from this one object, guaranteeing consistency across every audience it reaches.

**Relationships.** Belongs to exactly one Diagnostic; references the full Insight set, Confidence, and Narrative.

**Lifecycle.** Draft → Finalized (immutable, permanently retained).

**Ownership.** Owned by the Consultant (composition/review) and the product's report-composition function.

**Validation.** Must not be finalized while any referenced Insight lacks a valid evidence chain (Chapter 5).

**Examples.** An MGD Executive Report; a future 5MCS or YieldIQ deliverable following the same composition pattern.

---

## Chapter 4 — Relationship Model

### 4.1 The master chain

```
Organisation
  │  owns
  ▼
Departments
  │  perform
  ▼
Processes
  │  generate
  ▼
Activities
  │  create
  ▼
Transactions
  │  produce
  ▼
Documents
  │  contain
  ▼
Evidence
  │  generates
  ▼
Signals
  │  support
  ▼
Insights ──────┬─── explain ──▶ Risks
               └─── identify ──▶ Root Causes
                                    │  generate
                                    ▼
                              Recommendations
                                    │  become
                                    ▼
                               Decisions
                                    │  create
                                    ▼
                                Actions
                                    │  change
                                    ▼
                              Performance
                                    │  drives
                                    ▼
                              Improvement
                                    │  changes
                                    ▼
                            Business Maturity
```

### 4.2 Cardinality and dependency, link by link

- **Organisation owns Departments (1 : many).** A Department cannot exist without an owning Organisation; ownership is direct and permanent for the Department's lifetime.
- **Departments perform Processes (many : many).** A Department typically performs several Processes, and — less commonly but validly — a cross-functional Process may span more than one Department. A Process's *primary* accountable Department is always identifiable even when execution is cross-functional.
- **Processes generate Activities (1 : many).** Every Activity belongs to exactly one Process; a Process is meaningless as an analytical unit without at least one Activity.
- **Activities create Transactions (1 : many).** An Activity may produce zero, one, or many Transactions depending on its nature (an inspection might produce one log entry; a batch process might produce many).
- **Transactions produce Documents (many : many).** A single Document (e.g. a monthly statement) commonly aggregates many Transactions; a single Transaction may also be represented across more than one Document (a shipment recorded in both a dispatch log and an invoice). This many-to-many relationship is why Evidence, not Document or Transaction alone, is the atomic unit the reasoning chain (Chapter 5) is built on — Documents and Transactions can disagree or duplicate; individual Evidence records are where reconciliation happens.
- **Documents contain Evidence (1 : many).** Every Evidence record traces to exactly one Document and a specific location within it.
- **Evidence generates Signals (many : many).** A Signal requires at least one Evidence record and commonly synthesizes several; a single Evidence record may contribute to more than one Signal.
- **Signals support Insights (many : many).** Every Insight (of any subtype) requires at least one Signal or piece of Evidence; a Signal may support more than one Insight.
- **Insights explain Risks, and Insights identify Root Causes (both many : many, but distinct relationships).** These are two different edges out of Insight, not a single path — a Risk (a future exposure) and a Root Cause (a present explanation) are both drawn from the same Insight-level reasoning but answer different questions, and either may exist without the other for a given set of Insights.
- **Root Causes generate Recommendations (1 : many, typically).** A Root Cause commonly produces more than one candidate Recommendation; every Recommendation traces to at least one Root Cause, never zero.
- **Recommendations become Decisions (many : 0 or 1).** Not every Recommendation becomes a Decision — an Organisation may receive a Recommendation and decline to act on it, which is itself meaningful and retained (Chapter 3.24). Where a Decision is made, it typically references one or more Recommendations, though an Organisation may also make Decisions independent of any Scope Optix Recommendation.
- **Decisions create Actions (1 : many, or zero).** A Decision may produce several Actions over time as it is executed in stages, or, if never executed, zero — and that gap is itself recorded, not hidden.
- **Actions change Performance (many : many, via Outcome).** Actions do not change Performance directly and instantaneously — they produce Outcomes (Chapter 3.26), which are the observed, attributable results that feed into the ongoing Performance measure. This intermediate step exists precisely so attribution can be handled honestly rather than assumed.
- **Performance drives Improvement (many : 1, comparative).** Improvement is always a comparison between two or more Performance snapshots over time, never a property of a single snapshot in isolation.
- **Improvement changes Business Maturity (many : 1, longitudinal).** Maturity is derived from the accumulated pattern of Improvement (and Regression, Chapter 7) across an Organisation's full Diagnostic history, not from any single Improvement event.

### 4.3 Ownership vs. reference

As in [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §4.4, every relationship above is either an **ownership dependency** (the referenced object cannot outlive its owner — a Department cannot exist without its Organisation) or a **reference relationship** (the referenced object is independent, pointed to by many owners — a Root Cause instance references, but does not own, its Knowledge-defined library entry). This distinction holds at the ontology level exactly as it holds at MGD's product level, and every relationship in this chapter is unambiguously one or the other.

### 4.4 Traceability

Because every link in §4.2 is mandatory in its stated direction — no Insight without a Signal, no Recommendation without a Root Cause, no Decision-response without the Recommendation it responds to (where one exists) — the entire chain from Organisation down to Improvement is traceable end to end for any given Insight. This is the relationship model's concrete contribution to Chapter 8's explainability requirement: traceability is a property of how the objects relate to each other, not a feature added at the reporting layer afterward.

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

This is the same mandatory chain defined at MGD's product level in [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 5, restated here as a platform-wide rule that governs every Scope Optix product, not MGD specifically. **No object in this chain may be produced by skipping a link**, in any product built on this ontology.

### 5.2 The rules, stated individually

- **No conclusion exists without evidence.** Every Insight, of any subtype, must trace back to Evidence — directly or through the chain above. A conclusion with no evidentiary basis is not a lower-quality object under this ontology; it is not a valid object at all.
- **No recommendation exists without a root cause.** A Recommendation is a response to a diagnosed cause. Generic advice with no diagnosed cause behind it is not a Recommendation under this ontology, regardless of how reasonable it may sound.
- **No root cause exists without findings.** A Root Cause is an explanation for observed conditions. Without at least one Finding to explain, there is nothing for a Root Cause to be a cause *of*.
- **No findings exist without signals.** A Finding states what is observably happening; it must be built from classified Signals (or Evidence directly), never asserted independent of them.
- **No signals exist without evidence.** A Signal is a classification built from Evidence; a Signal with no underlying Evidence is an unfounded classification, not a valid Signal.

### 5.3 Explainability and auditability as consequences of the chain

- **Every recommendation must be explainable.** Because the chain above is mandatory and unbroken, tracing "why does this Recommendation exist" back through its Root Cause, Findings, Signals, and ultimately its Evidence is always possible, for every Recommendation, in every product, without exception.
- **Every report must be auditable.** Because a Report (Chapter 3.32) is composed entirely from Insights that satisfy this chain, and because every object in the chain is versioned and permanently retained (Chapter 7), any Report produced by any Scope Optix product can be reconstructed and verified after the fact — not merely trusted on delivery.

### 5.4 Why this is a platform rule, not a product rule

MGD's data model enforces this chain for MGD's own engines. This chapter exists to make explicit that the rule is not MGD's invention or MGD's private discipline — it is a property this ontology requires of *any* product built on the Scope Optix Platform, including 5MCS, YieldIQ, and anything that follows them. A future product that produced a conclusion without a traceable evidentiary basis would not be a variant implementation of this ontology — it would be a violation of it, in the same sense that a Report with no Evidence chain is not a lower-quality Report but an invalid one.

---

## Chapter 6 — Knowledge

### 6.1 Purpose of this chapter

Chapter 2 named Knowledge as one level in the business-reality hierarchy. This chapter defines the ontology *of* knowledge itself — the different kinds of "knowing" the platform must distinguish, because treating them as interchangeable is exactly how confidence gets miscalibrated and trust gets misplaced.

### 6.2 The categories, and how they differ

**Fact.** An objectively true, verifiable statement about reality, independent of whether any Scope Optix product has recorded it. Not every Fact that exists in the world is captured by the platform — a Fact only enters the platform's reasoning once it has been captured as Evidence.

**Evidence.** A Fact captured with source-traceable provenance within a specific product's Diagnostic (Chapter 3.9). Every Evidence record is a Fact (or a claim a source document asserts as fact); not every Fact known to exist in the world is Evidence, until it has been captured this way.

**Assumption.** A statement treated as true for the purpose of analysis, but not independently verified. An Assumption differs from Evidence precisely because it lacks source traceability, and it must always be labeled as an Assumption — it may never be silently promoted to Evidence or Fact status anywhere in the platform.

**Observation.** A human-recorded perception of business reality — a consultant's field note, a client's verbal statement captured in writing. An Observation differs from Evidence in that it is not drawn from a Document but from direct human perception; it may later be corroborated into genuine Evidence if a supporting Document is found, but it stands alone, clearly attributed, until then (this is the ontology-level generalization of [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md)'s "Consultant Observation").

**Signal.** A classified abstraction built from Evidence (Chapter 3.10) — deliberately built from Evidence specifically, not from raw Fact, Assumption, or Observation directly, preserving the evidence-first discipline established in Chapter 5. Assumptions and Observations may inform a human's interpretation of a Signal, but they do not themselves generate one.

**Business Rule.** A codified, generally applicable statement of how a class of Organisations, Processes, or financial mechanics behave, or should be evaluated. Knowledge Rule (Chapter 3.15) is the platform's implementation form of a Business Rule.

**Industry Knowledge.** Business Rules and reference data scoped to a specific industry or vertical — the vocabulary, root causes, and mappings specific to how a given industry actually operates. This is the ontology-level term for what MGD's product-level documents call an Industry Pack.

**Benchmark.** A specific numeric or qualitative target, typically derived from aggregated Industry Knowledge (Chapter 3.21).

**Best Practice.** Reference content describing exemplary — not merely average — performance for a given dimension. Best Practice differs from Benchmark specifically in this way: a Benchmark is usually a statistical or typical target to compare against; a Best Practice is a description of excellence to aim for, which may sit well above the Benchmark.

### 6.3 A rigor ordering

Not every category above may serve as the basis for a conclusion. Fact and Evidence are the only categories that may ground an Insight, via the mandatory chain in Chapter 5. Assumption and Observation may inform human judgment and may be recorded alongside a Diagnostic, but per the AI Context Model (Chapter 8, and [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §9.4), they are never treated as equivalent to Evidence, and never permitted to silently substitute for it in the mandatory chain. Business Rule, Industry Knowledge, Benchmark, and Best Practice are curated, reusable Knowledge — they supply the interpretive lens applied *to* Evidence and Signals; they are never, themselves, evidence of any specific Organisation's condition.

---

## Chapter 7 — Time

### 7.1 Temporal concepts

Every business fact the platform holds exists at a point, or a span, in time, and the platform must be able to say precisely which. This chapter defines the ten temporal concepts every Scope Optix product must use consistently.

**Historical.** A fact or record from a past, closed period. Permanently retained, never edited.

**Current.** The most recent known state of a fact. Current is not a permanent label — a Current record becomes Historical the moment a newer record supersedes it, and it is *superseded*, never overwritten (Chapter 1's immutability principle, restated at the ontology level).

**Predicted.** A forward-looking estimate. Always explicitly distinguished from Current or Historical fact, and always labeled with its basis and confidence — a Predicted value is never presented as though it were an observed one.

**Planned.** A stated future intention — a Planned Action or Decision. Distinct from Predicted (intent, not forecast) and from Completed (intent may not be realized).

**Completed.** A Planned item that has been executed and observed — the point at which an Action's status moves to Outcome (Chapter 3.26).

**Trend.** A directional pattern observed across multiple Historical or Current data points over time. Requires at least two comparable, time-scoped Performance or Metric snapshots to exist; a Trend asserted from a single data point is not a valid Trend under this ontology.

**Version.** The specific, dated state of any object at a point in time — the mechanism by which History is preserved without ever being overwritten. Every versioned object in this ontology (Chapter 1) exists as a sequence of Versions, not a single mutable record.

**Baseline.** A specifically designated reference Version of Performance (or another measured object) against which later comparisons are made. A Baseline is established explicitly, by deliberate act — it is never implicitly assumed to be "whatever the first record happened to be."

**Improvement** *(as a temporal comparison outcome, distinct from but related to the Chapter 3.28 object)*. Performance at a later time exceeding Performance at Baseline, in the desired direction.

**Regression.** The opposite temporal comparison outcome — Performance at a later time worse than Performance at Baseline. Regression must be surfaced with exactly the same rigor as Improvement, and must never be suppressed, softened, or minimized in how it is reported. A platform whose reporting mechanism is more willing to show Improvement than Regression is not credible to the audiences this platform is built to serve — a lender or investor relying on Scope Optix output must be able to trust that a worsening trend will be shown exactly as plainly as a positive one.

### 7.2 The governing rule

**Everything in Scope Optix must preserve history. Nothing should overwrite history.** Every temporal concept above exists to make this operational rather than aspirational: Version is the mechanism, Baseline and Trend are how comparison is made honest and explicit, and Current/Historical is how the platform distinguishes "what we believe right now" from "what we recorded and will never alter" — permanently, across every product built on this ontology.

---

## Chapter 8 — Explainability

### 8.1 The standard

Every business decision this platform influences must be explainable — not in the general sense that MGD (or 5MCS, or YieldIQ) has a documented methodology, but in the specific sense that any single conclusion, in any single Report, can be traced, on demand, to the exact facts that produced it.

### 8.2 The five rules

- **Every business decision must be explainable.** Not merely the Insight that informed a Decision (Chapter 3.24) — the Decision itself, once made, must be recorded with the Insight(s) it responded to, so that an Organisation's own choices remain auditable alongside the platform's conclusions.
- **Every AI explanation must reference deterministic evidence.** An AI-generated Narrative (Chapter 3.23) is a composition, never a source — every claim it makes must resolve to an Insight, Signal, or Evidence record produced by deterministic reasoning, in every product, without exception.
- **Every recommendation must trace back to evidence.** Restated from Chapter 5 because it is the single most consequential instance of the explainability standard — a Recommendation is the object most likely to directly influence money, and it is held to the strictest traceability requirement in the ontology as a result.
- **Every KPI must identify its source.** A KPI (Chapter 3.12) that cannot state which Evidence, Transaction, or Document it was computed from is not a valid KPI under this ontology — a number with no stated origin is not a Metric, it is an assertion.
- **Every benchmark must identify its origin.** A Benchmark (Chapter 3.21) must state what population, industry, or dataset it was derived from and when — a target with no stated basis cannot be trusted to mean what it claims to mean, and undermines every severity classification computed against it.

### 8.3 Why this chapter exists at the ontology level

Explainability could have been left as a property each product's own specification defines for itself. It is elevated to this document deliberately, because explainability is not a feature any one product chooses to build — it is what makes the platform's output trustworthy to the audiences (Chapter 1, and per [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) Chapter 2) who were never going to take Scope Optix's word for it: lenders, investors, regulators, and the business owners whose decisions carry real financial and operational consequences. A platform that could not answer "why does it say this" would not be a platform any of those audiences could safely rely on, regardless of which product they happened to be using.

---

## Chapter 9 — Platform

### 9.1 One ontology, several products

This ontology becomes the shared language of MGD, 5MCS, and YieldIQ not by requiring each product to use every concept in Chapter 3, but by guaranteeing that wherever two products *do* use the same concept, they mean exactly the same thing by it — the same evidence-linkage rules, the same versioning discipline, the same explainability standard. Each product is expected to operate primarily at a different band of the Chapter 2 hierarchy, reflecting what that product actually does, while remaining fully compatible with the others because the underlying business language never diverges.

### 9.2 How each product is expected to use the ontology

The descriptions below reflect each product's likely operating band based on its name and positioning within Scope Optix as currently understood. They are not confirmed specifications for 5MCS or YieldIQ — those products' own functional specifications, once produced, are authoritative for their detailed behavior. This section exists to demonstrate that the ontology accommodates all three without modification, not to pre-determine what 5MCS or YieldIQ must do.

- **MGD (Margin Guard Diagnostics)** operates primarily in the middle-to-upper band of the hierarchy: Document → Evidence → Signal → Knowledge → Insight (Finding, Root Cause, Recommendation, Opportunity), typically inferring Process- and Activity-level detail from Evidence rather than requiring an Organisation to have explicitly modeled its own Process taxonomy in advance. MGD's Diagnostic is the ontology's Diagnostic concept, scoped to operational and financial root-cause analysis specifically.

- **5MCS**, based on its position within Scope Optix's consulting-methodology naming (extending the 4M operational framework MGD itself uses), is expected to operate at a broader band spanning Organisation → Department → Business Unit → Process → Decision → Action → Performance — a consulting-engagement and organisational-transformation management layer that would track Decisions and Actions over the life of a client relationship, plausibly consuming MGD's Insights as one input among several, while adding its own longer-horizon Decision/Action/Improvement tracking that MGD's own Diagnostic-scoped model does not itself own.

- **YieldIQ**, based on its name, is expected to concentrate at the Metric → KPI → Financial Ratio → Operational Ratio → Performance → Improvement band — a continuous monitoring and optimization function focused specifically on yield and margin metrics over time, plausibly consuming Root Cause explanations from MGD where a yield anomaly needs causal explanation, but primarily operating as a Performance/Trend/Benchmark-driven optimization loop rather than a document-evidence diagnostic process in its own right.

### 9.3 Why partial use is compatibility, not fragmentation

A product that uses only a subset of this ontology's objects is not a partial or non-conformant implementation of it — it is using exactly the concepts relevant to what it does, in exactly the way this ontology defines them. The alternative — every product implementing the full fifteen-level hierarchy regardless of relevance — would itself be a violation of good design, forcing irrelevant complexity onto products that don't need it. Compatibility means shared meaning where concepts are shared, not shared scope.

### 9.4 The mechanism of compatibility, without dependency

Every product shares exactly two things with every other product under this ontology, and nothing more:

1. **The Organisation.** Every product references the same Organisation record by stable identity — the single highest-value shared concept in the entire platform, since it is what allows MGD's diagnosis, a future 5MCS engagement record, and a future YieldIQ optimization trend to all be recognized as being about the same business, without any of the three products owning or duplicating the others' data.

2. **The shape of a conclusion.** Because Insight (Chapter 3.22) and the Evidence Chain (Chapter 5) are defined once, at the ontology level, any product's Finding, Root Cause, Recommendation, Risk, or Opportunity is structurally recognizable by any other product, even if that other product never generates conclusions of its own — a future 5MCS engagement view could display an MGD-generated Recommendation natively, without translation, because both products agree in advance on what a Recommendation *is*.

Nothing beyond these two points is shared by default. Consistent with the non-dependency principle established at MGD's own level ([02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) Chapter 10, [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §9), no product's Knowledge Library, instance data, or internal reasoning is exposed to or depended upon by another product. Each remains independently deployable, independently available, and independently correct, even if the other two do not exist. **Shared vocabulary, never shared ownership** — this is the same discipline stated at the product level, now stated as a platform-founding commitment that every future product is bound by from its own first design document onward.

---

## Chapter 10 — Principles

These nine principles are the governing constitution of the Scope Optix Platform. Every chapter above is an elaboration of one or more of them; every product built under the Scope Optix name — present or future — is bound by all nine, without exception, regardless of what that product does or how it is implemented.

1. **Knowledge is data.** Every Business Rule, Benchmark, Industry Pack, and piece of curated domain expertise is a versioned, administrable record — never hardcoded into a product's software. This is what allows the platform's knowledge to grow without every growth requiring an engineering change.

2. **Evidence before conclusions.** No Insight, of any kind, in any product, precedes the Evidence that justifies it. This ordering is structural, not procedural — an Insight produced any other way is not a valid Insight under this ontology.

3. **One source of truth.** Every fact — a root cause definition, a benchmark, a Metric's computed value — exists in exactly one authoritative place. No product, and no two products together, may hold two disagreeing representations of the same fact.

4. **Deterministic reasoning.** The path from Evidence to Insight is reproducible: the same Evidence and the same Knowledge state produce the same conclusion, every time, in every product. This is what makes the platform's output defensible to an auditor, a lender, or a regulator, rather than merely persuasive to a reader.

5. **AI explains.** Wherever a product uses generative AI, its role is composition and explanation of already-established facts — never establishment of them.

6. **AI never invents business facts.** No Evidence, Metric, financial figure, Root Cause, or Recommendation may originate from an AI model. This is not a stylistic preference; it is what separates a platform whose conclusions can be trusted from one whose conclusions merely sound plausible.

7. **Everything is traceable.** From any Report, in any product, back through Narrative, Insight, Signal, Evidence, Document, Transaction, Activity, Process, Department, to the Organisation itself — the path exists, in full, for every conclusion the platform has ever produced.

8. **Everything is versioned.** No object this ontology defines is ever silently altered. Correction and refinement always produce a new version; the old one is retained, permanently, as the historical record it always was.

9. **Everything is explainable.** The cumulative effect of principles 1 through 8 is the platform's actual product: not any single feature of MGD, 5MCS, or YieldIQ, but the guarantee, standing behind every one of them, that their conclusions can always be explained, audited, and trusted.

### 10.1 What this document is, in the end

This ontology is not a specification for software. It is the reasoning discipline Scope Optix has chosen to hold itself to, expressed as a shared business language rather than as a rule enforced product by product. A competitor can copy a feature; a competitor can copy a user interface; a competitor cannot copy the discipline of an organisation that has, deliberately and in writing, refused to let any of its products draw a conclusion it cannot explain. That discipline — not any one codebase — is what this document exists to protect, and it is the reason this is, as instructed, the most important document in the Scope Optix Platform: everything else Scope Optix builds is an application of what is written here.

---

*This is a conceptual business ontology. It defines the business language of the Scope Optix Platform — not a database schema, not an API contract, not implementation. No product specification, data model, or implementation may contradict this document once approved. Product-level documents (including [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) and [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md)) remain valid and are read as consistent instantiations of this ontology, per the terminology note in Chapter 3.*
