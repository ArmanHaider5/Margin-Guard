import type { FinancialRatio } from "../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "./ratio-calculator.js";

/**
 * The FinancialRatioCalculator framework: runs a fixed, ordered set of
 * `RatioCalculator`s against one `RatioCalculationContext` and returns every
 * `FinancialRatio` they were able to produce. Deterministic and formula-free,
 * for the same reasons as `metrics/metric-calculation-stage.ts`'s
 * `runMetricCalculators` — see that file's doc comment for the full
 * reasoning, which applies identically here.
 *
 * `context.metrics` is always the complete output of Stage 1 (Metrics) for
 * this document — never a partial or concurrently-updated view — per
 * `pipeline/calculation-stage-order.ts`'s ordering rule.
 */
export function runRatioCalculators(
  calculators: readonly RatioCalculator[],
  context: RatioCalculationContext,
): readonly FinancialRatio[] {
  const results: FinancialRatio[] = [];
  for (const calculator of calculators) {
    if (!calculator.canCalculate(context)) continue;
    const ratio = calculator.calculate(context);
    if (ratio !== undefined) {
      results.push(ratio);
    }
  }
  return results;
}
