import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

const DEFINITION = createDefaultFinancialRatioRegistry().get("working_capital_ratio");
if (!DEFINITION) {
  throw new Error("working_capital_ratio ratio definition is missing from the default registry");
}

function findMetrics(context: RatioCalculationContext) {
  const totalCurrentAssets = context.metrics.find((m) => m.definitionId === "total_current_assets");
  const totalCurrentLiabilities = context.metrics.find((m) => m.definitionId === "total_current_liabilities");
  return { totalCurrentAssets, totalCurrentLiabilities };
}

/**
 * The Working Capital Capability Pack's `RatioCalculator` — Working Capital
 * Ratio = (total_current_assets − total_current_liabilities) ÷
 * total_current_liabilities, per the already-registered definition's own
 * description ("Current assets minus current liabilities, relative to
 * current liabilities"). Algebraically equal to `current_ratio − 1`, but a
 * genuinely distinct, real ratio in its own right (net working capital
 * relative to obligations, not gross coverage) — not a duplicate of
 * Liquidity's `current_ratio`.
 *
 * The second Capability Pack (after Cash Flow) whose Ratio layer needs a
 * Metric from another domain — both `total_current_assets` and
 * `total_current_liabilities` are Liquidity metrics, reused directly (see
 * `working-capital-capability-pack.ts`), not duplicated.
 */
export class WorkingCapitalRatioCalculator implements RatioCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: RatioCalculationContext): boolean {
    const { totalCurrentAssets, totalCurrentLiabilities } = findMetrics(context);
    return totalCurrentAssets !== undefined && totalCurrentLiabilities !== undefined && totalCurrentLiabilities.value !== 0;
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    const { totalCurrentAssets, totalCurrentLiabilities } = findMetrics(context);
    if (!totalCurrentAssets || !totalCurrentLiabilities || totalCurrentLiabilities.value === 0) return undefined;

    const value = (totalCurrentAssets.value - totalCurrentLiabilities.value) / totalCurrentLiabilities.value;
    const confidence = (totalCurrentAssets.confidence.value + totalCurrentLiabilities.confidence.value) / 2;

    return {
      id: deriveCompositeId([
        "financial-ratio",
        "working_capital_ratio",
        context.documentId,
        totalCurrentAssets.id,
        totalCurrentLiabilities.id,
      ]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      value,
      documentId: context.documentId,
      metricIds: [totalCurrentAssets.id, totalCurrentLiabilities.id],
      confidence: Confidence.create(confidence),
      basis: `(Total Current Assets (${totalCurrentAssets.value.toFixed(2)}) − Total Current Liabilities (${totalCurrentLiabilities.value.toFixed(2)})) ÷ Total Current Liabilities = ${value.toFixed(2)}.`,
    };
  }
}
