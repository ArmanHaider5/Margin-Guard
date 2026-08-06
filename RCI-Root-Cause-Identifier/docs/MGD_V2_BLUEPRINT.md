# MGD Version 2 — Architecture Blueprint

Status: design document. Nothing in this document has been implemented. It defines the target architecture that [V2_ROADMAP.md](V2_ROADMAP.md)'s phases migrate MGD V1 toward. It should be read alongside [ARCHITECTURE.md](ARCHITECTURE.md), [MODULES.md](MODULES.md), [DATAFLOW.md](DATAFLOW.md), and [TECH_DEBT.md](TECH_DEBT.md), which describe the V1 baseline this blueprint is designed to replace.

A note on scope: this document defines *architecture* — engine responsibilities, data contracts, system boundaries, and knowledge structure. It intentionally does not specify implementation (language constructs, class names, file layout) or a delivery timeline. Those belong to an engineering design doc and a project plan respectively, produced after this blueprint is approved.

---

## 1. Vision

### 1.1 What MGD becomes

MGD (Margin Guard Diagnostics) V1 proved a thesis: that operational and financial documents from an SME can be turned into a structured, evidence-backed diagnosis of *why* a business is losing margin, without a human consultant reading every document by hand. It proved this thesis three separate times, in three incompatible engines, against four incompatible knowledge libraries, covering roughly a third of the industries it claims to support, with results stored partly in a database and partly in flat files that a server restart can lose.

MGD V2's job is not to prove the thesis again. It is to make the thesis **durable, singular, and extensible** — one engine, one knowledge base, that can be trusted with real client data, scaled to more industries without new engineering for each one, and eventually shared as diagnostic infrastructure across the rest of Scope Optix.

Three-year arc:

- **Year 1 — Consolidate and harden.** One diagnostic engine. One knowledge system. Full authentication and durable persistence. Industry coverage matches what is marketed (today it does not — see [TECH_DEBT.md](TECH_DEBT.md) §2). Financial statement intelligence exists as a first-class capability rather than a keyword-matching side effect of document parsing.
- **Year 2 — Deepen and prove.** Financial Intelligence (§7) and the AI Consultant Layer (§8) mature to the point where a consultant's editing time on a generated report is measured in minutes, not a rewrite. Confidence scoring and explainability (§2) are trusted enough that MGD output is defensible in front of a client without a disclaimer. Industry Packs (§6) can be authored by a domain expert without an engineer, closing the industry-coverage gap permanently rather than one industry at a time.
- **Year 3 — Become shared infrastructure.** MGD's diagnostic core is consumed by other Scope Optix products (§9) through a stable API rather than being reimplemented inside them. MGD is multi-tenant, horizontally scalable, and industry-agnostic at the engine level. The product a client buys and the infrastructure other Scope Optix products build on are the same underlying system, exposed differently.

### 1.2 Position within Scope Optix

Scope Optix is the parent consulting-technology brand. MGD is not "an app under Scope Optix" — it is the diagnostic reasoning layer that other Scope Optix products should not need to rebuild. Where a sibling product needs to answer "what is operationally or financially wrong here, why, and what should be done about it," it should call MGD rather than growing its own root-cause logic. This is the architectural difference between V1 and the V2 vision: V1 is a standalone application; V2 is a standalone application **and** a platform capability, from day one of the design even if the second consumer doesn't exist yet for a year or two.

This has one immediate design consequence, carried through the rest of this document: every external-facing contract (the Diagnostic API, the Knowledge System's data model, the report shape) is designed as if a second consumer already exists, even in Year 1 when there is only one.

---

## 2. Core Principles

These eight principles are the test every future design or PR decision should be checked against. Each one is a direct, named response to a specific V1 failure documented in [TECH_DEBT.md](TECH_DEBT.md).

**Single diagnostic engine.** There is exactly one code path from "signals" to "findings, root causes, recommendations." Not one path per generation, not one path per industry. V1 had three (`server/core/*`, `server/modules/diagnostics/*`, `server/mgd/*`) running two of them in production simultaneously against the same clients with different answers. In V2, "which engine ran this analysis" is not a question anyone should be able to ask.

**Single source of truth.** One knowledge library, one canonical data shape per concept (`Finding`, `RootCause`, `Recommendation`, `Opportunity`), one place a fact about a root cause lives. V1 had four knowledge libraries defining the same root cause (`mfg-maintenance-reactive`) with four different schemas and no reconciliation. In V2, if a root cause's description needs to change, there is exactly one place to change it, and every consumer sees the change immediately.

**Modular architecture.** Engines are independently testable, independently deployable in principle, and communicate only through well-defined data contracts — never through shared mutable state, never by one engine reading another's internal types. This is what makes "single engine" survivable long-term: modularity is how you avoid V1's failure mode recurring the next time someone needs to add a capability under time pressure and reaches for "just build a new file next to it" instead of extending the shared engine.

**AI-assisted consulting, not AI-generated consulting.** Generative AI composes narrative and prioritizes options. It does not invent root causes, does not invent numbers, and does not decide what is true. The deterministic engines (Finding, Root Cause, Recommendation, Opportunity, Confidence) establish facts; the AI Consultant Layer (§8) explains and prioritizes those facts in consulting language. This principle already existed in V1's stated governance rule ("AI selects from curated knowledge libraries... does not freely generate content") but was inconsistently enforced across the three engines. V2 makes it structural: there is only one place generative AI touches the pipeline, and it is architecturally incapable of introducing a fact that isn't already in the deterministic output.

**Explainable diagnostics.** Every finding, root cause, recommendation, and opportunity must be traceable back to the evidence that produced it — which document, which signal, which rule in the Knowledge System, and what confidence that chain carries. If a consultant or a client asks "why does the report say this," the answer must be retrievable, not reconstructed by re-reading the source documents. V1 had fragments of this (evidence signals, pipeline traces) but no consistent, queryable evidence chain from final output back to source document.

**Industry Packs, not industry code.** An industry is data — symptoms, evidence rules, KPI definitions, benchmark thresholds, recommendation weighting — not a TypeScript file with a name like `healthcare-root-causes.ts`. The engine never branches on an industry string. This is the single largest structural fix relative to V1, where adding an industry meant writing four new source files per generation, and where the two live engines didn't even agree on which industries existed (§6, and [TECH_DEBT.md](TECH_DEBT.md) §2).

**Financial intelligence as a peer of operational intelligence.** V1 treated financial data as one more document to keyword-match for "cash flow" or "overdue." V2 treats financial statements as structured data with their own parser, their own canonical model, and their own ratio library that feeds the same Signal Engine operational documents feed — so a margin-erosion root cause can be substantiated by both a financial ratio trend and an operational signal in the same evidence chain. This is the literal meaning of "Margin Guard": the platform should be able to show *financially* that margin eroded and *operationally* why.

**Operational intelligence as the causal backbone.** Financial statements show *that* something is wrong; operational signals show *why*. The engine's core value is connecting the two — a P&L margin decline is a symptom, a maintenance backlog or a collections process breakdown is the root cause. Neither financial nor operational intelligence is subordinate to the other; they are two evidence streams feeding the same reasoning layer.

---

## 3. High-Level Architecture

MGD V2 is organized into six layers plus two cross-cutting concerns. Data flows top to bottom through the layers; the Knowledge System and Identity/Access concerns are consulted by every layer above them.

```
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                          Scope Optix Ecosystem                             │
 │              (5MCS, YieldIQ, future Scope Optix products)                  │
 └───────────────────────────────────┬─────────────────────────────────────────┘
                                      │  Diagnostic API (versioned, stable contract — §9)
 ┌────────────────────────────────────▼────────────────────────────────────────┐
 │                              MGD Web Application                            │
 │                 (consultant + client + management surfaces)                 │
 └────────────────────────────────────┬────────────────────────────────────────┘
                                      │  same Diagnostic API — no back door
 ┌────────────────────────────────────▼────────────────────────────────────────┐
 │                                MGD DIAGNOSTIC CORE                           │
 │                                                                               │
 │  INGESTION LAYER                                                             │
 │  ┌────────────────────┐   ┌────────────────────┐                            │
 │  │  Document Parser     │   │  Financial Parser    │   raw files in,          │
 │  │  (ops docs: xlsx,     │   │  (BS, P&L, TB, GL,   │   normalized structured  │
 │  │   docx, pdf, pptx)    │   │   cash flow, payroll,│   objects out            │
 │  │                      │   │   AR/AP ageing, etc.)│                          │
 │  └──────────┬───────────┘   └──────────┬───────────┘                        │
 │             └───────────────┬───────────┘                                    │
 │  EXTRACTION LAYER            ▼                                               │
 │  ┌────────────────────────────────────────────┐                              │
 │  │              Signal Engine                    │  normalized text/rows →     │
 │  │      (operational + financial signals)        │  typed signal objects      │
 │  └──────────────────────┬─────────────────────┘                              │
 │                          ▼                                                    │
 │  ┌────────────────────────────────────────────┐                              │
 │  │              Evidence Engine                  │  signals → weighted,        │
 │  │   (validates, strengthens, cross-references)  │  cross-referenced evidence  │
 │  └──────────────────────┬─────────────────────┘                              │
 │  REASONING LAYER          ▼                                                   │
 │  ┌────────────────────────────────────────────┐      ┌─────────────────────┐ │
 │  │              Finding Engine                   │◄────►│                     │ │
 │  └──────────────────────┬─────────────────────┘      │   KNOWLEDGE SYSTEM  │ │
 │                          ▼                             │  (single source of  │ │
 │  ┌────────────────────────────────────────────┐      │   truth — §5)       │ │
 │  │             Root Cause Engine                  │◄────►│                     │ │
 │  └──────────────────────┬─────────────────────┘      │  Findings ·         │ │
 │                          ▼                             │  Root Causes ·      │ │
 │  ┌────────────────────────────────────────────┐      │  Recommendations ·  │ │
 │  │            Confidence Engine (cross-cutting:  │      │  KPIs · Benchmarks ·│ │
 │  │       scores signals, findings, root causes)   │      │  Industry Packs ·   │ │
 │  └──────────────────────┬─────────────────────┘      │  Financial &        │ │
 │  VALUE LAYER             ▼                             │  Operational Ratios·│ │
 │  ┌────────────────────────────────────────────┐      │  Symptoms ·         │ │
 │  │           Recommendation Engine                │◄────►│  Evidence Rules     │ │
 │  └──────────────────────┬─────────────────────┘      └─────────────────────┘ │
 │                          ▼                                       ▲             │
 │  ┌────────────────────────────────────────────┐                 │             │
 │  │             Opportunity Engine                 │◄────────────────┘             │
 │  └──────────────────────┬─────────────────────┘                               │
 │  NARRATIVE / OUTPUT LAYER ▼                                                    │
 │  ┌────────────────────────────────────────────┐                              │
 │  │            AI Consultant Layer                 │  grounded narrative         │
 │  │      (generative, grounded on facts only)      │  generation only            │
 │  └──────────────────────┬─────────────────────┘                              │
 │                          ▼                                                    │
 │  ┌────────────────────────────────────────────┐                              │
 │  │              Report Composer                   │  final MGDReport object     │
 │  └──────────────────────┬─────────────────────┘                              │
 └────────────────────────┼──────────────────────────────────────────────────────┘
                           ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                       PERSISTENCE & OBSERVABILITY                          │
 │   Single Postgres database — documents, signals, findings, root causes,    │
 │   recommendations, opportunities, reports, pipeline traces. No flat files. │
 └───────────────────────────────────────────────────────────────────────────┘

 Cross-cutting, consulted by every layer above:
 ┌───────────────────────────────────────────────────────────────────────────┐
 │  IDENTITY & ACCESS — authentication, tenancy, the client-bound-diagnostics  │
 │  rule (every artifact belongs to a Client; no free-floating analysis)      │
 └───────────────────────────────────────────────────────────────────────────┘
```

Three structural properties this diagram is designed to enforce, each a direct fix for a named V1 problem:

1. **One path through the middle.** There is exactly one Ingestion → Extraction → Reasoning → Value → Narrative sequence. Nothing downstream of Signal Engine has a sibling implementation. This is what "single diagnostic engine" (§2) looks like as a diagram rather than a sentence.
2. **The Knowledge System is consulted, never embedded.** Every engine in the Reasoning and Value layers reads from the Knowledge System at run time; none of them hardcode a root-cause list, a benchmark threshold, or an industry name in source code. This is what makes Industry Packs (§6) possible without engine changes.
3. **Everything downstream of Ingestion is deterministic except the AI Consultant Layer**, which is isolated to a single box at the bottom of the pipeline and only ever receives already-computed facts. This is what makes explainability (§2) and AI-assisted-not-AI-generated (§2) enforceable rather than aspirational.

---

## 4. Core Engines

Ten engines, each with a single responsibility. Where a V1 module already does something close to this, it is named as lineage — not because V2 reuses the code as-is (the data shapes must be unified per §5), but because it establishes which V1 engine's *approach* is the stronger starting point for that responsibility.

| Engine | Responsibility | Inputs | Outputs | V1 lineage |
|---|---|---|---|---|
| **Document Parser** | Extract text, tables, and raw structured rows from uploaded operational documents (xlsx, csv, docx, pdf, pptx). Byte-level extraction only — no interpretation of meaning. | Raw uploaded file, declared or detected file type | Normalized document object: raw text, tables, raw rows, per-sheet structure | `server/documents/document-parser.ts` + `server/cil/*` (classification, column mapping, row parsing, block detection) — CIL's structured-transaction approach is the stronger foundation and becomes the default extraction path, not an optional enrichment layer |
| **Financial Parser** | Recognize and normalize financial statement documents (Balance Sheet, P&L, Trial Balance, General Ledger, Cash Flow, Inventory valuation, Payroll, Bank Statements, AR/AP Ageing) into a canonical financial data model, independent of the client's chart-of-accounts or export format. | Raw document object from Document Parser, or a direct structured import (e.g. accounting-system export) | Canonical financial statement objects (typed by statement kind), mapped to a standard account taxonomy | New in V2 — see §7. No V1 equivalent exists; V1 financial understanding was keyword matching inside the generic document parser |
| **Signal Engine** | Convert normalized documents and financial statements into typed, categorized signals (operational and financial) — the atomic units of evidence. Applies the vocabulary defined by the active Industry Pack(s). | Document Parser output, Financial Parser output, active Industry Pack(s) | Typed signal list: category (4M + Financial), strength, source document/row reference | `server/cil/row-parser.ts` (transaction typing) + the various `*-signals.ts` files across all four V1 knowledge groups, unified into one vocabulary sourced from the Knowledge System instead of scattered per-industry files |
| **Evidence Engine** | Validate, strengthen, and cross-reference signals against each other and against Evidence Rules in the Knowledge System. Distinguishes a single weak mention from a corroborated pattern. Produces the evidence chain that Explainable Diagnostics (§2) depends on. | Signal list, Evidence Rules from Knowledge System | Evidence records: signal groups, corroboration strength, source traceability | `shared/evidence-signals.ts` (term-based, strength-weighted evidence) + `server/mgd/evidence-engine.ts` — the strength-weighting concept survives, the term lists move into the Knowledge System |
| **Finding Engine** | Turn evidence into discrete, human-readable operational and financial findings — the "what is happening" layer, before causal interpretation. | Evidence records, active Industry Pack | Finding list: title, category, severity, supporting evidence references | `server/mgd/findings-engine.ts` — largest and most mature V1 findings implementation; becomes the reference approach |
| **Root Cause Engine** | Match findings and evidence against the Knowledge System's Root Cause library to identify primary, secondary, and contributing root causes, with causal relationships between them where applicable. | Finding list, Evidence records, Root Cause library (Knowledge System) | Root cause list: primary/secondary/contributing classification, matched findings, causal links | Synthesis of `server/mgd/root-cause-engine.ts` (pattern-matching approach) and `server/modules/diagnostics/engines/root-cause-tree-engine.ts`/`causal-chain-engine.ts` (hierarchy and causal-chain structure) — V2 keeps the causal-chain concept but sources the pattern library from the unified Knowledge System instead of an inline list |
| **Confidence Engine** | Cross-cutting scoring service consulted by the Signal, Evidence, Finding, and Root Cause Engines. Produces a confidence band per signal, finding, and root cause, plus a single top-line diagnostic confidence classification for the analysis as a whole. | Signal strength, evidence corroboration, document coverage (how many documents vs. how many were expected for the industry) | Confidence scores at each level; top-line classification (e.g. preliminary vs. substantiated) | `server/modules/diagnostics/engines/root-cause-confidence-engine.ts` + V1's baseline/deep-mode confidence concept (`analysisMode`/`confidence` fields) — generalized into one scoring service instead of confidence logic duplicated per engine |
| **Recommendation Engine** | Match root causes against the Knowledge System's Recommendation library to produce prioritized, actionable recommendations, sequenced into a roadmap where dependencies exist. | Root cause list, Recommendation library, Confidence scores | Recommendation list: action, priority, timeframe, dependent root cause(s), confidence-adjusted priority | `server/mgd/recommendation-engine.ts` (root-cause → recommendation registry) + `server/modules/diagnostics/engines/transformation-roadmap-engine.ts` (sequencing) |
| **Opportunity Engine** | Quantify the financial and operational upside of addressing each root cause and recommendation — generalizing "cost savings" to the full range of value: cost reduction, margin recovery, revenue protection, working-capital improvement. Draws on Financial Parser output for grounded, statement-derived estimates where financial data is available, and on Operational Ratio benchmarks otherwise. | Root cause list, Recommendation list, canonical financial statements (when available), Operational/Financial Ratio libraries | Opportunity list: type, estimated range, basis (statement-derived vs. benchmark-derived), confidence | `server/modules/diagnostics/engines/cost-saving-engine.ts` + `financial-impact-engine.ts`, broadened in scope and — critically — no longer the only V1 engine generation that computes value at all (V1's `server/mgd/*` had no cost-saving equivalent; V2 makes this a mandatory step for every analysis) |
| **Report Composer** | Assemble the outputs of every upstream engine, plus the AI Consultant Layer's narrative, into the final versioned report object. Does not itself compute or interpret anything — pure assembly and formatting into the canonical report shape, from which every export (PDF, on-screen viewer, API response) is derived. | Findings, Root Causes, Recommendations, Opportunities, Confidence scores, AI Consultant Layer narrative | One canonical `Report` object; PDF/viewer/API are all renderers of this single object, not independent generators | `server/mgd/report-composer.ts` — closest V1 analog; V2 makes it the *only* report assembly point, retiring the three other report-generation stacks documented in [TECH_DEBT.md](TECH_DEBT.md) §5 |

Pipeline tracing (step-by-step execution logging, per V1's `pipeline-trace.ts`) is retained as a cross-cutting concern of the whole pipeline, not owned by any single engine — every engine emits a trace step, persisted alongside the report in Postgres rather than a flat file (§10, and [TECH_DEBT.md](TECH_DEBT.md) §3).

---

## 5. Knowledge System

### 5.1 Purpose

The Knowledge System is the single database-backed source of truth for everything the engines need to know that isn't specific to one client's analysis. It replaces all four V1 knowledge groups (`server/industries/`, `server/modules/industries/`, `shared/*`, and `server/mgd`'s inline pattern library) documented in [MODULES.md](MODULES.md) §7 and [TECH_DEBT.md](TECH_DEBT.md) §2.

The defining architectural change from V1: knowledge is **data in the database, not code in the repository.** A root cause, a benchmark threshold, or an industry's symptom vocabulary is a row a domain expert can eventually edit through an admin interface, not a TypeScript file an engineer must edit and redeploy. This is what makes Industry Packs (§6) genuinely modular rather than a slightly cleaner version of V1's file-per-industry pattern.

### 5.2 Entities

| Entity | Purpose | Key relationships |
|---|---|---|
| **Symptoms** | Client-facing or document-observable descriptions of a problem ("machine breakdowns," "late deliveries") — the vocabulary consultants and intake forms use. | Linked to one or more Evidence Rules and Root Causes |
| **Evidence Rules** | Definitions of how a signal or pattern of signals counts as evidence for a symptom or root cause, including strength weighting and corroboration requirements. | Consumed by the Evidence Engine; linked to Symptoms and Root Causes |
| **Findings** | Canonical finding definitions/templates the Finding Engine can produce, each tagged by category and applicable industries. | Linked to Evidence Rules (what evidence produces this finding) and Root Causes (what this finding is evidence for) |
| **Root Causes** | The core diagnostic library — one canonical entry per root cause, no duplicate IDs across industries unless genuinely industry-specific, with causal-chain relationships to other root causes where applicable. | Linked to Findings (matched from), Recommendations (addressed by), Industry Packs (applicability) |
| **Recommendations** | Action templates tied to one or more root causes, with priority/timeframe guidance and roadmap sequencing hints. | Linked to Root Causes, Opportunities (expected value of acting) |
| **Opportunities** | Value-quantification templates — how to estimate the financial/operational upside of a given root cause or recommendation, and from which ratio or benchmark basis. | Linked to Recommendations, Financial Ratios, Operational Ratios |
| **KPIs** | Definitions of measurable operational indicators (e.g. OEE, on-time delivery, days sales outstanding) including how to detect/compute them from parsed data. | Linked to Benchmarks, Industry Packs |
| **Benchmarks** | Target/expected values for KPIs, scoped by industry, used for severity classification. | Linked to KPIs, Industry Packs |
| **Financial Ratios** | Definitions of standard financial ratios (liquidity, margin, turnover, leverage, etc.), how to compute them from canonical financial statement data, and industry-scoped normal ranges. | Linked to Benchmarks, Opportunities, Industry Packs |
| **Operational Ratios** | Non-financial ratio/rate definitions (e.g. scrap rate, staff turnover rate, maintenance backlog ratio) analogous to Financial Ratios but computed from operational signals rather than financial statements. | Linked to Benchmarks, Opportunities, Industry Packs |
| **Industry Packs** | The applicability and weighting layer — which Symptoms, Root Causes, Benchmarks, and Ratios apply to a given industry, and any industry-specific weighting adjustments. Not a duplicate copy of the underlying entities — a set of associations and overrides on top of the shared entities. | Associates to every entity above (§6 covers this in depth) |

### 5.3 Design rules

- **One canonical ID per concept, ever.** A root cause has exactly one ID, one owning record, and one schema, regardless of how many industries it applies to or how many engines consume it. This directly closes the four-copies-of-`mfg-maintenance-reactive` problem in [TECH_DEBT.md](TECH_DEBT.md) §2.
- **Industry applicability is a relationship, not a fork.** A root cause that applies to both manufacturing and logistics is one record with two Industry Pack associations, not two records. This is what allows a cross-industry insight (e.g. a recommendation that works for both) to be authored and improved once.
- **Versioned, not mutated destructively.** Changes to a knowledge entity that would alter historical report meaning (e.g. redefining a benchmark threshold) are versioned, so a report generated last quarter can still be explained against the knowledge state that produced it — this is a direct requirement of the Explainable Diagnostics principle (§2), not an optional nicety.
- **Engines consume, never own.** No engine module contains an inline list of root causes, benchmarks, or industry names. If an engine needs to know something about the domain, it asks the Knowledge System at run time. This rule, more than any other, is what prevents V2 from re-accumulating V1's duplication over the next three years of feature pressure.
- **One vocabulary, not per-industry vocabularies.** Signal/symptom terms are defined once in the Knowledge System and tagged with industry applicability, rather than each industry maintaining an independent, drifting term list (V1's `manufacturing-signals.ts`, `healthcare-signals.ts`, etc. as separate files with no shared structure).

---

## 6. Industry Pack Framework

### 6.1 The V1 problem this solves

V1 has four different ideas of "which industries exist." `server/modules/industries/` covers six (manufacturing, healthcare, logistics, retail, professional-services, event-management). `shared/industry-problems.ts` covers a different thirteen. `server/industries/` covers five. `server/mgd/industry-packs/` covers exactly one (event-management). A client onboarded under most of the thirteen marketed industries gets problem-statement text with no matching root-cause, benchmark, or signal data anywhere in the system ([TECH_DEBT.md](TECH_DEBT.md) §2). Every one of these industries required new source files, in up to four places, written by an engineer.

### 6.2 The V2 model

An **Industry Pack** is a configuration object stored in the Knowledge System, not a code module. It consists entirely of associations and overrides against the shared entities defined in §5:

- Which Symptoms are relevant, and any industry-specific phrasing/vocabulary for them.
- Which Root Causes apply, and any industry-specific weighting (a root cause might be a primary driver in one industry and a minor contributing factor in another, without being a different root cause).
- Which KPIs and Benchmarks apply, with industry-specific target values.
- Which Financial Ratios and Operational Ratios apply, with industry-specific normal ranges.
- Industry-specific Recommendation prioritization or phrasing overrides.
- Optional industry-specific Evidence Rules, for signal patterns unique to that industry's document conventions (analogous to V1's Malay-language spreadsheet keyword handling in `block-detector.ts`, which becomes an Evidence Rule scoped to the relevant industry/locale rather than hardcoded engine logic).

None of the ten engines in §4 contain an `if (industry === "healthcare")` branch, or any equivalent. Every engine's only industry-awareness is: "ask the Knowledge System which Industry Pack is active for this analysis, and consult only the entities it associates to."

### 6.3 What this buys

- **Adding an industry becomes a data-authoring task, not a development task.** A domain expert (eventually through an admin interface, not required to be an engineer) creates symptom, root-cause, benchmark, and ratio associations for the new industry. No new source files, no new deployment.
- **Cross-industry consistency is structural.** Because Root Causes, Recommendations, and Ratios are shared entities that packs merely associate to, an improvement made for one industry (a better recommendation phrasing, a corrected benchmark) is immediately available to every other industry that shares that entity — impossible in V1's file-per-industry model.
- **Coverage gaps become visible, not silent.** Because "industry X has no associated root causes" is a queryable state of the Knowledge System, it can be surfaced as a product-readiness gap (e.g. in an internal dashboard) rather than discovered by a client running an analysis and getting nothing useful, as happens today for most of V1's thirteen marketed industries.
- **Multiple packs can apply to one client.** A client that spans two of Scope Optix's industry categories (common for diversified SMEs) can have more than one Industry Pack active for a single analysis, with the engines simply consulting the union of applicable entities — something no reasonable amount of file duplication in V1's model could support cleanly.

---

## 7. Financial Intelligence

### 7.1 Why this is a distinct capability, not a document type

V1's document parser treats a P&L export the same way it treats an operations report: extract text and tables, keyword-match for terms like "cash shortfall" or "overdue." This works only coincidentally, and cannot compute an actual ratio, trend, or statement-level insight. "Margin Guard" as a product promise requires actually understanding financial statements, not scanning them for scary words.

### 7.2 Statement types MGD V2 must understand

| Statement | What MGD extracts | Primary use |
|---|---|---|
| **Balance Sheet** | Asset, liability, equity line items mapped to a canonical chart-of-accounts category | Liquidity and leverage ratios; working-capital signals |
| **Profit & Loss** | Revenue, COGS, opex line items, by period where available | Margin trend, cost structure signals, the core "where did margin go" evidence |
| **Trial Balance** | Full account-level balances | Cross-validation of P&L/Balance Sheet extraction; anomaly detection (unexpected account balances) |
| **General Ledger** | Transaction-level detail where provided | Root-cause substantiation at the transaction level (e.g. tracing a cost spike to specific entries) |
| **Cash Flow (Statement or derived)** | Operating/investing/financing cash movement | Cash conversion signals, distinct from accrual-basis P&L signals |
| **Inventory** | Stock levels, valuation, movement | Inventory turnover ratio, obsolescence/write-off signals, ties to Materials-category operational findings |
| **Payroll** | Headcount, cost, overtime where available | Labour cost ratio, ties to Manpower-category operational findings |
| **Bank Statements** | Transaction-level cash movement | Independent cross-check against reported cash position; overdraft/bounced-payment signals |
| **AR/AP Ageing** | Receivables/payables aged buckets | Days Sales Outstanding / Days Payable Outstanding signals, collections-process root-cause substantiation |

### 7.3 Pipeline

The Financial Parser (§4) is a peer of the Document Parser, not a sub-step of it. It:

1. Detects which statement type a document represents (an extension of the same classification approach CIL already applies to operational documents, but trained on financial-statement structure rather than generic transaction rows).
2. Maps the client's chart-of-accounts (which varies enormously between SMEs) to a canonical account taxonomy defined in the Knowledge System, so that "Trade Debtors" and "Accounts Receivable" and "Debtors Control" all resolve to the same canonical concept.
3. Produces one canonical financial statement object per statement type, versioned by period where multiple periods are provided (enabling trend detection, not just a single-point snapshot).
4. Feeds the canonical statement objects into the **Financial Ratio library** (§5) to compute liquidity, margin, turnover, and leverage ratios, scoped by the active Industry Pack's normal ranges.
5. Emits the resulting ratios and trends as **financial signals**, structurally identical in shape to operational signals from the Signal Engine, so the Evidence Engine, Finding Engine, and Root Cause Engine treat them uniformly — a margin-erosion finding can be substantiated jointly by a financial ratio trend and an operational signal (e.g. rising scrap rate) in the same evidence chain. This joint substantiation is the mechanism that makes "Margin Guard" a literal capability rather than a brand name.

### 7.4 Design constraints

- **Chart-of-accounts variance is the default case, not an edge case.** The canonical-mapping step is mandatory for every client, not an optional cleanup pass — SME accounting exports are never standardized in practice.
- **Partial data must degrade gracefully.** A client may provide a P&L but no Balance Sheet, or an AR ageing report but no GL. The Financial Parser and Ratio library must compute whatever is computable from what's provided and mark unavailable ratios as such (feeding the Confidence Engine, §4) rather than failing the analysis.
- **Statement-derived numbers are preferred over benchmark-derived estimates wherever available**, and the Opportunity Engine (§4) must record which basis it used — this is an explainability requirement (§2), not a cosmetic one: a client should be able to tell whether an estimated saving came from their own numbers or an industry benchmark.

---

## 8. AI Consultant Layer

### 8.1 Role

The AI Consultant Layer is the only place in the pipeline where generative AI operates, and it operates strictly downstream of every deterministic engine in §4. Its job is narrow and specific: given a completed, already-computed set of findings, root causes, recommendations, opportunities, and confidence scores, produce a consulting-grade executive narrative — the prose a Big Four or MBB consultant would write to explain those facts to a client executive.

### 8.2 Grounded generation, not free generation

The layer receives the full structured output of the Root Cause, Recommendation, Opportunity, and Confidence Engines as its only input alongside a narrative style specification (tone, structure, target audience). It is architecturally prevented from introducing a root cause, a number, or a recommendation that isn't already present in that structured input — the model's task is composition and prioritization of given facts into narrative, not fact generation. This is a stronger, structural version of V1's stated-but-inconsistently-enforced rule that "AI selects from curated knowledge libraries... does not freely generate content" ([replit.md](../replit.md)) — in V2 it is enforced by the pipeline's data flow itself (the AI Consultant Layer has no access to raw documents or an open-ended prompt; it only ever sees already-validated structured facts), not by prompt instruction alone.

### 8.3 Structure

Consulting-standard narrative structure (situation → complication → resolution, or equivalent), covering at minimum: executive overview, primary findings, root-cause summary with causal reasoning, financial and operational impact, prioritized recommendations, and a closing risk/opportunity framing. Every substantive claim in the generated narrative must carry a traceable reference back to the finding, root cause, or evidence ID that supports it (an extension of V1's `server/mgd/executive-narrative-engine.ts`'s 7-section structure, made explainable rather than just structured).

### 8.4 Availability and cost

Because the deterministic engines already produce a complete, structured, human-readable set of facts before the AI Consultant Layer runs, the system must be able to fall back to a template-based narrative composition (deterministic, no LLM call) when the AI provider is unavailable, rate-limited, or disabled for cost reasons — the analysis is never blocked on an external AI dependency being reachable. This directly addresses a V1 architectural risk: `server/core/bulk-analyzer.ts`'s entire analysis (not just its narrative) depends on a live OpenAI call, meaning an API outage blocks diagnosis, not just prose quality. In V2, an AI outage degrades narrative polish, never diagnostic capability.

---

## 9. Future Integration — 5MCS and YieldIQ

This section is written at the level of integration *architecture*, not integration *specification*, since the detailed data contracts of 5MCS and YieldIQ are outside this document's scope and should be confirmed directly with their respective owners before any integration work begins. The principles below are designed to hold regardless of what those systems' internals turn out to be.

### 9.1 Governing rule

MGD must remain fully functional, deployable, and useful as a standalone product if 5MCS and YieldIQ never exist, and equally, 5MCS and YieldIQ must never require MGD's internal database, internal engine code, or internal knowledge schema to function. The only thing that should ever cross the boundary between MGD and another Scope Optix product is a versioned, documented contract — never a shared table, a shared type import, or a direct function call across the boundary.

### 9.2 Integration surface

- **Diagnostic API.** A stable, versioned, authenticated API (the same API the MGD web application itself uses — §3's diagram deliberately puts the web app behind the same Diagnostic API boundary as external consumers, so the contract is exercised by MGD's own frontend and cannot silently drift). This is the only way another Scope Optix product requests a diagnosis, retrieves a report, or queries the Knowledge System.
- **Event feed.** For consumers that want to react to diagnostic activity (e.g. a new report completing, a critical root cause being identified) rather than polling, MGD publishes versioned events. Consumers subscribe; MGD has no knowledge of who is subscribed or what they do with the event.
- **No shared database.** 5MCS and YieldIQ do not connect to MGD's Postgres instance under any circumstance, including read-only. If either system needs MGD data at a frequency or shape the API doesn't efficiently support, that is a signal to extend the API, not to open a database connection.
- **Adapter pattern at the boundary, both directions.** If MGD ever needs data *from* 5MCS or YieldIQ (for example, a client's engagement history from 5MCS informing which Industry Pack to suggest), that data is consumed through an adapter that translates their contract into MGD's internal shapes at the boundary — MGD's internal engines never see or depend on 5MCS/YieldIQ's native data model. The same discipline applies in reverse: whatever those systems consume from MGD, they translate at their own boundary, not by importing MGD's internal report schema directly into their codebase.
- **Independent versioning and deployability.** MGD, 5MCS, and YieldIQ ship on independent schedules. A breaking change to MGD's internal engines (per the migration discipline in §10) must never require a coordinated release with either sibling product — only a contract version bump, with the old contract version supported for a defined deprecation window.

### 9.3 What this unlocks, and what it deliberately forecloses

This design unlocks the Year 3 vision in §1: 5MCS or YieldIQ can call MGD's Diagnostic API to get a root-cause diagnosis or a financial-ratio read on a client without reimplementing any of §4's engines themselves, and MGD can evolve its internal engines freely (including the entire migration in §10) without ever coordinating that work with another product team, because nothing outside the API boundary can see the change. It deliberately forecloses the tempting shortcut of a shared database or shared internal library "just for now" — that shortcut is exactly how MGD V1 accumulated three engines and four knowledge libraries in the first place, and it should not be allowed to recur at the inter-product level.

---

## 10. Migration Strategy

This section defines how V1 becomes V2 without a production outage or a client-visible service gap, and how the phased plan in [V2_ROADMAP.md](V2_ROADMAP.md) maps onto the target architecture defined in §§3–9 above. It is a strangler-fig migration: the new architecture is built alongside V1, proven against real historical data, and cut over incrementally — V1 is never "paused" for the migration to happen.

### 10.1 Sequencing principle

Build the target (this blueprint) in a new, isolated code path first. Do not modify V1's three existing engines in place — modifying a system with three overlapping engines in place is how you get a fourth. Instead:

1. **Foundational work that doesn't require the engine decision (maps to [V2_ROADMAP.md](V2_ROADMAP.md) Phases 0–1).** Durable persistence (Postgres for everything, no flat files), authentication applied consistently, dead-code removal. This work is safe to do immediately because it doesn't touch diagnostic logic at all, and it removes noise before the harder migration work begins.
2. **Stand up the Knowledge System (§5) as new, additive infrastructure.** Populate it by migrating the *best* content from each of V1's four knowledge groups — not merging their code, but re-authoring their content into the unified schema, resolving the duplicate-ID collisions identified in [TECH_DEBT.md](TECH_DEBT.md) §2 as part of that re-authoring. V1's engines keep running unmodified, reading from their existing sources, while this happens in parallel.
3. **Build the ten engines in §4 as a new pipeline, reading from the new Knowledge System, running side by side with V1's three engines — not replacing them yet.** Run it against real historical documents from completed V1 analyses (both `client_analyses` and stored MGD reports) and compare output to what V1 actually produced and what a consultant actually delivered to the client. This is a validation gate, not a formality: the new engine does not go live until its output is judged at least as good as the better of V1's two live engines, by the people who actually use the reports.
4. **Cut over one route at a time behind a feature flag**, starting with whichever of V1's two live paths (`/admin/analyses/:id/run` or `/mgd/run`) is judged the weaker/less-trusted one internally, so the first cutover has the lowest risk of a visible regression. The feature flag operates per-client or per-analysis, not globally, so a cutover can be limited to a pilot group before wide release.
5. **Only after the new pipeline has fully absorbed both V1 traffic paths** — confirmed by the feature flag being at 100% with no rollback incidents over a defined stability window — retire V1's three engines and four knowledge groups. Deletion is the last step, not an early one.

### 10.2 Data migration

- Existing `client_documents`, `cil_transactions`, and `client_analyses` rows are not reprocessed destructively — the new pipeline reads the same source documents through the new Document Parser and Financial Parser, producing new signal/finding/root-cause/report records alongside the old ones, linked to the same Client and source documents. Nothing about a client's historical analysis is deleted or silently reinterpreted.
- MGD's flat-file report/trace storage (`server/data/*.json`) is migrated to Postgres as part of step 1 above, independent of the engine consolidation — this is explicitly called out in [TECH_DEBT.md](TECH_DEBT.md) §3 as safe to do immediately and low-risk, and doing it early means the new pipeline is built against durable storage from day one rather than inheriting the flat-file pattern.
- The unauthenticated route surface identified in [TECH_DEBT.md](TECH_DEBT.md) §6 is closed as part of step 1, before any new pipeline work begins, since it is a live production exposure independent of the architecture migration.

### 10.3 Rollback posture

At every cutover step in §10.1(4), the feature flag is the rollback mechanism — flipping a client or analysis back to a V1 path requires no data migration in reverse, because V1's engines and data continue to exist, untouched, until step 5. This is the direct benefit of not modifying V1's engines in place: there is never a point in the migration where V1 is broken or partially working. It is either the active path for a given client, or it has been fully superseded and is a candidate for deletion — never in between.

### 10.4 What "done" looks like

Migration is complete when: every client-facing analysis runs through the single pipeline in §3; the four knowledge groups and three engine generations documented in [TECH_DEBT.md](TECH_DEBT.md) have been deleted, not just deprecated; MGD's only persistence layer is Postgres; the Diagnostic API in §9 is the only way the MGD web application itself talks to the backend; and at least one of the industries currently missing engine-level coverage (per [TECH_DEBT.md](TECH_DEBT.md) §2) has been added purely through Industry Pack authoring, with zero engine code changes, as proof that §6's framework actually delivers on its design intent.

---

*This blueprint defines target architecture only. No implementation work should begin against it until it has been reviewed and approved.*
