# MGD Version 2 — Functional Specification

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Functional Specification |
| Version | 2.0 (Draft) |
| Status | **Frozen for review — pending approval. No implementation authorized against this document until sign-off.** |
| Scope | Functional requirements only. Architecture and engineering design are covered in [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md). |
| Prepared by | Office of the Chief Software Architect, Scope Optix |
| Related documents | [ARCHITECTURE.md](ARCHITECTURE.md), [MODULES.md](MODULES.md), [DATAFLOW.md](DATAFLOW.md), [TECH_DEBT.md](TECH_DEBT.md) (V1 baseline) · [V2_ROADMAP.md](V2_ROADMAP.md), [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) (V2 architecture) |

This document defines **what MGD Version 2 must do**. It does not define how it is built — that is the responsibility of the architecture blueprint and the engineering design documents that follow approval of this specification. Where this document uses the word **shall**, the requirement is mandatory for MGD V2 to be considered complete. Where it uses **should**, the requirement is a strong design target that may be deferred with explicit justification. Nothing in this document authorizes code changes to the MGD V1 production baseline.

---

## 1. Executive Summary

Margin Guard Diagnostics (MGD) is the **Diagnostic Intelligence Engine of the Scope Optix Platform**. Its purpose is to take the operational and financial documents an SME already produces in the ordinary course of business — spreadsheets, financial statements, reports, logs — and convert them into a structured, evidence-backed diagnosis of why the business is underperforming, what it is costing them, and what to do about it.

MGD exists because expert operational and financial diagnosis is scarce, slow, and expensive when performed manually by a human consultant, and because the businesses that need it most — SMEs without an internal finance or operations analytics function — are the least able to afford or access it at the frequency they need it.

**MGD's objective is to replicate the analytical reasoning of an experienced operational consultant, using deterministic evidence, supported by AI-generated explanation.** This sentence is the specification's single governing constraint, and every chapter below exists to make it concrete and testable:

- **"Replicate the analytical reasoning of an experienced operational consultant"** means the output must read, structurally, the way a McKinsey/BCG/Bain/Big-Four operational review reads: situation, complication, root cause, evidence, recommendation, quantified value — not a list of anomalies or a dump of statistics.
- **"Deterministic evidence"** means every finding, root cause, and recommendation MGD produces is the output of rule-based, reproducible logic operating against a curated knowledge library — not a free-form model output that might differ on a second run of the same documents.
- **"AI-generated explanation"** means generative AI's role is strictly to compose and prioritize the deterministic output into natural, consulting-grade language — never to decide what is true. This distinction, and the discipline of enforcing it structurally rather than by convention, is the single most important product principle in this specification (Chapter 9).

MGD is designed to be sold and used as a standalone diagnostic product today, while being architected — functionally, not just technically — as shared diagnostic infrastructure the rest of the Scope Optix Platform can build on (Chapter 10).

---

## 2. Product Objectives

### 2.1 Business goals

1. **Standardize consulting-grade diagnosis at scale.** Every MGD analysis should meet a consistent bar of rigor regardless of which consultant runs it, which client it's for, or which industry the client operates in — removing the variance that comes from diagnosis quality depending on which individual consultant happened to work the engagement.
2. **Compress the time from "documents received" to "credible diagnosis delivered"** from what a manual consulting engagement typically requires (days to weeks of analyst time) to a fraction of that, without sacrificing the rigor in objective 1.
3. **Make expert-level diagnosis accessible to businesses that cannot afford a full consulting engagement**, by allowing MGD to be delivered as a lighter-touch, self-service or lightly-facilitated product for smaller clients, while remaining rigorous enough for larger, fully consultant-led engagements.
4. **Produce output credible enough to be used by parties outside the consulting relationship** — a lender, an investor, or a government agency evaluating the business — without those parties needing to independently re-verify the underlying analysis, because the evidence chain (Chapter 9) is transparent and auditable.
5. **Build MGD as reusable diagnostic infrastructure for Scope Optix**, so that future Scope Optix products do not need to reimplement operational or financial diagnostic reasoning independently (Chapter 10).

### 2.2 Who MGD is designed for

MGD is designed for six distinct user populations, each with different needs from the same underlying diagnostic output. Chapter 7 defines the formal system roles these populations map to; this section describes their functional needs.

- **Consultants** are MGD's primary operators. They run diagnostics on behalf of a client, review and refine the AI-assisted output, and are ultimately accountable for what is delivered to the client. MGD must make a skilled consultant faster and more consistent, not replace their judgment — the system shall always allow a consultant to review, annotate, and override before a report is finalized.
- **Business owners and management teams** are MGD's primary beneficiaries. They need to understand, in language they can act on without a finance or operations background, what is wrong, why, what it is costing them, and what to do next — and to trust that the answer is grounded in their own numbers, not generic advice.
- **Investors** use MGD output during due diligence to understand the operational health behind the financials of a business they are evaluating — MGD's evidence-linked findings let an investor distinguish a genuinely well-run business with temporary headwinds from one with structural operational problems that financial statements alone would not reveal.
- **Lenders** use MGD output to assess operational and financial risk in a lending decision — the confidence scoring and evidence traceability required by this specification (Chapter 9) exist specifically so a lender can rely on an MGD finding the way they would rely on an audited figure, with a visible basis for that reliance.
- **Government agencies** (grant administrators, industry development bodies, regulators) use MGD output — individually or in aggregate across a portfolio of businesses — to evaluate programme eligibility, measure the impact of an intervention, or benchmark an industry sector's operational health.
- **Executives within the Scope Optix consulting practice** (as distinct from the client-facing consultant running an engagement) use MGD's management and portfolio-level views to oversee engagement quality and business performance across the whole client book, without needing case-by-case detail.

---

## 3. Functional Modules

Sixteen functional modules compose MGD V2. Each is specified here in terms of purpose, capability, and functional inputs/outputs — the technical architecture and engine boundaries that implement these modules are defined in [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §4–§8 and are not repeated here.

### 3.1 Document Intelligence

**Purpose.** Ingest any document a client provides and convert it into structured, machine-readable data, regardless of the document's original format, layout convention, or language.

**Capabilities.** Detects file type; classifies document purpose (e.g. sales report, maintenance log, invoice, financial statement) from content and structure, not filename; extracts tables, free text, and row-level data; normalizes inconsistent layouts (multiple sub-tables in one sheet, non-standard headers, mixed-language content) into a consistent structured form; produces a full extraction audit trail so every downstream fact can be traced to a specific document, sheet, and row.

**Inputs.** Raw uploaded files (Chapter 5 lists supported types).

**Outputs.** Structured document objects: classified document type, extracted tables/rows, extracted free text, extraction confidence, and source-location references for every extracted data point.

**Dependencies.** Feeds Financial Intelligence (§3.2) and Operational Intelligence (§3.3) directly; feeds the Signal Engine (§3.6) for documents that don't require statement-level or KPI-level interpretation.

### 3.2 Financial Intelligence

**Purpose.** Understand financial statements as financial statements — not as generic documents to keyword-match — so that MGD can compute real ratios, trends, and statement-derived value estimates rather than inferring financial health from incidental language.

**Capabilities.** Recognizes the specific financial statement types listed in Chapter 5.1; maps a client's chart-of-accounts (which varies between businesses) to a canonical account taxonomy; assembles multi-period statements to detect trend, not just point-in-time snapshots; computes standard financial ratios (liquidity, margin, turnover, leverage, collections) scoped to the client's industry; degrades gracefully when only partial statement types are provided, marking unavailable ratios as such rather than guessing.

**Inputs.** Structured document objects from Document Intelligence that classify as financial statement types.

**Outputs.** Canonical financial statement objects per period; computed financial ratios with trend direction; financial signals for the Signal Engine.

**Dependencies.** Depends on Document Intelligence; depends on the Knowledge Library (§3.4) for the canonical account taxonomy and industry-scoped ratio norms; feeds the Signal Engine (§3.6) and the Opportunity Engine (§3.11).

### 3.3 Operational Intelligence

**Purpose.** Understand non-financial operational data — production, maintenance, dispatch, inventory movement, staffing, quality/rework — as measurable operational performance, not free text.

**Capabilities.** Detects and computes operational KPIs (e.g. on-time delivery, downtime, scrap rate, turnover rate) from extracted document data where the data supports direct computation; classifies operational signals against the 4M framework (Money, Manpower, Materials, Machinery) plus any additional operational dimensions an Industry Pack defines; compares computed KPIs against industry-scoped benchmarks to determine severity.

**Inputs.** Structured document objects from Document Intelligence that classify as operational document types (Chapter 5.2).

**Outputs.** Computed operational KPIs with benchmark comparison and severity classification; operational signals for the Signal Engine.

**Dependencies.** Depends on Document Intelligence; depends on the Knowledge Library for KPI definitions, benchmarks, and Industry Pack scoping; feeds the Signal Engine.

### 3.4 Knowledge Library

**Purpose.** Serve as the single, authoritative repository of everything MGD knows that is not specific to one client's analysis — the diagnostic domain knowledge that makes MGD's output consulting-grade rather than generic.

**Capabilities.** Stores and serves: Symptoms, Root Causes, Recommendations, Opportunities, KPIs, Benchmarks, Financial Ratios, Operational Ratios, Evidence Rules, and Industry Packs, as defined in [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §5. Provides one canonical record per concept — no duplicate or conflicting definitions of the same root cause, benchmark, or ratio. Supports versioning, so that a report generated in the past can still be explained against the knowledge state that produced it. Is administrable (Chapter 3.16) without requiring a code change or redeployment to add or adjust knowledge content, including adding a new industry.

**Inputs.** Authored/curated content from domain experts via the Administration module; runtime read access from every reasoning-layer module.

**Outputs.** Knowledge records consulted by Financial Intelligence, Operational Intelligence, Evidence Engine, Finding Engine, Root Cause Engine, Recommendation Engine, Opportunity Engine, and Industry Intelligence.

**Dependencies.** None upstream — it is the system's foundation. Every other reasoning-layer module depends on it.

### 3.5 Evidence Engine

**Purpose.** Determine whether a signal, or a pattern of signals, constitutes sufficient evidence to support a finding — distinguishing an isolated mention from a corroborated operational pattern.

**Capabilities.** Applies Evidence Rules from the Knowledge Library to score signal strength and corroboration; cross-references signals across multiple documents and, where available, across both financial and operational sources for the same underlying issue; produces a traceable evidence chain linking every piece of evidence back to its source document, row, or statement line.

**Inputs.** Signals from the Signal Engine.

**Outputs.** Evidence records: signal groupings, corroboration strength, confidence contribution, source traceability.

**Dependencies.** Depends on the Signal Engine and the Knowledge Library's Evidence Rules; feeds the Finding Engine and the Confidence Engine.

### 3.6 Signal Engine

**Purpose.** Convert normalized document data (from Document, Financial, and Operational Intelligence) into a common vocabulary of typed signals — the atomic unit every downstream diagnostic module reasons over.

**Capabilities.** Applies the active Industry Pack's vocabulary to detect and classify signals from text, tabular, and statement data; tags each signal by category (4M plus financial dimensions) and by source; produces a uniform signal representation regardless of whether the underlying source was operational or financial, so downstream modules never need to know which.

**Inputs.** Structured output of Document Intelligence, Financial Intelligence, and Operational Intelligence.

**Outputs.** Typed signal list with category, strength, and source reference.

**Dependencies.** Depends on Document/Financial/Operational Intelligence and the Knowledge Library (industry vocabulary); feeds the Evidence Engine.

### 3.7 Finding Engine

**Purpose.** Convert validated evidence into discrete, human-readable statements of what is happening in the business — the observational layer, prior to causal interpretation.

**Capabilities.** Matches evidence patterns against Finding definitions in the Knowledge Library; classifies each finding by category and severity; attaches the supporting evidence reference required by Chapter 9's evidence-linkage principle to every finding it produces.

**Inputs.** Evidence records from the Evidence Engine.

**Outputs.** Finding list, each with title, category, severity, and supporting evidence.

**Dependencies.** Depends on the Evidence Engine and the Knowledge Library; feeds the Root Cause Engine.

### 3.8 Root Cause Engine

**Purpose.** Determine *why* the findings are occurring — the causal layer that distinguishes MGD from a reporting or anomaly-detection tool.

**Capabilities.** Matches findings and their supporting evidence against the Root Cause library; classifies root causes as primary, secondary, or contributing; identifies causal relationships between root causes where the Knowledge Library defines them (e.g. one root cause driving another); ensures every root cause it surfaces is linked to at least one supporting finding, as required by Chapter 9.

**Inputs.** Finding list from the Finding Engine.

**Outputs.** Root cause list with classification (primary/secondary/contributing), matched findings, and causal relationships.

**Dependencies.** Depends on the Finding Engine and the Knowledge Library's Root Cause records; feeds the Confidence Engine, the Recommendation Engine, and the Opportunity Engine.

### 3.9 Confidence Engine

**Purpose.** Quantify how much certainty MGD has in its own output, at every level of the diagnosis, so that consultants and downstream readers (Chapter 2.2) know how much weight a given finding or root cause can bear.

**Capabilities.** Scores confidence at the signal, finding, and root cause level based on evidence strength, corroboration, and document coverage; produces a single top-line confidence classification for the overall analysis (reflecting, at minimum, whether the diagnosis is based on stated problems alone versus substantiated by uploaded evidence); flags any finding or root cause whose confidence falls below the threshold required for it to be surfaced as a primary conclusion, per Chapter 9.

**Inputs.** Signal strength (Signal Engine), corroboration (Evidence Engine), match strength (Finding Engine, Root Cause Engine), document coverage relative to what the active Industry Pack expects.

**Outputs.** Per-item confidence scores; one top-line diagnostic confidence classification.

**Dependencies.** Consulted by the Evidence, Finding, and Root Cause Engines; its output is consumed by the Recommendation Engine, Opportunity Engine, and Executive Report Composer.

### 3.10 Recommendation Engine

**Purpose.** Convert diagnosed root causes into prioritized, actionable guidance a business can execute.

**Capabilities.** Matches root causes against the Recommendation library; sequences recommendations into a roadmap where one recommendation depends on or should precede another; assigns priority and indicative timeframe; ensures every recommendation it produces is linked to at least one root cause, as required by Chapter 9 — MGD shall not surface a recommendation with no diagnosed cause behind it.

**Inputs.** Root cause list from the Root Cause Engine; confidence scores from the Confidence Engine.

**Outputs.** Prioritized, sequenced recommendation list, each linked to its originating root cause(s).

**Dependencies.** Depends on the Root Cause Engine, Confidence Engine, and the Knowledge Library's Recommendation records; feeds the Opportunity Engine and the Executive Report Composer.

### 3.11 Opportunity Engine

**Purpose.** Quantify the financial and operational value of acting on MGD's diagnosis — turning "here is what's wrong" into "here is what it is worth to fix," the figure that makes a report actionable at the executive level.

**Capabilities.** Estimates value across the full range of opportunity types — cost reduction, margin recovery, revenue protection, working-capital improvement — not cost savings alone; prefers statement-derived estimates (from Financial Intelligence) over benchmark-derived estimates wherever the client's own financial data supports it, and clearly labels which basis was used for every estimate, per the explainability requirement in Chapter 9.

**Inputs.** Root causes and recommendations; canonical financial statements where available; Financial and Operational Ratio benchmarks from the Knowledge Library.

**Outputs.** Opportunity list: type, estimated value range, basis (statement-derived or benchmark-derived), and confidence.

**Dependencies.** Depends on the Root Cause Engine, Recommendation Engine, Financial Intelligence, and the Knowledge Library; feeds the Executive Report Composer.

### 3.12 Industry Intelligence

**Purpose.** Scope every other module's behavior to the client's specific industry (or industries) without requiring industry-specific engineering.

**Capabilities.** Resolves which Industry Pack(s) apply to a given client/analysis; supports a client belonging to more than one industry category simultaneously; exposes, at a portfolio level, which industries currently have complete Industry Pack coverage and which do not, so coverage gaps are visible rather than silently discovered by a client receiving an unsubstantiated report.

**Inputs.** Client industry classification; the Knowledge Library's Industry Pack records.

**Outputs.** The resolved set of Symptoms, Root Causes, Benchmarks, Ratios, and vocabulary applicable to a given analysis, consumed by every reasoning-layer module.

**Dependencies.** Depends on the Knowledge Library; consulted by Financial Intelligence, Operational Intelligence, Signal Engine, Finding Engine, Root Cause Engine, Recommendation Engine, and Opportunity Engine.

### 3.13 AI Consultant

**Purpose.** Compose the deterministic diagnostic output into the natural, consulting-grade narrative a business executive expects to read — the only module in MGD where generative AI operates.

**Capabilities.** Generates an executive narrative (overview, key findings, root-cause reasoning, financial and operational impact, prioritized recommendations, closing risk/opportunity framing) strictly from already-computed findings, root causes, recommendations, opportunities, and confidence scores; is functionally incapable of introducing a fact, number, or conclusion not already present in that structured input, per Chapter 9's "AI explains, never diagnoses" principle; supports an interactive session mode (§3.13.1) in addition to static narrative generation; falls back to deterministic, template-based narrative composition if the generative AI provider is unavailable, so that diagnosis is never blocked by an external AI dependency.

**3.13.1 AI Consultant Session.** In addition to producing the static Executive Report narrative, the AI Consultant supports an interactive, conversational mode in which a consultant or client can ask follow-up questions about a completed diagnosis ("why is this the primary root cause," "what evidence supports this recommendation," "how does this compare to last quarter"). Every answer given in this mode is subject to the same grounding constraint as the static narrative — it may only reference facts already present in the completed diagnosis and its evidence chain, and shall cite the specific finding, root cause, or evidence record it is drawing from. The session is a specified **output** of MGD (Chapter 6) as well as a functional module, since a transcript of the session is itself a retrievable artifact.

**Inputs.** Findings, root causes, recommendations, opportunities, confidence scores (all deterministic modules' output); for session mode, user questions scoped to a completed diagnosis.

**Outputs.** Executive narrative text, structured by section; for session mode, a question/answer transcript, each answer carrying a citation back to supporting structured output.

**Dependencies.** Depends on the Finding, Root Cause, Recommendation, Opportunity, and Confidence Engines; feeds the Executive Report Composer.

### 3.14 Executive Report Composer

**Purpose.** Assemble every module's output into the single canonical report object from which all report-format outputs (Chapter 6) are derived.

**Capabilities.** Performs assembly and formatting only — it does not compute or interpret; produces one versioned report object per completed analysis; every export format (document, presentation, dashboard view) is a rendering of this one object, never an independently generated artifact, so that a report is never inconsistent with its own presentation.

**Inputs.** Findings, root causes, recommendations, opportunities, confidence scores, AI Consultant narrative.

**Outputs.** One canonical, versioned report object.

**Dependencies.** Depends on every upstream module; feeds Presentation Mode and every report/export output in Chapter 6.

### 3.15 Presentation Mode

**Purpose.** Render a completed report as a boardroom-ready presentation, suitable for a consultant to present live to a client's leadership team without leaving MGD to rebuild the content in a separate presentation tool.

**Capabilities.** Presents the canonical report object as a sequenced, navigable, full-screen presentation (one logical section per screen — overview, findings, root causes, recommendations, opportunity, closing); supports presenter navigation controls; supports export/print of the presentation view; always reflects the same underlying report object as every other output, so nothing shown in presentation differs from what is in the Executive Report.

**Inputs.** The canonical report object from the Executive Report Composer.

**Outputs.** An on-screen, navigable presentation view; an exportable/printable version of the same.

**Dependencies.** Depends on the Executive Report Composer.

### 3.16 Administration

**Purpose.** Provide the operational controls needed to run MGD as a governed enterprise system — user and access management, Knowledge Library curation, and system oversight — without requiring engineering involvement for routine changes.

**Capabilities.** User and role management (Chapter 7); Knowledge Library authoring and curation (adding/editing Symptoms, Root Causes, Recommendations, Opportunities, KPIs, Benchmarks, Ratios, and — critically — authoring new Industry Packs, per [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §6, without a code change); client/tenant management; audit log access (Chapter 8.6); system health and usage oversight.

**Inputs.** Administrator actions.

**Outputs.** Changes to the Knowledge Library (versioned, per §3.4); user/role changes; audit records.

**Dependencies.** Writes to the Knowledge Library; every other module depends transitively on Administration having correctly configured the Knowledge Library and user access.

---

## 4. Diagnostic Workflow

This chapter specifies the complete, ordered workflow from document upload to report delivery. Every step states its Purpose, Inputs, Outputs, Dependencies, and Validation Rules. Steps 3 and 4 are conditional on document mix, as noted.

### Step 1 — Client & Engagement Binding

**Purpose.** Establish the client context every subsequent step and artifact must be bound to, consistent with the institutional rule (carried forward from MGD V1) that no diagnostic artifact may exist without an owning client.

**Inputs.** Client identity (existing or newly created); engagement/programme context; assigned consultant.

**Outputs.** A bound diagnostic engagement/case record.

**Dependencies.** None (first step).

**Validation rules.** A diagnostic session shall not proceed to Step 2 without a valid, existing client binding. A client record shall not be deleted while it has any bound documents, analyses, or cases without explicit cascading confirmation.

### Step 2 — Document Upload

**Purpose.** Receive the client's source documents into MGD.

**Inputs.** One or more files of the types listed in Chapter 5.

**Outputs.** Stored document records, each in an "uploaded" state pending processing.

**Dependencies.** Step 1 (client binding).

**Validation rules.** Only file types listed in Chapter 5 shall be accepted; a defined maximum file size and batch count apply (values to be confirmed during implementation sizing, per Chapter 8.1); every uploaded document shall be bound to the client established in Step 1; upload shall never silently overwrite a previously uploaded document — each upload is a distinct, retained artifact.

### Step 3 — Document Classification & Extraction (Document Intelligence)

**Purpose.** Convert each uploaded file into structured data.

**Inputs.** Stored document records from Step 2.

**Outputs.** Structured document objects: classified type, extracted tables/text, extraction confidence, source-location references.

**Dependencies.** Document Intelligence module (§3.1).

**Validation rules.** Every document shall receive a classification and an extraction confidence score; a document whose extraction confidence falls below a defined minimum shall be flagged for consultant review rather than silently included in downstream analysis at full weight; extraction failure on one document shall not block processing of the remaining documents in the same upload batch.

### Step 4 — Financial Statement Recognition (Financial Intelligence) — *conditional*

**Purpose.** For documents classified as financial statement types, produce canonical, ratio-ready financial data.

**Inputs.** Structured document objects from Step 3 classified as financial statement types (Chapter 5.1).

**Outputs.** Canonical financial statement objects; computed financial ratios and trends; financial signals.

**Dependencies.** Financial Intelligence module (§3.2); Knowledge Library (account taxonomy, industry ratio norms).

**Validation rules.** A financial statement document shall not be treated as a generic document if it is successfully classified as a financial statement type; ratio computation shall proceed on whatever statement types are available and shall explicitly mark ratios as unavailable rather than estimating them when required source statements are missing; this step is skipped (not failed) when no documents in the batch classify as financial statements.

### Step 5 — Operational Data Normalization (Operational Intelligence) — *conditional*

**Purpose.** For documents classified as operational types, compute KPIs and classify operational signals.

**Inputs.** Structured document objects from Step 3 classified as operational document types (Chapter 5.2).

**Outputs.** Computed operational KPIs with benchmark comparison; operational signals.

**Dependencies.** Operational Intelligence module (§3.3); Knowledge Library (KPI definitions, benchmarks); Industry Intelligence (industry scoping).

**Validation rules.** KPI computation shall only occur where the source data supports it directly (no fabricated KPI values); this step is skipped (not failed) when no documents in the batch classify as operational types.

### Step 6 — Signal Generation

**Purpose.** Produce the unified signal vocabulary consumed by every downstream reasoning step.

**Inputs.** Output of Steps 3–5.

**Outputs.** Typed signal list.

**Dependencies.** Signal Engine (§3.6); Industry Intelligence (vocabulary scoping).

**Validation rules.** Every signal shall carry a source reference traceable to a specific document/row/statement line (no signal without provenance); financial and operational signals shall be represented in a common structure so downstream steps do not need to distinguish their origin.

### Step 7 — Evidence Validation

**Purpose.** Determine which signals, individually or in combination, constitute sufficient evidence.

**Inputs.** Signal list from Step 6.

**Outputs.** Evidence records with corroboration strength and traceability.

**Dependencies.** Evidence Engine (§3.5); Knowledge Library (Evidence Rules).

**Validation rules.** A single, uncorroborated weak signal shall not, by itself, be classified as strong evidence; every evidence record shall retain traceability to its constituent signals and their source documents.

### Step 8 — Finding Generation

**Purpose.** Produce human-readable findings from validated evidence.

**Inputs.** Evidence records from Step 7.

**Outputs.** Finding list with category, severity, and supporting evidence.

**Dependencies.** Finding Engine (§3.7); Knowledge Library.

**Validation rules.** Per Chapter 9, every finding shall carry at least one supporting evidence reference; a finding with no supporting evidence shall not be produced.

### Step 9 — Root Cause Analysis

**Purpose.** Determine the causal explanation behind the findings.

**Inputs.** Finding list from Step 8.

**Outputs.** Root cause list with classification and causal relationships.

**Dependencies.** Root Cause Engine (§3.8); Knowledge Library.

**Validation rules.** Per Chapter 9, every root cause shall be linked to at least one supporting finding; primary/secondary/contributing classification shall follow the scoring rules defined in the Knowledge Library, applied consistently across all analyses.

### Step 10 — Confidence Scoring

**Purpose.** Quantify certainty at every level of the diagnosis before it is turned into recommendations.

**Inputs.** Output of Steps 6–9.

**Outputs.** Per-item confidence scores; top-line diagnostic confidence classification.

**Dependencies.** Confidence Engine (§3.9).

**Validation rules.** A root cause or finding below the minimum confidence threshold shall not be surfaced as a primary conclusion in the Executive Report; the top-line confidence classification shall always be present and visible in every output listed in Chapter 6.

### Step 11 — Recommendation Generation

**Purpose.** Convert root causes into prioritized, actionable guidance.

**Inputs.** Root cause list (Step 9); confidence scores (Step 10).

**Outputs.** Prioritized, sequenced recommendation list.

**Dependencies.** Recommendation Engine (§3.10); Knowledge Library.

**Validation rules.** Per Chapter 9, every recommendation shall be linked to at least one root cause; a recommendation with no diagnosed cause behind it shall not be produced.

### Step 12 — Opportunity Quantification

**Purpose.** Quantify the value of acting on the diagnosis.

**Inputs.** Root causes (Step 9), recommendations (Step 11), financial statements (Step 4, where available), Knowledge Library ratios/benchmarks.

**Outputs.** Opportunity list with estimated value, basis, and confidence.

**Dependencies.** Opportunity Engine (§3.11); Financial Intelligence; Knowledge Library.

**Validation rules.** Every opportunity estimate shall state its basis (statement-derived or benchmark-derived); an opportunity shall not be presented without a linked recommendation.

### Step 13 — AI Narrative Generation

**Purpose.** Compose the deterministic output into consulting-grade narrative.

**Inputs.** Findings, root causes, recommendations, opportunities, confidence scores (Steps 8–12).

**Outputs.** Executive narrative text.

**Dependencies.** AI Consultant (§3.13).

**Validation rules.** Per Chapter 9, the narrative shall not introduce any fact, figure, or conclusion absent from Steps 8–12's output; if AI generation is unavailable, deterministic template-based narrative composition shall be used instead, and the analysis shall not fail solely because the generative AI provider is unreachable.

### Step 14 — Report Composition

**Purpose.** Assemble every prior step's output into the canonical report object.

**Inputs.** Output of Steps 8–13.

**Outputs.** One versioned, canonical report object.

**Dependencies.** Executive Report Composer (§3.14).

**Validation rules.** The report object shall be versioned and immutable once composed — a subsequent re-run produces a new version, not a silent overwrite, preserving the historical record required by Chapter 8.6.

### Step 15 — Consultant Review & Finalization

**Purpose.** Provide the human-in-the-loop checkpoint before a report is treated as final and delivered to a client, preserving consultant accountability (Chapter 2.2).

**Inputs.** Composed report object from Step 14.

**Outputs.** A report marked Draft (editable, re-runnable) or Finalized (locked, immutable).

**Dependencies.** Consultant role (Chapter 7); Executive Report Composer.

**Validation rules.** A Finalized report shall not be modified by re-running the analysis; any correction to a Finalized report shall produce a new, separately versioned report rather than mutating history, consistent with the auditability requirement in Chapter 8.6.

### Step 16 — Delivery & Presentation

**Purpose.** Deliver the finalized diagnosis to its intended audience in the appropriate format.

**Inputs.** Finalized report object.

**Outputs.** Any of the output formats specified in Chapter 6, including Presentation Mode.

**Dependencies.** Presentation Mode (§3.15); Executive Report Composer.

**Validation rules.** Every delivered output format shall render from the same finalized report object — no output format shall be able to present information inconsistent with another.

---

## 5. Document Types Supported

### 5.1 Financial Statement Documents

- Balance Sheet
- Profit & Loss (Income Statement)
- Cash Flow Statement
- Trial Balance
- General Ledger
- Bank Statements
- Accounts Receivable / Accounts Payable Ageing

### 5.2 Operational Documents

- Inventory Reports
- Purchase Reports
- Sales Reports
- Payroll Reports
- Maintenance Reports
- Dispatch Logs
- Production Reports
- Project Reports
- Custom Excel Sheets (any structured operational spreadsheet not matching a specific category above — handled via the same classification and extraction capability as named types, per §3.1)

### 5.3 Supported File Formats

- **Excel** (.xlsx, .xls) and **CSV** — structured tabular data, including multi-sheet workbooks and sheets containing multiple sub-tables.
- **PDF** — including both text-based PDFs and, as a required V2 capability beyond V1's baseline, scanned/image-based PDFs via optical character recognition.
- **Word** (.docx) — narrative or semi-structured reports.
- **Images** (e.g. photographs or scans of physical documents, receipts, or logs) — processed via optical character recognition into extractable text/table data, a capability not present in MGD V1 and specified here as a required addition for V2.

**Validation rules.** MGD shall reject file types outside this list with a clear, client-facing message rather than a silent failure. A document that fails classification (cannot be matched to any type in §5.1/5.2 with acceptable confidence) shall still be retained and made available to the Document Intelligence module as a generic structured/text source, and shall be flagged to the consultant rather than silently excluded from analysis.

---

## 6. Outputs

MGD shall be capable of producing the following ten outputs from a completed diagnosis. Every output in this list is a rendering of the single canonical report object produced by the Executive Report Composer (§3.14) — none is an independently generated artifact, ensuring consistency across every format a client, consultant, or third party might receive.

1. **Executive Report** — the primary deliverable: full narrative, findings, root causes, recommendations, opportunity quantification, and confidence classification, in a document format suitable for formal delivery to a client.
2. **Presentation** — the boardroom-ready, navigable rendering of the Executive Report produced by Presentation Mode (§3.15), suitable for live delivery to a client's leadership team.
3. **Finding Summary** — a condensed, findings-only view for readers who need the "what," not the full causal and recommendation detail.
4. **Root Cause Analysis** — a detailed, standalone view of the diagnosed root causes, their classification (primary/secondary/contributing), causal relationships, and supporting evidence — suitable for a technically engaged reader (e.g. an operations manager) who wants the full causal reasoning.
5. **Recommendations** — a standalone, prioritized, sequenced action list, suitable for handoff to the team responsible for implementation.
6. **Opportunity Analysis** — a standalone view of quantified financial/operational value by opportunity type and basis, suitable for a financially oriented reader (e.g. a CFO, investor, or lender).
7. **Benchmark Report** — a standalone comparison of the client's KPIs and financial ratios against industry benchmarks, independent of the causal narrative — suitable for a reader who wants comparative performance context without the full diagnostic narrative.
8. **Management Dashboard** — an aggregated, portfolio-level view (across a consultant's or firm's full client book, or across a single client's history) of diagnostic activity, findings trends, and engagement status, for the Executive and Administrator roles (Chapter 7).
9. **Historical Comparison** — a comparison between a client's current diagnosis and one or more of their prior diagnoses, showing which findings/root causes have improved, persisted, or worsened — enabling MGD to demonstrate engagement impact over time, not just a single point-in-time snapshot.
10. **AI Consultant Session** — the retrievable transcript of an interactive AI Consultant session (§3.13.1), including every question asked and every cited, evidence-grounded answer given.

---

## 7. User Roles

MGD V2 defines five formal roles. This is a deliberate expansion beyond MGD V1's informal admin/client split (which conflated administration, consulting, and management-oversight into a single "admin" role, per [ARCHITECTURE.md](ARCHITECTURE.md)) into a proper role model suitable for an enterprise system serving the full user population described in Chapter 2.2.

| Role | Description | Representative capabilities |
|---|---|---|
| **Administrator** | Operates and governs the MGD system itself. | User and role management; Knowledge Library authoring/curation, including Industry Pack authoring; system-wide audit log access; full access to Administration (§3.16). Does not necessarily run client diagnostics personally. |
| **Consultant** | Runs and owns client diagnostic engagements. | Upload documents; run diagnostics; review, annotate, and override AI-assisted output; finalize reports; access all outputs (Chapter 6) for their assigned clients; use the AI Consultant Session. Cannot modify the Knowledge Library. |
| **Client** | The business being diagnosed. | View finalized outputs delivered to them; view their own historical comparisons; cannot view other clients' data, cannot view draft/unfinalized analyses, cannot access the Knowledge Library or administration functions. |
| **Executive** | Oversight role within the consulting practice or within a client organization's leadership, distinct from the operating Consultant or the diagnosed Client. | Read-only access to the Management Dashboard and finalized outputs across a scoped set of clients/engagements (e.g. a practice leader's full book, or a client-side executive's own organization); no ability to edit, run, or finalize analyses; no visibility into free-text consultant working notes. |
| **Viewer** | The narrowest role — read-only access to a specific, explicitly shared output. | View a single shared Executive Report, Presentation, or other output they have been explicitly granted access to (e.g. an investor or lender given access to one client's diagnosis for due diligence); no access to anything outside what was explicitly shared; no access to the underlying platform, other clients, or the Knowledge Library. |

**Validation rules.** A user shall hold exactly the permissions of their assigned role — no implicit privilege escalation between roles (e.g. Executive shall never implicitly gain Consultant's edit/finalize capability). Role assignment and every change to it shall be captured in the audit log (Chapter 8.6). The Client and Viewer roles shall never have access to another client's data under any configuration — this is an absolute constraint, not a default that can be relaxed by configuration, carrying forward MGD V1's institutional client-isolation rule.

---

## 8. Non-Functional Requirements

### 8.1 Performance

MGD shall process a typical single document (financial statement or operational report, tens to low hundreds of rows/pages) and return classification and extraction results within a time frame that does not disrupt an interactive consultant workflow — this is a design target to be validated and stated precisely during implementation sizing, not a number this specification fixes in advance of infrastructure decisions. A full diagnostic run (Steps 3–14 of Chapter 4) across a typical client document set shall complete within a bounded, predictable time, with progress visibility for the consultant during processing rather than an opaque wait. Performance targets shall be defined per document volume tier (small/medium/large client document sets) rather than a single blanket figure, since document volume varies enormously across MGD's client base.

### 8.2 Security

Every API surface shall require authentication; there shall be no unauthenticated diagnostic or data-retrieval endpoint in MGD V2 (a direct correction of the gap identified in MGD V1, [TECH_DEBT.md](TECH_DEBT.md) §6). Access control shall enforce the role model in Chapter 7 and the client-isolation rule at every layer, not only at the API boundary. Client documents and diagnostic data shall be encrypted at rest and in transit. Uploaded client documents shall never be committed to source control or any artifact outside the system's designated durable storage (a direct correction of the confidentiality gap identified in MGD V1, [TECH_DEBT.md](TECH_DEBT.md) §8).

### 8.3 Explainability

Every finding, root cause, recommendation, and opportunity in every output (Chapter 6) shall be traceable, on demand, back to the specific evidence, signal, and source document/row that produced it. A consultant, and where appropriate a Client, Executive, or Viewer, shall be able to ask "why does this report say this" and receive a concrete, specific answer — not a general description of MGD's methodology. This requirement is not satisfied by documentation of how MGD works in general; it requires per-instance traceability for every specific claim in every specific report.

### 8.4 Deterministic Diagnostics

Given the same input documents and the same Knowledge Library state, MGD's deterministic modules (Document/Financial/Operational Intelligence, Signal, Evidence, Finding, Root Cause, Confidence, Recommendation, and Opportunity Engines) shall produce the same output on every run. Only the AI Consultant's narrative composition (§3.13) may vary in phrasing between runs, and even then, never in the underlying facts it presents, per Chapter 9. This requirement is what makes MGD's output defensible to the external stakeholders described in Chapter 2.2 — a lender or investor must be able to trust that the diagnosis is not a matter of which run happened to execute.

### 8.5 Scalability

MGD shall support concurrent diagnostic runs across multiple clients and multiple consultants without cross-contamination of data or degraded correctness. The system shall be deployable across multiple application instances without any single-instance-only dependency (a direct correction of MGD V1's flat-file, in-process-mutex report storage, [TECH_DEBT.md](TECH_DEBT.md) §3) — all durable state shall live in shared, multi-instance-safe storage. MGD's Industry Pack framework (§3.12) shall allow new industry coverage to scale without a proportional increase in engineering effort, per the design intent stated in [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §6.

### 8.6 Auditability

Every material action — document upload, analysis run, report finalization, Knowledge Library change, role/access change — shall be recorded in an immutable audit log, capturing who performed the action, when, and what changed. A Finalized report shall never be silently altered; corrections shall always produce a new, separately versioned record (Chapter 4, Step 15). Historical reports shall remain explainable against the Knowledge Library version that produced them, per §3.4's versioning requirement, even after that knowledge has since been updated.

### 8.7 Availability

MGD's core diagnostic capability shall not depend on the availability of any single external service for its correctness — specifically, unavailability of the generative AI provider shall degrade the AI Consultant's narrative to deterministic template composition (§3.13) rather than blocking or failing the diagnosis. MGD's durable data (documents, signals, findings, root causes, reports, audit log) shall be backed up and recoverable to a defined recovery point objective, to be specified during infrastructure design, consistent with treating MGD as a production consulting platform whose loss of data is a business-critical event, not a tolerable inconvenience.

---

## 9. Product Principles

These eight principles are non-negotiable constraints on MGD V2, restated here in the specification's own terms (they correspond to, and are elaborated architecturally in, [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §2). Any feature, shortcut, or future request that would violate one of these principles requires this specification to be formally amended before implementation — it is not a judgment call to be made ad hoc during development, which is precisely how MGD V1 accumulated three diagnostic engines and four knowledge libraries.

1. **Single Diagnostic Engine.** There shall be exactly one code path from documents to findings to root causes to recommendations. MGD shall never run two independently-implemented diagnostic pipelines against the same client's data.
2. **Single Knowledge Library.** There shall be exactly one authoritative repository of Symptoms, Root Causes, Recommendations, Opportunities, KPIs, Benchmarks, Ratios, Evidence Rules, and Industry Packs. No module shall maintain its own private copy of domain knowledge.
3. **Knowledge as Data.** Domain knowledge — a root cause, a benchmark, an entire industry's coverage — is a record in the Knowledge Library, administrable without a code change or redeployment. It is never hardcoded into engine logic.
4. **AI Explains, Never Diagnoses.** Generative AI's role is limited to composing and prioritizing already-computed, deterministic facts into narrative. It shall never determine what a finding, root cause, recommendation, or opportunity *is* — only how it is *explained*.
5. **Evidence Before Findings.** No finding shall be produced without first establishing the evidence that supports it. The workflow (Chapter 4) enforces this ordering structurally — Evidence Validation (Step 7) always precedes Finding Generation (Step 8), never the reverse.
6. **Every Finding Must Have Supporting Evidence.** A finding with no linked evidence record is not a valid MGD output under any circumstance.
7. **Every Recommendation Must Link to Root Cause.** A recommendation with no linked root cause is not a valid MGD output under any circumstance — MGD does not offer generic advice.
8. **Every Root Cause Must Link to Evidence.** A root cause is only ever surfaced because specific findings and their underlying evidence support it — never because a pattern merely seems plausible without traceable support.

Together, principles 5–8 define a strict, one-directional evidence chain — **Evidence → Finding → Root Cause → Recommendation/Opportunity** — that must hold for every single artifact MGD produces, and that is the concrete mechanism by which the Explainability requirement (Chapter 8.3) is actually satisfied rather than merely claimed.

---

## 10. Future Scope

### 10.1 Purpose of this chapter

This chapter specifies MGD's intended relationship with two other Scope Optix products — **5MCS** and **YieldIQ** — at the functional level. It states what capability MGD should be able to offer them and receive from them, without specifying their internal design (which is outside this document's authority) and without creating a functional dependency that would prevent MGD from operating as a complete, standalone product in their absence.

### 10.2 Governing functional constraint

MGD shall remain fully functional as a standalone diagnostic product regardless of whether 5MCS or YieldIQ exist, are available, or are integrated at any given time. Conversely, no MGD functional requirement in this specification shall be satisfied by relying on data or logic that only 5MCS or YieldIQ can provide. Every integration point described below is additive capability, never a dependency.

### 10.3 Integration with 5MCS

MGD should be able to make its diagnostic output — findings, root causes, recommendations, opportunities, and confidence scores — available to 5MCS as a service, so that 5MCS can incorporate operational/financial diagnosis into its own workflows without reimplementing any of the reasoning capability specified in Chapter 3. Where 5MCS holds client or engagement context that would improve MGD's diagnosis (for example, prior engagement history informing which Industry Pack or benchmark set is most relevant), MGD should be able to consume that context as an input to Industry Intelligence (§3.12) — received through a defined, versioned interface, never through direct access to 5MCS's own data store.

### 10.4 Integration with YieldIQ

MGD should be able to make its Financial Intelligence and Opportunity Engine output (§3.2, §3.11) — computed ratios, trends, and quantified opportunity value — available to YieldIQ, where YieldIQ's own focus (yield/margin optimization) can build on MGD's diagnosed root causes rather than starting from raw financial data with no causal explanation behind it. Where YieldIQ produces its own analysis that would be relevant context for an MGD diagnosis (for example, a margin trend YieldIQ has already identified), MGD should be able to receive that as an additional evidence input to the Evidence Engine (§3.5), subject to the same evidence-validation rules (Chapter 9, principle 5) as evidence from any other source.

### 10.5 Functional boundary

In both cases, the boundary is functional as well as technical: MGD offers its diagnostic capability as a defined, versioned service; it does not grant either product access to its Knowledge Library for direct editing, its underlying client data store, or its internal engine logic. Nor does MGD's specification depend on any capability unique to 5MCS or YieldIQ to satisfy Chapters 3–9 of this document. This chapter records intent and functional shape only; the interface contracts themselves are an engineering deliverable, to be produced against this specification and against each product's own specification, once both exist in enough detail to be jointly designed.

---

*This is a functional specification. It defines what MGD Version 2 must do. How it is built is defined in [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) and the engineering design documents that follow this specification's approval. No implementation is authorized against this document until it has been formally reviewed and signed off.*
