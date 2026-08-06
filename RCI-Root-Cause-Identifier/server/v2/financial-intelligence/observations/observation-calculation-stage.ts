import type { FinancialObservation } from "../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "./observation-calculator.js";

/**
 * The FinancialObservationCalculator framework: runs a fixed, ordered set of
 * `ObservationCalculator`s against one `ObservationCalculationContext` and
 * returns every `FinancialObservation` they were able to produce.
 * Deterministic and formula-free, for the same reasons as
 * `metrics/metric-calculation-stage.ts`'s `runMetricCalculators` — see that
 * file's doc comment for the full reasoning, which applies identically here.
 *
 * `context.metrics`/`context.ratios` are always the complete outputs of
 * Stages 1 and 2 for this document — never partial or concurrently-updated
 * views — per `pipeline/calculation-stage-order.ts`'s ordering rule.
 */
export function runObservationCalculators(
  calculators: readonly ObservationCalculator[],
  context: ObservationCalculationContext,
): readonly FinancialObservation[] {
  const results: FinancialObservation[] = [];
  for (const calculator of calculators) {
    if (!calculator.canCalculate(context)) continue;
    const observation = calculator.calculate(context);
    if (observation !== undefined) {
      results.push(observation);
    }
  }
  return results;
}
