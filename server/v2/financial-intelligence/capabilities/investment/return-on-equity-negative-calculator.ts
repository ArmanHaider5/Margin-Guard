import { deriveCompositeId } from "../../../shared/index.js";
import type { FinancialObservation } from "../../../shared/index.js";
import type { ObservationCalculator, ObservationCalculationContext } from "../../observations/observation-calculator.js";
import { createDefaultFinancialObservationRegistry } from "../../observations/financial-observation-definitions.js";

const DEFINITION = createDefaultFinancialObservationRegistry().get("return_on_equity_negative");
if (!DEFINITION) {
  throw new Error("return_on_equity_negative observation definition is missing from the default registry");
}

function findReturnOnEquityRatio(context: ObservationCalculationContext) {
  return context.ratios.find((r) => r.definitionId === "return_on_equity");
}

/**
 * The Investment Capability Pack's `ObservationCalculator` — fires only when
 * Return on Equity is genuinely negative (either Gross Profit or Total
 * Equity is negative) — the same single-period, universally-defensible
 * "below zero" pattern as every other pack's "negative" Observation. The
 * `investment` category's first real coverage.
 */
export class ReturnOnEquityNegativeCalculator implements ObservationCalculator {
  readonly definition = DEFINITION as NonNullable<typeof DEFINITION>;

  canCalculate(context: ObservationCalculationContext): boolean {
    const ratio = findReturnOnEquityRatio(context);
    return ratio !== undefined && ratio.value < 0;
  }

  calculate(context: ObservationCalculationContext): FinancialObservation | undefined {
    const ratio = findReturnOnEquityRatio(context);
    if (!ratio || ratio.value >= 0) return undefined;

    return {
      id: deriveCompositeId(["financial-observation", "return_on_equity_negative", context.documentId, ratio.id]).slice(0, 16),
      definitionId: this.definition.id,
      category: this.definition.category,
      statement: this.definition.statementTemplate,
      documentId: context.documentId,
      metricIds: [],
      ratioIds: [ratio.id],
      confidence: ratio.confidence,
      basis: `Return on equity of ${ratio.value.toFixed(4)} indicates a negative return relative to shareholders' equity.`,
    };
  }
}
