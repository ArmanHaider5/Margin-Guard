import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

const DEFINITION = createDefaultFinancialRatioRegistry().get("debt_to_equity");
if (!DEFINITION) {
  throw new Error("debt_to_equity ratio definition is missing from the default registry");
}

function findMetrics(context: RatioCalculationContext) {
  const totalLiabilities = context.metrics.find((m) => m.definitionId === "total_liabilities");
  const totalEquity = context.metrics.find((m) => m.definitionId === "total_equity");
  return { totalLiabilities, totalEquity };
}

/**
 * The Leverage Capability Pack's `RatioCalculator` — Debt to Equity =
 * total_liabilities ÷ total_equity, a universally-standard, single formula
 * (unlike Cash Coverage Ratio, no competing definitions to disclose).
 * Refuses to divide by zero equity.
 */
export class DebtToEquityCalculator implements RatioCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: RatioCalculationContext): boolean {
    const { totalLiabilities, totalEquity } = findMetrics(context);
    return totalLiabilities !== undefined && totalEquity !== undefined && totalEquity.value !== 0;
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    const { totalLiabilities, totalEquity } = findMetrics(context);
    if (!totalLiabilities || !totalEquity || totalEquity.value === 0) return undefined;

    const value = totalLiabilities.value / totalEquity.value;
    const confidence = (totalLiabilities.confidence.value + totalEquity.confidence.value) / 2;

    return {
      id: deriveCompositeId(["financial-ratio", "debt_to_equity", context.documentId, totalLiabilities.id, totalEquity.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      value,
      documentId: context.documentId,
      metricIds: [totalLiabilities.id, totalEquity.id],
      confidence: Confidence.create(confidence),
      basis: `Total Liabilities (${totalLiabilities.value.toFixed(2)}) ÷ Total Equity (${totalEquity.value.toFixed(2)}) = ${value.toFixed(2)}.`,
    };
  }
}
