import type { FinancialMetric } from "../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "./metric-calculator.js";

/**
 * The FinancialMetricCalculator framework: runs a fixed, ordered set of
 * `MetricCalculator`s against one `MetricCalculationContext` and returns
 * every `FinancialMetric` they were able to produce.
 *
 * Deterministic: calculators run in the exact array order given — never a
 * `Set`/`Map` iteration or any sort by calculator identity — so the same
 * calculator set against the same context always produces metrics in the
 * same order. Each calculator is gated by its own `canCalculate()` before
 * `calculate()` is ever invoked; a calculator returning `undefined` from
 * `calculate()` after `canCalculate()` returned true is silently skipped,
 * never pushed as a hole in the result array — that mismatch is a contract
 * violation of that specific calculator, not this framework's concern to
 * police.
 *
 * Contains no formula logic — see `metric-calculator.ts`'s `MetricCalculator`
 * interface for where real calculation logic belongs (none exists yet).
 */
export function runMetricCalculators(
  calculators: readonly MetricCalculator[],
  context: MetricCalculationContext,
): readonly FinancialMetric[] {
  const results: FinancialMetric[] = [];
  for (const calculator of calculators) {
    if (!calculator.canCalculate(context)) continue;
    const metric = calculator.calculate(context);
    if (metric !== undefined) {
      results.push(metric);
    }
  }
  return results;
}
