import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialMetric } from "../../../shared/index.js";
import type { MetricCalculator, MetricCalculationContext } from "../../metrics/metric-calculator.js";
import { createDefaultFinancialMetricRegistry } from "../../metrics/financial-metric-definitions.js";

const DEFINITION = createDefaultFinancialMetricRegistry().get("total_current_liabilities");
if (!DEFINITION) {
  throw new Error("total_current_liabilities metric definition is missing from the default registry");
}

/**
 * The Liquidity Capability Pack's second real `MetricCalculator` — sums every
 * `Liability` classified `"current"` in the context's `FinancialObjectSet`.
 * Mirrors `total-current-assets-calculator.ts`'s reasoning exactly.
 */
export class TotalCurrentLiabilitiesCalculator implements MetricCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: MetricCalculationContext): boolean {
    return context.financialObjects.liabilities.some((l) => l.classification === "current");
  }

  calculate(context: MetricCalculationContext): FinancialMetric | undefined {
    const currentLiabilities = context.financialObjects.liabilities.filter((l) => l.classification === "current");
    if (currentLiabilities.length === 0) return undefined;

    const currencyCode = currentLiabilities[0]!.totalValue.currency.code;
    const total = currentLiabilities.reduce((sum, l) => sum + l.totalValue.amount, 0);
    const averageConfidence =
      currentLiabilities.reduce((sum, l) => sum + l.confidence.value, 0) / currentLiabilities.length;

    return {
      id: deriveCompositeId([
        "financial-metric",
        "total_current_liabilities",
        context.documentId,
        ...currentLiabilities.map((l) => l.id),
      ]).slice(0, 16),
      definitionId: this.definition.id,
      value: total,
      unit: "currency",
      documentId: context.documentId,
      financialObjectIds: currentLiabilities.map((l) => l.id),
      confidence: Confidence.create(averageConfidence),
      basis: `Sum of ${currentLiabilities.length} Liability entr${currentLiabilities.length === 1 ? "y" : "ies"} classified as current (${currencyCode} ${total.toFixed(2)}).`,
    };
  }
}
