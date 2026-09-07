# MGD Version 2 — Financial Intelligence Framework (FIF)

## Document Control

| Field | Value |
|---|---|
| Document | Margin Guard Diagnostics (MGD) — Financial Intelligence Framework |
| Version | 2.0 (Draft) |
| Status | **Frozen for review — pending approval. No implementation, database design, or AI prompting work may begin against this document until sign-off.** |
| Scope | Conceptual financial reasoning architecture only. Not implementation, not database design, not AI prompting. This document defines how MGD understands financial information — the structures, evidence, and reasoning path from a raw financial document to an explainable financial conclusion. |
| Prepared by | Office of the Chief Financial Architect, Scope Optix Platform |
| Related documents | Governed by [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) (approved), [02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) (approved — §3.2, §5.1 introduced Financial Intelligence's role), [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) (approved), [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) (approved — Chapter 5 introduced Financial Knowledge at Domain level; this document is its full architectural specification). Elaborates [MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §7. |

This document defines the complete Financial Intelligence architecture of MGD Version 2 — how the platform reads a financial document and turns it into an explainable, evidence-linked business conclusion. It is intended to remain the authoritative financial reasoning framework of the platform for at least twenty years, independent of which specific parsing technology, database, or AI model happens to implement it at any given time.

---

## Chapter 1 — Purpose

### 1.1 Why Financial Intelligence exists within MGD

A business's financial statements are the single most information-dense, standardized artifact it produces about itself — every figure on a Balance Sheet or Profit & Loss statement is the aggregated residue of thousands of real Transactions, Decisions, and Actions that happened elsewhere in the business ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 2). Financial Intelligence exists because that residue, read correctly, tells a diagnostician more about a business's condition per page than almost any other document type — and read carelessly, tells them something confidently wrong. FIF is the discipline that ensures MGD reads it correctly.

### 1.2 Financial statements are evidence of business behaviour

A financial statement does not cause anything, and it does not, by itself, explain anything. It is a **reflection** — a lagging, aggregated record of business behaviour that already occurred. A declining gross margin is not itself the problem; it is the financial trace left behind by whatever actually happened in the business — a supplier cost increase absorbed without a price adjustment, a production line running below capacity, a collections process that let receivables slip. FIF's job is to read that trace with precision, and to preserve, throughout every stage of processing, its connection back to the specific documents and accounts it came from (Chapter 10) — never to treat the number as a free-floating fact detached from what produced it.

### 1.3 Financial analysis alone is insufficient

Because a financial statement is a reflection, not a cause, financial analysis performed in isolation can tell an Organisation *that* something is wrong and, at best, roughly *where* — but it structurally cannot tell them *why*, because the "why" lives in operational reality that never appears on a financial statement. A margin decline could be explained by a dozen different operational conditions, and a Financial Finding that stops at "margin declined" without connecting to the operational evidence that explains it has diagnosed a symptom, not a cause. This is not a limitation FIF works around after the fact — it is why Chapter 9, Operational Correlation, exists as a first-class, mandatory stage of the framework, not an optional enrichment.

### 1.4 The governing objective

**Financial Intelligence exists to transform financial evidence into explainable business insight.** Every chapter that follows is in service of this single objective: taking raw, heterogeneous financial documents — some clean, some scanned, some in fifty different chart-of-accounts conventions — and producing conclusions that are precise, evidence-linked, confidence-scored, and fully traceable back to the documents that support them, in combination with the operational reality that explains them.

---

## Chapter 2 — Financial Intelligence Pipeline

### 2.1 The pipeline

```
Document Upload
  ↓
Document Identification
  ↓
Document Classification
  ↓
OCR (if required)
  ↓
Table Detection
  ↓
Account Recognition
  ↓
Financial Normalisation
  ↓
Cross-Document Validation
  ↓
Financial Evidence Extraction
  ↓
Financial Signals
  ↓
Financial Metrics
  ↓
Financial Ratios
  ↓
Financial Findings
  ↓
Operational Correlation
  ↓
Diagnostic Brain
```

### 2.2 A note on Signal-before-Metric ordering

This pipeline generates Financial Signals *before* Financial Metrics — the reverse of the Data Model's general dependency description, where Metric and Signal are parallel, independently-derived objects. This is a deliberate, pipeline-specific efficiency decision, not a contradiction: within FIF specifically, a Signal (a classification — "this account pattern looks like margin compression") is computed cheaply from Evidence first, and is what determines *which* Metrics are worth computing precisely next, rather than exhaustively computing every possible Ratio for every document regardless of relevance. The Data Model's general lineage rules (Evidence underlies Signal; a Metric traces to Evidence) still hold — this is a statement about processing sequence and computation targeting, not about which object depends on which for its validity.

### 2.3 Each stage

**Document Upload**
- *Purpose.* Receive a candidate financial document into FIF.
- *Inputs.* A raw uploaded file, any supported type (Chapter 3).
- *Outputs.* A stored, unprocessed document record bound to an Organisation.
- *Dependencies.* MGD's general Document Intelligence upload capability ([02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) §3.1) — FIF begins where general upload ends.
- *Validation.* File type must be within the supported set (Chapter 3).
- *Confidence factors.* None yet.
- *Failure handling.* Unsupported types are rejected with a clear message; accepted uploads always proceed regardless of eventual financial relevance.

**Document Identification**
- *Purpose.* Determine whether an uploaded document is financial in nature at all, before financial-specific classification is attempted.
- *Inputs.* Raw extracted document content.
- *Outputs.* A "financial candidate" vs. "non-financial" determination.
- *Dependencies.* General Document Intelligence text/table extraction.
- *Validation.* A document with no numeric or tabular content of financial character does not proceed further into FIF.
- *Confidence factors.* Density of financial vocabulary and currency-formatted content.
- *Failure handling.* Ambiguous documents (e.g. narrative text with incidental figures) are retained and flagged for consultant review, never silently dropped.

**Document Classification**
- *Purpose.* Determine which specific financial document type (Chapter 3) the document is.
- *Inputs.* Output of Document Identification.
- *Outputs.* A classified document type with a classification confidence score.
- *Dependencies.* Chapter 3's document-type knowledge and the Knowledge Library's classification Business Rules.
- *Validation.* Classification confidence must exceed a defined minimum to be treated as a specific type rather than "generic financial document."
- *Confidence factors.* Structural pattern match, vocabulary match, and (lowest-weighted) filename/metadata corroboration.
- *Failure handling.* Unclassifiable documents are retained as "generic financial document," available to later stages with reduced downstream confidence, never discarded.

**OCR (if required)**
- *Purpose.* Convert non-text-native content (scanned images, image-based PDFs) into extractable text and table structure.
- *Inputs.* Documents identified as image-based.
- *Outputs.* Extracted text/table content with per-element OCR confidence.
- *Dependencies.* Invoked only conditionally; text-native documents skip this stage.
- *Validation.* Recognized numeric values are cross-checked for internal arithmetic consistency (e.g. line items summing to a stated subtotal) as an OCR sanity check.
- *Confidence factors.* OCR engine confidence, image quality, layout complexity.
- *Failure handling.* Low-confidence OCR output is retained but explicitly flagged, propagating a confidence penalty through every downstream stage that touches it.

**Table Detection**
- *Purpose.* Identify and isolate the tabular structures carrying financial data, distinct from surrounding narrative text.
- *Inputs.* Extracted text/structure (native or OCR-derived).
- *Outputs.* Identified table regions with row/column structure.
- *Dependencies.* Document Classification (informs expected table shape).
- *Validation.* A detected table must show consistent row/column structure across a minimum number of rows.
- *Confidence factors.* Structural regularity, header-row identifiability.
- *Failure handling.* Documents with no detectable table proceed with table-dependent stages skipped, relying on text-derived Evidence only.

**Account Recognition**
- *Purpose.* Identify which line items in a detected table correspond to recognized financial accounts.
- *Inputs.* Detected table structure; the canonical Account taxonomy (Chapter 4; [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §5.2).
- *Outputs.* Line items mapped to canonical Financial Account categories, with per-mapping confidence.
- *Dependencies.* The Knowledge Library's Account taxonomy.
- *Validation.* Every mapping must resolve to exactly one canonical category — an ambiguous mapping is flagged, never guessed.
- *Confidence factors.* Label similarity, positional context, consistency with document type.
- *Failure handling.* Unrecognized line items are retained unmapped, excluded from Ratio computation until resolved, never silently discarded or force-mapped.

**Financial Normalisation**
- *Purpose.* Convert Account-mapped line items into the canonical, Period-scoped Financial Statement representation used by every downstream stage.
- *Inputs.* Account-mapped line items across one or more Periods.
- *Outputs.* Canonical Financial Statement objects per Period, independent of the client's original chart of accounts.
- *Dependencies.* Account Recognition; the Financial Object Model (Chapter 4).
- *Validation.* Must satisfy basic accounting-identity checks where applicable (a Balance Sheet must balance; a Trial Balance's debits must equal credits).
- *Confidence factors.* Completeness of Account Recognition; whether identity checks pass cleanly.
- *Failure handling.* A statement failing its identity check is retained with reduced confidence and an explicit discrepancy note — never silently corrected or forced to balance.

**Cross-Document Validation**
- *Purpose.* Corroborate normalized financial data across multiple documents describing overlapping reality.
- *Inputs.* Two or more normalized Financial Statements or supporting documents for the same Organisation and Period.
- *Outputs.* Corroboration results — agreement, minor variance, or material discrepancy.
- *Dependencies.* Financial Normalisation output for every document being cross-checked.
- *Validation.* A material discrepancy between independently sourced documents (e.g. reported cash vs. bank statement cash) requires explicit flagging, never averaging or silent reconciliation.
- *Confidence factors.* Number of independent corroborating sources; discrepancy magnitude.
- *Failure handling.* Discrepancies are preserved as their own Financial Evidence (Chapter 5) — "missing reconciliation" is itself diagnostic signal, not a data-quality nuisance to be hidden.

**Financial Evidence Extraction**
- *Purpose.* Produce discrete, source-traceable Financial Evidence records — the atomic facts everything downstream is built from.
- *Inputs.* Validated, normalized, cross-checked Financial Statement data.
- *Outputs.* Financial Evidence records, each traceable to a specific document, account, and Period.
- *Dependencies.* Every prior stage; this is the point FIF output becomes compatible with MGD's general Evidence object ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.4).
- *Validation.* Every record must resolve to a specific source location.
- *Confidence factors.* Inherited from every upstream stage.
- *Failure handling.* Low-confidence Evidence is recorded, never discarded, but excluded from triggering high-confidence Findings per Evidence Rule gating.

**Financial Signals**
- *Purpose.* Classify Financial Evidence into typed, business-meaningful patterns (Chapter 6).
- *Inputs.* Financial Evidence records.
- *Outputs.* Financial Signal instances.
- *Dependencies.* Chapter 6's Signal knowledge and the Knowledge Library's Financial Rules.
- *Validation.* Must reference at least one Evidence record.
- *Confidence factors.* Underlying Evidence quality/quantity; independent corroboration.
- *Failure handling.* Weak, single-source Signals are retained at low confidence rather than suppressed, so a later Diagnostic with more data can strengthen rather than rediscover them.

**Financial Metrics**
- *Purpose.* Compute specific, quantified values once a Signal has indicated a dimension is worth quantifying precisely.
- *Inputs.* Financial Signals; underlying normalized statement data.
- *Outputs.* Financial Metric instances, tied to the Signal(s) that prompted their computation.
- *Dependencies.* Financial Normalisation; Financial Signals (per §2.2's pipeline-specific ordering).
- *Validation.* Must state computation basis and source Evidence.
- *Confidence factors.* Completeness/quality of underlying normalized data.
- *Failure handling.* A Metric that cannot be computed due to missing data is marked unavailable, never fabricated or estimated at this stage.

**Financial Ratios**
- *Purpose.* Combine two or more Financial Metrics into a standard ratio (Chapter 7).
- *Inputs.* Financial Metrics.
- *Outputs.* Financial Ratio instances, compared against Benchmark Definitions where available.
- *Dependencies.* Financial Metrics; the Knowledge Library's Financial Ratio and Benchmark Definitions.
- *Validation.* Must reference the specific Metrics it was computed from.
- *Confidence factors.* Confidence of constituent Metrics; Benchmark availability.
- *Failure handling.* A Ratio requiring an unavailable Metric is itself marked unavailable, never estimated by substitution.

**Financial Findings**
- *Purpose.* Synthesize Signals, Metrics, and Ratios into discrete, human-readable Financial Findings (Chapter 8).
- *Inputs.* Financial Signals, Metrics, Ratios, and their underlying Evidence.
- *Outputs.* Financial Finding instances.
- *Dependencies.* The Financial Finding Definitions in the Knowledge Library.
- *Validation.* Must satisfy its Evidence Rule's Required Evidence and Minimum Confidence ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 7).
- *Confidence factors.* Aggregate of constituent Signal/Metric/Ratio confidence.
- *Failure handling.* A Finding whose Required Evidence is unmet does not exist for this Diagnostic — it is not produced in a diluted, low-confidence form.

**Operational Correlation**
- *Purpose.* Cross-reference Financial Findings against Operational Intelligence's Findings/Signals to identify where financial symptoms and operational conditions jointly explain a Root Cause (Chapter 9).
- *Inputs.* Financial Findings; Operational Findings/Signals.
- *Outputs.* Correlated Insight candidates.
- *Dependencies.* Both Financial and Operational Intelligence must have completed processing for the same Diagnostic.
- *Validation.* A correlation must be grounded in a defined Correlation Rule (Chapter 9), never an unexplained statistical co-occurrence.
- *Confidence factors.* Strength and independence of the two correlated Findings; whether the Correlation Rule is validated.
- *Failure handling.* Where no operational documents were provided, Financial Findings proceed to the Diagnostic Brain without correlation, explicitly flagged as financial-evidence-only.

**Diagnostic Brain**
- *Purpose.* Hand off FIF's complete output into MGD's general Root Cause, Recommendation, Opportunity, and Confidence Engines.
- *Inputs.* Financial Findings, Operational Correlation results.
- *Outputs.* Input to the Root Cause Engine and downstream engines ([MGD_V2_BLUEPRINT.md](MGD_V2_BLUEPRINT.md) §4) — FIF's own responsibility ends here.
- *Dependencies.* Every prior stage.
- *Validation.* Handoff content must conform to MGD's general Insight/Finding shape so the general engines require no FIF-specific handling.
- *Confidence factors.* Carried through unchanged.
- *Failure handling.* None specific — this is a handoff, not a computation.

---

## Chapter 3 — Supported Financial Documents

### 3.1 Financial document content types

| Document | Purpose | Typical structure | Evidence available | Common quality issues | Confidence considerations |
|---|---|---|---|---|---|
| Balance Sheet | Point-in-time financial position | Assets / Liabilities / Equity sections | Asset, Liability, Equity Balances | Unclassified "suspense" accounts; inconsistent period-end dates | Higher when audited or accountant-prepared; lower for informal management-prepared versions |
| Profit & Loss | Period financial performance | Revenue → COGS → Expenses → Net Profit | Revenue growth, Margin erosion, Cost escalation | Inconsistent categorization of one-time items | Reduced where non-recurring items are not separately identified |
| Cash Flow Statement | Actual cash movement by activity | Operating / Investing / Financing sections | Negative cash flow, Cash shortages | Often derived/indirect rather than direct method, obscuring detail | Strongest when cross-validated against Bank Statements |
| Trial Balance | Full account-level balance listing | Debit/Credit columns per account | Full Account Recognition source; discrepancy detection | Unreconciled suspense balances | High structural reliability when debits equal credits |
| General Ledger | Transaction-level detail | Chronological entries per account | Duplicate payments, transaction-level Evidence | Volume can be very large; inconsistent entry descriptions | Strong when complete; degraded by partial exports |
| Journal Entries | Manual/adjusting entries | Date, accounts, amounts, narration | Financial Governance Weakness indicators (unusual manual adjustments) | Sparse narration; late-period clustering | Confidence weighted by narration completeness and approval evidence where present |
| Chart of Accounts | The client's own account taxonomy | Account code/name listing | Basis for Account Recognition mapping | Non-standard, inconsistent, or duplicated codes | Not itself evidence of business condition — a mapping input only |
| Accounts Receivable Ageing | Outstanding customer balances by age bucket | Customer × age-bucket matrix | Receivable ageing, Customer dependency | Bucket definitions vary by provider | High when bucket totals reconcile to Balance Sheet receivables |
| Accounts Payable Ageing | Outstanding supplier balances by age bucket | Supplier × age-bucket matrix | Payable ageing, Supplier dependency | As AR Ageing, mirrored | As AR Ageing, mirrored |
| Inventory Reports | Stock levels and movement | Item × quantity/value listing | Inventory accumulation | Valuation method not always stated | Reduced where valuation basis is unclear |
| Fixed Asset Register | Capital asset listing with depreciation | Asset × cost/depreciation/net book value | Debt growth cross-reference (financed assets), Asset base evidence | Inconsistent depreciation policy application | High when maintained consistently; low for ad hoc spreadsheets |
| Bank Statements | Actual account transaction history | Chronological transaction listing | Negative cash flow, Cash shortages, Duplicate payments, cross-validation basis | Multiple accounts/currencies complicate consolidation | The primary corroborating source for Cash Flow claims — high evidentiary weight |
| Payroll | Labour cost detail | Employee/period × pay components | Cost escalation (labour), Operational Correlation input (Labour) | Sensitive data handling requirements | High for structured payroll system exports; lower for manual summaries |
| Budget vs Actual | Planned vs. realized performance | Line item × Budget/Actual/Variance | Variance evidence, early warning of Cost escalation | Budget basis not always disclosed | Reduced where Budget assumptions are undocumented |
| Sales Reports | Revenue detail by customer/product/channel | Transaction or summary listing | Revenue growth, Revenue concentration, Customer dependency | Inconsistent product/customer naming | High with consistent customer identifiers |
| Purchase Reports | Procurement detail by supplier/item | Transaction or summary listing | Supplier dependency, Cost escalation | Inconsistent supplier naming | High with consistent supplier identifiers |
| Tax Reports | Statutory tax filings/computations | Jurisdiction-specific structure | Cross-validation of Revenue/Profit figures | Jurisdiction-specific formats vary widely | High evidentiary weight given external filing obligation, but structurally hardest to normalize |
| Management Accounts | Internally prepared periodic financial summary | Similar to P&L/Balance Sheet, less formal | Revenue growth, Margin erosion, general Financial Evidence | Consistency depends entirely on internal preparation discipline | Variable; treated as P&L/Balance Sheet-equivalent once classified, with confidence reflecting preparation discipline |
| Audit Schedules | Supporting detail for audited figures | Varies by schedule type | Highest-reliability corroboration for the accounts they support | Often provided only for larger/audited clients | Highest available confidence tier when present |
| Custom Excel Financial Models | Client-built financial workbooks | Highly variable, often multi-tab | Any of the above depending on content | Formula errors, hidden assumptions, inconsistent structure | Requires the most extraction care; confidence set conservatively unless corroborated |

### 3.2 File formats and carriers

The four remaining items — **CSV, PDF, Scanned Images, Word Documents** — are file *formats*, not financial content types; any document listed in §3.1 may arrive in any of these formats.

- **CSV.** Structured, machine-readable tabular data. Generally the highest-confidence carrier for Table Detection and Account Recognition, since structure is unambiguous.
- **PDF.** May be text-native (high confidence, direct extraction) or image-based (requires OCR, Chapter 2). Confidence must be set per-document based on which case applies, never assumed uniformly.
- **Scanned Images.** Always require OCR (Chapter 2, Stage 4). Confidence is capped by OCR quality regardless of the underlying document type's usual reliability.
- **Word Documents.** Typically carry narrative financial commentary (e.g. Management Accounts prepared as a report) rather than pure tabular data — Table Detection may find little or no structure, and such documents more often contribute Evidence via text extraction than via Account Recognition.

---

## Chapter 4 — Financial Object Model

| Object | Purpose | Meaning | Relationships | Validation | Lifecycle |
|---|---|---|---|---|---|
| Financial Account | The canonical category a financial fact is classified into | e.g. "Trade Receivables," "Cost of Goods Sold" — the Account Recognition target | Belongs to an Account Group; referenced by Ledger Entry/Posting/Balance | Must belong to exactly one Account Group | Defined in the Knowledge Library's taxonomy; stable, extended not redefined |
| Account Group | A higher-level classification grouping related Financial Accounts | e.g. "Current Assets," "Current Liabilities" | Contains one or more Financial Accounts; referenced by statement structure | Must map to a recognized statement section | Stable, platform-owned taxonomy |
| Ledger Entry | A single recorded debit or credit line | The most granular financial record | Belongs to a Posting; references a Financial Account; traces to a source Document | Must reference exactly one Account, a date, and an amount | Immutable once recorded |
| Transaction | The business-level event a set of Ledger Entries represents | A sale, a payment, an accrual — specialization of the Ontology's Transaction | Composed of one or more Ledger Entries/Postings | Per [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.7 | Recorded → Immutable |
| Posting | The act of recording a Transaction into the Ledger | Connects a Transaction to its balanced Ledger Entries | Links Transaction to Ledger Entry/Entries | Total debits must equal total credits | Recorded → Immutable; correction is a new, offsetting Posting |
| Balance | The net accumulated value of an Account at a point in time | A snapshot, not a flow | Derived from all Ledger Entries for an Account up to a Period boundary | Must be reconstructable from underlying Ledger Entries (Cross-Document Validation) | Computed per Period; historical Balances retained permanently |
| Variance | The difference between an actual value and a reference value | Basis for Budget vs Actual analysis and Trend detection | References the actual value and the reference basis being compared | Must state both actual and reference basis explicitly | Computed per comparison; versioned |
| Period | The time boundary a statement/Balance/Metric is scoped to | A month, quarter, or year | Scopes every time-bound financial object | Must have defined, non-overlapping start/end dates | Defined at normalization; permanent |
| Financial Metric | A specialized Metric computed within FIF | Per Chapter 2, Stage "Financial Metrics" | Computed from Balances/Ledger Entries; feeds Financial Ratio | Must state computation basis | Computed → immutable, versioned |
| Financial Ratio | A combination of two or more Financial Metrics | Per Chapter 7 | References constituent Metrics; compared against Financial Benchmark | Must reference constituent Metrics | Computed → immutable, versioned |
| Financial Signal | A classified pattern built from Financial Evidence | Per Chapter 6 | References Financial Evidence; feeds Financial Finding | Must reference at least one Evidence record | Generated → immutable, versioned |
| Financial Finding | A synthesized, evidence-backed financial conclusion | Per Chapter 8 | References Financial Signals/Ratios/Evidence; feeds Operational Correlation/Diagnostic Brain | Must satisfy its Evidence Rule | Generated → immutable, versioned |
| Financial Benchmark | The industry-scoped target for a Financial Ratio/Metric | FIF-specific instantiation of Benchmark Definition | Referenced by Ratio/Metric comparison | Must state Metric type, scope, origin | Per Knowledge Library governance |
| Working Capital Component | A specific element comprising working capital | Receivables, payables, inventory, short-term debt | Composed of specific Financial Accounts; feeds Working Capital Ratios | Must map to a recognized working-capital-relevant Account Group | Computed per Period |
| Cash Movement | A discrete inflow or outflow of cash | Distinct from accrual-basis Transaction | Traces to Bank Statement/Cash Flow Statement | Must be corroborated against Bank Statement data where available | Recorded → immutable |
| Asset | An Account Group representing owned/controlled resources | One of the three fundamental Balance Sheet categories | Composed of Financial Accounts; component of Assets = Liabilities + Equity | Must satisfy the Balance Sheet identity check | Stable category; Balances per Period |
| Liability | An Account Group representing obligations owed | Second fundamental Balance Sheet category | As Asset, mirrored | As Asset | As Asset |
| Equity | An Account Group representing residual ownership interest | Assets minus Liabilities | As Asset/Liability | As Asset/Liability | As Asset/Liability |
| Revenue | An Account Group representing value generated from core activity | The P&L top line; basis for Margin analysis | Composed of Financial Accounts; basis for Margin/Profitability Ratios | Distinguished from non-operating income where the statement supports it | Computed per Period |
| Expense | An Account Group representing cost of generating Revenue/operating | Basis for cost-structure and Margin analysis | Composed of Financial Accounts (COGS, Operating Expense); basis for Margin/Efficiency Ratios | Classified into recognized sub-categories where supported | Computed per Period |

---

## Chapter 5 — Financial Evidence

| Evidence | Required fields | Evidence strength | Source documents | Validation rules | Confidence drivers |
|---|---|---|---|---|---|
| Revenue growth | Revenue across ≥2 comparable Periods | Strong from normalized P&L; weaker from informal sales summaries | P&L, Sales Reports, Management Accounts | Periods must be genuinely comparable in length and boundary | Number of periods; corroboration with Sales Reports |
| Margin erosion | Gross/operating margin across ≥2 Periods | Strong when Revenue and Expense both independently verified | P&L, Management Accounts | Must isolate genuine change from identifiable one-time items | Consistency of trend direction across periods |
| Negative cash flow | Operating cash flow or Bank Statement movement for the period | Strongest when Cash Flow Statement and Bank Statement corroborate | Cash Flow Statement, Bank Statements | Cross-Document Validation required against Bank Statements where available | Statement/bank corroboration |
| Inventory accumulation | Inventory Balance across ≥2 Periods, ideally with Sales/COGS trend | Strong when paired with declining Turnover | Inventory Reports, Balance Sheet | Must distinguish planned from unplanned build-up where evidence supports it | Turnover trend; Operational Correlation (Chapter 9) |
| Receivable ageing | AR Ageing buckets, ≥1 Period (≥2 for trend) | Strong when sourced directly from AR Ageing | AR Ageing, Balance Sheet | Buckets must sum to total receivables Balance | Direct AR Ageing availability vs. inference |
| Payable ageing | AP Ageing buckets, mirrored from Receivable ageing | As Receivable ageing | AP Ageing, Balance Sheet | As Receivable ageing | As Receivable ageing |
| Debt growth | Liability (debt) Balances across ≥2 Periods | Strong with schedule detail beyond aggregate Balance Sheet | Balance Sheet, General Ledger | Must distinguish new borrowing from reclassification | Availability of debt-specific schedule detail |
| Cost escalation | Expense Balances by category across ≥2 Periods | Strong with category-level (not aggregate) detail | P&L, General Ledger, Purchase Reports | Must isolate rate-based increase from volume-driven increase | Availability of per-category/per-unit detail |
| Cash shortages | Cash Balance relative to near-term obligations | Strong when corroborated by Bank Statement low-balance/overdraft events | Bank Statements, Cash Flow Statement, AP Ageing | Must be assessed against actual near-term obligations, not balance alone | Bank corroboration; frequency/recency |
| Working capital pressure | Current Asset/Liability Balances, ideally with AR/AP Ageing | Strong when multiple Working Capital Components corroborate | Balance Sheet, AR/AP Ageing, Inventory Reports | Must be assessed as Trend, not single-period snapshot | Number of corroborating components |
| Duplicate payments | Matching/near-matching payment records | Strong with exact match across two independent sources | General Ledger, Bank Statements, Purchase Reports | Requires corroboration across ≥2 independent sources before surfacing, given sensitivity | Match precision; independent-source corroboration |
| Missing reconciliations | An expected corroboration that could not be completed | Reflects clarity of the expectation, not a magnitude | Any pair of documents expected to reconcile | Must specify which two records were expected to reconcile | Materiality of unreconciled amount |
| Revenue concentration | Revenue by customer/channel, ≥1 Period | Strong with customer-level detail | Sales Reports, Management Accounts | Concentration measured against total Revenue for the same period | Granularity of customer-level detail |
| Supplier dependency | Purchase volume by supplier, ≥1 Period | Strong with detailed Purchase Reports | Purchase Reports, General Ledger | Dependency measured against total purchase volume for the same period | Granularity; corroboration with Operational Knowledge (Procurement) |
| Customer dependency | Same structure as Revenue concentration | Emphasis on single-relationship exposure risk | Sales Reports, Management Accounts | As Revenue concentration | As Revenue concentration |

---

## Chapter 6 — Financial Signals

### 6.1 The ten signals

| Signal | Meaning | Typically triggered by |
|---|---|---|
| Liquidity stress | Declining ability to meet short-term obligations | Cash shortages + Working capital pressure |
| Margin compression | Sustained margin decline | Margin erosion across ≥2 periods |
| Operating cost inflation | Costs rising faster than revenue/volume | Cost escalation |
| Inventory build-up | Inventory accumulating relative to sales/turnover | Inventory accumulation |
| Revenue instability | Inconsistent or volatile revenue pattern | Erratic Revenue growth pattern, or Revenue concentration + Customer dependency |
| Cash conversion deterioration | Lengthening gap between accrual profit and cash realization | Negative cash flow + Receivable ageing |
| Over-reliance on debt | Increasing dependency on borrowed capital | Debt growth |
| Supplier concentration | Operational and financial exposure to few suppliers | Supplier dependency |
| Working capital deterioration | Composite decline across working capital components | Working capital pressure + Receivable/Payable ageing |
| Profit quality concerns | Reported profitability not corroborated by cash generation | Missing reconciliations, Duplicate payments, or profit/cash divergence |

### 6.2 Signal generation rules

A Financial Signal is generated only when its governing Evidence Rule ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 7, a Financial Rule per Chapter 5's Business Rule category) is satisfied by Financial Evidence present in the current Diagnostic — never asserted from unstructured pattern-matching without a governing, versioned rule behind it, consistent with "Knowledge is data, not code."

### 6.3 Signal severity

Severity follows the general Insight severity classification ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §3.4), driven primarily by magnitude relative to a Benchmark and by Trend direction — a Signal at identical absolute magnitude is classified more severely if it is trending toward a Benchmark breach than if it is stable.

### 6.4 Signal confidence

Computed per the Confidence Model ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 7), driven specifically by the underlying Evidence's quality and quantity and by whether Cross-Document Validation (Chapter 2) corroborated it.

### 6.5 Signal persistence

Whether a Signal detected in one Diagnostic continues to be detected in a subsequent Diagnostic for the same Organisation. A persistent Signal generally warrants higher severity/urgency treatment than a first-occurrence Signal, since persistence is itself evidence the underlying condition has not been addressed — directly feeding Recommendation tracking ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 8, Consultant Memory).

### 6.6 Signal history

The retained, versioned record of every Signal instance generated for an Organisation across its full Diagnostic history — never overwritten ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 7) — forming the basis for Trend, Persistence, and eventual Maturity assessment ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 8).

---

## Chapter 7 — Financial Ratios

### 7.1 The eleven categories

No formulas are specified in this chapter — only conceptual architecture, consistent with this document's scope.

| Category | Conceptual scope |
|---|---|
| Liquidity | Short-term obligation coverage capability |
| Profitability | Return generation relative to revenue, assets, or equity |
| Efficiency | How effectively assets/resources convert into revenue |
| Leverage | Reliance on debt financing and associated risk |
| Activity | How actively assets/resources cycle through operations (e.g. days-based turnover measures), distinguished from Efficiency by its process-cycle framing |
| Cash Flow | Actual cash generation/consumption, distinct from accrual profitability |
| Growth | Rate of change in key financial measures over time — the ratio framework's direct expression of Trend |
| Working Capital | Short-term operating capital adequacy specifically, a focused sub-domain of Liquidity |
| Return Ratios | Returns to capital providers specifically (e.g. return on assets, equity, invested capital) |
| Investment Ratios | Measures relevant to evaluating the Organisation as an investment — the category most directly serving the investor audience ([02_MGD_FUNCTIONAL_SPECIFICATION.md](02_MGD_FUNCTIONAL_SPECIFICATION.md) Chapter 2) |
| Operational Ratios (boundary category) | Ratios combining financial and operational data (e.g. revenue per employee, cost per unit produced) — computed jointly by Financial and Operational Intelligence, the explicit bridge into Chapter 9 |

### 7.2 Purpose

The Ratio framework exists to convert raw Financial Metrics into standardized, comparable measures of financial condition. A single Metric in isolation — "current assets: 500,000" — carries little interpretive meaning on its own; a Ratio — "current ratio: 1.8" — is immediately interpretable against a known range.

### 7.3 Interpretation

A Ratio's meaning is never read from its value alone. It requires two context layers: Benchmarking (how does this compare to what is expected) and Historical Comparison (how does this compare to where this Organisation was before). A Ratio with neither context is an isolated number, not yet a Financial Signal.

### 7.4 Benchmarking

Every Ratio category is compared against Benchmark Definitions ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §3.5), scoped by the active Industry Pack(s). The identical Ratio computation, applied to a Manufacturing client and a Professional Services client, is compared against two different targets, via the Knowledge Library's Override mechanism (§4.3).

### 7.5 Industry adjustments

Beyond simple target-value differences, some Ratio categories carry fundamentally different interpretive weight by industry — Inventory-related Activity ratios matter intensely for Manufacturing and Retail, negligibly for Professional Services; Leverage ratios carry different "normal" ranges for capital-intensive industries (Energy, Manufacturing) than for asset-light ones (Professional Services). Industry Packs express this via Industry Rules on the relevant Benchmark and via downstream Finding/Root Cause weighting, never by redefining the Ratio's own computation.

### 7.6 Confidence

A Ratio's confidence derives from its constituent Financial Metrics' confidence (itself derived from Financial Evidence quality) and is further reduced if it requires data spanning documents Cross-Document Validation flagged as discrepant.

### 7.7 Historical comparison

Every Ratio is retained across every Diagnostic for an Organisation ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 8, Consultant Memory), enabling Trend and Baseline comparison ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 7). A Ratio's single-period value is a fact; its multi-period trajectory is where Financial Intelligence's real diagnostic power lives — a "normal" ratio trending toward a Benchmark breach is frequently more actionable than a currently-breaching ratio that has been stable for years.

---

## Chapter 8 — Financial Findings

### 8.1 How Financial Findings differ from Operational Findings

Financial Findings and Operational Findings are the **same Insight subtype** at the platform level ([00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) §3.16, [03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) §2.7) — the distinction is a Knowledge Domain distinction, not a difference in object type or governance. What differs is their evidentiary basis (financial statement data vs. operational document/log data) and what they directly describe: the state of the Organisation's financial condition, not the state of a specific Process or Activity. A Financial Finding is further distinguished by a structural fact: it is frequently a **symptom**, and — per Chapter 1's founding claim — cannot on its own explain *why* it is occurring. That explanation, where one exists, is what Chapter 9 exists to supply.

### 8.2 The ten Financial Findings

| Finding | Evidence requirements | Signal requirements | Confidence | Business impact | Operational implications |
|---|---|---|---|---|---|
| Liquidity Risk | Cash shortages, Working capital pressure | Liquidity stress | Substantiated requires Bank Statement corroboration | Inability to meet near-term obligations; potential going-concern implications | Frequently traces to collections/dispatch/procurement timing issues |
| Margin Deterioration | Margin erosion, Cost escalation | Margin compression, Operating cost inflation | Substantiated requires ≥2 comparable periods | Eroding profitability even at stable or growing revenue | Frequently traces to manual/inefficient processes, rework costs, or unmanaged supplier cost pass-through |
| Inventory Capital Lock-up | Inventory accumulation | Inventory build-up | Substantiated requires Turnover trend corroboration | Working capital tied up in unsold/excess stock | Traces to warehouse/production planning bottlenecks (Chapter 9 worked example) |
| Cash Flow Instability | Negative cash flow, Cash shortages | Cash conversion deterioration | Substantiated requires Bank Statement corroboration | Unpredictable ability to fund operations | Traces to dispatch/billing/collections timing misalignment |
| Receivable Collection Weakness | Receivable ageing | Cash conversion deterioration, Working capital deterioration | Substantiated requires direct AR Ageing document | Delayed cash realization from completed sales | Traces to invoicing delays, dispatch confirmation failures, or weak collections process (Chapter 9 worked example) |
| Excessive Debt Exposure | Debt growth | Over-reliance on debt | Substantiated requires Balance Sheet plus schedule detail | Elevated financial risk, interest burden, covenant exposure | Frequently traces to capital-intensive growth outpacing organic cash generation |
| Working Capital Constraint | Working capital pressure, Receivable/Payable ageing | Working capital deterioration | Substantiated requires multiple corroborating Working Capital Components | Constrained ability to fund operations without external financing | Composite; typically traces to a combination of inventory, collections, and payment-term issues |
| Poor Profit Quality | Missing reconciliations, Duplicate payments, profit/cash divergence | Profit quality concerns | Heightened rigor per Chapter 5's Fraud Indicators caution | Reported profitability may not reliably indicate true financial health | Traces to Financial Governance Weakness or process breakdowns generating unreconciled transactions |
| Financial Governance Weakness | Missing reconciliations, Duplicate payments, unusual unmapped-entry rates | Profit quality concerns (shared trigger) | Always framed as "warrants investigation," never asserted as confirmed irregularity | Elevated risk of undetected error or irregularity | Traces to control-process maturity ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 8) rather than a single cause |
| Funding Dependency | Debt growth, Cash shortages, or working-capital facility reliance | Over-reliance on debt, Liquidity stress | Substantiated requires multi-period Debt growth trend | Reduced strategic flexibility; vulnerability to financing conditions | Frequently traces to underlying operational cash-generation weakness the Funding Dependency symptom is masking |

---

## Chapter 9 — Operational Correlation

This is the most important chapter in this document, because it is the mechanism that fulfills MGD's founding claim in Chapter 1: financial analysis alone is insufficient, and Operational Correlation is precisely what makes it sufficient.

### 9.1 Why correlation is mandatory, not optional

A Financial Finding states a condition. It very rarely, on its own, constitutes a Root Cause, because a Root Cause is a causal explanation, and the cause of a financial condition is almost never itself financial — it is operational. Without Operational Correlation, the Root Cause Engine faces two bad options when given a Financial Finding alone: either it fails to produce sufficient evidence to name any Root Cause (correctly, but unhelpfully, per the mandatory Evidence Chain), or — the outcome this framework is specifically designed to prevent — it produces a plausible-sounding Root Cause that merely restates the Financial Finding in different words ("Root Cause: declining margin," when margin decline is the *symptom* being explained, not an explanation of anything). Operational Correlation is what allows MGD to instead name an actual, independently-evidenced operational cause.

### 9.2 The Correlation Rule

A **Correlation Rule** is a specialization of Knowledge Rule ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §3.15's family) that pairs a specific Financial Signal or Finding pattern with a specific Operational Signal or Finding pattern, and defines what Root Cause their joint presence, with independently sourced evidence for each, substantiates. Like every other Knowledge Object, a Correlation Rule is governed under Chapter 10 of the Knowledge Library — authored, reviewed, approved, versioned, never hardcoded and never silently inferred by an algorithm without passing through that governance.

### 9.3 Worked examples

**Inventory growth + Warehouse bottlenecks = Inventory Visibility Weakness.** The Financial side (Inventory Capital Lock-up, §8.2, driven by Inventory accumulation Evidence from Inventory Reports and Balance Sheet data) states that capital is tied up in stock. Taken alone, this could mean anything — overordering, slowing sales, obsolescence, or a warehouse operations problem. The Operational side (a Warehouse-domain Finding, [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) §6.2, evidenced independently from warehouse logs or dispatch records showing put-away delays, misplaced stock, or picking inefficiency) corroborates a specific mechanism: the business cannot see or move its own inventory efficiently, so more of it accumulates than operations can process. Together, and only together, they substantiate a named Root Cause — **Inventory Visibility Weakness** — that neither Finding alone could support with adequate evidence.

**Declining margins + Manual processes = Operational Efficiency Risk.** The Financial side (Margin Deterioration, evidenced by Margin erosion and Cost escalation from the P&L) states that profitability is eroding. The Operational side (a Workflow- or Process-domain Finding evidencing manual, undocumented handoffs — e.g. from consultant field observation corroborated by process-cycle-time data, or from an absence of system-driven Activity records where automation would normally leave a trail) corroborates a specific mechanism: cost is escalating because labour-intensive manual work is absorbing cost that a more efficient process would not. Together they substantiate **Operational Efficiency Risk** as the Root Cause, rather than leaving "margin declined" unexplained.

**Late collections + Dispatch failures = Revenue Fulfilment Risk.** The Financial side (Receivable Collection Weakness, evidenced by Receivable ageing showing lengthening collection cycles) states that cash realization from sales is slow. The Operational side (a Dispatch-domain Finding evidencing delivery confirmation delays or failed/incomplete dispatch events) corroborates a specific mechanism: collections are slow not because of a collections-process failure per se, but because invoicing and payment terms cannot start their clock until dispatch is confirmed, and dispatch itself is unreliable. Together they substantiate **Revenue Fulfilment Risk** — a materially different, and more actionable, Root Cause than "improve collections" would have been on financial evidence alone.

### 9.4 The general pattern: financial symptoms become operational root causes

Each worked example follows the same shape: a Financial Finding names a condition; an independently-evidenced Operational Finding names a mechanism; a Correlation Rule, defined in advance and governed like any other knowledge, states that the two together substantiate a specific, named Root Cause. This is the concrete data-flow instantiation of [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 2's claim that financial reality (Documents, Evidence) and operational reality (Processes, Activities) both terminate in the same Insight layer — Operational Correlation is where that convergence actually happens for MGD's diagnostic reasoning.

### 9.5 Correlation confidence mechanics

A correlation's confidence depends on three factors: **independence** — the two Evidence streams must come from genuinely separate source documents, never the same document interpreted two different ways, since two readings of one document is corroboration of nothing; **temporal alignment** — the two Signals must coincide within the same or a causally plausible Period, not be drawn from unrelated timeframes; and **rule validation status** — whether the specific pairing is an approved, governed Correlation Rule (highest confidence) versus a novel, AI-surfaced candidate correlation not yet validated, which per [04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 11 is flagged as a non-authoritative suggestion routed through the standard governance workflow, never published as a Root Cause on its own authority.

### 9.6 Correlation is bidirectional

Operational Correlation is not merely "operations explains finance." Financial trends also help contextualize and prioritize which operational conditions matter most: a maintenance backlog (Operational) matters more, and is surfaced with higher priority, when it is correlated with a margin-eroding cost trend (Financial) than when the same backlog exists with no corresponding financial consequence yet visible. Both directions of evidence reinforcement are genuine, governed Correlation Rules under this framework — not a one-way explanatory service financial analysis receives from operational analysis, but a mutual evidentiary relationship between the two Knowledge Domains.

---

## Chapter 10 — Explainability

Every Financial Finding must be able to answer the following seven questions on demand, in full, without exception:

1. **Which documents?** Traceable to the specific Document record(s) (Chapter 3) the Finding's Evidence was extracted from.
2. **Which accounts?** Traceable to the specific Financial Account(s) (Chapter 4) involved, via Account Recognition.
3. **Which ratios?** Traceable to the specific Financial Ratio(s) (Chapter 7) that contributed, where applicable.
4. **Which evidence?** Traceable to the specific Financial Evidence record(s) (Chapter 5) underlying it.
5. **Which signals?** Traceable to the specific Financial Signal(s) (Chapter 6) it was synthesized from.
6. **Why this confidence?** Traceable to the specific Confidence inputs ([03_MGD_DATA_MODEL.md](03_MGD_DATA_MODEL.md) Chapter 7) that produced its score — evidence quality, quantity, cross-document corroboration, and the rest.
7. **Why this recommendation?** Traceable, where a Recommendation followed, to the specific Root Cause — and, where Operational Correlation applied, the specific Correlation Rule and its paired Operational Finding — that the Recommendation responds to.

**Every financial conclusion must be fully traceable**, without exception, on demand, for the life of the Diagnostic that produced it — this is not a reporting-layer feature added after the fact; it is a direct consequence of every stage in Chapter 2 preserving its inputs and sources, and every object in Chapter 4 carrying the relationships this chapter's seven questions depend on.

---

## Chapter 11 — Future Vision

### 11.1 Financial Intelligence as a platform-level service

Financial Intelligence is architected, from this document forward, to become one of the core intelligence services of the Scope Optix Platform — not a capability permanently embedded inside MGD alone. The Financial Object Model (Chapter 4), the Financial Knowledge categories (Evidence, Signals, Ratios, Findings), and the processing pipeline (Chapter 2) are deliberately generic to any product that needs to understand a business's financial statements, not specific to MGD's particular diagnostic use of them.

### 11.2 Serving MGD, 5MCS, YieldIQ, and future products without duplication

Consistent with the platform-founding discipline established in [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) Chapter 9 — **shared vocabulary, never shared ownership** — FIF is intended to eventually serve MGD, 5MCS, YieldIQ, and future Scope Optix products through the same mechanism the Ontology specifies for any shared capability: a stable, versioned service boundary (computed Financial Ratios, Financial Findings, and Financial Evidence, all expressed in this document's object model), never a shared database, never direct access to another product's internals. YieldIQ's yield/margin optimization focus is a natural consumer of FIF's Financial Ratio and Trend output specifically; a future 5MCS engagement-management capability is a natural consumer of Financial Findings as one input among several into a longer-horizon Decision/Action record. Neither dependency is required for MGD to function, and FIF's own correctness never depends on either product existing.

### 11.3 Why this avoids duplicating business logic

The alternative — each product implementing its own financial-statement parsing, its own ratio computation, its own Benchmark library — is exactly the failure this entire document series exists to prevent, restaged at the platform level instead of within a single product ([04_MGD_KNOWLEDGE_LIBRARY.md](04_MGD_KNOWLEDGE_LIBRARY.md) Chapter 1's founding argument, applied here to financial reasoning specifically). A single, well-governed Financial Intelligence Framework, consumed rather than reimplemented, is what makes it possible for Scope Optix to eventually say the same thing about a business's financial condition regardless of which product a client happens to be using — the same guarantee [00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md](00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md) makes for business language in general, now made concrete for the specific domain most consequential to how Scope Optix's products are trusted: the accuracy of what they say about money.

---

*This is a conceptual financial reasoning architecture. It defines how MGD understands financial information — not implementation, not database design, not AI prompting. No engineering, parsing, or AI integration work is authorized against this document until it has been formally reviewed and signed off.*
