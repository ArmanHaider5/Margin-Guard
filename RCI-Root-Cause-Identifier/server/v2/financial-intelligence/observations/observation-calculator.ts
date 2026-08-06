import type { FinancialMetric, FinancialRatio, FinancialObservation } from "../../shared/index.js";
import type { FinancialObservationDefinition } from "./financial-observation-definitions.js";

/**
 * INTERFACE ONLY — no implementation exists yet, by this milestone's explicit
 * scope ("do not implement observation generation"). The contract a future
 * generation service will implement per `FinancialObservationDefinition`,
 * consuming the `FinancialMetric[]`/`FinancialRatio[]` a document produced
 * (across one or more periods, for trend-shaped statements such as "declined
 * compared with previous periods") and producing a `FinancialObservation`.
 *
 * Deliberately internal to `financial-intelligence/` (not exported from
 * `index.ts`) — mirrors `metric-calculator.ts`'s and `ratio-calculator.ts`'s
 * reasoning.
 */

export interface ObservationCalculationContext {
  readonly documentId: string;
  /** Every FinancialMetric computed for this document — an ObservationCalculator
   * looks up the specific metrics its FinancialObservationDefinition.requiredMetricDefinitionIds
   * names. */
  readonly metrics: readonly FinancialMetric[];
  /** Every FinancialRatio computed for this document — looked up via
   * FinancialObservationDefinition.requiredRatioDefinitionIds. */
  readonly ratios: readonly FinancialRatio[];
}

export interface ObservationCalculator {
  readonly definition: FinancialObservationDefinition;
  /** Whether every metric/ratio this observation requires is present in the
   * given context. */
  canCalculate(context: ObservationCalculationContext): boolean;
  /** Produces the FinancialObservation, or `undefined` if `canCalculate()`
   * would have returned false. No calculator implementing this interface
   * exists yet. */
  calculate(context: ObservationCalculationContext): FinancialObservation | undefined;
}
