import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

const DEFINITION = createDefaultFinancialRatioRegistry().get("asset_turnover");
if (!DEFINITION) {
  throw new Error("asset_turnover ratio definition is missing from the default registry");
}

function findMetrics(context: RatioCalculationContext) {
  const totalRevenue = context.metrics.find((m) => m.definitionId === "total_revenue");
  const totalAssets = context.metrics.find((m) => m.definitionId === "total_assets");
  return { totalRevenue, totalAssets };
}

/**
 * The Efficiency Capability Pack's `RatioCalculator` — Asset Turnover =
 * total_revenue ÷ total_assets, per the already-registered definition
 * (registered since Sprint 2 Foundation, calculated for real for the first
 * time here). A single, universally-standard formula — no competing
 * definitions to disclose, unlike Cash Coverage Ratio. Refuses to divide by
 * zero total assets.
 */
export class AssetTurnoverCalculator implements RatioCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: RatioCalculationContext): boolean {
    const { totalRevenue, totalAssets } = findMetrics(context);
    return totalRevenue !== undefined && totalAssets !== undefined && totalAssets.value !== 0;
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    const { totalRevenue, totalAssets } = findMetrics(context);
    if (!totalRevenue || !totalAssets || totalAssets.value === 0) return undefined;

    const value = totalRevenue.value / totalAssets.value;
    const confidence = (totalRevenue.confidence.value + totalAssets.confidence.value) / 2;

    return {
      id: deriveCompositeId(["financial-ratio", "asset_turnover", context.documentId, totalRevenue.id, totalAssets.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      value,
      documentId: context.documentId,
      metricIds: [totalRevenue.id, totalAssets.id],
      confidence: Confidence.create(confidence),
      basis: `Total Revenue (${totalRevenue.value.toFixed(2)}) ÷ Total Assets (${totalAssets.value.toFixed(2)}) = ${value.toFixed(2)}.`,
    };
  }
}
