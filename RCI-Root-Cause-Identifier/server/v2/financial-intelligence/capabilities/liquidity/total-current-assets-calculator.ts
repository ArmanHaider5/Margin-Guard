import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";

const DEFINITION = createDefaultFinancialMetricRegistry().get("total_current_assets");
if (!DEFINITION) {
  throw new Error("total_current_assets metric definition is missing from the default registry");
}

/**
 * The Liquidity Capability Pack's first real `MetricCalculator` — sums every
 * `Asset` classified `"current"` in the context's `FinancialObjectSet`. Real
 * formula, real calculation: this is what earlier milestones' `MetricCalculator`
 * interface existed to eventually hold.
 */
export class TotalCurrentAssetsCalculator implements MetricCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.assets.some((a) => a.classification === "current");
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const currentAssets = context.financialObjects.assets.filter((a) => a.classification === "current");
    if (currentAssets.length === 0) return undefined;

    const currencyCode = currentAssets[0]!.totalValue.currency.code;
    const total = currentAssets.reduce((sum, a) => sum + a.totalValue.amount, 0);
    const averageConfidence =
      currentAssets.reduce((sum, a) => sum + a.confidence.value, 0) / currentAssets.length;

    return {
      id: deriveCompositeId([
        "financial-metric",
        "total_current_assets",
        context.documentId,
        ...currentAssets.map((a) => a.id),
      ]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: currentAssets.map((a) => a.id),
      confidence: Confidence.create(averageConfidence),
      basis: `Sum of ${currentAssets.length} Asset entr${currentAssets.length === 1 ? "y" : "ies"} classified as current (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}
