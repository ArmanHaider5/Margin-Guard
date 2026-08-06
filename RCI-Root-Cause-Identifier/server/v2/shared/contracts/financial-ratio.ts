import type { Confidence, Period } from "../value-objects/index.js";

/** The eleven conceptual Ratio categories from `05_FINANCIAL_INTELLIGENCE_FRAMEWORK.md`
 * Chapter 7. `operational` is the explicit "boundary category" (ratios combining
 * financial and operational data, e.g. revenue per employee) — no
 * FinancialRatioDefinition uses it yet, since it requires data from
 * `operational-intelligence/`, which does not exist yet; see
 * `financial-intelligence/README.md` for why this is a stated gap, not an
 * oversight. */
export type FinancialRatioCategory =
  | "liquidity"
  | "profitability"
  | "efficiency"
  | "leverage"
  | "activity"
  | "cash_flow"
  | "growth"
  | "working_capital"
  | "return"
  | "investment"
  | "operational";

/**
 * A computed ratio for one document/period — e.g. "Current Ratio: 1.8, Q1 2026."
 * The Financial Intelligence pipeline's fourth stage, between Financial Metrics
 * and Financial Evidence. Public for the same reason `FinancialMetric` is (see
 * that file's doc comment) — `shared/contracts/`, not internal.
 */
export interface FinancialRatio {
  readonly id: string;
  /** References a FinancialRatioDefinition id (`financial-intelligence/ratios/`,
   * internal). */
  readonly definitionId: string;
  readonly category: FinancialRatioCategory;
  readonly value: number;
  readonly period?: Period;
  readonly documentId: string;
  readonly metricIds: readonly string[];
  readonly confidence: Confidence;
  readonly basis: string;
}
