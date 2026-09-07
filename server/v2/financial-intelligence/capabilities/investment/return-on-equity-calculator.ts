import { deriveCompositeId, Confidence } from "../../../shared/index.js";
import type { FinancialRatio } from "../../../shared/index.js";
import type { RatioCalculator, RatioCalculationContext } from "../../ratios/ratio-calculator.js";
import { createDefaultFinancialRatioRegistry } from "../../ratios/financial-ratio-definitions.js";

const DEFINITION = createDefaultFinancialRatioRegistry().get("return_on_equity");
if (!DEFINITION) {
  throw new Error("return_on_equity ratio definition is missing from the default registry");
}

function findMetrics(context: RatioCalculationContext) {
  const grossProfit = context.metrics.find((m) => m.definitionId === "gross_profit");
  const totalEquity = context.metrics.find((m) => m.definitionId === "total_equity");
  return { grossProfit, totalEquity };
}

/**
 * The Investment Capability Pack's `RatioCalculator` — Return on Equity =
 * gross_profit ÷ total_equity, per the already-registered definition
 * ("Gross profit relative to total equity," registered since Sprint 2
 * Foundation, calculated for real for the first time here). A single,
 * universally-standard formula — no competing definitions to disclose.
 * Refuses to divide by zero equity.
 */
export class ReturnOnEquityCalculator implements RatioCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: RatioCalculationContext): boolean {
    const { grossProfit, totalEquity } = findMetrics(context);
    return grossProfit !== undefined && totalEquity !== undefined && totalEquity.value !== 0;
  }

  calculate(context: RatioCalculationContext): FinancialRatio | undefined {
    const { grossProfit, totalEquity } = findMetrics(context);
    if (!grossProfit || !totalEquity || totalEquity.value === 0) return undefined;

    const value = grossProfit.value / totalEquity.value;
    const confidence = (grossProfit.confidence.value + totalEquity.confidence.value) / 2;

    return {
      id: deriveCompositeId(["financial-ratio", "return_on_equity", context.documentId, grossProfit.id, totalEquity.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      value,
      documentId: context.documentId,
      metricIds: [grossProfit.id, totalEquity.id],
      confidence: Confidence.create(confidence),
      basis: `Gross Profit (${grossProfit.value.toFixed(2)}) ÷ Total Equity (${totalEquity.value.toFixed(2)}) = ${value.toFixed(4)}.`,
    };
  }
}
