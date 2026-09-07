/**
 * The Financial Calculation Pipeline's three execution stages, in the only
 * order the architecture permits — see `financial-intelligence/README.md`'s
 * pipeline diagram. This ordering is structural, not a preference: a
 * FinancialRatio can only be computed from FinancialMetric values
 * (`RatioCalculationContext.metrics`), and a FinancialObservation can only be
 * computed from FinancialMetric/FinancialRatio values
 * (`ObservationCalculationContext.metrics`/`.ratios`). No calculator in a
 * later stage can run before every calculator in an earlier stage has
 * finished, and `FinancialCalculationPipeline` enforces that by
 * construction — a later stage's context is built exclusively from an
 * earlier stage's completed output array, never threaded through
 * concurrently or interleaved. Changing this order, or inserting a new
 * stage, requires a new ADR (per the Financial Intelligence contracts
 * freeze).
 */
export const FINANCIAL_CALCULATION_STAGE_ORDER = ["metric", "ratio", "observation"] as const;

export type FinancialCalculationStage = (typeof FINANCIAL_CALCULATION_STAGE_ORDER)[number];
