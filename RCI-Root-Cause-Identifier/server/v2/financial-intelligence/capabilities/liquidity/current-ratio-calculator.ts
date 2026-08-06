import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

const DEFINITION = createDefaultFinancialRatioRegistry().get("current_ratio");
if (!DEFINITION) {
  throw new Error("current_ratio ratio definition is missing from the default registry");
}

function findMetrics(context: RatioCalculationContext) {
  const totalCurrentAssets = context.metrics.find((m) => m.definitionId === "total_current_assets");
  const totalCurrentLiabilities = context.metrics.find((m) => m.definitionId === "total_current_liabilities");
  return { totalCurrentAssets, totalCurrentLiabilities };
}

/**
 * The Liquidity Capability Pack's `RatioCalculator` — Current Ratio =
 * total_current_assets ÷ total_current_liabilities. A zero-valued
 * total_current_liabilities has no meaningful ratio (division by zero, and a
 * business with literally zero current liabilities is not a "low liquidity"
 * condition this ratio can describe), so both `canCalculate()` and
 * `calculate()` guard against it explicitly and agree with each other.
 */
export class CurrentRatioCalculator implements RatioCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: RatioCalculationContext): boolean {
    const { totalCurrentAssets, totalCurrentLiabilities } = findMetrics(context);
    return totalCurrentAssets !== undefined && totalCurrentLiabilities !== undefined && totalCurrentLiabilities.value !== 0;
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    const { totalCurrentAssets, totalCurrentLiabilities } = findMetrics(context);
    if (!totalCurrentAssets || !totalCurrentLiabilities || totalCurrentLiabilities.value === 0) return undefined;

    const value = totalCurrentAssets.value / totalCurrentLiabilities.value;
    const confidence = (totalCurrentAssets.confidence.value + totalCurrentLiabilities.confidence.value) / 2;

    return {
      id: deriveCompositeId([
        "financial-ratio",
        "current_ratio",
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
      basis: `Total Current Assets (${totalCurrentAssets.value.toFixed(2)}) ÷ Total Current Liabilities (${totalCurrentLiabilities.value.toFixed(2)}) = ${value.toFixed(2)}.`,
    };
  }
}
