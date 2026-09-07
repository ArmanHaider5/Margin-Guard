import type { FinancialMetric, FinancialRatio } from "../../shared/index.js";
import type { FinancialRatioDefinition } from "./financial-ratio-definitions.js";

/**
 * INTERFACE ONLY — no implementation exists yet, by this milestone's explicit
 * scope ("do not calculate ratios yet"). The contract a future calculation
 * service will implement per `FinancialRatioDefinition`, consuming the
 * `FinancialMetric[]` a document produced and combining them into a
 * `FinancialRatio`.
 *
 * Deliberately internal to `financial-intelligence/` (not exported from
 * `index.ts`) — mirrors `metric-calculator.ts`'s reasoning.
 */

export interface RatioCalculationContext {
  readonly documentId: string;
  /** Every FinancialMetric computed for this document — a RatioCalculator looks
   * up the specific metrics its FinancialRatioDefinition.requiredMetricDefinitionIds
   * names. */
  readonly metrics: readonly FinancialMetric[];
}

export interface RatioCalculator {
  readonly definition: FinancialRatioDefinition;
  /** Whether every metric this ratio requires is present in the given context. */
  canCalculate(context: RatioCalculationContext): boolean;
  /** Produces the FinancialRatio, or `undefined` if `canCalculate()` would have
   * returned false. No calculator implementing this interface exists yet. */
  calculate(context: RatioCalculationContext): FinancialRatio | undefined;
}
