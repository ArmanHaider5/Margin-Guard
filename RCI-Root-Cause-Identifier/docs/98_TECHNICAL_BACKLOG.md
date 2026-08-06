# Technical Backlog — Scope Optix Platform

## Document Control

| Field | Value |
|---|---|
| Document | Scope Optix Platform — Technical Backlog |
| Status | **Living record.** Accepted items are appended with a stable `DP-NNN` (Document Parser) / future-module-prefixed id, never renumbered or deleted once assigned; a completed item is marked Done in place, not removed. |
| Scope | Concrete, accepted follow-up work identified during implementation — gaps in coverage or capability that were deliberately deferred, with an explicit reason, rather than silently left unstated. Distinct from `docs/99_ARCHITECTURE_DECISIONS.md`, which records *decisions*, not open work. |
| Related documents | [server/v2/document-parser/MIGRATION.md](../server/v2/document-parser/MIGRATION.md) (source of DP-001–DP-003), [99_ARCHITECTURE_DECISIONS.md](99_ARCHITECTURE_DECISIONS.md) |

Every item below was surfaced honestly at the point a module was declared complete, per the platform's own explainability standard applied to its own development process: a "frozen" module may still have accepted, non-blocking backlog against it, as long as that backlog is written down, not implied by silence.

---

## DP-001 — Dedicated unit tests for seven Document Parser services

**Status.** Accepted, not blocking.

**Context.** [`server/v2/document-parser/MIGRATION.md`](../server/v2/document-parser/MIGRATION.md) records that seven of the Document Parser Framework's thirteen services — `LayoutAnalyzer`, `SectionDetector`, `TableDetector`, `DocumentQualityEvaluator`, `DocumentModelBuilder`, `StructuredDocumentBuilder`, `EvidenceObjectBuilder` — are currently exercised only indirectly, through the full-pipeline regression suite (`document-parser/__tests__/regression/full-pipeline.test.ts`), not through dedicated, isolated unit test files of their own (unlike `FileTypeDetector`, `EntityExtractor`, `TerminologyNormalizer`, and `ConfidenceEvaluator`, which do have one).

**What's owed.** One `__tests__/stages/*.test.ts` file per remaining service, covering that service's own unit-level behaviour, failure handling, and edge cases in isolation from the rest of the pipeline — the same pattern already established for the four services that have this today.

**Why it does not block.** The regression suite already exercises every one of these seven services' real behaviour end-to-end against real files, and all sixty-eight existing tests pass. This is a coverage-*isolation* gap (harder to pinpoint which specific service regressed from a failing regression test alone), not a coverage-*existence* gap.

---

## DP-002 — Performance smoke suite

**Status.** Accepted, not blocking.

**Context.** `server/v2/tests/document-parser/` was scoped from Milestone 1 onward to hold three categories of whole-module test: repeatability (built, per ADR-010), compatibility (built, via the adapter test suite), and performance smoke (not built). No baseline exists yet for how `parseDocument()`'s wall-clock time scales with document size (row count, sheet count, PDF page count).

**What's owed.** A performance-smoke test file establishing a rough, documented time budget per file-type/size tier, run as part of the standard suite, that fails loudly if a future change regresses processing time by an order of magnitude — not a rigorous benchmarking harness, a smoke-level guardrail.

**Why it does not block.** No performance problem has been observed; every real-file regression test in the current suite completes in well under a second. This is a preventive guardrail for future regressions, not a response to a known issue today.

---

## DP-003 — OCR / scanned document framework

**Status.** Accepted, not blocking.

**Context.** Document Parser Framework Sprint 1 was explicitly scoped to text-native inputs only (xlsx, csv, docx, PDF), per the original sprint plan and restated in `MIGRATION.md`. `FileTypeDetector` already recognizes `image` as a `FileType`, and `RawContentExtractor`'s parser dispatch is a `ParserRegistry`/`ParserManifest`-based plug-in mechanism specifically so that adding an OCR-backed extractor is a new registration, not a redesign of the pipeline.

**What's owed.** A `DocumentContentParser` implementation (and, where scanned-PDF support is desired, an OCR fallback path inside `PdfParser` or a sibling parser) capable of extracting text/table structure from image-based input, registered against the `image` file type and, optionally, against scanned PDFs currently handled by `PdfParser`'s text-native-only path.

**Why it does not block.** This is new capability, not a defect — the Document Parser Framework is frozen (per the freeze directive accompanying this backlog entry), and per that freeze, this item may only be picked up under a future Architecture Decision Record authorizing the extension, not as an ordinary bug-fix-scope change.

---

## DP-004 — Ontology Registry compiler

**Status.** Accepted, not blocking.

**Context.** `server/v2/knowledge/ontology-terms-data.ts` is a hand-authored TypeScript data file transcribing 46 terms from `docs/00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md` and `docs/05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`'s Financial Object Model — accepted as an explicit, stated exception to "Knowledge is data, not code" (ADR-003), with a documented promotion path into the real Knowledge Library once it exists. Every addition or change to this term set today requires a manual, hand-written edit to a TypeScript array, with no automated check that it stays faithful to the approved architecture documents it claims to be transcribed from.

**What's owed.** A compiler/validation tool — run in CI or on demand — that either (a) generates `ontology-terms-data.ts` from a more structured source (e.g. a YAML/JSON authoring format closer to the Knowledge Library's eventual shape) rather than hand-written TypeScript, or (b) at minimum, validates that every `sourceReference` in the existing file resolves to a real section of an existing approved document, catching drift (a renamed section, a removed chapter) automatically instead of relying on manual review.

**Why it does not block.** The current hand-authored registry is correct today (verified by the `TerminologyNormalizer`/`OntologyRegistry` test suite) and small enough (46 terms) to review by hand. This becomes more valuable as the term set grows across future Financial Intelligence and Operational Intelligence sprints, but is not required for either to proceed.

---

## LC-001 — Current-asset/liability line-item summation without an explicit subtotal row

**Status.** Accepted, not blocking.

**Context.** `server/v2/financial-intelligence/capabilities/liquidity/current-asset-liability-builder.ts`, built during the Liquidity Capability Pack milestone, constructs a `current`-classified `Asset`/`Liability` only from a row whose label explicitly matches a "Total Current Assets"/"Total Current Liabilities"-shaped subtotal. A source balance sheet that lists individual current-asset/liability line items (Cash, Receivables, Inventory, Trade Payables, ...) without ever presenting an explicit "Total Current ..." subtotal row produces no `Asset`/`Liability` at all for that document, and therefore no `current_ratio`.

**What's owed.** A chart-of-accounts-aware (or at minimum, a documented, tested "sum rows between two known statement-section boundaries") strategy for identifying which individual line items belong to the current-asset/liability grouping when no explicit subtotal is present, without risking double-counting when a subtotal *is* also present.

**Why it does not block.** Requiring an explicit subtotal row is a real, common convention in professionally-prepared balance sheets (the exact documents this platform targets first), and the alternative — guessing which line items are "current" from label text alone — risks silent misclassification, which this platform's stated principles (ADR-002, "never guesses") treat as worse than a documented gap.

---

## LC-002 — Current Ratio preferred range is a hardcoded heuristic, not a Benchmark object

**Status.** Accepted, not blocking.

**Context.** `server/v2/financial-intelligence/capabilities/liquidity/current-ratio-below-range-calculator.ts` uses `PREFERRED_CURRENT_RATIO_MINIMUM = 1.5`, a widely-cited financial-analysis convention, not a value sourced from any Scope Optix approved document. `00_SCOPE_OPTIX_BUSINESS_ONTOLOGY.md` §3.21 names "Benchmark" as a first-class future Knowledge object (`category: "ontology-core"`, synonyms `["Target", "Standard"]`), but no such object, registry, or versioning mechanism exists yet — every future Capability Pack's Observation calculators will hit this same gap (a "healthy margin," a "healthy debt-to-equity," etc.).

**What's owed.** A real Benchmark object/registry in `knowledge/` (per ADR-003, "Knowledge is data, not code") — versioned, industry/segment-adjustable where the Ontology eventually supports it — that Observation calculators consult instead of an in-code constant.

**Why it does not block.** 1.5 is a defensible, disclosed, industry-standard default, and the calculator's behavior is fully deterministic and tested against it. This becomes more valuable as more Capability Packs each introduce their own hardcoded threshold; addressing it once, generically, is better deferred until that pattern is visible across 2–3 packs rather than designed prematurely against one.

---

## PC-001 — Revenue/Expense line-item summation without an explicit subtotal row; unclassified Expense rows

**Status.** Accepted, not blocking.

**Context.** `server/v2/financial-intelligence/capabilities/profitability/revenue-expense-builder.ts`, built during the Profitability Capability Pack milestone, generalizes LC-001's limitation: Revenue and Operating Expenses each require an explicit "Total Revenue"/"Total Operating Expenses"-shaped subtotal row (COGS does not, since a single "Cost of Goods Sold" line is conventionally already the total — a deliberate asymmetry, disclosed in that file's comments). A source P&L that lists individual revenue streams or individual operating-expense line items without ever presenting an explicit subtotal produces no `Revenue`/operating `Expense` object for that document. Separately, an Expense row matching neither the COGS nor the Operating Expenses label pattern (e.g. Interest Expense, Tax Expense, Depreciation shown outside either heading) is never constructed as an `Expense` object at all, regardless of subtotal — it is simply excluded from every downstream Metric.

**What's owed.** The same chart-of-accounts-aware strategy LC-001 already calls for, extended to cover a P&L's full Expense breakdown (interest, tax, depreciation, and any other category beyond COGS/Operating) rather than only Balance Sheet current-asset/liability groupings.

**Why it does not block.** Same reasoning as LC-001: requiring an explicit subtotal is a common, professionally-prepared-statement convention, and guessing line-item classification from label text alone risks silent misclassification (ADR-002).

---

## PC-002 — Net Margin and Operating Margin are currently mathematically identical

**Status.** Accepted, not blocking.

**Context.** `server/v2/financial-intelligence/ratios/financial-ratio-definitions.ts`'s `net_margin` and `operating_margin` both resolve to `net_profit ÷ total_revenue` (`capabilities/profitability/profitability-ratio-calculators.ts`). This platform's Financial Object Model does not yet distinguish operating Expense from non-operating Expense (interest, tax) — see PC-001 — so there is no separate "Operating Profit" figure (Gross Profit minus *only* operating expenses, before interest/tax) to divide instead of Net Profit. In any real business with material interest or tax expense, genuine Operating Margin and Net Margin diverge; this platform currently cannot show that divergence.

**What's owed.** An "Operating Profit" Financial Metric, fed by an Expense classification layer that separates operating from non-operating items (interest, tax) — likely arriving as part of PC-001's fix, since both require the same underlying Expense-classification work.

**Why it does not block.** Both ratios are individually correct given today's inputs, fully deterministic, and their current equivalence is documented in three places (this entry, the ratio registry's doc comment, and `financial-intelligence/README.md`) rather than silently presented as if they were genuinely distinct.

---

## PC-003 — Period-over-period trend Observations remain unimplemented

**Status.** Accepted, not blocking.

**Context.** `financial-observation-definitions.ts`'s `gross_margin_declined`, `expense_growth_outpaced_revenue`, and `working_capital_weakened` (all registered before any real calculator existed for their category) describe a period-over-period trend ("declined compared with previous periods," "increased faster than revenue"). No `ObservationCalculator` implements any of the three — the Profitability and Working Capital Capability Packs instead added single-period "negative"/"below zero" definitions (`gross_margin_negative`/`net_margin_negative`/`operating_margin_negative`/`working_capital_ratio_negative`) that are computable today. The underlying gap is platform-wide, not specific to any one pack: `RatioCalculationContext`/`ObservationCalculationContext` currently carry only one period's `FinancialMetric[]`/`FinancialRatio[]`, with no mechanism for comparing a document's current-period figures against a prior period's.

**What's owed.** A multi-period extension to the calculation-context contracts (likely requiring a document-set or history input, not just a single `StructuredDocument`) sufficient to compute genuine period-over-period comparisons, at which point `gross_margin_declined`/`expense_growth_outpaced_revenue` (and any future pack's equivalent trend-shaped Observations) become implementable as originally worded.

**Why it does not block.** Every Capability Pack built so far operates on a single document/period, which is a complete, real, useful capability on its own (a snapshot assessment) — trend analysis is additive future work, not a prerequisite.

---

## PC-004 — Evidence-chain resolution duplicated between Capability Packs

**Status.** **Resolved**, in the "shared internals" refactoring milestone between Cash Flow and Working Capital. Kept here (rather than deleted) as the historical record of the decision, per this document's own "a completed item is marked Done in place, not removed" rule.

**Context.** `capabilities/liquidity/liquidity-evidence-generator.ts`, `capabilities/profitability/profitability-evidence-generator.ts`, and `capabilities/cash-flow/cash-flow-evidence-generator.ts` had each contained their own, near-identical `resolveEvidenceObjectIds()` function (walking Observation → Ratio → Metric → FinancialObject → EvidenceObject) rather than sharing one implementation.

**What was done.** Extracted into `financial-intelligence/internal/capability-support/evidence-chain-resolver.ts`'s `EvidenceChainResolver` class, generic over `EvidenceLinkedFinancialObject` (`{ id, evidenceObjectIds }`) — every Financial Object Model type already satisfied this shape structurally, so no per-pack adapter was needed. All three existing generators were updated to use it (verified behaviour-preserving: the full pre-existing test suite passed unmodified immediately after), and Working Capital's new generator (fourth pack) was built on it directly from the start.

**Resolution note.** While applying the resolver, a genuine pre-existing defect was found in Cash Flow's evidence chain — see CF-004.

---

## CF-001 — Cash Flow Capability Pack does not distinguish Operating from Investing/Financing activities

**Status.** Accepted, not blocking.

**Context.** `capabilities/cash-flow/cash-movement-builder.ts` treats every constructed `CashMovement` as Operating-scoped — it does not parse a Cash Flow Statement's three labeled sections (Operating, Investing, Financing Activities) separately. As a direct consequence, `operating_cash_flow` and `net_cash_flow` (`cash-flow-metric-calculators.ts`) are computed identically today, mirroring PC-002's Net/Operating Margin equivalence for the same class of reason: the underlying data this platform extracts is not yet broken down finely enough to make the two figures diverge.

**What's owed.** Section-aware table parsing (recognizing "Cash Flow from Operating Activities" / "...Investing..." / "...Financing..." as distinct table regions or column groupings) so `CashMovement` can carry a section field, at which point `operating_cash_flow` can be computed from Operating-section movements only, genuinely distinct from `net_cash_flow` (all sections combined).

**Why it does not block.** Every real-world source document this platform currently targets is processed as a flat table/column structure (per `document-parser/`'s current section-detection capability) — section-aware Cash Flow Statement parsing is a `document-parser/` capability gap this pack cannot solve on its own, not something specific to `financial-intelligence/`.

---

## CF-002 — Cash Coverage Ratio and Cash Coverage Ratio Low use one specific, disclosed definition among several competing ones

**Status.** Accepted, not blocking.

**Context.** "Cash Coverage Ratio" has multiple real-world definitions (interest-coverage style using EBIT/Interest Expense; liquidity style using a period-end Cash Balance relative to Current Liabilities). `capabilities/cash-flow/cash-flow-ratio-calculators.ts` defines it as Cash Generated ÷ Total Current Liabilities specifically because this platform tracks neither Interest Expense (excluded from Expense construction per PC-001) nor a period-end Cash Balance (only period cash *movements*, per this pack's own scope). `cash-flow-observation-calculators.ts`'s `cash_coverage_ratio_low` threshold (1.0) is chosen as a universal, non-industry-specific cutoff for the same reasoning already established by LC-002.

**What's owed.** Once Interest Expense tracking (PC-001) and/or a Balance Sheet Cash Balance figure exist, reconsider whether a second, differently-named ratio (e.g. `interest_coverage_ratio`) should be added alongside this one rather than redefining it — changing an already-registered ratio's formula after the fact would be a breaking, undisclosed change this platform's principles do not permit.

**Why it does not block.** The chosen definition is real, computable, deterministic, and explicitly disclosed as one defensible variant rather than presented as the only correct "Cash Coverage Ratio" — consistent with this milestone's "only where formulas are universally accepted" instruction, interpreted as "disclose the choice" where true universal agreement does not exist.

---

## CF-003 — Third occurrence of the Observation→Evidence→Signal pattern, explicitly not abstracted yet

**Status.** Informational; superseded in part by PC-004's resolution (the evidence-chain-resolution piece specifically was abstracted in the very next milestone, once instructed to). The other two observed sub-patterns — signal-rule reuse/extension, and evidence generators staying separate from `FinancialEvidenceClassifier` — remain accurate and un-abstracted (correctly; neither needs a shared component, each is already minimal).

**Context.** The Cash Flow Capability Pack milestone's own instructions explicitly said: "If repeated Observation→Evidence→Signal patterns emerge for a third time, document them but do not abstract immediately." They have: (1) an Observation category maps to exactly one aggregated `FinancialEvidence` record via a `generate<Domain>Evidence()` function containing an evidence-chain-resolution walk (PC-004 — now shared via `EvidenceChainResolver`); (2) a `FinancialSignalRuleRegistry` rule is either extended with a new co-trigger or, if the target signal already had a trigger, requires zero changes at all; (3) every pack's evidence generator is deliberately kept separate from, and never modifies, `FinancialEvidenceClassifier`.

**What's owed.** Nothing further for (1) — done. Nothing owed for (2)/(3) — both are already minimal, and no shared component would meaningfully reduce them further.

**Why it does not block.** This is the intended outcome of the instruction that created it — recording an observed pattern is not the same as owing an implementation, and the one piece that did warrant extraction was extracted once explicitly instructed to.

---

## CF-004 — Cash Flow's evidence chain silently omitted the Liquidity (Liability) side

**Status.** **Resolved**, in the "shared internals" refactoring milestone, alongside the PC-004 extraction.

**Context.** `capabilities/cash-flow/cash-flow-evidence-generator.ts`'s `generateCashFlowEvidence()` was only ever given `cashMovements` to resolve Observations against. But both of Cash Flow's Ratios (`operating_cash_flow_ratio`, `cash_coverage_ratio`) require `total_current_liabilities` — a **Liquidity** metric, backed by `Liability` objects, not `CashMovement` ones. The evidence-chain walk's `relevantFinancialObjectIds` set therefore always contained liability ids that could never match anything in the `cashMovements` array passed in, so the `Liability`-side `EvidenceObject`s an Observation was genuinely (partly) derived from were silently dropped from `FinancialEvidence.evidenceObjectIds`. Never an empty chain (the CashMovement-side ids were still present and non-empty), but an incomplete one — which the mandatory Evidence Chain principle does not permit.

**What was done.** `generateCashFlowEvidence()`'s last parameter widened from `readonly CashMovement[]` to `EvidenceChainResolver`'s generic `readonly EvidenceLinkedFinancialObject[]`; `cash-flow-capability-pack.ts`'s call site updated to pass `[...cashMovements, ...liabilities]`. A new, stronger assertion was added to the existing regression test, explicitly checking the Liability-side EvidenceObject id is present (not just non-empty). Working Capital's own evidence generator was built correctly from the start, informed by this fix, passing `[...workingCapitalComponents, ...assets, ...liabilities]`.

**Resolution note.** Found *because* the shared `EvidenceChainResolver` extraction (PC-004) prompted a side-by-side review of all three existing generators' call sites — a benefit of the extraction beyond deduplication.

---

## WC-001 — `short_term_debt` WorkingCapitalComponent kind has no construction logic

**Status.** Accepted, not blocking.

**Context.** `models/financial-object-model.ts`'s `WorkingCapitalComponent.kind` union includes `"short_term_debt"` (alongside `"receivables"`, `"payables"`, `"inventory"`), but `capabilities/working-capital/working-capital-component-builder.ts` only constructs the latter three. No `FinancialMetricDefinition` currently references a "short-term debt balance" either.

**What's owed.** Either construction logic here, or — more likely, given the domain — treat short-term debt as belonging to a future **Leverage** Capability Pack instead (debt-to-equity, interest coverage, and short-term-debt-specific ratios are naturally leverage-domain concerns), and consider whether `short_term_debt` should even remain a `WorkingCapitalComponent.kind` value versus its own concept once that pack is scoped.

**Why it does not block.** No registered Metric/Ratio/Observation in this milestone needs it — constructing it now would be unused code, against this platform's stated preference against speculative construction.

---

## LC-003 — `\bcurrent\b` label matching also matched inside "Non-Current"

**Status.** **Resolved**, in the Leverage Capability Pack milestone.

**Context.** `capabilities/liquidity/current-asset-liability-builder.ts`'s `isCurrentAssetsSubtotalLabel`/`isCurrentLiabilitiesSubtotalLabel` used `/\bcurrent\b/i` with no exclusion for "Non-Current." Because a hyphen is a non-word character, `\b` finds a word boundary immediately before "Current" in "Non-Current" too, so `/\bcurrent\b/i.test("Total Non-Current Liabilities")` was `true` — a row explicitly labeled as the *non-current* subtotal was silently misclassified and constructed as a `"current"`-classified `Liability`/`Asset`. No fixture before Leverage's ever included both a "Total Current ..." row and a "Total Non-Current ..." row in the same table, so this went undetected through three prior Capability Pack milestones.

**What was done.** Both label-matching functions now explicitly return `false` when the label matches `/\bnon.?current\b/i`, before checking for "current." A dedicated regression test was added directly to Liquidity's own test suite (`liquidity-capability-pack.test.ts`), reproducing the exact shape that surfaced the defect.

**Resolution note.** Found because Leverage's Financial Object construction needed to detect "Total Non-Current Liabilities" rows for the first time, and its test fixture — unlike every prior pack's — placed a "Total Current Liabilities" row and a "Total Non-Current Liabilities" row in the same table, which the double-counting assertion caught immediately (a ratio computed as `-9` instead of the expected `-6.5`).

---

## LV-001 — `debt_growth` is an imperfect evidence-type mapping for "negative equity"

**Status.** Accepted, not blocking.

**Context.** `capabilities/leverage/leverage-evidence-generator.ts` maps `debt_to_equity_negative` Observations to the `debt_growth` `FinancialEvidenceType` — the closest available type among the registered fifteen, but not a precise semantic match: "negative equity" (total liabilities exceed total assets) is a snapshot solvency condition, not literally "growth" (which implies a trend). No `FinancialEvidenceType` in [`05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 5 names "negative equity"/"insolvency" directly.

**What's owed.** If a future FIF revision or Knowledge Library expansion introduces a more precise evidence type for balance-sheet solvency conditions, remap to it. Until then, `debt_growth` remains the most defensible choice — it correctly routes to `over_reliance_on_debt` via the existing, unmodified signal rule, which is the semantically correct terminal signal for this condition.

**Why it does not block.** Disclosed, not silent — the same category of judgment call already accepted for Cash Flow's Cash Coverage Ratio formula choice (CF-002). The Evidence Chain remains fully traceable regardless of which `FinancialEvidenceType` label is attached.

---

## FIO-001 — Orchestrator recomputes shared Financial Object construction per pack

**Status.** Accepted, not blocking.

**Context.** `orchestration/financial-intelligence-orchestrator.ts`'s `analyze()` calls every registered pack's `run()` independently, each starting from the same raw `(document, evidence)`. Packs that cross-reuse Liquidity's Asset/Liability construction (Cash Flow, Working Capital, Leverage) each call `buildCurrentAssetsAndLiabilities()` themselves — meaning a single `analyze()` call reconstructs the identical Current Assets/Liabilities up to four times (once inside Liquidity's own run, and again inside each of the three reusing packs' runs) before the orchestrator's id-based deduplication collapses the resulting *Metrics* back down to one.

**What's owed.** A shared, per-`analyze()`-call construction cache (e.g. computing `buildCurrentAssetsAndLiabilities()` once and threading the result to every pack that needs it) — this would require changing how packs receive their inputs (today, each pack's `run(document, evidence)` signature is self-sufficient and deliberately doesn't accept pre-computed Financial Objects), which is real, structural work deferred rather than rushed into this milestone's "Implement only" scope.

**Why it does not block.** Every reconstruction is pure and deterministic (identical input always yields identical, already-deduplicated output) — this is a performance characteristic, not a correctness defect. No performance problem has been observed or measured; this is a preventive note, not a response to a known issue, the same category as DP-002.

---

## FIO-002 — No semantic consolidation of same-type Evidence/Signals across packs

**Status.** Accepted, not blocking; deliberately out of this milestone's scope.

**Context.** When two different Capability Packs independently produce evidence/signals of the *same type* for the *same document* (e.g. Liquidity's `current_ratio_below_range` and Working Capital's `working_capital_ratio_negative` both producing `working_capital_pressure` Evidence, and therefore two separate `liquidity_stress` Signals), `FinancialIntelligenceOrchestrator` keeps both as distinct records — it deduplicates only bit-identical (same-id) records, not same-type-different-content ones.

**What's owed.** A real design for cross-pack same-type consolidation, if wanted: how to recompute a merged confidence (simple average? the existing corroboration-bonus formula, generalized?), how to represent multi-pack provenance in one record's `basis` text, and whether consolidation should happen for Signals only, or Evidence too. This is a genuine feature with real judgment calls, not a mechanical extension of the existing id-based dedup.

**Why it does not block.** Presenting two independently-produced, genuinely different signals of the same type is honest and traceable (each still resolves to its own real evidence chain) — arguably *more* informative than silently merging them would be, since a consumer can see that two independent domains corroborated the same underlying condition. Keeping them separate was the explicit, conservative interpretation of this milestone's "Duplicate Evidence/Signal handling" instruction; a future milestone may revisit this once a concrete consumer need for consolidation exists.

---

## EFF-001 — `revenue_growth` is an imperfect evidence-type mapping for "zero asset turnover"

**Status.** Accepted, not blocking.

**Context.** `capabilities/efficiency/efficiency-evidence-generator.ts` maps `asset_turnover_zero` Observations to the `revenue_growth` `FinancialEvidenceType` — the closest available type among the registered fifteen, but not a precise semantic match: "zero asset turnover" (no revenue generated relative to the asset base) is a snapshot asset-utilization condition, not literally "growth." No `FinancialEvidenceType` in [`05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 5 names an asset-utilization/efficiency condition directly.

**What's owed.** If a future FIF revision or Knowledge Library expansion introduces a more precise evidence type for asset-utilization conditions, remap to it. Until then, `revenue_growth` remains the most defensible choice — it is Revenue-domain, and (per EFF-002 below) it correctly routes to `revenue_instability` via FIF Chapter 6's own documented trigger.

**Why it does not block.** Disclosed, not silent — this is the **third** occurrence of this exact judgment call, after CF-002 (Cash Coverage Ratio formula choice) and LV-001 (`debt_growth` for negative equity). Per this milestone's explicit "document before abstract on third occurrence" instruction: this note documents the pattern's third appearance, but deliberately introduces no shared abstraction — each of the three call sites remains a plain, disclosed, independent judgment call in its own evidence generator. The Evidence Chain remains fully traceable regardless of which `FinancialEvidenceType` label is attached.

---

## EFF-002 — `revenue_instability`'s extended rule is the first to genuinely widen `analyzeFinancialSignals()`'s reachable output

**Status.** Accepted, disclosed architectural decision — not a defect.

**Context.** `signals/financial-signal-rules.ts`'s `revenue_instability` rule was extended (this milestone) to trigger on `revenue_growth` alone, in addition to its prior `revenue_concentration`/`customer_dependency` triggers — grounded directly in [`05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 6's own documented trigger table: "Revenue instability | Inconsistent or volatile revenue pattern | Erratic Revenue growth pattern, or Revenue concentration + Customer dependency." Every prior signal-rule extension in this project's history (`liquidity_stress` + `working_capital_pressure` during Liquidity; `cash_conversion_deterioration` during Cash Flow) was reachable only through a new Capability Pack's own Observation-based evidence generator — the evidence type each extension added as a trigger did not previously exist anywhere else, so `analyzeFinancialSignals()` (which derives `FinancialEvidence` solely from the frozen `FinancialEvidenceClassifier`, never from a Capability Pack) could never actually reach the new trigger. `revenue_growth` breaks that pattern: it has been one of `FinancialEvidenceClassifier`'s own directly-produced evidence types since Sprint 2 Foundation. Extending `revenue_instability` to trigger on it therefore genuinely widens what `analyzeFinancialSignals()` itself can now produce — a document with erratic revenue growth alone, with no Capability Pack ever invoked, can now yield a `revenue_instability` signal where it could not before.

**What was done.** The change was made anyway, and treated as legitimate rather than deferred, because: (1) it is purely additive — no previously-reachable evidence-to-signal path was removed or altered; (2) it closes a genuine, longstanding gap between FIF's own documented rule table and the implemented rule, present since Sprint 2 Foundation and independent of Efficiency's own domain — Efficiency's `asset_turnover_zero` Observation merely surfaced the gap, it did not create it; (3) it was verified empirically, not assumed: `__tests__/real-pipeline-integration.test.ts` gained a new explicit assertion (`financialSignals.some((s) => s.type === "revenue_instability")`) proving the behavior change is real and reachable through `analyzeFinancialSignals()` directly, with the full suite green before and after.

**Why it does not block.** Prominently disclosed rather than buried — flagged in `financial-signal-rules.ts`'s own doc comment, in the Efficiency Capability Pack milestone's report, and here. `FinancialSignalRuleRegistry`'s shape, `FinancialIntelligenceOrchestrator`, `CapabilityPackRegistry`, and `FinancialAnalysisResult` remain completely unmodified — only the data-table content of one rule changed, and only in the additive direction.

---

## EFF-003 — Two patterns now at their second independent occurrence, not yet abstracted

**Status.** Accepted, not blocking; explicitly deferred per this milestone's instruction.

**Context.** The Efficiency Capability Pack introduced the second independent occurrence of two shapes first seen in the Leverage Capability Pack:

1. **"Sum-all-regardless-of-classification" `MetricCalculator`.** Leverage's `TotalLiabilitiesCalculator` and Efficiency's `TotalAssetsCalculator` (`capabilities/efficiency/total-assets-calculator.ts`) are both a `MetricCalculator` that sums every Financial Object in its context array unconditionally — no `classification` filter — trusting the caller to have already merged `"current"` and `"non_current"` entries into one array first.
2. **"Non-current counterpart of an existing current-only label matcher" Financial Object builder.** Leverage's non-current-Liability construction and Efficiency's `buildNonCurrentAssets` (`capabilities/efficiency/non-current-asset-builder.ts`) both mirror an existing "current"-only builder (Liquidity's), scanning the same Ontology-normalized column but requiring an explicit "Total Non-Current .../Total Long-Term ..." label instead, and are both careful never to collide with the "Total Current ..." match (per the LC-003 lesson).

**What's owed.** Per this milestone's explicit instruction ("If another reusable internal pattern appears for a third independent time, document it first before abstracting"), no shared helper has been introduced for either pattern. If a future Capability Pack (Growth, Investment, or any pack needing a third "sum-all" Metric or a third "non-current counterpart" builder) introduces a third independent occurrence of either shape, that milestone should extract a shared helper at that point — following the exact precedent already set by `EvidenceChainResolver`/`CapabilityResult` (extracted only after PC-004/CF-003's third occurrence, documented in this file first).

**Why it does not block.** Two occurrences of a shape is not yet proof the shape is stable — the `EvidenceChainResolver` extraction history is the explicit precedent for waiting for a third confirmation before generalizing. Each of the four call sites (two calculators, two builders) remains independently correct, tested, and readable on its own.

---

## GR-001 — Growth's period comparison is a row-sequence proxy, not a validated period boundary

**Status.** Accepted, not blocking; extends the existing PC-003 gap into a new layer.

**Context.** `capabilities/growth/period-revenue-builder.ts`'s `buildPeriodRevenueSequence` treats the **last two rows, in row order**, of a Revenue-normalized column as "prior period" and "current period" Revenue. This is the same assumption the frozen `FinancialEvidenceClassifier`'s own `revenue_growth` trend detector (`evidence/financial-evidence-rules.ts`'s `detectTrend`) has always made — "successive rows in one column = a document's implicit time axis" — reused here, not invented fresh. No real `Period` (date-boundary) value object is ever constructed; both Financial Objects leave `period: undefined`, exactly as PC-003 already discloses platform-wide ("no reliable period/date-boundary detection exists yet"). If a document's Revenue column happens to list rows in a different order (e.g. products/branches rather than time), or lists fewer than two genuine period values, the resulting "growth rate" would be comparing something other than two real, consecutive periods.

**What's owed.** Real date-boundary detection (parsing column headers like "Q1 2026"/"Jan 2026" into genuine `Period` value objects, then explicitly ordering by that parsed boundary rather than raw row position) — this is the same underlying gap PC-003 already names as blocking `gross_margin_declined`/`working_capital_weakened`/`leverage_increased`/`revenue_growth_slowed`, now shown to also block a *for-real* computable Ratio (not only Observations) once a pack actually needed period comparison to produce anything at all.

**Why it does not block.** Disclosed, not silent, and grounded in an assumption this codebase already made and accepted elsewhere (the frozen classifier's own trend detection) — not a new, unreviewed heuristic. The Revenue Growth Rate Ratio, and the `revenue_growth_negative` Observation built on it, are both genuinely computed values with a genuinely traceable Evidence Chain; the numbers are only as meaningful as the row-sequence assumption they rest on, and that limitation is now documented in three places (`period-revenue-builder.ts`'s own doc comment, `models/financial-object-model.ts`'s `Revenue.periodSequence` doc comment, and here).

---

## GR-002 — First new Metric definitions, and first modification of a pre-existing Ratio definition's metadata

**Status.** Accepted, disclosed architectural decision — not a defect.

**Context.** Every Capability Pack through Efficiency only ever populated a calculator for a Metric/Ratio definition already registered at Sprint 2 Foundation, adding new definitions solely at the Observation layer. The Growth Capability Pack departs from that pattern in two ways: (1) it registers **two brand-new Metric definitions** — `current_period_revenue`/`prior_period_revenue` — because no existing Metric represents a single period's Revenue in isolation (`total_revenue` deliberately aggregates every Revenue row a document has); (2) it **changes** `revenue_growth_rate`'s pre-existing `requiredMetricDefinitionIds` field from its Sprint 2 Foundation placeholder value `["total_revenue"]` to `["current_period_revenue", "prior_period_revenue"]`.

**What was done.** Both changes were made and are disclosed here rather than avoided, because: the original `requiredMetricDefinitionIds: ["total_revenue"]` placeholder was written before any calculator for this ratio existed, and could not have been correct as written — a single aggregate Metric cannot express "change... across periods" (the ratio's own description) on its own. Populating this ratio's first real calculator necessarily meant correcting the metadata to match what a *working* implementation actually requires, the same way every other pack's first real calculator implicitly finalized a previously-abstract definition's true shape (e.g. Cash Flow's Cash Coverage Ratio formula choice, CF-002). No `FinancialRatioDefinition`/`FinancialMetricDefinition` TypeScript interface changed — only data-table content, which this module's own status line already designates as "business content," explicitly not frozen.

**Why it does not block.** The registries' cross-referential-integrity tests (`__tests__/financial-metric-and-ratio-registries.test.ts`) still pass unmodified in mechanism — they generically verify every ratio's `requiredMetricDefinitionIds` resolves to a real registered metric, which remains true after this change. No other pack references `revenue_growth_rate`'s `requiredMetricDefinitionIds`, so nothing downstream depended on the old, never-implemented placeholder value.

---

## INV-001 — `margin_erosion` is an imperfect evidence-type mapping for "negative return on equity"

**Status.** Accepted, not blocking.

**Context.** `capabilities/investment/investment-evidence-generator.ts` maps `return_on_equity_negative` Observations to the `margin_erosion` `FinancialEvidenceType` — the closest available type among the registered fifteen. Return on Equity is a profitability-of-capital ratio, not a margin percentage, so the mapping is directionally sound (a negative ROE reflects the same kind of profitability distress `margin_erosion` already represents) but not an exact semantic match. No `FinancialEvidenceType` in [`05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`](05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md) Chapter 5 names a returns-on-capital/investment condition directly.

**What's owed.** If a future FIF revision or Knowledge Library expansion introduces a more precise evidence type for investment-return conditions, remap to it. Until then, `margin_erosion` remains the most defensible choice — it correctly routes to `margin_compression` via the existing, unmodified signal rule, requiring no Knowledge Rule change this milestone.

**Why it does not block.** Disclosed, not silent — this is the **fourth** occurrence of the "disclosed imperfect evidence-type mapping" judgment call, after CF-002 (Cash Coverage Ratio formula choice), LV-001 (`debt_growth` for negative equity), and EFF-001 (`revenue_growth` for zero asset turnover). Growth's mapping to `revenue_growth` (a clean fit per FIF's own "direction in basis, not type" convention) does not belong to this lineage. As with the third occurrence, no abstraction is introduced: there is no shared *code* across these four call sites, only a recurring *kind* of judgment call — each stays documented individually, per this document's established "document before abstract" discipline (and here, there is nothing mechanical to abstract in the first place, only a decision to record).

---

*These twenty-five items are accepted backlog (three now marked Resolved — PC-004, CF-004, LC-003 — kept per this document's retention rule). They do not block Sprint 2 (Financial Intelligence Foundation), the Liquidity/Profitability/Cash Flow/Working Capital/Leverage/Efficiency/Growth/Investment Capability Packs, the Financial Intelligence Orchestrator, or any subsequent capability pack from proceeding.*
